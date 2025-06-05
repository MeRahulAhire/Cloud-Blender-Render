import "../style/Enginetype.css"

export default function Enginetype() {
  return (
    <div className="engine-container">
        <div className="engine-container-head">
            Select the engine
        </div>
        <div className="engine-type">
            <div className="engine-tag-label">CYCLES</div>
            <div className="engine-tag-label">WORKBENCH</div>
            <div className="engine-tag-label">EEVEE NEXT</div>
        </div>
        <div className="cycles-type-head">
            Cycles device
        </div>
    </div>
  )
}
