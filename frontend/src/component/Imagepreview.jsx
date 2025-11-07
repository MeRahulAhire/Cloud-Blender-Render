import { useEffect, useState } from "react";
import "../style/imagepreview.css";
import reel_image from "../assets/images/reel.webp";
import { initSocket } from "./Socket";
import central_store from "./Store";

export default function Imagepreview() {
  const socket = initSocket();
  const set_latest_preview_image = central_store(
    (state) => state.set_latest_preview_image
  );
  const latest_preview_image = central_store(
    (state) => state.latest_preview_image
  );
  const fetch_data = central_store((state) => state.fetch_data);
  const render_stats = central_store((state) => state.render_stats);
  const set_render_stats = central_store((state) => state.set_render_stats);
  const set_rendered_image_list = central_store(state => state.set_rendered_image_list);

  useEffect(() => {
    const image_preview_box = document.getElementById("ip-previewbox");
    

    if (!socket.connected) {
      socket.connect();
    }

    const image_preview_socket = (res) => {
      set_latest_preview_image(res.image_string);
      set_rendered_image_list();
    };
    const render_stats_socket = (res) => {
      if(res.render_stats != "") {
        set_render_stats(res.render_stats);

      }
      if (res.render_stats === "Blender quit") {
        fetch_data()
      };
    };

    const stop_blender = (res) => {

      if (!!res.finished === true) {
        fetch_data()
      }
    }
  
    socket.on("live_base64", image_preview_socket);
    socket.on("render_stats", render_stats_socket);
    socket.on("blend_process", stop_blender)

    function resizePreviewBox() {
      const width = image_preview_box.offsetWidth;
      const height = width * 0.5625; // 16:9 ratio
      image_preview_box.style.height = `${height}px`;
    }

    // Initial sizing
    resizePreviewBox();

    // Resize handler
    window.addEventListener("resize", resizePreviewBox);

    // Cleanup
    return () => {
      socket.off("live_base64", image_preview_socket);
      socket.off("blend_process", render_stats_socket);
      window.removeEventListener("resize", resizePreviewBox);
    };
  }, []);
  return (
    <>
      <div className="ip-container">
        <div className="ip-topbar">
          <div className="ip-symbolholder">
            <div className="symbol-red"></div>
            <div className="symbol-yellow"></div>
            <div className="symbol-green"></div>
          </div>
        </div>
        <div className="ip-livestatus">
          <div className="ip-stream-message">{render_stats}</div>
        </div>
        <div className="ip-previewbox" id="ip-previewbox">
          {latest_preview_image != "" ? (
            <div className="ip-image-display">
              <img src={latest_preview_image} />
            </div>
          ) : (
            <div className="ip-startup-context">
              <div className="ip-startup-context-box">
                <img src={reel_image} alt="" />
                <p>
                  Live preview will appear here after submission. <br />
                  Note - Only available if render output is set to image.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
