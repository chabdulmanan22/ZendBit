const https = require('https');
const fs = require('fs');

const bundles = [
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/VnmEZ_3BZ.DBKZ7Pl0.mjs',
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/QuTNz53Yy.BD5tkIJi.mjs',
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/qjQ4xZOipSk89F0haD0ESxZZhGCHj2PlhXsrqlYYE8s.XUaFeZqb.mjs',
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/tAU8hAZZK.Bjr9jV2H.mjs',
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/mBXYlyyyA.aAp3T2A4.mjs',
  'https://framerusercontent.com/sites/xWsKUCnSAhTpeFosQjU0m/VqRaec8fA.D15-lSRf.mjs'
];

bundles.forEach(url => {
    https.get(url, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            if (d.includes('Rays_Prod') || d.includes('Rays')) {
                console.log('FOUND RAYS IN:', url);
                const idx = d.indexOf('Rays');
                console.log(d.slice(idx - 100, idx + 400));
            }
        });
    });
});
