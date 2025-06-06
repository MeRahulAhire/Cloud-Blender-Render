import "../style/enginetype.css";

export default function Enginetype() {
  return (
    <div className="engine-container">
      <div className="engine-container-head">Select the engine</div>
      <div className="engine-type">
        <div className="engine-tag-label">CYCLES</div>
        <div className="engine-tag-label">WORKBENCH</div>
        <div className="engine-tag-label">EEVEE NEXT</div>
      </div>
      {/* <hr className="engine-subsection-seperator" /> */}
      <div className="cycle-subsection">
        <div className="cycles-type-head">Cycles device</div>
        <div className="cycle-type-tags-box">
          <div className="cycle-type-tags">OPTIX</div>
          <div className="cycle-type-tags">CUDA</div>
        </div>
      </div>
    </div>
  );
}
