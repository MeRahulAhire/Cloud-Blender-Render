FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /workspace

# System prerequisites & libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      wget gnupg ca-certificates software-properties-common \
      build-essential pkg-config libssl-dev libclang-dev git \
      libxi6 libfontconfig1 libxrender1 \
      libboost-all-dev libgl1-mesa-dev libglu1-mesa \
      libsm-dev libxkbcommon-x11-dev imagemagick && \
    rm -rf /var/lib/apt/lists/*

# NVIDIA CUDA 12.4 toolkit + NVML headers
# RUN wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb && \
#     dpkg -i cuda-keyring_1.0-1_all.deb && \
#     rm cuda-keyring_1.0-1_all.deb && \
#     apt-get update && \
#     apt-get install -y --no-install-recommends \
#       cuda-toolkit-12-4 \
#       libnvidia-ml-dev && \
#     rm -rf /var/lib/apt/lists/*

# Environment setup
ENV LD_LIBRARY_PATH="/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu"
ENV PATH="/usr/local/cuda/bin:${PATH}"
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Prepare /app and put all binaries inside
RUN mkdir /app

# DragonflyDB binary
RUN wget https://dragonflydb.gateway.scarf.sh/latest/dragonfly-x86_64.tar.gz && \
    tar -xf dragonfly-x86_64.tar.gz && \
    chmod u+x dragonfly-x86_64 && \
    mv dragonfly-x86_64 /app/ && \
    rm dragonfly-x86_64.tar.gz

# Blender CLI
RUN wget https://download.blender.org/release/Blender4.5/blender-4.5.1-linux-x64.tar.xz && \
    mkdir /app/blender && \
    tar xf blender-4.5.1-linux-x64.tar.xz -C /app/blender --strip-components 1 && \
    rm blender-4.5.1-linux-x64.tar.xz

# Cloud-Blender-Render binary
RUN wget https://github.com/MeRahulAhire/Cloud-Blender-Render/releases/download/1.4.0/Cloud-Blender-Render && \
    chmod u+x Cloud-Blender-Render && \
    mv Cloud-Blender-Render /app/

# After the Cloud-Blender-Render binary section, add:
COPY cycles_optix_denoise_logic.py /app/

# Copy start.sh and make executable
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Entrypoint
ENTRYPOINT ["/start.sh"]
