const http = require('http');
const https = require('https');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

let logs = ["=== Tailscale Live Status ==="];
function log(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  logs.push(line);
}

// ۱. باز کردن فوری پورت ۸۰۸۰ و نمایش لاگ‌های زنده در مرورگر
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(logs.join('\n'));
}).listen(port, '0.0.0.0', () => {
  log(`Web server listening on port ${port}`);
});

// ۲. تابع دانلود مستقیم با Node.js (بدون نیاز به نصب بودن curl)
function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function runTailscale() {
  try {
    const key = (process.env.AUTH_KEY || process.env.TS_AUTHKEY || "").trim();
    if (!key) {
      log("❌ ERROR: متغیر AUTH_KEY یا TS_AUTHKEY در تنظیمات سایت وارد نشده است!");
      return;
    }
    log(`✅ Auth key detected (starts with: ${key.substring(0, 12)}...)`);

    fs.mkdirSync('/tmp/ts', { recursive: true });
    const tgz = '/tmp/ts/ts.tgz';

    log("⏳ Downloading Tailscale binary...");
    await download("https://pkgs.tailscale.com/stable/tailscale_1.74.0_amd64.tgz", tgz);
    log("✅ Download complete. Extracting...");

    execSync(`tar xzf ${tgz} -C /tmp/ts --strip-components=1`);
    execSync(`chmod +x /tmp/ts/tailscaled /tmp/ts/tailscale`);
    log("✅ Extracted successfully. Starting tailscaled...");

    const daemon = spawn('/tmp/ts/tailscaled', [
      '--tun=userspace-networking',
      '--state=mem:',
      '--socket=/tmp/tailscaled.sock'
    ]);
    daemon.stdout.on('data', d => log(`daemon: ${d.toString().trim()}`));
    daemon.stderr.on('data', d => log(`daemon: ${d.toString().trim()}`));

    await new Promise(r => setTimeout(r, 4000));

    log("⏳ Running tailscale up...");
    const up = spawn('/tmp/ts/tailscale', [
      '--socket=/tmp/tailscaled.sock',
      'up',
      `--authkey=${key}`,
      '--hostname=mojave-gaming',
      '--advertise-exit-node',
      '--accept-dns=false'
    ]);
    up.stdout.on('data', d => log(`up: ${d.toString().trim()}`));
    up.stderr.on('data', d => log(`up: ${d.toString().trim()}`));
    up.on('close', code => log(`🎉 tailscale up finished with code ${code}`));

  } catch (err) {
    log(`❌ Exception: ${err.message}`);
  }
}

runTailscale();
