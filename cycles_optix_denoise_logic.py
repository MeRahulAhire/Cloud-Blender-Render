import bpy
import sys

def test_optix_availability():
    """Check if any OPTIX device is present"""
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.refresh_devices()
    return any(d.type == 'OPTIX' for d in prefs.devices)


def setup_gpu_rendering():
    """Enable GPU rendering: prefer OPTIX, fallback to CUDA"""
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.refresh_devices()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'

    if test_optix_availability():
        prefs.compute_device_type = 'OPTIX'
        for d in prefs.devices:
            d.use = (d.type == 'OPTIX')
        return 'OPTIX'
    else:
        prefs.compute_device_type = 'CUDA'
        found = False
        for d in prefs.devices:
            if d.type == 'CUDA':
                d.use = True
                found = True
            else:
                d.use = False
        return 'CUDA' if found else None


def check_denoising_enabled():
    """Return True if any denoising is enabled in scene, view layer, or compositor"""
    scene = bpy.context.scene
    vl = bpy.context.view_layer
    if getattr(scene.cycles, 'use_denoising', False):
        return True
    if hasattr(vl.cycles, 'use_denoising') and vl.cycles.use_denoising:
        return True
    if scene.use_nodes and scene.node_tree:
        return any(node.type == 'DENOISE' for node in scene.node_tree.nodes)
    return False


def setup_oidn_denoising():
    """Configure OIDN denoiser for scene, view layer, and compositor with GPU & high quality"""
    scene = bpy.context.scene
    prefs = bpy.context.preferences
    views = bpy.context.view_layer

    # Scene-level denoising
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.denoising_store_passes = True
    scene.cycles.denoising_prefilter = 'ACCURATE'
    scene.cycles.denoising_quality = 'HIGH'
    # Ensure normal & albedo passes
    if hasattr(views, 'use_pass_normal'):
        views.use_pass_normal = True
    if hasattr(views, 'use_pass_diffuse_color'):
        views.use_pass_diffuse_color = True

    # GPU denoising flags
    if hasattr(scene.cycles, 'use_denoising_gpu'):
        scene.cycles.use_denoising_gpu = True
    if hasattr(scene.cycles, 'denoising_use_gpu'):
        scene.cycles.denoising_use_gpu = True

    # Compositor GPU
    if hasattr(scene.render, 'use_compositor_gpu'):
        scene.render.use_compositor_gpu = True
    if hasattr(prefs.system, 'compositor_device'):
        prefs.system.compositor_device = 'GPU'

    # Node-based compositor
    if scene.use_nodes and scene.node_tree:
        for node in scene.node_tree.nodes:
            if node.type == 'DENOISE':
                if hasattr(node, 'use_gpu'):
                    node.use_gpu = True
                if hasattr(node, 'use_hdr'):
                    node.use_hdr = True


def setup_gpu_and_denoiser():
    """Main entry: configure GPU & enforce OIDN denoising if enabled"""
    scene = bpy.context.scene

    if scene.render.engine != 'CYCLES':
        print("Cycles not active, skipping setup.")
        return

    print("Configuring GPU rendering...")
    gpu = setup_gpu_rendering()
    if not gpu:
        print("No GPU devices found, aborting.")
        return

    print(f"GPU setup complete: {gpu}")

    if not check_denoising_enabled():
        print("Denoising not enabled in file; skipping denoiser setup.")
        return

    print("Denoising enabled: forcing OIDN configuration...")
    setup_oidn_denoising()

    # Optional tile size for GPU
    if hasattr(scene.cycles, 'use_auto_tile'):
        scene.cycles.use_auto_tile = False
        scene.cycles.tile_x = 256
        scene.cycles.tile_y = 256

    # Summary
    prefs = bpy.context.preferences.addons['cycles'].preferences
    print("=== Final Configuration ===")
    print(f"Compute Type: {prefs.compute_device_type}")
    print(f"Render Device: {scene.cycles.device}")
    print(f"Denoiser: {scene.cycles.denoiser} (GPU)")
    print("Enabled Devices:")
    for d in prefs.devices:
        if d.use:
            print(f"  - {d.name} ({d.type})")


if __name__ == '__main__':
    try:
        setup_gpu_and_denoiser()
        print("Setup completed successfully.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)