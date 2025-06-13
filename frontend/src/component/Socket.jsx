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
  }

  return socket;
};

export default socket;
