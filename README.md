# HDeviceContentIndexer

A powerful desktop application for indexing and searching device folder contents using Elasticsearch. Perfect for managing and searching through large collections of HTML, TXT, PDF, and CSV files.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Elasticsearch](https://img.shields.io/badge/elasticsearch-9.1.5-orange.svg)

## ✨ Features

- 🔍 **Full-Text Search** - Search across all indexed files with highlighting
- 📤 **Folder Upload** - Upload entire folder structures for indexing
- 🤖 **Batch Crawler** - Automatically scan and ingest multiple device folders from uploads directory
- 📱 **Device Management** - Organize content by device with easy management
- 🔄 **Smart Duplicate Detection** - Index-specific SHA-256 hash-based duplicate folder detection
- 🎨 **Modern UI** - Clean, gradient-based interface with responsive design
- 📊 **Multiple Formats** - Support for HTML, TXT, CSV files (with extensible architecture)
- 🗂️ **Index Management** - Create, view, and manage multiple Elasticsearch indices
- 🧹 **Cleanup Tools** - Remove physical folders and checksums when deleting devices
- 📈 **Real-time Progress** - Server-Sent Events (SSE) for live crawling progress updates

## 🖼️ Screenshots

### Search Dashboard
Search through indexed content with real-time highlighting and HTML preview.

### Upload Interface
Drag-and-drop folder upload with tree view and file selection.

### Device Management
View all indexed devices, manage files, and cleanup storage.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Java** (bundled with Elasticsearch)
- **Windows** (tested on Windows 10/11)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/diyari-mussa/HDeviceContentIndexer.git
   cd HDeviceContentIndexer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   # Simply double-click START_APP.bat
   # OR run manually:
   npm start
   ```

### First Run

1. Double-click `START_APP.bat`
2. Wait 15-20 seconds for Elasticsearch to start
3. Browser will open automatically at `http://localhost:3000`
4. Go to **Settings** to create your first index
5. Upload folders and start searching!

## 📖 Usage

### Starting the Application

**Easy Method (Recommended):**
```bash
Double-click START_APP.bat
```

**Manual Method:**
```bash
# Terminal 1: Start Elasticsearch
elasticsearch-9.1.5\bin\elasticsearch.bat

# Terminal 2: Start the server (after 15 seconds)
npm start
```

### Stopping the Application

```bash
Double-click STOP_APP.bat
# OR close the console window
```

### Managing Indices

1. Navigate to **Settings** page
2. Click "➕ Create New Index" and enter a name
3. Select an index from the list to view its documents (preview shows 5 documents)
4. Click "✅ Use Selected Index" to make it active
5. The active index will be used for all uploads and searches

### Uploading Content (Manual Upload)

1. Navigate to **Upload** page
2. Ensure an index is selected (shown at top)
3. Drag and drop a folder or click "Choose Folder"
4. Review the file tree
5. Select files to index (only .html, .txt, .csv are supported)
6. Click "Ingest Selected Files"

### Batch Crawling (Automated)

The **Crawler** feature allows you to batch-process multiple device folders:

1. Go to **Upload** page and click **"🤖 Crawler"** tab
2. Select an index from the dropdown
3. Click **"🔄 Scanning..."** to scan the uploads folder
4. View discovered folders with:
   - ✅ **New** - Available for indexing
   - 🔒 **Already Indexed** - Already exists in selected index
5. Use selection buttons:
   - **Select All** - Select all folders
   - **Deselect All** - Clear selection
   - **✅ Select New Only** - Select only new folders
6. Check **"⚠️ Force Re-index"** to ignore existing checksums
7. Click **"🚀 Start Crawling Selected Folders"**
8. Watch real-time progress with live updates

**Crawler Features:**
- Skips temporary upload folders automatically
- Shows file count for each folder
- Filters files by extension (.html, .txt, .csv only)
- Real-time progress with Server-Sent Events
- Verifies documents exist before marking as indexed
- Removes stale checksums automatically

### Searching

1. Go to **Search** page
2. Enter your search query
3. View results with highlighting
4. Toggle between text/HTML view for HTML files

### Managing Devices

1. Visit the **Devices** page
2. View all indexed devices with statistics
3. Click "View Files" to see device contents
4. Use "Cleanup Folder" to remove physical files
5. Use "Delete" to remove from Elasticsearch

## 🛠️ Configuration

### Elasticsearch Settings

- **Default Host:** `http://localhost:9200`
- **Data Directory:** `elasticsearch-9.1.5/data/`
- **Logs Directory:** `elasticsearch-9.1.5/logs/`

### Application Settings

- **Server Port:** `3000`
- **Uploads Directory:** `uploads/`
- **Checksums File:** `folder_checksums.json`

### Supported File Types

- **HTML/HTM** - Full HTML rendering with text extraction using Cheerio
- **TXT** - Plain text files
- **CSV** - Comma-separated values files
- **INFO** - Information files (treated as text)

**Note:** PDF support is available in the code but currently not actively filtered by the crawler.

## 📁 Project Structure

```
HDeviceContentIndexer/
├── elasticsearch-9.1.5/      # Elasticsearch installation
├── public/                    # Frontend files
│   ├── index.html            # Search dashboard
│   ├── upload.html           # Upload interface
│   ├── devices.html          # Device management
│   ├── settings.html         # Elasticsearch settings
│   ├── search.js             # Search functionality
│   ├── devices.js            # Device management logic
│   └── style.css             # Styles
├── file-processors/          # File conversion modules
│   ├── pdf-to-md.js
│   ├── html-to-md.js
│   ├── csv-to-md.js
│   └── text-to-md.js
├── uploads/                  # Uploaded folders
├── index.js                  # Main server
├── package.json              # Dependencies
├── START_APP.bat            # Quick start script
├── STOP_APP.bat             # Stop script
└── README.md                # This file
```

## 🔧 Development

### Running in Development Mode

```bash
npm start
```

### Code Structure

- **Backend:** Node.js + Express
- **Search Engine:** Elasticsearch 9.1.5
- **Frontend:** Vanilla JavaScript (no frameworks)
- **File Processing:** Cheerio, PDF.js, custom parsers

### Adding New File Types

1. Create processor in `file-processors/`
2. Add extension to `isSupportedFile()` in `index.js`
3. Update `convertFileToMarkdown()` switch statement

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 API Endpoints

### Search
- `POST /api/search` - Search indexed content

### Upload & Crawling
- `POST /upload` - Upload folder structure
- `POST /ingest` - Ingest files to Elasticsearch
- `POST /api/crawler/scan` - Scan uploads folder for device folders
- `POST /api/crawler/crawl` - Crawl and ingest selected folders
- `GET /api/crawler/progress` - SSE endpoint for real-time progress updates

### Indices
- `GET /api/indices` - List all indices with document counts
- `POST /api/indices` - Create new index
- `DELETE /api/indices/:index` - Delete index
- `GET /api/indices/:index/documents` - Get 5 sample documents
- `GET /api/selected-index` - Get currently selected index
- `POST /api/selected-index` - Set selected index

### Devices
- `GET /api/devices` - List all devices in selected index
- `GET /api/devices/:deviceId/files` - Get device files
- `DELETE /api/devices/:deviceId` - Delete device and its checksums
- `DELETE /api/devices/:deviceId/cleanup` - Remove physical folder

### Checksums
- `GET /api/checksums` - Get all checksums (index-specific format)
- `DELETE /api/checksums/:hash` - Delete checksum entry

## 🐛 Troubleshooting

### Elasticsearch Won't Start
- Ensure port 9200 is not in use
- Check Java is installed: `java -version`
- Review logs in `elasticsearch-9.1.5/logs/`

### Port 3000 Already in Use
```bash
# Stop all instances
STOP_APP.bat
# Or manually:
taskkill /F /IM node.exe
```

### Application Not Loading
- Wait at least 20 seconds after starting
- Check Elasticsearch: `http://localhost:9200`
- Check server logs in console

### Upload Fails
- Ensure Elasticsearch is running
- Check disk space
- Verify file permissions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Elasticsearch](https://www.elastic.co/) - Search engine
- [Express.js](https://expressjs.com/) - Web framework
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF processing

## 📧 Contact

Project Link: [https://github.com/diyari-mussa/HDeviceContentIndexer](https://github.com/diyari-mussa/HDeviceContentIndexer)

---

**Made with ❤️ for efficient content management**

## 🔐 Checksum System

The application uses an **index-specific** SHA-256 checksum system to prevent duplicate uploads:

### How It Works

1. **When you upload a folder**, the system calculates a unique checksum based on:
   - File paths and names
   - File sizes and modification times  
   - Sample content from each file (first 1KB)

2. **The checksum is stored** in `folder_checksums.json` with the format:
   ```
   hash:deviceId:indexName
   ```
   Each entry contains:
   - Folder hash (SHA-256)
   - Device ID (folder name)
   - Index name
   - Timestamp
   - Folder name

3. **Before indexing**, the crawler:
   - Checks if checksum exists for the specific index
   - Verifies documents actually exist in Elasticsearch
   - Removes stale checksums if documents were deleted
   - Allows the same folder in different indices

4. **When you delete a device**:
   - Documents are removed from Elasticsearch
   - Associated checksums are automatically deleted
   - Folder becomes available for re-indexing

### Key Features

- ✅ **Index-Specific**: Same folder can exist in multiple indices
- ✅ **Self-Healing**: Removes stale checksums when documents don't exist
- ✅ **Automatic Cleanup**: Checksums deleted when device is deleted
- ✅ **Force Re-index**: Option to bypass checksum validation

## Usage Guide

### Uploading and Indexing Folders

1. **Select an Index**:
   - Click "⚙️ Settings" to manage indices
   - Create a new index or select an existing one
   - Click "Use Selected Index"

2. **Upload a Folder**:
   - Drag and drop a folder onto the upload area
   - Or click "Choose Folder" to browse
   - The folder structure will appear in the tree view

3. **Review and Ingest**:
   - ✅ Green banner = New folder, safe to upload
   - ⚠️ Yellow banner = Duplicate detected (warning)
   - Select files/folders to ingest
   - Click "Ingest Selected Files"

4. **View Checksum History**:
   - Click "🔐 Checksums History"
   - See all uploaded folders with timestamps
   - Delete checksums if needed to allow re-upload

### Searching Content

1. Navigate to the Search page
2. Enter your search query
3. Results show with:
   - Relevance score
   - File name and location
   - Highlighted matching text
   - Device ID and timestamp

## Configuration

Update the Elasticsearch client configuration in `index.js` if needed:

```javascript
const client = new Client({
  node: 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 30000
});
```

## Supported File Types

- **HTML/HTM**: Converted to clean text using Cheerio
- **PDF**: Extracted text using pdf-parse
- **CSV**: Processed with csv-parser
- **TXT/CSS**: Direct text content

## Project Structure

```
searcher-directory/
├── index.js                    # Main server file
├── package.json               # Dependencies
├── folder_checksums.json      # Checksum storage (auto-generated)
├── file-processors/           # File conversion modules
│   ├── html-to-md.js
│   ├── pdf-to-md.js
│   ├── csv-to-md.js
│   └── text-to-md.js
├── public/                    # Frontend files
│   ├── index.html            # Main dashboard
│   ├── search.html           # Search interface
│   ├── app.js                # Dashboard logic
│   ├── search.js             # Search logic
│   └── style.css             # Modern styling
├── uploads/                  # Uploaded folders (auto-generated)
└── elasticsearch-9.1.5/      # Elasticsearch installation
```

## API Endpoints

### Elasticsearch Management
- `GET /api/elasticsearch/status` - Check ES connection
- `POST /api/elasticsearch/start` - Start Elasticsearch

### Index Management
- `GET /api/indices` - List all indices
- `POST /api/indices` - Create new index
- `DELETE /api/indices/:index` - Delete index
- `GET /api/indices/:index/documents` - Get sample documents

### Checksum Management
- `GET /api/checksums` - List all checksums
- `DELETE /api/checksums/:key` - Delete a checksum

### Upload & Search
- `POST /upload` - Upload folder structure
- `POST /ingest` - Index selected files
- `POST /api/search` - Search indexed content

## Troubleshooting

**Elasticsearch won't start:**
- Check if port 9200 is available
- Ensure Java is installed (bundled with Elasticsearch)
- Check logs in `elasticsearch-9.1.5/logs/`

**Upload fails:**
- Ensure the uploads directory is writable
- Check file permissions
- Verify sufficient disk space

**Checksum mismatch:**
- If you modified a folder and want to re-upload, delete its checksum from the history
- Or rename the folder to create a new device ID

## License

MIT
