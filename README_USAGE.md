# Device Search & Indexer - Usage Instructions

## Quick Start

### Option 1: Simple Batch File (Recommended)
1. Double-click `START_APP.bat`
2. Wait for the application to open in your browser
3. To stop: Close the console window or run `STOP_APP.bat`

### Option 2: Manual Start
1. Start Elasticsearch:
   ```
   elasticsearch-9.1.5\bin\elasticsearch.bat
   ```
2. Wait 15-20 seconds
3. Start the server:
   ```
   npm start
   ```
4. Open browser: http://localhost:3000

## Features
- 🔍 **Search** - Search indexed content
- 📤 **Upload** - Upload folders for indexing
- 📱 **Devices** - Manage uploaded devices
- ⚙️ **Settings** - Configure Elasticsearch

## Troubleshooting

### Port Already in Use
If you see errors about ports 3000 or 9200:
1. Run `STOP_APP.bat` to kill existing processes
2. Try again

### Elasticsearch Won't Start
- Make sure Java is installed
- Check that port 9200 is not used by another application
- Try running as Administrator

### Application Not Loading
- Wait at least 20 seconds after starting
- Check the console window for errors
- Verify Elasticsearch is running: http://localhost:9200

## Distribution

To share this application:
1. Copy the entire folder
2. Make sure to include:
   - `elasticsearch-9.1.5/` folder
   - `node_modules/` folder
   - All `.js` and `.bat` files
   - `public/` folder
3. Recipient needs Node.js installed
4. They can run `START_APP.bat`

## Notes
- First startup takes 15-20 seconds (Elasticsearch initialization)
- Subsequent startups are faster
- Data is stored in `elasticsearch-9.1.5/data/`
- Uploads are stored in `uploads/` folder
