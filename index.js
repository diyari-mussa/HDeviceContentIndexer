const express = require('express');
const multer = require('multer');
const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Checksum storage management
const CHECKSUM_FILE = path.join(__dirname, 'folder_checksums.json');

function loadChecksums() {
  try {
    if (!fs.existsSync(CHECKSUM_FILE)) {
      // Create empty JSON file if it doesn't exist
      fs.writeFileSync(CHECKSUM_FILE, JSON.stringify({}, null, 2));
      return new Map();
    }

    const content = fs.readFileSync(CHECKSUM_FILE, 'utf8');
    const checksumsObj = JSON.parse(content);
    const checksums = new Map();

    for (const [key, value] of Object.entries(checksumsObj)) {
      checksums.set(key, value);
    }

    return checksums;
  } catch (error) {
    console.error('Error loading checksums:', error);
    return new Map();
  }
}

function saveChecksum(folderHash, deviceId, folderName) {
  try {
    const checksums = loadChecksums();
    const key = `${folderHash}:${deviceId}`;

    if (!checksums.has(key)) {
      checksums.set(key, {
        hash: folderHash,
        deviceId,
        folderName,
        timestamp: new Date().toISOString()
      });

      // Write back to file as JSON
      const checksumsObj = {};
      for (const [k, v] of checksums) {
        checksumsObj[k] = v;
      }

      fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksumsObj, null, 2));
      console.log(`Saved checksum for folder: ${folderName} (${deviceId})`);
    }
  } catch (error) {
    console.error('Error saving checksum:', error);
  }
}

function isFolderAlreadyProcessed(folderHash, deviceId) {
  const checksums = loadChecksums();
  const key = `${folderHash}:${deviceId}`;
  const exists = checksums.has(key);
  console.log(`🔍 Checking checksum file: key="${key}", exists=${exists}`);
  if (exists) {
    console.log(`   ✓ Found in checksums:`, checksums.get(key));
  }
  return exists;
}

// Import file converters (only for PDF and HTML)
const { convertPdfToMarkdown } = require('./file-processors/pdf-to-md');
const { convertHtmlToText } = require('./file-processors/html-to-md');

const app = express();
const port = 3000;

// Elasticsearch client configuration
const client = new Client({
  node: 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 30000
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check Elasticsearch connection status
app.get('/api/elasticsearch/status', async (req, res) => {
  try {
    const health = await client.cluster.health();
    res.json({
      success: true,
      status: health.status,
      isConnected: true,
      clusterName: health.cluster_name,
      nodeCount: health.number_of_nodes,
      details: health
    });
  } catch (error) {
    console.error('Elasticsearch connection error:', error);
    res.json({
      success: false,
      isConnected: false,
      error: error.message || 'Failed to connect to Elasticsearch'
    });
  }
});

// Start Elasticsearch
app.post('/api/elasticsearch/start', (req, res) => {
  const { spawn } = require('child_process');
  const esBatPath = path.join(__dirname, 'elasticsearch-9.1.5', 'bin', 'elasticsearch.bat');

  // Check if elasticsearch.bat exists
  if (!fs.existsSync(esBatPath)) {
    return res.status(500).json({ success: false, error: 'elasticsearch.bat not found at ' + esBatPath });
  }

  try {
    // On Windows, use cmd to run the bat file properly
    const esProcess = spawn('cmd', ['/c', esBatPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.dirname(esBatPath),
      windowsHide: true
    });

    // Handle any output or errors
    let stdout = '';
    let stderr = '';

    esProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    esProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    esProcess.on('error', (error) => {
      console.error('Spawn error:', error);
    });

    esProcess.on('exit', (code) => {
      console.log(`Elasticsearch process exited with code ${code}`);
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.log('STDERR:', stderr);
    });

    // Detach the process so it runs independently
    esProcess.unref();

    console.log('Elasticsearch start initiated');
    res.json({ success: true, message: 'Elasticsearch start initiated' });
  } catch (error) {
    console.error('Error starting Elasticsearch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Function to get all files recursively
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

// Function to check if file extension is allowed
function isAllowedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.html', '.htm', '.txt', '.css', '.pdf', '.csv', '.info'].includes(ext);
}

// Function to read file content
function readFileContent(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Function to convert file content to Markdown
async function convertFileToMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (ext) {
      case '.pdf':
        return await convertPdfToMarkdown(filePath);
      case '.html':
      case '.htm':
        return convertHtmlToText(filePath);
      case '.csv':
      case '.txt':
      case '.css':
      default:
        // For CSV, text, and other files, return raw content without conversion
        return readFileContent(filePath);
    }
  } catch (error) {
    console.error(`Error converting ${filePath}:`, error);
    // Fallback to raw content
    return readFileContent(filePath);
  }
}

// Function to calculate folder hash for duplicate detection
function calculateFolderHash(dirPath) {
  const hash = crypto.createHash('sha256');

  function hashDirectory(currentPath, indent = '') {
    const items = fs.readdirSync(currentPath).sort(); // Sort items in each directory
    
    console.log(`${indent}📁 ${path.basename(currentPath)}/`);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.relative(dirPath, itemPath);
      
      if (stats.isDirectory()) {
        // For directories, just hash the name and recurse
        hash.update(`DIR:${relativePath}`);
        hashDirectory(itemPath, indent + '  ');
      } else if (stats.isFile()) {
        const ext = path.extname(itemPath).toLowerCase();
        // Hash: relative path + file size + extension
        const fileSignature = `FILE:${relativePath}:${stats.size}:${ext}`;
        hash.update(fileSignature);
        console.log(`${indent}  ✓ ${item} (${stats.size} bytes)`);
      }
    }
  }

  console.log(`🔢 Calculating hash for: ${dirPath}`);
  hashDirectory(dirPath);
  
  const finalHash = hash.digest('hex');
  console.log(`🔑 Final hash: ${finalHash}`);
  return finalHash;
}

// Function to check if folder already exists in ANY index
async function checkFolderExists(indexName, folderHash, deviceId) {
  try {
    // FIRST: Check the local checksum file (most reliable)
    if (isFolderAlreadyProcessed(folderHash, deviceId)) {
      console.log(`Found folder in checksums file: hash=${folderHash}, device=${deviceId}`);
      return true;
    }

    // SECOND: Check ALL indices for this folder hash and device ID combination
    const hashResponse = await client.search({
      index: '_all', // Search across all indices
      body: {
        query: {
          bool: {
            must: [
              { term: { device_id: deviceId } },
              { term: { folder_hash: folderHash } }
            ]
          }
        },
        size: 1
      }
    });

    if (hashResponse.hits?.hits?.length > 0) {
      console.log(`Found exact folder hash match for device ${deviceId} in another index`);
      return true;
    }

    // THIRD: Also check if this specific device_id has been uploaded before in ANY index
    const deviceResponse = await client.search({
      index: '_all', // Search across all indices
      body: {
        query: {
          term: { device_id: deviceId }
        },
        size: 1
      }
    });

    const deviceHits = deviceResponse.hits?.hits || [];
    if (deviceHits.length > 0) {
      console.log(`Found existing documents for device ${deviceId} in another index, blocking duplicate upload`);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Error checking folder existence:', error);
    // If Elasticsearch check fails, at least check the checksum file
    return isFolderAlreadyProcessed(folderHash, deviceId);
  }
}

// Function to build document structure
function buildDocument(filePath, content, originalContent, dirName = '', folderHash = '') {
  const fullPath = path.resolve(filePath);
  const fileName = path.basename(filePath);
  const relativePath = path.relative(path.join(__dirname, 'uploads'), fullPath);
  const pathParts = relativePath.split(path.sep);

  let device_id = '';
  let subdirectory = '';

  if (pathParts.length >= 2) {
    device_id = pathParts[0];
    subdirectory = pathParts.slice(1, -1).join('/');
  } else {
    device_id = dirName || 'unknown';
    subdirectory = '';
  }

  return {
    device_id: device_id,
    subdirectory: subdirectory,
    full_path: fullPath,
    file_name: fileName,
    extracted_text: content,
    html_content: originalContent,
    folder_hash: folderHash,
    timestamp: new Date().toISOString()
  };
}

// Function to index document in Elasticsearch
async function indexDocument(indexName, document) {
  try {
    const response = await client.index({
      index: indexName,
      document: document
    });
    console.log(`Indexed document: ${response._id}`);
  } catch (error) {
    console.error('Error indexing document:', error);
  }
}

// Function to build tree structure
function buildTree(dirPath, prefix = '') {
  const tree = {};
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        tree[item] = buildTree(fullPath, prefix + item + '/');
      } else {
        tree[item] = null; // file
      }
    } catch (error) {
      console.error(`Error processing ${fullPath}:`, error);
    }
  });

  return tree;
}

// Main function to index directory
async function indexDirectory(dirPath, dirName) {
  const indexName = selectedIndex || 'directory-index'; // Or make it configurable

  // Delete existing documents for this directory
  try {
    await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          term: { directoryName: dirName }
        }
      }
    });
    console.log(`Deleted existing documents for directory: ${dirName}`);
  } catch (error) {
    console.log(`No existing documents to delete for directory: ${dirName}`);
  }

  const allFiles = getAllFiles(dirPath);

  for (const filePath of allFiles) {
    if (isAllowedFile(filePath)) {
      const content = await convertFileToMarkdown(filePath);
      const originalContent = readFileContent(filePath);

      const document = buildDocument(filePath, content, originalContent, dirName);

      await indexDocument(indexName, document);
    }
  }

  console.log('Indexing completed for', dirName);
}

// Endpoint to upload folder
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { tree, folderName, relativePaths: relativePathsStr } = req.body;
    const relativePaths = JSON.parse(relativePathsStr || '[]');
    
    // Extract device ID (folder name) from the first file's path
    let deviceId = 'unknown';
    let rootFolderName = 'uploaded-folder';
    if (relativePaths.length > 0) {
      const firstPath = relativePaths[0];
      const pathParts = firstPath.split(path.sep);
      if (pathParts.length > 0) {
        rootFolderName = pathParts[0];
        deviceId = rootFolderName;
      }
    }

    // Create a TEMPORARY directory for this upload to calculate hash
    const tempUploadDir = path.join(__dirname, 'uploads', `temp-${Date.now()}-${rootFolderName}`);
    fs.mkdirSync(tempUploadDir, { recursive: true });

    // Save files to temporary directory first
    req.files.forEach((file, index) => {
      const relativePath = relativePaths[index];
      const targetPath = path.join(tempUploadDir, relativePath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.renameSync(file.path, targetPath);
    });

    console.log(`📦 Uploaded ${req.files.length} files to temp directory`);

    // Calculate hash on the temp directory (files already include rootFolderName in their paths)
    // Find the actual root folder that was created
    const tempContents = fs.readdirSync(tempUploadDir);
    console.log('📁 Temp directory contents:', tempContents);
    
    const actualRootFolder = tempContents.find(item => {
      const itemPath = path.join(tempUploadDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    console.log('📁 Actual root folder found:', actualRootFolder);
    
    const uploadedFolderPath = actualRootFolder 
      ? path.join(tempUploadDir, actualRootFolder)
      : tempUploadDir;
    
    // Use actualRootFolder as deviceId if found
    if (actualRootFolder) {
      deviceId = actualRootFolder;
      rootFolderName = actualRootFolder;
    }
    
    console.log('📁 Calculating hash on:', uploadedFolderPath);
    console.log('📱 Using device ID:', deviceId);
    
    const folderHash = calculateFolderHash(uploadedFolderPath);
    console.log('📊 Calculated folder hash during upload:', folderHash);

    // Check if this folder has already been indexed
    const indexName = selectedIndex || 'directory-index';
    const folderExists = await checkFolderExists(indexName, folderHash, deviceId);
    console.log('🔍 Folder exists check result:', folderExists);

    // Now move to final location
    const uploadsDir = path.join(__dirname, 'uploads');
    const finalUploadPath = path.join(uploadsDir, rootFolderName);
    
    // If folder already exists in final location, remove it first
    if (fs.existsSync(finalUploadPath)) {
      fs.rmSync(finalUploadPath, { recursive: true, force: true });
    }
    
    // Move from temp to final location
    fs.renameSync(uploadedFolderPath, finalUploadPath);
    
    // Clean up temp directory
    if (fs.existsSync(tempUploadDir)) {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }

    // Build tree structure - wrap with root folder name
    const treeContents = buildTree(finalUploadPath);
    const treeStructure = {
      [rootFolderName]: treeContents
    };

    res.json({
      success: true,
      tree: treeStructure,
      message: 'Upload successful',
      folderHash: folderHash,
      deviceId: deviceId,
      alreadyExists: folderExists
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get list of indices
app.get('/indices', async (req, res) => {
  try {
    const response = await client.cat.indices({ format: 'json' });
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ingest endpoint for Elasticsearch with progress tracking
app.post('/ingest', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.json({ success: false, error: 'No files selected for ingestion' });
    }

    console.log('Ingesting files:', files);
    let processedCount = 0;
    const totalFiles = files.length;
    const startTime = Date.now();
    let progressCallback = null;

    // Set up progress tracking
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      // SSE response for progress updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      progressCallback = (message, current, total) => {
        res.write(`data: ${JSON.stringify({ message, current, total, progress: Math.round((current / total) * 100) })}\n\n`);
      };

      progressCallback('Starting ingestion...', 0, totalFiles);
    }

    // Process each file
    const indexName = selectedIndex || 'directory-index';

    // Ensure the index exists before indexing documents
    try {
      const indexExists = await client.indices.exists({ index: indexName });
      if (!indexExists) {
        await client.indices.create({ index: indexName });
        console.log(`Created index: ${indexName}`);
      }
    } catch (error) {
      console.error('Error ensuring index exists:', error);
      if (progressCallback) {
        progressCallback(`Error creating index: ${error.message}`, 0, totalFiles);
      }
      // Return early if we can't create the index
      if (progressCallback) {
        res.end();
      } else {
        return res.json({ success: false, error: 'Failed to create index: ' + error.message });
      }
      return;
    }

    // Calculate folder hash for duplicate detection - use the specific device folder
    let folderPath = path.join(__dirname, 'uploads');
    if (files.length > 0) {
      const firstFilePath = path.join(__dirname, 'uploads', files[0]);
      const relativePath = path.relative(path.join(__dirname, 'uploads'), firstFilePath);
      const pathParts = relativePath.split(path.sep);

      if (pathParts.length >= 1) {
        // Use the device directory as the folder to hash (first part of the path)
        folderPath = path.join(__dirname, 'uploads', pathParts[0]);
      }
    }

    console.log('Calculated folder path for hashing:', folderPath);
    
    // Only calculate hash if we have a specific folder (not the entire uploads directory)
    if (folderPath === path.join(__dirname, 'uploads')) {
      console.warn('⚠️ Warning: Could not determine specific folder, using first file path');
    }
    
    const folderHash = calculateFolderHash(folderPath);
    console.log('Calculated folder hash:', folderHash);

    // Extract device ID from the first file path
    const firstFilePath = path.join(__dirname, 'uploads', files[0]);
    const relativePath = path.relative(path.join(__dirname, 'uploads'), firstFilePath);
    const pathParts = relativePath.split(path.sep);
    const deviceId = pathParts[0];
    const folderName = deviceId; // Use device ID as folder name for checksum storage
    console.log('Extracted device ID:', deviceId);
    console.log('Using folder name for checksum:', folderName);

    // Check CSV file first for faster lookup
    const alreadyProcessed = isFolderAlreadyProcessed(folderHash, deviceId);
    if (alreadyProcessed) {
      console.log('Folder already processed according to checksum file, skipping ingestion');
      if (progressCallback) {
        progressCallback('Folder already processed - skipping', totalFiles, totalFiles);
        res.end();
      } else {
        res.json({
          success: false,
          error: 'This folder has already been processed. Duplicate folders are not allowed.'
        });
      }
      return;
    }

    // Also check Elasticsearch for backward compatibility
    const folderExists = await checkFolderExists(indexName, folderHash, deviceId);

    if (folderExists) {
      console.log('Folder already exists in index, skipping ingestion');
      if (progressCallback) {
        progressCallback('Folder already indexed - skipping', totalFiles, totalFiles);
        res.end();
      } else {
        res.json({
          success: false,
          error: 'This folder has already been indexed. Duplicate folders are not allowed.'
        });
      }
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const fullPath = path.join(__dirname, 'uploads', filePath);

      if (fs.existsSync(fullPath)) {
        try {
          console.log(`Processing file ${i + 1}/${totalFiles}: ${filePath}`);
          const content = await convertFileToMarkdown(fullPath);
          const originalContent = fs.readFileSync(fullPath, 'utf8');

          const document = buildDocument(fullPath, content, originalContent, '', folderHash);

          await indexDocument(indexName, document);

          processedCount++;
          const progress = Math.round((processedCount / totalFiles) * 100);

          if (progressCallback) {
            progressCallback(`Indexed: ${filePath}`, processedCount, totalFiles);
          }
        } catch (fileError) {
          console.error(`Error processing ${filePath}:`, fileError);
          if (progressCallback) {
            progressCallback(`Error processing ${filePath}: ${fileError.message}`, processedCount, totalFiles);
          }
        }
      } else {
        console.warn(`File not found: ${fullPath}`);
        if (progressCallback) {
          progressCallback(`File not found: ${filePath}`, processedCount, totalFiles);
        }
      }
    }

    // Save checksum to JSON file AFTER successful ingestion
    saveChecksum(folderHash, deviceId, folderName);
    console.log(`✅ Checksum saved for folder: ${folderName} (${deviceId})`);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (progressCallback) {
      progressCallback(`Ingestion completed! Processed ${processedCount}/${totalFiles} files in ${duration.toFixed(2)}s`, totalFiles, totalFiles);
      res.end();
    } else {
      res.json({
        success: true,
        message: `Successfully ingested ${processedCount}/${totalFiles} files in ${duration.toFixed(2)} seconds`,
        processed: processedCount,
        total: totalFiles,
        duration: duration
      });
    }
  } catch (error) {
    console.error('Ingestion error:', error);
    if (res.headersSent) {
      // If headers already sent (SSE), close the connection
      res.end();
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

// API: list indices
app.get('/api/indices', async (req, res) => {
  try {
    const resp = await client.cat.indices({ format: 'json' });
    const indices = Array.isArray(resp) ? resp.map(i => i.index) : [];
    res.json({ success: true, indices });
  } catch (error) {
    console.error('Error listing indices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: get 10 documents from an index
app.get('/api/indices/:index/documents', async (req, res) => {
  try {
    const indexName = req.params.index;
    const resp = await client.search({
      index: indexName,
      size: 10,
      query: { match_all: {} }
    });
    // Handle both old and new response formats
    const hits = resp.hits?.hits || (resp.body?.hits?.hits) || [];
    res.json({ success: true, documents: hits });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simple in-memory selected index (could be persisted later)
let selectedIndex = null;

app.get('/api/selected-index', (req, res) => {
  res.json({ success: true, selectedIndex });
});

app.post('/api/selected-index', (req, res) => {
  const { index } = req.body;
  if (!index) return res.status(400).json({ success: false, error: 'Index is required' });
  selectedIndex = index;
  console.log('Selected index set to', selectedIndex);
  res.json({ success: true, selectedIndex });
});

// Create index
app.post('/api/indices', async (req, res) => {
  const { index } = req.body;
  if (!index) return res.status(400).json({ success: false, error: 'Index name is required' });
  try {
    const exists = await client.indices.exists({ index });
    if (exists.body) return res.status(400).json({ success: false, error: 'Index already exists' });
    await client.indices.create({ index });
    res.json({ success: true, index });
  } catch (err) {
    console.error('Error creating index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete index
app.delete('/api/indices/:index', async (req, res) => {
  const index = req.params.index;
  try {
    // New ES client doesn't return body property
    const exists = await client.indices.exists({ index }).catch(() => false);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'Index not found' });
    }
    
    await client.indices.delete({ index });
    
    // If deleted index was selected, clear selectedIndex
    if (selectedIndex === index) {
      selectedIndex = null;
    }
    
    console.log('Successfully deleted index:', index);
    res.json({ success: true, index });
  } catch (err) {
    console.error('Error deleting index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

 // API endpoint for file conversion preview
app.post('/api/convert-file', multer({ dest: 'uploads/' }).single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // For PDF files, don't try to read as UTF-8 text
    let originalContent = '';
    try {
      if (fileExt === '.pdf') {
        originalContent = `[Binary PDF file - ${req.file.size} bytes]`;
      } else {
        originalContent = fs.readFileSync(filePath, 'utf8');
      }
    } catch (readError) {
      console.warn('Could not read original file content:', readError.message);
      originalContent = '[Unable to read file content]';
    }

    const markdownContent = await convertFileToMarkdown(filePath);

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Could not cleanup file:', cleanupError.message);
    }

    res.json({
      success: true,
      originalContent,
      markdownContent,
      fileName: req.file.originalname,
      fileType: fileExt
    });
  } catch (error) {
    console.error('File conversion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to index a specific directory
app.post('/api/index-directory', async (req, res) => {
  try {
    const { directoryPath } = req.body;
    if (!directoryPath) {
      return res.status(400).json({ success: false, error: 'Directory path is required' });
    }

    const fullPath = path.resolve(directoryPath);
    const dirName = path.basename(fullPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Directory does not exist: ' + fullPath });
    }

    // Check if directory is accessible
    try {
      fs.accessSync(fullPath, fs.constants.R_OK);
    } catch (accessError) {
      return res.status(403).json({ success: false, error: 'Cannot read directory: ' + fullPath });
    }

    console.log('Starting to index directory:', fullPath);

    // Index the directory
    await indexDirectory(fullPath, dirName);

    res.json({
      success: true,
      message: `Successfully indexed directory: ${dirName}`,
      directory: fullPath
    });
  } catch (error) {
    console.error('Error indexing directory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to index subdirectories
app.post('/api/index-subdirectories', async (req, res) => {
  try {
    const { directoryPath } = req.body;
    if (!directoryPath) {
      return res.status(400).json({ success: false, error: 'Directory path is required' });
    }

    const fullPath = path.resolve(directoryPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Directory does not exist: ' + fullPath });
    }

    const items = fs.readdirSync(fullPath);
    const subdirectories = items.filter(item => {
      const itemPath = path.join(fullPath, item);
      return fs.statSync(itemPath).isDirectory();
    });

    console.log('Found subdirectories:', subdirectories);

    const results = [];
    for (const subdir of subdirectories) {
      const subdirPath = path.join(fullPath, subdir);
      try {
        await indexDirectory(subdirPath, subdir);
        results.push({ success: true, directory: subdir, message: 'Indexed successfully' });
      } catch (error) {
        results.push({ success: false, directory: subdir, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${subdirectories.length} subdirectories`,
      results: results
    });
  } catch (error) {
    console.error('Error indexing subdirectories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advanced search: Generate phone number format variations
function generatePhoneVariations(query) {
  // Check if query looks like a phone number (contains mostly digits, +, spaces, or dashes)
  const phonePattern = /^[\d\s+\-()]+$/;
  if (!phonePattern.test(query.trim())) {
    return null; // Not a phone number
  }

  // Extract only digits from the query
  const digitsOnly = query.replace(/\D/g, '');
  
  if (digitsOnly.length < 7) {
    return null; // Too short to be a phone number
  }

  const variations = new Set();
  
  // Add original query
  variations.add(query.trim());
  
  // Add digits only
  variations.add(digitsOnly);
  
  // For international numbers (10+ digits)
  if (digitsOnly.length >= 10) {
    // Remove leading country code patterns
    // +964 7702216362 -> 7702216362 (remove country code)
    if (digitsOnly.startsWith('964')) {
      variations.add(digitsOnly.substring(3));
    }
    
    // Add with + prefix
    variations.add('+' + digitsOnly);
    
    // Add with 0 prefix if doesn't have it
    if (!digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
      const withZero = '0' + digitsOnly.substring(digitsOnly.length - 10);
      variations.add(withZero);
    }
    
    // Generate spaced variations for last 10 digits
    const last10 = digitsOnly.substring(digitsOnly.length - 10);
    const last9 = digitsOnly.substring(digitsOnly.length - 9);
    
    // XXX XXX XXXX format
    if (last10.length === 10) {
      variations.add(`${last10.substring(0, 3)} ${last10.substring(3, 6)} ${last10.substring(6)}`);
      // 0XXX XXX XXXX
      variations.add(`0${last9.substring(0, 3)} ${last9.substring(3, 6)} ${last9.substring(6)}`);
    }
    
    // XXX XXX XX XX format
    if (last10.length === 10) {
      variations.add(`${last10.substring(0, 3)} ${last10.substring(3, 6)} ${last10.substring(6, 8)} ${last10.substring(8)}`);
    }
    
    // Country code + space + rest
    if (digitsOnly.length === 12 && digitsOnly.startsWith('964')) {
      variations.add(`964 ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}`);
      variations.add(`+964 ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}`);
    }
  }
  
  // For shorter numbers (7-9 digits)
  if (digitsOnly.length >= 7 && digitsOnly.length <= 9) {
    // XXX XXX XXX format
    if (digitsOnly.length === 9) {
      variations.add(`${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}`);
    }
    
    // XXX XXXX format for 7 digits
    if (digitsOnly.length === 7) {
      variations.add(`${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3)}`);
    }
  }
  
  return Array.from(variations);
}

// API endpoint to search Elasticsearch
app.post('/api/search', async (req, res) => {
  try {
    let { query, index, advancedSearch } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // If no index specified, use selected index or all
    if (!index || index.trim() === '') {
      index = selectedIndex || '_all';
    }

    let searchQuery;
    
    // Check if advanced search is enabled
    if (advancedSearch) {
      const phoneVariations = generatePhoneVariations(query);
      
      if (phoneVariations && phoneVariations.length > 1) {
        // Use bool query with should clauses for multiple variations (phone numbers)
        searchQuery = {
          index: index,
          body: {
            query: {
              bool: {
                should: phoneVariations.map(variation => ({
                  multi_match: {
                    query: variation,
                    fields: ['*'],
                    type: 'phrase'
                  }
                }))
              }
            },
            highlight: {
              fields: {
                '*': {}
              }
            },
            size: 50
          }
        };
        
        console.log(`Advanced search: Generated ${phoneVariations.length} variations for: ${query}`);
        console.log('Variations:', phoneVariations);
      } else {
        // Advanced substring search - finds partial matches like "facebook" in "com.facebook.thing"
        searchQuery = {
          index: index,
          body: {
            query: {
              bool: {
                should: [
                  // Exact phrase match (highest priority)
                  {
                    multi_match: {
                      query: query,
                      fields: ['*'],
                      type: 'phrase',
                      boost: 3
                    }
                  },
                  // Standard word match
                  {
                    multi_match: {
                      query: query,
                      fields: ['*'],
                      boost: 2
                    }
                  },
                  // Wildcard search for substring matches (e.g., "facebook" in "com.facebook.thing")
                  {
                    query_string: {
                      query: `*${query}*`,
                      fields: ['*'],
                      analyze_wildcard: true,
                      boost: 1
                    }
                  }
                ],
                minimum_should_match: 1
              }
            },
            highlight: {
              fields: {
                '*': {}
              }
            },
            size: 50
          }
        };
        
        console.log(`Advanced search with substring matching for: ${query}`);
      }
    } else {
      // Normal search
      searchQuery = {
        index: index,
        body: {
          query: {
            multi_match: {
              query: query,
              fields: ['*']
            }
          },
          highlight: {
            fields: {
              '*': {}
            }
          },
          size: 50
        }
      };
    }

    const response = await client.search(searchQuery);

    // Extract hits - handle different response formats
    let hits = [];
    if (response.hits && Array.isArray(response.hits.hits)) {
      hits = response.hits.hits;
    } else if (response.body && response.body.hits && Array.isArray(response.body.hits.hits)) {
      hits = response.body.hits.hits;
    }

    const results = hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      highlight: hit.highlight
    }));

    // Handle different Elasticsearch response formats
    let totalHits = 0;
    if (response.hits && response.hits.total) {
      // New format (v7+)
      totalHits = response.hits.total.value || 0;
    } else if (response.hits && response.hits.total !== undefined) {
      // Old format
      totalHits = response.hits.total || 0;
    }

    res.json({
      success: true,
      query: query,
      total: totalHits,
      results: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const indexName = selectedIndex || '_all';
    
    let totalDocuments = 0;
    let totalDevices = 0;
    let topDevices = [];
    let recentDocuments = [];
    let totalIndexes = 0;
    let totalStorageBytes = 0;
    
    // Get list of indexes first
    try {
      const indicesResponse = await client.cat.indices({ format: 'json' });
      const indices = indicesResponse.body || indicesResponse || [];
      totalIndexes = indices.length;
      
      // Calculate total storage
      indices.forEach(index => {
        if (index['store.size']) {
          const size = index['store.size'];
          // Parse size string (e.g., "1.2mb", "500kb")
          const match = size.match(/^([\d.]+)(kb|mb|gb|tb)?$/i);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = (match[2] || 'b').toLowerCase();
            const multipliers = { b: 1, kb: 1024, mb: 1024*1024, gb: 1024*1024*1024, tb: 1024*1024*1024*1024 };
            totalStorageBytes += value * (multipliers[unit] || 1);
          }
        }
      });
    } catch (err) {
      console.log('Could not fetch indices:', err.message);
    }
    
    // Only query documents if there are indexes
    if (totalIndexes > 0) {
      try {
        // Get total document count
        const countResponse = await client.count({
          index: indexName
        });
        totalDocuments = countResponse.count || countResponse.body?.count || 0;
      } catch (err) {
        console.log('Could not count documents:', err.message);
      }
      
      try {
        // Get total devices
        const devicesAgg = await client.search({
          index: indexName,
          body: {
            size: 0,
            aggs: {
              unique_devices: {
                cardinality: {
                  field: 'device_id.keyword'
                }
              },
              top_devices: {
                terms: {
                  field: 'device_id.keyword',
                  size: 5,
                  order: { _count: 'desc' }
                }
              }
            }
          }
        });
        
        totalDevices = devicesAgg.aggregations?.unique_devices?.value || 
                             devicesAgg.body?.aggregations?.unique_devices?.value || 0;
        topDevices = devicesAgg.aggregations?.top_devices?.buckets || 
                           devicesAgg.body?.aggregations?.top_devices?.buckets || [];
      } catch (err) {
        console.log('Could not fetch device stats:', err.message);
      }
      
      try {
        // Get recent documents
        const recentResponse = await client.search({
          index: indexName,
          body: {
            size: 5,
            sort: [{ timestamp: { order: 'desc' } }],
            _source: ['file_name', 'device_id', 'timestamp']
          }
        });
        
        const recentDocs = recentResponse.hits?.hits || recentResponse.body?.hits?.hits || [];
        recentDocuments = recentDocs.map(hit => hit._source);
      } catch (err) {
        console.log('Could not fetch recent documents:', err.message);
      }
    }
    
    res.json({
      success: true,
      stats: {
        totalDocuments,
        totalDevices,
        totalIndexes,
        totalStorageBytes,
        topDevices: topDevices.map(bucket => ({
          device_id: bucket.key,
          doc_count: bucket.doc_count
        })),
        recentDocuments
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get all devices from an index
app.get('/api/devices', async (req, res) => {
  try {
    const indexName = req.query.index || selectedIndex || '_all';

    // Aggregate by device_id
    const response = await client.search({
      index: indexName,
      body: {
        size: 0,
        aggs: {
          devices: {
            terms: {
              field: 'device_id.keyword',
              size: 1000
            },
            aggs: {
              first_indexed: {
                min: {
                  field: 'timestamp'
                }
              },
              last_indexed: {
                max: {
                  field: 'timestamp'
                }
              },
              folder_hash: {
                terms: {
                  field: 'folder_hash.keyword',
                  size: 1
                }
              }
            }
          }
        }
      }
    });

    const buckets = response.aggregations?.devices?.buckets || [];
    const devices = buckets.map(bucket => ({
      deviceId: bucket.key,
      fileCount: bucket.doc_count, // This gives us the document count directly
      firstIndexed: bucket.first_indexed.value_as_string || bucket.first_indexed.value,
      lastIndexed: bucket.last_indexed.value_as_string || bucket.last_indexed.value,
      folderHash: bucket.folder_hash.buckets[0]?.key || null
    }));

    res.json({
      success: true,
      devices: devices,
      total: devices.length
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get files for a specific device
app.get('/api/devices/:deviceId/files', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const indexName = req.query.index || selectedIndex || '_all';

    const response = await client.search({
      index: indexName,
      body: {
        query: {
          term: {
            'device_id.keyword': deviceId
          }
        },
        sort: [
          { 'timestamp': { order: 'desc' } }
        ],
        size: 1000
      }
    });

    const hits = response.hits?.hits || [];
    
    res.json({
      success: true,
      files: hits,
      total: hits.length
    });
  } catch (error) {
    console.error('Error fetching device files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to cleanup physical folder for a device
app.delete('/api/devices/:deviceId/cleanup', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const folderPath = path.join(__dirname, 'uploads', deviceId);

    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      return res.json({
        success: true,
        message: 'Folder does not exist or was already deleted',
        folderPath: folderPath
      });
    }

    // Delete the physical folder
    fs.rmSync(folderPath, { recursive: true, force: true });

    res.json({
      success: true,
      message: `Physical folder for device ${deviceId} deleted successfully`,
      folderPath: folderPath
    });
  } catch (error) {
    console.error('Error cleaning up folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to cleanup physical folder for a device
app.delete('/api/devices/:deviceId/cleanup', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const folderPath = path.join(__dirname, 'uploads', deviceId);

    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      return res.json({
        success: true,
        message: 'Folder does not exist or was already deleted',
        folderPath: folderPath
      });
    }

    // Delete the physical folder
    fs.rmSync(folderPath, { recursive: true, force: true });

    res.json({
      success: true,
      message: `Physical folder for device ${deviceId} deleted successfully`,
      folderPath: folderPath
    });
  } catch (error) {
    console.error('Error cleaning up folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to delete a device and all its files
app.delete('/api/devices/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const indexName = req.query.index || selectedIndex;

    if (!indexName || indexName === '_all') {
      return res.status(400).json({ 
        success: false, 
        error: 'Please specify a specific index to delete from' 
      });
    }

    // Delete all documents with this device_id
    const response = await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          term: {
            'device_id.keyword': deviceId
          }
        }
      }
    });

    const deletedCount = response.deleted || 0;

    res.json({
      success: true,
      message: `Device ${deviceId} deleted successfully`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get all checksums
app.get('/api/checksums', (req, res) => {
  try {
    const checksums = loadChecksums();
    const checksumsArray = [];
    
    for (const [key, value] of checksums) {
      checksumsArray.push({
        key,
        ...value
      });
    }
    
    // Sort by timestamp (newest first)
    checksumsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, checksums: checksumsArray, total: checksumsArray.length });
  } catch (error) {
    console.error('Error fetching checksums:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to delete a checksum
app.delete('/api/checksums/:key', (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const checksums = loadChecksums();
    
    if (!checksums.has(key)) {
      return res.status(404).json({ success: false, error: 'Checksum not found' });
    }
    
    checksums.delete(key);
    
    // Write back to file
    const checksumsObj = {};
    for (const [k, v] of checksums) {
      checksumsObj[k] = v;
    }
    
    fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksumsObj, null, 2));
    
    res.json({ success: true, message: 'Checksum deleted successfully' });
  } catch (error) {
    console.error('Error deleting checksum:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});

module.exports = { indexDirectory };