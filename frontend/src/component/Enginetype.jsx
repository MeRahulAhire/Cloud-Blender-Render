import "../style/enginetype.css";
import central_store from "./Store";
export default function Enginetype() {
  const {
    set_engine,
    set_cycle_device,
    set_engine_query,
  } = central_store();

  const engine_type = central_store((state) => state.blender_settings.engine);
  const cycle_device = central_store(state => state.blender_settings.cycle_device);
  
  const blend_file_present = central_store(
    (state) => state.blend_file.is_present
  );
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );

  const set_cycle_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_engine(`CYCLES`);

      if (cycle_device === ""){
        set_engine_query(`-E CYCLES`);
      }

      if(cycle_device != ""){
        
        set_engine_query(`-E CYCLES -- --cycles-device ${cycle_device}`);
      }
    }
  };
  const set_workbench_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_engine(`BLENDER_WORKBENCH`);
      set_engine_query(`-E BLENDER_WORKBENCH`);
    }
  };
  const set_eevee_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_engine(`BLENDER_EEVEE_NEXT`);
      set_engine_query(`-E BLENDER_EEVEE_NEXT`);
    }
  };

  const set_cycle_device_as_optix = () => {
    if (!!blend_file_present && !render_status && engine_type === "CYCLES") {
      set_cycle_device(`OPTIX`)
      set_engine_query(`-E CYCLES -- --cycles-device OPTIX`);
    }
  } 

  const set_cycle_device_as_cuda = () => {
    if (!!blend_file_present && !render_status && engine_type === "CYCLES") {
      set_cycle_device(`CUDA`)
      set_engine_query(`-E CYCLES -- --cycles-device CUDA`);
    }
  } 

  return (
    <div className="engine-container">
      <div className="engine-container-head">Select the engine</div>
      <div className="engine-type">
        <div
          className={`engine-tag-label ${
            !!blend_file_present ? "" : `dim-opacity`
          } ${engine_type === `CYCLES` ? `engine-tag-label-toggle` : ``} ${!!render_status ? `dim-opacity` : ""}`}
          onClick={set_cycle_in_store}
        >
          CYCLES
        </div>
        <div
         className={`engine-tag-label 
          ${!!blend_file_present ? "" : "dim-opacity"} 
          ${engine_type === "BLENDER_WORKBENCH" ? "engine-tag-label-toggle" : ""} 
          ${!!render_status ? "dim-opacity" : ""}
        `}
          onClick={set_workbench_in_store}
        >
          WORKBENCH
        </div>
        <div
          className={`engine-tag-label 
            ${!!blend_file_present ? "" : "dim-opacity"} 
            ${engine_type === "BLENDER_EEVEE_NEXT" ? "engine-tag-label-toggle" : ""} 
            ${!!render_status ? "dim-opacity" : ""}
          `}
          onClick={set_eevee_in_store}
        >
          EEVEE NEXT
        </div>
      </div>
      <div className={`cycle-subsection ${!!blend_file_present && engine_type === `CYCLES` ? "" : `dim-opacity`}` }>
        <div className="cycles-type-head">Cycles device</div>
        <div className="cycle-type-tags-box">
          <div className={`cycle-type-tags ${cycle_device === `OPTIX` ? `cycle-type-tags-toggle ` : ``}`} onClick={set_cycle_device_as_optix} >OPTIX</div>
          <div className={`cycle-type-tags ${cycle_device === `CUDA` ? `cycle-type-tags-toggle ` : ``}`} onClick={set_cycle_device_as_cuda} >CUDA</div>
        </div>
      </div>
    </div>
  );
}
