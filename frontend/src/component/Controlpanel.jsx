import "../style/controlpanel.css";
import Fileinput from "./Fileinput";
import Animationtype from "./Animationtype";
import Enginetype from "./Enginetype";
import Filebrowser from "./Filebrowser";
import { useState } from "react";
import Start from "../assets/icons/start.svg"
import Stop from "../assets/icons/stop.svg"
export default function Controlpanel() {
  const [cp_state, set_cp_state] = useState(true)
  const [render_state, set_render_state] = useState(false)


  const download_view = () => {
    set_cp_state(false)
  }
  const control_panel_view = () => {
    set_cp_state(true)
  }
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          {!!cp_state ? <Control_input/> : <Filebrowser/>}
          <div className="render-start-stop stop-render-toggl">
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
