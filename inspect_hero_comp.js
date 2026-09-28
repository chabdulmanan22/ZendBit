const fs = require('fs');
if (fs.existsSync('hero_comp.js')) {
    const text = fs.readFileSync('hero_comp.js', 'utf8');
    console.log('hero_comp.js size:', text.length);
    // Find imports
    const imports = text.match(/import\s+[^;]+from\s+['"][^'"]+['"]/g) || [];
    console.log('Imports:', imports);
    
    // Find component names or JSX elements
    const matches = text.match(/[A-Z][a-zA-Z0-9]+(?=\.jsx|\.mjs|Component|Production)/g) || [];
    console.log('Matches:', Array.from(new Set(matches)));
} else {
    console.log('hero_comp.js not found');
}
