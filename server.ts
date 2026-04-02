import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://arknights-monopoly.web.app", "https://arknights-monopoly.firebaseapp.com"] 
        : "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Firebase Admin
  const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'firebase-service-account.json');

  if (SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with service account from environment variable.');
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
      admin.initializeApp();
    }
  } else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with local service account file.');
  } else {
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials.');
  }
  const db = admin.firestore();
  const usersCollection = db.collection('users');

  // Store user data by email for persistent identification
  interface UserData {
    name: string;
    avatarId: string;
    level: number;
    exp: number;
    wins: number;
    losses: number;
    matches: number;
    socketId: string;
  }
  const users = new Map<string, UserData>();
  // Load existing users from Firestore
  async function loadUsers() {
    try {
      const snapshot = await usersCollection.get();
      snapshot.forEach(doc => {
        const email = doc.id;
        const userData = doc.data() as UserData;
        users.set(email, { ...userData, socketId: '' });
      });
      console.log(`Cloud Database loaded: ${users.size} Doctors identified.`);
    } catch (e) {
      console.error('Failed to load cloud database:', e);
      // Fallback to local if exists (for migration)
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([email, userData]: [string, any]) => {
          users.set(email, { ...userData, socketId: '' });
        });
        console.log(`Local fallback loaded: ${users.size} Doctors identified.`);
      }
    }
  }

  // Save user to Firestore
  async function saveUser(email: string, userData: UserData) {
    try {
      const { socketId, ...toSave } = userData;
      await usersCollection.doc(email).set(toSave);
    } catch (e) {
      console.error(`Failed to save user ${email} to cloud:`, e);
    }
  }

  await loadUsers();

  // Map socket IDs to emails for easy lookup on disconnect
  const socketToEmail = new Map<string, string>();

  // Store room data
  const rooms = new Map<string, {
    players: any[];
    expectedPlayerCount?: number;
    gameState: any;
    selectedOperators: string[];
    turnTimer?: NodeJS.Timeout;
    remainingTime: number;
    chatMessages: any[];
    status: 'LOBBY' | 'IN_PROGRESS';
    hostId: string;
    hostName?: string;
    hostEmail?: string;
  }>();

  // Track which room each socket is in
  const socketToRoom = new Map<string, string>();

  const queue: string[] = [];
  let matchmakingTimer: NodeJS.Timeout | null = null;
  let matchmakingCountdown = 20;

  const TURN_TIME_LIMIT = 45; // 45 seconds per turn

  function broadcastQueueUpdate() {
    queue.forEach((socketId, index) => {
      io.to(socketId).emit('waiting-in-queue', { 
        position: index + 1, 
        total: queue.length,
        countdown: matchmakingTimer ? matchmakingCountdown : null
      });
    });
  }

  function startTurnTimer(roomId: string, nextIndex?: number) {
    const room = rooms.get(roomId);
    if (!room) return;
 
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
    }
 
    // Mostima Skill: Opponents' turn timers are reduced by 5 seconds
    let timeLimit = TURN_TIME_LIMIT;
    if (room.gameState) {
      const currentPlayerIdx = nextIndex !== undefined ? nextIndex : room.gameState.currentPlayerIndex;
      const currentPlayer = room.gameState.players[currentPlayerIdx];
      const otherPlayers = room.gameState.players.filter((p: any) => p.id !== currentPlayer.id);
      const hasMostima = otherPlayers.some((p: any) => p.operator.name === 'Mostima');
      if (hasMostima) {
        timeLimit -= 5;
      }
    }
 
    room.remainingTime = timeLimit;
    io.to(roomId).emit('timer-update', { remainingTime: room.remainingTime, turnTimeLimit: timeLimit });

    room.turnTimer = setInterval(() => {
      room.remainingTime--;
      if (room.remainingTime <= 0) {
        clearInterval(room.turnTimer);
        io.to(roomId).emit('turn-timeout');
      } else {
        io.to(roomId).emit('timer-update', { remainingTime: room.remainingTime, turnTimeLimit: timeLimit });
      }
    }, 1000);
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('host-game', ({ roomId, hostName, hostEmail }) => {
      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);
      rooms.set(roomId, {
        players: [],
        gameState: null,
        selectedOperators: [],
        remainingTime: TURN_TIME_LIMIT,
        chatMessages: [],
        status: 'LOBBY',
        hostId: socket.id,
        hostName,
        hostEmail
      });
      socket.emit('joined-room', { 
        roomId, 
        status: 'LOBBY', 
        isHost: true,
        players: [],
        selectedOperators: []
      });
      console.log(`Room created: ${roomId} by ${socket.id}`);
    });

    socket.on('identify-user', async ({ email, name, avatarId }) => {
      if (!email || !name) {
        socket.emit('error', 'Identification failed: Email and Name are required.');
        return;
      }

      let userData = users.get(email);
      if (userData) {
        // If the email is already in use by ANOTHER active socket
        if (userData.socketId !== socket.id && io.sockets.sockets.get(userData.socketId)) {
          socket.emit('error', 'This email is already active in another session.');
          return;
        }
        
        // Update socket ID and existing fields
        userData.socketId = socket.id;
        userData.name = name;
        userData.avatarId = avatarId;
        socketToEmail.set(socket.id, email);
        
        await saveUser(email, userData);
        
        socket.emit('identified', { 
          email, 
          name: userData.name, 
          avatarId: userData.avatarId,
          level: userData.level,
          exp: userData.exp,
          wins: userData.wins,
          losses: userData.losses,
          matches: userData.matches
        });
      } else {
        // Create new user
        const newUser: UserData = {
          name,
          avatarId,
          level: 1,
          exp: 0,
          wins: 0,
          losses: 0,
          matches: 0,
          socketId: socket.id
        };
        users.set(email, newUser);
        socketToEmail.set(socket.id, email);
        await saveUser(email, newUser);
        socket.emit('identified', { email, ...newUser });
      }
      console.log(`User identified: ${name} (${email})`);
    });

    socket.on('queue-online', () => {
      if (queue.includes(socket.id)) return;
      
      queue.push(socket.id);
      console.log(`User ${socket.id} joined queue. Queue length: ${queue.length}`);
      
      broadcastQueueUpdate();

      // Start countdown if we have at least 2 players
      if (queue.length >= 2 && !matchmakingTimer) {
        matchmakingCountdown = 20;
        matchmakingTimer = setInterval(() => {
          matchmakingCountdown--;
          
          if (matchmakingCountdown <= 0 || queue.length >= 4) {
            clearInterval(matchmakingTimer!);
            matchmakingTimer = null;
            
            // Start the match with current queue (up to 4)
            const matchedPlayers = queue.splice(0, 4);
            const roomId = `MATCH_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            rooms.set(roomId, {
              players: [],
              expectedPlayerCount: matchedPlayers.length,
              gameState: null,
              selectedOperators: [],
              remainingTime: TURN_TIME_LIMIT,
              chatMessages: [],
              status: 'LOBBY',
              hostId: matchedPlayers[0] // First person in queue is the internal host
            });

            matchedPlayers.forEach((pId, idx) => {
              const s = io.sockets.sockets.get(pId);
              if (s) {
                s.join(roomId);
                socketToRoom.set(pId, roomId);
                s.emit('joined-room', { 
                  roomId, 
                  status: 'LOBBY', 
                  isHost: idx === 0,
                  players: [],
                  selectedOperators: [] 
                });
              }
            });
            
            console.log(`Matchmaking complete: Room ${roomId} created for ${matchedPlayers.length} players.`);
          }
          
          broadcastQueueUpdate();
        }, 1000);
      }
    });

    socket.on('leave-queue', () => {
      const idx = queue.indexOf(socket.id);
      if (idx !== -1) {
        queue.splice(idx, 1);
        console.log(`User ${socket.id} left queue. Queue length: ${queue.length}`);
        
        if (queue.length < 2 && matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        
        broadcastQueueUpdate();
      }
    });

    socket.on('join-game', ({ roomId, playerName, playerEmail }) => {
      const room = rooms.get(roomId);
      if (room) {
        if (room.players.length >= 4 && !room.players.find(p => p.email === playerEmail)) {
          socket.emit('error', 'Room is full (max 4 players)');
          return;
        }

        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        
        const isRejoiningHost = room.hostEmail && room.hostEmail === playerEmail;
        if (isRejoiningHost) {
          room.hostId = socket.id;
        }

        socket.emit('joined-room', { 
          roomId, 
          status: room.status, 
          isHost: isRejoiningHost,
          players: room.players,
          selectedOperators: room.selectedOperators,
          gameState: room.gameState
        });

        // Send existing chat messages to the new player
        socket.emit('chat-history', room.chatMessages);
        
        // Notify others in the room
        io.to(roomId).emit('player-joined', { 
          playerId: socket.id, 
          playerCount: room.players.length + (room.status === 'LOBBY' ? 1 : 0),
          status: room.status
        });
        
        console.log(`User ${socket.id} joined room ${roomId} (Status: ${room.status})`);
      } else {
        socket.emit('error', 'Room not found. Please check the ID.');
      }
    });

    const broadcastQueueUpdate = () => {
      queue.forEach((pid, idx) => {
        const s = io.sockets.sockets.get(pid);
        if (s) {
          s.emit('waiting-in-queue', { 
            position: idx + 1, 
            total: queue.length,
            countdown: matchmakingTimer ? matchmakingCountdown : null
          });
        }
      });
    };

    const startMatchmaking = () => {
      if (queue.length < 2) {
        if (matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        return;
      }
      
      const playersToJoin = queue.splice(0, Math.min(queue.length, 4));
      const roomId = `MATCH_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      rooms.set(roomId, {
        players: [],
        expectedPlayerCount: playersToJoin.length,
        gameState: null,
        selectedOperators: [],
        remainingTime: TURN_TIME_LIMIT,
        chatMessages: [],
        status: 'LOBBY',
        hostId: playersToJoin[0]
      });

      playersToJoin.forEach((pid, idx) => {
        const s = io.sockets.sockets.get(pid);
        if (s) {
          s.join(roomId);
          socketToRoom.set(pid, roomId);
          s.emit('joined-room', { 
            roomId, 
            status: 'LOBBY', 
            isHost: idx === 0,
            gameMode: 'MULTIPLAYER'
          });
          s.emit('chat-history', []);
        }
      });

      if (matchmakingTimer) {
        clearInterval(matchmakingTimer);
        matchmakingTimer = null;
      }
      
      console.log(`Match deployed! Room ${roomId} created for ${playersToJoin.length} players.`);
      broadcastQueueUpdate();
    };

    socket.on('queue-online', () => {
      const existingIdx = queue.indexOf(socket.id);
      if (existingIdx !== -1) return; // Already in queue
      
      queue.push(socket.id);
      console.log(`User ${socket.id} joined queue. Current line: ${queue.length}`);
      
      if (queue.length >= 4) {
        startMatchmaking();
      } else if (queue.length >= 2 && !matchmakingTimer) {
        matchmakingCountdown = 20;
        matchmakingTimer = setInterval(() => {
          matchmakingCountdown--;
          broadcastQueueUpdate();
          if (matchmakingCountdown <= 0) {
            startMatchmaking();
          }
        }, 1000);
      }
      
      broadcastQueueUpdate();
    });

    socket.on('leave-queue', () => {
      const qIdx = queue.indexOf(socket.id);
      if (qIdx !== -1) {
        queue.splice(qIdx, 1);
        console.log(`User ${socket.id} left queue. Queue length: ${queue.length}`);
        
        if (queue.length < 2 && matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        
        broadcastQueueUpdate();
      }
    });

    socket.on('select-operator', ({ roomId, operator, player }) => {
      const room = rooms.get(roomId);
      if (room) {
        const opName = typeof operator === 'string' ? operator : operator.name;
        
        // Check if operator is already taken by someone ELSE
        const existingSelection = room.players.find(p => {
          const pOpName = typeof p.operator === 'string' ? p.operator : p.operator.name;
          return pOpName === opName && p.id !== socket.id;
        });

        if (existingSelection) {
          socket.emit('error', 'Operator already selected by another player');
          return;
        }

        // Update or add player
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          // Remove old operator from selected list if changing
          const oldOp = typeof room.players[playerIndex].operator === 'string' 
            ? room.players[playerIndex].operator 
            : room.players[playerIndex].operator.name;
          room.selectedOperators = room.selectedOperators.filter(o => o !== oldOp);
          room.players[playerIndex] = { ...player, id: socket.id };
        } else {
          room.players.push({ ...player, id: socket.id });
        }

        if (!room.selectedOperators.includes(opName)) {
          room.selectedOperators.push(opName);
        }

        io.to(roomId).emit('operator-selected', { 
          operator: opName, 
          playerId: socket.id,
          players: room.players,
          selectedOperators: room.selectedOperators
        });

        // Auto-start if all expected players have picked
        if (room.status === 'LOBBY' && room.expectedPlayerCount && room.players.length === room.expectedPlayerCount) {
          console.log(`Auto-starting match in room ${roomId} - All ${room.expectedPlayerCount} operators ready.`);
          room.status = 'IN_PROGRESS';
          io.to(roomId).emit('mission-start');
          startTurnTimer(roomId);
        }
      }
    });

    socket.on('start-game', (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        if (room.hostId !== socket.id) {
          socket.emit('error', 'Only the Sector Commander (Host) can initiate the mission.');
          return;
        }
        if (room.players.length < 4) {
          socket.emit('error', 'Incomplete squad. 4 operators required for this mission.');
          return;
        }
        room.status = 'IN_PROGRESS';
        io.to(roomId).emit('mission-start');
        startTurnTimer(roomId);
      }
    });

    socket.on('next-turn', ({ roomId, nextIndex }) => {
      const room = rooms.get(roomId);
      if (room) {
        startTurnTimer(roomId, nextIndex);
        io.to(roomId).emit('turn-changed', { nextIndex });
      }
    });

    socket.on('send-chat-message', ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (room) {
        const chatMsg = {
          ...message,
          id: `msg_${Date.now()}_${socket.id}`,
          timestamp: Date.now()
        };
        room.chatMessages.push(chatMsg);
        // Limit chat history
        if (room.chatMessages.length > 50) room.chatMessages.shift();
        io.to(roomId).emit('new-chat-message', chatMsg);
      }
    });

    socket.on('sync-game-state', ({ roomId, gameState }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.gameState = gameState;
        // Broadcast to everyone EXCEPT the sender to avoid loops
        socket.to(roomId).emit('game-state-updated', gameState);
      }
    });

    socket.on('sync-player-id', ({ roomId, playerName, playerEmail }) => {
      const room = rooms.get(roomId);
      if (room) {
        // Prioritize email if available, fallback to name only as a last resort
        const player = room.players.find(p => (playerEmail && p.email === playerEmail) || (!playerEmail && p.name === playerName));
        if (player) {
          const oldId = player.id;
          player.id = socket.id;
          
          // Update gameState if it exists
          if (room.gameState && room.gameState.players) {
            const gsPlayer = room.gameState.players.find((p: any) => (playerEmail && p.email === playerEmail) || (!playerEmail && p.name === playerName));
            if (gsPlayer) gsPlayer.id = socket.id;
          }

          io.to(roomId).emit('player-id-synced', { oldId, newId: socket.id, playerName: player.name });
          console.log(`Player ${player.name} (${playerEmail || 'No Email'}) reclaimed by socket ${socket.id}`);
        }
      }
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      socketToRoom.delete(socket.id);
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          room.selectedOperators = room.selectedOperators.filter(o => o !== player.operator);
          room.players = room.players.filter(p => p.id !== socket.id);
        }

        if (room.players.length === 0) {
          if (room.turnTimer) clearInterval(room.turnTimer);
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('player-left', { 
            playerId: socket.id, 
            players: room.players,
            selectedOperators: room.selectedOperators
          });
        }
      }
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove from queue if present
      const qIdx = queue.indexOf(socket.id);
      if (qIdx !== -1) {
        queue.splice(qIdx, 1);
        console.log(`User ${socket.id} (queued) disconnected. New queue length: ${queue.length}`);
        
        if (queue.length < 2 && matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        
        broadcastQueueUpdate();
      }

      // Handle room cleanup
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          // Remove player from room
          const player = room.players.find(p => p.id === socket.id);
          if (player) {
            room.selectedOperators = room.selectedOperators.filter(o => o !== player.operator);
            room.players = room.players.filter(p => p.id !== socket.id);
          }

          if (room.players.length === 0) {
            if (room.turnTimer) clearInterval(room.turnTimer);
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted (all players left)`);
          } else {
            io.to(roomId).emit('player-left', { 
              playerId: socket.id, 
              players: room.players,
              selectedOperators: room.selectedOperators
            });
          }
        }
        socketToRoom.delete(socket.id);
      }
      socketToEmail.delete(socket.id);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
