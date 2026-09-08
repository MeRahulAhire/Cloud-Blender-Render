#!/bin/bash
# Sets up cloudflared tunnels for ports 4000 (Cloud Blender Render) and
# 8888 (Direct folder access / Jupyter), then serves the resulting URLs
# on port 9000 so you can view them through Host's proxy.

set -e
cd /workspace

# ---- 1. Download cloudflared if not already present ----
if [ ! -f /workspace/cloudflared ]; then
    echo "Downloading cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /workspace/cloudflared
    chmod +x /workspace/cloudflared
fi

# ---- 2. Start the two tunnels in the background, logging their output ----
nohup /workspace/cloudflared tunnel --url http://127.0.0.1:4000 > /workspace/tunnel_4000.log 2>&1 &
nohup /workspace/cloudflared tunnel --url http://127.0.0.1:8888 > /workspace/tunnel_8888.log 2>&1 &

echo "Waiting for tunnel URLs..."

URL_4000=""
URL_8888=""

# ---- 3. Poll logs until both URLs show up (regex: https://...trycloudflare.com) ----
for i in $(seq 1 60); do
    [ -z "$URL_4000" ] && URL_4000=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com/?' /workspace/tunnel_4000.log 2>/dev/null | head -n1)
    [ -z "$URL_8888" ] && URL_8888=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com/?' /workspace/tunnel_8888.log 2>/dev/null | head -n1)
    if [ -n "$URL_4000" ] && [ -n "$URL_8888" ]; then
        break
    fi
    sleep 1
done

# Ensure trailing slash on both URLs
[[ "$URL_4000" != */ ]] && URL_4000="${URL_4000}/"
[[ "$URL_8888" != */ ]] && URL_8888="${URL_8888}/"

echo "1. Cloud Blender render - $URL_4000"
echo "2. Direct folder access - $URL_8888"

# ---- 4. Write a tiny status page ----
cat > /workspace/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Tunnel URLs</title>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; background:#111; color:#eee; padding:40px; }
    a { color:#4ea1ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    li { margin-bottom:14px; font-size:18px; }
  </style>
</head>
<body>
  <h2>Your Tunnels</h2>
  <ol>
    <li>Cloud Blender render - <a href="$URL_4000" target="_blank">$URL_4000</a></li>
    <li>Direct folder access - <a href="$URL_8888" target="_blank">$URL_8888</a></li>
  </ol>
</body>
</html>
EOF

# ---- 5. Serve that page on port 9000 (lite web server) ----
cd /workspace
python3 -m http.server 9000 --bind 0.0.0.0