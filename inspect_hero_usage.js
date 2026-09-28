const https = require('https');
const fs = require('fs');

https.get('https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/qjQ4xZOipSk89F0haD0ESxZZhGCHj2PlhXsrqlYYE8s.XUaFeZqb.mjs', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        fs.writeFileSync('hero_component_full.js', d);
        console.log('Downloaded length:', d.length);

        // Find how Me or Ne from Rays_Prod is used
        let idx = 0;
        while ((idx = d.indexOf('Me', idx)) !== -1) {
            console.log('Me at', idx, d.slice(idx - 50, idx + 200));
            idx += 10;
            if (idx > 50000) break;
        }
        idx = 0;
        while ((idx = d.indexOf('Ne', idx)) !== -1) {
            console.log('Ne at', idx, d.slice(idx - 50, idx + 200));
            idx += 10;
            if (idx > 50000) break;
        }
    });
});
