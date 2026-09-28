const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('test_snap2.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const idatChunks = [];
let offset = 8;
while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    if (buf.toString('ascii', offset + 4, offset + 8) === 'IDAT') idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    offset += 12 + len;
}
zlib.inflate(Buffer.concat(idatChunks), (err, raw) => {
    const stride = 1 + width * 4;
    const midX = Math.round(width / 2);
    console.log(`Dimensions: ${width}x${height}`);
    // scan along center vertical line midX
    for (let y = 0; y < height; y += 10) {
        const r = raw[y * stride + 1 + midX * 4];
        const g = raw[y * stride + 1 + midX * 4 + 1];
        const b = raw[y * stride + 1 + midX * 4 + 2];
        if (r > 30 || g > 30 || b > 30) {
            console.log(`y=${y}: rgb(${r},${g},${b})`);
        }
    }
});
