import "../style/controlpanel.css";
import Fileinput from "./Fileinput";
import Animationtype from "./Animationtype";
import Enginetype from "./Enginetype";
import Filebrowser from "./Filebrowser";
import { useState } from "react";
import Start from "../assets/icons/start.svg"
import Stop from "../assets/icons/stop.svg"
import central_store from "./Store";
import axios from "axios";
export default function Controlpanel() {
  const [cp_state, set_cp_state] = useState(true)
  const [render_state, set_render_state] = useState(false)
  const base_url = central_store((state) => state.base_url);
 
 const anime_query = central_store(state => state.anime_query);
 const engine_query = central_store(state => state.engine_query);
 const blender_settings = central_store(state => state.blender_settings)

  const download_view = () => {
    set_cp_state(false)
  }
  const control_panel_view = () => {
    set_cp_state(true)
  }
  const testApi = () => {
    console.log(`blender-query : ${anime_query} ${engine_query}`)

    console.log({
      "set-db-data" : {
        blender_settings, anime_query, engine_query
      }
  })
  }
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          {!!cp_state ? <Control_input/> : <Filebrowser/>}
          <div className="render-start-stop stop-render-toggl" onClick={testApi}>
            <img src={!!render_state ? Stop : Start} alt="" />
          </div>
          <div className="toggle-panel-box">
            <div className="toggle-switch-section">
              <div className="control-panel-switch" onClick={control_panel_view}>Control panel</div>
              <div className="file-browser-switch" onClick={download_view} >Browse files</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Control_input = () => {
  return (
    <>
      <Fileinput />
      <Animationtype />
      <Enginetype />
    </>
  );
};
