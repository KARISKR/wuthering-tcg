/**
 * Wuthering Waves: Battle TCG - 실시간 웹 멀티플레이 서버 예시 (Socket.io)
 * 
 * 2단계: 다른 사람과 온라인 대전을 진행할 때 사용합니다.
 * 실행 방법:
 * 1. npm install socket.io express cors
 * 2. node server/socketServer.js
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[연결됨] 플레이어 접속: ${socket.id}`);

  // 방 입장 / 생성
  socket.on('join_room', ({ roomId, playerName }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        players: [],
        gameState: null,
      };
      rooms.set(roomId, room);
    }

    if (room.players.length >= 2) {
      socket.emit('room_full');
      return;
    }

    const playerIndex = room.players.length;
    room.players.push({ socketId: socket.id, name: playerName, index: playerIndex });
    socket.join(roomId);

    console.log(`[방 입장] ${playerName} (P${playerIndex}) -> 방 [${roomId}]`);
    socket.emit('joined', { roomId, playerIndex });

    // 2명이 모이면 게임 시작 신호 전송
    if (room.players.length === 2) {
      io.to(roomId).emit('game_ready', {
        players: room.players,
      });
    }
  });

  // 게임 액션 동기화 (클라이언트 간 게임 상태 브로드캐스트)
  socket.on('game_action', ({ roomId, action, state }) => {
    // 상대방에게 액션 및 업데이트된 상태 전달
    socket.to(roomId).emit('sync_state', { action, state });
  });

  // 접속 해제
  socket.on('disconnect', () => {
    console.log(`[연결 해제] ${socket.id}`);
    for (const [roomId, room] of rooms.entries()) {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        socket.to(roomId).emit('player_disconnected');
        if (room.players.length === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`⚔️ 명조 TCG 멀티플레이 웹소켓 서버 실행 중 (포트 ${PORT})`);
  console.log(`===============================================`);
});
