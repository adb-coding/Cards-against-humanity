const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O to avoid confusion

export function generateRoomCode(existingCodes: Set<string>): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  } while (existingCodes.has(code));
  return code;
}
