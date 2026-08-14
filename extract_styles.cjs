const fs = require('fs')
let src = fs.readFileSync('src/pages/Home.jsx', 'utf8')

const start = src.indexOf('<style>{')
const end = src.indexOf('}</style>')
if (start === -1 || end === -1) {
  console.error('style block not found', start, end)
  process.exit(1)
}

const css = src.slice(start + '<style>{'.length, end)
fs.writeFileSync('extracted.css', css)

src = src.slice(0, start) + src.slice(end + '}</style>'.length)
fs.writeFileSync('src/pages/Home.jsx', src)
console.log('extracted css length', css.length)
