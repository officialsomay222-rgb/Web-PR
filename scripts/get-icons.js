const https = require('https');
const fs = require('fs');

const download = (url, path) => new Promise((resolve) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    res.pipe(fs.createWriteStream(path)).on('finish', resolve);
  });
});

async function run() {
  await download('https://ui-avatars.com/api/?name=PW&background=4f46e5&color=fff&size=192&font-size=0.4&bold=true', 'public/icon-192.png');
  await download('https://ui-avatars.com/api/?name=PW&background=4f46e5&color=fff&size=512&font-size=0.4&bold=true', 'public/icon-512.png');
  console.log('Icons downloaded');
}
run();
