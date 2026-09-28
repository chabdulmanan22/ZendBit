const fs = require('fs');
const html = fs.readFileSync('framer_live.html', 'utf8');
const matches = html.match(/<div[^>]*data-framer-background-image-wrapper="true"[^>]*>[\s\S]{0,350}/gi) || [];
matches.forEach((m, i) => console.log(i, m.replace(/\n/g, ' ')));
