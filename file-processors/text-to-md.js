const fs = require('fs');
const path = require('path');

function convertTextToMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    let markdown = `# ${fileName}\n\n`;

    // Process text content
    const lines = content.split('\n');

    let inCodeBlock = false;
    let currentParagraph = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line - end current paragraph
      if (!trimmed) {
        if (currentParagraph.length > 0) {
          markdown += currentParagraph.join(' ') + '\n\n';
          currentParagraph = [];
        }
        continue;
      }

      // Code block detection (assuming indented code or ``` markers)
      if (trimmed.startsWith('```') || (line.startsWith('    ') && !inCodeBlock)) {
        if (inCodeBlock) {
          markdown += '```\n\n';
          inCodeBlock = false;
        } else {
          markdown += '\n```';
          if (trimmed.includes(' ')) {
            markdown += trimmed.substring(trimmed.indexOf(' '));
          }
          markdown += '\n';
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        markdown += line + '\n';
        continue;
      }

      // Heading detection (lines starting with # or all caps short lines)
      if (trimmed.startsWith('#')) {
        markdown += trimmed + '\n\n';
      }
      // List detection
      else if (trimmed.match(/^\d+\./) || trimmed.match(/^[•\-\*]/)) {
        markdown += trimmed + '\n';
      }
      // URL detection
      else if (trimmed.match(/^https?:\/\//)) {
        markdown += `[${trimmed}](${trimmed})\n\n`;
      }
      // Regular text
      else {
        currentParagraph.push(trimmed);
      }
    }

    // Add any remaining paragraph
    if (currentParagraph.length > 0) {
      markdown += currentParagraph.join(' ') + '\n\n';
    }

    // Close any open code block
    if (inCodeBlock) {
      markdown += '```\n\n';
    }

    return markdown;
  } catch (error) {
    console.error('Error converting text to Markdown:', error);
    throw error;
  }
}

module.exports = { convertTextToMarkdown };