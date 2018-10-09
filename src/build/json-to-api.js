const { readFileSync } = require('fs');

const inputs = process.argv.slice(2);
const output = [];

for (const input of inputs) {
  const data = JSON.parse(readFileSync(input));
  if ((data != null) && (data.exports != null))
    output.push(...data.exports);
}

process.stdout.write(JSON.stringify(output));

