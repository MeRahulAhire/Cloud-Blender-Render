import "../style/navbar.css"
import gear from "../assets/icons/gear.svg"
import site_logo from "../assets/icons/cloud-blender-render-logo.svg"

export default function Navbar() {
  return (
    <>
    <div className="navbar-container">
      <div className="navbar-box">
        <div className="navbar-content">
          <div className="navbar-content-heading">
            {/* <div className="image">
            <img src={site_logo} alt="" />

            </div> */}
            <div className="title">
            Cloud Blender Render

            </div>
          </div>
          <div className="navbar-gearbox">
            <img src={gear} alt="Setting Icon"/>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
