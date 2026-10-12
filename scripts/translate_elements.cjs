const fs = require('fs');
const path = require('path');

// 1. officialCards.ts
const offPath = path.join(__dirname, '../src/data/officialCards.ts');
let content = fs.readFileSync(offPath, 'utf8');
content = content.replace(/"element": "SPECTRO"/g, '"element": "회절"');
content = content.replace(/"element": "AERO"/g, '"element": "기류"');
content = content.replace(/"element": "GLACIO"/g, '"element": "응결"');
content = content.replace(/"element": "FUSION"/g, '"element": "용융"');
content = content.replace(/"element": "HAVOC"/g, '"element": "인멸"');
fs.writeFileSync(offPath, content, 'utf8');

// 2. official_database.json
const dbPath = path.join(__dirname, '../src/data/official_database.json');
if (fs.existsSync(dbPath)) {
  let dbContent = fs.readFileSync(dbPath, 'utf8');
  dbContent = dbContent.replace(/"element": "SPECTRO"/g, '"element": "회절"');
  dbContent = dbContent.replace(/"element": "AERO"/g, '"element": "기류"');
  dbContent = dbContent.replace(/"element": "GLACIO"/g, '"element": "응결"');
  dbContent = dbContent.replace(/"element": "FUSION"/g, '"element": "용융"');
  dbContent = dbContent.replace(/"element": "HAVOC"/g, '"element": "인멸"');
  fs.writeFileSync(dbPath, dbContent, 'utf8');
}

console.log('Successfully updated officialCards and database to Korean elements');
