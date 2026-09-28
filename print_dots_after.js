const fs = require('fs');
const d = fs.readFileSync('hero_component_full.js', 'utf8');
const idx = d.indexOf('Abstract Dots');
console.log(d.slice(idx, idx + 3500));
