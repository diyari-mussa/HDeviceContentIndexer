# Device Search & Indexer - Usage Instructions

## Quick Start

### Option 1: Simple Batch File (Recommended)
1. Double-click `START_APP.bat`
2. Wait 15-20 seconds for Elasticsearch to initialize
3. Browser opens automatically at `http://localhost:3000`
4. To stop: Close the console window or run `STOP_APP.bat`

### Option 2: Manual Start
1. Start Elasticsearch:
   ```
   elasticsearch-9.1.5\bin\elasticsearch.bat
   ```
2. Wait 15-20 seconds for initialization
3. Start the server:
   ```
   npm start
   ```
4. Open browser: http://localhost:3000

## Features Overview

- 🔍 **Search** - Full-text search across indexed content with highlighting
- 📤 **Upload** - Manual folder upload with file selection
- 🤖 **Crawler** - Batch process multiple device folders automatically  
- 📱 **Devices** - View and manage uploaded devices
- ⚙️ **Settings** - Create/manage Elasticsearch indices and view sample documents

## Using the Application

### 1. First-Time Setup

1. Navigate to **Settings** (⚙️ icon)
2. Create your first index:
   - Click "➕ Create New Index"
   - Enter a name (e.g., "my-devices")
   - Click Create
3. Select the index from the list
4. Click "✅ Use Selected Index"
5. Your selected index appears in the header

### 2. Manual Upload

**Use this for single folder uploads:**

1. Go to **Upload** page
2. Ensure an index is selected (shown at top)
3. Drag & drop a folder or click "Choose Folder"
4. Review file tree (green = new, yellow = duplicate)
5. Select files to ingest (only .html, .txt, .csv supported)
6. Click "Ingest Selected Files"

### 3. Batch Crawler (Recommended for Multiple Folders)

**Use this to process multiple device folders at once:**

1. Place device folders in the `uploads/` directory
2. Go to **Upload** page → **🤖 Crawler** tab
3. Select your index from dropdown
4. Click **"🔄 Scanning..."** to discover folders
5. View folder list:
   - ✅ Green = New, ready to index
   - 🔒 Gray = Already indexed in this index
6. Select folders:
   - **Select All** - Select everything
   - **Deselect All** - Clear selection  
   - **✅ Select New Only** - Auto-select only new folders
7. Optional: Check **"⚠️ Force Re-index"** to ignore checksums
8. Click **"🚀 Start Crawling Selected Folders"**
9. Watch real-time progress updates

**Crawler Features:**
- Automatically filters supported files (.html, .txt, .csv)
- Shows file count for each folder
- Real-time progress with live updates
- Verifies existing documents in Elasticsearch
- Removes stale checksums automatically
- Skips temporary upload folders

### 4. Searching Content

1. Go to **Search** page (🔍 icon)
2. Enter search query
3. View results with:
   - Relevance score
   - File name and device
   - Highlighted matching text
   - HTML preview toggle

### 5. Managing Devices

1. Visit **Devices** page (📱 icon)
2. View all indexed devices with stats
3. Click "View Files" to see device contents
4. Actions:
   - **Delete** - Remove device from index AND delete checksums
   - **Cleanup Folder** - Remove physical folder from uploads/

## Important Notes

### Checksum System

- **Index-Specific**: Same folder can be indexed in multiple indices
- **Auto-Cleanup**: Checksums deleted when device is deleted
- **Verification**: Checks Elasticsearch to ensure documents exist
- **Stale Removal**: Removes checksums for deleted documents

### Supported Files

Only these file types are indexed:
- ✅ `.html` / `.htm` - Full text extraction
- ✅ `.txt` - Plain text
- ✅ `.csv` - Comma-separated values

All other files (.pdf, .jpg, .mp4, etc.) are **skipped automatically**.

### Index Preview

Settings page shows **5 sample documents** from selected index for quick preview.

## Troubleshooting

### Port Already in Use
If you see errors about ports 3000 or 9200:
1. Run `STOP_APP.bat` to kill all Node.js and Java processes
2. Wait a few seconds
3. Try starting again with `START_APP.bat`

### Elasticsearch Won't Start
- **Check Java**: Java is bundled with Elasticsearch
- **Port 9200**: Ensure port is not used by another application
- **Administrator**: Try running as Administrator
- **Logs**: Check `elasticsearch-9.1.5/logs/` for errors

### Application Not Loading
- **Wait Time**: Allow 15-20 seconds after starting
- **Console Errors**: Check the console window for error messages
- **ES Status**: Verify Elasticsearch: http://localhost:9200
- **Browser**: Try refreshing or opening in incognito mode

### "No index selected" Error
- Go to Settings
- Select an index from the list
- Click "✅ Use Selected Index"
- Refresh the page

### Crawler Shows "Already Indexed" for Deleted Device
This is now automatically fixed! The crawler:
1. Checks if checksum exists
2. Verifies documents exist in Elasticsearch
3. Removes stale checksums if documents are gone
4. Shows folder as "New" if no documents found

### Files Not Being Indexed
- **File Types**: Only .html, .txt, .csv are supported
- **Crawler Tab**: Use the Crawler tab for batch processing
- **Console Logs**: Check server console for errors
- **Disk Space**: Ensure sufficient disk space

### Duplicate Folder Upload
- **Different Indices**: Same folder can exist in multiple indices
- **Force Re-index**: Check the "Force Re-index" option in crawler
- **Delete Device**: Delete device from Devices page to remove checksums

## Tips & Best Practices

1. **Use Crawler for Bulk**: Manual upload is for single folders, crawler for multiple
2. **Organize by Index**: Create separate indices for different categories/projects
3. **Regular Cleanup**: Delete old devices to free up space
4. **Monitor Console**: Keep an eye on console for errors or warnings
5. **Backup Data**: Periodically backup `elasticsearch-9.1.5/data/` and `folder_checksums.json`

## Distribution

To share this application with others:

### What to Include
1. **Required Files/Folders**:
   - `elasticsearch-9.1.5/` - Complete Elasticsearch installation
   - `node_modules/` - All dependencies
   - `public/` - Frontend files
   - `file-processors/` - File conversion modules
   - `index.js` - Main server file
   - `package.json` - Project configuration
   - `START_APP.bat` & `STOP_APP.bat` - Launcher scripts
   - `README.md` & `README_USAGE.md` - Documentation

2. **Optional** (created at runtime):
   - `uploads/` - Will be created automatically
   - `folder_checksums.json` - Generated when first folder is uploaded

### Recipient Requirements
- **Node.js** (v18 or higher) must be installed
- **Windows** operating system (tested on Windows 10/11)
- **Sufficient disk space** for Elasticsearch data

### Setup for Recipient
1. Extract all files to a folder
2. Double-click `START_APP.bat`
3. Wait 15-20 seconds
4. Browser opens automatically

## Data Storage Locations

- **Elasticsearch Data**: `elasticsearch-9.1.5/data/`
- **ES Logs**: `elasticsearch-9.1.5/logs/`
- **Uploaded Folders**: `uploads/`
- **Checksum Database**: `folder_checksums.json`

## Performance Notes

- **First Startup**: 15-20 seconds (Elasticsearch initialization)
- **Subsequent Starts**: 10-15 seconds (faster)
- **Crawling Speed**: ~50-100 files/second depending on file size
- **Search Speed**: Instant (Elasticsearch indexing)
- **Disk Usage**: Varies by content (Elasticsearch uses compression)

## System Requirements

- **OS**: Windows 10/11
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 1GB for application + storage for your data
- **CPU**: Any modern processor
- **Ports**: 3000 (app) and 9200 (Elasticsearch) must be available

---

**For detailed feature documentation, see README.md**
