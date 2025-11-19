const fs = require('fs');
const csv = require('csv-parser');

function convertCsvToMarkdown(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      const headers = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // Generate Markdown table
          let markdown = `# CSV Data\n\n`;

          if (headers.length === 0) {
            markdown += 'No headers found in CSV file.\n\n';
          } else {
            // Header row
            markdown += '| ' + headers.join(' | ') + ' |\n';
            markdown += '|' + headers.map(() => '---').join('|') + '|\n';

            // Data rows
            results.forEach(row => {
              const values = headers.map(header => {
                const value = row[header] || '';
                // Escape pipe characters in cell content
                return value.replace(/\|/g, '\\|');
              });
              markdown += '| ' + values.join(' | ') + ' |\n';
            });
          }

          markdown += `\n**Total rows:** ${results.length}\n`;
          markdown += `**Columns:** ${headers.length}\n`;

          resolve(markdown);
        })
        .on('error', (error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { convertCsvToMarkdown };