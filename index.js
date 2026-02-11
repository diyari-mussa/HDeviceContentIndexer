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

function saveChecksum(folderHash, deviceId, folderName, indexName) {
  try {
    const checksums = loadChecksums();
    const key = `${folderHash}:${deviceId}:${indexName}`;

    if (!checksums.has(key)) {
      checksums.set(key, {
        hash: folderHash,
        deviceId,
        folderName,
        indexName,
        timestamp: new Date().toISOString()
      });

      // Write back to file as JSON
      const checksumsObj = {};
      for (const [k, v] of checksums) {
        checksumsObj[k] = v;
      }

      fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksumsObj, null, 2));
      console.log(`Saved checksum for folder: ${folderName} in index ${indexName} (${deviceId})`);
    }
  } catch (error) {
    console.error('Error saving checksum:', error);
  }
}

function isFolderAlreadyProcessed(folderHash, deviceId, indexName) {
  const checksums = loadChecksums();
  const key = `${folderHash}:${deviceId}:${indexName}`;
  const exists = checksums.has(key);
  console.log(`🔍 Checking checksum file: key="${key}", exists=${exists}`);
  if (exists) {
    console.log(`   ✓ Found in checksums:`, checksums.get(key));
  }
  return exists;
}

function removeChecksum(folderHash, deviceId, indexName) {
  try {
    const checksums = loadChecksums();
    const key = `${folderHash}:${deviceId}:${indexName}`;

    if (checksums.has(key)) {
      checksums.delete(key);

      // Write back to file as JSON
      const checksumsObj = {};
      for (const [k, v] of checksums) {
        checksumsObj[k] = v;
      }

      fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksumsObj, null, 2));
      console.log(`🗑️ Removed checksum for: ${deviceId} in index ${indexName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing checksum:', error);
    return false;
  }
}

// Import file converters (only for HTML)
const { convertHtmlToText } = require('./file-processors/html-to-md');
const { convertExcelToMarkdown } = require('./file-processors/excel-to-md');

const app = express();
const port = 3000;

// Elasticsearch client configuration
const client = new Client({
  node: 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 30000
});

// Clean up orphaned temp folders on startup
function cleanupTempFolders() {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) return;
    
    const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
    let cleanedCount = 0;
    
    entries.forEach(entry => {
      if (entry.isDirectory() && entry.name.startsWith('temp-')) {
        const tempPath = path.join(uploadsDir, entry.name);
        try {
          fs.rmSync(tempPath, { recursive: true, force: true });
          cleanedCount++;
          console.log(`🧹 Cleaned up orphaned temp folder: ${entry.name}`);
        } catch (err) {
          console.error(`❌ Failed to clean temp folder ${entry.name}:`, err.message);
        }
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} temp folder(s)`);
    }
  } catch (error) {
    console.error('Error during temp folder cleanup:', error);
  }
}

// Run cleanup on startup
cleanupTempFolders();

// Middleware - Increase payload limits for large folder scans
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
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
  return ['.html', '.htm', '.txt', '.csv', '.xlsx', '.xls'].includes(ext);
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
      case '.xlsx':
      case '.xls':
        return await convertExcelToMarkdown(filePath);
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

// Function to check if folder already exists in SPECIFIC index
async function checkFolderExists(indexName, folderHash, deviceId) {
  try {
    // FIRST: Check the local checksum file for this specific index
    if (isFolderAlreadyProcessed(folderHash, deviceId, indexName)) {
      console.log(`Found folder in checksums file: hash=${folderHash}, device=${deviceId}, index=${indexName}`);
      return true;
    }

    // SECOND: Check the SPECIFIC index for this folder hash and device ID combination
    const hashResponse = await client.search({
      index: indexName,
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
      console.log(`Found exact folder hash match for device ${deviceId} in index ${indexName}`);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Error checking folder existence:', error);
    // If Elasticsearch check fails, at least check the checksum file
    return isFolderAlreadyProcessed(folderHash, deviceId, indexName);
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
    // Check if an index is selected and exists
    if (!selectedIndex) {
      return res.status(400).json({ 
        success: false, 
        error: 'No index selected. Please create or select an index first.' 
      });
    }

    // Verify the selected index exists
    try {
      const indexExists = await client.indices.exists({ index: selectedIndex });
      if (!indexExists) {
        return res.status(400).json({ 
          success: false, 
          error: `Index "${selectedIndex}" does not exist. Please create an index first.` 
        });
      }
    } catch (error) {
      console.error('Error checking index existence:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify index existence: ' + error.message 
      });
    }

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
    // Check if an index is selected and exists
    if (!selectedIndex) {
      return res.json({ 
        success: false, 
        error: 'No index selected. Please create or select an index first.' 
      });
    }

    // Verify the selected index exists
    try {
      const indexExists = await client.indices.exists({ index: selectedIndex });
      if (!indexExists) {
        return res.json({ 
          success: false, 
          error: `Index "${selectedIndex}" does not exist. Please create an index first.` 
        });
      }
    } catch (error) {
      console.error('Error checking index existence:', error);
      return res.json({ 
        success: false, 
        error: 'Failed to verify index existence: ' + error.message 
      });
    }

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
    const indexName = selectedIndex;

    // Index should already exist at this point (checked earlier)

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

    // Check CSV file first for faster lookup - now index-specific
    const alreadyProcessed = isFolderAlreadyProcessed(folderHash, deviceId, indexName);
    if (alreadyProcessed) {
      console.log(`Folder already processed in index ${indexName} according to checksum file, skipping ingestion`);
      if (progressCallback) {
        progressCallback(`Folder already processed in ${indexName} - skipping`, totalFiles, totalFiles);
        res.end();
      } else {
        res.json({
          success: false,
          error: `This folder has already been processed in index "${indexName}". Duplicate folders are not allowed in the same index.`
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

    // Save checksum to JSON file AFTER successful ingestion - now index-specific
    saveChecksum(folderHash, deviceId, folderName, indexName);
    console.log(`✅ Checksum saved for folder: ${folderName} (${deviceId}) in index ${indexName}`);

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

// API: get 5 documents from an index
app.get('/api/indices/:index/documents', async (req, res) => {
  try {
    const indexName = req.params.index;
    const resp = await client.search({
      index: indexName,
      size: 5,
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
      originalContent = fs.readFileSync(filePath, 'utf8');
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
  
  // Identify core number (10 digits) for standard mobile numbers
  let coreNumber = '';
  
  if (digitsOnly.length === 13 && digitsOnly.startsWith('964')) {
      // Iraqi format with country code: 964 770 123 4567
      coreNumber = digitsOnly.substring(3);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      // Local format with leading zero: 0770 123 4567
      coreNumber = digitsOnly.substring(1);
  } else if (digitsOnly.length === 10) {
      // Raw format: 770 123 4567
      coreNumber = digitsOnly;
  }

  // If we identified a valid 10-digit core number
  if (coreNumber.length === 10) {
      const p1 = coreNumber.substring(0, 3); // 770
      const p2 = coreNumber.substring(3, 6); // 221
      const p3 = coreNumber.substring(6);    // 6262
      const p3a = coreNumber.substring(6, 8); // 62
      const p3b = coreNumber.substring(8);    // 62
      
      // 1. Basic formats
      variations.add(coreNumber); // 7702216262
      variations.add(`0${coreNumber}`); // 07702216262
      variations.add(`964${coreNumber}`); // 9647702216262
      variations.add(`+964${coreNumber}`); // +9647702216262
      
      // 2. Spaced formats (Local)
      variations.add(`${p1} ${p2} ${p3}`); // 770 221 6262
      variations.add(`${p1} ${p2} ${p3a} ${p3b}`); // 770 221 62 62
      
      // 3. Spaced formats (With 0)
      variations.add(`0${p1} ${p2} ${p3}`); // 0770 221 6262
      variations.add(`0${p1} ${p2} ${p3a} ${p3b}`); // 0770 221 62 62
      variations.add(`0${p1} ${p2}${p3}`); // 0770 2216262
      
      // 4. Spaced formats (International)
      variations.add(`+964 ${coreNumber}`); // +964 7702216262
      variations.add(`+964 ${p1} ${p2} ${p3}`); // +964 770 221 6262
      variations.add(`964 ${p1} ${p2} ${p3}`); // 964 770 221 6262
  } else {
      // Fallback for other lengths
      if (digitsOnly.length >= 10) {
        // Add with + prefix
        variations.add('+' + digitsOnly);
        
        // Add with 0 prefix if doesn't have it
        if (!digitsOnly.startsWith('0')) {
          variations.add('0' + digitsOnly);
        }
      }
  }
  
  return Array.from(variations);
}

// API endpoint to search Elasticsearch
app.post('/api/search', async (req, res) => {
  try {
    let { query, index, advancedSearch, mobileSearch, searchAllIndexes } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Determine Index
    let targetIndex = index;
    // If explicit "search all" is requested OR no index is specified/selected, use _all
    if (searchAllIndexes === true || !targetIndex || targetIndex.trim() === '') {
      targetIndex = '_all';
    } else if (!targetIndex) {
      targetIndex = selectedIndex || '_all';
    }

    console.log(`Searching in index: ${targetIndex} (Search All: ${searchAllIndexes})`);

    let searchQuery = {
      index: targetIndex,
      body: {
        size: 50,
        highlight: { fields: { '*': {} } }
      }
    };

    let variations = [];

    // --- MOBILE SEARCH LOGIC ---
    if (mobileSearch) {
      // Generate variations using existing helper
      const generated = generatePhoneVariations(query);
      variations = generated ? generated : [query];
      
      // also add simple variations
      const clean = query.replace(/[^0-9]/g, '');
      if (clean && !variations.includes(clean)) variations.push(clean);

      searchQuery.body.query = {
        bool: {
          should: variations.map(v => ({
            multi_match: {
              query: v,
              fields: ['*'],
              type: 'phrase', 
              boost: 2
            }
          })),
          minimum_should_match: 1
        }
      };
      console.log('📱 Performing Mobile Search for variations:', variations);
    } 
    
    // --- GENERAL SEARCH ("John Doe" -> *john* AND *doe*) ---
    else {
      const terms = query.trim().split(/\s+/);
      
      // 1. EXACT PHRASE MATCH (Top Priority)
      const exactMatch = {
        multi_match: {
          query: query,
          fields: ['*'],
          type: 'phrase',
          boost: 10
        }
      };

      // 2. FUZZY / WILDCARD LOGIC
      // "john doe" -> must correlate wildcard match for "john" AND wildcard match for "doe"
      const wildcardMustClauses = terms.map(term => ({
        query_string: {
            query: `*${term}*`,
            fields: ['*'],
            analyze_wildcard: true
        }
      }));

      // Combine strategies
      searchQuery.body.query = {
        bool: {
          should: [
            exactMatch,
            {
              bool: {
                must: wildcardMustClauses,
                boost: 5
              }
            }
          ],
          minimum_should_match: 1
        }
      };
      console.log('🔍 Performing General / Wildcard Search for:', terms);
    }

    // EXECUTE SEARCH WITH ERROR HANDLING
    let response;
    try {
        response = await client.search(searchQuery);
    } catch (esError) {
        console.error('Elasticsearch Search Error:', esError);
        // Specialized Error Handling
        if (esError.meta && esError.meta.statusCode === 429) {
            throw new Error('Elasticsearch is overloaded (429 Too Many Requests). Please try again later.');
        } else if (esError.message.includes('Connection refused')) {
            throw new Error('Could not connect to Elasticsearch. Is the service running?');
        } else if (esError.message.includes('circuit_breaking_exception')) {
             throw new Error('Elasticsearch circuit breaker tripped. System memory is low.');
        } else {
            throw new Error(`Search engine error: ${esError.message}`);
        }
    }

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
      highlight: hit.highlight,
      index: hit._index
    }));

    // Handle count extraction
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
      results: results,
      variations: variations
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
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const searchQuery = req.query.search || '';

    // Aggregate by device_id
    const response = await client.search({
      index: indexName,
      body: {
        size: 0,
        aggs: {
          devices: {
            terms: {
              field: 'device_id.keyword',
              size: 10000, // Get all devices for filtering
              ...(searchQuery && {
                include: `.*${searchQuery}.*`
              })
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
    const allDevices = buckets.map(bucket => ({
      deviceId: bucket.key,
      fileCount: bucket.doc_count,
      firstIndexed: bucket.first_indexed.value_as_string || bucket.first_indexed.value,
      lastIndexed: bucket.last_indexed.value_as_string || bucket.last_indexed.value,
      folderHash: bucket.folder_hash.buckets[0]?.key || null
    }));

    // Apply pagination
    const totalDevices = allDevices.length;
    const totalPages = Math.ceil(totalDevices / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDevices = allDevices.slice(startIndex, endIndex);

    res.json({
      success: true,
      devices: paginatedDevices,
      total: totalDevices,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages
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

    // Remove checksum entries for this device in this index
    let checksumsRemoved = 0;
    try {
      const checksums = loadChecksums();
      const keysToRemove = [];
      
      // Find all checksum keys for this deviceId and index
      for (const [key, value] of checksums) {
        if (value.deviceId === deviceId && value.indexName === indexName) {
          keysToRemove.push(key);
        }
      }
      
      // Remove the found keys
      for (const key of keysToRemove) {
        checksums.delete(key);
        checksumsRemoved++;
      }
      
      // Write back to file if any checksums were removed
      if (checksumsRemoved > 0) {
        const checksumsObj = {};
        for (const [k, v] of checksums) {
          checksumsObj[k] = v;
        }
        fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksumsObj, null, 2));
        console.log(`🗑️ Removed ${checksumsRemoved} checksum(s) for device ${deviceId} in index ${indexName}`);
      }
    } catch (checksumError) {
      console.error('Error removing checksums:', checksumError);
      // Don't fail the whole operation if checksum removal fails
    }

    res.json({
      success: true,
      message: `Device ${deviceId} deleted successfully`,
      deletedCount: deletedCount,
      checksumsRemoved: checksumsRemoved
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

// API endpoint to clean up temp folders manually
app.post('/api/cleanup-temp', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, cleaned: 0, message: 'No uploads folder found' });
    }
    
    const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
    let cleanedCount = 0;
    const cleanedFolders = [];
    
    entries.forEach(entry => {
      if (entry.isDirectory() && entry.name.startsWith('temp-')) {
        const tempPath = path.join(uploadsDir, entry.name);
        try {
          fs.rmSync(tempPath, { recursive: true, force: true });
          cleanedCount++;
          cleanedFolders.push(entry.name);
          console.log(`🧹 Cleaned up temp folder: ${entry.name}`);
        } catch (err) {
          console.error(`❌ Failed to clean temp folder ${entry.name}:`, err.message);
        }
      }
    });
    
    res.json({ 
      success: true, 
      cleaned: cleanedCount, 
      folders: cleanedFolders,
      message: `Cleaned up ${cleanedCount} temp folder(s)` 
    });
  } catch (error) {
    console.error('Error cleaning temp folders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crawler API - Scan uploads folder for device folders
app.post('/api/crawler/scan', async (req, res) => {
  try {
    // Check if an index is selected (needed to check if folders are already indexed)
    if (!selectedIndex) {
      return res.status(400).json({ 
        success: false, 
        error: 'No index selected. Please create or select an index first to scan folders.' 
      });
    }

    const { forceReindex, customPath } = req.body;
    
    // Determine uploads directory
    let uploadsDir;
    if (customPath && typeof customPath === 'string' && customPath.trim() !== '') {
        uploadsDir = path.resolve(customPath.trim());
        console.log(`Using custom crawler path: ${uploadsDir}`);
    } else {
        uploadsDir = path.join(__dirname, 'uploads');
        console.log(`Using default uploads path: ${uploadsDir}`);
    }
    
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({ 
          success: false, 
          error: `Source directory not found: ${uploadsDir}` 
      });
    }

    const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
    const folders = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip temp folders created during upload process
        if (entry.name.startsWith('temp-')) {
          console.log(`⏭️ Skipping temp folder: ${entry.name}`);
          continue;
        }
        
        const folderPath = path.join(uploadsDir, entry.name);
        
        // Calculate folder hash - deviceId is the folder name itself
        const deviceId = entry.name;
        // Check if hash file exists in the directory, otherwise calculate
        const folderHash = calculateFolderHash(folderPath);
        
        // Use full path for internal use, but we might want shorter display name if needed
        // For processing, we use folderPath which is now correctly resolved

        let alreadyExists = false;
        if (!forceReindex) {
          const checksumExists = isFolderAlreadyProcessed(folderHash, deviceId, selectedIndex);
          if (checksumExists) {
            // Verify documents actually exist in Elasticsearch
            try {
              const verifyResult = await client.search({
                index: selectedIndex,
                body: {
                  query: {
                    bool: {
                      must: [
                        { term: { 'device_id.keyword': deviceId } },
                        { term: { 'folder_hash.keyword': folderHash } }
                      ]
                    }
                  },
                  size: 1
                }
              });
              alreadyExists = verifyResult.body.hits.total.value > 0;
              
              // If checksum says it exists but ES has no documents, remove the checksum
              if (!alreadyExists) {
                console.log(`⚠️ Checksum exists for ${deviceId} but no documents found in ${selectedIndex}, removing stale checksum`);
                removeChecksum(folderHash, deviceId, selectedIndex);
              }
            } catch (esError) {
              console.error(`Error verifying documents in ES for ${deviceId}:`, esError.message);
              // If ES check fails, trust the checksum
              alreadyExists = checksumExists;
            }
          }
        }
        
        // Count files and supported files
        let fileCount = 0;
        let supportedFileCount = 0;
        const countFiles = (dir) => {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          items.forEach(item => {
            if (item.isDirectory()) {
              countFiles(path.join(dir, item.name));
            } else {
              fileCount++;
              const fullPath = path.join(dir, item.name);
              if (isAllowedFile(fullPath)) {
                supportedFileCount++;
              }
            }
          });
        };
        countFiles(folderPath);

        folders.push({
          name: entry.name,
          path: folderPath,
          folderHash,
          deviceId,
          alreadyExists,
          fileCount,
          supportedFileCount
        });
      }
    }

    res.json({ success: true, folders });
  } catch (error) {
    console.error('Error scanning uploads folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crawler API - Crawl and ingest selected folders
app.post('/api/crawler/crawl', async (req, res) => {
  const { folders } = req.body;

  if (!folders || folders.length === 0) {
    return res.status(400).json({ success: false, error: 'No folders provided' });
  }

  // Check if an index is selected and exists
  if (!selectedIndex) {
    return res.status(400).json({ 
      success: false, 
      error: 'No index selected. Please create or select an index first.' 
    });
  }

  // Verify the selected index exists
  try {
    const indexExists = await client.indices.exists({ index: selectedIndex });
    if (!indexExists) {
      return res.status(400).json({ 
        success: false, 
        error: `Index "${selectedIndex}" does not exist. Please create an index first.` 
      });
    }
  } catch (error) {
    console.error('Error checking index existence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to verify index existence: ' + error.message 
    });
  }

  // Set headers for SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = (progress, message, detail = null) => {
    const data = { progress, message };
    if (detail) data.detail = detail;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const totalFolders = folders.length;
    let processedFolders = 0;

    for (const folder of folders) {
      const folderName = folder.name;
      const folderPath = folder.path;

      sendProgress(
        Math.round((processedFolders / totalFolders) * 100),
        `Processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
        `📁 Starting: ${folderName}`
      );

      try {
        // Get all files from the folder
        const allFiles = [];
        const getAllFiles = (dir, basePath = '') => {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          items.forEach(item => {
            const fullPath = path.join(dir, item.name);
            const relativePath = path.join(basePath, item.name);
            
            if (item.isDirectory()) {
              getAllFiles(fullPath, relativePath);
            } else {
              allFiles.push({ fullPath, relativePath });
            }
          });
        };
        getAllFiles(folderPath);

        sendProgress(
          Math.round((processedFolders / totalFolders) * 100),
          `Processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
          `Found ${allFiles.length} files in ${folderName}`
        );

        // Filter only allowed files
        const allowedFiles = allFiles.filter(file => {
          const ext = path.extname(file.fullPath).toLowerCase();
          const isAllowed = isAllowedFile(file.fullPath);
          if (!isAllowed && allFiles.length < 20) {
            // Debug: log first few rejected files
            console.log(`  ⏭️ Skipping ${file.relativePath} (ext: ${ext})`);
          }
          return isAllowed;
        });

        console.log(`📊 Folder ${folderName}: ${allFiles.length} total files, ${allowedFiles.length} allowed (.html/.txt/.csv/.xlsx)`);

        sendProgress(
          Math.round((processedFolders / totalFolders) * 100),
          `Processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
          `Ingesting ${allowedFiles.length} allowed files from ${folderName}`
        );

        // Ingest files
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allowedFiles.length; i++) {
          const file = allowedFiles[i];
          try {
            await ingestSingleFile(file.fullPath, file.relativePath, folder.deviceId, folder.folderHash);
            successCount++;
            
            // Send progress every 10 files or on last file
            if ((i + 1) % 10 === 0 || i === allowedFiles.length - 1) {
              sendProgress(
                Math.round((processedFolders / totalFolders) * 100),
                `Processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
                `✅ Ingested ${successCount}/${allowedFiles.length} files`
              );
            }
          } catch (err) {
            errorCount++;
            sendProgress(
              Math.round((processedFolders / totalFolders) * 100),
              `Processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
              `❌ Error ingesting ${file.relativePath}: ${err.message}`
            );
          }
        }

        // Save checksum after successful ingestion - now index-specific
        if (successCount > 0) {
          saveChecksum(folder.folderHash, folder.deviceId, folderName, selectedIndex);
          sendProgress(
            Math.round(((processedFolders + 1) / totalFolders) * 100),
            `Completed folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
            `✅ Completed: ${folderName} (${successCount} files ingested, ${errorCount} errors)`
          );
        } else {
          sendProgress(
            Math.round(((processedFolders + 1) / totalFolders) * 100),
            `Completed folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
            `⚠️ No files ingested from ${folderName}`
          );
        }

      } catch (err) {
        sendProgress(
          Math.round(((processedFolders + 1) / totalFolders) * 100),
          `Error processing folder ${processedFolders + 1}/${totalFolders}: ${folderName}`,
          `❌ Folder error: ${err.message}`
        );
      }

      processedFolders++;
    }

    sendProgress(100, '✅ All folders processed successfully!', '🎉 Crawling completed!');
    res.end();

  } catch (error) {
    console.error('Crawler error:', error);
    sendProgress(0, '❌ Crawler error: ' + error.message, null);
    res.end();
  }
});

// Helper function to ingest a single file
async function ingestSingleFile(filePath, relativePath, deviceId, folderHash) {
  const ext = path.extname(filePath).toLowerCase();
  let content = '';
  let htmlContent = '';

  // Get selected index - should always be set by now (checked in endpoint)
  const indexToUse = selectedIndex;

  try {
    if (ext === '.txt') {
      content = fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.html' || ext === '.htm') {
      try {
        htmlContent = fs.readFileSync(filePath, 'utf8'); // Store original HTML
        const extractedText = convertHtmlToText(filePath); // Extract searchable text
        content = extractedText || htmlContent; // Fallback to raw HTML if extraction fails
      } catch (htmlError) {
        console.error(`Error processing HTML file ${filePath}:`, htmlError.message);
        // Fallback: try to read as plain text
        try {
          content = fs.readFileSync(filePath, 'utf8');
          htmlContent = content;
        } catch (fallbackError) {
          content = `[Error reading HTML file: ${htmlError.message}]`;
          htmlContent = '';
        }
      }
    } else if (ext === '.csv') {
      content = fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.xlsx' || ext === '.xls') {
      content = await convertExcelToMarkdown(filePath);
    } else if (ext === '.pdf') {
      content = await convertPdfToMarkdown(filePath);
    } else {
      // For other file types, just store the filename
      content = path.basename(filePath);
    }
  } catch (readError) {
    console.error(`Error reading file ${filePath}:`, readError.message);
    content = `[Error reading file: ${readError.message}]`;
  }

  // Ensure content and htmlContent are always strings (not null, undefined, or objects)
  if (content === null || content === undefined) {
    content = '';
  }
  if (typeof content !== 'string') {
    console.warn(`Content is not a string for ${filePath}, type: ${typeof content}, converting...`);
    try {
      content = String(content);
    } catch (e) {
      console.error(`Failed to convert content to string for ${filePath}:`, e.message);
      content = '';
    }
  }
  
  if (htmlContent === null || htmlContent === undefined) {
    htmlContent = '';
  }
  if (typeof htmlContent !== 'string') {
    console.warn(`htmlContent is not a string for ${filePath}, type: ${typeof htmlContent}, converting...`);
    try {
      htmlContent = String(htmlContent);
    } catch (e) {
      console.error(`Failed to convert htmlContent to string for ${filePath}:`, e.message);
      htmlContent = '';
    }
  }

  // Parse the path to extract subdirectory (match the regular upload structure)
  const pathParts = relativePath.split(path.sep);
  let subdirectory = '';
  if (pathParts.length > 1) {
    // Remove the filename from the path parts
    subdirectory = pathParts.slice(0, -1).join('/');
  }

  // Create document for Elasticsearch - matching the exact structure from regular upload
  const doc = {
    device_id: String(deviceId || 'unknown'),
    subdirectory: String(subdirectory || ''),
    full_path: String(filePath || ''),
    file_name: path.basename(filePath),
    extracted_text: String(content || ''),
    html_content: htmlContent || undefined, // Only include if it's an HTML file
    folder_hash: String(folderHash || ''),
    timestamp: new Date().toISOString()
  };

  // Remove undefined fields
  Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key]);

  // Validate that we have at least some content
  if (!doc.extracted_text && !doc.html_content) {
    console.warn(`Warning: No content extracted from ${filePath}`);
    doc.extracted_text = `[File: ${doc.file_name}]`;
  }

  // Index the document
  await client.index({
    index: indexToUse,
    document: doc
  });
}

app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});

module.exports = { indexDirectory };