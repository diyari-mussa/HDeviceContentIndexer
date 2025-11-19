const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load the main index.js functions
const indexPath = path.join(__dirname, 'index.js');

// Simple checksum functions
const CHECKSUM_FILE = path.join(__dirname, 'folder_checksums.json');

function loadChecksums() {
  if (fs.existsSync(CHECKSUM_FILE)) {
    const data = fs.readFileSync(CHECKSUM_FILE, 'utf8');
    return JSON.parse(data);
  }
  return {};
}

function saveChecksum(folderHash, deviceId, folderName) {
  const checksums = loadChecksums();
  const key = `${folderHash}:${deviceId}`;
  checksums[key] = {
    hash: folderHash,
    deviceId,
    folderName,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksums, null, 2));
  console.log('✅ Saved checksum to file');
}

function isFolderAlreadyProcessed(folderHash, deviceId) {
  const checksums = loadChecksums();
  const key = `${folderHash}:${deviceId}`;
  return checksums.hasOwnProperty(key);
}

function calculateFolderHash(dirPath) {
  const hash = crypto.createHash('sha256');

  function hashDirectory(currentPath, indent = '') {
    const items = fs.readdirSync(currentPath).sort();
    console.log(`${indent}📁 ${path.basename(currentPath)}/`);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.relative(dirPath, itemPath);
      
      if (stats.isDirectory()) {
        hash.update(`DIR:${relativePath}`);
        hashDirectory(itemPath, indent + '  ');
      } else if (stats.isFile()) {
        const ext = path.extname(itemPath).toLowerCase();
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

// Main function
async function main() {
  const folderName = process.argv[2];
  
  if (!folderName) {
    console.error('❌ Usage: node ingest-folder.js <folder-name>');
    console.error('   Example: node ingest-folder.js wifipassword-5b81350f37b896b0');
    process.exit(1);
  }

  const folderPath = path.join(__dirname, 'uploads', folderName);
  
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    process.exit(1);
  }

  console.log('\n================================');
  console.log('📂 FOLDER INGEST TOOL');
  console.log('================================\n');
  console.log('Folder:', folderName);
  console.log('Path:', folderPath);
  console.log('');

  // Calculate hash
  const folderHash = calculateFolderHash(folderPath);
  const deviceId = folderName;

  console.log('');
  console.log('================================');
  console.log('🔍 CHECKING FOR DUPLICATES');
  console.log('================================');
  console.log('Hash:', folderHash);
  console.log('Device ID:', deviceId);
  console.log('');

  // Check if already processed
  const alreadyProcessed = isFolderAlreadyProcessed(folderHash, deviceId);
  
  if (alreadyProcessed) {
    console.log('⚠️  DUPLICATE DETECTED!');
    console.log('This folder has already been processed.');
    console.log('Checksum file contains this hash.');
    console.log('');
    console.log('To force re-ingest, remove the entry from folder_checksums.json');
    process.exit(0);
  }

  console.log('✅ NEW FOLDER - Ready to ingest');
  console.log('');
  console.log('This folder has not been processed before.');
  console.log('You can now ingest it through the web interface.');
  console.log('');
  console.log('After ingestion completes, run this command again to save the checksum:');
  console.log(`  node save-checksum.js ${folderName} ${folderHash}`);
}

main().catch(console.error);
