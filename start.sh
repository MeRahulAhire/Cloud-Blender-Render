#!/bin/bash
set -e

# Ensure required folders exist
mkdir -p /workspace/temp /workspace/output /workspace/blend-folder /workspace/tmp_upload

# List of app binaries and folders to manage
FILES=("dragonfly-x86_64" "Cloud-Blender-Render" "blender" "cycles_optix_denoise_logic.py")

# Copy from /app if missing
for f in "${FILES[@]}"; do
    if [ ! -e "/workspace/$f" ]; then
        echo "Copying $f from /app to /workspace"
        cp -r "/app/$f" "/workspace/"
    else
        echo "$f already exists in /workspace"
    fi
done

# Set env variables
export PATH="/workspace/blender:$PATH"
export LD_LIBRARY_PATH="/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu"
export TMPDIR=/workspace/tmp_upload

# Start DragonflyDB in background
/workspace/dragonfly-x86_64 --bind 0.0.0.0 --port 6379 &
sleep 5

# Start Cloud-Blender-Render in background
/workspace/Cloud-Blender-Render &

# Keep the container running
tail -f /dev/null