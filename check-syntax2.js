const fs = require('fs');
const content = fs.readFileSync('src/routes/emergencyManagement.js', 'utf8');
const lines = content.split('\n');

let roundDepth = 0;  // ()
let curlyDepth = 0;   // {}
let squareDepth = 0;  // []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false;
  let stringChar = '';
  let inComment = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const next = line[j + 1];

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
      break;
    }

    if (inString) {
      if (char === '\\') {
        j++;
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

    if (char === '(') roundDepth++;
    else if (char === ')') roundDepth--;
    else if (char === '{') curlyDepth++;
    else if (char === '}') curlyDepth--;
    else if (char === '[') squareDepth++;
    else if (char === ']') squareDepth--;
  }

  if (roundDepth < 0 || curlyDepth < 0 || squareDepth < 0) {
    console.log(`Line ${i + 1}: round=${roundDepth}, curly=${curlyDepth}, square=${squareDepth}`);
    console.log(line);
  }
}

console.log(`Final: round=${roundDepth}, curly=${curlyDepth}, square=${squareDepth}`);
