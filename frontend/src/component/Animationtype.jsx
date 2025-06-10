import "../style/animationtype.css";
import central_store from "./Store";
export default function Animationtype() {
  const {
    set_entire_sequence,
    set_range_sequence,
    set_start_range_value,
    set_end_range_value,
    set_single_frame,
    set_single_frame_value,
    set_anime_query,
    set_engine,
    set_cycle_device,
    set_engine_query,
  } = central_store();

  const entire_sequence = central_store(
    (state) => state.blender_settings.animation_sequence.entire
  );
  const range_sequence = central_store(
    (state) => state.blender_settings.animation_sequence.range.status
  );
  const start_range_value = central_store(
    (state) => state.blender_settings.animation_sequence.range.start_frame
  );
  const end_range_value = central_store(
    (state) => state.blender_settings.animation_sequence.range.end_frame
  );

  const single_frame = central_store(
    (state) => state.blender_settings.animation_sequence.single_frame.status
  );
  const single_frame_value = central_store(
    (state) =>
      state.blender_settings.animation_sequence.single_frame.frame_value
  );

  const blend_file_present = central_store(
    (state) => state.blend_file.is_present
  );
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );

  const set_entire_sequence_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_entire_sequence(true);
      set_range_sequence(false);
      set_single_frame(false);
      set_anime_query(`-a`);
    }
  };
  const set_range_sequence_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_entire_sequence(false);
      set_range_sequence(true);
      set_single_frame(false);
      set_anime_query(`-s ${start_range_value} -e ${end_range_value}`);
    }
  };
  const set_single_frame_in_store = () => {
    if (!!blend_file_present && !render_status) {
      set_entire_sequence(false);
      set_range_sequence(false);
      set_single_frame(true);
      set_anime_query(`-f ${single_frame_value}`);
    }
  };

  return (
    <div className="anime-container">
      <div className="anime-top">
        <p> Select the animation</p>
      </div>
      <div className="anime-top-tags">
        <div
          className={`anime-top-tags-label ${
            !!blend_file_present ? "" : `dim-opacity`
          } ${!!entire_sequence ? `anime-top-tags-label-toggle ` : ""} 
          ${!!render_status ? `dim-opacity` : ""}
          `}
          onClick={set_entire_sequence_in_store}
        >
          Entire animation
        </div>
        <div
          className={`anime-top-tags-label ${
            !!blend_file_present ? "" : `dim-opacity`
          } ${!!single_frame ? `anime-top-tags-label-toggle ` : ""}
          ${!!render_status ? `dim-opacity` : ""}
          `}
          onClick={set_single_frame_in_store}
        >
          Single frame
        </div>
        <div
          className={`anime-top-tags-label ${
            !!blend_file_present ? "" : `dim-opacity`
          } ${!!range_sequence ? `anime-top-tags-label-toggle ` : ""}
          ${!!render_status ? `dim-opacity` : ""}
          `}
          onClick={set_range_sequence_in_store}
        >
          Range
        </div>
      </div>
      <div className="anime-bottom">
        <Section_switch
          entire_sequence={entire_sequence}
          range_sequence={range_sequence}
          single_frame={single_frame}
          single_frame_value={single_frame_value}
          set_single_frame_value={set_single_frame_value}
          start_range_value={start_range_value}
          set_start_range_value={set_start_range_value}
          end_range_value={end_range_value}
          set_end_range_value={set_end_range_value}
        />
      </div>
    </div>
  );
}

const Section_switch = ({
  entire_sequence,
  range_sequence,
  single_frame,
  single_frame_value,
  set_single_frame_value,
  start_range_value,
  set_start_range_value,
  end_range_value,
  set_end_range_value,
}) => {
  if (range_sequence === true) {
    return (
      <Range_frame
        start_range_value={start_range_value}
        set_start_range_value={set_start_range_value}
        end_range_value={end_range_value}
        set_end_range_value={set_end_range_value}
      />
    );
  }

  if (single_frame === true) {
    return (
      <Single_frame
        single_frame={single_frame}
        single_frame_value={single_frame_value}
        set_single_frame_value={set_single_frame_value}
      />
    );
  }

  if (entire_sequence === true) {
    return (
      <Single_frame
        single_frame={single_frame}
        single_frame_value={single_frame_value}
        set_single_frame_value={set_single_frame_value}
      />
    );
  }
  if (entire_sequence === false) {
    return (
      <Single_frame
        single_frame={single_frame}
        single_frame_value={single_frame_value}
        set_single_frame_value={set_single_frame_value}
      />
    );
  }
  // fallback to nothing (or return null)
  return null;
};

const Single_frame = ({
  single_frame,
  single_frame_value,
  set_single_frame_value,
}) => {

  return (
    <div
      className={`single-frame-container ${!single_frame ? `dim-opacity` : ""}`}
    >
      <div className="single-frame-label-box">Enter frame value</div>
      <input
        type="number"
        className="single-frame-value-box"
        disabled={!single_frame}
        value={single_frame_value}
        onChange={set_single_frame_value}
      />
    </div>
  );
};

const Range_frame = ({
  start_range_value,
  set_start_range_value,
  end_range_value,
  set_end_range_value,
}) => {


  return (
    <div className="range-container">
      <div className="start-box">
        <div className="start-box-label">Start frame</div>
        <input value={start_range_value} type="number" className="start-box-value" onChange={set_start_range_value} />
      </div>
      <div className="end-box">
        <div className="end-box-label">End Frame</div>
        <input value={end_range_value} type="text" className="end-box-value" onChange={set_end_range_value} />
      </div>
    </div>
  );
};
