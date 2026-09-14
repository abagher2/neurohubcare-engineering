const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace overly generic terms with NeuroHub's actual abstracted domain equivalents
  content = content.replace(/e-commerce checkout/gi, 'document intake wizard');
  content = content.replace(/an e-commerce/gi, 'a service marketplace');
  content = content.replace(/e-commerce/gi, 'service marketplace');
  content = content.replace(/financial loan application/gi, 'reimbursement compliance workflow');
  content = content.replace(/loan application/gi, 'reimbursement claim');
  content = content.replace(/financial loan/gi, 'reimbursement compliance');
  content = content.replace(/ loan /gi, ' claim ');
  content = content.replace(/ loans /gi, ' claims ');
  content = content.replace(/HR onboarding/gi, 'provider onboarding');
  content = content.replace(/ HR /gi, ' compliance ');
  content = content.replace(/shopping cart/gi, 'receipt batch');
  content = content.replace(/checkout/gi, 'submission');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Domains re-aligned to actual implementation terminology.");
