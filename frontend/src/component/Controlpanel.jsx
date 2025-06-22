import "../style/controlpanel.css";
import Fileinput from "./Fileinput";
import Animationtype from "./Animationtype";
import Enginetype from "./Enginetype";
import Filebrowser from "./Filebrowser";
import { useEffect, useState } from "react";
import Start from "../assets/icons/start.svg";
import Stop from "../assets/icons/stop.svg";
import central_store from "./Store";
import axios from "axios";
import { initSocket } from "./Socket";

export default function Controlpanel() {
  const socket = initSocket();
  useEffect(() => {
    socket.on("data_sync_confirm", (res) => {
      if (res.status === true) {
        fetch_data();
      }
    });
  }, []);
  const [cp_state, set_cp_state] = useState(true);
  const base_url = central_store((state) => state.base_url);

  const anime_query = central_store((state) => state.anime_query);
  const engine_query = central_store((state) => state.engine_query);
  const blender_settings = central_store((state) => state.blender_settings);
  const fetch_data = central_store((state) => state.fetch_data);
  const render_status = central_store((state) => state.render_status.is_rendering);
  const blend_file_present = central_store((state) => state.blend_file.is_present);

  const download_view = () => {
    set_cp_state(false);
  };
  const control_panel_view = () => {
    set_cp_state(true);
  };

 
  const toggle_render_process = () => {

    if (render_status === false && blend_file_present === true) {
      socket.emit("blend_engine", {
        data_sync: {
          blender_settings,
          anime_query,
          engine_query,
        },
      });
    }

    if (render_status === true) {
      axios.post(`${base_url}/stop_render`, {}, {withCredentials : true})
      .then((res) => {
        if (res.status === 200) {
          fetch_data()
        }
      })
      .catch((err) => {
        console.log(err)
      })
    }

  };
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          {!!cp_state ? <Control_input /> : <Filebrowser />}
          <div
            className={`render-start-stop ${
              !!render_status ? `stop-render-toggle` : ``
            } ${!!blend_file_present ? `` : `dim-opacity`}`}
            onClick={toggle_render_process}
          >
            <img src={!!render_status ? Stop : Start} alt="" />
          </div>
          <div className="toggle-panel-box">
            <div className="toggle-switch-section">
              <div
                className="control-panel-switch"
                onClick={control_panel_view}
              >
                Control panel
              </div>
              <div className="file-browser-switch" onClick={download_view}>
                Browse files
              </div>
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
