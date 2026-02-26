const katex = require('katex');

const str1 = "\\text{다음 중 유리수인 것은?} \\\\ \\text{①} \\; \\sqrt{3} \\quad \\text{②} \\; 3.14 \\\\ \\text{③} \\; 1 + \\sqrt{2} \\quad \\text{④} \\; -\\sqrt{5}";

console.log("STR1 HTML:");
console.log(katex.renderToString(str1, { displayMode: true, throwOnError: false }));
