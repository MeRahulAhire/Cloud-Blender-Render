import "../style/animationtype.css";

export default function Animationtype() {
  return (
    <div className="anime-container">
      <div className="anime-top">
        <p> Select the animation</p>
      </div>
        <div className="anime-top-tags">
          <div className="anime-top-tags-label">Entire animation</div>
          <div className="anime-top-tags-label">Single frame</div>
          <div className="anime-top-tags-label">Range</div>
        </div>
      <div className="anime-bottom">
        <Single_frame/>
        {/* <Range_frame /> */}
      </div>
    </div>
  );
}

const Single_frame = () => {
  return (
    <div className="single-frame-container">
      <div className="single-frame-label-box">Enter frame value</div>
      <input type="number" className="single-frame-value-box" />
    </div>
  );
};

const Range_frame = () => {
  return (
    <div className="range-container" >
      <div className="start-box">
        <div className="start-box-label">
          Start frame
        </div>
        <input type="number" className="start-box-value" />
      </div>
      <div className="end-box">
        <div className="end-box-label">
          End Frame
        </div>
        <input type="text" className="end-box-value" />
      </div>
    </div>
  );
};
