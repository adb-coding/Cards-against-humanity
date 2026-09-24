import { Room } from './Room.js';

const rooms = new Map(); // roomCode -> Room

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export const RoomManager = {
  createRoom(hostId, hostName, options) {
    const code = generateCode();
    const room = new Room(code, hostId, hostName, options);
    rooms.set(code, room);
    return room;
  },

  getRoom(code) {
    return rooms.get(code.toUpperCase()) || null;
  },

  deleteRoom(code) {
    rooms.delete(code.toUpperCase());
  },

  /** Find which room a socket is in */
  findRoomByPlayer(playerId) {
    for (const room of rooms.values()) {
      if (room.players.has(playerId)) return room;
    }
    return null;
  },
};
