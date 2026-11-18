const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('../fact-backend/src/modules/documents/documents.service.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const oldStr = 'http://localhost:3000/api/v1/documents/';
const newStr = '${process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`}/api/v1/documents/';

if (content.includes(oldStr)) {
  content = content.replaceAll(oldStr, newStr);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: Updated baseUrl in documents.service.ts');
} else {
  console.log('NOTICE: oldStr not found or already updated');
}
