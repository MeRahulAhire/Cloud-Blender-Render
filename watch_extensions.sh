#!/bin/bash

# Extension watcher script for Blender
# Monitors /workspace/extension/ for .zip and .whl files
# Automatically installs them using Blender's extension install-file command

WATCH_DIR="/workspace/extension"
BLENDER_BIN="/workspace/blender/blender"
LOG_FILE="/workspace/extension_install.log"

# Ensure the watch directory exists
mkdir -p "$WATCH_DIR"

# Initialize log file
echo "=== Blender Extension Watcher Started ===" > "$LOG_FILE"
echo "Watching directory: $WATCH_DIR" >> "$LOG_FILE"
echo "Started at: $(date)" >> "$LOG_FILE"
echo "=========================================" >> "$LOG_FILE"

# Function to install extension
install_extension() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    
    echo "" >> "$LOG_FILE"
    echo "[$(date)] Detected new file: $file_name" >> "$LOG_FILE"
    
    # Check if file is .zip or .whl
    if [[ "$file_name" =~ \.(zip|whl)$ ]]; then
        echo "[$(date)] Installing extension: $file_name" >> "$LOG_FILE"
        
        # Run blender extension install command
        if "$BLENDER_BIN" --command extension install-file -r user_default -e "$file_path" >> "$LOG_FILE" 2>&1; then
            echo "[$(date)] ✓ Successfully installed: $file_name" >> "$LOG_FILE"
            echo "[$(date)] ✓ Successfully installed: $file_name"
        else
            echo "[$(date)] ✗ Failed to install: $file_name" >> "$LOG_FILE"
            echo "[$(date)] ✗ Failed to install: $file_name"
        fi
    else
        echo "[$(date)] Skipping non-extension file: $file_name" >> "$LOG_FILE"
    fi
}

# Process any existing files in the directory on startup
echo "[$(date)] Checking for existing extensions..." >> "$LOG_FILE"
for file in "$WATCH_DIR"/*.zip "$WATCH_DIR"/*.whl; do
    if [ -f "$file" ]; then
        install_extension "$file"
    fi
done

echo "[$(date)] Starting file watcher..." >> "$LOG_FILE"
echo "[$(date)] Monitoring $WATCH_DIR for new extensions..."

# Watch for close_write event (file fully written and closed)
# This ensures the file is completely transferred before processing
inotifywait -m -e close_write --format '%w%f' "$WATCH_DIR" | while read file_path
do
    # Check if file exists and is a valid extension file
    if [ -f "$file_path" ]; then
        install_extension "$file_path"
    fi
done