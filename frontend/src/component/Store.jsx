import { create } from "zustand";
import { produce } from "immer";
import axios from "axios";

// Toggle this to 'prod' when deploying
const MODE = "dev"; // or 'prod'

const central_store = create((set, get) => ({
  base_url: MODE === "dev" ? "http://localhost:4000" : window.location.origin,
  has_fetched: false, // ✅ new flag
  upload_percentage: 0,

  fetch_data: async (payload = {}) => {
    const base_url = get().base_url;
    const res = await axios.post(`${base_url}/get_db`, payload);
    set(
      produce((state) => {
        Object.assign(state, res.data);
        state.has_fetched = true;
      })
    );
  },

  set_upload_percentage: (value) => {
    set(
      produce((state) => {
        state.upload_percentage = value;
      })
    );
  },

  set_entire_sequence: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.entire = value;
      })
    );
  },
  set_range_sequence: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.status = value;
      })
    );
  },
  set_start_range_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.start_frame = Math.abs(e.target.value);
      })
    );
  },
  set_end_range_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.range.end_frame = Math.abs(e.target.value);
      })
    );
  },
  set_single_frame: (value) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.single_frame.status = value;
      })
    );
  },
  set_single_frame_value: (e) => {
    set(
      produce((state) => {
        state.blender_settings.animation_sequence.single_frame.frame_value = Math.abs(e.target.value);
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
}));

export default central_store;
