const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
        console.log(`${indent}  ✓ ${item} (${stats.size} bytes) -> ${fileSignature}`);
      }
    }
  }

  console.log(`🔢 Calculating hash for: ${dirPath}`);
  hashDirectory(dirPath);
  
  const finalHash = hash.digest('hex');
  console.log(`🔑 Final hash: ${finalHash}`);
  return finalHash;
}

// Test on the actual uploaded folder
const testPath = path.join(__dirname, 'uploads', 'wifipassword-5b81350f37b896b0');
console.log('Testing hash on:', testPath);
console.log('Exists:', fs.existsSync(testPath));
console.log('');

const hash1 = calculateFolderHash(testPath);
console.log('\n--- Running again to verify consistency ---\n');
const hash2 = calculateFolderHash(testPath);

console.log('\n=== RESULTS ===');
console.log('First hash: ', hash1);
console.log('Second hash:', hash2);
console.log('Match:', hash1 === hash2 ? '✅ YES' : '❌ NO');
