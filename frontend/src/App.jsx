
import Home from "./component/Home";
import "./App.css";
import central_store from "./component/Store";
import { useEffect } from "react";
import preloader from "./component/Preloader";
import Preloader from "./component/Preloader";

export default function App() {
  const fetch_data = central_store((state) => state.fetch_data);
  const has_fetched = central_store((state) => state.has_fetched);
  const set_rendered_image_list = central_store(state => state.set_rendered_image_list);

  useEffect(() => {
    fetch_data();
    set_rendered_image_list();
  }, []);

  if (has_fetched === false) {
    return (
      <Preloader/>
    );
  }

  if (has_fetched === true) {
    return (
      <div className="app-global-window">
        <div className="app-max-width">
          <Home />
          {/* <Preloader/> */}
        </div>
      </div>
    );
  }
}
