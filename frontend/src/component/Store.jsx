import { create } from "zustand";
import { produce } from "immer";
import axios from "axios";

// Toggle this to 'prod' when deploying
const is_local = () => {
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.")
  );
};

const central_store = create((set, get) => ({
  base_url: is_local() ? "http://localhost:4000" : window.location.origin,
  has_fetched: false, // ✅ new flag
  upload_percentage: 0,

  fetch_data: async () => {
    const base_url = get().base_url;
    const res = await axios.post(`${base_url}/get_db`, {});
    set(
      produce((state) => {
        Object.assign(state, res.data);
        state.has_fetched = true;
      })
    );
  },
  set_rendered_image_list: async () => {
    const base_url = get().base_url;
    await axios.post(`${base_url}/render_list`, {}).then((res) => {
      if (res.status === 200) {
        set(
          produce((state) => {
            state.rendered_image_list = res.data.data;
          })
        );
        // console.log(get().rendered_image_list)
      }
    });
  },

  set_upload_percentage: (value) => {
    set(
      produce((state) => {
        state.upload_percentage = value;
      })
    );
  },
  set_anime_query: (value) => {
    set(
      produce((state) => {
        state.anime_query = value;
      })
    );
  },
  set_engine: (value) => {
    set(
      produce((state) => {
        state.blender_settings.engine = value;
      })
    );
  },
  set_cycle_device: (value) => {
    set(
      produce((state) => {
        state.blender_settings.cycle_device = value;
      })
    );
  },
  set_engine_query: (value) => {
    set(
      produce((state) => {
        state.engine_query = value;
      })
    );
  },
  set_start_range_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.start_frame = Math.abs(
          e.target.value
        );
        // rebuild anime_query immediately:
        const { start_frame, end_frame } =
          state.blender_settings.animation_sequence.range;
        state.anime_query = `-s ${start_frame} -e ${end_frame}`;
      })
    );
  },
  set_end_range_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.end_frame = Math.abs(
          e.target.value
        );
        const { start_frame, end_frame } =
          state.blender_settings.animation_sequence.range;
        state.anime_query = `-s ${start_frame} -e ${end_frame}`;
      })
    );
  },
  set_single_frame_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.single_frame.frame_value =
          Math.abs(e.target.value);
        state.anime_query = `-f ${state.blender_settings.animation_sequence.single_frame.frame_value}`;
      })
    );
  },
  set_entire_sequence: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.entire = value;
        if (value) state.anime_query = `-a`;
      })
    );
  },
  set_range_sequence: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.status = value;
        if (value) {
          const { start_frame, end_frame } =
            state.blender_settings.animation_sequence.range;
          state.anime_query = `-s ${start_frame} -e ${end_frame}`;
        }
      })
    );
  },
  set_single_frame: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.single_frame.status = value;
        if (value) {
          state.anime_query = `-f ${state.blender_settings.animation_sequence.single_frame.frame_value}`;
        }
      })
    );
  },

  set_latest_preview_image: (value) => {
    set(
      produce((state) => {
        state.latest_preview_image = value;
      })
    );
  },
  set_render_stats: (value) => {
    set(
      produce((state) => {
        state.render_stats = value;
      })
    );
  },
}));

export default central_store;
