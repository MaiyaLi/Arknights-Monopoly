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
      origin: (origin, callback) => {
        // Broaden CORS for deployment flexibility
        if (!origin || (origin.includes('.web.app') || origin.includes('.firebaseapp.com') || origin.includes('localhost') || origin.includes('render.com'))) {
          callback(null, true);
        } else {
          // Fallback to allow all during transition
          callback(null, true);
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Health check route for Render/monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'active', timestamp: new Date().toISOString() });
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
    try {
      // Check if we are in a GCP environment or have default credentials
      admin.initializeApp();
      console.log('Firebase Admin initialized with default credentials.');
    } catch (e) {
      console.error('Firebase Admin failed to initialize with default credentials. Running in memory-only mode.');
    }
  }
  const db = admin.apps.length > 0 ? admin.firestore() : null;
  const usersCollection = db ? db.collection('users') : null;

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
      if (!usersCollection) throw new Error('Cloud database not configured.');
      const snapshot = await usersCollection.get();
      snapshot.forEach(doc => {
        const email = doc.id;
        const userData = doc.data() as UserData;
        users.set(email, { ...userData, socketId: '' });
      });
      console.log(`Cloud Database loaded: ${users.size} Doctors identified.`);
    } catch (e) {
      console.error('Failed to load cloud database:', e);
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([email, userData]: [string, any]) => {
          users.set(email, { ...userData, socketId: '' });
        });
      }
    }
  }

  // Save user to Firestore
  async function saveUser(email: string, userData: UserData) {
    if (usersCollection) {
      try {
        const { socketId, ...toSave } = userData;
        await usersCollection.doc(email).set(toSave);
      } catch (e) {
        console.error(`Failed to save user ${email} to cloud:`, e);
      }
    }

    // Local fallback
    try {
      const DB_PATH = path.join(process.cwd(), 'database.json');
      let currentDB = {};
      if (fs.existsSync(DB_PATH)) currentDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      const { socketId, ...toSave } = userData;
      (currentDB as any)[email] = toSave;
      fs.writeFileSync(DB_PATH, JSON.stringify(currentDB, null, 2));
    } catch (e) { console.error(e); }
  }

  await loadUsers();

  interface Room {
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
    missionTimer?: NodeJS.Timeout;
    missionCountdown?: number;
  }

  const socketToEmail = new Map<string, string>();
  const rooms = new Map<string, Room>();

  const socketToRoom = new Map<string, string>();
  const queue: string[] = [];
  let matchmakingTimer: NodeJS.Timeout | null = null;
  let matchmakingCountdown = 10;

  const TURN_TIME_LIMIT = 45;
  const MISSION_START_COUNTDOWN = 5;
  
  // --- Firestore Helpers ---
  async function saveLobbyToFirestore(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || !db) return;
    
    try {
      await db.collection('lobbies').doc(roomId).set({
        roomId,
        players: room.players,
        status: room.status,
        selectedOperators: room.selectedOperators,
        hostId: room.hostId,
        hostName: room.hostName,
        hostEmail: room.hostEmail,
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(`[Firestore Sync] Failed to save lobby ${roomId}:`, e);
    }
  }

  async function deleteLobbyFromFirestore(roomId: string) {
    if (!db) return;
    try {
      await db.collection('lobbies').doc(roomId).delete();
      console.log(`[Firestore Sync] Deleted lobby ${roomId}.`);
    } catch (e) {
      console.error(`[Firestore Sync] Failed to delete lobby ${roomId}:`, e);
    }
  }

  // --- Helper Functions ---

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
    if (room.turnTimer) clearInterval(room.turnTimer);

    let timeLimit = TURN_TIME_LIMIT;
    if (room.gameState) {
      const currentPlayerIdx = nextIndex !== undefined ? nextIndex : room.gameState.currentPlayerIndex;
      const currentPlayer = room.gameState.players[currentPlayerIdx];
      const otherPlayers = room.gameState.players.filter((p: any) => p.id !== currentPlayer.id);
      if (otherPlayers.some((p: any) => p.operator.name === 'Mostima')) {
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

  function startMatchmaking() {
    // Only start if we have exactly 4 players for a full squad
    if (queue.length < 4) return;
    
    const playersToJoin = queue.splice(0, 4);
    const roomId = `MATCH_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const newRoom = {
      players: [] as any[],
      expectedPlayerCount: playersToJoin.length,
      gameState: null,
      selectedOperators: [],
      remainingTime: TURN_TIME_LIMIT,
      chatMessages: [],
      status: 'LOBBY' as const,
      hostId: playersToJoin[0]
    };
    
    rooms.set(roomId, newRoom);

    playersToJoin.forEach((pid, idx) => {
      const s = io.sockets.sockets.get(pid);
      if (s) {
        // Find existing user data if possible
        const email = socketToEmail.get(pid);
        const userData = email ? users.get(email) : null;
        
        const p = {
          id: pid,
          name: userData?.name || 'Doctor',
          email: email || '',
          isHost: idx === 0,
          operator: null,
          status: 'WAITING'
        };
        newRoom.players.push(p);

        s.join(roomId);
        socketToRoom.set(pid, roomId);
      }
    });

    // EMIT TO THE WHOLE ROOM ONCE EVERYONE IS ADDED
    playersToJoin.forEach((pid, idx) => {
      const s = io.sockets.sockets.get(pid);
      if (s) {
        s.emit('joined-room', { 
          roomId, 
          status: 'LOBBY', 
          isHost: idx === 0, // First player in queue is the host
          players: newRoom.players,
          selectedOperators: []
        });
        s.emit('chat-history', []);
      }
    });

    console.log(`Matchmaking room created: ${roomId} with ${playersToJoin.length} players`);

    if (matchmakingTimer) {
      clearInterval(matchmakingTimer);
      matchmakingTimer = null;
    }
    
    console.log(`Matchmaking complete: Created room ${roomId} for ${playersToJoin.length} players.`);
    broadcastQueueUpdate();
  }

  // --- Socket Logic ---

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('host-game', async ({ roomId, hostName, hostEmail, avatarId }) => {
      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);
      
      const hostPlayer = {
        id: socket.id,
        name: hostName,
        email: hostEmail,
        avatarId: avatarId || 'amiya',
        isHost: true,
        operator: null, // Host must still pick an operator
        status: 'WAITING'
      };

      rooms.set(roomId, {
        players: [hostPlayer],
        gameState: null,
        selectedOperators: [],
        remainingTime: TURN_TIME_LIMIT,
        chatMessages: [],
        status: 'LOBBY',
        hostId: socket.id,
        hostName,
        hostEmail // Store host email for re-connection
      });

      await saveLobbyToFirestore(roomId);

      socket.emit('joined-room', { 
        roomId, 
        status: 'LOBBY', 
        isHost: true,
        players: [hostPlayer],
        selectedOperators: []
      });
      console.log(`Manual room created: ${roomId} by ${socket.id} (Stored in Firestore)`);
    });

     socket.on('identify-user', async ({ email, name, avatarId }) => {
      if (!email || !name) {
        socket.emit('error', 'Identification failed: Email and Name are required.');
        return;
      }

      let userData = users.get(email);
      
      // If not in memory, try to fetch from Firestore
      if (!userData && usersCollection) {
        try {
          const cloudDoc = await usersCollection.doc(email).get();
          if (cloudDoc.exists) {
            userData = cloudDoc.data() as UserData;
            console.log(`[Sector Recovery] Recovered Doctor ${email} from cloud.`);
            users.set(email, { ...userData, socketId: socket.id });
          }
        } catch (e) {
          console.error(`[Sector Recovery] Failed to scan cloud for ${email}:`, e);
        }
      }

      if (userData) {
        if (userData.socketId && userData.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(userData.socketId);
          if (oldSocket) {
            console.log(`[Session Displacement] Kicking old session for ${email} (${userData.socketId})`);
            oldSocket.emit('session-replaced');
            oldSocket.disconnect(true);
          }
        }
        userData.socketId = socket.id;
        userData.name = name;
        userData.avatarId = avatarId;
        socketToEmail.set(socket.id, email);
        await saveUser(email, userData);
        socket.emit('identified', { email, ...userData });
      } else {
        const newUser: UserData = {
          name, avatarId, level: 1, exp: 0, wins: 0, losses: 0, matches: 0, socketId: socket.id
        };
        users.set(email, newUser);
        socketToEmail.set(socket.id, email);
        await saveUser(email, newUser);
        socket.emit('identified', { email, ...newUser });
      }
      console.log(`User identified: ${name} (${email})`);
    });

    socket.on('join-game', async ({ roomId: rawRoomId, playerName, playerEmail, avatarId }) => {
      const roomId = (rawRoomId || '').toString().trim().toUpperCase();
      let room = rooms.get(roomId);
      
      // If room is missing from memory, attempt to re-hydrate from Firestore
      if (!room && db) {
        console.log(`[Sector Recovery] Room ${roomId} missing from memory, scanning Firestore...`);
        try {
          const doc = await db.collection('lobbies').doc(roomId).get();
          if (doc.exists) {
            const data = doc.data() as any;
            room = {
              players: data.players || [],
              gameState: null,
              selectedOperators: data.selectedOperators || [],
              remainingTime: TURN_TIME_LIMIT,
              chatMessages: [],
              status: data.status || 'LOBBY',
              hostId: data.hostId,
              hostName: data.hostName,
              hostEmail: data.hostEmail
            };
            rooms.set(roomId, room);
            console.log(`[Sector Recovery] Room ${roomId} stabilized from secure database.`);
          }
        } catch (e) {
          console.error(`[Sector Recovery] Failed to scan sector ${roomId}:`, e);
        }
      }

      if (room) {
        if (room.players.length >= 4 && !room.players.find(p => p.email === playerEmail)) {
          socket.emit('error', 'Room is full (max 4 players)');
          return;
        }
        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        
        const isRejoiningHost = room.hostEmail && room.hostEmail === playerEmail;
        if (isRejoiningHost) room.hostId = socket.id;

        // 1. Update LOBBY players list
        const existingPlayerIndex = room.players.findIndex(p => p.email === playerEmail || p.id === socket.id);
        if (existingPlayerIndex !== -1) {
          room.players[existingPlayerIndex].id = socket.id;
          room.players[existingPlayerIndex].status = 'RECONNECTED';
        } else if (room.players.length < 4) {
          const user = playerEmail ? users.get(playerEmail) : null;
          room.players.push({
            id: socket.id,
            name: playerName,
            email: playerEmail,
            avatarId: avatarId || user?.avatarId || 'amiya',
            isHost: isRejoiningHost,
            operator: null,
            status: 'WAITING'
          });
        }

        // 2. CRITICAL: Global ID Migration for Active Game State
        if (room.gameState && room.gameState.players) {
          const statePlayer = room.gameState.players.find(p => p.email === playerEmail);
          if (statePlayer) {
             const oldId = statePlayer.id;
             const newId = socket.id;
             
             // Update player object
             statePlayer.id = newId;
             
             // Update tile ownership globally
             if (room.gameState.tiles) {
                room.gameState.tiles.forEach(t => {
                   if (t.ownerId === oldId) t.ownerId = newId;
                });
             }
             
             // Update active auctions
             if (room.gameState.activeAuction) {
                const auction = room.gameState.activeAuction;
                if (auction.highestBidderId === oldId) auction.highestBidderId = newId;
                if (auction.bidderId === oldId) auction.bidderId = newId;
                if (auction.highBidderId === oldId) auction.highBidderId = newId;
                if (auction.biddingPlayerIds) {
                   auction.biddingPlayerIds = auction.biddingPlayerIds.map(id => id === oldId ? newId : id);
                }
             }
             
             console.log(`[Deep Sector Link] Migrated all tactical data for ${playerName}: ${oldId} -> ${newId}`);
             // Broadcast updated state to everyone so their identifier maps stay valid
             io.to(roomId).emit('game-state-updated', room.gameState);
          }
        }

        // Update Firestore with the new player list
        await saveLobbyToFirestore(roomId);

        socket.emit('joined-room', { 
          roomId, 
          status: room.status, 
          isHost: isRejoiningHost,
          players: room.players,
          selectedOperators: room.selectedOperators,
          gameState: room.gameState
        });
        socket.emit('chat-history', room.chatMessages);
        
        io.to(roomId).emit('player-joined', { 
          playerId: socket.id, 
          playerName,
          playerCount: room.players.length,
          status: room.status,
          players: room.players,
          selectedOperators: room.selectedOperators
        });
        console.log(`User ${socket.id} joined room ${roomId}`);
      } else {
        socket.emit('error', 'Room not found. Please check the ID.');
      }
    });

    socket.on('queue-online', () => {
      if (queue.includes(socket.id)) return;
      queue.push(socket.id);
      console.log(`User ${socket.id} queued. Total: ${queue.length}`);
      
      // Start countdown only if there are at least 2 humans
      // Only start once we have a full squad of 4
      if (queue.length >= 4) {
        startMatchmaking();
      }
      broadcastQueueUpdate();
      broadcastQueueUpdate();
    });

    socket.on('leave-queue', () => {
      const idx = queue.indexOf(socket.id);
      if (idx !== -1) {
        queue.splice(idx, 1);
        if (queue.length < 2 && matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        broadcastQueueUpdate();
      }
    });

    socket.on('select-operator', async ({ roomId, operator, player }) => {
      const room = rooms.get(roomId);
      if (room) {
        const opName = typeof operator === 'string' ? operator : operator?.name;
        if (!opName) return; // Ignore invalid selections

        const alreadyTaken = room.players.find(p => {
          const pOpName = typeof p.operator === 'string' ? p.operator : p.operator?.name;
          return pOpName === opName && p.id !== socket.id;
        });
        
        if (alreadyTaken) {
          socket.emit('error', 'Operator already selected by another player');
          return;
        }

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          // IMPORTANT: Merge with existing server-side player data to preserve fields like isHost, avatarId, etc.
          room.players[playerIndex] = { 
            ...room.players[playerIndex], 
            ...player, 
            id: socket.id,
            status: 'READY' 
          };
        } else {
          room.players.push({ ...player, id: socket.id, status: 'READY' });
        }
        
        // Regenerate selectedOperators exactly from current player list
        room.selectedOperators = room.players
          .map(p => typeof p.operator === 'string' ? p.operator : p.operator?.name)
          .filter(Boolean);

        io.to(roomId).emit('operator-selected', { 
          operator: opName, playerId: socket.id, players: room.players, selectedOperators: room.selectedOperators
        });

        // Sync to Firestore
        await saveLobbyToFirestore(roomId);

        // Automatic start for matchmaking rooms when all expected players have selected
        // Or for manual rooms when everyone is ready
        const allReady = room.players.length >= 2 && room.players.every(p => p.operator !== null);
        
        if (allReady && !room.missionTimer) {
          room.missionCountdown = MISSION_START_COUNTDOWN;
          io.to(roomId).emit('mission-countdown', { countdown: room.missionCountdown });

          room.missionTimer = setInterval(() => {
            if (room.missionCountdown! > 0) {
              room.missionCountdown!--;
              io.to(roomId).emit('mission-countdown', { countdown: room.missionCountdown });
            } else {
              if (room.missionTimer) clearInterval(room.missionTimer);
              room.missionTimer = undefined;
              room.status = 'IN_PROGRESS';
              io.to(roomId).emit('mission-start');
              startTurnTimer(roomId);
              saveLobbyToFirestore(roomId).catch(e => console.error("Firestore Error on game start:", e));
            }
          }, 1000);
        } else if (!allReady && room.missionTimer) {
          // If someone un-selects, cancel countdown
          clearInterval(room.missionTimer);
          room.missionTimer = undefined;
          room.missionCountdown = undefined;
          io.to(roomId).emit('mission-countdown', { countdown: null });
        }
      }
    });

    socket.on('start-game', async (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        if (room.players.length < 2) { 
          socket.emit('error', 'At least 2 operators required for this mission.');
          return;
        }
        
        const allReady = room.players.every(p => p.operator !== null);
        if (!allReady) {
          socket.emit('error', 'Operational synchronization in progress... Wait for all Doctors to select an operator.');
          return;
        }

        // Host can bypass countdown if they want
        if (room.missionTimer) clearInterval(room.missionTimer);
        room.missionTimer = undefined;

        room.status = 'IN_PROGRESS';
        await saveLobbyToFirestore(roomId); // Sync final lobby status before starting
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
        const chatMsg = { ...message, id: `msg_${Date.now()}_${socket.id}`, timestamp: Date.now() };
        room.chatMessages.push(chatMsg);
        if (room.chatMessages.length > 50) room.chatMessages.shift();
        io.to(roomId).emit('new-chat-message', chatMsg);
      }
    });

    socket.on('sync-game-state', ({ roomId, gameState }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.gameState = gameState;
        socket.to(roomId).emit('game-state-updated', gameState);
      }
    });

    socket.on('sync-player-id', ({ roomId, playerName, playerEmail }) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find(p => (playerEmail && p.email === playerEmail) || (!playerEmail && p.name === playerName));
        if (player) {
          const oldId = player.id;
          player.id = socket.id;
          
          // Force-update the player ID in the gameState to prevent stale references
          if (room.gameState && room.gameState.players) {
            const gsPlayer = room.gameState.players.find((p: any) => 
              (playerEmail && p.email === playerEmail) || 
              (!playerEmail && p.name === playerName) ||
              (p.id === oldId)
            );
            if (gsPlayer) {
              gsPlayer.id = socket.id;
              console.log(`[Sector Sync] Updated gameState ID for ${playerName}: ${oldId} -> ${socket.id}`);
            }
          }
          
          socket.emit('id-synced', { newId: socket.id });
          io.to(roomId).emit('player-synced', { playerName, newId: socket.id });
          io.to(roomId).emit('player-id-synced', { oldId, newId: socket.id, playerName: player.name });
        }
      }
    });

    socket.on('forfeit-game', async ({ roomId, playerId, playerEmail }) => {
      const room = rooms.get(roomId);
      if (room && room.gameState) {
        const playerToForfeit = room.gameState.players.find(p => p.id === playerId || (playerEmail && p.email === playerEmail));
        if (playerToForfeit && !playerToForfeit.isBankrupt) {
          console.log(`[Tactical Abort] Doctor ${playerToForfeit.name} initiated emergency withdrawal from ${roomId}.`);
          
          // Update state: Set bankrupt and mark as forfeited
          playerToForfeit.isBankrupt = true;
          playerToForfeit.status = 'FORFEITED';
          
          // Release properties to neutral
          if (room.gameState.tiles) {
            room.gameState.tiles.forEach(t => {
              if (t.ownerId === playerToForfeit.id) {
                t.ownerId = ''; // Becomes neutral
                t.dorms = 0;
                t.isMortgaged = false;
              }
            });
          }

          // Initialize rankings if not exists
          if (!room.gameState.rankings) room.gameState.rankings = [];
          
          // Track active players count BEFORE declaring the winner
          const activePlayers = room.gameState.players.filter(p => !p.isBankrupt);
          
          // Add this player to rankings with enough data to render even if they leave
          room.gameState.rankings.unshift({
            id: playerToForfeit.id,
            name: playerToForfeit.name,
            avatarId: playerToForfeit.avatarId,
            operatorName: typeof playerToForfeit.operator === 'string' ? playerToForfeit.operator : playerToForfeit.operator?.name,
            rank: activePlayers.length + 1,
            stats: { 
              orundum: playerToForfeit.orundum || 0,
              assets: (playerToForfeit.properties || []).length,
              status: playerToForfeit.status || 'FORFEITED'
            }
          });

          // Check for winner
          if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            room.gameState.winner = winner.id;
            room.gameState.message = `Mission ended. Doctor ${winner.name} has secured the sector.`;
            
            // Add winner to rankings as 1st place
            room.gameState.rankings.unshift({
              id: winner.id,
              name: winner.name,
              avatarId: winner.avatarId,
              operatorName: typeof winner.operator === 'string' ? winner.operator : winner.operator?.name,
              rank: 1,
              stats: {
                orundum: winner.orundum || 0,
                assets: (winner.properties || []).length,
                status: winner.status || 'ACTIVE'
              }
            });
            // Ensure rankings are sorted by rank
            room.gameState.rankings.sort((a: any, b: any) => (a.rank || 9) - (b.rank || 9));
          } else if (room.gameState.players[room.gameState.currentPlayerIndex].id === playerToForfeit.id) {
            // If it was their turn, advance to next player
             let nextIndex = (room.gameState.currentPlayerIndex + 1) % room.gameState.players.length;
             while (room.gameState.players[nextIndex].isBankrupt && room.gameState.players.filter(p => !p.isBankrupt).length > 1) {
                nextIndex = (nextIndex + 1) % room.gameState.players.length;
             }
             room.gameState.currentPlayerIndex = nextIndex;
             room.gameState.hasRolled = false;
             room.gameState.canRollAgain = false;
             room.gameState.isRolling = false;
             room.gameState.message = `Tactical withdrawal confirmed. Turn shifted to Doctor ${room.gameState.players[nextIndex].name}.`;
          }

          // Broadcast the updated state to everyone
          io.to(roomId).emit('game-state-updated', room.gameState);
          io.to(roomId).emit('player-forfeited', { 
            playerId: playerToForfeit.id, 
            playerName: playerToForfeit.name 
          });

          await saveLobbyToFirestore(roomId);
        }
      }
    });

    socket.on('leave-room', async (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        // If game is in progress, treat leaving as a forfeit to preserve rankings
        if (room.status === 'IN_PROGRESS' && room.gameState) {
           const player = room.gameState.players.find((p: any) => p.id === socket.id);
           if (player && !player.isBankrupt) {
              console.log(`[Auto-Forfeit] Doctor ${player.name} left active session ${roomId}.`);
              player.isBankrupt = true;
              player.status = 'LEFT';
              
              if (!room.gameState.rankings) room.gameState.rankings = [];
              const activeCount = room.gameState.players.filter((p: any) => !p.isBankrupt).length;
              
              const existingRank = room.gameState.rankings.findIndex((r: any) => r.id === player.id);
              const rankingData = {
                id: player.id,
                name: player.name,
                rank: activeCount + 1,
                stats: { orundum: player.orundum, assets: (player.properties || []).length }
              };

              if (existingRank !== -1) {
                room.gameState.rankings[existingRank] = rankingData;
              } else {
                room.gameState.rankings.unshift(rankingData);
              }

              if (activeCount === 1) {
                const winner = room.gameState.players.find((p: any) => !p.isBankrupt);
                if (winner) {
                  room.gameState.winner = winner.id;
                  const winnerRanking = {
                    id: winner.id,
                    name: winner.name,
                    rank: 1,
                    stats: { orundum: winner.orundum, assets: (winner.properties || []).length }
                  };
                  const winnerIdx = room.gameState.rankings.findIndex((r: any) => r.id === winner.id);
                  if (winnerIdx !== -1) {
                    room.gameState.rankings[winnerIdx] = winnerRanking;
                  } else {
                    room.gameState.rankings.unshift(winnerRanking);
                  }
                }
              }
              
              // Ensure rankings are sorted by rank
              room.gameState.rankings.sort((a: any, b: any) => a.rank - b.rank);
              
              io.to(roomId).emit('game-state-updated', room.gameState);
           }
        }

        socket.leave(roomId);
        socketToRoom.delete(socket.id);
        
        // BROAD LOCKDOWN: If we have ANY game state, we assume we are in an active mission.
        const isGameInProgress = !!room.gameState || room.status === 'IN_PROGRESS' || room.status === 'active';
        
        if (!isGameInProgress) {
           room.players = room.players.filter(p => p.id !== socket.id);
        } else {
           const lp = room.players.find(p => p.id === socket.id);
           if (lp) {
             lp.status = 'LEFT';
             // Directly update game state for immediate sync
             if (room.gameState && room.gameState.players) {
               const gp = room.gameState.players.find((p: any) => p.id === socket.id);
               if (gp) gp.status = 'LEFT';
             }
           }
        }

        room.selectedOperators = room.players
          .map(p => typeof p.operator === 'string' ? p.operator : p.operator?.name)
          .filter(Boolean);
        
        if (room.players.length === 0 || (room.status === 'IN_PROGRESS' && room.players.every(p => p.status === 'DISCONNECTED' || p.status === 'LEFT'))) {
          if (room.turnTimer) clearInterval(room.turnTimer);
          if (room.missionTimer) clearInterval(room.missionTimer);
          rooms.delete(roomId);
          await deleteLobbyFromFirestore(roomId);
        } else {
          await saveLobbyToFirestore(roomId);
          io.to(roomId).emit('player-left', { 
            playerId: socket.id, 
            players: room.players, 
            selectedOperators: room.selectedOperators,
            isInGame: !!room.gameState || room.status === 'IN_PROGRESS'
          });
        }
      }
    });
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      const qIdx = queue.indexOf(socket.id);
      if (qIdx !== -1) {
        queue.splice(qIdx, 1);
        if (queue.length < 2 && matchmakingTimer) {
          clearInterval(matchmakingTimer);
          matchmakingTimer = null;
        }
        broadcastQueueUpdate();
      }
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          // LOCKDOWN: Apply same append-only logic to disconnects
          const isActuallyActive = (room.status === 'IN_PROGRESS' || room.status === 'active' || 
                                   (room.gameState && room.gameState.gameStarted) ||
                                   (room.gameState && room.gameState.winner));

          if (!isActuallyActive && (room.status === 'LOBBY' || room.status === 'WAITING')) {
            room.players = room.players.filter(p => p.id !== socket.id);
            room.selectedOperators = room.players
              .map(p => typeof p.operator === 'string' ? p.operator : p.operator?.name)
              .filter(Boolean);
          } else {
            // In game or selection: Mark them as disconnected but keep entry
            const playerIdx = room.players.findIndex(p => p.id === socket.id);
            if (playerIdx !== -1) {
              room.players[playerIdx].status = 'DISCONNECTED';
              // Also update game state
              if (room.gameState && room.gameState.players) {
                const gp = room.gameState.players.find((p: any) => p.id === socket.id);
                if (gp) gp.status = 'DISCONNECTED';
              }
            }
          }

          if (room.players.every(p => p.status === 'DISCONNECTED') || room.players.length === 0) {
            if (room.turnTimer) clearInterval(room.turnTimer);
            if (room.missionTimer) clearInterval(room.missionTimer);
            rooms.delete(roomId);
            await deleteLobbyFromFirestore(roomId);
          } else {
            // If in progress, also check for single remaining player win condition on disconnect
            if (room.status === 'IN_PROGRESS' && room.gameState && !room.gameState.winner) {
              const activePlayers = room.gameState.players.filter((p: any) => !p.isBankrupt && p.status !== 'DISCONNECTED' && p.status !== 'LEFT');
              // Auto-forfeit on disconnect during active game
              const disconnectedPlayer = room.gameState.players.find((p: any) => p.id === socket.id);
              if (disconnectedPlayer && !disconnectedPlayer.isBankrupt) {
                disconnectedPlayer.isBankrupt = true;
                disconnectedPlayer.status = 'DISCONNECTED';
                
                if (!room.gameState.rankings) room.gameState.rankings = [];
                const rankCount = room.gameState.players.filter((p: any) => !p.isBankrupt).length + 1;
                
                const existingRank = room.gameState.rankings.findIndex((r: any) => r.id === disconnectedPlayer.id);
                const rankingData = {
                  id: disconnectedPlayer.id,
                  name: disconnectedPlayer.name,
                  rank: rankCount,
                  stats: { orundum: disconnectedPlayer.orundum, assets: (disconnectedPlayer.properties || []).length }
                };

                if (existingRank !== -1) {
                  room.gameState.rankings[existingRank] = rankingData;
                } else {
                  room.gameState.rankings.unshift(rankingData);
                }

                const remainingActive = room.gameState.players.filter((p: any) => !p.isBankrupt);
                if (remainingActive.length === 1) {
                  const winner = remainingActive[0];
                  room.gameState.winner = winner.id;
                  const winnerRanking = {
                    id: winner.id,
                    name: winner.name,
                    rank: 1,
                    stats: { orundum: winner.orundum, assets: (winner.properties || []).length }
                  };
                  const winnerIdx = room.gameState.rankings.findIndex((r: any) => r.id === winner.id);
                  if (winnerIdx !== -1) {
                    room.gameState.rankings[winnerIdx] = winnerRanking;
                  } else {
                    room.gameState.rankings.unshift(winnerRanking);
                  }
                }
                
                room.gameState.rankings.sort((a: any, b: any) => a.rank - b.rank);
                io.to(roomId).emit('game-state-updated', room.gameState);
              }
            }

            await saveLobbyToFirestore(roomId);
            io.to(roomId).emit('player-left', { 
              playerId: socket.id, 
              players: room.players, 
              selectedOperators: room.selectedOperators,
              isInGame: room.status === 'IN_PROGRESS'
            });
          }
        }
        socketToRoom.delete(socket.id);
      }
      socketToEmail.delete(socket.id);
    });
  });

  // Firestore Matchmaking Monitor
  if (db) {
    console.log("Initializing Firestore Matchmaking Monitor...");
    db.collection('matchmaking_queue').orderBy('joinedAt', 'asc').onSnapshot(async (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      if (players.length >= 4) {
        const selectedPlayers = players.slice(0, 4);
        const roomId = `MATCH_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        console.log(`[Sector Matchmaking] Forming sector ${roomId} from queue signal...`);
        
        const lobbyData = {
          roomId,
          status: 'selecting',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          players: selectedPlayers.map((p, idx) => ({
            id: p.socketId || p.id,
            name: p.name || 'Doctor',
            email: p.email || '',
            avatarId: p.avatarId || 'avatar_doctor',
            isHost: idx === 0,
            operator: null,
            status: 'WAITING'
          })),
          selections: {},
          selectedOperators: []
        };
        
        try {
          // Create the lobby doc in Firestore
          await db.collection('lobbies').doc(roomId).set(lobbyData);
          
          // Remove players from queue
          const batch = db.batch();
          selectedPlayers.forEach(p => {
            batch.delete(db.collection('matchmaking_queue').doc(p.id));
          });
          await batch.commit();
          
          // Emit to those specific sockets via Socket.IO for the initial navigation trigger
          selectedPlayers.forEach(p => {
            if (p.socketId) {
              const s = io.sockets.sockets.get(p.socketId);
              if (s) {
                s.join(roomId);
                s.emit('joined-room', { 
                  roomId, 
                  status: 'LOBBY', 
                  isHost: p.id === selectedPlayers[0].id,
                  players: lobbyData.players,
                  selectedOperators: []
                });
                console.log(`[Sector Matchmaking] Pushed Doctor ${p.name} to sector ${roomId}.`);
              }
            }
          });
        } catch (e) {
          console.error("[Matchmaking Error] Failed to stabilize sector:", e);
        }
      }
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

