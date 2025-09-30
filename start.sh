#!/bin/bash
set -e
# Ensure required folders exist
mkdir -p /workspace/temp /workspace/output /workspace/blend-folder /workspace/tmp_upload
# Copy from /app if missing
if [ ! -e "/workspace/dragonfly-x86_64" ]; then
    echo "Copying dragonfly-x86_64 from /app to /workspace"
    cp -r "/app/dragonfly-x86_64" "/workspace/"
else
    echo "dragonfly-x86_64 already exists in /workspace"
fi

if [ ! -e "/workspace/Cloud-Blender-Render" ]; then
    echo "Copying Cloud-Blender-Render from /app to /workspace"
    cp -r "/app/Cloud-Blender-Render" "/workspace/"
else
    echo "Cloud-Blender-Render already exists in /workspace"
fi

if [ ! -e "/workspace/blender" ]; then
    echo "Copying blender from /app to /workspace"
    cp -r "/app/blender" "/workspace/"
else
    echo "blender already exists in /workspace"
fi

if [ ! -e "/workspace/cycles_optix_denoise_logic.py" ]; then
    echo "Copying cycles_optix_denoise_logic.py from /app to /workspace"
    cp -r "/app/cycles_optix_denoise_logic.py" "/workspace/"
else
    echo "cycles_optix_denoise_logic.py already exists in /workspace"
fi
# Set env variables including Node.js
export PATH="/workspace/blender:/root/.nvm/versions/node/v22.19.0/bin:$PATH"
export LD_LIBRARY_PATH="/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu"
export TMPDIR=/workspace/tmp_upload
export NVM_DIR="/root/.nvm"
# Source nvm for this session
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# Verify Node.js installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
# Start DragonflyDB in background
echo "Starting DragonflyDB..."
/workspace/dragonfly-x86_64 --bind 0.0.0.0 --port 6379 &
sleep 5
# Start Cloud-Blender-Render in background
echo "Starting Cloud-Blender-Render..."
/workspace/Cloud-Blender-Render &
# Start Jupyter Lab in background with dark theme configuration
echo "Starting Jupyter Lab..."
jupyter lab \
    --ip=0.0.0.0 \
    --port=8888 \
    --no-browser \
    --allow-root \
    --notebook-dir=/workspace \
    --ServerApp.token='' \
    --ServerApp.password='' \
    --ServerApp.allow_origin='*' \
    --ServerApp.disable_check_xsrf=True \
    --FileContentsManager.delete_to_trash=False &
# Give services time to start
sleep 5
echo "All services started:"
echo "- DragonflyDB running on port 6379"
echo "- Cloud-Blender-Render running"
echo "- Jupyter Lab running on port 8888 (Dark Mode enabled)"
echo "- Node.js $(node -v) available"
echo "- Access Jupyter Lab at: http://localhost:8888"
# Keep the container running
tail -f /dev/null