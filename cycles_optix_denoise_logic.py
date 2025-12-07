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
    # Blender 5.0: scene.node_tree removed, use scene.compositing_node_group
    # scene.use_nodes is deprecated and always True
    if scene.compositing_node_group:
        return any(node.type == 'DENOISE' for node in scene.compositing_node_group.nodes)
    return False


def setup_optix_denoising():
    """Configure OPTIX denoiser (with OIDN fallback) for scene, view layer, and compositor with GPU & high quality"""
    scene = bpy.context.scene
    prefs = bpy.context.preferences
    views = bpy.context.view_layer

    # Determine which denoiser to use: prefer OPTIX, fallback to OIDN
    has_optix = test_optix_availability()
    denoiser_type = 'OPTIX' if has_optix else 'OPENIMAGEDENOISE'
    
    print(f"Selected denoiser: {denoiser_type}")
    if not has_optix:
        print("WARNING: OPTIX not available, falling back to OIDN")

    # Scene-level denoising - ONLY if already enabled
    if scene.cycles.use_denoising:
        scene.cycles.denoiser = denoiser_type
        # Note: denoising_store_passes removed in Blender 5.0
        scene.cycles.denoising_prefilter = 'ACCURATE'
        scene.cycles.denoising_quality = 'HIGH'
        
        # Ensure normal & albedo passes (required for high-quality denoising)
        if hasattr(views, 'use_pass_normal'):
            views.use_pass_normal = True
        if hasattr(views, 'use_pass_diffuse_color'):
            views.use_pass_diffuse_color = True

        # GPU denoising flags
        if hasattr(scene.cycles, 'use_denoising_gpu'):
            scene.cycles.use_denoising_gpu = True
        if hasattr(scene.cycles, 'denoising_use_gpu'):
            scene.cycles.denoising_use_gpu = True
    else:
        print("Scene denoising is disabled, skipping scene denoiser configuration.")

    # Compositor GPU
    if hasattr(scene.render, 'use_compositor_gpu'):
        scene.render.use_compositor_gpu = True
    if hasattr(prefs.system, 'compositor_device'):
        prefs.system.compositor_device = 'GPU'

    # Node-based compositor denoising
    # Blender 5.0: scene.node_tree removed, use scene.compositing_node_group
    if scene.compositing_node_group:
        for node in scene.compositing_node_group.nodes:
            if node.type == 'DENOISE':
                # Set compositor denoise node to use the same denoiser
                if hasattr(node, 'denoiser'):
                    node.denoiser = denoiser_type
                if hasattr(node, 'use_gpu'):
                    node.use_gpu = True
                if hasattr(node, 'use_hdr'):
                    node.use_hdr = True
                print(f"Configured compositor denoise node: {denoiser_type}")


def setup_gpu_and_denoiser():
    """Main entry: configure GPU & enforce OPTIX denoising (with OIDN fallback) if enabled"""
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

    print("Denoising enabled: forcing OPTIX (or OIDN fallback) configuration...")
    setup_optix_denoising()

    # Note: Tile rendering properties (use_auto_tile, tile_x, tile_y) removed in Blender 5.0

    # Summary
    prefs = bpy.context.preferences.addons['cycles'].preferences
    print("=== Final Configuration ===")
    print(f"Compute Type: {prefs.compute_device_type}")
    print(f"Render Device: {scene.cycles.device}")
    print(f"Denoiser: {scene.cycles.denoiser} (GPU)")
    print(f"OPTIX Available: {test_optix_availability()}")
    print("Enabled Devices:")
    for d in prefs.devices:
        if d.use:
            print(f"  - {d.name} ({d.type})")


# --- Custom Logging Handlers ---

from bpy.app.handlers import persistent

@persistent
def render_stats_handler(renderer):
    """
    Handler called when render statistics are updated.
    Attempts to print 'Frame no | elapsed time | frame info'
    """
    # NOTE: 'renderer' argument content varies. 
    # Usually it's a string or an object with stats.
    # We will try to extract what we can.
    
    try:
        scene = bpy.context.scene
        frame = scene.frame_current
        

        prefix = f"Frame {frame} | "
        
        # Write to stdout with \r to return to start of line, setting up the prefix
        # for Blender's subsequent output.
        sys.stdout.write(f"\r{prefix}") 
        sys.stdout.flush()
        
    except Exception:
        # Fallback if something goes wrong, don't crash the render
        pass

@persistent
def render_init_handler(scene):
    print(f"Render Init: Frame {scene.frame_current}")

@persistent
def register_logging_handlers():
    # clear existing handlers to avoid duplicates if re-run
    bpy.app.handlers.render_stats.clear()
    bpy.app.handlers.render_init.clear()
    
    bpy.app.handlers.render_stats.append(render_stats_handler)
    bpy.app.handlers.render_init.append(render_init_handler)
    print("Custom render logging handlers registered.")


if __name__ == '__main__':
    try:
        # Run original setup
        setup_gpu_and_denoiser()
        
        # Register new logging handlers
        register_logging_handlers()
        
        print("Setup and logging configuration completed successfully.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)