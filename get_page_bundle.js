const https = require('https');
const fs = require('fs');

https.get('https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/GNvaONxX6.JkaPg2Al.mjs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('page_bundle.js', data);
        console.log('Downloaded page_bundle.js length:', data.length);
        
        // Find usage of Rays
        const raysIdx = data.indexOf('Rays');
        console.log('Rays occurrences:');
        let pos = 0;
        while ((pos = data.indexOf('Rays', pos)) !== -1) {
            console.log(pos, data.slice(pos - 100, pos + 250));
            pos += 4;
            if (pos > 500000) break;
        }
    });
});
