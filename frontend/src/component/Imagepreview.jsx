import { useEffect, useState } from "react";
import "../style/imagepreview.css";
import reel_image from "../assets/images/reel.png";
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

  useEffect(() => {
    const image_preview_box = document.getElementById("ip-previewbox");
    

    if (!socket.connected) {
      socket.connect();
    }


    const onImage = (res) => set_latest_preview_image(res.image_string);
    const onBlend = (res) => {
      set_render_stats(res.line);
      if (res.finished) fetch_data();
    };
  
    socket.on("live_base64", onImage);
    socket.on("blend_process", onBlend);

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
      socket.off("live_base64", onImage);
      socket.off("blend_process", onBlend);
      window.removeEventListener("resize", resizePreviewBox);
      socket
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
