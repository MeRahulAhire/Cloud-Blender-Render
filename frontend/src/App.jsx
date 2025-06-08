// import Home from "./component/Home";
// import "./App.css";
// import central_store from "./component/Store";
// import { useEffect } from "react";
// export default function App() {
//   const {fetchData} = central_store();

//   useEffect(() => {
//     fetchData();
//   }, [])
//   return (
//     <>
//       <div className="app-global-window">
//         <div className="app-max-width">
//           <Home />
//         </div>
//       </div>
//     </>
//   );
// }

import Home from "./component/Home";
import "./App.css";
import central_store from "./component/Store";
import { useEffect } from "react";

export default function App() {
  const fetch_data = central_store((state) => state.fetch_data);
  const has_fetched = central_store((state) => state.has_fetched);

  useEffect(() => {
    fetch_data();
  }, []);

  if (!has_fetched) {
    return (
      <div className="app-loading-screen">
        {/* Optional: Add a spinner here */}
        <p>Loading...</p>
      </div>
    );
  }

  if (!!has_fetched) {
    return (
      <div className="app-global-window">
        <div className="app-max-width">
          <Home />
        </div>
      </div>
    );
  }
}
