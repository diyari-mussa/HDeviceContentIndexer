const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

async function extractTextFromPage(page) {
    try {
        // Get both the text content and the operator list
        const [textContent, operatorList] = await Promise.all([
            page.getTextContent({
                normalizeWhitespace: true,
                disableCombineTextItems: false,
                includeMarkedContent: true
            }),
            page.getOperatorList()
        ]);
        
        if (!textContent || !textContent.items || !textContent.items.length) {
            console.warn('No text content found in page');
            return '';
        }

        // Filter out items that are likely not real text
        const textItems = textContent.items.filter(item => {
            // Must have valid string content
            if (!item.str || typeof item.str !== 'string') return false;
            
            // Skip if it looks like PDF structural content
            if (item.str.match(/^(%PDF-|obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)/i)) return false;
            
            // Skip binary or non-printable content
            if (/[^\x20-\x7E\n\r\t\u0080-\uFFFF]/.test(item.str)) return false;
            
            // Skip if it's just numbers or special characters
            if (!/[a-z]/i.test(item.str)) return false;
            
            return true;
        });

        // Sort by reading order (top to bottom, left to right)
        textItems.sort((a, b) => {
            const yDiff = Math.abs(b.transform[5] - a.transform[5]);
            if (yDiff > 2) { // If items are on different lines
                return b.transform[5] - a.transform[5];
            }
            return a.transform[4] - b.transform[4]; // Same line, sort left to right
        });

        let lastY, lastX;
        let currentLine = [];
        let lines = [];
        
        // Group items into lines
        for (const item of textItems) {
            const x = item.transform[4];
            const y = item.transform[5];
            
            if (lastY === undefined || Math.abs(y - lastY) > 3) {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = [item];
            } else {
                // Add appropriate spacing between words
                if (lastX !== undefined && (x - lastX) > item.width) {
                    currentLine.push({ str: ' ' });
                }
                currentLine.push(item);
            }
            
            lastY = y;
            lastX = x + (item.width || 0);
        }
        
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // Convert lines to text with proper formatting
        let text = lines
            .map(line => line.map(item => item.str).join(''))
            .join('\n')
            .trim();

        // Final cleanup
        text = text
            .replace(/\s+/g, ' ')        // Normalize spaces
            .replace(/\n\s+/g, '\n')     // Remove spaces at start of lines
            .replace(/\s+\n/g, '\n')     // Remove spaces at end of lines
            .replace(/\n{3,}/g, '\n\n')  // Normalize paragraph breaks
            .replace(/[^\x20-\x7E\n\r\t\u0080-\uFFFF]/g, '') // Final non-printable char cleanup
            .trim();

        return text;
    } catch (error) {
        console.error('Error extracting text from page:', error);
        return '';
    }
}

function sanitizeText(text) {
    return text
        // Remove PDF structural content
        .replace(/%PDF-[0-9.]+.*?\n/g, '')
        .replace(/^\d+\s+\d+\s+obj[\s\S]*?endobj$/gm, '')
        .replace(/^xref[\s\S]*?trailer$/gm, '')
        .replace(/^startxref\s*\d+\s*%%EOF$/gm, '')
        // Remove binary and special content
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '')
        .replace(/\\[0-9]{3}|\\x[0-9a-f]{2}/gi, '')
        .replace(/[^\x20-\x7E\n\r\t\u0080-\uFFFF]/g, '')
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function preprocessPDFData(data) {
    try {
        // Try to decode as UTF-8 first
        let content = new TextDecoder('utf-8', { fatal: true }).decode(data);
        return new TextEncoder().encode(sanitizeText(content));
    } catch (e) {
        // If UTF-8 fails, try latin1
        console.log('UTF-8 decode failed, trying latin1');
        let content = Array.from(data).map(b => String.fromCharCode(b)).join('');
        return new TextEncoder().encode(sanitizeText(content));
    }
}

async function convertPdfToMarkdown(filePath) {
    try {
        const fileName = path.basename(filePath, '.pdf');
        const outputPath = path.join(path.dirname(filePath), `${fileName}.md`);
        
        console.log(`Converting ${fileName}.pdf to Markdown...`);
        
        let data = new Uint8Array(await fs.promises.readFile(filePath));
        
        // Preprocess the PDF data to remove headers and binary content
        data = preprocessPDFData(data);
        
        // Load the PDF document with enhanced options
        const pdfDocument = await pdfjsLib.getDocument({
            data,
            disableBinaryString: true,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0  // Reduce console noise
        }).promise;
        
        let markdown = `# ${fileName}\n\n`;
        
        // Process each page
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            try {
                const page = await pdfDocument.getPage(i);
                let pageText = await extractTextFromPage(page);
                
                // Strong filtering of PDF artifacts and binary content
                pageText = pageText
                    // Remove PDF structural markers
                    .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/g, '')
                    .replace(/<<[\s\S]*?>>/g, '')
                    .replace(/stream[\s\S]*?endstream/g, '')
                    .replace(/startxref[\s\S]*?%%EOF/g, '')
                    // Remove binary data patterns
                    .replace(/x[0-9a-f]{2}/g, '')
                    .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only printable ASCII
                    // Clean up whitespace
                    .replace(/\s+/g, ' ')
                    .replace(/\f/g, '\n\n')
                    .replace(/([.!?])\s+/g, '$1\n\n')
                    .replace(/^\s+|\s+$/gm, '')
                    .replace(/\n{3,}/g, '\n\n');
                
                // Split into paragraphs and filter out any remaining artifacts
                const paragraphs = pageText
                    .split('\n\n')
                    .filter(p => {
                        const cleaned = p.trim();
                        // Enhanced comprehensive artifact filtering
                        return cleaned &&
                            cleaned.length > 1 && // Skip single characters
                            !/^\d+\s*$/.test(cleaned) && // Skip pure numbers
                            !/^[<>\/\[\]{}]/.test(cleaned) && // Skip lines starting with PDF markers
                            !cleaned.match(/^(\d+\s+0\s+obj|\/Length|\[|\]|<<|>>|stream|endstream|xref|trailer|startxref|%%EOF|%[A-Z0-9]+|obj\s+<<|R\s+endobj)/i) &&
                            !cleaned.match(/^[0-9a-f]{6,}$/i) && // Skip hex data
                            !cleaned.match(/\\[0-9]{3}|\\x[0-9a-f]{2}/i) && // Skip escaped binary
                            !cleaned.match(/^(obj|endobj|stream|endstream)$/i) && // Skip PDF keywords
                            !cleaned.match(/^%[^\n]*$/) && // Skip PDF comments
                            cleaned.split(/\s+/).length > 1 && // Must have at least two words
                            !/^[^a-z]*$/i.test(cleaned) && // Must contain at least one letter
                            cleaned.length < 1000; // Sanity check for max paragraph length
                    })
                    .map(p => p.trim())
                    .map(p => p
                        .replace(/\\[0-9]{3}|\\x[0-9a-f]{2}/gi, '') // Remove any escaped chars
                        .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove parenthetical PDF operators
                        .replace(/\s+/g, ' ') // Normalize spaces
                        .trim()
                    );
                
                if (paragraphs.length > 0) {
                    if (i > 1) markdown += '\n\n---\n\n'; // Page separator
                    markdown += paragraphs
                        .join('\n\n')
                        // Final cleanup of any remaining artifacts
                        .replace(/obj|endobj|xref|trailer|stream|endstream/g, '')
                        .replace(/\\x[0-9a-f]{2}/g, '')
                        .replace(/[^\x20-\x7E\n]/g, '');
                }
                
            } catch (pageError) {
                console.warn(`Warning: Error processing page ${i}:`, pageError);
                markdown += `\n\n*Error processing page ${i}*\n\n`;
            }
        }
        
        // Save Markdown file
        fs.writeFileSync(outputPath, markdown.trim(), 'utf8');
        console.log(`✅ Converted ${fileName}.pdf → ${fileName}.md`);

        return markdown.trim();
        
    } catch (error) {
        console.error('Error processing PDF file:', error);
        return `# ${path.basename(filePath, '.pdf')}\n\n**Error:** Unable to process PDF file. ${error.message}\n\n`;
    }
}

module.exports = { convertPdfToMarkdown };