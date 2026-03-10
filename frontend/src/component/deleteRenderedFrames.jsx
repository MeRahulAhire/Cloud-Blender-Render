import "../style/deleteRenderedFrames.css";
import central_store from "./Store";
import axios from "axios";
import delete_forever from "../assets/icons/delete_forever.svg"
export default function DeleteRenderedFrames() {
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );
  const fetch_data = central_store((state) => state.fetch_data);
  const base_url = central_store((state) => state.base_url);

  const delete_frames = () => {
    if (render_status === false) {
      axios
        .post(`${base_url}/delete_rendered_frames`, {}, { withCredentials: true })
        .then((res) => {
          if (res.status === 200) {
            fetch_data();
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
  return (
    <div className="del-ren-frames-parent">
      <button
        onClick={delete_frames}
        className={`del-ren-frame-btn ${
          !!render_status ? `del-ren-frame-btn-cant-delete` : ``
        } `}
      >
        Delete all frames

        <img src={delete_forever} alt="" />
      </button>
      <div className="del-ren-frames-btn-info">
        This action is irreversible, please be sure before deleting all the rendered
        frames.
      </div>
    </div>
  );
}
