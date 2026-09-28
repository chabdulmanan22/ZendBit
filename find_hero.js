const fs = require('fs');
const html = fs.readFileSync('framer_live.html', 'utf8');

// The hero section in Framer is typically around "Smart Web Experiences"
const heroIdx = html.indexOf('Smart Web Experiences');
if (heroIdx !== -1) {
    // Print 10,000 characters around heroIdx to see all components in the hero
    const start = Math.max(0, heroIdx - 2000);
    const heroCode = html.slice(start, heroIdx + 8000);
    fs.writeFileSync('hero_framer_slice.html', heroCode);
    console.log('Saved hero slice. Length:', heroCode.length);

    // Look for any image, video, canvas, or special component
    const imgs = heroCode.match(/https:\/\/framerusercontent\.com\/[^\s"'<>)]+/g) || [];
    console.log('Framer resources in hero:', Array.from(new Set(imgs)));
} else {
    console.log('Smart Web Experiences not found');
}
