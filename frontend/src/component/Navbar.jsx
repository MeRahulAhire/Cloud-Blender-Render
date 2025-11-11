import "../style/navbar.css";
import "../style/toggleswitch.css";
import gear from "../assets/icons/gear.svg";
// import { useState } from "react";
import central_store from "./Store";
import Settings from "./Settings";
export default function Navbar() {
  // const [settings_box, set_settings_box] = useState(true);
  const settings_box = central_store((state) => state.settings_box);
  const set_settings_box = central_store((state) => state.set_settings_box)
  const open_setting_box = () => {
    set_settings_box(true);
    document.body.style.position = "fixed";
    document.body.style.overflow = "hidden";
  };
  return (
    <>
      <div className="navbar-container">
        <div className="navbar-box">
          <div className="navbar-content">
            <div className="navbar-content-heading">
              {/* <div className="image">
            <img src={site_logo} alt="" />

            </div> */}
              <div className="title">Cloud Blender Render</div>
            </div>
            <a className="navbar-donation-button" href="http://coff.ee/rahulahire" target="_blank" rel="noopener noreferrer">
            Support
            </a>
            {/* <a className="navbar-donation-button">
              <a href="http://coff.ee/rahulahire" target="_blank" rel="noopener noreferrer">Support</a>
            </a> */}
            <div className="navbar-gearbox" onClick={open_setting_box}>
              <img src={gear} alt="Setting Icon" />
            </div>
          </div>
        </div>
      </div>
      {!!settings_box && <Settings set_settings_box={set_settings_box} />}
    </>
  );
}