const fs = require('fs');
const d = fs.readFileSync('hero_component_full.js', 'utf8');
const idx = 42264;
console.log(d.slice(idx + 600, idx + 2500));
