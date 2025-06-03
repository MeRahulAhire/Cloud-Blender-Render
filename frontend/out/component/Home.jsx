import "../style/home.css";
import Navbar from "./navbar";
import Imagepreview from "./Imagepreview";
import Controlpanel from "./Controlpanel";

export default function Home() {
  return (
    <>
      <div className="home-container">
        <Navbar />
        <div className="home-container-display">
          <div className="home-container-display-ip">
            <Imagepreview />
          </div>
          <div className="home-container-display-control">
            <Controlpanel/>
          </div>
        </div>
      </div>
    </>
  );
}
