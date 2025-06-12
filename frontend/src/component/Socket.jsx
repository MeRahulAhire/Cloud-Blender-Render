
import { io } from 'socket.io-client';
import central_store from './Store';

let socket = null;

export const initSocket = () => {
  const base_url = central_store.getState().base_url;

  if (!socket) {
    socket = io(base_url, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 100,
      reconnectionDelay: 1000
    });
  }

  return socket;
};

export default socket;
