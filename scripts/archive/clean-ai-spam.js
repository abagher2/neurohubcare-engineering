const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

const heroFiles = [
  '2026-09-03-architecting-agentic-workflows-and-the-assistant.md',
  '2026-06-11-auditable-entity-transitions-automated-verification.md',
  '2026-08-30-self-healing-e2e-tests-narrative-feedback.md',
  '2026-07-15-migrating-s3-document-ingestion-to-gemini.md',
  '2026-05-15-resilient-llm-json-parsing-and-token-limits.md',
  '2026-08-20-hitting-the-god-component-wall.md'
];

let keptCount = 0;

for (const file of files) {
  if (heroFiles.includes(file)) continue;

  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.match(/AI coding agent|Antigravity|pair-program|AI Co-Pilot|collaborated with our AI/i)) {
    if (keptCount < 2) {
      keptCount++;
      continue;
    }

    const blocks = content.split(/\n\n+/);
    const filteredBlocks = blocks.filter(block => {
      if (block.match(/###.*AI Co-Pilot/i)) return false;
      if (block.match(/AI coding agent|Antigravity|pair-program|AI Co-Pilot|collaborated with our AI/i)) return false;
      return true;
    });

    fs.writeFileSync(filePath, filteredBlocks.join('\n\n'), 'utf8');
  }
}
console.log(`Kept AI commentary in ${keptCount} regular posts, stripped from the rest.`);
