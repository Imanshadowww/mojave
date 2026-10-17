#!/bin/sh

# پشتیبانی هم‌زمان از هر دو نام متغیر AUTH_KEY و TS_AUTHKEY
KEY="${AUTH_KEY:-$TS_AUTHKEY}"

if [ -z "$KEY" ]; then
  echo "ERROR: Please set AUTH_KEY or TS_AUTHKEY in Environment Variables!"
  exit 1
fi

echo "Downloading Tailscale binary..."
mkdir -p /tmp/ts
curl -fsSL https://pkgs.tailscale.com/stable/tailscale_1.74.0_amd64.tgz | tar xzf - -C /tmp/ts --strip-components=1

echo "Starting tailscaled in rootless userspace mode..."
/tmp/ts/tailscaled \
  --tun=userspace-networking \
  --state=mem: \
  --socket=/tmp/tailscaled.sock \
  --socks5-server=localhost:1055 &

sleep 5

echo "Connecting to Tailscale account as Exit Node..."
/tmp/ts/tailscale \
  --socket=/tmp/tailscaled.sock \
  up \
  --authkey="${KEY}" \
  --hostname=cloud-gaming-node \
  --advertise-exit-node \
  --accept-dns=false

echo "SUCCESS: Tailscale Exit Node is online!"
wait
