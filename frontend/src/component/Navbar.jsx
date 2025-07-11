import "../style/navbar.css";
import "../style/toggleswitch.css";
import gear from "../assets/icons/gear.svg";
// import site_logo from "../assets/icons/cloud-blender-render-logo.svg"
import { createPortal } from "react-dom";
import cancel from "../assets/icons/cancel.svg";
import { useState } from "react";
import central_store from "./Store";
import axios from "axios";
import { initSocket } from "./Socket";

export default function Navbar() {
  const [settings_box, set_settings_box] = useState(false);

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

const Settings = ({ set_settings_box }) => {
  const [clipboard_select, set_clipboard_select] = useState(false);
  const password_status = central_store((state) => state.password.is_protected);
  const base_url = central_store((state) => state.base_url);
  const blender_version = central_store((state) => state.blender_version);
  const key = central_store((state) => state.password.key);
  const debug_store = central_store(state => state)
  const render_status = central_store(
    (state) => state.render_status.is_rendering
  );
  const fetch_data = central_store((state) => state.fetch_data);
  const socket = initSocket();

  const close_setting_box = (e) => {
    set_settings_box(false);
    document.body.style.position = "";
    document.body.style.overflow = "";
  };

  const copy_link = () => {
    console.log(debug_store)
    if (password_status === true) {
      console.table({
        password_status: password_status,
        base_url: base_url,
        key: key,
      });
      navigator.clipboard.writeText(`${base_url}/share?key=${key}`);
      set_clipboard_select(true);

      setTimeout(() => {
        set_clipboard_select(false);
      }, 2500);
    }
  };
  return createPortal(
    <>
      <div className="settings-container" onClick={close_setting_box}>
        <div className="settings-box" onClick={(e) => e.stopPropagation()}>
          <div className="sb-top-cancel">
            <div
              className="sb-top-cancel-box"
              onClick={(e) => {
                e.stopPropagation(); // also stop here
                close_setting_box(e);
              }}
            >
              <img src={cancel} alt="cancel-icon" />
            </div>
          </div>
          <div className="sb-seperator"></div>
          <div className="sb-secure-section-box">
            <div className="sb-toggle-box">
              <div className="sb-toggle-box-top">
                <p>Secure session</p>
                <Switch
                  password_status={password_status}
                  base_url={base_url}
                  render_status={render_status}
                  fetch_data={fetch_data}
                  socket={socket}
                />

                {window.location.protocol === 'http:' ? 
                !!password_status && <div className="sb-toggle-box-top-clipboard-http"> Share link: <input type="" value={`${base_url}/share?key=${key}`} /> </div> : 
                <div
                  className={`sb-toggle-box-top-clipboard-https ${
                    !!clipboard_select ? "clippy-toggle" : ""
                  } ${!!password_status ? "" : "extra-dim-opacity"}`}
                  style={{
                    cursor: !!password_status ? "pointer" : "not-allowed",
                  }}
                  onClick={copy_link}
                >
                  {!!clipboard_select ? (
                    "Copied!"
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="clippy-svg"
                      height="28"
                      width="16"
                      viewBox="0 0 384 512"
                    >
                      <path d="M280 64l40 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l40 0 9.6 0C121 27.5 153.3 0 192 0s71 27.5 78.4 64l9.6 0zM64 112c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-320c0-8.8-7.2-16-16-16l-16 0 0 24c0 13.3-10.7 24-24 24l-88 0-88 0c-13.3 0-24-10.7-24-24l0-24-16 0zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
                    </svg>
                  )}
                </div>}
                {/* <div
                  className={`sb-toggle-box-top-clipboard ${
                    !!clipboard_select ? "clippy-toggle" : ""
                  } ${!!password_status ? "" : "extra-dim-opacity"}`}
                  style={{
                    cursor: !!password_status ? "pointer" : "not-allowed",
                  }}
                  onClick={copy_link}
                >
                  {!!clipboard_select ? (
                    "Copied!"
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="clippy-svg"
                      height="28"
                      width="16"
                      viewBox="0 0 384 512"
                    >
                      <path d="M280 64l40 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l40 0 9.6 0C121 27.5 153.3 0 192 0s71 27.5 78.4 64l9.6 0zM64 112c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-320c0-8.8-7.2-16-16-16l-16 0 0 24c0 13.3-10.7 24-24 24l-88 0-88 0c-13.3 0-24-10.7-24-24l0-24-16 0zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
                    </svg>
                  )}
                </div> */}
              </div>
              <div className="sb-toggle-box-bottom">
                Secure session keeps your session private. Others can only
                access when you share the link.
              </div>
            </div>
          </div>
          <div className="sb-blender-version-dialogue">
            This app is running on {blender_version}
          </div>
        </div>
      </div>
    </>,
    document.getElementById("settings")
  );
};

const Switch = ({
  password_status,
  base_url,
  render_status,
  socket,
  fetch_data,
}) => {
  const set_secure = (e) => {
    if (password_status === false && render_status === false) {
      socket.disconnect();
      axios
        .post(`${base_url}/create_auth`, {}, { withCredentials: true })
        .then((res) => {
          if (res.status === 200) {
            socket.connect();
            fetch_data();
          }
        })
        .catch((err) => console.error(err));
    }
    if (password_status === true && render_status === false) {
      socket.disconnect();
      axios
        .post(`${base_url}/delete_auth`, {}, { withCredentials: true })
        .then((res) => {
          if (res.status === 200) {
            socket.connect();
            fetch_data();
          }
        })
        .catch((err) => console.error(err));
    }
  };
  return (
    <label
      className={`switch-container ${
        !!render_status ? "extra-dim-opacity" : ""
      }`}
      style={{ cursor: !!render_status ? "not-allowed" : "cursor" }}
    >
      <input
        type="checkbox"
        className="switch-input"
        checked={!!password_status}
        onChange={set_secure}
      />
      <div className="switch-track">
        <svg
          className="switch-svg switch-svg-unlocked" /* ... rest of SVG props */
          height={100}
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 100 100"
          width={100}
          x={0}
          xmlns="http://www.w3.org/2000/svg"
          y={0}
        >
          <path
            d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z"
            fillRule="evenodd"
          ></path>
        </svg>
        <svg
          className="switch-svg switch-svg-locked" /* ... rest of SVG props */
          height={100}
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 100 100"
          width={100}
          x={0}
          xmlns="http://www.w3.org/2000/svg"
          y={0}
        >
          <path
            className="svg-fill-primary"
            d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z"
          ></path>
        </svg>
      </div>
    </label>
  );
};
