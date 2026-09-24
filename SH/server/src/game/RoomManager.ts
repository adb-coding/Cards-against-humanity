import { GameRoom } from './GameRoom.js';
import { generateRoomCode } from '../utils/roomCode.js';

class RoomManager {
  private rooms = new Map<string, GameRoom>();

  createRoom(): GameRoom {
    const existingCodes = new Set(this.rooms.keys());
    const code = generateRoomCode(existingCodes);
    const room = new GameRoom(code);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  findRoomByPlayer(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(socketId)) return room;
    }
    return undefined;
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }
}

export const roomManager = new RoomManager();
