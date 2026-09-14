const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if summary is missing
  if (!content.match(/^summary:/m)) {
    // Extract the frontmatter and the body
    const parts = content.split('---');
    if (parts.length >= 3) {
      const frontmatter = parts[1];
      const body = parts.slice(2).join('---');

      // Find the first paragraph in the body (non-empty line not starting with #)
      const paragraphs = body.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'));
      let firstParagraph = paragraphs[0] || 'A deep dive into our engineering architecture and solutions.';
      
      // Clean up markdown syntax and truncate
      firstParagraph = firstParagraph.replace(/\[|\]|\*|_|`|<|>/g, '');
      if (firstParagraph.length > 130) {
        firstParagraph = firstParagraph.substring(0, 130).trim() + '...';
      }
      
      // Escape quotes
      firstParagraph = firstParagraph.replace(/"/g, '\\"');

      // Insert summary into frontmatter
      const newFrontmatter = frontmatter.trim() + `\nsummary: "${firstParagraph}"\n`;
      const newContent = `---\n${newFrontmatter}---\n${body.trim()}`;
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      updatedCount++;
    }
  }
}

console.log(`Successfully added summaries to ${updatedCount} files.`);
