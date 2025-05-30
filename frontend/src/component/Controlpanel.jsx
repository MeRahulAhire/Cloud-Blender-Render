import "../style/controlpanel.css"
import Fileinput from "./Fileinput";
export default function Controlpanel() {
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          <Fileinput/>
        </div>
      </div>
    </>
  );
}
