const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let currentDates = {
  'may': 1,
  'june': 1,
  'july': 1,
  'august': 20, // late august
  'september': 1
};

function getNextDate(monthStr) {
  let monthMap = { 'may': '05', 'june': '06', 'july': '07', 'august': '08', 'september': '09' };
  let day = currentDates[monthStr]++;
  return `2026-${monthMap[monthStr]}-${day.toString().padStart(2, '0')}`;
}

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const slugMatch = content.match(/slug:\s*"([^"]+)"/);
  
  if (!slugMatch) continue;
  let oldSlug = slugMatch[1];
  
  let newMonth = 'may';
  const text = content.toLowerCase();
  
  if (text.includes('god component') || text.includes('observer graph') || text.includes('workflow engine')) {
    newMonth = 'august';
  } else if (text.includes('tool declaration') || text.includes('agent workflow') || text.includes('entitygraph')) {
    newMonth = 'september';
  } else if (text.includes('context window') || text.includes('container quer') || text.includes('proxy sentinel') || text.includes('ui synthesis')) {
    newMonth = 'july';
  } else if (text.includes('phase 16') || text.includes('llm-as-judge') || text.includes('ses/sns') || text.includes('playwright')) {
    newMonth = 'may';
  } else if (text.includes('streaming') || text.includes('sse')) {
    newMonth = 'june';
  } else {
    if (currentDates.may < 10) newMonth = 'may';
    else if (currentDates.june < 10) newMonth = 'june';
    else if (currentDates.july < 10) newMonth = 'july';
    else if (currentDates.august < 28) newMonth = 'august';
    else newMonth = 'september';
  }

  const newDate = getNextDate(newMonth);
  const baseSlug = oldSlug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const newSlug = `${newDate}-${baseSlug}`;

  let newContent = content
    .replace(/date:\s*"[^"]+"/, `date: "${newDate}"`)
    .replace(/slug:\s*"[^"]+"/, `slug: "${newSlug}"`);

  fs.unlinkSync(path.join(dir, file));
  fs.writeFileSync(path.join(dir, `${newSlug}.md`), newContent, 'utf8');
}
console.log("Realigned dates and slugs.");
