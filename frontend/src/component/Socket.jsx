import { io } from "socket.io-client";
import central_store from "./Store";

let socket = null;

export const initSocket = () => {
  const base_url = central_store((state) => state.base_url);

  if (!socket) {
    socket = io(base_url, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 100,
      reconnectionDelay: 1000,
      rememberUpgrade: true,
    });

    // When the page is about to unload, tell the server and fully disconnect.
    const handleBeforeUnload = () => {
      // Optional: emit a custom event if you want the server to distinguish
      // a "clean" client disconnect vs. a crash/timeout.
      socket.emit("client_disconnect");
      // Actually disconnect the socket so it won't try to reconnect
      socket.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // If you ever destroy/reinitialize socket in-app,
    // cleanup the listener too:
    socket.on("disconnect", () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    });
  }

  return socket;
};

// export default socket;
