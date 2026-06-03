// Tiny static file server for the local Framer mirror.
// Run:  node server.js   then open http://localhost:8123
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8125;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.bin': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    if (!path.extname(urlPath)) urlPath += '/index.html'; // /en -> /en/index.html
    const filePath = path.join(ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found: ' + urlPath); }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) { res.writeHead(500); res.end('Error'); }
});

server.listen(PORT, () => console.log(`Serving the site at  http://localhost:${PORT}`));
