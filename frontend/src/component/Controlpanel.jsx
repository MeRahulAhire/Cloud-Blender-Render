import "../style/controlpanel.css"
import Fileinput from "./Fileinput";
import Animationtype from "./Animationtype"
import Enginetype from "./Enginetype";
export default function Controlpanel() {
  return (
    <>
      <div className="dp-control-panel">
        <div className="dp-control-panel-container">
          <Fileinput/>
          <Animationtype/>
          <Enginetype/>
        </div>
      </div>
    </>
  );
}
