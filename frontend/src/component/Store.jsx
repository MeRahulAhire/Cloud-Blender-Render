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
}));

export default central_store;
