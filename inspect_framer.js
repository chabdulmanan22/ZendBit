const fs = require('fs');
const html = fs.readFileSync('framer_fresh.html', 'utf8');

const regex = /\.framer-cjfzm3[^{]*\{[^}]+\}/g;
console.log('cjfzm3 rules:', html.match(regex));

const imgRegex = /\.framer-cjfzm3\s+img[^{]*\{[^}]+\}/g;
console.log('img rules:', html.match(imgRegex));

// Also check any inline styles on framer-cjfzm3 or its img
const pos = html.indexOf('alt="Purple Ring"');
console.log(html.slice(pos - 400, pos + 300));
