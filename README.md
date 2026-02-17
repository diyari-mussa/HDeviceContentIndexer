# HDeviceContentIndexer

A powerful desktop application for indexing and searching device folder contents using Elasticsearch. Perfect for managing and searching through large collections of HTML, TXT, PDF, CSV, and Excel files extracted from mobile devices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Elasticsearch](https://img.shields.io/badge/elasticsearch-9.1.5-orange.svg)
![Express](https://img.shields.io/badge/express-5.1.0-lightgrey.svg)

## ✨ Features

- 🔍 **Full-Text Search** - General search with multi-term wildcard matching and exact phrase boosting
- 📱 **Mobile Number Search** - Dedicated phone number tracing with automatic format variation generation (Iraqi phone formats supported)
- 📤 **Folder Upload** - Drag-and-drop folder upload with interactive tree view and file selection
- 🤖 **Batch Crawler** - Automatically scan and ingest multiple device folders from uploads or custom directory paths
- 📱 **Device Management** - Organize content by device with file browsing, search, and pagination
- 🔄 **Smart Duplicate Detection** - Index-specific SHA-256 hash-based duplicate folder detection with stale checksum auto-cleanup
- 🎨 **Modern Dark UI** - Navy/cyan-themed interface with card hover effects, responsive design, and animated loaders
- 📊 **Statistics Dashboard** - Real-time document count, device count, index count, and storage usage
- 📄 **Multiple Formats** - HTML, TXT, CSV, XLSX/XLS, and PDF support with dedicated file processors
- 🗂️ **Index Management** - Create, preview, select, and delete Elasticsearch indices
- 🔀 **File Converter Preview** - Upload PDF/HTML files to preview their Markdown conversion side-by-side
- 🧹 **Cleanup Tools** - Remove physical folders and checksums when deleting devices
- 📈 **Real-time Progress** - Server-Sent Events (SSE) for live crawling and ingestion progress
- 🛡️ **Safe HTML Rendering** - HTML content from indexed files is escaped to prevent unintended rendering in search results
- 🐛 **Debug Logging** - Console logs in search flow for cross-machine troubleshooting
- 📖 **Paginated Results** - Configurable page size (10/20/50/100/200) with full navigation controls

## 🖼️ Screenshots

### Search Dashboard
Search through indexed content with real-time highlighting, relevance scoring, and safe HTML-escaped previews.

### Upload Interface
Drag-and-drop folder upload with tree view, duplicate detection banners, and file selection.

### Device Management
View all indexed devices with search, pagination, file browsing, and cleanup actions.

### Crawler Dashboard
Batch scan and ingest folders with real-time SSE progress, custom path support, and folder status indicators.

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
3. Browser opens automatically at `http://localhost:3001`
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
4. Review the file tree (✅ green = new folder, ⚠️ yellow = duplicate detected)
5. Select files to index (supported: `.html`, `.htm`, `.txt`, `.csv`, `.xlsx`, `.xls`, `.pdf`)
6. Click "Ingest Selected Files"
7. Monitor progress via SSE progress modal

### Batch Crawling (Automated)

The **Crawler** feature allows you to batch-process multiple device folders:

1. Go to **Crawler** page (🤖 icon)
2. Select an index from the dropdown
3. Optionally enter a custom directory path (defaults to `uploads/`)
4. Click **"🔄 Scan"** to discover folders
5. View discovered folders with status indicators:
   - ✅ **New** (green) - Has supported files, ready for indexing (auto-selected)
   - 🔒 **Already Indexed** (amber) - Found in checksums and verified in Elasticsearch
   - ⚪ **Neglected** (grey) - No supported file types found (disabled)
6. Use selection buttons:
   - **Select All** - Select all eligible folders
   - **Deselect All** - Clear selection
   - **✅ Select New Only** - Select only new folders
7. Check **"⚠️ Force Re-index"** to ignore existing checksums
8. Click **"🚀 Start Crawling Selected Folders"**
9. Watch real-time progress with SSE live updates (progress bar + per-file status log)

**Crawler Features:**
- Skips temporary upload folders automatically
- Shows file count for each discovered folder
- Filters files by extension (`.html`, `.htm`, `.txt`, `.csv`, `.xlsx`, `.xls`, `.pdf`)
- Real-time progress with Server-Sent Events
- **Custom path support** — scan any directory on disk, not just `uploads/`
- Verifies documents exist in Elasticsearch before marking as indexed
- Removes stale checksums automatically
- Auto re-scans after crawling completes

### Searching

#### General Search
1. Go to **Search** page (🔍 icon)
2. Enter your search query (e.g., "john doe")
3. The engine searches with **multi-term wildcard matching**: each word becomes `*word*`
4. **Exact phrase matches** are boosted (×10 relevance) over partial wildcard matches (×5)
5. Toggle "Wildcard / Advanced Search" for raw Elasticsearch query string syntax
6. Results show:
   - File name and type icon
   - Device ID, folder path, and timestamp
   - Index name badge
   - Relevance score badge
   - Full file path (monospace)
   - **HTML-escaped content snippet** with highlighted search terms

#### Mobile Number Search
1. Switch to the **Mobile Number Search** tab
2. Enter a phone number in any format
3. The system automatically generates format variations (Iraqi phone formats: `+964`, `0770`, raw digits, spaced formats)
4. All variations are searched simultaneously
5. Matched variations are displayed above results

#### Search Results Features
- **Pagination**: Configurable page size (10/20/50/100/200), page navigation with numbered buttons, Previous/Next
- **Safe HTML rendering**: Content from HTML files is escaped — no more giant styled text from indexed HTML tags
- **Empty highlight fallback**: If Elasticsearch returns empty highlights, falls back to `extracted_text` instead of showing blank
- **Debug console logs**: Open browser DevTools (F12) to see `[Search]`, `[displayResult]`, and `[processHighlights]` logs for diagnosing issues on other machines

### File Converter Preview

1. Navigate to the **File Converter** page (linked from nav or directly at `file-converter.html`)
2. Upload a PDF or HTML file
3. View side-by-side: original content (left) vs. Markdown conversion (right)
4. Useful for verifying how files will be processed before indexing

### Managing Devices

1. Visit the **Devices** page (📱 icon)
2. Search devices by name with real-time filtering
3. Browse paginated device list (50 per page)
4. Click **"View Files"** to expand and see all files for a device
5. Use **"Cleanup Folder"** to remove the physical upload folder (keeps Elasticsearch data)
6. Use **"Delete"** to remove from Elasticsearch + delete associated checksums

## 🛠️ Configuration

### Elasticsearch Settings

- **Default Host:** `http://localhost:9200`
- **Data Directory:** `elasticsearch-9.1.5/data/`
- **Logs Directory:** `elasticsearch-9.1.5/logs/`

### Application Settings

- **Server Port:** `3001`
- **Uploads Directory:** `uploads/`
- **Checksums File:** `folder_checksums.json`
- **Payload Limit:** `500MB` (for large folder scans)

### Client-Side Settings (stored in `localStorage`)

- **Search All Indexes:** Toggle to search across all indices or only the selected one
- **Results Per Page:** 10 / 20 (default) / 50 / 100 / 200

### Selected Index Persistence

- Saved via browser cookie (1-year expiry) + server-side in-memory variable
- Displayed in the header of every page

### Supported File Types

| Format | Extensions | Processor | Description |
|--------|-----------|-----------|-------------|
| **HTML** | `.html`, `.htm` | `html-to-md.js` | Full text extraction via Cheerio, Markdown conversion via Turndown |
| **Plain Text** | `.txt` | `text-to-md.js` | Direct text content with paragraph and heading detection |
| **CSV** | `.csv` | `csv-to-md.js` | Markdown table conversion with row/column summary |
| **Excel** | `.xlsx`, `.xls` | `excel-to-md.js` | Multi-sheet support, each sheet becomes a Markdown table |
| **PDF** | `.pdf` | `pdf-to-md.js` | Page-by-page extraction with reading order sorting and artifact filtering |

## 📁 Project Structure

```
HDeviceContentIndexer/
├── elasticsearch-9.1.5/       # Bundled Elasticsearch installation (includes JDK)
├── public/                    # Frontend files
│   ├── index.html            # Search dashboard (General + Mobile search)
│   ├── upload.html           # Folder upload with drag-and-drop
│   ├── crawler.html          # Batch crawler dashboard
│   ├── devices.html          # Device management with search/pagination
│   ├── settings.html         # Index management + ES status + search config
│   ├── file-converter.html   # PDF/HTML → Markdown preview tool
│   ├── search.js             # Search logic (highlighting, pagination, debug logs)
│   ├── crawler.js            # Crawler scan/crawl logic with SSE progress
│   ├── devices.js            # Device listing, file browsing, cleanup
│   ├── upload.js             # Upload, tree view, ingestion, checksum history
│   ├── settings.js           # Index CRUD, ES status polling, search settings
│   └── style.css             # Dark navy/cyan theme
├── file-processors/           # File conversion modules
│   ├── html-to-md.js         # HTML → Text/Markdown (Cheerio + Turndown)
│   ├── excel-to-md.js        # Excel → Markdown tables (xlsx library)
│   ├── pdf-to-md.js          # PDF → Markdown (pdfjs-dist)
│   ├── csv-to-md.js          # CSV → Markdown tables (csv-parser)
│   └── text-to-md.js         # TXT → Markdown
├── uploads/                   # Uploaded device folders (auto-created)
├── index.js                   # Main Express server (2100+ lines)
├── ingest-folder.js          # Standalone folder ingestion script
├── folder_checksums.json      # Checksum database (auto-generated)
├── package.json               # Dependencies and scripts
├── START_APP.bat             # Quick start (ES + Node + browser)
├── STOP_APP.bat              # Force stop all processes
├── README.md                 # This file
└── README_USAGE.md           # Detailed usage instructions
```

## 🔧 Development

### Running in Development Mode

```bash
npm start
```

### Code Structure

- **Backend:** Node.js + Express 5.1.0
- **Search Engine:** Elasticsearch 9.1.5 (bundled with JDK)
- **Frontend:** Vanilla JavaScript (no frameworks)
- **File Processing:** Cheerio, Turndown, pdfjs-dist, xlsx, csv-parser
- **Progress Streaming:** Server-Sent Events (SSE)

### Adding New File Types

1. Create processor in `file-processors/` (export a conversion function)
2. Add extension to `isAllowedFile()` in `index.js`
3. Update `convertFileToMarkdown()` switch statement in `index.js`
4. The crawler will automatically pick up the new extension

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 API Endpoints

### Search
- `POST /api/search` - Unified search (general + mobile modes, pagination, highlighting)

### Statistics
- `GET /api/statistics` - Dashboard stats (documents, devices, indexes, storage)

### Upload & Crawling
- `POST /upload` - Upload folder structure (multipart via Multer)
- `POST /ingest` - Ingest files to Elasticsearch with SSE progress
- `POST /api/crawler/scan` - Scan uploads or custom path for device folders
- `POST /api/crawler/crawl` - Crawl and ingest selected folders with SSE progress
- `POST /api/cleanup-temp` - Clean up orphaned temp-* folders

### File Conversion
- `POST /api/convert-file` - Preview file conversion (PDF/HTML → Markdown)

### Directory Indexing
- `POST /api/index-directory` - Index a specific directory path
- `POST /api/index-subdirectories` - Index all subdirectories within a path

### Indices
- `GET /api/indices` - List all indices with document counts
- `POST /api/indices` - Create new index
- `DELETE /api/indices/:index` - Delete index
- `GET /api/indices/:index/documents` - Get 5 sample documents
- `GET /api/selected-index` - Get currently selected index
- `POST /api/selected-index` - Set selected index

### Elasticsearch
- `GET /api/elasticsearch/status` - Check ES connection health
- `POST /api/elasticsearch/start` - Start embedded Elasticsearch

### Devices
- `GET /api/devices` - List all devices with pagination and search filter
- `GET /api/devices/:deviceId/files` - Get device files (up to 1000)
- `DELETE /api/devices/:deviceId` - Delete device from ES + associated checksums
- `DELETE /api/devices/:deviceId/cleanup` - Remove physical folder from disk

### Checksums
- `GET /api/checksums` - Get all checksums (index-specific format)
- `DELETE /api/checksums/:hash` - Delete checksum entry

## 🐛 Troubleshooting

### Elasticsearch Won't Start
- Ensure port 9200 is not in use
- Java is bundled with Elasticsearch — no separate install needed
- Review logs in `elasticsearch-9.1.5/logs/`
- Try running `START_APP.bat` as Administrator

### Port 3001 Already in Use
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

### Search Results Show Blank Content
- Open browser DevTools (F12) → Console tab
- Look for `[Search]`, `[displayResult]`, and `[processHighlights]` log messages
- Common causes: empty highlight objects from Elasticsearch, missing `extracted_text` field
- The latest fix handles empty highlights by falling back to `extracted_text`

### Search Results Show Giant/Styled Text
- This was caused by HTML tags from indexed HTML files being rendered in search results
- Fixed: all content is now HTML-escaped before display, with only Elasticsearch highlight `<em>` tags preserved

### Upload Fails
- Ensure Elasticsearch is running
- Check disk space
- Verify file permissions
- Check server console for error messages

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

## 🔍 Search Architecture

### General Search
Multi-term wildcard matching with two-strategy scoring:
1. **Exact phrase match** (boost ×10): Full query as a phrase across all fields
2. **Wildcard match** (boost ×5): Each term becomes `*term*` with `query_string` + `analyze_wildcard`, combined with `bool.must` (all terms must match)

### Mobile Number Search
Generates phone number format variations automatically:
- 13-digit with `964` country code
- 11-digit with leading `0`
- 10-digit raw format
- Variations: digits-only, `0`-prefix, `+964`-prefix, spaced formats (e.g., `770 221 6262`, `0770 221 62 62`)

Each variation is searched as a `multi_match` phrase query across all fields.

### Highlight Processing
- Elasticsearch returns `<em>` tags in highlight fragments
- Before rendering, all HTML content is escaped to prevent indexed HTML from rendering
- ES `<em>` tags are preserved via placeholder swap and restored with styled highlights
- Empty highlight objects fall back to `extracted_text` field

## ⚙️ Configuration

Update the Elasticsearch client in `index.js` if needed:

```javascript
const client = new Client({
  node: 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 30000
});
```

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@elastic/elasticsearch` | ^8.11.0 | Elasticsearch client |
| `express` | ^5.1.0 | Web framework |
| `cheerio` | ^1.1.2 | HTML parsing and text extraction |
| `turndown` | ^7.2.1 | HTML → Markdown conversion |
| `pdfjs-dist` | ^2.16.105 | PDF text extraction |
| `xlsx` | ^0.18.5 | Excel file processing |
| `csv-parser` | ^3.2.0 | CSV parsing |
| `multer` | ^2.0.2 | File upload handling |
| `pdf-parse` | - | PDF parsing |
| `pdf-lib` | - | PDF manipulation |
| `node-fetch` | - | HTTP requests |

## 💻 System Requirements

- **OS**: Windows 10/11
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 1GB for application + storage for your data
- **CPU**: Any modern processor
- **Ports**: 3001 (app) and 9200 (Elasticsearch) must be available
- **Node.js**: v18 or higher

## 📦 Distribution

To share this application with others:

### What to Include
1. **Required**:
   - `elasticsearch-9.1.5/` — Complete Elasticsearch installation (includes JDK)
   - `node_modules/` — All dependencies
   - `public/` — Frontend files
   - `file-processors/` — File conversion modules
   - `index.js` — Main server file
   - `package.json` — Project configuration
   - `START_APP.bat` & `STOP_APP.bat` — Launcher scripts
   - `README.md` & `README_USAGE.md` — Documentation

2. **Optional** (created at runtime):
   - `uploads/` — Auto-created on first upload
   - `folder_checksums.json` — Generated when first folder is indexed

### Recipient Requirements
- **Node.js** (v18 or higher) must be installed
- **Windows** operating system

### Setup for Recipient
1. Extract all files to a folder
2. Double-click `START_APP.bat`
3. Wait 15-20 seconds
4. Browser opens automatically at `http://localhost:3001`
