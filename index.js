const http = require('http');
const { spawn } = require('child_process');

// ۱. باز کردن فوری پورت وب برای پاس کردن Health Check سایت‌ها
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Tailscale Exit Node is Running!\n');
}).listen(port, '0.0.0.0', () => {
  console.log(`Health check server listening on port ${port}`);
});

// ۲. اجرای اسکریپت نصب و راه‌اندازی تیل‌اسکیل
console.log("Starting Tailscale script...");
const ts = spawn('sh', ['start.sh'], { stdio: 'inherit' });

ts.on('exit', (code) => {
  console.log(`Tailscale process exited with code ${code}`);
});
