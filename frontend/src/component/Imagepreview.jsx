import { useEffect } from "react";
import "../style/imagepreview.css";
import reel_image from "../assets/images/reel.png"
import render_sample from "../assets/images/0387.png"

export default function Imagepreview() {
  useEffect(() => {
    const image_preview_box = document.getElementById("ip-previewbox");

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
    return () => window.removeEventListener("resize", resizePreviewBox);
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
          <div className="ip-stream-message">
            Frame:1 | Time:00:41.64 | Mem:56.96M (Peak 118.47) | Sample 69/1024 Frame:1 | Time:00:41.64 | Mem:56.96M (Peak 118.47) | Sample 69/1024
          </div>
        </div>
        <div className="ip-previewbox" id="ip-previewbox">
            <div className="ip-startup-context">
                <div className="ip-startup-context-box">
                    <img src={reel_image} alt="" />
                    <p>
                        Live preview will appears here after submission. <br />Note - Only available if render output is set to image.
                    </p>

                </div>

            </div>
            <div className="ip-image-display">
                {/* <img src=""/> */}
            </div>
        </div>
      </div>
    </>
  );
}
