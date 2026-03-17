import { io } from 'socket.io-client';

// In production set VITE_SERVER_URL; in dev, the Vite proxy handles /socket.io
const URL = import.meta.env.VITE_SERVER_URL || undefined;

const socket = io(URL, { autoConnect: false });

export default socket;
