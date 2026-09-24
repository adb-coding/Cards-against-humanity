import { io } from 'socket.io-client';

// In production set VITE_SERVER_URL; in dev, the Vite proxy handles /cah/socket.io
const URL = import.meta.env.VITE_SERVER_URL || undefined;

const socket = io(URL, { path: '/cah/socket.io', autoConnect: false });

export default socket;
