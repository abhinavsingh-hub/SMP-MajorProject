/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WEB_HTML = path.join(__dirname, 'index.html');
const REPORT_HTML = path.join(__dirname, '..', '..', 'docs', 'demo-report.html');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/report' || url === '/demo-report.html') {
    if (fs.existsSync(REPORT_HTML)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(REPORT_HTML));
      return;
    }
  }

  if (fs.existsSync(WEB_HTML)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(WEB_HTML));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SocialParse Web Platform active at http://localhost:${PORT}`);
});
