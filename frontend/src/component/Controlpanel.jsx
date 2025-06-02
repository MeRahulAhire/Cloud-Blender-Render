import "../style/controlpanel.css"
import Fileinput from "./Fileinput";
export default function Controlpanel() {
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          <Fileinput/>
          <div style={{height: '200px', widows: "100px", background : "violet"}} ></div>
        </div>
      </div>
    </>
  );
}
