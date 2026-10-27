import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function roomsDevPlugin() {
  const rooms = new Map<string, any>();
  return {
    name: 'rooms-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/rooms', (req: any, res: any) => {
        const now = Date.now();
        for (const [code, r] of rooms.entries()) {
          if (now - r.updatedAt > 30000) rooms.delete(code);
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ rooms: Array.from(rooms.values()) }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const { action, roomCode, hostName, hostLeader, hostLeaderArt, deckName } = data;
              const upperCode = (roomCode || '').toUpperCase().trim();
              if (action === 'create') {
                rooms.set(upperCode, {
                  roomCode: upperCode,
                  hostName: hostName || '방랑자',
                  hostLeader,
                  hostLeaderArt,
                  deckName,
                  status: 'WAITING',
                  playerCount: 1,
                  createdAt: now,
                  updatedAt: now,
                });
              } else if (action === 'heartbeat') {
                const r = rooms.get(upperCode);
                if (r) {
                  r.updatedAt = now;
                } else if (upperCode) {
                  rooms.set(upperCode, {
                    roomCode: upperCode,
                    hostName: hostName || '방랑자',
                    hostLeader,
                    hostLeaderArt,
                    deckName,
                    status: 'WAITING',
                    playerCount: 1,
                    createdAt: now,
                    updatedAt: now,
                  });
                }
              } else if (action === 'start') {
                const r = rooms.get(upperCode);
                if (r) { r.status = 'PLAYING'; r.playerCount = 2; r.updatedAt = now; }
              } else if (action === 'close') {
                rooms.delete(upperCode);
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, rooms: Array.from(rooms.values()) }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    roomsDevPlugin(),
  ],
  server: {
    host: true, // 외부/다른 기기(동일 공유기·와이파이) 접속 허용 (0.0.0.0)
    proxy: {
      '/api/sldark': {
        target: 'https://mc.sldark.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sldark/, '/api'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('canvas-confetti')) {
              return 'vendor-ui';
            }
            return 'vendor-libs';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
