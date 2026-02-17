# Device Search & Indexer - Usage Instructions

## Quick Start

### Option 1: Simple Batch File (Recommended)
1. Double-click `START_APP.bat`
2. Wait 15-20 seconds for Elasticsearch to initialize
3. Browser opens automatically at `http://localhost:3001`
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
4. Open browser: http://localhost:3001

## Pages Overview

- 🔍 **Search** (`index.html`) - Full-text search with General and Mobile Number modes
- 📤 **Upload** (`upload.html`) - Manual folder upload with drag-and-drop and tree view
- 🤖 **Crawler** (`crawler.html`) - Batch scan and ingest multiple device folders
- 📱 **Devices** (`devices.html`) - View, search, and manage indexed devices
- ⚙️ **Settings** (`settings.html`) - Index management, ES status, search configuration
- 🔀 **File Converter** (`file-converter.html`) - Preview PDF/HTML → Markdown conversion

## Using the Application

### 1. First-Time Setup

1. Navigate to **Settings** (⚙️ icon)
2. Check that the Elasticsearch status indicator is green
3. Create your first index:
   - Click "➕ Create New Index"
   - Enter a name (e.g., "my-devices")
   - Click Create
4. Select the index from the list
5. Click "✅ Use Selected Index"
6. Your selected index appears in the header of every page

### 2. Manual Upload

**Use this for single folder uploads:**

1. Go to **Upload** page
2. Ensure an index is selected (shown at top)
3. Drag & drop a folder or click "Choose Folder"
4. Review file tree:
   - ✅ Green banner = New folder, safe to upload
   - ⚠️ Yellow banner = Duplicate detected (warning with confirmation)
5. Select files to ingest (supported: `.html`, `.htm`, `.txt`, `.csv`, `.xlsx`, `.xls`, `.pdf`)
6. Click "Ingest Selected Files"
7. Monitor progress via the SSE progress modal (progress bar + file-by-file status)

**Additional Upload Features:**
- **Checksums History**: Click "🔐 Checksums History" to view all uploaded folder checksums
- **Select All / Deselect All**: Quickly toggle file selection
- **Folder cascading**: Checking a folder checkbox selects all its children

### 3. Batch Crawler (Recommended for Multiple Folders)

**Use this to process multiple device folders at once:**

1. Go to **Crawler** page (🤖 icon in navigation)
2. Select your index from the dropdown
3. Optionally enter a **custom directory path** (defaults to `uploads/`)
4. Click **"🔄 Scan"** to discover folders
5. View folder list with status indicators:
   - ✅ **New** (green) = Has supported files, ready to index (auto-selected)
   - 🔒 **Already Indexed** (amber) = Found in checksums + verified in Elasticsearch
   - ⚪ **Neglected** (grey) = No supported file types found (checkbox disabled)
6. Select folders:
   - **Select All** - Select everything eligible
   - **Deselect All** - Clear selection
   - **✅ Select New Only** - Auto-select only new folders
7. Optional: Check **"⚠️ Force Re-index"** to ignore checksums
8. Click **"🚀 Start Crawling Selected Folders"**
9. Watch real-time progress (SSE progress bar + color-coded detail log)
10. Folders auto re-scan after crawling completes

**Crawler Features:**
- Automatically filters for supported files (`.html`, `.htm`, `.txt`, `.csv`, `.xlsx`, `.xls`, `.pdf`)
- Shows file count for each folder
- Real-time progress with live SSE updates
- Verifies existing documents in Elasticsearch
- Removes stale checksums automatically
- Skips temporary upload folders
- **Custom path support** — scan any directory on your system
- **Temp folder cleanup** button for orphaned `temp-*` folders

### 4. Searching Content

#### General Search
1. Go to **Search** page (🔍 icon)
2. Enter search query (e.g., "john doe")
3. Each word is searched as `*word*` (wildcard) — all terms must match
4. Exact phrase matches score higher (×10 boost)
5. Toggle "Wildcard / Advanced Search" for raw Elasticsearch query string syntax
6. Results display:
   - 📄 File name (clickable)
   - 📱 Device ID, 📂 Folder path, 📅 Timestamp
   - 🗂️ Index name, Score badge
   - 📁 Full file path (monospace)
   - Content snippet with highlighted matching terms

#### Mobile Number Search
1. Switch to **Mobile Number Search** tab
2. Enter a phone number in any format
3. The system generates format variations automatically (Iraqi phone formats):
   - `+964` prefix, `0` prefix, raw digits
   - Spaced formats: `770 221 6262`, `0770 221 62 62`, etc.
4. All variations are searched simultaneously
5. Matched variations displayed above results

#### Pagination
- Page size configurable in Settings (10 / 20 / 50 / 100 / 200)
- Navigation: Previous/Next buttons + numbered page buttons (max 7 visible)
- Shows "Showing X-Y of Z results (Page N of M)"

#### Safe Content Display
- HTML content from indexed files is **escaped** — no HTML tags render in results
- Only Elasticsearch highlight `<em>` tags are preserved with styled cyan background
- Empty highlight objects fall back to `extracted_text` instead of showing blank

### 5. Managing Devices

1. Visit **Devices** page (📱 icon)
2. **Search** devices by name (real-time filtering with 300ms debounce)
3. Browse paginated device list (50 per page with full navigation)
4. Each device card shows: device ID, file count, first/last indexed date, folder hash
5. Actions per device:
   - **View Files** - Toggle file list (file name, subdirectory, timestamp, document ID)
   - **Cleanup Folder** - Remove physical folder from `uploads/` (keeps ES data)
   - **Delete Device** - Remove from ES index + delete associated checksums

### 6. Settings & Configuration

1. Navigate to **Settings** (⚙️ icon)
2. **Elasticsearch Status**: Real-time indicator (green/yellow/red) with 5-second polling
   - Shows cluster name and health status
   - "Start Elasticsearch" button appears when ES is disconnected
3. **Index Management**:
   - Create new indices (left panel)
   - Click an index to preview its first 5 documents (right panel)
   - Hover to reveal delete button
4. **Search Configuration**:
   - ☐ Search ALL indexes — toggle to search across all indices
   - Results per page dropdown: 10, 20 (default), 50, 100, 200
5. **Selected Index**: Click "Use This Index" to set the active index (saved to cookie + server)

### 7. File Converter Preview

1. Navigate to `file-converter.html`
2. Upload a PDF or HTML file
3. View side-by-side: original content (left) vs. Markdown output (right)
4. Useful for verifying how files will be processed before indexing

## Important Notes

### Checksum System

- **Index-Specific**: Same folder can be indexed in multiple indices
- **Auto-Cleanup**: Checksums deleted when device is deleted
- **Verification**: Checks Elasticsearch to ensure documents exist
- **Stale Removal**: Removes checksums for deleted documents
- **Force Re-index**: Bypass checksums via the checkbox in Crawler

### Supported Files

Only these file types are indexed:
- ✅ `.html` / `.htm` - Full text extraction via Cheerio
- ✅ `.txt` - Plain text with paragraph/heading detection
- ✅ `.csv` - Converted to Markdown tables
- ✅ `.xlsx` / `.xls` - Multi-sheet Excel → Markdown tables
- ✅ `.pdf` - Page-by-page extraction with artifact filtering

All other files (.jpg, .mp4, .zip, etc.) are **skipped automatically**.

### Index Preview

Settings page shows **5 sample documents** from selected index as formatted JSON.

### Search Highlight Safety

- HTML content from indexed files is **escaped** before display in search results
- This prevents giant styled text or broken layouts from HTML file content
- Elasticsearch `<em>` highlight tags are preserved with styled cyan highlighting
- If Elasticsearch returns empty highlights, the system falls back to `extracted_text`

### Debug Logging

Console logs are available in the browser DevTools (F12) for troubleshooting:
- `[Search]` — API response summary (total, count, page info)
- `[Search] First result sample` — Structure of first result (highlight keys, source keys)
- `[displayResult]` — Per-result: highlight presence, extracted_text availability
- `[processHighlights]` — Input type, empty checks, output length

## Troubleshooting

### Port Already in Use
If you see errors about ports 3001 or 9200:
1. Run `STOP_APP.bat` to kill all Node.js and Java processes
2. Wait a few seconds
3. Try starting again with `START_APP.bat`

### Elasticsearch Won't Start
- **Java**: Java is bundled with Elasticsearch (no separate install needed)
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

### Search Results Are Blank
This has been fixed. The issue was that Elasticsearch sometimes returns an empty highlight object (`{}`), which is truthy but contains no data. The fix:
- Validates that `res.highlight` has actual keys before using it
- Falls back to `source.extracted_text` if highlights are empty
- Open browser DevTools (F12) Console tab to see debug logs

### Search Results Show Giant/Styled Text
This has been fixed. The issue was that HTML tags from indexed HTML files were being rendered in search results. The fix:
- All HTML content is now escaped via `escapeHtml()` before display
- Only Elasticsearch `<em>` highlight tags are preserved (via placeholder swap)

### Crawler Shows "Already Indexed" for Deleted Device
This is automatically fixed! The crawler:
1. Checks if checksum exists
2. Verifies documents exist in Elasticsearch
3. Removes stale checksums if documents are gone
4. Shows folder as "New" if no documents found

### Files Not Being Indexed
- **File Types**: Only `.html`, `.htm`, `.txt`, `.csv`, `.xlsx`, `.xls`, `.pdf` are supported
- **Crawler**: Use the Crawler page for batch processing
- **Console Logs**: Check server console for errors
- **Disk Space**: Ensure sufficient disk space

### Duplicate Folder Upload
- **Different Indices**: Same folder can exist in multiple indices
- **Force Re-index**: Check the "Force Re-index" option in crawler
- **Delete Device**: Delete device from Devices page to remove checksums

## Tips & Best Practices

1. **Use Crawler for Bulk**: Manual upload is for single folders, crawler for multiple
2. **Custom Paths**: Use the crawler's custom path input to scan directories outside `uploads/`
3. **Organize by Index**: Create separate indices for different categories/projects
4. **Regular Cleanup**: Delete old devices to free up space
5. **Monitor Console**: Keep an eye on console for errors or warnings
6. **Debug on Other Machines**: Open browser DevTools (F12) to see search debug logs
7. **Backup Data**: Periodically backup `elasticsearch-9.1.5/data/` and `folder_checksums.json`
8. **Page Size**: Adjust results per page in Settings (10/20/50/100/200) for better performance

## Distribution

To share this application with others:

### What to Include
1. **Required Files/Folders**:
   - `elasticsearch-9.1.5/` - Complete Elasticsearch installation (includes JDK)
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
4. Browser opens automatically at `http://localhost:3001`

## Data Storage Locations

- **Elasticsearch Data**: `elasticsearch-9.1.5/data/`
- **ES Logs**: `elasticsearch-9.1.5/logs/`
- **Uploaded Folders**: `uploads/`
- **Checksum Database**: `folder_checksums.json`

## Performance Notes

- **First Startup**: 15-20 seconds (Elasticsearch initialization)
- **Subsequent Starts**: 10-15 seconds (faster)
- **Crawling Speed**: ~50-100 files/second depending on file size
- **Search Speed**: Near-instant (Elasticsearch indexing)
- **Disk Usage**: Varies by content (Elasticsearch uses compression)
- **Payload Limit**: 500MB for large folder scans

## System Requirements

- **OS**: Windows 10/11
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 1GB for application + storage for your data
- **CPU**: Any modern processor
- **Ports**: 3001 (app) and 9200 (Elasticsearch) must be available
- **Node.js**: v18 or higher

---

**For detailed feature documentation, see README.md**
