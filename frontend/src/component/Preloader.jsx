import "../style/preloader.css";
import cloud_blender_render_logo from "../assets/icons/cloud-blender-render-logo.svg";
export default function Preloader() {
  return (
    <div className="preloader-container">
      <div className="preloader-box">
      <img src={cloud_blender_render_logo} alt="site-logo" />

      </div>
    </div>
  );
}
