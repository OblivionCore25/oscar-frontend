const fs = require('fs');
let code = fs.readFileSync('src/components/FluidGraphCanvas.tsx', 'utf8');
code = code.replace(
  `if (onNodeSelect) onNodeSelect('');`,
  `console.log("Background clicked!"); if (onNodeSelect) onNodeSelect('');`
);
code = code.replace(
  `if (onNodeSelect) onNodeSelect(node.id);`,
  `console.log("Node clicked!", node.id); if (onNodeSelect) onNodeSelect(node.id);`
);
fs.writeFileSync('src/components/FluidGraphCanvas.tsx', code);
