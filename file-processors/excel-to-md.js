const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Converts an Excel file to Markdown format.
 * @param {string} filePath - The path to the Excel file.
 * @returns {Promise<string>} - The Markdown content.
 */
async function convertExcelToMarkdown(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read the file
    const workbook = XLSX.readFile(filePath);
    let markdownOutput = '';

    // Iterate through each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      // Get data as array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length > 0) {
        markdownOutput += `## Sheet: ${sheetName}\n\n`;
        
        // Determine the maximum number of columns in this sheet
        let maxCols = 0;
        jsonData.forEach(row => {
            if (row.length > maxCols) maxCols = row.length;
        });

        if (maxCols > 0) {
            // Create header row if it exists, otherwise create generic headers
            const headerRow = jsonData[0];
            const headers = [];
            for (let i = 0; i < maxCols; i++) {
                headers.push(headerRow[i] !== undefined ? String(headerRow[i]) : `Col ${i+1}`);
            }

            markdownOutput += '| ' + headers.map(h => h.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |\n';
            markdownOutput += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
            
            // Process data rows (skip first row if we used it as header)
            // If the first row was empty or looked like data, we might want to include it, 
            // but usually first row is header. Let's assume row 0 is header.
            
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const rowStr = [];
                for (let j = 0; j < maxCols; j++) {
                    let cellData = row[j] !== undefined ? String(row[j]) : '';
                    // Escape pipes and newlines for markdown table compatibility
                    cellData = cellData.replace(/\|/g, '\\|').replace(/\n/g, ' '); 
                    rowStr.push(cellData);
                }
                markdownOutput += '| ' + rowStr.join(' | ') + ' |\n';
            }
        } else {
            markdownOutput += "_Empty Sheet_\n";
        }
        
        markdownOutput += '\n';
      } else {
          markdownOutput += `## Sheet: ${sheetName} (Empty)\n\n`;
      }
    });

    if (!markdownOutput.trim()) {
        return "[Empty Excel File]";
    }

    return markdownOutput;

  } catch (error) {
    // Throw a detailed error message as requested
    const errorMessage = `Error processing Excel file '${filePath}': ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

module.exports = { convertExcelToMarkdown };
