const fs = require('fs');
const content = fs.readFileSync('src/routes/emergencyManagement.js', 'utf8');
const lines = content.split('\n');

let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const next = line[j + 1];

    // Skip comments
    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        j++;
      }
      continue;
    }
    if (char === '/' && next === '*') {
      inComment = true;
      j++;
      continue;
    }
    if (char === '/' && next === '/') {
      break; // Line comment
    }

    // Skip strings
    if (inString) {
      if (char === '\\') {
        j++; // Skip escaped char
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === '\'' || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    // Track brackets
    if (char === '(' || char === '{' || char === '[') {
      depth++;
    } else if (char === ')' || char === '}' || char === ']') {
      depth--;
    }
  }

  if (depth < 0) {
    console.log(`Line ${i + 1}: NEGATIVE DEPTH ${depth}`);
    console.log(line);
  }
}

console.log(`Final depth: ${depth}`);
