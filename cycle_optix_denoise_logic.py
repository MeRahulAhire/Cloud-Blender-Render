
import bpy
import sys

def setup_gpu_and_denoiser():
    """
    Configure GPU rendering and denoiser settings based on blend file configuration
    """
    
    # Get the current scene
    scene = bpy.context.scene
    
    # Check if Cycles is the active render engine
    if scene.render.engine != 'CYCLES':
        print("Cycles render engine is not active. Skipping GPU/denoiser setup.")
        return
    
    print("Cycles render engine detected. Configuring GPU and denoiser...")
    
    # Enable GPU rendering with OPTIX preference
    cycles_prefs = bpy.context.preferences.addons['cycles'].preferences
    cycles_prefs.refresh_devices()
    
    # Set compute device type to OPTIX first (most efficient for RTX cards)
    cycles_prefs.compute_device_type = "OPTIX"
    
    # Set scene to use GPU
    scene.cycles.device = 'GPU'
    
    # Configure GPU devices - prioritize OPTIX over CUDA
    optix_found = False
    for device in cycles_prefs.devices:
        if device.type == 'OPTIX':
            device.use = True
            optix_found = True
            print(f"Enabled OPTIX device: {device.name}")
        else:
            device.use = False  # Disable other devices when OPTIX is available
    
    # If no OPTIX devices found, fall back to CUDA
    if not optix_found:
        cycles_prefs.compute_device_type = "CUDA"
        for device in cycles_prefs.devices:
            if device.type == 'CUDA':
                device.use = True
                print(f"Enabled CUDA device: {device.name}")
            else:
                device.use = False
    
    # Check if denoising is enabled in the blend file
    # Get the first view layer (or active if available)
    view_layer = None
    if hasattr(scene.view_layers, 'active') and scene.view_layers.active:
        view_layer = scene.view_layers.active
    elif len(scene.view_layers) > 0:
        view_layer = scene.view_layers[0]
    
    # Check if denoising is enabled in the view layer or scene
    denoise_enabled = False
    
    # Debug: Print all denoising settings found
    print("\n🔍 Debug: Checking denoising settings...")
    
    # Check scene-level denoising first (most common in Blender 4.x)
    if hasattr(scene.cycles, 'use_denoising'):
        scene_denoise = scene.cycles.use_denoising
        print(f"Scene cycles use_denoising: {scene_denoise}")
        denoise_enabled = scene_denoise
    
    # Check view layer denoising
    if view_layer and hasattr(view_layer, 'cycles'):
        if hasattr(view_layer.cycles, 'use_denoising'):
            vl_denoise = view_layer.cycles.use_denoising
            print(f"View layer cycles use_denoising: {vl_denoise}")
            # Only enable if both scene and view layer agree, or if only one is set
            if hasattr(scene.cycles, 'use_denoising'):
                denoise_enabled = scene.cycles.use_denoising and vl_denoise
            else:
                denoise_enabled = vl_denoise
    
    # Check compositor nodes for denoise nodes
    compositor_denoise = False
    if scene.use_nodes and scene.node_tree:
        for node in scene.node_tree.nodes:
            if node.type == 'DENOISE':
                compositor_denoise = True
                break
    print(f"Compositor denoise node found: {compositor_denoise}")
    
    # Final decision: only enable if explicitly set in blend file
    if compositor_denoise:
        denoise_enabled = True
    
    print(f"Final denoising decision: {denoise_enabled}")
    
    if denoise_enabled:
        # Force OPTIX denoiser in scene Cycles settings (Blender 4.x API)
        if optix_found:
            scene.cycles.use_denoising = True
            scene.cycles.denoiser = 'OPTIX'
            scene.cycles.denoising_store_passes = False  # Don't store passes for faster rendering
            print("Set denoiser to OPTIX (scene level)")
        else:
            # Fallback to OpenImageDenoiser if OPTIX not available
            scene.cycles.use_denoising = True
            scene.cycles.denoiser = 'OPENIMAGEDENOISE'
            scene.cycles.denoising_store_passes = False
            print("OPTIX not available, falling back to OpenImageDenoiser")
            
    else:
        # Disable denoising completely to improve render speed
        scene.cycles.use_denoising = False
        # Also clear/reset the denoiser to ensure no denoising processing happens
        if hasattr(scene.cycles, 'denoiser'):
            scene.cycles.denoiser = 'OPENIMAGEDENOISE'  # Set to default but won't be used
        print("Denoising disabled (not enabled in blend file)")
        
        # Also disable view layer denoising if it exists
        if view_layer and hasattr(view_layer, 'cycles'):
            if hasattr(view_layer.cycles, 'use_denoising'):
                view_layer.cycles.use_denoising = False
                print("View layer denoising also disabled")
            # Also check for any other denoising settings
            if hasattr(view_layer.cycles, 'denoiser'):
                print(f"View layer denoiser was: {view_layer.cycles.denoiser}")
        
        # Debug: Check for any remaining denoising settings
        print("🔍 Debug: Final denoising check...")
        print(f"Scene use_denoising: {scene.cycles.use_denoising}")
        if view_layer and hasattr(view_layer, 'cycles') and hasattr(view_layer.cycles, 'use_denoising'):
            print(f"View layer use_denoising: {view_layer.cycles.use_denoising}")
        
        # Check render layer settings (sometimes separate from cycles)
        if hasattr(scene.render, 'use_compositing'):
            print(f"Compositing enabled: {scene.render.use_compositing}")
        if hasattr(scene.render, 'use_sequencer'):
            print(f"Sequencer enabled: {scene.render.use_sequencer}")
        
        # Check for any post-processing that might be slow
        if hasattr(scene, 'view_settings'):
            print(f"View transform: {scene.view_settings.view_transform}")
            print(f"Look: {scene.view_settings.look}")
            print(f"Exposure: {scene.view_settings.exposure}")
            print(f"Gamma: {scene.view_settings.gamma}")
    
    # Optional: Set GPU-friendly tile size for older Blender versions
    if hasattr(scene.cycles, 'use_auto_tile'):
        scene.cycles.use_auto_tile = False
        scene.cycles.tile_x = 256
        scene.cycles.tile_y = 256
        print("Set tile size to 256x256 for GPU optimization")
    
    # Print final configuration
    print("\n🔍 Cycles Preferences & Settings:")
    print(f"Compute Device Type: {cycles_prefs.compute_device_type}")
    print(f"Render Device: {scene.cycles.device}")
    if scene.cycles.use_denoising:
        print(f"Denoiser: {scene.cycles.denoiser}")
        print(f"Denoising Enabled: {scene.cycles.use_denoising}")
    else:
        print("Denoiser: DISABLED")
        print(f"Denoising Enabled: {scene.cycles.use_denoising}")
    
    # List enabled devices only
    print("Enabled Devices:")
    for device in cycles_prefs.devices:
        if device.use:
            print(f"  • {device.name} ({device.type})")

if __name__ == "__main__":
    try:
        setup_gpu_and_denoiser()
        print("\nGPU and denoiser setup completed successfully!")
    except Exception as e:
        print(f"Error during setup: {str(e)}")
        sys.exit(1)