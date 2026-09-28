const https = require('https');
const fs = require('fs');

https.get('https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/augiA20Il.B4dxM7EQ.mjs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('hero_comp.js', data);
        console.log('Downloaded hero_comp.js length:', data.length);
        const imports = data.match(/import\s+[^;]+from\s+['"][^'"]+['"]/g) || [];
        console.log('Imports:', imports);
        
        // Search for Rays or Light or Background props
        const raysIdx = data.indexOf('Rays');
        console.log('Rays index:', raysIdx);
        if (raysIdx !== -1) {
            console.log(data.slice(raysIdx - 100, raysIdx + 300));
        }
    });
});
