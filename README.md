# HDeviceContentIndexer

A powerful desktop application for indexing and searching device folder contents using Elasticsearch. Perfect for managing and searching through large collections of HTML, TXT, PDF, and CSV files.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Elasticsearch](https://img.shields.io/badge/elasticsearch-9.1.5-orange.svg)

## ✨ Features

- 🔍 **Full-Text Search** - Search across all indexed files with highlighting
- 📤 **Folder Upload** - Upload entire folder structures for indexing
- 📱 **Device Management** - Organize content by device with easy management
- 🔄 **Duplicate Detection** - SHA-256 hash-based duplicate folder detection
- 🎨 **Modern UI** - Clean, gradient-based interface with responsive design
- 📊 **Multiple Formats** - Support for HTML, TXT, PDF, CSV files
- 🗂️ **Index Management** - Create, view, and manage Elasticsearch indices
- 🧹 **Cleanup Tools** - Remove physical folders while keeping indexed data

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

### Uploading Content

1. Navigate to **Upload** page
2. Drag and drop a folder or click "Choose Folder"
3. Review the file tree
4. Select files to index
5. Click "Ingest Selected Files"

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

- **HTML/HTM** - Full HTML rendering with text extraction
- **TXT** - Plain text files
- **PDF** - Text extraction from PDFs
- **CSV** - Comma-separated values
- **CSS** - Stylesheets
- **INFO** - Information files

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

### Upload
- `POST /upload` - Upload folder structure
- `POST /ingest` - Ingest files to Elasticsearch

### Indices
- `GET /api/indices` - List all indices
- `POST /api/indices` - Create new index
- `DELETE /api/indices/:index` - Delete index
- `GET /api/indices/:index/documents` - Get documents

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:deviceId/files` - Get device files
- `DELETE /api/devices/:deviceId` - Delete device
- `DELETE /api/devices/:deviceId/cleanup` - Remove physical folder

### Checksums
- `GET /api/checksums` - Get all checksums
- `DELETE /api/checksums/:hash` - Delete checksum

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

The application uses SHA-256 checksums to prevent duplicate folder uploads:

1. **When you upload a folder**, the system calculates a unique checksum based on:
   - File paths and names
   - File sizes and modification times
   - Sample content from each file (first 1KB)

2. **The checksum is stored** in `folder_checksums.json` with:
   - Folder hash (SHA-256)
   - Device ID (folder name)
   - Timestamp
   - Folder name

3. **Before indexing**, the system checks:
   - Local checksum file for fast lookup
   - Elasticsearch indices for backward compatibility
   - Warns you if the folder has been uploaded before

4. **Managing Checksums**:
   - View all uploaded folders in the "Checksums History" modal
   - Delete checksums to allow re-uploading a folder
   - Each device ID can only be uploaded once across all indices

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
