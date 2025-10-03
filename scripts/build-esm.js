const fs = require('fs');
const path = require('path');

const cjsContent = fs.readFileSync('./dist/index.js', 'utf8');
const esmContent = cjsContent
  .replace(/exports\./g, 'export ')
  .replace(/Object\.defineProperty\(exports, "__esModule", { value: true }\);\s*/, '')
  .replace(/module\.exports = (.*);/, 'export default $1;')
  .replace(/const (\w+) = require\("([^"]+)"\);?/g, 'import $1 from "$2";')
  .replace(/require\("([^"]+)"\)/g, 'import "$1"');

fs.writeFileSync('./dist/index.mjs', esmContent);
