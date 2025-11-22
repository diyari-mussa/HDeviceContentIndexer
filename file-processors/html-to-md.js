const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Extract clean text from HTML for search indexing
function convertHtmlToText(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Get text content
    const text = $('body').text() || $.text();
    
    // Clean up whitespace and ensure it's a string
    const cleanText = text ? text.replace(/\s+/g, ' ').trim() : '';
    return cleanText || html; // Return cleaned text or original HTML if empty
  } catch (error) {
    console.error('Error extracting text from HTML:', error.message);
    // Fallback: try to return raw HTML
    try {
      const fallbackHtml = fs.readFileSync(filePath, 'utf8');
      return String(fallbackHtml || '');
    } catch (fallbackError) {
      console.error('Error reading HTML file in fallback:', fallbackError.message);
      return ''; // Return empty string as last resort
    }
  }
}

function convertHtmlToMarkdown(filePath) {
  try {
    // Read the HTML file
    const html = fs.readFileSync(filePath, 'utf8');

    // Prepare paths
    const fileName = path.basename(filePath, '.html');
    const outputPath = path.join(path.dirname(filePath), `${fileName}.md`);

    // Initialize Turndown (HTML → Markdown)
    const TurndownService = require('turndown');
    const turndownService = new TurndownService({
      headingStyle: 'atx', // # Heading style
      codeBlockStyle: 'fenced', // ``` fenced blocks
      emDelimiter: '_', // _italic_ instead of *
    });

    // Optional: add rules for cleaner output
    turndownService.addRule('removeEmptyParagraphs', {
      filter: ['p'],
      replacement: (content) => (content.trim() ? `\n\n${content}\n\n` : ''),
    });

    // Convert HTML → Markdown
    let markdown = turndownService.turndown(html);

    // Optional cleanup: trim excessive blank lines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    // Save Markdown file
    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log(`✅ Converted ${fileName}.html → ${fileName}.md`);

    return markdown;
  } catch (error) {
    console.error('❌ Error converting HTML to Markdown:', error);
    throw error;
  }
}

module.exports = { convertHtmlToMarkdown, convertHtmlToText };
