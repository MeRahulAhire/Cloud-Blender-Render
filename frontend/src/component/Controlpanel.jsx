import "../style/controlpanel.css";
import Fileinput from "./Fileinput";
import Animationtype from "./Animationtype";
import Enginetype from "./Enginetype";
import Filebrowser from "./Filebrowser";
export default function Controlpanel() {
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          {/* <Control_input/> */}
          <Filebrowser/>
          <div className="render-start-stop ">Start render</div>
          <div className="toggle-panel-box">
            <div className="toggle-switch-section">
              <div className="control-panel-switch">Control panel</div>
              <div className="file-browser-switch">Browse files</div>
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
