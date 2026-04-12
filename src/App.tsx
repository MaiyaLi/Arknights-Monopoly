/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ARKNIGHTS MONOPOLY
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Dice5, 
  User, 
  TrendingUp, 
  History, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Trophy,
  Shield,
  Zap,
  Package,
  ShieldAlert,
  ArrowLeftRight,
  Plus,
  Minus,
  Building2,
  Store,
  Globe,
  Wifi,
  Users,
  Play,
  LogOut,
  Loader2,
  MessageSquare,
  ArrowRight,
  LayoutGrid,
  ScrollText,
  Info,
  Search,
  Save,
  Download,
  Upload,
  Coins,
  Smartphone,
  RotateCw,
  X,
  ShieldCheck,
  Music,
  RotateCcw,
  SkipBack,
  SkipForward,
  RefreshCw
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { db } from './firebase';
import { supabase } from './supabase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { Player, Tile, GameState, TileType, EventCard, TradeOffer, GameMode } from './types';
import { TILES, STARTING_ORUNDUM, GO_REWARD, TAX_AMOUNT, JAIL_FEE, PLAYER_COLORS, PLAYER_NAMES, BOARD_SIZE, LGD_CARDS, INTEL_CARDS, OPERATORS, AVATARS } from './constants';

const SOUNDS = {
  DICE: 'https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3',
  BUY: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  RENT: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  LAND: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  VICTORY: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  BANKRUPT: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
  MOVE: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  ALERT: 'https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3',
  GO: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
};

const MAP_IMAGE_URL = '/Resources/Map/Arknight%20Map.png';

const PRELOAD_ASSETS = [
  MAP_IMAGE_URL,
  '/Resources/Other/Arknights Monopoly Game Logo.png',
  ...Object.values(SOUNDS),
  ...Array.from({ length: 6 }, (_, i) => `/Resources/Dices/Die Face/Lungmen DIce/Lungmen Dice ${i + 1}.png`),
  ...Array.from({ length: 6 }, (_, i) => `/Resources/Dices/Die Face/Rhode Island Dice/Rhode Island Dice ${i + 1}.png`),
  ...Array.from({ length: 8 }, (_, i) => `/Resources/Dices/Rolling Animation/Rolling ${i + 1}.png`),
  ...OPERATORS.flatMap(op => [
    op.portrait, 
    op.dormImage, 
    op.commandCenterImage,
    `/Resources/Characters/${op.spriteFolder}/${op.spriteBaseName} 1.png`,
    `/Resources/Characters/${op.spriteFolder}/${op.spriteBaseName} 2.png`,
    `/Resources/Characters/${op.spriteFolder}/${op.spriteBaseName} 3.png`,
    `/Resources/Characters/${op.spriteFolder}/${op.spriteBaseName} 4.png`
  ]),
  ...AVATARS.map(a => a.url),
  ...LGD_CARDS.map(c => c.image),
  ...INTEL_CARDS.map(c => c.image),
  '/Resources/Characters/Icon/Alive/Amiya Alive.png'
];

const LOBBY_MUSIC_TRACKS = [
  "lobby_1.mp3", "lobby_2.mp3", "lobby_3.mp3", "lobby_4.mp3", "lobby_5.mp3",
  "lobby_6.mp3", "lobby_7.mp3", "lobby_8.mp3", "lobby_9.mp3", "lobby_10.mp3",
  "lobby_11.mp3", "lobby_12.mp3", "lobby_13.mp3", "lobby_14.mp3", "lobby_15.mp3"
];

const LOBBY_MUSIC_METADATA = [
  "Extinguished Sins", "Pyrolysis", "Underdawn", "Ashring", "Basepoint",
  "Blade", "Cinder", "Dawnseeker", "Deepness", "Fake Waves",
  "Lead Seal", "Pine Soot", "Pyrite", "Spectrum", "Wild Scales"
];

const LoadingScreen = ({ progress }: { progress: number }) => {
  const clampedProgress = Math.min(100, progress);
  return (
  <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center p-8">
    <div className="w-full max-w-md">
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col">
          <span className="text-2xl font-black italic uppercase tracking-tighter text-white">Arknights Monopoly</span>
        </div>
        <span className="text-xl font-mono text-orange-500 font-bold">{Math.round(clampedProgress)}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
          [SYSTEM] CACHING TACTICAL AUDIO...<br />
          [KERNEL] SYNCING OPERATOR FILES...
        </div>
        <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest text-right">
          INTEGRITY: OPTIMAL<br />
          LATENCY: MINIMAL
        </div>
      </div>
    </div>
  </div>
);
};

const Dice = ({ value, theme, diceIndex }: { value: number; theme: 'lungmen' | 'rhode_island'; diceIndex: number; soundEnabled?: boolean; volume?: number }) => {
  const diceImagePath = theme === 'lungmen'
      ? `/Resources/Dices/Die Face/Lungmen DIce/Lungmen Dice ${value || 1}.png`
      : `/Resources/Dices/Die Face/Rhode Island Dice/Rhode Island Dice ${value || 1}.png`;

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`w-14 h-14 bg-zinc-900 border-2 rounded-lg flex items-center justify-center relative overflow-hidden group shadow-lg ${
        theme === 'lungmen' ? 'border-amber-500 shadow-amber-500/20' : 'border-orange-500 shadow-orange-500/20'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent pointer-events-none ${
        theme === 'lungmen' ? 'from-amber-500/10' : 'from-orange-500/10'
      }`} />
      
      <motion.img
        key={`${theme}-${value}`}
        src={diceImagePath}
        alt={`Dice ${value}`}
        className="w-full h-full object-contain p-1 filter drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]"
        referrerPolicy="no-referrer"
      />
      
      {/* Decorative corner accents */}
      <div className={`absolute top-1 left-1 w-1 h-1 rounded-full ${theme === 'lungmen' ? 'bg-amber-500/40' : 'bg-orange-500/40'}`} />
      <div className={`absolute top-1 right-1 w-1 h-1 rounded-full ${theme === 'lungmen' ? 'bg-amber-500/40' : 'bg-orange-500/40'}`} />
      <div className={`absolute bottom-1 left-1 w-1 h-1 rounded-full ${theme === 'lungmen' ? 'bg-amber-500/40' : 'bg-orange-500/40'}`} />
      <div className={`absolute bottom-1 right-1 w-1 h-1 rounded-full ${theme === 'lungmen' ? 'bg-amber-500/40' : 'bg-orange-500/40'}`} />
    </motion.div>
  );
};

const RollingDiceAnimation = () => {
  const [frame, setFrame] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => {
        if (f >= 8) {
          clearInterval(interval);
          return 8;
        }
        return f + 1;
      });
    }, 125);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      animate={{ 
        rotate: [0, 10, -10, 5, -5, 0],
        scale: [0.95, 1.05, 0.98, 1.02, 1],
        x: [0, -1, 1, -0.5, 0.5, 0],
        y: [0, 0.5, -0.5, 1, -1, 0]
      }}
      transition={{ repeat: Infinity, duration: 0.4 }}
      className="flex items-center justify-center p-2"
    >
      <img
        src={`/Resources/Dices/Rolling Animation/Rolling ${frame}.png`}
        alt="Rolling..."
        className="w-16 h-16 object-contain filter drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]"
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
};

const PlayerToken: React.FC<{ player: Player; animationSpeed: number }> = ({ player, animationSpeed }) => {
  const [frame, setFrame] = useState(4);

  useEffect(() => {
    let interval: any;
    if (player.isMoving) {
      const getGlobalFrame = () => Math.floor(Date.now() / (120 / animationSpeed)) % 4 + 1;
      setFrame(getGlobalFrame());
      interval = setInterval(() => {
        setFrame(getGlobalFrame());
      }, 120 / animationSpeed);
    } else {
      setFrame(4);
    }
    return () => clearInterval(interval);
  }, [player.isMoving, animationSpeed]);

  return (
    <motion.div
      key={`${player.id}-${player.position}`}
      className="w-4 h-4 md:w-5 md:h-5 relative z-20"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      <img 
        src={`/Resources/Characters/${player.operator.spriteFolder}/${player.operator.spriteBaseName} ${frame}.png`} 
        alt={player.name} 
        className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" 
        referrerPolicy="no-referrer" 
      />
      
      {/* Subtle indicator ring below token */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/40 blur-[1px] rounded-[100%] -z-10" />
    </motion.div>
  );
};

const getSector = () => {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) return 'VERCEL';
    if (host.includes('web.app') || host.includes('firebaseapp.com')) return 'FIREBASE';
    if (host.includes('onrender.com')) return 'RENDER';
    return 'LOCAL';
  };
  const SECTOR = getSector();

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    dice: [1, 1],
    isRolling: false,
    hasRolled: false,
    message: 'Welcome to Arknights Monopoly.',
    log: ['Game started.'],
    selectedTileId: null,
    activeCard: null,
    activeTrade: null,
    activeAuction: null,
    winner: null,
    gameStarted: false,
    gameMode: null,
    roomId: null,
    isHost: false,
    readyPlayers: [],
    consecutiveDoubles: 0,
    canRollAgain: false,
    turnTimer: 45,
    auctionTimer: 15,
    turnTimeLimit: 45,
    lastAiTradeTime: 0,
    tiles: TILES,
    turnCount: 0,
    rankings: []
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);

  const addToLog = useCallback((msg: string) => {
    setGameState(prev => ({
      ...prev,
      log: [msg, ...prev.log].slice(0, 50) // Reduced to 50 for performance
    }));
  }, []);

  const SearchingOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
    >
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-6 md:gap-12 relative max-h-[90vh] overflow-y-auto no-scrollbar py-4 px-2">
        {/* Animated Radar Effect - Left/Top */}
        <div className="relative w-24 h-24 sm:w-40 sm:h-40 md:w-56 md:h-56 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 border-2 border-orange-500/10 rounded-full animate-[ping_3s_linear_infinite]" />
          <div className="absolute inset-4 border border-orange-500/20 rounded-full animate-[ping_2s_linear_infinite]" />
          <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-orange-500/50 flex items-center justify-center bg-zinc-900 shadow-[0_0_40px_rgba(249,115,22,0.2)]">
            <Globe className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-orange-500 animate-pulse" />
          </div>
        </div>

        {/* Tactical Info - Right/Bottom */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 w-full min-w-0">
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">Arknights <span className="text-orange-500">Monopoly</span></h2>
            <p className="text-[8px] sm:text-[10px] text-zinc-500 font-mono tracking-[0.2em] md:tracking-[0.4em] uppercase animate-pulse">Scanning Matchmaking Frequency...</p>
          </div>

          <div className="w-full bg-zinc-900/50 border border-zinc-800 p-4 sm:p-5 rounded-xl space-y-3 md:space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
              <label className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Queue Position</label>
              <div className="text-xl sm:text-2xl md:text-3xl font-black italic text-orange-500 leading-none">
                {queuePosition} <span className="text-xs text-zinc-600 not-italic font-mono">/ {queueTotal}</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${(queuePosition / Math.max(1, queueTotal)) * 100}%` }}
              />
            </div>
            <p className="text-[8px] sm:text-[9px] text-zinc-600 font-mono italic leading-tight">Matchmaking will initialize at 4 Doctors detected in sector.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button 
              onClick={handleLeaveQueue}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-red-500/10 border border-red-500/50 text-red-500 font-black uppercase italic tracking-widest rounded-sm hover:bg-red-500 hover:text-black transition-all flex items-center justify-center gap-2 group shrink-0 text-xs sm:text-sm"
            >
              <Loader2 className="w-4 h-4 animate-spin group-hover:hidden" />
              <XCircle className="w-4 h-4 hidden group-hover:block" />
              Abort Search
            </button>
            <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
          </div>
        </div>

        {/* Scanline decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>
    </motion.div>
  );

  const SignalLostOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
    >
      <div className="w-full max-w-md bg-zinc-950 border-2 border-red-600/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden flex flex-col items-center text-center gap-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #f00 0px, #f00 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 2px' }} />
        
        <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center border-2 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-red-500">Signal: <span className="text-white">Lost</span></h2>
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em]">Tactical Link Interrupted</div>
        </div>
        
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 text-sm leading-relaxed font-medium italic">
          "Doctor, the link to Rhodes Island Mainframe has been severed. Recalibrating tactical frequencies is required to resume oversight."
        </div>
        
        <button 
          onClick={reconnect}
          className="w-full py-4 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded-xl hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
        >
          <RotateCw className="w-5 h-5" />
          Recalibrate Tactical Link
        </button>
      </div>
    </motion.div>
  );

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Board is 490x490. We want to leave some padding (e.g., 10px).
        const availableWidth = width - 20;
        const availableHeight = height - 20;
        const scale = Math.max(0.1, Math.min(availableWidth / 490, availableHeight / 490));
        setBoardScale(scale);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [gameState.gameStarted]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [missionCountdown, setMissionCountdown] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'players' | 'log' | 'property'>('board');
  const [showArchives, setShowArchives] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showMobileTeam, setShowMobileTeam] = useState(false);
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [showMobileReport, setShowMobileReport] = useState(false);
  const [showPostBankruptcyChoice, setShowPostBankruptcyChoice] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const reconnect = useCallback(() => {
    if (socket) {
      setConnectError(null);
      addToLog("Attempting to re-establish tactical link...");
      socket.connect();
    }
  }, [socket, addToLog]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('arknights_monopoly_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name: 'Doctor',
          email: '',
          avatarId: 'avatar_doctor',
          level: 1,
          exp: 0,
          wins: 0,
          losses: 0,
          matches: 0,
          ...parsed
        };
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }
    return {
      name: 'Doctor',
      email: '',
      avatarId: 'avatar_doctor',
      level: 1,
      exp: 0,
      wins: 0,
      losses: 0,
      matches: 0
    };
  });
  const [isIdentified, setIsIdentified] = useState(() => {
    const saved = localStorage.getItem('arknights_monopoly_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return !!parsed.email;
      } catch {
        return false;
      }
    }
    return false;
  });

  // Winner Detection Logic: Trigger mission-complete modal globally
  useEffect(() => {
    if (gameState.winner && !showGameOver) {
      const winnerPlayer = gameState.players.find(p => p.id === gameState.winner);
      if (winnerPlayer) {
        addToLog(`MISSION SUCCESS: Sector secured by Doctor ${winnerPlayer.name}.`);
        const timer = setTimeout(() => setShowGameOver(true), 1500); 
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.winner, gameState.players, showGameOver, addToLog]);

  const [settings, setSettings] = useState({
    volume: 50,
    soundEnabled: true,
    animationSpeed: 1, // 0.5, 1, 1.5
    showGrid: true
  });

  const [currentMusicIndex, setCurrentMusicIndex] = useState(() => Math.floor(Math.random() * LOBBY_MUSIC_TRACKS.length));
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const nextMusic = useCallback(() => {
    setCurrentMusicIndex(prev => (prev + 1) % LOBBY_MUSIC_TRACKS.length);
  }, []);

  const prevMusic = useCallback(() => {
    setCurrentMusicIndex(prev => (prev - 1 + LOBBY_MUSIC_TRACKS.length) % LOBBY_MUSIC_TRACKS.length);
  }, []);

  const changeMusic = useCallback(() => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * LOBBY_MUSIC_TRACKS.length);
    } while (nextIndex === currentMusicIndex && LOBBY_MUSIC_TRACKS.length > 1);
    setCurrentMusicIndex(nextIndex);
  }, [currentMusicIndex]);

  useEffect(() => {
    // Phase 1: Cleanup old audio if it exists and we're changing tracks or entering game
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Phase 2: Start new audio if not in game
    if (!gameState.gameStarted) {
      audioRef.current = new Audio(`/Resources/Lobby Music/${LOBBY_MUSIC_TRACKS[currentMusicIndex]}`);
      audioRef.current.loop = true;
      audioRef.current.volume = settings.volume / 200; // Calibrated volume
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay prevented or interrupted.");
        });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [gameState.gameStarted, currentMusicIndex, settings.volume]);

  useEffect(() => {
    localStorage.setItem('arknights_monopoly_profile', JSON.stringify(profile));
  }, [profile]);
  
  // Persistence: Save active session
  useEffect(() => {
    if (gameState.roomId && gameState.gameStarted) {
      localStorage.setItem('arknights_monopoly_active_session', JSON.stringify({
        roomId: gameState.roomId,
        gameMode: gameState.gameMode,
        timestamp: Date.now()
      }));
    } else if (!gameState.gameStarted && !gameState.roomId) {
      // Clear session if we are back at menu and not in a room
      // But don't clear if just temporarily disconnected
    }
  }, [gameState.roomId, gameState.gameStarted, gameState.gameMode]);

  const updateProfileStats = useCallback((expGain: number, outcome: 'WIN' | 'LOSS' | 'PARTICIPATION') => {
    setProfile(prev => {
      const newExp = prev.exp + expGain;
      const newMatches = prev.matches + 1;
      const newWins = outcome === 'WIN' ? prev.wins + 1 : prev.wins;
      const newLosses = outcome === 'LOSS' ? prev.losses + 1 : prev.losses;
      
      // Scaling Level formula: Level N requires floor(1000 * 1.2^(N-1)) XP
      // To find level from total XP, we iterate
      let level = 1;
      let xpRemaining = newExp;
      let xpRequired = 1000;
      
      while (xpRemaining >= xpRequired) {
        xpRemaining -= xpRequired;
        level++;
        xpRequired = Math.floor(1000 * Math.pow(1.2, level - 1));
      }
      
      const finalProfile = {
        ...prev,
        exp: newExp,
        level: level,
        matches: newMatches,
        wins: newWins,
        losses: newLosses
      };

      // TACTICAL DOUBLE-WRITE: Sync identity across sectors (Best Effort)
      if (SECTOR === 'VERCEL' && supabase && prev.email) {
        supabase.from('profiles').upsert({
          email: prev.email,
          name: prev.name,
          level: finalProfile.level,
          exp: finalProfile.exp,
          wins: finalProfile.wins,
          losses: finalProfile.losses,
          matches: finalProfile.matches,
          avatar_id: prev.avatarId
        }).then(({ error }) => { if (error) console.error("[Sector Sync] Supabase update failed:", error); });
      }

      if (SECTOR === 'FIREBASE' && db && prev.email) {
        setDoc(doc(db, 'users', prev.email), finalProfile, { merge: true })
          .catch(e => console.error("[Sector Sync] Firestore update failed:", e));
      }

      return finalProfile;
    });
  }, []);

  const [isMoving, setIsMoving] = useState(false);
  const tiles = gameState.tiles;
  const [previewOperator, setPreviewOperator] = useState<any>(null);
  const [isQueuing, setIsQueuing] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [matchmakingCountdown, setMatchmakingCountdown] = useState<number | null>(null);
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const [lobbyDoc, setLobbyDoc] = useState<any>(null);

  // Asset Preloading Logic
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = PRELOAD_ASSETS.length;

    if (totalAssets === 0) {
      setIsAssetsLoaded(true);
      return;
    }

    const loadAsset = (url: string) => {
      return new Promise((resolve) => {
        const isAudio = url.endsWith('.mp3') || url.includes('mixkit.co');
        if (isAudio) {
          const audio = new Audio();
          audio.src = url;
          audio.oncanplaythrough = () => {
            loadedCount++;
            setLoadingProgress((loadedCount / totalAssets) * 100);
            resolve(url);
          };
          audio.onerror = () => {
            loadedCount++;
            setLoadingProgress((loadedCount / totalAssets) * 100);
            resolve(url);
          };
          // Don't wait for audio to buffer to avoid blocking the initial load
          setTimeout(() => {
            loadedCount++;
            setLoadingProgress((loadedCount / totalAssets) * 100);
            resolve(url);
          }, 100);
        } else {
          const img = new Image();
          img.src = url;
          const done = () => {
             loadedCount++;
             setLoadingProgress((loadedCount / totalAssets) * 100);
             resolve(url);
          };
          img.onload = done;
          img.onerror = done;
        }
      });
    };

    Promise.all(PRELOAD_ASSETS.map(url => loadAsset(url))).then(() => {
      // Small delay for smooth transition
      setTimeout(() => setIsAssetsLoaded(true), 300);
    });

    // Failsafe: Force complete after 4 seconds to prevent endless loading
    const failsafe = setTimeout(() => setIsAssetsLoaded(true), 4000);
    return () => clearTimeout(failsafe);
  }, []);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const isNetworkUpdate = useRef(false);

  // Helper to ensure player objects are fully hydrated with avatar objects and correct structure after network sync
  const hydratePlayers = useCallback((playersList: any[]) => {
    if (!playersList || !Array.isArray(playersList)) return [];
    return playersList.map(p => {
      // Find operator if it's just a string or missing title/assets
      let operatorObj = p.operator;
      if (typeof p.operator === 'string') {
        operatorObj = OPERATORS.find(op => op.name === p.operator) || null;
      }
      
      return {
        ...p, 
        avatar: p.avatar || AVATARS.find(a => a.id === p.avatarId) || AVATARS[0],
        operator: operatorObj,
        status: p.status || (operatorObj ? 'DEPLOYED' : 'SELECTING...')
      };
    });
  }, []);

  // Reset network update flag after each render cycle
  useEffect(() => {
    if (isNetworkUpdate.current) {
      const timer = setTimeout(() => {
        isNetworkUpdate.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState.players, gameState.gameStarted, gameState.roomId]);

  const playSound = useCallback((soundUrl: string) => {
    if (!settings.soundEnabled) return;
    const audio = new Audio(soundUrl);
    audio.volume = settings.volume / 100;
    audio.play().catch(e => console.error("Audio play failed:", e));
  }, [settings.volume, settings.soundEnabled]);

  const copyRoomId = useCallback(() => {
    if (!gameState.roomId) return;
    navigator.clipboard.writeText(gameState.roomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [gameState.roomId]);

  const saveGame = () => {
    if (!gameState.gameStarted) {
      addToLog("Cannot synchronize data: Mission not active.");
      return;
    }
    
    // Create a serializable version of the state
    const serializableState = {
      ...gameState,
      roomId: null, // Don't save roomId as it's transient
      isHost: true, // When loading, the loader becomes the host
      activeCard: gameState.activeCard ? { id: gameState.activeCard.id } : null
    };

    const saveData = {
      gameState: serializableState,
      profile,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('arknights_monopoly_save', JSON.stringify(saveData));
    addToLog('Tactical data synchronized to local storage.');
    playSound(SOUNDS.ALERT);
  };

  const loadGame = () => {
    const saved = localStorage.getItem('arknights_monopoly_save');
    if (!saved) {
      addToLog("Error: No synchronized data found in local storage.");
      return;
    }
    restoreFromSave(saved);
  };

  const restoreFromSave = (savedData: string) => {
    try {
      const { gameState: savedState, profile: savedProfile } = JSON.parse(savedData);
      
      // Re-attach card actions if needed
      let activeCard = null;
      if (savedState.activeCard && savedState.activeCard.id) {
        activeCard = [...LGD_CARDS, ...INTEL_CARDS].find(c => c.id === savedState.activeCard.id) || null;
      }

      const baseState = {
        ...savedState,
        activeCard,
        gameStarted: true,
      };

      if (gameState.gameMode === 'MULTIPLAYER' && socket && gameState.roomId) {
        if (!gameState.isHost) {
          addToLog("Error: Only the Sector Commander (Host) can restore tactical data.");
          return;
        }

        // Map current socket IDs to the saved players
        // We assume the order of players is preserved or we match by name
        const updatedPlayers = savedState.players.map((p: Player, idx: number) => {
          const currentRoomPlayer = gameState.players[idx];
          return {
            ...p,
            id: currentRoomPlayer ? currentRoomPlayer.id : p.id // Use current socket ID if available
          };
        });

        const newState = {
          ...baseState,
          players: updatedPlayers,
          roomId: gameState.roomId,
          isHost: true,
        };

        setGameState(newState);
        socket.emit('sync-game-state', {
          roomId: gameState.roomId,
          gameState: newState
        });
        
        addToLog('Broadcasting restored tactical data to all operators...');
      } else {
        setGameState({
          ...baseState,
          roomId: null,
          isHost: true,
          gameMode: savedState.gameMode || 'SINGLEPLAYER'
        });
        addToLog('Restoring tactical data from local storage...');
      }

      setProfile(savedProfile);
      playSound(SOUNDS.GO);
      setShowSettings(false);
    } catch (e) {
      console.error('Failed to load game:', e);
      addToLog('Error: Tactical data corruption detected.');
    }
  };

  const exportGame = () => {
    const saved = localStorage.getItem('arknights_monopoly_save');
    if (!saved) {
      addToLog("Error: No mission data found to export.");
      return;
    }
    const blob = new Blob([saved], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arknights_monopoly_save_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToLog('Mission data exported as tactical file.');
  };

  const importGame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        restoreFromSave(content);
        // Also save it to localStorage so it's the new "current" save
        localStorage.setItem('arknights_monopoly_save', content);
      };
      reader.readAsText(file);
    }
  };

  const clearSave = () => {
    localStorage.removeItem('arknights_monopoly_save');
    addToLog('Tactical data wiped from local storage.');
    playSound(SOUNDS.ALERT);
  };

  useEffect(() => {
    // Phase III: Dynamic Backend Initialization (Local-Aware)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.endsWith('.local');
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (isLocal ? window.location.origin : 'https://arknights-monopoly.onrender.com');
    
    addToLog(`Mission Control: Attempting tactical deep-link to ${BACKEND_URL}...`);
    
    const newSocket = io(BACKEND_URL, { 
      transports: ['websocket', 'polling'], // Prioritize websocket for stability
      reconnectionAttempts: 30, // Increase attempts for Render cold starts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 120000, // 120s timeout for Render cold boot
      autoConnect: true,
      withCredentials: true
    });
    setSocket(newSocket);

    const onConnect = () => {
      setIsConnected(true);
      setConnectError(null);
      addToLog("Tactical link established: Online.");
      // Auto-identify on connect if email exists
      if (profileRef.current.email) {
        newSocket.emit('identify-user', { 
          email: profileRef.current.email, 
          name: profileRef.current.name, 
          avatarId: profileRef.current.avatarId 
        });
      }
    };

    const onConnectError = (err: any) => {
      setIsConnected(false);
      // Detailed error reporting for diagnosing domain blocks
      const errMsg = err.description ? `${err.message} (${err.description})` : err.message;
      setConnectError(`Tactical Link Error: ${errMsg || 'Signal Refused'}`);
      setIsJoining(false); 
      addToLog(`Tactical link error: ${errMsg || 'Connection Interrupted'}`);
      console.error("Socket connection error details:", err);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      addToLog("Tactical link lost: Offline.");
    };

    newSocket.on('connect', onConnect);
    newSocket.on('connect_error', onConnectError);
    newSocket.on('disconnect', onDisconnect);

    newSocket.on('joined-room', ({ roomId, status, isHost, players, selectedOperators, gameState: syncedGameState }) => {
      isNetworkUpdate.current = true;
      setGameState(prev => {
        // Correctly transition the game mode to show the character selection UI
        let newGameMode = prev.gameMode;
        if (prev.gameMode === 'MULTIPLAYER_QUEUE' || !prev.gameMode) {
          newGameMode = isHost ? 'MULTIPLAYER_HOST' : 'MULTIPLAYER_JOIN';
        } else if (isHost) {
          newGameMode = 'MULTIPLAYER_HOST';
        } else {
          newGameMode = 'MULTIPLAYER_JOIN';
        }

        const hasSyncedState = syncedGameState && typeof syncedGameState === 'object';
        const newState = { 
          ...prev, 
          roomId, 
          isHost,
          gameMode: newGameMode,
          // Only merge shared state that won't wipe critical local context
          ...(hasSyncedState ? Object.fromEntries(Object.entries(syncedGameState).filter(([k]) => !['isHost', 'roomId', 'gameMode', 'chatMessages', 'players'].includes(k))) : {})
        };
        
        // Ensure tiles are NEVER wiped during sync
        if (hasSyncedState && syncedGameState.tiles) {
          newState.tiles = syncedGameState.tiles;
        } else if (!newState.tiles) {
          newState.tiles = [...prev.tiles];
        }

        // Sync players with Identity Shield (Never allow player list to shrink during active sessions)
        const incomingPlayers = (players && Array.isArray(players) && players.length > 0) ? players : 
                              (hasSyncedState && syncedGameState.players && Array.isArray(syncedGameState.players)) ? syncedGameState.players : 
                              null;

        if (incomingPlayers) {
          if (prev.gameStarted && prev.players.length > 0) {
            // Shield: Merge instead of overwrite to prevent "Ghosting"
            const activePool = prev.players.map(p => {
              const incoming = incomingPlayers.find((ip: any) => ip.id === p.id || (p.email && ip.email === p.email));
              // Preserve existing players, update their status if found, or mark as disconnected if missing
              return incoming ? { ...p, ...incoming } : { ...p, status: p.status === 'LEFT' ? 'LEFT' : 'DISCONNECTED' };
            });
            const newJoiners = incomingPlayers.filter((ip: any) => 
               !prev.players.some(p => p.id === ip.id || (p.email && ip.email === p.email))
            );
            newState.players = hydratePlayers([...activePool, ...newJoiners]);
          } else {
            newState.players = hydratePlayers(incomingPlayers);
          }
        }
        
        if (status === 'IN_PROGRESS') {
          newState.gameStarted = true;
          // Ensure we sync the turn index during rejoin
          if (hasSyncedState && typeof syncedGameState.currentPlayerIndex === 'number') {
            newState.currentPlayerIndex = syncedGameState.currentPlayerIndex;
          }
        }
        
        return newState;
      });
      
      // Update operators state
      if (selectedOperators && Array.isArray(selectedOperators)) {
        setSelectedOperators(selectedOperators);
      } else if (isHost) {
        setSelectedOperators([]);
      }
      
      setShowJoinRoom(false);
      setIsJoining(false);
      setJoinError(null);
      setShowCharacterSelect(status === 'LOBBY');
      setIsQueuing(false); // RELIABLY CLEAR SEARCHING OVERLAY
      setQueuePosition(0);
      setQueueTotal(0);
      
      if (status === 'IN_PROGRESS') {
        addToLog("Reconnected to active mission. Synchronizing tactical data...");
        // Auto-reclaim player if email matches
        newSocket.emit('sync-player-id', { roomId, playerName: profileRef.current.name, playerEmail: profileRef.current.email });
      }
    });

    newSocket.on('player-id-synced', ({ oldId, newId, playerName }) => {
      isNetworkUpdate.current = true;
      addToLog(`ID Synchronization complete for Operator ${playerName}.`);
      setGameState(prev => {
        const updatedPlayers = prev.players.map(p => 
          p.name === playerName ? { ...p, id: newId } : p
        );
        return { ...prev, players: updatedPlayers };
      });
    });

    newSocket.on('identified', (userData) => {
      setProfile(prev => ({ ...prev, ...userData }));
      addToLog(`Doctor ${userData.name} identified. Welcome back.`);
    });

    newSocket.on('error', (msg) => {
      addToLog(`CRITICAL ERROR: ${msg}`);
      // If identification failed, clear email to go back to setup
      if (msg.includes('Identification failed') || msg.includes('email is already active')) {
        setProfile(prev => ({ ...prev, email: '' }));
      }
    });

    newSocket.on('player-joined', ({ playerId, playerName, playerCount, status, players, selectedOperators }) => {
      addToLog(`A new Doctor has joined the mission (Total: ${playerCount}).`);
      
      if (players && Array.isArray(players)) {
        isNetworkUpdate.current = true;
        setGameState(prev => {
          if (!prev.gameStarted) {
            return { ...prev, players: hydratePlayers(players) };
          } else {
            // Soft merge during active game: Update connection status of existing players
            const updatedPlayers = prev.players.map(p => {
              const incoming = players.find(ip => ip.id === p.id || (p.email && ip.email === p.email));
              if (incoming) {
                return { ...p, id: incoming.id, status: incoming.status || 'ACTIVE' };
              }
              return p;
            });
            return { ...prev, players: updatedPlayers };
          }
        });
      }
      
      if (selectedOperators && Array.isArray(selectedOperators)) {
        setSelectedOperators(selectedOperators);
      }
    });

    newSocket.on('player-left', ({ playerId, players, selectedOperators, isInGame }) => {
      isNetworkUpdate.current = true;
      if (selectedOperators && Array.isArray(selectedOperators)) {
        setSelectedOperators(selectedOperators);
      }
      
      setGameState(prev => {
        // Only overwrite players list if game hasn't started
        if (!prev.gameStarted) {
          return { ...prev, players: hydratePlayers(players) };
        } else {
          // Mission Lockdown: Update connection status but NEVER remove participants
          const updatedPlayers = prev.players.map(p => {
            const incoming = players.find(ip => ip.id === p.id || (p.email && ip.email === p.email));
            if (incoming) {
              return { ...p, status: incoming.status };
            }
            if (p.id === playerId) {
              return { ...p, status: 'LEFT' };
            }
            return p;
          });
          
          const newState = { ...prev, players: updatedPlayers };
          
          if (!prev.winner) {
            const activePool = updatedPlayers.filter(p => !p.isBankrupt && p.status !== 'DISCONNECTED' && p.status !== 'LEFT');
            if (activePool.length === 1 && prev.players.length > 1) {
              newState.winner = activePool[0].id;
              newState.message = `Tactical Victory: ${activePool[0].name} is the last Doctor standing!`;
            }
          }
          return newState;
        }
      });
      
      addToLog(`A Doctor has disconnected from the sector.`);
    });

    newSocket.on('waiting-in-queue', ({ position, total, countdown }) => {
      setIsQueuing(true);
      setQueuePosition(position);
      setQueueTotal(total || position);
      const countdownMsg = countdown !== null ? ` (Starting in ${countdown}s)` : '';
      setGameState(prev => ({ ...prev, message: `Searching for other Doctors... (Position: ${position}/${total || position})${countdownMsg}` }));
    });

    newSocket.on('operator-selected', ({ operator, playerId, players, selectedOperators }) => {
      isNetworkUpdate.current = true;
      setSelectedOperators(selectedOperators);
      setGameState(prev => ({ ...prev, players: hydratePlayers(players) }));
    });

    newSocket.on('game-state-updated', (syncedGameState) => {
      isNetworkUpdate.current = true;
      setGameState(prev => ({
        ...prev,
        ...syncedGameState,
        isHost: prev.isHost, // PROTECT local host status
        gameMode: prev.gameMode,
        roomId: prev.roomId
      }));
    });

    newSocket.on('session-replaced', () => {
      setSessionReplaced(true);
      socket?.disconnect();
    });

    newSocket.on('new-chat-message', (message) => {
      if (message) {
        setChatHistory(prev => [...(prev || []), message]);
      }
    });

    newSocket.on('chat-history', (messages) => {
      setChatHistory(Array.isArray(messages) ? messages : []);
    });

    newSocket.on('timer-update', ({ remainingTime, turnTimeLimit }) => {
      setGameState(prev => ({ ...prev, turnTimer: remainingTime, turnTimeLimit }));
    });

    newSocket.on('turn-timeout', () => {
      // Server-confirmed timeout, trigger skip logic
      setGameState(prev => {
        if (prev.gameStarted) {
          // Priority 1: Handle Active Auction Timeout
          if (prev.activeAuction && prev.isHost) {
            // Host authoritatively skips the auction turn to avoid multi-skip desync
            skipBid(true);
            return prev;
          }

          // Priority 2: Handle Normal Turn Timeout
          if (prev.turnTimer <= 0) {
            const isMyTurn = prev.players[prev.currentPlayerIndex]?.id === newSocket.id;
            if (isMyTurn) {
              nextTurn(); 
            }
          }
        }
        return prev;
      });
    });

    newSocket.on('turn-changed', ({ nextIndex }) => {
      isNetworkUpdate.current = true;
      setGameState(prev => {
        // Ensure we don't move the index backwards unless explicitly told (to prevent stale sync overwrites)
        return { 
          ...prev, 
          currentPlayerIndex: nextIndex,
          hasRolled: false,
          isRolling: false,
          consecutiveDoubles: 0,
          canRollAgain: false,
          message: `Mission control: Deployment switched to Doctor ${prev.players[nextIndex]?.name || 'Unknown'}.`
        };
      });
    });

    newSocket.on('mission-countdown', ({ countdown }) => {
      setMissionCountdown(countdown);
      if (countdown !== null) {
        playSound(SOUNDS.ALERT);
      }
    });

    newSocket.on('mission-start', () => {
      isNetworkUpdate.current = true;
      setMissionCountdown(null);
      setGameState(prev => ({ ...prev, gameStarted: true }));
      addToLog("Mission START! All operators deploy.");
      playSound(SOUNDS.GO);
    });

    newSocket.on('turn-timeout', () => {
      // If it's our turn, force an action
      setGameState(prev => {
        const isMyTurn = prev.players[prev.currentPlayerIndex]?.id === newSocket.id;
        if (isMyTurn && prev.gameStarted) {
          addToLog("Time's up! Mission command is forcing a tactical reset.");
          // We'll handle the auto-end turn in a separate useEffect or here
        }
        return prev;
      });
    });

    newSocket.on('error', (msg) => {
      setGameState(prev => ({ ...prev, message: `ERROR: ${msg}` }));
      addToLog(`SYSTEM ERROR: ${msg}`);
      setJoinError(msg);
      setIsJoining(false);
      // If we were joining, go back to menu
      // setShowJoinRoom(false); // Keep open so they can see the error
      setShowCharacterSelect(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
  const handleCloudLobbyUpdate = useCallback((data: any) => {
    setLobbyDoc(data);
    
    // Sync players from Cloud to state
    if (data.players && Array.isArray(data.players)) {
      isNetworkUpdate.current = true;
      setGameState(prev => ({ 
        ...prev, 
        players: data.players,
        // If lobby status is active, ensure gameStarted is true
        gameStarted: data.status === 'active' || data.status === 'IN_PROGRESS' || prev.gameStarted
      }));
    }

    // Sync selected operators
    if (data.selectedOperators) {
      setSelectedOperators(data.selectedOperators);
    }

    // Handle auto-start countdown
    if (data.status === 'selecting' && data.selectedOperators?.length === 4) {
      if (matchmakingCountdown === null) {
        setMatchmakingCountdown(5);
      }
    } else {
      setMatchmakingCountdown(null);
    }

    // Handle transition to active
    if ((data.status === 'active' || data.status === 'IN_PROGRESS') && !gameState.gameStarted) {
      setGameState(prev => ({ ...prev, gameStarted: true }));
      setShowCharacterSelect(false);
      addToLog("Mission START! Tactical cloud synchronization complete.");
      playSound(SOUNDS.GO);
    }
  }, [gameState.gameStarted, matchmakingCountdown, addToLog, playSound]);

  // Hybrid Cloud Lobby Listener
  useEffect(() => {
    if (!gameState.roomId || gameState.gameMode === 'SINGLEPLAYER') return;

    let unsubscribeFirebase: () => void = () => {};
    let unsubscribeSupabase: () => void = () => {};
    
    // 1. Firebase Listener (Legacy)
    if (db) {
      try {
        const lobbyRef = doc(db, 'lobbies', gameState.roomId);
        unsubscribeFirebase = onSnapshot(lobbyRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            handleCloudLobbyUpdate(data);
          }
        }, (error) => {
          console.error("Firebase Sync Error:", error);
        });
      } catch (e) { console.error(e); }
    }

    // 2. Supabase Listener (High Stability Realtime)
    if (supabase) {
      const channel = supabase
        .channel(`lobby-${gameState.roomId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'lobbies', 
          filter: `room_id=eq.${gameState.roomId}` 
        }, (payload) => {
          const data = payload.new;
          // Map Supabase snake_case to app camelCase
          handleCloudLobbyUpdate({
            ...data,
            roomId: data.room_id,
            hostId: data.host_id,
            hostName: data.host_name,
            hostEmail: data.host_email,
            selectedOperators: data.selected_operators
          });
        })
        .subscribe();
      
      unsubscribeSupabase = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      unsubscribeFirebase();
      unsubscribeSupabase();
    };
  }, [gameState.roomId, gameState.gameMode, handleCloudLobbyUpdate]);

  // Countdown effect
  useEffect(() => {
    if (matchmakingCountdown === null) return;
    if (matchmakingCountdown <= 0) {
      if (gameState.isHost && gameState.roomId) {
        if (db) updateDoc(doc(db, 'lobbies', gameState.roomId), { status: 'active' }).catch(e => console.error(e));
        if (supabase) supabase.from('lobbies').update({ status: 'active' }).eq('room_id', gameState.roomId).then(({ error }) => { if (error) console.error(error); });
      }
      return;
    }

    const timer = setTimeout(() => {
      setMatchmakingCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [matchmakingCountdown, gameState.isHost, gameState.roomId]);

  const startGame = (selectedOp: any) => {
    setPreviewOperator(null);
    const playerAvatar = AVATARS.find(a => a.id === profile.avatarId) || AVATARS[0];

    const isLocalSelection = gameState.players.length === 1 && !gameState.roomId;
    
    if (gameState.gameMode === 'SINGLEPLAYER' || isLocalSelection) {
      const initialPlayer: Player = {
        id: 'player-1',
        name: profile.name,
        operator: selectedOp,
        avatar: AVATARS.find(a => a.id === profile.avatarId) || AVATARS[0],
        position: 0,
        turnCount: 0,
        orundum: STARTING_ORUNDUM + (selectedOp.name === 'Texas' ? 1000 : 0),
        properties: [],
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        color: selectedOp.color,
        isAI: false,
        skillCooldown: 0,
        isMoving: false,
        animationFrame: 4
      };

      const aiPlayers: Player[] = Array.from({ length: 3 }).map((_, i) => {
        const op = OPERATORS.filter(o => o.name !== selectedOp.name)[i];
        return {
          id: `ai-${i + 1}`,
          name: `${op.name} (AI)`,
          operator: op,
          avatar: AVATARS.find(a => a.name === op.name) || AVATARS[0],
          position: 0,
          turnCount: 0,
          orundum: STARTING_ORUNDUM + (op.name === 'Texas' ? 1000 : 0),
          properties: [],
          isBankrupt: false,
          inJail: false,
          jailTurns: 0,
          color: op.color,
          isAI: true,
          skillCooldown: 0,
          isMoving: false,
          animationFrame: 4
        };
      });

      const initialPlayers = [initialPlayer, ...aiPlayers];
      
      const hasMostimaOpponent = initialPlayers.some(p => p.id !== initialPlayers[0].id && p.operator.name === 'Mostima');
      const baseTime = 45; // Default limit
      const turnTimer = hasMostimaOpponent ? Math.max(10, baseTime - 5) : baseTime;

      setGameState(prev => ({
        ...prev,
        players: initialPlayers,
        gameStarted: true,
        turnTimer,
        message: `Welcome, ${selectedOp.name}. Roll to start your mission.`
      }));
    } else if (socket && gameState.roomId) {
      const player = {
        ...profile,
        id: socket.id!,
        operator: selectedOp,
        avatarId: profile.avatarId,
        status: 'READY',
        position: 0,
        turnCount: 0,
        orundum: STARTING_ORUNDUM + (selectedOp.name === 'Texas' ? 1000 : 0),
        properties: [],
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        color: selectedOp.color,
        isAI: false,
        skillCooldown: 0,
        isMoving: false,
        animationFrame: 4
      };
      
      socket.emit('select-operator', { roomId: gameState.roomId, operator: selectedOp, player });
      addToLog(`Confirmed deployment: ${selectedOp.name}. Awaiting command...`);
      
      // Update local state immediately for better responsiveness
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === socket.id ? { ...p, operator: selectedOp, status: 'READY' } : p)
      }));

      // SYNC TO BOTH CLOUDS (Operator Selection)
      if (db) {
        const lobbyRef = doc(db, 'lobbies', gameState.roomId);
        runTransaction(db, async (transaction) => {
          const lobbySnap = await transaction.get(lobbyRef);
          if (!lobbySnap.exists()) return;

          const data = lobbySnap.data();
          const selections = data.selections || {};
          const selectedOps = data.selectedOperators || [];

          if (selections[selectedOp.name]) {
            addToLog(`Error: ${selectedOp.name} is déjà deployed by another Doctor.`);
            return;
          }

          const updatedPlayers = (data.players || []).map((p: any) => 
            p.id === socket.id ? { ...p, operator: selectedOp, status: 'READY' } : p
          );

          transaction.update(lobbyRef, {
            players: updatedPlayers,
            [`selections.${selectedOp.name}`]: socket.id,
            selectedOperators: [...selectedOps, selectedOp.name]
          });
        }).catch(err => {
          console.error("Firebase selection sync failed:", err);
        });
      }

      if (supabase) {
        // Atomic operator selection for Supabase
        supabase.from('lobbies').select('players, selected_operators').eq('room_id', gameState.roomId).single().then(({ data }) => {
          if (!data) return;
          const updatedPlayers = (data.players || []).map((p: any) => 
            p.id === socket.id ? { ...p, operator: selectedOp, status: 'READY' } : p
          );
          supabase!.from('lobbies').update({
            players: updatedPlayers,
            selected_operators: [...(data.selected_operators || []), selectedOp.name]
          }).eq('room_id', gameState.roomId).then(() => {
             addToLog(`Confirmed deployment: ${selectedOp.name} (Combined Link Active).`);
          });
        });
      }
    }
  };

  const handleHost = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Set up new host state without wiping existing operator selections
    // that might have been processed by the socket prematurely
    setGameState(prev => ({ 
      ...prev, 
      gameMode: 'MULTIPLAYER_HOST', 
      roomId, 
      isHost: true,
      players: [{ 
        id: socket?.id || 'pending', 
        name: profile.name, 
        email: profile.email, 
        avatarId: profile.avatarId,
        isHost: true,
        operator: null,
        status: 'WAITING'
      }],
      gameStarted: false,
      winner: null
    }));
    
    if (socket) {
      socket.emit('host-game', { roomId, hostName: profile.name, hostEmail: profile.email, avatarId: profile.avatarId });
      setShowCharacterSelect(true);
    }
  };

  const handleJoin = () => {
    if (socket && joinRoomId) {
      setIsJoining(true);
      setJoinError(null);
      setGameState(prev => ({ ...prev, gameMode: 'MULTIPLAYER_JOIN', isHost: false }));
      socket.emit('join-game', { 
        roomId: joinRoomId, 
        playerName: profile.name, 
        playerEmail: profile.email,
        avatarId: profile.avatarId 
      });
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const myPlayer = localPlayer;
    const message = {
      id: `msg_${Date.now()}_${socket?.id || 'p0'}`,
      senderId: socket?.id || 'p0',
      senderName: myPlayer?.name || profile.name,
      senderAvatar: myPlayer?.avatar?.url || AVATARS.find(a => a.id === profile.avatarId)?.url || AVATARS[0].url,
      text: chatInput.trim(),
      timestamp: Date.now()
    };

    if (socket && gameState.roomId) {
      socket.emit('send-chat-message', { roomId: gameState.roomId, message });
    } else {
      // Local chat for single player
      setChatHistory(prev => [...prev, message]);
    }
    setChatInput('');
  };

  const handleQueue = async () => {
    setIsQueuing(true);
    setGameState(prev => ({ ...prev, gameMode: 'MULTIPLAYER_QUEUE', isHost: false }));
    setShowJoinRoom(false);
    
    if (socket) {
      // 1. Classic socket queue (for legacy support/metrics)
      socket.emit('queue-online');

      // 2. SECTOR-NATIVE Matchmaking Queue
      const queueData = {
        socket_id: socket.id,
        name: profile.name,
        email: profile.email,
        avatar_id: profile.avatarId,
        joined_at: new Date().toISOString()
      };

      // SECTOR BETA: Prioritize Supabase
      if (SECTOR === 'VERCEL' && supabase) {
        supabase.from('matchmaking_queue').upsert(queueData).then(({ error }) => { 
          if (error) console.error("Supabase Queue Error:", error); 
          else console.log("[Sector Beta] Matchmaking established via Supabase Link.");
        });
      }

      // SECTOR ALPHA: Prioritize Firestore
      if (SECTOR === 'FIREBASE' && db) {
        setDoc(doc(db, 'matchmaking_queue', socket.id), {
          ...queueData,
          joinedAt: serverTimestamp()
        }).then(() => console.log("[Sector Alpha] Matchmaking established via Firebase Link."))
          .catch(e => console.error("Firestore Queue Error:", e));
      }

      // SECTOR GAMMA / LOCAL: Rely on Socket Native
      if (SECTOR === 'RENDER' || SECTOR === 'LOCAL') {
        console.log("[Sector Gamma] Relying on native socket protocol for sector stabilization.");
      }

      // Try Firebase (Legacy) - with resilience
      if (db) {
        try {
          const queueRef = doc(db, 'matchmaking_queue', socket.id);
          setDoc(queueRef, {
            ...queueData,
            joinedAt: serverTimestamp() // Firestore uses different timestamp format
          }).catch(e => console.error("Firebase Queue Error:", e));
          addToLog("Sector Search: Broadcasting frequency to Rhodes Island relay.");
        } catch (e) {
          console.error("Firebase queue failed:", e);
        }
      } else {
         addToLog("Sector Search: Initiating direct tactical link.");
      }
    }
  };

  const handleLeaveQueue = async () => {
    setIsQueuing(false);
    setGameState(prev => ({ ...prev, gameMode: null, message: 'Mission search aborted.' }));
    if (socket) {
      socket.emit('leave-queue');
      // Cleanup both clouds
      if (supabase) {
        supabase.from('matchmaking_queue').delete().eq('socket_id', socket.id).then(({ error }) => { if (error) console.error("Supabase cleanup error:", error); });
      }
      if (db) {
        try {
          deleteDoc(doc(db, 'matchmaking_queue', socket.id));
        } catch (e) { console.error("Firebase cleanup error:", e); }
      }
    }
  };

  useEffect(() => {
    // Only the active player (or host if game hasn't started) should be the source of truth for state broadcasts
    const isActivePlayer = currentPlayer && currentPlayer.id === localPlayer?.id;
    const shouldSync = (gameState.gameMode !== 'SINGLEPLAYER' && socket && gameState.roomId) && 
                       (isActivePlayer || (!gameState.gameStarted && gameState.isHost));

    if (shouldSync) {
      if (isNetworkUpdate.current) {
        isNetworkUpdate.current = false;
        return;
      }
      
      // Throttled sync - ONLY sync shared game data, NOT local-only properties
      socket.emit('sync-game-state', { roomId: gameState.roomId, gameState: gameState });
    }
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.isHost, gameState.roomId, socket]);

  // Winner Check
  useEffect(() => {
    const activePlayers = gameState.players.filter(p => !p.isBankrupt);
    if (gameState.gameStarted && activePlayers.length === 1 && !gameState.winner) {
      const winner = activePlayers[0];
      setGameState(prev => ({ ...prev, winner: winner.id, message: `Mission Accomplished! ${winner.name} is the victor!` }));
      addToLog(`${winner.name} won the game.`);
      setShowGameOver(true);
      playSound(SOUNDS.VICTORY);
      
      // Update profile if player won
      const isLocalWinner = winner.id === socket?.id || (gameState.gameMode === 'SINGLEPLAYER' && winner.id === 'player-1');
      if (isLocalWinner) {
        updateProfileStats(500 + (gameState.turnCount * 5), 'WIN');
      } else {
        // If local player was still in the game but didn't win, they survived until the end
        const isLocalStillIn = gameState.players.some(p => 
          (p.id === socket?.id || (gameState.gameMode === 'SINGLEPLAYER' && p.id === 'player-1')) && !p.isBankrupt
        );
        if (isLocalStillIn) {
          updateProfileStats(100 + Math.floor(gameState.turnCount / 10) * 50, 'LOSS');
        }
      }
    }
  }, [gameState.players, gameState.gameStarted, gameState.winner, socket?.id, gameState.gameMode, gameState.turnCount, updateProfileStats]);

  const resetGame = () => {
    setGameState({
      players: [],
      currentPlayerIndex: 0,
      dice: [1, 1],
      isRolling: false,
      hasRolled: false,
      message: 'Welcome to Arknights Monopoly.',
      log: ['Game started.'],
      selectedTileId: null,
      activeCard: null,
      activeTrade: null,
      activeAuction: null,
      winner: null,
      gameStarted: false,
      gameMode: null,
      roomId: null,
      isHost: false,
      readyPlayers: [],
      consecutiveDoubles: 0,
      turnTimer: 45,
      tiles: TILES
    });
    setShowGameOver(false);
    setSelectedOperators([]);
    setActiveTab('board');
    setShowCharacterSelect(false);
    setMissionCountdown(null);
    setIsQueuing(false);
    setShowPostBankruptcyChoice(false);
    localStorage.removeItem('arknights_monopoly_active_session');
  };

  const currentPlayer = useMemo(() => {
    if (!gameState.players || gameState.players.length === 0) return null;
    const index = gameState.currentPlayerIndex;
    // Defensive Boundary check
    if (index < 0 || index >= gameState.players.length) {
      console.warn(`[Sync Warning] Invalid currentPlayerIndex: ${index}. Falling back to index 0.`);
      return gameState.players[0];
    }
    return gameState.players[index];
  }, [gameState.players, gameState.currentPlayerIndex]);

  const localPlayer = useMemo(() => {
    if (!gameState.players || gameState.players.length === 0) return null;
    return gameState.players.find(p => 
      (p.email && profile.email && p.email === profile.email) ||
      p.id === socket?.id || 
      (gameState.gameMode === 'SINGLEPLAYER' && p.id === 'player-1')
    );
  }, [gameState.players, socket?.id, profile.email, gameState.gameMode]);

  const isLocalTurn = useMemo(() => {
    if (!currentPlayer || !localPlayer) return false;
    
    // STRICT GUARD: If it's an AI's turn, it is NEVER a "local turn" for the human player.
    // This prevents control-leakage in singleplayer.
    if (currentPlayer.isAI) return false;

    // Strict comparison: unique ID, or unique email if IDs don't match (due to socket reconnect)
    const isSameId = currentPlayer.id === localPlayer?.id;
    // Only compare emails if they both actually exist to avoid 'undefined === undefined' matching in singleplayer
    const isSameEmail = !!currentPlayer.email && !!localPlayer.email && currentPlayer.email === localPlayer.email;
    return isSameId || isSameEmail;
  }, [currentPlayer, localPlayer]);

  const isAuctionTurn = gameState.activeAuction && (localPlayer?.id === gameState.activeAuction.biddingPlayerIds[gameState.activeAuction.currentPlayerIndex] || (localPlayer?.email && gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction.currentPlayerIndex])?.email === localPlayer.email));

    // RELAXED GUARD: If an auction is starting, allow human or AI participation
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction && !currentPlayer?.isAI) {
      // Allow start if the human is declining
    } else if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) {
      return;
    }

    // If an auction is already active for this tile, don't restart it
    if (gameState.activeAuction && gameState.activeAuction.tileId === tileId) return;

    const tile = tiles[tileId];
    const biddingPlayers = gameState.players.filter(p => !p.isBankrupt).map(p => p.id);
    
    setGameState(prev => {
      const newState = {
        ...prev,
        activeAuction: {
          tileId,
          highestBidderId: null,
          highestBid: 0,
          biddingPlayerIds: biddingPlayers,
          currentPlayerIndex: 0
        },
        auctionTimer: 15,
        message: `Auction started for ${tile.name}!`
      };
      
      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        socket.emit('reset-room-timer', prev.roomId); // RESET TIMER FOR AUCTION START
      }
      
      return newState;
    });
    addToLog(`Auction started for ${tile.name}.`);
  }, [gameState.activeAuction, gameState.players, tiles, socket, localPlayer, isLocalTurn]);

  const placeBid = useCallback((amount: number, isAiAction = false) => {
    // RELAXED GUARD: Bidding is allowed if it is the local player's turn in the AUCTION, regardless of the main board turn.
    if (gameState.gameMode === 'SINGLEPLAYER' && !isAuctionTurn && !isAiAction) return;
    const auction = gameState.activeAuction;
    if (!auction || !localPlayer) return;

    const bidderId = auction.biddingPlayerIds[auction.currentPlayerIndex];
    const bidder = gameState.players.find(p => p.id === bidderId)!;

    if (amount <= auction.highestBid || amount > bidder.orundum) return;

    // If only one bidder left and they bid, they win
    if (auction.biddingPlayerIds.length === 1) {
      const winnerId = bidderId;
      const winner = bidder;
      const tile = tiles[auction.tileId];

      const updatedTiles = tiles.map(t => t.id === auction.tileId ? { ...t, ownerId: winnerId } : t);
      const updatedPlayers = gameState.players.map(p => {
        if (p.id === winnerId) return { ...p, orundum: p.orundum - amount, properties: [...p.properties, auction.tileId] };
        return p;
      });

      setGameState(prev => {
        const newState = {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          activeAuction: null,
          message: `${winner.name} won the auction for ${tile.name} at ${amount} Orundum!`
        };
        
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }
        
        return newState;
      });
      addToLog(`${winner.name} won the auction for ${tile.name}.`);
      return;
    }

    const nextIndex = (auction.currentPlayerIndex + 1) % auction.biddingPlayerIds.length;

    setGameState(prev => {
      const newState = {
        ...prev,
        activeAuction: prev.activeAuction ? {
          ...prev.activeAuction,
          highestBid: amount,
          highestBidderId: bidderId,
          currentPlayerIndex: nextIndex
        } : null,
        auctionTimer: 15
      };
      
      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        socket.emit('reset-room-timer', prev.roomId); // RESET TIMER FOR NEXT BIDDER
      }
      
      return newState;
    });
    addToLog(`${bidder.name} bid ${amount} Orundum.`);
  }, [gameState.activeAuction, gameState.players, tiles, socket, localPlayer, isAuctionTurn]);

  const skipBid = useCallback((isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isAuctionTurn && !isAiAction) return;
    const auction = gameState.activeAuction;
    if (!auction) return;

    const remainingBidders = auction.biddingPlayerIds.filter((_, i) => i !== auction.currentPlayerIndex);
    
    if (remainingBidders.length === 0) {
      // No one bought it
      setGameState(prev => {
        const newState = { ...prev, activeAuction: null, message: "Auction ended with no winner." };
        
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }
        
        return newState;
      });
      addToLog("Auction ended with no winner.");
      return;
    }

    if (remainingBidders.length === 1 && auction.highestBidderId) {
      // The only remaining person is the one who already has the highest bid
      const winnerId = auction.highestBidderId;
      const winner = gameState.players.find(p => p.id === winnerId)!;
      const tile = tiles[auction.tileId];

      const updatedTiles = tiles.map(t => t.id === auction.tileId ? { ...t, ownerId: winnerId } : t);
      const updatedPlayers = gameState.players.map(p => {
        if (p.id === winnerId) return { ...p, orundum: p.orundum - auction.highestBid, properties: [...p.properties, auction.tileId] };
        return p;
      });

      setGameState(prev => {
        const newState = {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          activeAuction: null,
          message: `${winner.name} won the auction for ${tile.name} at ${auction.highestBid} Orundum!`
        };
        
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }
        
        return newState;
      });
      addToLog(`${winner.name} won the auction for ${tile.name}.`);
    } else {
      // Next bidder
      const nextIndex = auction.currentPlayerIndex % remainingBidders.length;
      setGameState(prev => {
        const newState = {
          ...prev,
          activeAuction: prev.activeAuction ? {
            ...prev.activeAuction,
            biddingPlayerIds: remainingBidders,
            currentPlayerIndex: nextIndex
          } : null,
          auctionTimer: 15
        };
        
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }
        
        return newState;
      });
    }
  }, [gameState.activeAuction, gameState.players, tiles, socket, localPlayer, isAuctionTurn]);

  const canTradeProperty = useCallback((tileId: number) => {
    const tile = tiles[tileId];
    if (!tile || tile.type !== 'PROPERTY') return true; // Transport/Utility can always be traded
    
    // Check if any property in the same group has buildings
    const groupTiles = tiles.filter(t => t.group === tile.group);
    return groupTiles.every(t => (t.dorms || 0) === 0);
  }, [tiles]);

  const startTrade = useCallback((receiverId: string) => {
    if (receiverId === localPlayer?.id) return;
    setGameState(prev => {
      const newState = {
        ...prev,
        activeTrade: {
          proposerId: localPlayer?.id || '',
          receiverId,
          proposerProperties: [],
          receiverProperties: [],
          proposerOrundum: 0,
          receiverOrundum: 0,
          status: 'PROPOSED',
          waitingForId: localPlayer?.id || ''
        }
      };
      
      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }
      
      return newState;
    });
  }, [localPlayer?.id, socket]);

  const updateTrade = useCallback((updates: Partial<TradeOffer>) => {
    setGameState(prev => {
      if (!prev.activeTrade) return prev;
      
      const proposer = prev.players.find(p => p.id === prev.activeTrade?.proposerId);
      const receiver = prev.players.find(p => p.id === prev.activeTrade?.receiverId);

      const newUpdates = { ...updates };

      // Cap Orundum
      if (newUpdates.proposerOrundum !== undefined && proposer) {
        newUpdates.proposerOrundum = Math.min(newUpdates.proposerOrundum, proposer.orundum);
      }
      if (newUpdates.receiverOrundum !== undefined && receiver) {
        newUpdates.receiverOrundum = Math.min(newUpdates.receiverOrundum, receiver.orundum);
      }

      // If updating properties, check if they can be traded
      if (newUpdates.proposerProperties) {
        const invalid = newUpdates.proposerProperties.find(id => !canTradeProperty(id));
        if (invalid !== undefined) {
          return { ...prev, message: `Cannot trade ${prev.tiles[invalid].name} because it or its group has buildings.` };
        }
      }
      if (newUpdates.receiverProperties) {
        const invalid = newUpdates.receiverProperties.find(id => !canTradeProperty(id));
        if (invalid !== undefined) {
          return { ...prev, message: `Cannot trade ${prev.tiles[invalid].name} because it or its group has buildings.` };
        }
      }

      const newState = {
        ...prev,
        activeTrade: { ...prev.activeTrade, ...newUpdates }
      };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });
  }, [canTradeProperty, socket]);

  const proposeTrade = useCallback((isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    setGameState(prev => {
      const trade = prev.activeTrade;
      if (!trade) return prev;
      
      const isProposer = trade.waitingForId === trade.proposerId;
      const nextWaitingId = isProposer ? trade.receiverId : trade.proposerId;
      const nextStatus = isProposer && trade.status === 'PROPOSED' ? 'PROPOSED' : 'COUNTERED';

      const nextMessage = `Trade ${nextStatus.toLowerCase()} to ${prev.players.find(p => p.id === nextWaitingId)?.name}.`;
      
      const newState = {
        ...prev,
        activeTrade: {
          ...trade,
          status: nextStatus,
          waitingForId: nextWaitingId
        },
        message: nextMessage,
        log: [nextMessage, ...prev.log].slice(0, 20)
      };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });
  }, [socket]);

  const rejectTrade = useCallback((isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    setGameState(prev => {
      const msg = 'Trade offer rejected.';
      const newState = {
        ...prev,
        activeTrade: null,
        message: msg,
        log: [msg, ...prev.log].slice(0, 20)
      };
      
      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }
      
      return newState;
    });
  }, [socket]);

  const acceptTrade = useCallback((isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    setGameState(prev => {
      const trade = prev.activeTrade;
      if (!trade) return prev;

      const waitingPlayer = prev.players.find(p => p.id === trade.waitingForId);
      // Security check: only the person waiting for can accept (or AI)
      if (trade.waitingForId !== localPlayer?.id && !waitingPlayer?.isAI) return prev;

      const proposer = prev.players.find(p => p.id === trade.proposerId)!;
      const receiver = prev.players.find(p => p.id === trade.receiverId)!;

      if (proposer.orundum < trade.proposerOrundum || receiver.orundum < trade.receiverOrundum) {
        return { ...prev, message: "Insufficient Orundum to complete trade.", activeTrade: null };
      }

      // Double check buildings just in case
      const allProperties = [...trade.proposerProperties, ...trade.receiverProperties];
      if (allProperties.some(id => !canTradeProperty(id))) {
        return { ...prev, message: "Cannot trade properties with buildings.", activeTrade: null };
      }

      const updatedPlayers = prev.players.map(p => {
        if (p.id === trade.proposerId) {
          return {
            ...p,
            orundum: p.orundum - trade.proposerOrundum + trade.receiverOrundum,
            properties: p.properties.filter(id => !trade.proposerProperties.includes(id)).concat(trade.receiverProperties)
          };
        }
        if (p.id === trade.receiverId) {
          return {
            ...p,
            orundum: p.orundum - trade.receiverOrundum + trade.proposerOrundum,
            properties: p.properties.filter(id => !trade.receiverProperties.includes(id)).concat(trade.proposerProperties)
          };
        }
        return p;
      });

      const updatedTiles = prev.tiles.map(t => {
        if (trade.proposerProperties.includes(t.id)) return { ...t, ownerId: trade.receiverId };
        if (trade.receiverProperties.includes(t.id)) return { ...t, ownerId: trade.proposerId };
        return t;
      });

      const logMsg = `Trade completed between ${proposer.name} and ${receiver.name}.`;
      const newState = {
        ...prev,
        players: updatedPlayers,
        tiles: updatedTiles,
        activeTrade: null,
        message: `Trade completed between ${proposer.name} and ${receiver.name}!`,
        log: [logMsg, ...prev.log].slice(0, 20)
      };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });
  }, [localPlayer?.id, canTradeProperty, socket]);

  const sellDorm = (tileId: number) => {
    setGameState(prev => {
      const currentP = prev.players[prev.currentPlayerIndex];
      const tile = prev.tiles[tileId];
      if (currentP && tile.ownerId === currentP.id && (tile.dorms || 0) > 0) {
        const groupTiles = prev.tiles.filter(t => t.group === tile.group);
        const maxDormsInGroup = Math.max(...groupTiles.map(t => t.dorms || 0));
        
        if ((tile.dorms || 0) < maxDormsInGroup) {
          return { ...prev, message: "Tactical Error: You must liquidate facilities evenly across the sector." };
        }

        const refund = Math.floor((tile.buildCost || 0) * 0.75 * 0.5);
        const updatedTiles = prev.tiles.map(t => t.id === tileId ? { ...t, dorms: (t.dorms || 0) - 1 } : t);
        const updatedPlayers = prev.players.map(p => {
          if (p.id === currentP.id) return { ...p, orundum: p.orundum + refund };
          return p;
        });

        addToLog(`${currentP.name} liquidated a facility on ${tile.name}.`);
        const newState = {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          message: `Liquidated facility on ${tile.name} for ${refund} Orundum.`
        };

        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }

        return newState;
      }
      return prev;
    });
  };

  const mortgageProperty = (tileId: number, isAiAction = false) => {
    setGameState(prev => {
      if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return prev;
      const currentP = prev.players[prev.currentPlayerIndex];
      const tile = prev.tiles[tileId];
      if (currentP && tile.ownerId === currentP.id && (tile.dorms || 0) === 0 && !tile.isMortgaged) {
        const mortgageValue = tile.mortgage || Math.floor((tile.cost || 0) / 2);
        const updatedTiles = prev.tiles.map(t => t.id === tileId ? { ...t, isMortgaged: true } : t);
        const updatedPlayers = prev.players.map(p => {
          if (p.id === currentP.id) return { ...p, orundum: p.orundum + mortgageValue };
          return p;
        });
        addToLog(`${currentP.name} mortgaged ${tile.name}.`);
        const newState = { ...prev, players: updatedPlayers, tiles: updatedTiles, message: `Mortgaged ${tile.name} for ${mortgageValue} Orundum.` };
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }
        return newState;
      }
      return prev;
    });
  };

  const unmortgageProperty = (tileId: number, isAiAction = false) => {
    setGameState(prev => {
      if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return prev;
      const currentP = prev.players[prev.currentPlayerIndex];
      const tile = prev.tiles[tileId];
      if (currentP && tile.ownerId === currentP.id && tile.isMortgaged) {
        const mortgageValue = tile.mortgage || Math.floor((tile.cost || 0) / 2);
        const cost = Math.ceil(mortgageValue * 1.1);
        if (currentP.orundum >= cost) {
          const updatedTiles = prev.tiles.map(t => t.id === tileId ? { ...t, isMortgaged: false } : t);
          const updatedPlayers = prev.players.map(p => {
            if (p.id === currentP.id) return { ...p, orundum: p.orundum - cost };
            return p;
          });
          addToLog(`${currentP.name} restored operations at ${tile.name}.`);
          const newState = { ...prev, players: updatedPlayers, tiles: updatedTiles, message: `Restored ${tile.name} for ${cost} Orundum.` };
          if (socket && prev.roomId && !isNetworkUpdate.current) {
            const { chatMessages, ...stateToSync } = newState;
            socket.emit('sync-game-state', { roomId: prev.roomId, gameState: stateToSync });
          }
          return newState;
        }
      }
      return prev;
    });
  };



  const nextTurn = useCallback((isAiAction = false) => {
    if (gameState.players.length === 0) return;

    // Turn isolation: Prevent human interaction during AI turns in singleplayer
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    
    // Calculate next index before state update to avoid race conditions with socket emission
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    while (gameState.players[nextIndex].isBankrupt) {
      nextIndex = (nextIndex + 1) % gameState.players.length;
    }
    
    const activePlayers = gameState.players.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      setGameState(prev => ({ ...prev, winner: activePlayers[0].id }));
      return;
    }

    setGameState(prev => {
      const updatedPlayers = prev.players.map((p, idx) => 
        idx === prev.currentPlayerIndex ? { ...p, turnCount: p.turnCount + 1 } : p
      );

      const hasMostimaOpponent = prev.players.some(p => !p.isBankrupt && p.id !== prev.players[nextIndex].id && p.operator.name === 'Mostima');
      const baseTime = prev.turnTimeLimit || 45;
      const turnTimer = hasMostimaOpponent ? Math.max(10, baseTime - 5) : baseTime;

      return {
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: nextIndex,
        turnTimer,
        hasRolled: false,
        isRolling: false,
        consecutiveDoubles: 0,
        canRollAgain: false,
        message: `It's ${prev.players[nextIndex].name}'s turn.`,
        turnCount: prev.turnCount + 1
      };
    });

    if (socket && gameState.roomId) {
      // Small delay to ensure local state has settled before global broadcast
      setTimeout(() => {
        socket.emit('next-turn', { roomId: gameState.roomId, nextIndex });
        // Force a supplemental sync to ensure everyone has the definitive final state of the previous player
        // We explicitly pass the nextIndex to ensure the server and all clients align
        const updatedState = { ...gameState, currentPlayerIndex: nextIndex, hasRolled: false, isRolling: false };
        socket.emit('sync-game-state', { roomId: gameState.roomId, gameState: updatedState });
      }, 100);
    }
  }, [socket, gameState.roomId, gameState.currentPlayerIndex, gameState.players, gameState]);

  const handleBankruptcy = useCallback((player: Player, creditorId?: string) => {
    setGameState(prev => {
      // Transfer all remaining Orundum and properties to creditor
      const updatedPlayers = prev.players.map(p => {
        if (p.id === player.id) return { ...p, isBankrupt: true, orundum: 0, properties: [] };
        if (creditorId && p.id === creditorId) {
          return {
            ...p,
            orundum: p.orundum + Math.max(0, player.orundum),
            properties: [...(p.properties || []), ...(player.properties || [])]
          };
        }
        return p;
      });

      const updatedTiles = prev.tiles.map(t => {
        if (t.ownerId === player.id) {
          return { ...t, ownerId: creditorId || '', dorms: 0, isMortgaged: false };
        }
        return t;
      });

      // Check for winner
      const activePlayers = updatedPlayers.filter(p => !p.isBankrupt);
      
      // Update rankings
      const currentRankings = [...(prev.rankings || [])];
      currentRankings.unshift({
        id: player.id,
        name: player.name,
        rank: activePlayers.length + 1,
        stats: {
          orundum: player.orundum,
          assets: (player.properties || []).length
        }
      });

      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        // Add winner as 1st place
        currentRankings.unshift({
          id: winner.id,
          name: winner.name,
          rank: 1,
          stats: {
            orundum: winner.orundum,
            assets: (winner.properties || []).length
          }
        });
        currentRankings.sort((a: any, b: any) => a.rank - b.rank);

        const finalState = {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          winner: winner.id,
          rankings: currentRankings,
          message: `${player.name} is bankrupt! ${winner.name} wins the mission!`
        };

        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: finalState });
        }


        return finalState;
      }

      let nextIndex = prev.currentPlayerIndex;
      let message = `${player.name} has gone bankrupt!`;
      let hasRolled = prev.hasRolled;
      let canRollAgain = prev.canRollAgain;

      if (prev.players[prev.currentPlayerIndex].id === player.id) {
        nextIndex = (prev.currentPlayerIndex + 1) % updatedPlayers.length;
        while (updatedPlayers[nextIndex].isBankrupt) {
          nextIndex = (nextIndex + 1) % updatedPlayers.length;
        }
        message = `${player.name} has gone bankrupt! It's ${updatedPlayers[nextIndex].name}'s turn.`;
        hasRolled = false;
        canRollAgain = false;
      }

      // Record profile reward for local player going bankrupt
      const isLocalPlayer = player.id === socket?.id || (prev.gameMode === 'SINGLEPLAYER' && player.id === 'player-1');
      if (isLocalPlayer) {
        updateProfileStats(100 + Math.floor(prev.turnCount / 10) * 50, 'LOSS');
        // Trigger post-bankruptcy choice modal for multiplayer
        if (prev.gameMode !== 'SINGLEPLAYER') {
          setTimeout(() => setShowPostBankruptcyChoice(true), 2000);
        }
      }

      const newState = {
        ...prev,
        players: updatedPlayers,
        tiles: updatedTiles,
        currentPlayerIndex: nextIndex,
        message,
        hasRolled,
        canRollAgain
      };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        
        // Only trigger next-turn if the forfeiting player WAS the current player
        if (prev.players[prev.currentPlayerIndex].id === player.id && !newState.winner) {
          socket.emit('next-turn', { roomId: prev.roomId, nextIndex });
        }
      }

      return newState;
    });
    
    playSound(SOUNDS.BANKRUPT);
    addToLog(`${player.name} is bankrupt.`);
  }, [socket, updateProfileStats, isNetworkUpdate, playSound]);

  const handleRejoinSector = useCallback(() => {
    const saved = localStorage.getItem('arknights_monopoly_active_session');
    if (saved && socket) {
      try {
        const { roomId, gameMode } = JSON.parse(saved);
        if (roomId) {
          addToLog(`Mission Control: Attempting to re-establish sector link ${roomId}...`);
          setIsJoining(true);
          setGameState(prev => ({ ...prev, roomId, gameMode }));
          socket.emit('join-game', { 
            roomId, 
            playerName: profile.name, 
            playerEmail: profile.email,
            avatarId: profile.avatarId
          });
        }
      } catch (e) {
        console.error('Failed to rejoin session:', e);
      }
    }
  }, [socket, profile, addToLog]);

  const calculateRent = useCallback((tile: Tile, owner: Player) => {
    if (tile.isMortgaged) return 0;
    if (!owner || !owner.operator) return 0;
    
    let amount = tile.rent || 0;

    if (tile.type === 'TRANSPORT') {
      const transportTiles = tiles.filter(t => t.type === 'TRANSPORT' && t.ownerId === owner.id);
      const count = transportTiles.length;
      if (count === 1) amount = 25;
      else if (count === 2) amount = 50;
      else if (count === 3) amount = 100;
      else if (count === 4) amount = 200;
    } else if (tile.type === 'UTILITY') {
      const utilityTiles = tiles.filter(t => t.type === 'UTILITY' && t.ownerId === owner.id);
      const count = utilityTiles.length;
      const diceTotal = gameState.dice[0] + gameState.dice[1];
      amount = count === 1 ? 4 * diceTotal : 10 * diceTotal;
    } else if (tile.type === 'PROPERTY') {
      const dorms = tile.dorms || 0;
      const groupTiles = tiles.filter(t => t.group === tile.group);
      const ownsAll = groupTiles.every(t => t.ownerId === owner.id);

      if (dorms === 0) {
        if (ownsAll) amount *= 2; // Double rent for full set unimproved
      } else if (dorms === 1) amount = tile.dorm1 || amount;
      else if (dorms === 2) amount = tile.dorm2 || amount;
      else if (dorms === 3) amount = tile.dorm3 || amount;
      else if (dorms === 4) amount = tile.dorm4 || amount;
      else if (dorms === 5) amount = tile.cmdCtr || amount;

      // Bonus: 25% extra rent for improved properties if full set is owned
      if (ownsAll && dorms > 0) {
        amount = Math.floor(amount * 1.25);
      }
    }

    // Hoshiguma Skill: 10% extra rent for owner
    if (owner.operator?.name === 'Hoshiguma') {
      amount = Math.floor(amount * 1.1);
    }

    return amount;
  }, [tiles, gameState.dice, gameState.players]);

  const calculateBuildCost = useCallback((tile: Tile, owner: Player) => {
    const groupTiles = tiles.filter(t => t.group === tile.group);
    const ownsAll = groupTiles.every(t => t.ownerId === owner.id);
    return ownsAll ? Math.floor((tile.buildCost || 0) * 0.75) : (tile.buildCost || 0);
  }, [tiles]);

  const calculateTotalAssets = useCallback((entity: any) => {
    if (!entity) return 0;
    
    // Support Ranking objects from server
    if (entity.stats) {
      return (entity.stats.orundum || 0) + ((entity.stats.assets || 0) * 200);
    }

    // Support full Player objects
    let total = entity.orundum || 0;
    (entity.properties || []).forEach((id: number) => {
      const tile = tiles[id];
      if (tile) {
        total += (tile.cost || 0);
        total += (tile.dorms || 0) * (tile.buildCost || 0);
      }
    });
    return total;
  }, [tiles]);

  const aiSendMessage = useCallback((text: string, aiPlayer: Player) => {
    const message = {
      id: `msg_${Date.now()}_${aiPlayer.id}`,
      senderId: aiPlayer.id,
      senderName: aiPlayer.name,
      senderAvatar: aiPlayer.avatar,
      text,
      timestamp: Date.now()
    };

    if (socket && gameState.roomId) {
      socket.emit('send-chat-message', { roomId: gameState.roomId, message });
    } else {
      setChatHistory(prev => [...(prev || []), message]);
    }
  }, [socket, gameState.roomId]);

  const payRent = useCallback((tenant: Player, owner: Player, tile: Tile) => {
    if (!tenant || !owner) return;
    // Kal'tsit Skill: 50% chance to avoid paying rent once every 5 turns
    if (tenant.operator?.name === 'Kal\'tsit') {
      if (tenant.turnCount % 5 === 0 && Math.random() > 0.5) {
        setGameState(prev => ({ ...prev, message: "Mon3tr's Protection triggered! Rent avoided." }));
        addToLog(`${tenant.name} avoided paying rent thanks to Mon3tr.`);
        return;
      }
    }

    const amount = calculateRent(tile, owner);

    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === tenant.id) return { ...p, orundum: p.orundum - amount };
        if (p.id === owner.id) return { ...p, orundum: p.orundum + amount };
        return p;
      });

      const updatedTenant = updatedPlayers.find(p => p.id === tenant.id);
      
      const newState = { ...prev, players: updatedPlayers, message: `Paid ${amount} Orundum rent to ${owner.name}.` };

      if (updatedTenant && updatedTenant.orundum < 0) {
        if (calculateTotalAssets(updatedTenant) < 0) {
          setTimeout(() => handleBankruptcy(updatedTenant, owner.id), 0);
        } else {
          newState.message = `${tenant.name} is in debt! Mortgage properties or sell dorms to raise funds.`;
        }
      }

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });

    addToLog(`${tenant.name} paid ${amount} Orundum rent to ${owner.name}.`);
    playSound(SOUNDS.RENT);
    
    if (tenant.isAI) {
      aiSendMessage(`Ouch. That's a hefty bill for ${tile.name}.`, tenant);
    }
    if (owner.isAI) {
      aiSendMessage(`Thank you for your contribution to ${tile.name}.`, owner);
    }
  }, [calculateRent, handleBankruptcy, aiSendMessage, playSound]);


  const payTax = useCallback((player: Player, amount: number) => {
    // Pramanix Skill: 50% reduced tax
    const finalAmount = player.operator.name === 'Pramanix' ? Math.floor(amount * 0.5) : amount;

    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === player.id) return { ...p, orundum: p.orundum - finalAmount };
        return p;
      });

      const updatedPlayer = updatedPlayers.find(p => p.id === player.id);
      
      const newState = { ...prev, players: updatedPlayers, message: `Paid ${finalAmount} Orundum Originium Tax.` };

      if (updatedPlayer && updatedPlayer.orundum < 0) {
        if (calculateTotalAssets(updatedPlayer) < 0) {
          setTimeout(() => handleBankruptcy(updatedPlayer), 0);
        } else {
          newState.message = `${player.name} is in debt! Mortgage properties or sell dorms to raise funds.`;
        }
      }

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });

    addToLog(`${player.name} paid ${finalAmount} Orundum tax.`);
    playSound(SOUNDS.RENT);

    if (player.isAI) {
      aiSendMessage(`Originium Tax... A necessary evil for nomadic city maintenance.`, player);
    }
  }, [handleBankruptcy, aiSendMessage, playSound]);


  const sendToJail = useCallback((player: Player) => {
    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === player.id) return { ...p, position: 10, inJail: true, jailTurns: 0 };
        return p;
      });
      
      const newState = { ...prev, players: updatedPlayers, message: `${player.name} was sent to the detention center!` };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });
    addToLog(`${player.name} was sent to jail.`);
    if (player.isAI) {
      aiSendMessage(`Detained? This is a temporary setback. I'll be back soon.`, player);
    }
  }, [aiSendMessage, socket]);


  const triggerEventRef = useRef<(player: Player) => void>(null as any);

  const handleTileAction = useCallback((player: Player, tileId: number) => {
    const tile = tiles[tileId];
    
    switch (tile.type) {
      case 'PROPERTY':
      case 'TRANSPORT':
      case 'UTILITY':
        if (tile.ownerId) {
          if (tile.ownerId !== player.id && !tile.isMortgaged) {
            const owner = gameState.players.find(p => p.id === tile.ownerId);
            if (owner) {
              payRent(player, owner, tile);
            } else {
              setGameState(prev => {
                const newState = { ...prev, message: `Landed on ${tile.name}. The Sector Commander has left the field.` };
                if (socket && prev.roomId && !isNetworkUpdate.current) {
                  socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
                }
                return newState;
              });
            }
          }
        } else {
          setGameState(prev => {
            const newState = { ...prev, message: `Land on ${tile.name}. Would you like to buy it for ${tile.cost} Orundum? (If not, it will be auctioned)` };
            if (socket && prev.roomId && !isNetworkUpdate.current) {
              socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
            }
            return newState;
          });
          if (player.isAI) {
            if (player.orundum >= (tile.cost || 0) + 200) {
              aiSendMessage(`Analyzing ${tile.name}... Potential ROI is high. I'll take it.`, player);
            } else {
              aiSendMessage(`Resources are tight. I'll pass on ${tile.name} for now.`, player);
            }
          }
        }
        break;
      case 'TAX':
        payTax(player, tile.cost || TAX_AMOUNT);
        playSound(SOUNDS.ALERT);
        break;
      case 'GO_TO_JAIL':
        sendToJail(player);
        playSound(SOUNDS.ALERT);
        break;
      case 'EVENT':
        triggerEventRef.current?.(player);
        playSound(SOUNDS.ALERT);
        break;
      default:
        playSound(SOUNDS.LAND);
        break;
    }
  }, [tiles, gameState.players, payRent, payTax, sendToJail]);

  const triggerEvent = useCallback((player: Player) => {
    const tile = tiles[player.position];
    const deck = tile.name === 'Rhodes Island Intel' ? INTEL_CARDS : LGD_CARDS;
    const card = deck[Math.floor(Math.random() * deck.length)];
    
    setGameState(prev => {
      const currentP = prev.players.find(p => p.id === player.id);
      if (!currentP) return prev;

      // Lappland Skill: Immune to first jail event
      if (currentP.operator.name === 'Lappland' && card.title === 'Sanity Depleted' && !currentP.skillUsed) {
        const updatedPlayers = prev.players.map(p => p.id === currentP.id ? { ...p, skillUsed: true } : p);
        addToLog(`${currentP.name} ignored detention thanks to Sundial.`);
        return { ...prev, players: updatedPlayers, message: "Lappland's Sundial triggered! Immune to detention." };
      }

      addToLog(`${currentP.name} triggered ${card.title}.`);
      if (currentP.isAI) {
        aiSendMessage(`Processing event: ${card.title}. Let's see the outcome.`, currentP);
      }
      
      const newState = {
        ...prev,
        activeCard: card
      };

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      return newState;
    });
  }, [tiles, aiSendMessage, socket]);

  const handleApplyCardEffect = useCallback(() => {
    const card = gameState.activeCard;
    if (!card) return;

    setGameState(prev => {
      const currentP = prev.players[prev.currentPlayerIndex];
      if (!currentP) return prev;

      const { players: updatedPlayers, message, skipLandingAction } = card.action(currentP, prev.players, prev.tiles, prev.dice);
      const playerAfterCard = updatedPlayers.find(p => p.id === currentP.id)!;
      const newPos = playerAfterCard.position;

      const newState = {
        ...prev,
        players: updatedPlayers,
        message: `${card.title}: ${message}`,
        activeCard: null // Clear card after applying
      };

      if (playerAfterCard.orundum < 0) {
        if (calculateTotalAssets(playerAfterCard) < 0) {
          setTimeout(() => handleBankruptcy(playerAfterCard), 0);
        } else {
          newState.message = `${playerAfterCard.name} is in debt! Mortgage properties or sell dorms to raise funds.`;
        }
      }

      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }

      if (!skipLandingAction && newPos !== currentP.position) {
        setTimeout(() => {
          handleTileAction(playerAfterCard, newPos);
        }, 300);
      }

      return newState;
    });
  }, [handleBankruptcy, aiSendMessage, handleTileAction, gameState.activeCard, socket]);


  triggerEventRef.current = triggerEvent;

  const handleMove = useCallback(async (player: Player, steps: number) => {
    setIsMoving(true);
    let currentPos = player.position;
    
    // Set initial moving state for the player
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === player.id ? { ...p, isMoving: true } : p)
    }));

    for (let i = 1; i <= steps; i++) {
      currentPos = (currentPos + 1) % BOARD_SIZE;
      const passedGo = currentPos === 0;

      if (passedGo) {
        const reward = player.operator.name === 'Amiya' ? Math.floor(GO_REWARD * 1.1) : GO_REWARD;
        addToLog(`${player.name} passed GO and collected ${reward} Orundum.`);
        playSound(SOUNDS.GO);
      }

      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => {
          if (p.id === player.id) {
            const reward = passedGo ? (p.operator.name === 'Amiya' ? Math.floor(GO_REWARD * 1.1) : GO_REWARD) : 0;
            return { ...p, position: currentPos, orundum: p.orundum + reward };
          }
          return p;
        })
      }));
      
      playSound(SOUNDS.MOVE);
      // Wait for the move to "feel" right and complete before next hop
      await new Promise(resolve => setTimeout(resolve, 300 / settings.animationSpeed));
    }

    // Finalize movement
    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => p.id === player.id ? { ...p, isMoving: false } : p);
      setTimeout(() => handleTileAction(updatedPlayers[prev.currentPlayerIndex], currentPos), 300);
      const newState = { ...prev, players: updatedPlayers };
      
      // Explicit sync after movement finishes
      if (socket && prev.roomId && !isNetworkUpdate.current) {
        socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
      }
      
      return newState;
    });
    
    setIsMoving(false);
  }, [gameState.currentPlayerIndex, settings.animationSpeed, handleTileAction, socket]);

  const buyProperty = useCallback((isAiAction = false) => {
    // STRICT GUARD: Prevent actions for AI and block manual input during non-local turns in singleplayer
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    if (gameState.activeAuction) return; // Prevent purchase during active auction
    setGameState(prev => {
      const currentP = prev.players[prev.currentPlayerIndex];
      if (!currentP) return prev;
      
      const tile = prev.tiles[currentP.position];
      const isBuyable = ['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tile.type);
      
      // SilverAsh Skill: 10% less to buy
      const cost = currentP.operator.name === 'SilverAsh' ? Math.floor((tile.cost || 0) * 0.9) : (tile.cost || 0);

      if (isBuyable && !tile.ownerId && currentP.orundum >= cost) {
        const updatedTiles = prev.tiles.map(t => t.id === tile.id ? { ...t, ownerId: currentP.id, dorms: 0, isMortgaged: false } : t);
        const updatedPlayers = prev.players.map(p => {
          if (p.id === currentP.id) {
            return {
              ...p,
              orundum: p.orundum - cost,
              properties: [...(p.properties || []), tile.id]
            };
          }
          return p;
        });

        addToLog(`${currentP.name} purchased ${tile.name} for ${cost} Orundum.`);
        playSound(SOUNDS.BUY);

        const newState = {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          message: `Purchased ${tile.name}!`
        };

        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }

        return newState;
      }
      return prev;
    });
  }, [gameState.currentPlayerIndex, gameState.gameMode, isLocalTurn, gameState.activeAuction, gameState.tiles, gameState.players, socket, addToLog, playSound]);


  const buildDorm = useCallback((tileId: number, isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    setGameState(prev => {
      const currentP = prev.players[prev.currentPlayerIndex];
      const tile = prev.tiles[tileId];
      if (currentP && tile.ownerId === currentP.id && tile.type === 'PROPERTY' && !tile.isMortgaged) {
        const groupTiles = prev.tiles.filter(t => t.group === tile.group);
        const ownsAll = groupTiles.every(t => t.ownerId === currentP.id);
        const anyMortgaged = groupTiles.some(t => t.isMortgaged);
        
        if (!ownsAll) {
          return { ...prev, message: "You must own all properties in this sector to build dorms." };
        }

        if (anyMortgaged) {
          return { ...prev, message: "Cannot build if any property in the sector is mortgaged." };
        }

        // 25% discount for owning the full set
        const baseCost = tile.buildCost || 0;
        const effectiveCost = Math.floor(baseCost * 0.75);

        const currentDorms = tile.dorms || 0;
        if (currentDorms < 5 && currentP.orundum >= effectiveCost) {
          // Even building rule
          const minDormsInGroup = Math.min(...groupTiles.map(t => t.dorms || 0));
          if (currentDorms > minDormsInGroup) {
            return { ...prev, message: "You must build evenly across the sector." };
          }

          const updatedTiles = prev.tiles.map(t => t.id === tileId ? { ...t, dorms: currentDorms + 1 } : t);
          const updatedPlayers = prev.players.map(p => {
            if (p.id === currentP.id) return { ...p, orundum: p.orundum - effectiveCost };
            return p;
          });
          
          addToLog(`${currentP.name} built on ${tile.name}.`);
          
          const newState = {
            ...prev,
            players: updatedPlayers,
            tiles: updatedTiles,
            message: `Built ${currentDorms === 4 ? 'Command Center' : 'Dorm'} on ${tile.name} for ${effectiveCost} Orundum!`
          };

          if (socket && prev.roomId && !isNetworkUpdate.current) {
            const { chatMessages, ...stateToSync } = newState;
            socket.emit('sync-game-state', { roomId: prev.roomId, gameState: stateToSync });
          }

          return newState;
        }
      }
      return prev;
    });
  }, [gameState.currentPlayerIndex, gameState.gameMode, isLocalTurn, gameState.tiles, gameState.players, socket, addToLog]);





  const payJailFee = useCallback((isAiAction = false) => {
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    setGameState(prev => {
      const currentP = prev.players[prev.currentPlayerIndex];
      if (currentP?.inJail && currentP.orundum >= JAIL_FEE) {
        const updatedPlayers = prev.players.map(p => {
          if (p.id === currentP.id) return { ...p, inJail: false, jailTurns: 0, orundum: p.orundum - JAIL_FEE };
          return p;
        });
        addToLog(`${currentP.name} paid bail.`);
        
        const newState = { ...prev, players: updatedPlayers, message: `${currentP.name} paid ${JAIL_FEE} Orundum to leave detention.` };

        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: newState });
        }

        return newState;
      }
      return prev;
    });
  }, []);


  const rollDice = useCallback((isAiAction = false) => {
    // SECURITY GUARD: Only allow human player events to proceed if it is their turn in singleplayer.
    // AI events are triggered by useEffect and ignore this function's manual invocation path where possible,
    // or are explicitly allowed by checked context.
    if (gameState.gameMode === 'SINGLEPLAYER' && !isLocalTurn && !isAiAction) return;
    if (gameState.isRolling || (gameState.hasRolled && !gameState.canRollAgain) || gameState.winner || isMoving) return;

    setGameState(prev => ({ ...prev, isRolling: true, canRollAgain: false }));
    playSound(SOUNDS.DICE);

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2;
      const isDoubles = d1 === d2;

      // Ch'en Skill: 15% chance to roll an extra die
      if (currentPlayer?.operator.name === 'Ch\'en' && Math.random() < 0.15) {
        const extraDie = Math.floor(Math.random() * 6) + 1;
        total += extraDie;
        addToLog(`${currentPlayer.name} triggered Chi-Shadowless and rolled an extra ${extraDie}!`);
      }

      // Exusiai Skill: O200 on doubles
      if (isDoubles && currentPlayer?.operator.name === 'Exusiai') {
        setGameState(prev => {
          const updatedPlayers = prev.players.map(p => {
            if (p.id === currentPlayer?.id) return { ...p, orundum: p.orundum + 200 };
            return p;
          });
          
          const newState = { ...prev, players: updatedPlayers };

          if (socket && prev.roomId && !isNetworkUpdate.current) {
            const { chatMessages, ...stateToSync } = newState;
            socket.emit('sync-game-state', { roomId: prev.roomId, gameState: stateToSync });
          }

          return newState;
        });
        addToLog(`${currentPlayer.name} triggered Apple Pie! and gained O200.`);
      }

      let newConsecutiveDoubles = isDoubles ? gameState.consecutiveDoubles + 1 : 0;
      let shouldGoToJail = newConsecutiveDoubles === 3;

      setGameState(prev => ({
        ...prev,
        dice: [d1, d2],
        isRolling: false,
        hasRolled: true,
        canRollAgain: isDoubles && !shouldGoToJail,
        consecutiveDoubles: newConsecutiveDoubles,
        message: shouldGoToJail ? '3 DOUBLES! GO TO JAIL!' : `Rolled a ${total}${isDoubles ? ' (DOUBLES!)' : ''}!`
      }));

      if (isDoubles && currentPlayer?.isAI && !shouldGoToJail) {
        aiSendMessage(`Doubles! Tactical advantage secured.`, currentPlayer);
      }

      if (shouldGoToJail) {
        sendToJail(currentPlayer);
        addToLog(`${currentPlayer.name} rolled 3 doubles and was sent to jail.`);
        // Force end turn immediately on 3rd double jail
        setTimeout(() => nextTurn(), 1500); 
        return;
      }

      if (currentPlayer?.inJail) {
        if (isDoubles) {
          setGameState(prev => {
            const updatedPlayers = prev.players.map(p => {
              if (p.id === currentPlayer?.id) return { ...p, inJail: false, jailTurns: 0 };
              return p;
            });
            return { ...prev, players: updatedPlayers, message: `Doubles! ${currentPlayer.name} is free!`, hasRolled: true, canRollAgain: false };
          });
          addToLog(`${currentPlayer.name} rolled doubles and left detention.`);
          handleMove({ ...currentPlayer, inJail: false, jailTurns: 0 }, total);
        } else {
          const newJailTurns = (currentPlayer.jailTurns || 0) + 1;
          if (newJailTurns >= 3) {
            setGameState(prev => {
              const updatedPlayers = prev.players.map(p => {
                if (p.id === currentPlayer?.id) return { ...p, inJail: false, jailTurns: 0, orundum: p.orundum - JAIL_FEE };
                return p;
              });
              return { ...prev, players: updatedPlayers, message: `3rd turn in detention. ${currentPlayer.name} paid ${JAIL_FEE} Orundum and is free!`, hasRolled: true };
            });
            addToLog(`${currentPlayer.name} paid bail after 3 turns.`);
            handleMove({ ...currentPlayer, inJail: false, jailTurns: 0, orundum: currentPlayer.orundum - JAIL_FEE }, total);
          } else {
            setGameState(prev => {
              const updatedPlayers = prev.players.map(p => {
                if (p.id === currentPlayer?.id) return { ...p, jailTurns: newJailTurns };
                return p;
              });
              return { ...prev, players: updatedPlayers, message: `${currentPlayer.name} remains in detention.`, hasRolled: true };
            });
            addToLog(`${currentPlayer.name} remains in detention.`);
          }
        }
      } else {
        handleMove(currentPlayer, total);
      }

      // Explicit sync after dice roll
      setGameState(prev => {
        if (socket && prev.roomId && !isNetworkUpdate.current) {
          socket.emit('sync-game-state', { roomId: prev.roomId, gameState: prev });
        }
        return prev;
      });
    }, 1000);
  }, [gameState.isRolling, gameState.hasRolled, gameState.winner, isMoving, gameState.consecutiveDoubles, gameState.players, gameState.currentPlayerIndex, handleMove, currentPlayer, payJailFee, socket]);

  // Unified Turn Timer Countdown Effect (Singleplayer & Host Backup)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.gameStarted && !gameState.winner && !gameState.isRolling && !isMoving && !gameState.activeAuction) {
      // For Singleplayer, we drive the timer here. 
      // For Multiplayer, the server drives it, but the host can provide a local backup if needed (optional)
      if (gameState.gameMode === 'SINGLEPLAYER' || (gameState.isHost && !socket)) {
        timer = setInterval(() => {
          setGameState(prev => {
            if (prev.turnTimer <= 0) return prev;
            return { ...prev, turnTimer: prev.turnTimer - 1 };
          });
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [gameState.gameStarted, gameState.winner, gameState.isRolling, isMoving, gameState.activeAuction, gameState.gameMode, gameState.isHost, socket]);

  useEffect(() => {
    if (gameState.gameStarted && gameState.turnTimer === 0) {
      if (gameState.gameMode === 'SINGLEPLAYER') {
        // Auto-skip logic for Singleplayer
        nextTurn(); // Just skip, don't autoplay
      } else if (socket) {
        // Multiplayer skip: only current player or host performs the skip action locally 
        const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;
        if (isMyTurn) {
          nextTurn(); // Just skip, don't autoplay
        }
      }
    }
  }, [gameState.turnTimer, gameState.gameStarted, gameState.currentPlayerIndex, socket, nextTurn, gameState.gameMode]);

  // Auction Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.activeAuction && gameState.gameStarted) {
      timer = setInterval(() => {
        setGameState(prev => {
          if (!prev.activeAuction) return prev;
          if (prev.auctionTimer <= 0) return prev;
          return { ...prev, auctionTimer: prev.auctionTimer - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.activeAuction, gameState.gameStarted]);

  // STRIKE GUARD: Auto-pass when auction timer hits zero
  useEffect(() => {
    if (gameState.activeAuction && gameState.auctionTimer === 0) {
      skipBid(true);
    }
  }, [gameState.auctionTimer, gameState.activeAuction, skipBid]);

  // AI Card Interaction
  useEffect(() => {
    if (gameState.activeCard && !gameState.winner) {
      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      if (activePlayer && activePlayer.isAI) {
        const timer = setTimeout(() => {
          handleApplyCardEffect();
        }, 3000); // Give 3 seconds for the "reveal" before auto-applying
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activeCard, gameState.currentPlayerIndex, gameState.players, gameState.winner, handleApplyCardEffect]);

  // Handle Auction Timeout
  useEffect(() => {
    if (gameState.activeAuction && gameState.auctionTimer === 0) {
      skipBid();
    }
  }, [gameState.auctionTimer, gameState.activeAuction, skipBid]);

  // AI Logic
  useEffect(() => {
    if (currentPlayer && currentPlayer.isAI && !gameState.winner && !gameState.isRolling && !isMoving) {
      const timer = setTimeout(() => {
        // 0. Handle Debt (Bankruptcy Mitigation)
        if (currentPlayer.orundum < 0) {
          // AI is in debt, try to raise money
          // 1. Sell dorms
          const propertyWithDorms = tiles.find(t => t.ownerId === currentPlayer.id && (t.dorms || 0) > 0);
          if (propertyWithDorms) {
            sellDorm(propertyWithDorms.id);
            aiSendMessage(`Selling some assets to cover expenses...`, currentPlayer);
            return;
          }
          // 2. Mortgage properties
          const properties = (currentPlayer.properties || []).map(id => tiles[id]).filter(t => !t.isMortgaged);
          if (properties.length > 0) {
            const mostExpensive = [...properties].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
            mortgageProperty(mostExpensive.id);
            aiSendMessage(`Mortgaging ${mostExpensive.name} to stay in the game.`, currentPlayer);
            return;
          }
          // 3. If still < 0, go bankrupt
          handleBankruptcy(currentPlayer);
          aiSendMessage(`I'm out of resources. Good game, everyone.`, currentPlayer);
          return;
        }

        if (gameState.activeTrade) return; // Trade handled in separate effect
        if (gameState.activeAuction) return;

        if (!gameState.hasRolled) {
          if (currentPlayer.inJail) {
            if (currentPlayer.orundum >= JAIL_FEE * 2) {
              payJailFee(true);
              aiSendMessage(`Paying the fine to get back to work.`, currentPlayer);
            } else {
              rollDice(true);
            }
          } else {
            rollDice(true);
          }
        } else {
          const tile = tiles[currentPlayer.position];
          const isBuyable = ['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tile.type) && !tile.ownerId;
          
          if (isBuyable) {
            if (currentPlayer.orundum >= (tile.cost || 0) + 200) {
              buyProperty(true);
              aiSendMessage(`Acquired ${tile.name}. Strategic expansion complete.`, currentPlayer);
            } else {
              startAuction(currentPlayer.position, true);
              aiSendMessage(`I'll let the market decide the value of ${tile.name}.`, currentPlayer);
            }
          } else {
            // AI Action Phase
            
            // 1. Try to unmortgage properties if wealthy
            const mortgaged = tiles.find(t => t.ownerId === currentPlayer.id && t.isMortgaged && currentPlayer.orundum > (t.mortgage || 0) * 2 + 1000);
            if (mortgaged) {
              unmortgageProperty(mortgaged.id, true);
              aiSendMessage(`Unmortgaging ${mortgaged.name}. It's back in operation.`, currentPlayer);
              return;
            }

             // 2. Try to initiate a trade to complete a set
             const now = Date.now();
             if (!gameState.activeTrade && (!gameState.lastAiTradeTime || now - gameState.lastAiTradeTime > 60000)) {
               const myProperties = tiles.filter(t => t.ownerId === currentPlayer.id);
               const incompleteGroups = [...new Set(myProperties.map(t => t.group))].filter(group => {
                 if (!group) return false;
                 const groupTiles = tiles.filter(t => t.group === group);
                 const ownedCount = groupTiles.filter(t => t.ownerId === currentPlayer.id).length;
                 return ownedCount > 0 && ownedCount < groupTiles.length;
               });
 
               for (const group of incompleteGroups) {
                 const groupTiles = tiles.filter(t => t.group === group);
                 const missingTile = groupTiles.find(t => t.ownerId && t.ownerId !== currentPlayer.id);
                 if (missingTile && missingTile.ownerId) {
                   const owner = gameState.players.find(p => p.id === missingTile.ownerId);
                   if (owner && !owner.isAI && currentPlayer.orundum > (missingTile.cost || 0) * 2) {
                     // Offer 1.5x cost for the missing tile
                     const offerAmount = Math.floor((missingTile.cost || 0) * 1.5);
                     setGameState(prev => ({
                       ...prev,
                       lastAiTradeTime: now,
                       activeTrade: {
                         proposerId: currentPlayer.id,
                         receiverId: owner.id,
                         proposerProperties: [],
                         receiverProperties: [missingTile.id],
                         proposerOrundum: offerAmount,
                         receiverOrundum: 0,
                         status: 'PROPOSED',
                         waitingForId: owner.id
                       }
                     }));
                     aiSendMessage(`Doctor ${owner.name}, I'm interested in ${missingTile.name}. Here is a fair offer.`, currentPlayer);
                     return;
                   }
                 }
               }
             }
 
             // 3. Try building if possible
             const buildableProperties = tiles.filter(t => 
               t.ownerId === currentPlayer.id && 
               t.type === 'PROPERTY' && 
               (t.dorms || 0) < 5 && 
               !t.isMortgaged
             );
 
             const validBuildables = buildableProperties.filter(t => {
               const groupTiles = tiles.filter(gt => gt.group === t.group);
               const ownsAll = groupTiles.every(gt => gt.ownerId === currentPlayer.id);
               const anyMortgaged = groupTiles.some(gt => gt.isMortgaged);
               const minDormsInGroup = Math.min(...groupTiles.map(gt => gt.dorms || 0));
               return ownsAll && !anyMortgaged && (t.dorms || 0) <= minDormsInGroup;
             });
 
             validBuildables.sort((a, b) => (b.buildCost || 0) - (a.buildCost || 0));
 
             const buildable = validBuildables.find(t => {
               const effectiveCost = Math.floor((t.buildCost || 0) * 0.75);
               return currentPlayer.orundum >= effectiveCost + 1000;
             });
 
             if (buildable) {
               buildDorm(buildable.id, true);
               aiSendMessage(`Upgrading facilities at ${buildable.name}.`, currentPlayer);
             } else if (gameState.canRollAgain) {
               rollDice(true);
             } else {
               nextTurn(true);
             }
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.hasRolled, gameState.canRollAgain, gameState.isRolling, gameState.activeTrade, gameState.activeAuction, isMoving, tiles, gameState.players, aiSendMessage]);
  
  // AI Heartbeat - Auto-recovery for stuck turns in single player
  useEffect(() => {
    if (gameState.gameMode === 'SINGLEPLAYER' && currentPlayer?.isAI && !gameState.winner && !gameState.isRolling && !isMoving) {
      const fallback = setTimeout(() => {
        if (!gameState.hasRolled) {
          rollDice(true);
        } else if (tiles[currentPlayer.position].type === 'PROPERTY' && !tiles[currentPlayer.position].ownerId) {
          buyProperty(true);
        } else {
          nextTurn(true);
        }
      }, 10000); // 10s fallback heartbeat
      return () => clearTimeout(fallback);
    }
  }, [currentPlayer, gameState.gameMode, gameState.winner, gameState.isRolling, isMoving, gameState.hasRolled, rollDice, buyProperty, nextTurn, tiles]);

  // AI Trade Response Effect
  useEffect(() => {
    if (gameState.activeTrade && !gameState.winner) {
      const trade = gameState.activeTrade;
      const waitingPlayer = gameState.players.find(p => p.id === trade.waitingForId);
      
      if (waitingPlayer && waitingPlayer.isAI) {
        const timer = setTimeout(() => {
          // Re-check if trade is still active and waiting for this AI
          if (!gameState.activeTrade || gameState.activeTrade.waitingForId !== waitingPlayer.id) return;

          // AI Evaluation Logic
          const evaluateTrade = () => {
            const isAIProposer = trade.proposerId === waitingPlayer.id;
            
            let givingValue = isAIProposer ? trade.proposerOrundum : trade.receiverOrundum;
            let gettingValue = isAIProposer ? trade.receiverOrundum : trade.proposerOrundum;
            
            const givingProperties = isAIProposer ? trade.proposerProperties : trade.receiverProperties;
            const gettingProperties = isAIProposer ? trade.receiverProperties : trade.proposerProperties;
            
            givingProperties.forEach(id => {
              const tile = tiles[id];
              givingValue += (tile.cost || 0);
              // Penalty for giving away a set or helping them complete one
              const groupTiles = tiles.filter(t => t.group === tile.group);
              const otherId = isAIProposer ? trade.receiverId : trade.proposerId;
              const ownedByThem = groupTiles.filter(t => t.ownerId === otherId || givingProperties.includes(t.id)).length;
              if (ownedByThem === groupTiles.length) givingValue += (tile.cost || 0) * 0.8;
            });
            
            gettingProperties.forEach(id => {
              const tile = tiles[id];
              gettingValue += (tile.cost || 0);
              // Bonus for completing a set
              const groupTiles = tiles.filter(t => t.group === tile.group);
              const ownedByMe = groupTiles.filter(t => t.ownerId === waitingPlayer.id || gettingProperties.includes(t.id)).length;
              if (ownedByMe === groupTiles.length) gettingValue += (tile.cost || 0) * 1.2;
            });
            
            return { gettingValue, givingValue };
          };

          const { gettingValue, givingValue } = evaluateTrade();

          if (gettingValue >= givingValue * 1.1) {
            acceptTrade(true);
            aiSendMessage(`This trade seems fair. I accept.`, waitingPlayer);
          } else if (gettingValue >= givingValue * 0.8 && trade.status === 'PROPOSED') {
            // Counter offer: ask for more money
            const gap = Math.floor(givingValue * 1.1 - gettingValue);
            const isAIProposer = trade.proposerId === waitingPlayer.id;
            
            if (isAIProposer) {
              updateTrade({ receiverOrundum: trade.receiverOrundum + gap });
            } else {
              updateTrade({ proposerOrundum: trade.proposerOrundum + gap });
            }
            proposeTrade(true);
            aiSendMessage(`I'm interested, but I'll need a bit more Orundum to close the deal.`, waitingPlayer);
          } else {
            rejectTrade(true);
            aiSendMessage(`I'm not interested in this offer.`, waitingPlayer);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activeTrade?.waitingForId, gameState.activeTrade?.status, gameState.winner, tiles, gameState.players, acceptTrade, rejectTrade, updateTrade, proposeTrade, aiSendMessage]);

  // AI Auction Logic
  useEffect(() => {
    if (gameState.activeAuction) {
      const auction = gameState.activeAuction;
      const bidderId = auction.biddingPlayerIds[auction.currentPlayerIndex];
      const bidder = gameState.players.find(p => p.id === bidderId)!;
      const tile = tiles[auction.tileId];

      if (bidder.isAI) {
        const timer = setTimeout(() => {
          // Re-check if it's still the AI's turn after timeout
          const currentAuction = gameState.activeAuction;
          if (!currentAuction || currentAuction.biddingPlayerIds[currentAuction.currentPlayerIndex] !== bidderId) return;

          const groupTiles = tiles.filter(t => t.group === tile.group);
          const ownedInGroup = groupTiles.filter(t => t.ownerId === bidder.id).length;
          const isCompletingSet = ownedInGroup === groupTiles.length - 1;
          const isBlockingSet = groupTiles.some(t => {
            if (!t.ownerId || t.ownerId === bidder.id) return false;
            const othersOwned = groupTiles.filter(gt => gt.ownerId === t.ownerId).length;
            return othersOwned === groupTiles.length - 1;
          });
          
          // Smarter max bid
          let multiplier = 1.1;
          if (isCompletingSet) multiplier = 2.0;
          else if (isBlockingSet) multiplier = 1.5;
          else if (tile.type === 'TRANSPORT') multiplier = 1.3;
          else if (tile.type === 'UTILITY') multiplier = 1.2;

          const maxBid = (tile.cost || 100) * multiplier;
          
          if (auction.highestBid < maxBid && bidder.orundum > auction.highestBid + 10) {
            // Randomize increment slightly
            const minIncrement = 10;
            const maxIncrement = isCompletingSet ? 100 : 30;
            const increment = Math.floor(Math.random() * (maxIncrement - minIncrement + 1)) + minIncrement;
            
            const nextBid = Math.min(auction.highestBid + increment, Math.floor(maxBid), bidder.orundum);
            
            if (nextBid > auction.highestBid) {
              placeBid(nextBid);
              aiSendMessage(`I'll bid ${nextBid} Orundum for this sector.`, bidder);
            } else {
              skipBid();
              aiSendMessage(`The price is too high for me. I'm out.`, bidder);
            }
          } else {
            skipBid();
            aiSendMessage(`I'm not interested in this sector at this price.`, bidder);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activeAuction?.currentPlayerIndex, gameState.activeAuction?.highestBid]);


  const renderTile = (tile: Tile, side: 'top' | 'bottom' | 'left' | 'right' | 'corner') => {
    const owner = gameState.players.find(p => p.id === tile.ownerId);
    const playersOnTile = gameState.players.filter(p => p.position === tile.id && !p.isBankrupt);

    const isCorner = side === 'corner';
    
    let containerClass = `relative flex flex-col items-center justify-between transition-all cursor-pointer ${tile.id === gameState.selectedTileId ? 'ring-2 ring-orange-500 z-10' : ''} ${tile.isMortgaged ? 'opacity-40' : ''}`;
    
    if (isCorner) {
      containerClass += " w-[65px] h-[65px]";
    } else if (side === 'top' || side === 'bottom') {
      containerClass += " w-[40px] h-[65px]";
    } else {
      containerClass += " w-[65px] h-[40px]";
    }

    const contentRotation = side === 'left' ? 'rotate-90' :
                            side === 'right' ? '-rotate-90' :
                            side === 'top' ? 'rotate-180' : '';

    return (
      <div 
        key={tile.id}
        className={containerClass}
        onClick={() => {
          setGameState(prev => ({ ...prev, selectedTileId: tile.id }));
          if (['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tile.type)) {
            setShowPropertyModal(true);
          }
        }}
      >
        <div className={`flex-1 flex flex-col items-center justify-center text-center w-full h-full ${contentRotation}`} />

        {/* Player Tokens - Specifically positioned for Jail or centered for other tiles */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {tile.type === 'JAIL' ? (
            <>
              {/* Just Visiting Zone (Bottom and Left edges) */}
              <div className="absolute inset-0 flex items-end justify-start">
                 {/* This container covers the L-shape visually by being small enough */}
                 <div className="flex flex-wrap gap-0.5 p-0.5 max-w-full max-h-full">
                    <AnimatePresence>
                      {playersOnTile.filter(p => !p.inJail).map(p => (
                        <div key={p.id} className="w-4 h-4 scale-75">
                          <PlayerToken player={p} animationSpeed={settings.animationSpeed} />
                        </div>
                      ))}
                    </AnimatePresence>
                 </div>
              </div>
              
              {/* Detention Zone (Top-Right 53x53 area) */}
              <div className="absolute top-0 right-0 w-[53px] h-[53px] flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5 justify-center">
                  <AnimatePresence>
                    {playersOnTile.filter(p => p.inJail).map(p => (
                      <PlayerToken key={p.id} player={p} animationSpeed={settings.animationSpeed} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5 justify-center max-w-[95%]">
                <AnimatePresence>
                  {playersOnTile.map(p => (
                    <PlayerToken key={p.id} player={p} animationSpeed={settings.animationSpeed} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Character-Specific Buildings (Minimized to fit Color Spot) */}
        {owner && tile.type === 'PROPERTY' && tile.dorms !== undefined && tile.dorms > 0 && (
          <div className={`absolute z-30 flex items-center justify-center pointer-events-none ${
            side === 'top' ? 'bottom-0 left-0 w-full h-[15px]' :
            side === 'bottom' ? 'top-0 left-0 w-full h-[15px]' :
            side === 'left' ? 'right-0 top-0 h-full w-[15px]' :
            side === 'right' ? 'left-0 top-0 h-full w-[15px]' : ''
          }`}>
            {tile.dorms < 5 ? (
              <div className={`flex ${side === 'left' || side === 'right' ? 'flex-col' : 'flex-row'} items-center justify-center gap-0`}>
                {Array.from({ length: tile.dorms }).map((_, i) => (
                  <img 
                    key={i} 
                    src={owner.operator.dormImage} 
                    alt="Dorm" 
                    className={`w-2 h-2 md:w-2.5 md:h-2.5 object-contain ${contentRotation}`}
                  />
                ))}
              </div>
            ) : (
              <img 
                src={owner.operator.commandCenterImage} 
                alt="Command Center" 
                className={`w-full h-full object-contain ${contentRotation}`}
              />
            )}
          </div>
        )}

        {/* Ownership indicated by aligned strip (Outer Edges) */}
        {owner && (
          <div 
            className={`absolute z-10 shadow-[0_0_5px_rgba(0,0,0,0.6)] ${
              side === 'top' ? 'top-0 left-0 w-full h-1' :
              side === 'bottom' ? 'bottom-0 left-0 w-full h-1' :
              side === 'left' ? 'top-0 left-0 h-full w-1' :
              side === 'right' ? 'top-0 right-0 h-full w-1' : ''
            }`} 
            style={{ backgroundColor: owner.color }} 
          />
        )}
      </div>
    );
  };

  if (!isAssetsLoaded) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="h-[100dvh] w-[100dvw] bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden relative flex flex-col">
      {/* Global Portrait Orientation Overlay */}
      <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center lg:hidden portrait:flex landscape:hidden pointer-events-auto">
        <div className="w-24 h-24 mb-6 relative">
          <motion.div
            animate={{ rotate: 90 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full border-4 border-orange-500 rounded-xl flex items-center justify-center"
          >
            <Smartphone className="w-12 h-12 text-orange-500" />
          </motion.div>
          <motion.div 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -right-4 top-1/2 -translate-y-1/2"
          >
            <RotateCw className="w-8 h-8 text-orange-500" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Tactical Rotation Required</h2>
        <p className="text-zinc-500 text-sm max-w-xs font-medium leading-relaxed">
          Rhodes Island Tactical Interface is optimized for <span className="text-orange-500 font-bold italic">Landscape Orientation</span>. Please rotate your device to continue the operation.
        </p>
      </div>

      {/* Dynamic Background Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 pointer-events-none" 
        style={{ 
          backgroundImage: 'url("/menu_bg.png")', 
          opacity: !gameState.gameStarted ? 0.35 : 0.1,
          filter: !gameState.gameStarted ? 'none' : 'blur(4px)'
        }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
      
      {!gameState.gameStarted ? (
        
        <AnimatePresence mode="wait">
          {!isIdentified ? (
            <motion.div
              key="account-setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md"
            >
              <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
                <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Identity <span className="text-orange-500">Verification</span></h2>
                    <p className="text-[8px] md:text-xs text-zinc-500 font-mono mt-0.5">ENFORCE IDENTIFICATION PROTOCOL</p>
                  </div>
                  {profile.email && (
                    <button onClick={() => setShowProfile(false)} className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors">
                      <X className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
                    </button>
                  )}
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto max-h-[60vh] md:max-h-none">
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Doctor Codename</label>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 md:p-3 text-white focus:border-orange-500 outline-none transition-colors text-sm"
                        placeholder="Enter Codename..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Identification Email</label>
                      <input 
                        type="email" 
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 md:p-3 text-white focus:border-orange-500 outline-none transition-colors text-sm"
                        placeholder="doctor@rhodesisland.ri"
                      />
                      <p className="text-[7px] md:text-[8px] text-zinc-600 font-mono italic pl-1">Unique primary key required for network operations.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Tactical Avatar</label>
                    <div className="grid grid-cols-6 md:grid-cols-4 gap-1.5 md:gap-2">
                      {AVATARS.map(avatar => (
                        <button
                          key={avatar.id}
                          onClick={() => setProfile(prev => ({ ...prev, avatarId: avatar.id }))}
                          className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${profile.avatarId === avatar.id ? 'border-orange-500 scale-95' : 'border-zinc-800 opacity-60 hover:opacity-100'}`}
                        >
                          <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover object-[center_20%]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-zinc-900/50 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      if (!profile.email || !profile.name) {
                        addToLog("ERROR: Email and Codename are mandatory.");
                        return;
                      }
                      if (socket) {
                        socket.emit('identify-user', { email: profile.email, name: profile.name, avatarId: profile.avatarId });
                      }
                      setIsIdentified(true);
                      setShowProfile(false);
                    }}
                    className="w-full py-3 md:py-4 bg-orange-600 hover:bg-orange-500 text-white font-black italic uppercase tracking-widest rounded-md scenario-btn-shadow transition-all flex items-center justify-center gap-2 group text-xs md:text-sm"
                  >
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                    Initialize Identity
                  </button>
                </div>
              </div>
            </motion.div>
          ) : showJoinRoom ? (


             <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
                <motion.div 
                  key="join-room"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="z-10 w-full max-w-sm bg-zinc-950 border-2 border-orange-500/30 p-4 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                >
              {/* Decorative scanline and grid */}
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1)_0,transparent_100%)]" />
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3 md:w-2 md:h-4 bg-orange-500" />
                    <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Join <span className="text-orange-500">Mission</span></h2>
                  </div>
                  <div className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-mono">Sector Synchronization Protocol</div>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-orange-500/20 rounded opacity-75 group-focus-within:opacity-100 transition-opacity blur-[2px]" />
                    <input 
                      type="text" 
                      placeholder="ENTER SECTOR ID"
                      value={joinRoomId}
                      disabled={isJoining}
                      onChange={(e) => {
                        setJoinError(null);
                        setJoinRoomId(e.target.value.toUpperCase().trim());
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                      className="relative w-full bg-zinc-900 border border-zinc-700 p-4 rounded text-center text-xl font-mono font-bold tracking-[0.2em] outline-none text-orange-500 focus:border-orange-500 transition-all placeholder:text-zinc-700 uppercase"
                    />
                    {isJoining && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm rounded border border-orange-500/50">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Syncing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {joinError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-medium italic">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-black uppercase text-[10px] tracking-widest mb-1">Authorization Error</div>
                            {joinError}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-2">
                    <button 
                      disabled={isJoining}
                      onClick={() => {
                        setShowJoinRoom(false);
                        setJoinError(null);
                      }} 
                      className="flex-1 py-3 border border-zinc-800 text-zinc-600 font-black uppercase italic tracking-widest rounded transition-all hover:bg-zinc-900 hover:text-zinc-400 disabled:opacity-30 text-xs"
                    >
                      Abort
                    </button>
                    <button 
                      disabled={isJoining || (!joinRoomId && isConnected)}
                      onClick={handleJoin} 
                      className="flex-1 py-3 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded transition-all hover:bg-orange-400 disabled:opacity-30 text-xs shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
                    >
                      {(!isConnected && isJoining) ? 'Initializing...' : 'Confirm'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {!isConnected && isJoining && (
                    <div className="flex flex-col gap-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded">
                      <div className="flex justify-between items-center text-[8px] font-mono text-orange-500/70 uppercase">
                        <span>Establishing Link</span>
                        <span className="animate-pulse">Active</span>
                      </div>
                      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-orange-500"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 30, ease: "linear" }}
                        />
                      </div>
                      <p className="text-[7px] text-zinc-600 font-mono uppercase text-center italic">
                        Node calibration in progress. Signal response expected within 30s.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tactical Utility Grid - Mirroring Landing Screen style but smaller for Join Mission */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                  <button 
                    onClick={() => setShowProfile(true)}
                    className="py-1.5 md:py-2 bg-zinc-900/50 text-zinc-500 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-700 transition-all flex flex-col items-center gap-1 shadow-sm"
                  >
                    <User className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    <span className="text-[5px] md:text-[6px] font-black uppercase tracking-widest">Dossier</span>
                  </button>
                  <button 
                    onClick={() => setShowArchives(true)}
                    className="py-1.5 md:py-2 bg-zinc-900/50 text-zinc-500 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-700 transition-all flex flex-col items-center gap-1 shadow-sm"
                  >
                    <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    <span className="text-[5px] md:text-[6px] font-black uppercase tracking-widest">Archives</span>
                  </button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="py-1.5 md:py-2 bg-zinc-900/50 text-zinc-500 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-700 transition-all flex flex-col items-center gap-1 shadow-sm"
                  >
                    <Settings className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    <span className="text-[5px] md:text-[6px] font-black uppercase tracking-widest">Terminal</span>
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
            ) : !showCharacterSelect ? (
            <motion.div 
              key="main-menu"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="z-10 flex flex-col items-center lg:justify-center gap-6 lg:gap-10 max-w-5xl w-full px-6 py-10 lg:py-8 overflow-y-auto no-scrollbar mx-auto"
            >
              {/* Central Command Header */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 border border-orange-500/20 rounded-full border-dashed"
                  />
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-orange-500/10 border-2 border-orange-500/40 flex items-center justify-center relative shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                    <Shield className="text-orange-500 w-12 h-12 md:w-16 md:h-16" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-ping" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-none">
                    Arknights <span className="text-orange-500">Monopoly</span>
                  </h1>
                  <p className="text-zinc-500 font-mono text-[10px] md:text-xs tracking-[0.4em] uppercase">Strategic Tactical Deployment Interface</p>
                </div>
              </div>

              {/* Responsive Operations Console */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {/* Solo Operation - Primary */}
                <div className="md:col-span-2 lg:col-span-1">
                  <button 
                    onClick={() => {
                      setGameState(prev => ({ ...prev, gameMode: 'SINGLEPLAYER' }));
                      setShowCharacterSelect(true);
                    }}
                    className="group relative w-full h-full overflow-hidden p-4 md:p-6 bg-orange-500/90 hover:bg-orange-500 text-black rounded-2xl transition-all flex flex-col items-center justify-center gap-3 md:gap-4 shadow-xl active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    <Play className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block text-base md:text-lg font-black uppercase italic tracking-widest leading-tight">Solo Operation</span>
                      <span className="text-[9px] md:text-[10px] font-bold opacity-70 uppercase tracking-tighter">Local AI Mission Protocol</span>
                    </div>
                  </button>
                </div>

                {/* Network Operations Card */}
                <div className="flex flex-col gap-3 p-5 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Network Status: {isConnected ? 'ONLINE' : 'ESTABLISHING...'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleHost}
                      className="w-full py-4 bg-zinc-800/80 border border-zinc-700 text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-700 hover:border-zinc-500 transition-all flex items-center justify-center gap-3"
                    >
                      <Wifi className="w-5 h-5" /> Host Link
                    </button>
                    <button 
                      onClick={() => setShowJoinRoom(true)}
                      className="w-full py-4 bg-zinc-800/80 border border-zinc-700 text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-700 hover:border-zinc-500 transition-all flex items-center justify-center gap-3"
                    >
                      <Users className="w-5 h-5" /> Join Link
                    </button>
                  </div>
                </div>

                {/* System Utilities Card */}
                <div className="flex flex-col gap-3 p-5 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl">
                  {/* Doctor Profile Mini-panel */}
                  <div 
                    className="flex items-center gap-3 p-2 bg-black/40 rounded-xl border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition-all group"
                    onClick={() => setShowProfile(true)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden relative">
                      <img 
                        src={AVATARS.find(a => a.id === profile.avatarId)?.url || AVATARS[0].url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-black text-zinc-500 uppercase truncate">{profile.name || 'IDENTIFY DOCTOR'}</p>
                        <span className="text-[7px] px-1 bg-orange-500/20 text-orange-500 rounded-sm font-black italic">LV.{profile.level || 1}</span>
                      </div>
                      <p className="text-[7px] text-zinc-600 font-mono mt-0.5">AUTH_ID: RI-PRTS-{profile.email.split('@')[0].toUpperCase() || 'SYS'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setShowProfile(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700">
                      <User className="w-4 h-4 text-zinc-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Dossier</span>
                    </button>
                    <button onClick={() => setShowArchives(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700">
                      <TrendingUp className="w-4 h-4 text-zinc-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Archives</span>
                    </button>
                    <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700">
                      <Settings className="w-4 h-4 text-zinc-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Terminal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Atmosphere Interface - Desktop Only Horizontal Bar */}
              <div className="w-full p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Atmospheric Signal</span>
                    <span className="text-xs font-black uppercase tracking-tight text-white">{LOBBY_MUSIC_METADATA[currentMusicIndex]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={prevMusic} className="p-2 text-zinc-500 hover:text-white transition-colors"><SkipBack className="w-5 h-5" /></button>
                  <button onClick={nextMusic} className="p-2 text-zinc-500 hover:text-white transition-colors"><SkipForward className="w-5 h-5" /></button>
                </div>
              </div>
              {/* Multiplayer Quick Actions - Bottom Centered */}
              <div className="w-full max-w-2xl flex flex-col md:flex-row gap-3">
                <button 
                  onClick={handleQueue}
                  disabled={isQueuing}
                  className={`flex-1 py-3 bg-zinc-900/60 border border-zinc-800 text-zinc-400 font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2 text-xs shadow-lg ${isQueuing ? 'opacity-50' : ''}`}
                >
                  {isQueuing ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Globe className="w-4 h-4" />}
                  {isQueuing ? 'Searching for Signals...' : 'Standard Deployment Queue'}
                </button>

                {localStorage.getItem('arknights_monopoly_active_session') && !gameState.roomId && (
                  <button 
                    onClick={handleRejoinSector}
                    className="flex-1 py-3 bg-orange-500/10 border border-orange-500/50 text-orange-500 font-black uppercase italic tracking-widest rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 text-xs animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                  >
                    <History className="w-4 h-4" /> Emergency Rejoin
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="char-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="z-10 w-full flex flex-col h-full max-h-full overflow-hidden relative"
            >
              {/* Mission Start Countdown Overlay */}
              <AnimatePresence>
                {missionCountdown !== null && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl pointer-events-none"
                  >
                    <div className="text-sm font-black text-orange-500 uppercase tracking-[1em] mb-4 animate-pulse">DEPLOYMENT IMMINENT</div>
                    <div className="text-[12rem] font-black italic text-white drop-shadow-[0_0_50px_rgba(255,140,0,0.6)] leading-none">
                      {missionCountdown}
                    </div>
                    <div className="mt-8 px-10 py-3 bg-orange-500 text-black text-lg font-black uppercase italic tracking-[0.3em] skew-x-[-15deg] shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                      Synchronizing Tactical Data
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tactical Header */}
              <div className={`flex items-center justify-between border-b-2 border-zinc-800 pb-3 gap-6 shrink-0 bg-zinc-950/50 p-4 rounded-t-2xl ${previewOperator ? 'hidden lg:flex' : 'flex'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500 flex items-center justify-center rounded-lg skew-x-[-10deg] shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                    <Shield className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                      Operator <span className="text-orange-500 underline decoration-2 underline-offset-4">Identification</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Protocol: STABLE-V7</span>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <div className="flex items-center gap-1.5">
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Node: {isConnected ? 'Active' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {gameState.roomId && (
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Sector Code</div>
                      <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded border border-zinc-800">
                        <code className="text-sm font-mono text-orange-500 font-bold tracking-[0.2em]">{gameState.roomId}</code>
                        <button onClick={copyRoomId} className="text-zinc-600 hover:text-orange-400 transition-colors">
                          {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="h-10 w-px bg-zinc-800" />
                    
                    <div className="flex flex-col items-start min-w-[120px]">
                      <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Squad Presence</div>
                      <div className="flex -space-x-2">
                        {gameState.players.map(p => (
                          <div key={p.id} className={`w-8 h-8 rounded-full border-2 overflow-hidden bg-zinc-900 transition-all ${p.operator ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-zinc-800'}`} title={p.name}>
                            <img src={AVATARS.find(a => a.id === p.avatarId)?.url || AVATARS[0].url} alt={p.name} className={`w-full h-full object-cover ${p.operator ? '' : 'grayscale opacity-50'}`} />
                          </div>
                        ))}
                        {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-800 border-dashed bg-zinc-900/30 flex items-center justify-center">
                            <Users className="w-3 h-3 text-zinc-800" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {gameState.isHost ? (
                      <button 
                        onClick={() => socket?.emit('start-game', gameState.roomId)}
                        disabled={gameState.players.length < 2 || !gameState.players.every(p => p.operator !== null)}
                        className={`px-6 py-2.5 rounded-lg flex items-center gap-3 transition-all font-black text-xs tracking-widest uppercase italic shadow-2xl ${
                          gameState.players.length >= 2 && gameState.players.every(p => p.operator !== null)
                            ? 'bg-orange-500 text-black hover:bg-orange-400 hover:scale-[1.05] active:scale-95' 
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Play className="w-4 h-4" /> Start Operation
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-500 text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Awaiting Directive
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowProfile(true)}
                    className="w-10 h-10 flex flex-col items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-[5px] font-black uppercase">Dossier</span>
                  </button>
                  <button 
                    onClick={() => setShowArchives(true)}
                    className="w-10 h-10 flex flex-col items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[5px] font-black uppercase">Archive</span>
                  </button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="w-10 h-10 flex flex-col items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-[5px] font-black uppercase">Terminal</span>
                  </button>

                  <div className="w-px h-6 bg-zinc-800 mx-1" />

                  <button 
                    onClick={() => {
                      if (gameState.roomId && socket) socket.emit('leave-room', gameState.roomId);
                      setShowCharacterSelect(false);
                      setPreviewOperator(null);
                      setGameState(prev => ({ ...prev, gameMode: null, roomId: null, isHost: false, players: [] }));
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-600 hover:text-white transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Selection Area - Split Pane */}
              <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden mt-4 p-4 lg:p-0 relative">
                {/* Left: Interactive Grid */}
                <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                  <div className="grid grid-cols-6 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 pb-8">
                    {OPERATORS.map((op) => {
                      const selectingPlayer = gameState.players.find(p => {
                        const pOpName = typeof p.operator === 'string' ? p.operator : p.operator?.name;
                        return pOpName === op.name;
                      });
                      const isSelected = !!selectingPlayer;
                      const isPreview = previewOperator?.name === op.name;
                      const isMySelection = selectingPlayer && selectingPlayer.id === socket?.id;
                      
                      return (
                        <motion.div
                          key={op.name}
                          whileHover={!isSelected || isMySelection ? { y: -5, scale: 1.02 } : {}}
                          onClick={() => (!isSelected || isMySelection) && setPreviewOperator(op)}
                          className={`group relative aspect-[3/4.2] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 ${
                            isSelected && !isMySelection 
                              ? 'border-zinc-900 grayscale opacity-40' 
                              : isPreview 
                                ? 'border-orange-500 ring-4 ring-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.4)]' 
                                : isMySelection
                                  ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
                          <img 
                            src={op.portrait} 
                            alt={op.name} 
                            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelected && !isMySelection ? 'grayscale' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Operator Metadata */}
                          <div className="absolute bottom-0 left-0 w-full p-2.5 z-20">
                            <div className="text-[7px] font-mono text-orange-500 font-bold tracking-widest uppercase mb-0.5">{op.title}</div>
                            <div className="text-sm font-black italic uppercase tracking-tighter leading-none group-hover:text-orange-500 transition-colors">{op.name}</div>
                          </div>
                          
                          {/* Class Indicator Overlay */}
                          <div className="absolute top-2 right-2 flex flex-col items-center gap-1 z-20">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: op.color }} />
                            {isPreview && <motion.div layoutId="selection-glow" className="absolute -inset-1 border border-orange-500 rounded-full animate-ping" />}
                          </div>

                          {/* Status Overlays */}
                          {isSelected && (
                            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
                              {isMySelection ? (
                                <div className="animate-in zoom-in duration-300">
                                  <div className="bg-green-500 text-black px-3 py-1 text-[10px] font-black uppercase italic tracking-widest skew-x-[-10deg] shadow-lg">Deployed</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="bg-red-600 text-white px-3 py-0.5 text-[8px] font-black uppercase tracking-widest border border-red-400">Locked</div>
                                  <div className="text-[10px] font-mono text-zinc-300 truncate w-full px-1">{selectingPlayer.name}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Intelligence Dossier */}
                <AnimatePresence mode="wait">
                  {previewOperator ? (
                        <motion.div 
                          key={previewOperator.name}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="w-full lg:w-[450px] shrink-0 bg-[#0d0d0d] lg:border-l border-zinc-800 flex flex-col shadow-2xl relative select-none z-[100] fixed inset-0 lg:relative lg:inset-auto h-[100dvh] lg:h-[calc(100vh-120px)] lg:rounded-2xl lg:m-4 overflow-hidden"
                        >
                      {/* Dossier Background Decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
                      
                      {/* 1. Header Area - Fixed */}
                      <div className="flex-none p-3 lg:p-6 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between z-20">
                        <div>
                          <div className="hidden lg:block text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-1">Intelligence File</div>
                          <h3 className="text-2xl lg:text-4xl font-black italic tracking-tighter uppercase leading-none">{previewOperator.name} <span className="lg:hidden text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-2">[{previewOperator.title}]</span></h3>
                          <div className="hidden lg:block text-xs font-mono text-zinc-500 mt-1 uppercase tracking-widest">{previewOperator.title}</div>
                        </div>
                        <div className="w-8 h-8 lg:w-12 lg:h-12 bg-zinc-950 border border-zinc-800 rounded-lg lg:rounded-xl p-1 shrink-0">
                          <div className="w-full h-full rounded-md lg:rounded-lg" style={{ backgroundColor: previewOperator.color }} />
                        </div>
                      </div>

                      {/* 2. Scrollable Body Area - Portrait & Details */}
                      <div className="flex-1 overflow-y-auto p-3 lg:p-6 no-scrollbar">
                        <div className="flex flex-col lg:flex-col gap-3 lg:gap-8">
                          <div className="flex flex-row lg:flex-col gap-4">
                            {/* Portrait Preview - Dynamic height constraint */}
                            <div className="aspect-[3/4] lg:aspect-[4/5] w-28 md:w-40 lg:w-full h-auto lg:max-h-[500px] rounded-xl lg:rounded-2xl overflow-hidden border border-zinc-800 shadow-inner bg-zinc-950 relative group/portrait shrink-0">
                              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
                              <img 
                                src={previewOperator.portrait} 
                                alt={previewOperator.name} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            {/* Skill Intel & Summary - Side by Side on Mobile */}
                            <div className="flex-1 space-y-3">
                              <div className="p-3 lg:p-5 bg-zinc-900/50 rounded-xl lg:rounded-2xl border border-zinc-800/50 shadow-lg">
                                <div className="flex items-center gap-2 mb-1.5 text-orange-500">
                                  <Zap className="w-3.5 h-3.5 lg:w-5 lg:h-5 fill-orange-500/20" />
                                  <span className="text-[10px] lg:text-sm font-black uppercase tracking-widest lg:tracking-[0.2em]">Passive: {previewOperator.skill.name}</span>
                                </div>
                                <p className="text-[11px] lg:text-base text-zinc-300 leading-tight lg:leading-relaxed font-medium italic opacity-90">{previewOperator.skill.description}</p>
                              </div>
                              
                              <div className="p-3 lg:p-5 border-l-2 lg:border-l-4 border-orange-500/50 bg-zinc-900/20 rounded-r-xl lg:rounded-r-2xl">
                                <div className="text-[8px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 opacity-60">Dossier Summary</div>
                                <p className="text-[10px] lg:text-sm text-zinc-400 font-medium italic leading-tight lg:leading-relaxed">"{previewOperator.description}"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Footer Area - Sticky Buttons - Increased safety padding for mobile */}
                      <div className="flex-none p-4 pb-16 md:pb-12 lg:p-6 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                        <div className="flex flex-row lg:flex-col gap-2 lg:gap-4">
                          {(() => {
                            const isSelectedByOther = selectedOperators.includes(previewOperator.name) && 
                              !gameState.players.find(p => (p.id === socket?.id || (gameState.gameMode === 'SINGLEPLAYER' && p.id === 'player-1')) && (typeof p.operator === 'string' ? p.operator : p.operator?.name) === previewOperator.name);
                            
                            return (
                              <button 
                                onClick={() => startGame(previewOperator)}
                                disabled={isSelectedByOther}
                                className={`w-full py-5 font-black uppercase italic tracking-[0.2em] rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3 overflow-hidden relative group/confirm ${
                                  isSelectedByOther 
                                    ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed' 
                                    : 'bg-orange-500 text-black hover:bg-orange-400 hover:scale-[1.02] active:scale-95'
                                }`}
                              >
                                {!isSelectedByOther && (
                                  <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
                                )}
                                <Shield className="w-5 h-5 lg:w-6 lg:h-6" />
                                <span className="text-sm lg:text-lg">
                                  {isSelectedByOther ? 'Deployed' : 'Confirm'}
                                </span>
                              </button>
                            );
                          })()}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewOperator(null);
                            }}
                            className="w-[45%] lg:w-full py-4 bg-transparent border border-zinc-700/50 text-zinc-400 text-[10px] md:text-xs font-black uppercase italic tracking-[0.1em] lg:tracking-[0.3em] rounded-2xl hover:bg-zinc-800 hover:text-white hover:border-zinc-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4 lg:hidden" />
                            <span className="truncate">Return</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty-dossier"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hidden lg:flex w-[400px] bg-zinc-900/30 border-l border-zinc-800 flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center mb-6">
                        <Users className="w-8 h-8 text-zinc-800" />
                      </div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter text-zinc-600">No Intelligence Selected</h4>
                      <p className="text-zinc-700 text-xs mt-2 italic font-medium">Please select an operator from the grid to review tactical dossier details.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
) : (
          <div className="h-full w-full overflow-hidden relative flex flex-col landscape:flex-row">
       {/* Futuristic Grid Background */}
       <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
              style={{ backgroundImage: 'radial-gradient(#ff8c00 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Mobile-Only Action Cluster (Bottom Right) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3 pointer-events-none">
        {/* Dynamic Action Zone (Buy/Auction) */}
        <AnimatePresence>
          {isLocalTurn && gameState.gameStarted && !gameState.winner && !localPlayer?.isBankrupt && gameState.hasRolled && !gameState.activeAuction && currentPlayer && ['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tiles[currentPlayer.position].type) && !tiles[currentPlayer.position].ownerId && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-2 pointer-events-auto"
            >
              <button
                onClick={buyProperty}
                disabled={(currentPlayer?.orundum || 0) < (tiles[currentPlayer.position].cost || 0)}
                className="w-32 py-2 bg-orange-500 text-black text-[10px] font-black uppercase italic tracking-widest rounded-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Package className="w-4 h-4" /> Acquire
              </button>
              <button
                onClick={() => startAuction(currentPlayer.position)}
                className="w-32 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase italic tracking-widest rounded-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <TrendingUp className="w-4 h-4" /> Auction
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Actions (Roll/End Turn) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {gameState.gameStarted && !gameState.winner && !localPlayer?.isBankrupt && (
            <>
              {isLocalTurn && (!gameState.hasRolled || gameState.canRollAgain) ? (
                <button
                  onClick={rollDice}
                  disabled={gameState.isRolling}
                  className="w-16 h-16 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-90"
                >
                  {gameState.isRolling ? <Loader2 className="w-8 h-8 animate-spin" /> : <Zap className="w-8 h-8 fill-current" />}
                </button>
              ) : isLocalTurn && gameState.hasRolled && !gameState.canRollAgain && (
                <button
                  onClick={nextTurn}
                  className="w-16 h-16 rounded-full bg-zinc-100 text-black flex items-center justify-center shadow-lg transition-all active:scale-90"
                >
                  <LogOut className="w-8 h-8" />
                </button>
              )}
            </>
          )}
          
          <button
            onClick={() => setShowChat(!showChat)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showChat ? 'bg-orange-500 text-black shadow-lg' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
          >
            <MessageSquare className="w-6 h-6" />
            {chatHistory.length > 0 && !showChat && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">!</div>
            )}
          </button>
          
          {gameState.gameStarted && !gameState.winner && localPlayer && (
            localPlayer.isBankrupt ? (
              <button
                onClick={() => {
                  if (socket && gameState.roomId) socket.emit('leave-room', gameState.roomId);
                  resetGame();
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse"
                title="EXIT SECTOR"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={() => setShowForfeitConfirm(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-red-900/40 text-red-500 border border-red-500/30 shadow-lg"
                title="TACTICAL ABORT"
              >
                <ShieldAlert className="w-6 h-6" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Utility Cluster (Top Right - Mobile Only) */}
      <div className="lg:hidden fixed top-6 right-6 z-[200] flex flex-col gap-3">
        <button
          onClick={() => setShowMobileTeam(!showMobileTeam)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showMobileTeam ? 'bg-orange-500 text-black shadow-lg' : 'bg-zinc-900/50 backdrop-blur-md text-zinc-400 border border-zinc-800'}`}
        >
          <Users className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowMobileLog(!showMobileLog)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showMobileLog ? 'bg-orange-500 text-black shadow-lg' : 'bg-zinc-900/50 backdrop-blur-md text-zinc-400 border border-zinc-800'}`}
        >
          <ScrollText className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowMobileReport(!showMobileReport)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showMobileReport ? 'bg-orange-500 text-black shadow-lg' : 'bg-zinc-900/50 backdrop-blur-md text-zinc-400 border border-zinc-800'}`}
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* PC Command Hub (Desktop Sidebar) */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-[200] flex-col gap-4 py-6 px-3 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all select-none">
        <button
          onClick={() => setShowMobileTeam(!showMobileTeam)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${showMobileTeam ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700'}`}
          title="Team Info"
        >
          <Users className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowMobileLog(!showMobileLog)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${showMobileLog ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700'}`}
          title="Mission Log"
        >
          <ScrollText className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowMobileReport(!showMobileReport)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${showMobileReport ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700'}`}
          title="Intelligence Report"
        >
          <Search className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 relative ${showChat ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700'}`}
          title="Tactical Comms"
        >
          <MessageSquare className="w-6 h-6" />
          {chatHistory.length > 0 && !showChat && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950">
              !
            </div>
          )}
        </button>
        <div className="w-full h-px bg-zinc-800 my-2" />
        <button
          onClick={() => setShowForfeitConfirm(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-red-900/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white"
          title="Tactical Abort"
        >
          <ShieldAlert className="w-6 h-6" />
        </button>
      </div>

      {/* Chat System */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 landscape:bottom-2 landscape:right-24">
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: -100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.95 }}
              className="fixed bottom-6 lg:bottom-10 left-6 lg:left-10 z-[250] w-[calc(100%-48px)] lg:w-80 h-[50vh] lg:h-auto lg:min-h-[400px] lg:max-h-[600px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-lg lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Tactical Transmission</span>
                </div>
                <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-white">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
                {(chatHistory || []).map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.senderId === socket?.id ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full border border-zinc-800 overflow-hidden shrink-0 bg-zinc-900 mt-1">
                      <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className={`flex flex-col ${msg.senderId === socket?.id ? 'items-end' : 'items-start'} max-w-[80%]`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black uppercase text-zinc-500">{msg.senderName}</span>
                        <span className="text-[8px] text-zinc-600 font-mono">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-sm text-xs ${msg.senderId === socket?.id ? 'bg-orange-500 text-black font-medium' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                        {msg.text || 'ERROR: MESSAGE CONTENT MISSING'}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-orange-500 text-black rounded-sm hover:bg-orange-400 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2 flex items-center justify-around z-[100] landscape:hidden">
        <button 
          onClick={() => setActiveTab('board')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'board' ? 'text-orange-500' : 'text-zinc-500'}`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Board</span>
        </button>
        <button 
          onClick={() => setActiveTab('players')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'players' ? 'text-orange-500' : 'text-zinc-500'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Team</span>
        </button>
        <button 
          onClick={() => setActiveTab('log')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'log' ? 'text-orange-500' : 'text-zinc-500'}`}
        >
          <ScrollText className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Log</span>
        </button>
        <button 
          onClick={() => setActiveTab('property')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'property' ? 'text-orange-500' : 'text-zinc-500'}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Assets</span>
        </button>
      </div>

      <AnimatePresence>
        {showMobileTeam && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed lg:fixed left-0 lg:left-10 top-0 lg:top-10 bottom-0 lg:bottom-10 w-80 lg:h-auto z-[250] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 landscape:border-y-0 landscape:border-l-0 landscape:border-r p-6 rounded-2xl landscape:rounded-none shadow-2xl flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="text-orange-500 w-6 h-6" />
                <h1 className="text-xl font-black tracking-tighter uppercase italic">Rhodes Island</h1>
              </div>
              <button 
                className="text-zinc-500 hover:text-white transition-colors" 
                onClick={() => setShowMobileTeam(false)}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {gameState.roomId && (
              <div className="p-3 bg-zinc-800/50 border border-zinc-800 rounded flex flex-col gap-1">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sector ID</div>
                <div className="text-xl font-mono font-bold text-orange-500 tracking-widest">{gameState.roomId}</div>
              </div>
            )}

            <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1">
          {gameState.players.map((p, i) => (
            <div 
              key={p.id}
              className={`p-3 rounded-lg border transition-all relative flex flex-col gap-3 ${p.isBankrupt ? 'border-red-900/40 bg-red-950/10' : i === gameState.currentPlayerIndex ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'border-zinc-800 bg-zinc-800/20'}`}
            >
              {(p.isBankrupt || p.status === 'DISCONNECTED' || p.status === 'LEFT' || p.status === 'FORFEITED') && (
                <div className={`absolute inset-0 z-10 ${p.isBankrupt || p.status === 'FORFEITED' ? 'bg-red-950/40' : 'bg-zinc-950/40'} backdrop-blur-[1px] flex items-center justify-center pointer-events-none`}>
                  <div className={`border-2 ${p.isBankrupt || p.status === 'FORFEITED' ? 'border-red-500' : 'border-zinc-500'} px-3 py-0.5 rotate-[-15deg] shadow-[0_0_15px_rgba(239,68,68,0.3)]`}>
                    <span className={`${p.isBankrupt || p.status === 'FORFEITED' || p.status === 'LEFT' ? 'text-red-500' : 'text-zinc-500'} font-black italic text-sm tracking-tighter uppercase font-mono`}>
                      {(p.status === 'FORFEITED' || p.status === 'LEFT' || p.isBankrupt) ? 'Terminated' : 'Signal Lost'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Operator Identity & Finance Row */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1 shrink-0">
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-900 overflow-hidden bg-zinc-900 shadow-lg relative z-20">
                    <img src={p.avatar.url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="w-10 h-10 overflow-hidden relative z-10 translate-y-0.5">
                    <img 
                      src={`/Resources/Characters/Icon/${p.isBankrupt ? 'Dead' : 'Alive'}/${
                        p.operator.name === 'Exusiai' ? 'Exusia' : 
                        p.operator.name === "Ch'en" ? (p.isBankrupt ? "Ch'en" : "Chen") : 
                        p.operator.name
                      } ${p.isBankrupt ? 'Dead' : 'Alive'}.png`} 
                      alt={p.isBankrupt ? 'Terminated' : 'Active'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-black text-[11px] uppercase italic tracking-tight truncate">{p.name}</span>
                    </div>
                    {i === gameState.currentPlayerIndex && !p.isBankrupt && (
                      <div className="flex items-center gap-1">
                        <History className="w-2.5 h-2.5 text-orange-500 animate-pulse" />
                        <span className={`text-[10px] font-black font-mono ${gameState.turnTimer <= 10 ? 'text-red-500' : 'text-orange-500'}`}>
                          {gameState.turnTimer}s
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-sm">
                      <Coins className="w-2.5 h-2.5 text-orange-500" />
                      <span className="text-orange-500 font-mono text-[9px] font-black">{p.orundum}</span>
                    </div>
                    <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div className="h-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" style={{ width: `${Math.min(100, (p.orundum / STARTING_ORUNDUM) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {p.id !== localPlayer?.id && !p.isBankrupt && (
                  <button
                    onClick={() => startTrade(p.id)}
                    className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-500 hover:bg-orange-500 hover:text-black transition-all active:scale-90"
                    title="Initiate Negotiation"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Enhanced Territory Section */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-2.5 h-2.5" /> Sector Control
                  </div>
                  <div className="text-[8px] font-mono text-zinc-600">{(p.properties || []).length} Units</div>
                </div>
                
                {(p.properties || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {/* Simplified Property List for Mobile/Sidebar */}
                    {tiles
                      .filter(t => (p.properties || []).includes(t.id))
                      .map(t => {
                        const isSelected = gameState.selectedTileId === t.id;
                        return (
                          <button 
                            key={t.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setGameState(prev => ({ ...prev, selectedTileId: t.id }));
                              setShowPropertyModal(true);
                            }}
                            className={`group/tile px-2 py-1 rounded border transition-all flex items-center gap-2 ${t.isMortgaged ? 'opacity-50 grayscale' : isSelected ? 'border-white bg-white/10 ring-1 ring-white/20' : 'border-white/5 bg-zinc-900/50 hover:border-white/20'}`}
                            style={{ 
                              borderLeft: `3px solid ${t.color || '#333'}`,
                            }}
                          >
                            <span className={`text-[8px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-400 group-hover/tile:text-zinc-200'}`}>
                              {t.name}
                            </span>
                            {t.dorms > 0 && (
                              <div className="flex gap-0.5">
                                {Array.from({ length: t.dorms }).map((_, idx) => (
                                  <div key={idx} className="w-1 h-1 bg-white/50 rounded-full" />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-2 border border-dashed border-zinc-800 rounded bg-zinc-900/10 flex items-center justify-center">
                    <span className="text-[7px] text-zinc-700 uppercase font-bold italic tracking-widest">No Operational Assets</span>
                  </div>
                )}
              </div>

              {/* Intelligence Summary (Skills) */}
              {p.operator.skill && (
                <div className="pt-2 border-t border-zinc-800/50 flex items-start gap-2">
                  <Zap className="w-3 h-3 text-white/20 shrink-0 mt-0.5" />
                  <div className="text-[8px] text-zinc-500 italic leading-snug line-clamp-2">
                    {p.operator.skill.description}
                  </div>
                </div>
              )}
            </div>
          ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileLog && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed lg:fixed right-0 lg:right-10 top-0 lg:top-10 bottom-0 lg:bottom-10 w-80 lg:w-96 lg:h-auto z-[250] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 landscape:border-y-0 landscape:border-r-0 landscape:border-l p-6 rounded-2xl landscape:rounded-none shadow-2xl flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="w-3 h-3" /> Mission Log
              </div>
              <button className="text-zinc-500 hover:text-white transition-colors" onClick={() => setShowMobileLog(false)}>
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 no-scrollbar">
              {gameState.log.map((entry, i) => (
                <div key={i} className="text-xs text-zinc-400 font-mono border-l-2 border-zinc-800 pl-3 py-2 bg-zinc-900/50 rounded-r">
                  {entry}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Game Area */}
      <div ref={containerRef} className={`flex-1 relative flex items-center justify-center p-2 lg:p-8 overflow-hidden landscape:p-0 ${activeTab === 'board' ? 'flex' : 'hidden lg:flex landscape:flex'}`}>
        {/* Tactical Grid Background */}
        {settings.showGrid && (
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#ff8c00 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        )}
        {/* Monopoly Board */}
        <LayoutGroup>
          {!gameState.players.length || !currentPlayer || (!localPlayer && gameState.gameMode !== 'SINGLEPLAYER') ? (
            <div className="relative z-10 w-[490px] h-[490px] bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col items-center justify-center gap-4 overflow-hidden">
               {/* Background scanning effect */}
               <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(249,115,22,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan opacity-20" />
               <Loader2 className="w-12 h-12 animate-spin text-orange-500 opacity-40 shadow-[0_0_20px_rgba(249,115,22,0.2)]" />
               <div className="text-center relative z-10">
                 <p className="text-orange-500 font-black uppercase italic tracking-widest text-xs">Operation Re-Syncing...</p>
                 <p className="text-zinc-500 font-bold uppercase text-[8px] mt-1 tracking-tighter">Establishing Tactical Link via PRTS</p>
               </div>
            </div>
          ) : (
            <div 
              className="relative z-10 shadow-2xl rounded-sm w-[490px] h-[490px] origin-center transition-transform duration-500 overflow-hidden"
              style={{ 
                backgroundImage: `url("${MAP_IMAGE_URL}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `scale(${boardScale})`
              }}
            >
          {/* Top Row */}
          <div className="flex">
            {renderTile(tiles[20], 'corner')}
            {[21, 22, 23, 24, 25, 26, 27, 28, 29].map(id => renderTile(tiles[id], 'top'))}
            {renderTile(tiles[30], 'corner')}
          </div>
          
          <div className="flex justify-between">
            {/* Left Column */}
            <div className="flex flex-col-reverse">
              {[11, 12, 13, 14, 15, 16, 17, 18, 19].map(id => renderTile(tiles[id], 'left'))}
            </div>

            {/* Center Area */}
            <div className="w-[360px] h-[360px] flex flex-col items-center justify-between py-4 relative overflow-hidden">
              <div className="z-10 text-center mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={gameState.message}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xl font-black italic uppercase tracking-tighter text-orange-500 mb-1 max-w-[300px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  >
                    {gameState.message}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="z-10 flex flex-col items-center gap-3 mb-2">
                <div className="flex gap-4 justify-center items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sector Dice</div>
                    <div className="flex gap-2 mb-2 p-2 bg-black/40 rounded-lg border border-orange-500/30 backdrop-blur-sm min-h-[72px] items-center justify-center">
                      {gameState.isRolling ? (
                        <RollingDiceAnimation />
                      ) : (
                        <>
                          <Dice value={gameState.dice[0]} theme="lungmen" diceIndex={0} />
                          <Dice value={gameState.dice[1]} theme="rhode_island" diceIndex={1} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-center min-h-[40px]">
                  {isLocalTurn && !currentPlayer?.isAI ? (
                    <>
                      <div className="hidden lg:flex gap-1 justify-center flex-wrap max-w-[300px]">
                        {currentPlayer?.inJail && !gameState.hasRolled && (
                          <>
                            <button
                              onClick={payJailFee}
                              disabled={(currentPlayer?.orundum || 0) < JAIL_FEE}
                              className="px-2 py-1 bg-zinc-900 border border-red-500 text-red-500 text-[9px] font-black uppercase italic tracking-widest rounded-sm hover:bg-red-500/10 disabled:opacity-50 transition-all flex items-center gap-1 shadow-lg shadow-red-500/10"
                            >
                              <ShieldAlert className="w-3 h-3" /> Bail ({JAIL_FEE})
                            </button>
                            {currentPlayer?.hasGetOutOfJailFreeCard && (
                              <button
                                onClick={() => {
                                  const updatedPlayers = gameState.players.map(p => 
                                    p.id === currentPlayer?.id ? { ...p, inJail: false, jailTurns: 0, hasGetOutOfJailFreeCard: false } : p
                                  );
                                  setGameState(prev => ({ ...prev, players: updatedPlayers, message: `${currentPlayer?.name} used a card to leave detention!` }));
                                  addToLog(`${currentPlayer?.name} used a card to leave detention.`);
                                }}
                                className="px-2 py-1 bg-zinc-900 border border-blue-500 text-blue-500 text-[9px] font-black uppercase italic tracking-widest rounded-sm hover:bg-blue-500/10 transition-all flex items-center gap-1 shadow-lg shadow-blue-500/10"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Use Card
                              </button>
                            )}
                          </>
                        )}

                        {/* Mobile Side-bar Proxy controls - Hidden by default, desktop only */}
                        <div className="hidden lg:flex flex-col items-center gap-1">
                          <button
                            onClick={rollDice}
                            disabled={!isLocalTurn || gameState.isRolling || (gameState.hasRolled && !gameState.canRollAgain) || !!gameState.winner}
                            className="px-4 py-2.5 bg-orange-500 text-black text-[11px] font-black uppercase italic tracking-widest rounded hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1.5 shadow-xl shadow-orange-500/20"
                          >
                            {gameState.isRolling ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Zap className="w-4 h-4 fill-black" />}
                            {gameState.canRollAgain ? 'Roll Again' : 'Roll Dice'}
                          </button>
                        </div>
                        
                        {currentPlayer && ['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tiles[currentPlayer.position].type) && !tiles[currentPlayer.position].ownerId && !gameState.activeAuction && (
                          <>
                            <button
                              onClick={buyProperty}
                              disabled={!isLocalTurn || (currentPlayer?.orundum || 0) < (tiles[currentPlayer.position].cost || 0) || !gameState.hasRolled}
                              className="px-3 py-2 border border-orange-500 text-orange-500 text-[10px] font-black uppercase italic tracking-widest rounded hover:bg-orange-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/10"
                            >
                              <Package className="w-3.5 h-3.5" /> Acquire
                            </button>
                            <button
                              onClick={() => startAuction(currentPlayer.position)}
                              disabled={!isLocalTurn || !gameState.hasRolled}
                              className="px-3 py-2 border border-zinc-700 text-zinc-400 text-[10px] font-black uppercase italic tracking-widest rounded hover:bg-zinc-800 disabled:opacity-30 transition-all flex items-center gap-1.5"
                            >
                              <TrendingUp className="w-3.5 h-3.5" /> Auction
                            </button>
                          </>
                        )}

                        <button
                          onClick={nextTurn}
                          disabled={!isLocalTurn || gameState.isRolling || !gameState.hasRolled || gameState.canRollAgain || !!gameState.winner || (currentPlayer?.orundum || 0) < 0}
                          className="px-3 py-2 border border-zinc-100 text-zinc-100 text-[10px] font-black uppercase italic tracking-widest rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          <LogOut className="w-3.5 h-3.5" /> End Turn
                        </button>

                         {currentPlayer && currentPlayer.orundum < 0 && (
                           <button
                             onClick={() => isLocalTurn && handleBankruptcy(currentPlayer)}
                             className="px-2 py-1 bg-red-600 text-white text-[9px] font-black uppercase italic tracking-widest rounded-sm hover:bg-red-500 transition-all flex items-center gap-1 shadow-xl shadow-red-500/20"
                           >
                            <AlertTriangle className="w-3 h-3" /> Bankrupt
                          </button>
                        )}
                      </div>

                      <div className="flex gap-1 justify-center mt-2 flex-wrap max-w-[300px]">
                        {gameState.players.filter(p => p.id !== localPlayer?.id && !p.isBankrupt).map(p => (
                          <button
                            key={p.id}
                            onClick={() => startTrade(p.id)}
                            className="px-1 py-0.5 border border-zinc-700 bg-zinc-900/50 text-zinc-400 text-[6px] font-black uppercase rounded-sm hover:border-orange-500 hover:text-orange-500 transition-all flex items-center gap-0.5 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                          >
                            <ArrowLeftRight className="w-2 h-2" /> Trade: {p.name}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : isLocalTurn && currentPlayer?.isAI ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                       <div className="flex items-center gap-3 px-6 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                         <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-orange-500 uppercase italic tracking-widest leading-none">Tactical Processing</span>
                           <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter italic">AI Operation in Progress</span>
                         </div>
                       </div>
                    </div>
                  ) : null}
                </div>

              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              {[31, 32, 33, 34, 35, 36, 37, 38, 39].map(id => renderTile(tiles[id], 'right'))}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-row-reverse">
            {renderTile(tiles[0], 'corner')}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(id => renderTile(tiles[id], 'bottom'))}
            {renderTile(tiles[10], 'corner')}
          </div>
          </div>
          )}
        </LayoutGroup>
      </div>

  {/* Mobile Action Bar Removed - Replaced by Action Cluster Hub */}


      {/* Auction Modal */}
      <AnimatePresence>
        {gameState.activeAuction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-4 sm:p-6 md:p-10 rounded-xl md:rounded-2xl max-w-[320px] sm:max-w-md md:max-w-lg w-full max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl text-center"
            >
              <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter mb-2 flex items-center justify-center gap-3">
                <TrendingUp className="text-orange-500" /> Sector Auction
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${gameState.auctionTimer <= 5 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-orange-500/10 text-orange-500'}`}>
                  <History size={12} />
                  Time Remaining: {gameState.auctionTimer}s
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-6 uppercase font-bold">{tiles[gameState.activeAuction.tileId].name}</p>

              <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-800 mb-8">
                <div className="text-[10px] font-black text-zinc-500 uppercase mb-1">Current Highest Bid</div>
                <div className="text-4xl font-black text-orange-500 font-mono">
                  {gameState.activeAuction.highestBid} <span className="text-sm">Orundum</span>
                </div>
                {gameState.activeAuction.highestBidderId && (
                  <div className="mt-4 flex items-center justify-center gap-3 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="w-8 h-8 rounded-full border border-orange-500/50 overflow-hidden bg-zinc-900">
                      <img 
                        src={gameState.players.find(p => p.id === gameState.activeAuction?.highestBidderId)?.avatar?.url} 
                        alt="Highest Bidder" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Leading Bidder</div>
                      <div className="text-xs font-bold text-zinc-300">
                        {gameState.players.find(p => p.id === gameState.activeAuction?.highestBidderId)?.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <div className="text-[10px] font-black text-zinc-500 uppercase mb-3">Current Bidder</div>
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-800 overflow-hidden bg-zinc-900">
                      <img 
                        src={gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.avatar?.url} 
                        alt="Current Bidder" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900" style={{ backgroundColor: gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.color }} />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-lg italic uppercase tracking-tighter leading-none">
                      {gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.name}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono uppercase">
                      {gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.operator?.title}
                    </div>
                  </div>
                </div>
              </div>

              {!gameState.activeAuction?.biddingPlayerIds.includes(localPlayer?.id || '') && (
                <div className="flex flex-col gap-3 py-6 border-y border-zinc-800 my-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs font-black uppercase tracking-widest leading-none mb-1">Observation Mode</div>
                      <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight px-4">Withdrawal finalized. Monitoring sector auction results.</div>
                    </div>
                  </div>
                </div>
              )}

              {gameState.activeAuction?.biddingPlayerIds.includes(localPlayer?.id || '') && !gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.isAI && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    {[1, 10, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => placeBid(gameState.activeAuction!.highestBid + amt)}
                        disabled={!isAuctionTurn || gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction.currentPlayerIndex])!.orundum < gameState.activeAuction!.highestBid + amt}
                        className="flex-1 py-2 bg-zinc-800 border border-zinc-700 text-orange-500 text-xs font-black rounded hover:bg-orange-500/10 disabled:opacity-30 transition-all"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={skipBid}
                    disabled={!isAuctionTurn}
                    className="w-full py-3 border-2 border-zinc-700 text-zinc-400 font-black uppercase italic tracking-widest rounded-sm hover:bg-zinc-800 transition-all disabled:opacity-30"
                  >
                    Pass
                  </button>
                </div>
              )}
              
              {gameState.players.find(p => p.id === gameState.activeAuction?.biddingPlayerIds[gameState.activeAuction?.currentPlayerIndex || 0])?.isAI && (
                <div className="text-zinc-500 italic text-sm animate-pulse">
                  Operator is considering bid...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Property Detailed Modal */}
      <AnimatePresence>
        {showPropertyModal && gameState.selectedTileId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-[95vw] md:max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl md:rounded-2xl shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar"
            >
              {(() => {
                const tile = tiles[gameState.selectedTileId];
                const owner = gameState.players.find(p => p.id === tile.ownerId);
                const groupTiles = tiles.filter(t => t.group === tile.group);
                const ownsAll = owner && groupTiles.every(t => t.ownerId === owner.id);
                const currentRent = owner ? calculateRent(tile, owner) : (tile.rent || 0);
                const effectiveBuildCost = owner ? calculateBuildCost(tile, owner) : (tile.buildCost || 0);

                return (
                  <>
                    <div className="h-4 w-full" style={{ backgroundColor: tile.color || '#333' }} />
                    <div className="p-4 md:p-8">
                      <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div>
                          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{tile.name}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{tile.type}</span>
                            {tile.group && (
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                Sector: {tile.group}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowPropertyModal(false)}
                          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                        >
                          <XCircle className="w-8 h-8" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Ownership Status</label>
                            <div className="flex items-center gap-3">
                              {owner ? (
                                <>
                                  <div className="w-10 h-10 rounded-lg border-2 border-white/20 flex items-center justify-center overflow-hidden" style={{ backgroundColor: owner.color }}>
                                    <img src={owner.operator.portrait} alt={owner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-white">{owner.name}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase">Current Proprietor</div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-3 text-zinc-600 italic">
                                  <div className="w-10 h-10 rounded-lg border-2 border-zinc-800 flex items-center justify-center">
                                    <Package className="w-5 h-5" />
                                  </div>
                                  <span>Unclaimed Asset</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Financial Status</label>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded border border-zinc-800">
                                <span className="text-xs text-zinc-400">Mortgaged</span>
                                <span className={`text-xs font-bold uppercase ${tile.isMortgaged ? 'text-red-500' : 'text-green-500'}`}>
                                  {tile.isMortgaged ? 'Yes' : 'No'}
                                </span>
                              </div>
                              {tile.mortgage && (
                                <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded border border-zinc-800">
                                  <span className="text-xs text-zinc-400">Mortgage Value</span>
                                  <span className="text-xs font-bold text-orange-400">{tile.mortgage} Orundum</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Rent Schedule</label>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs py-1 border-b border-zinc-800">
                                <span className="text-zinc-500">Base Rent</span>
                                <span className="text-zinc-300">{tile.rent} Orundum</span>
                              </div>
                              {tile.type === 'PROPERTY' && (
                                <>
                                  <div className={`flex justify-between text-xs py-1 ${tile.dorms === 1 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                                    <span>1 Dorm</span>
                                    <span>{tile.dorm1}</span>
                                  </div>
                                  <div className={`flex justify-between text-xs py-1 ${tile.dorms === 2 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                                    <span>2 Dorms</span>
                                    <span>{tile.dorm2}</span>
                                  </div>
                                  <div className={`flex justify-between text-xs py-1 ${tile.dorms === 3 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                                    <span>3 Dorms</span>
                                    <span>{tile.dorm3}</span>
                                  </div>
                                  <div className={`flex justify-between text-xs py-1 ${tile.dorms === 4 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                                    <span>4 Dorms</span>
                                    <span>{tile.dorm4}</span>
                                  </div>
                                  <div className={`flex justify-between text-xs py-1 ${tile.dorms === 5 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                                    <span>Cmd Center</span>
                                    <span>{tile.cmdCtr}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between items-center mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <div className="text-[10px] font-black text-orange-500 uppercase leading-none">Current Rent</div>
                                <div className="text-xl font-black italic text-orange-500">{currentRent}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Bonuses & Effects */}
                      <div className="mt-8 pt-8 border-t border-zinc-800">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Active Intelligence & Bonuses</label>
                        <div className="grid grid-cols-1 gap-3">
                          {ownsAll && (
                            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              <div>
                                <div className="text-xs font-bold text-green-500 uppercase">Sector Dominance</div>
                                <div className="text-[10px] text-zinc-400">Full color set owned. 25% building discount applied.</div>
                              </div>
                            </div>
                          )}
                          {ownsAll && tile.dorms === 0 && (
                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <Zap className="w-5 h-5 text-blue-500" />
                              <div>
                                <div className="text-xs font-bold text-blue-500 uppercase">Strategic Monopoly</div>
                                <div className="text-[10px] text-zinc-400">Unimproved rent is doubled.</div>
                              </div>
                            </div>
                          )}
                          {ownsAll && tile.dorms && tile.dorms > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-orange-500" />
                              <div>
                                <div className="text-xs font-bold text-orange-500 uppercase">Improved Yield</div>
                                <div className="text-[10px] text-zinc-400">25% rent bonus applied to improved properties.</div>
                              </div>
                            </div>
                          )}
                          {owner?.operator.name === 'Hoshiguma' && (
                            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <Shield className="w-5 h-5 text-red-500" />
                              <div>
                                <div className="text-xs font-bold text-red-500 uppercase">Hoshiguma's Presence</div>
                                <div className="text-[10px] text-zinc-400">10% defensive rent bonus applied.</div>
                              </div>
                            </div>
                          )}
                          {!ownsAll && !owner && (
                            <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700 opacity-50">
                              <Info className="w-5 h-5 text-zinc-500" />
                              <div className="text-[10px] text-zinc-500 uppercase italic">No active tactical bonuses detected</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-8 flex gap-3">
                        {tile.type === 'PROPERTY' && (
                          <div className="flex-1 p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-black uppercase mb-1">Build Cost</div>
                            <div className="text-xl font-black italic text-white">{effectiveBuildCost} <span className="text-[10px] not-italic text-zinc-500">Orundum</span></div>
                          </div>
                        )}
                      </div>

                      {/* Construction Management */}
                      {tile.ownerId === localPlayer?.id && tile.type === 'PROPERTY' && (
                        <div className="mt-8 p-6 bg-zinc-800/20 rounded-xl border border-zinc-800/50">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Construction Management</label>
                          
                          {(() => {
                            const groupTiles = tiles.filter(t => t.group === tile.group);
                            const ownsAllInSector = groupTiles.every(gt => gt.ownerId === localPlayer?.id);
                            const currentDorms = tile.dorms || 0;
                            
                            // Even building rule check
                            const minDormsInSector = Math.min(...groupTiles.map(gt => gt.dorms || 0));
                            const canBuildDorm = ownsAllInSector && currentDorms < 4 && (currentDorms === minDormsInSector);
                            const canBuildCmdCenter = ownsAllInSector && currentDorms === 4 && (minDormsInSector === 4);
                            
                            return (
                              <div className="space-y-4">
                                {!ownsAllInSector && (
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                    <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
                                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-tight">
                                      Sector Ownership Required: Control all {tile.group} sites to begin construction.
                                    </div>
                                  </div>
                                )}
                                
                                {ownsAllInSector && currentDorms < 5 && !canBuildDorm && !canBuildCmdCenter && (
                                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3">
                                    <Info className="w-4 h-4 text-orange-500 mt-0.5" />
                                    <div className="text-[10px] text-orange-400 font-bold uppercase tracking-tight">
                                      Even Building Rule: Develop other {tile.group} sites before upgrading this facility further.
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-4">
                                  {currentDorms < 5 && (
                                    <button
                                      onClick={() => buildDorm(tile.id)}
                                      disabled={!isLocalTurn || !ownsAllInSector || (!canBuildDorm && !canBuildCmdCenter) || (localPlayer?.orundum || 0) < effectiveBuildCost || tile.isMortgaged}
                                      className="flex-1 py-4 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded-sm hover:bg-orange-400 disabled:opacity-30 disabled:grayscale transition-all flex flex-col items-center justify-center p-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        {currentDorms < 4 ? <Plus className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                        {currentDorms < 4 ? 'Construct Dormitory' : 'Establish Cmd Center'}
                                      </div>
                                      <span className="text-[8px] mt-1 opacity-70">Investment: {effectiveBuildCost} Orundum</span>
                                    </button>
                                  )}
                                  
                                  {currentDorms > 0 && (
                                    <button
                                      onClick={() => sellDorm(tile.id)}
                                      disabled={!isLocalTurn}
                                      className="flex-1 py-4 border-2 border-red-500/50 text-red-500 font-black uppercase italic tracking-widest rounded-sm hover:bg-red-500/10 disabled:opacity-30 transition-all flex flex-col items-center justify-center p-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Minus className="w-4 h-4" />
                                        Decommission
                                      </div>
                                      <span className="text-[8px] mt-1 opacity-70">Recovery: {Math.floor(effectiveBuildCost / 2)} Orundum</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="mt-8 space-y-3">
                        {tile.ownerId === localPlayer?.id && gameState.players[gameState.currentPlayerIndex].id === localPlayer?.id && (
                          <div className="grid grid-cols-2 gap-3">
                            {tile.dorms === 0 && (
                              !tile.isMortgaged ? (
                                <button 
                                  onClick={() => mortgageProperty(tile.id)}
                                  className="w-full py-3 bg-zinc-800 text-zinc-400 border border-zinc-700 font-black uppercase text-xs rounded-sm hover:bg-zinc-700 transition-all font-mono"
                                >
                                  Tactical Mortgage
                                </button>
                              ) : (
                                <button 
                                  onClick={() => unmortgageProperty(tile.id)}
                                  className="w-full py-3 bg-green-900/40 text-green-400 border border-green-900/50 font-black uppercase text-xs rounded-sm hover:bg-green-900/60 transition-all font-mono"
                                >
                                  Redeem operations
                                </button>
                              )
                            )}
                          </div>
                        )}
                        <button 
                          onClick={() => setShowPropertyModal(false)}
                          className="w-full py-3 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded-sm hover:bg-orange-400 transition-all font-mono"
                        >
                          Close Intel
                        </button>
                      </div>
                      </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Modal */}
      <AnimatePresence>
        {gameState.activeTrade && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-3 sm:p-6 md:p-10 rounded-xl md:rounded-2xl max-w-[380px] sm:max-w-xl md:max-w-3xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative"
            >
              <button 
                onClick={() => setGameState(prev => ({ ...prev, activeTrade: null }))}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>

              <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter mb-2 flex items-center gap-3">
                <ArrowLeftRight className="text-orange-500" /> Negotiate Trade
              </h2>
              <div className="mb-6 flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                  gameState.activeTrade.status === 'PROPOSED' ? 'bg-blue-500/20 text-blue-500' :
                  gameState.activeTrade.status === 'COUNTERED' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {gameState.activeTrade.status}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Waiting for: {gameState.players.find(p => p.id === gameState.activeTrade.waitingForId)?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 overflow-y-auto max-h-[60vh] md:max-h-none pr-2">
                {/* Proposer Side */}
                <div className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${gameState.activeTrade.waitingForId === gameState.activeTrade.proposerId ? 'border-orange-500/50 bg-orange-500/5' : 'border-zinc-800 bg-zinc-800/20 opacity-60'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-800 overflow-hidden bg-zinc-900">
                        <img 
                          src={gameState.players.find(p => p.id === gameState.activeTrade?.proposerId)?.avatar?.url} 
                          alt="Proposer" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900" style={{ backgroundColor: gameState.players.find(p => p.id === gameState.activeTrade?.proposerId)?.color }} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-sm italic uppercase tracking-tighter leading-none">
                        {gameState.players.find(p => p.id === gameState.activeTrade?.proposerId)?.name}
                      </div>
                      <div className="text-[8px] text-zinc-500 font-mono uppercase">
                        {gameState.players.find(p => p.id === gameState.activeTrade?.proposerId)?.operator?.title}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">Orundum Offered</label>
                    <input 
                      type="number"
                      disabled={gameState.activeTrade.waitingForId !== localPlayer?.id}
                      value={gameState.activeTrade.proposerOrundum}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        const player = gameState.players.find(p => p.id === gameState.activeTrade?.proposerId);
                        updateTrade({ proposerOrundum: player ? Math.min(val, player.orundum) : val });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm font-mono text-orange-400 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800 flex-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">Properties Offered</label>
                    <div className="flex flex-wrap gap-1">
                      {(gameState.players.find(p => p.id === gameState.activeTrade?.proposerId)?.properties || []).map(id => {
                        const tile = tiles[id];
                        const isSelected = gameState.activeTrade?.proposerProperties.includes(id);
                        const canTrade = canTradeProperty(id);
                        return (
                          <button
                            key={id}
                            disabled={gameState.activeTrade.waitingForId !== localPlayer?.id || !canTrade}
                            onClick={() => {
                              const current = gameState.activeTrade?.proposerProperties || [];
                              updateTrade({ proposerProperties: isSelected ? current.filter(pid => pid !== id) : [...current, id] });
                            }}
                            className={`px-2 py-1 text-[9px] font-bold rounded border transition-all ${isSelected ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-900 text-zinc-400 border-zinc-700'} ${!canTrade ? 'opacity-30 cursor-not-allowed' : 'hover:border-orange-500/50'} disabled:opacity-50`}
                            title={!canTrade ? "Cannot trade properties with buildings" : ""}
                          >
                            {tile.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Receiver Side */}
                <div className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${gameState.activeTrade.waitingForId === gameState.activeTrade.receiverId ? 'border-orange-500/50 bg-orange-500/5' : 'border-zinc-800 bg-zinc-800/20 opacity-60'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-800 overflow-hidden bg-zinc-900">
                        <img 
                          src={gameState.players.find(p => p.id === gameState.activeTrade?.receiverId)?.avatar?.url} 
                          alt="Receiver" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900" style={{ backgroundColor: gameState.players.find(p => p.id === gameState.activeTrade?.receiverId)?.color }} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-sm italic uppercase tracking-tighter leading-none">
                        {gameState.players.find(p => p.id === gameState.activeTrade?.receiverId)?.name}
                      </div>
                      <div className="text-[8px] text-zinc-500 font-mono uppercase">
                        {gameState.players.find(p => p.id === gameState.activeTrade?.receiverId)?.operator?.title}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">Orundum Requested</label>
                    <input 
                      type="number"
                      disabled={gameState.activeTrade.waitingForId !== localPlayer?.id}
                      value={gameState.activeTrade.receiverOrundum}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        const player = gameState.players.find(p => p.id === gameState.activeTrade?.receiverId);
                        updateTrade({ receiverOrundum: player ? Math.min(val, player.orundum) : val });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm font-mono text-orange-400 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800 flex-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">Properties Requested</label>
                    <div className="flex flex-wrap gap-1">
                      {(gameState.players.find(p => p.id === gameState.activeTrade?.receiverId)?.properties || []).map(id => {
                        const tile = tiles[id];
                        const isSelected = gameState.activeTrade?.receiverProperties.includes(id);
                        const canTrade = canTradeProperty(id);
                        return (
                          <button
                            key={id}
                            disabled={gameState.activeTrade.waitingForId !== localPlayer?.id || !canTrade}
                            onClick={() => {
                              const current = gameState.activeTrade?.receiverProperties || [];
                              updateTrade({ receiverProperties: isSelected ? current.filter(pid => pid !== id) : [...current, id] });
                            }}
                            className={`px-2 py-1 text-[9px] font-bold rounded border transition-all ${isSelected ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-900 text-zinc-400 border-zinc-700'} ${!canTrade ? 'opacity-30 cursor-not-allowed' : 'hover:border-orange-500/50'} disabled:opacity-50`}
                            title={!canTrade ? "Cannot trade properties with buildings" : ""}
                          >
                            {tile.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Value Analysis */}
              <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50 grid grid-cols-3 gap-4">
                {(() => {
                  const trade = gameState.activeTrade;
                  if (!trade) return null;
                  const isProposer = localPlayer?.id === trade.proposerId;
                  
                  const myGivingOrundum = isProposer ? trade.proposerOrundum : trade.receiverOrundum;
                  const myGettingOrundum = isProposer ? trade.receiverOrundum : trade.proposerOrundum;
                  
                  const myGivingProps = isProposer ? trade.proposerProperties : trade.receiverProperties;
                  const myGettingProps = isProposer ? trade.receiverProperties : trade.proposerProperties;
                  
                  const myGivingValue = myGivingOrundum + myGivingProps.reduce((sum, id) => sum + (tiles[id].cost || 0), 0);
                  const myGettingValue = myGettingOrundum + myGettingProps.reduce((sum, id) => sum + (tiles[id].cost || 0), 0);
                  const netValue = myGettingValue - myGivingValue;

                  return (
                    <>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">You Give</div>
                        <div className="text-sm font-mono text-red-400">-{myGivingValue}</div>
                      </div>
                      <div className="text-center border-x border-zinc-800">
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">You Get</div>
                        <div className="text-sm font-mono text-green-400">+{myGettingValue}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Net Value</div>
                        <div className={`text-sm font-mono font-bold ${netValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {netValue >= 0 ? '+' : ''}{netValue}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {gameState.activeTrade.waitingForId === (localPlayer?.id) ? (
                  <>
                    {(gameState.activeTrade.status === 'COUNTERED' || (gameState.activeTrade.status === 'PROPOSED' && gameState.activeTrade.waitingForId === gameState.activeTrade.receiverId)) && (
                      <button
                        onClick={acceptTrade}
                        className="flex-1 py-3 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded-sm hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accept Offer
                      </button>
                    )}
                    <button
                      onClick={proposeTrade}
                      className="flex-1 py-3 border-2 border-orange-500 text-orange-500 font-black uppercase italic tracking-widest rounded-sm hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeftRight className="w-4 h-4" /> {gameState.activeTrade.status === 'PROPOSED' && gameState.activeTrade.waitingForId === gameState.activeTrade.proposerId ? 'Propose Trade' : 'Counter Offer'}
                    </button>
                    <button
                      onClick={rejectTrade}
                      className="flex-1 py-3 border-2 border-red-500/50 text-red-500 font-black uppercase italic tracking-widest rounded-sm hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> {gameState.activeTrade.status === 'PROPOSED' && gameState.activeTrade.waitingForId === gameState.activeTrade.proposerId ? 'Cancel' : 'Reject'}
                    </button>
                  </>
                ) : (
                  <div className="w-full py-4 bg-zinc-800/50 border border-zinc-800 rounded-lg text-center text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                    Waiting for {gameState.players.find(p => p.id === gameState.activeTrade.waitingForId)?.name} to respond...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Card Reveal Modal */}
      <AnimatePresence>
        {gameState.activeCard && localPlayer?.id === currentPlayer?.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotateY: 90 }}
              animate={{ scale: 1, y: 0, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="relative w-full max-w-[90vw] sm:max-w-[500px] h-auto max-h-[90dvh] bg-zinc-900 border-2 border-zinc-700 rounded-xl md:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col sm:flex-row"
            >
              {/* Card Image - Side layout for mobile */}
              <div className="relative w-full sm:w-[40%] min-h-[120px] sm:min-h-full bg-zinc-950 overflow-hidden shrink-0 border-b sm:border-b-0 sm:border-r border-white/5">
                <img 
                  src={gameState.activeCard.image} 
                  alt={gameState.activeCard.title} 
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-zinc-900/50 via-transparent to-transparent" />
                
                {/* Tactical Header Overlay */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <div className="px-1.5 py-0.5 bg-orange-500 text-black text-[7px] font-black uppercase tracking-widest rounded-sm">
                    {gameState.tiles[currentPlayer?.position || 0].name}
                  </div>
                </div>
              </div>

              {/* Card Details - Main content area */}
              <div className="p-4 sm:p-5 flex flex-col flex-1 bg-zinc-900 overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-orange-500 leading-none">
                      {gameState.activeCard.title}
                    </h3>
                    <div className="h-0.5 w-10 bg-orange-500" />
                  </div>

                  <div className="text-[9px] sm:text-[10px] text-zinc-400 italic leading-relaxed font-medium">
                    {gameState.activeCard.flavor}
                  </div>

                  <div className="p-2 sm:p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Tactical Effect</div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                      {gameState.activeCard.effect}
                    </div>
                  </div>
                </div>

                {/* Integrated Action Button */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={handleApplyCardEffect}
                    disabled={currentPlayer?.isAI}
                    className="w-full py-2.5 bg-orange-500 text-black font-black uppercase italic tracking-widest rounded-sm hover:bg-orange-400 active:scale-95 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 text-[10px] sm:text-xs"
                  >
                    {currentPlayer?.isAI ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-black" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        Acknowledge
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Scanline decoration */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showMobileReport && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-4 md:right-20 top-4 bottom-4 md:top-10 md:bottom-10 w-64 md:w-80 lg:left-10 lg:right-auto z-100 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-4 md:p-6 rounded-2xl shadow-2xl flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Intelligence Report
              </div>
              <button 
                className="text-zinc-500 hover:text-white transition-colors" 
                onClick={() => setShowMobileReport(false)}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {gameState.selectedTileId !== null ? (
              <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="h-2 w-full mb-4 rounded-full" style={{ backgroundColor: tiles[gameState.selectedTileId].color || '#333' }} />
                  <h3 className="text-xl font-black italic uppercase tracking-tight mb-1">{tiles[gameState.selectedTileId].name}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">{tiles[gameState.selectedTileId].name} Intelligence Report</p>
              
                  {['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tiles[gameState.selectedTileId].type) && (
                    <button 
                      onClick={() => setShowPropertyModal(true)}
                      className="w-full mb-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase rounded-sm hover:bg-zinc-700 flex items-center justify-center gap-2"
                    >
                      <Search className="w-3 h-3" /> Dossier
                    </button>
                  )}

              {['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(tiles[gameState.selectedTileId].type) && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs landscape:text-[8px]">
                    <span className="text-zinc-400 uppercase">Cost</span>
                    <span className="text-orange-400 font-mono">{tiles[gameState.selectedTileId].cost}</span>
                  </div>
                  <div className="flex justify-between text-xs landscape:text-[8px]">
                    <span className="text-zinc-400 uppercase">Rent</span>
                    <span className="text-orange-400 font-mono">
                      {tiles[gameState.selectedTileId].isMortgaged ? 'MORT' : 
                       tiles[gameState.selectedTileId].type === 'TRANSPORT' ? 
                       `${[25, 50, 100, 200][(tiles.filter(t => t.type === 'TRANSPORT' && t.ownerId === tiles[gameState.selectedTileId].ownerId).length || 1) - 1]}` :
                       tiles[gameState.selectedTileId].type === 'UTILITY' ?
                       `${tiles.filter(t => t.type === 'UTILITY' && t.ownerId === tiles[gameState.selectedTileId].ownerId).length === 2 ? '10x' : '4x'}` :
                       `${(() => {
                         const t = tiles[gameState.selectedTileId];
                         const d = t.dorms || 0;
                         if (d === 0) return t.rent;
                         if (d === 1) return t.dorm1;
                         if (d === 2) return t.dorm2;
                         if (d === 3) return t.dorm3;
                         if (d === 4) return t.dorm4;
                         if (d === 5) return t.cmdCtr;
                         return t.rent;
                       })()}`}
                    </span>
                  </div>
                  
                  {tiles[gameState.selectedTileId].type === 'PROPERTY' && (
                    <div className="mt-4 flex flex-col gap-1 border-t border-zinc-700 pt-4">
                      <div className="flex justify-between text-[10px] landscape:text-[7px]">
                        <span className="text-zinc-500 uppercase">1 Dorm</span>
                        <span className="text-zinc-300">{tiles[gameState.selectedTileId].dorm1}</span>
                      </div>
                      <div className="flex justify-between text-[10px] landscape:text-[7px]">
                        <span className="text-zinc-500 uppercase">2 Dorms</span>
                        <span className="text-zinc-300">{tiles[gameState.selectedTileId].dorm2}</span>
                      </div>
                      <div className="flex justify-between text-[10px] landscape:text-[7px]">
                        <span className="text-zinc-500 uppercase">3 Dorms</span>
                        <span className="text-zinc-300">{tiles[gameState.selectedTileId].dorm3}</span>
                      </div>
                      <div className="flex justify-between text-[10px] landscape:text-[7px]">
                        <span className="text-zinc-500 uppercase">4 Dorms</span>
                        <span className="text-zinc-300">{tiles[gameState.selectedTileId].dorm4}</span>
                      </div>
                      <div className="flex justify-between text-[10px] landscape:text-[7px]">
                        <span className="text-zinc-500 uppercase">Cmd Ctr</span>
                        <span className="text-zinc-300">{tiles[gameState.selectedTileId].cmdCtr}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-2">
                        <span className="text-zinc-500 uppercase">Build Cost</span>
                        <span className="text-orange-400">
                          {(() => {
                            const tile = tiles[gameState.selectedTileId];
                            const groupTiles = tiles.filter(t => t.group === tile.group);
                            const ownsAll = tile.ownerId && groupTiles.every(t => t.ownerId === tile.ownerId);
                            const cost = ownsAll ? Math.floor((tile.buildCost || 0) * 0.75) : (tile.buildCost || 0);
                            return `${cost} Orundum`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 uppercase">Current Owner</span>
                      <span className="font-bold">
                        {tiles[gameState.selectedTileId].ownerId 
                          ? gameState.players.find(p => p.id === tiles[gameState.selectedTileId].ownerId)?.name 
                          : 'UNCLAIMED'}
                      </span>
                    </div>
                  </div>

                  {tiles[gameState.selectedTileId].ownerId === currentPlayer?.id && (
                    <div className="mt-6 flex flex-col gap-2">
                      {(() => {
                        const tile = tiles[gameState.selectedTileId];
                        const groupTiles = tiles.filter(t => t.group === tile.group);
                        const ownsAll = groupTiles.every(t => t.ownerId === currentPlayer?.id);
                        const effectiveBuildCost = ownsAll ? Math.floor((tile.buildCost || 0) * 0.75) : (tile.buildCost || 0);
                        const effectiveSellPrice = Math.floor(effectiveBuildCost / 2);

                        return (
                          <div className="flex gap-2">
                            {tile.type === 'PROPERTY' && (tile.dorms || 0) < 5 && (
                              <button
                                onClick={() => buildDorm(tile.id)}
                                disabled={!isLocalTurn || (currentPlayer?.orundum || 0) < effectiveBuildCost || tile.isMortgaged}
                                className="flex-1 py-2 bg-orange-500 text-black text-[10px] font-black uppercase rounded-sm hover:bg-orange-400 disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Build ({effectiveBuildCost})
                              </button>
                            )}
                            {tile.type === 'PROPERTY' && (tile.dorms || 0) > 0 && (
                              <button
                                onClick={() => sellDorm(tile.id)}
                                disabled={!isLocalTurn}
                                className="flex-1 py-2 border border-red-500 text-red-500 text-[10px] font-black uppercase rounded-sm hover:bg-red-500/10 flex items-center justify-center gap-1 disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" /> Sell ({effectiveSellPrice})
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => mortgageProperty(tiles[gameState.selectedTileId].id)}
                        disabled={!isLocalTurn}
                        className={`w-full py-2 border text-[10px] font-black uppercase rounded-sm flex items-center justify-center gap-1 disabled:opacity-30 ${tiles[gameState.selectedTileId].isMortgaged ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                      >
                        <Shield className="w-3 h-3" /> {tiles[gameState.selectedTileId].isMortgaged ? `Unmortgage (${Math.ceil((tiles[gameState.selectedTileId].mortgage || 0) * 1.1)})` : `Mortgage (${tiles[gameState.selectedTileId].mortgage})`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest italic text-center">Select a sector for<br/>intelligence analysis</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}

    {/* Global Modals */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl max-h-full overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 md:pb-4 mb-4 md:mb-8 shrink-0">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <User className="text-orange-500" /> Profile
                </h2>
                <button onClick={() => setShowProfile(false)} className="text-zinc-500 hover:text-white"><XCircle className="w-5 h-5 md:w-6 md:h-6" /></button>
              </div>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-zinc-800 border-2 border-orange-500 overflow-hidden shrink-0">
                    <img 
                      src={AVATARS.find(a => a.id === profile.avatarId)?.url || AVATARS[0].url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Codename</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                      className="w-full bg-transparent border-none outline-none text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1 md:mb-4">Select Avatar</label>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setProfile(prev => ({ ...prev, avatarId: avatar.id }))}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          profile.avatarId === avatar.id ? 'border-orange-500 scale-110 z-10' : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img 
                          src={avatar.url} 
                          alt={avatar.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {profile.avatarId === avatar.id && (
                          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Doctor Level</label>
                    <span className="text-xl font-black italic text-white leading-none">LV. {profile.level || 1}</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (profile.exp / 1000) * 100)}%` }}
                      className="absolute top-0 left-0 h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    />
                  </div>
                  <div className="flex justify-between mt-1 items-baseline">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Progression Trace</span>
                    <span className="text-[9px] font-mono text-zinc-400">{profile.exp || 0} / 1000 EXP</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="bg-zinc-800/50 p-2 md:p-4 rounded-lg border border-zinc-800">
                    <div className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest">Matches</div>
                    <div className="text-lg md:text-2xl font-black italic">{profile.matches}</div>
                  </div>
                  <div className="bg-zinc-800/50 p-2 md:p-4 rounded-lg border border-zinc-800">
                    <div className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase text-orange-500">Wins</div>
                    <div className="text-lg md:text-2xl font-black italic text-orange-500">{profile.wins}</div>
                  </div>
                  <div className="bg-zinc-800/50 p-2 md:p-4 rounded-lg border border-zinc-800">
                    <div className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase text-red-500">Losses</div>
                    <div className="text-lg md:text-2xl font-black italic text-red-500">{profile.losses}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-[320px] sm:max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-8">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <Settings className="text-orange-500" /> Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors"><XCircle className="w-6 h-6" /></button>
              </div>
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Master Volume</label>
                  <input 
                    type="range" min="0" max="100" value={settings.volume}
                    onChange={(e) => setSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500"><span>0%</span><span>{settings.volume}%</span><span>100%</span></div>
                </div>

                <div className="flex flex-col gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Tactical Sound System</div>
                      <div className="text-sm font-black italic uppercase tracking-tighter text-white truncate">{LOBBY_MUSIC_METADATA[currentMusicIndex]}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={prevMusic} className="flex-1 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all"><SkipBack className="w-4 h-4 mx-auto" /></button>
                    <button onClick={changeMusic} className="flex-1 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Shuffle</span></button>
                    <button onClick={nextMusic} className="flex-1 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all"><SkipForward className="w-4 h-4 mx-auto" /></button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))} 
                    className={`w-full py-3 text-xs font-black rounded border transition-all flex items-center justify-center gap-2 ${settings.soundEnabled ? 'bg-orange-500/10 text-orange-500 border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {settings.soundEnabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {settings.soundEnabled ? 'SFX Enabled' : 'SFX Disabled'}
                  </button>
                  <div className="flex gap-2">
                    {[0.5, 1, 2].map(speed => (
                      <button key={speed} onClick={() => setSettings(prev => ({ ...prev, animationSpeed: speed }))} 
                        className={`flex-1 py-2 text-xs font-black rounded border transition-all ${settings.animationSpeed === speed ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {speed === 0.5 ? 'Slow' : speed === 1 ? 'Normal' : 'Fast'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {gameState.gameStarted && !gameState.winner && localPlayer && (
                <div className="mt-8 pt-6 border-t border-zinc-800 space-y-3">
                  {!localPlayer.isBankrupt ? (
                    <button onClick={() => { setShowForfeitConfirm(true); setShowSettings(false); }} 
                      className="w-full py-4 bg-red-900/50 border border-red-500/30 hover:bg-red-500/20 text-red-500 font-black uppercase italic tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 group">
                      <ShieldAlert className="w-5 h-5 group-hover:animate-pulse" /> Tactical Abort
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (socket && gameState.roomId) {
                          socket.emit('leave-room', gameState.roomId);
                        }
                        resetGame();
                        setShowSettings(false);
                      }}
                      className="w-full py-4 bg-zinc-800 border border-zinc-700 text-zinc-400 font-black uppercase italic tracking-widest rounded-xl hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-3 group"
                    >
                      <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> Exit Sector
                    </button>
                  )}
                </div>
              )}
              <button onClick={() => setShowSettings(false)} className="w-full mt-4 py-4 bg-zinc-800 text-zinc-400 font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-700 transition-all">Close Settings</button>
            </motion.div>
          </div>
        )}

        {showArchives && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              key="archives" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="z-10 w-full max-w-4xl bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-2xl shadow-2xl h-[90dvh] md:h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 md:pb-4 mb-4 md:mb-8 shrink-0">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3"><History className="text-orange-500" /> Archives</h2>
                <button onClick={() => setShowArchives(false)} className="text-zinc-500 hover:text-white transition-colors"><XCircle className="w-5 h-5 md:w-6 md:h-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
                <div className="flex flex-col gap-8 md:gap-12">
                  <section>
                    <h3 className="text-[10px] md:text-xs font-black text-orange-500 uppercase tracking-[0.3em] mb-4 md:mb-6 border-l-2 border-orange-500 pl-4">Operator Profiles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {OPERATORS.map(op => (
                        <div key={op.name} className="bg-zinc-800/30 border border-zinc-800 p-3 md:p-4 rounded-lg flex gap-3 md:gap-4">
                          <img src={op.portrait} alt={op.name} className="w-16 h-16 md:w-20 md:h-20 rounded bg-zinc-900 object-cover grayscale shrink-0" referrerPolicy="no-referrer" />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <div><div className="text-base md:text-lg font-black italic uppercase tracking-tight leading-none">{op.name}</div><div className="text-[8px] md:text-[9px] text-zinc-500 font-mono uppercase">{op.title}</div></div>
                              <div className="text-[8px] font-black bg-orange-500/10 text-orange-500 px-1 py-0.5 rounded border border-orange-500/30">{op.skill.name}</div>
                            </div>
                            <p className="text-[10px] md:text-xs text-zinc-400 leading-tight mb-2 italic">"{op.description}"</p>
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-zinc-500 border-t border-zinc-800 pt-1"><Zap className="w-3 h-3 text-orange-500" /><span className="font-bold uppercase tracking-tighter">Passive:</span> {op.skill.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] md:text-xs font-black text-orange-500 uppercase tracking-[0.3em] mb-4 md:mb-6 border-l-2 border-orange-500 pl-4">Sector Intelligence Report</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {TILES.filter(t => ['PROPERTY', 'TRANSPORT', 'UTILITY'].includes(t.type)).map(tile => (
                        <div key={tile.id} className="bg-zinc-800/20 border border-zinc-800/50 rounded-xl p-3 relative overflow-hidden group hover:border-zinc-700 transition-all">
                          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: tile.color || '#333' }} />
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <div>
                              <div className="text-[10px] font-black italic uppercase tracking-tighter text-white truncate max-w-[120px]">{tile.name}</div>
                              <div className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">{tile.group} Sector</div>
                            </div>
                            <div className="text-[9px] font-mono text-orange-500 font-bold">O{tile.cost}</div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pl-2 mt-3 border-t border-zinc-800/50 pt-2">
                            <div className="flex flex-col">
                              <span className="text-[6px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-1">Base Rent</span>
                              <span className="text-[9px] font-mono text-zinc-300">O{tile.rent || 0}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[6px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-1 text-right">Mortgage</span>
                              <span className="text-[9px] font-mono text-zinc-300">O{tile.mortgage}</span>
                            </div>
                          </div>

                          {tile.type === 'PROPERTY' && (
                            <div className="pl-2 mt-2 grid grid-cols-3 gap-1">
                              <div className="flex flex-col">
                                <span className="text-[5px] text-zinc-700 font-black uppercase leading-none">1 Dorm</span>
                                <span className="text-[7px] font-mono text-zinc-500 italic">O{tile.dorm1}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[5px] text-zinc-700 font-black uppercase leading-none">4 Dorms</span>
                                <span className="text-[7px] font-mono text-zinc-500 italic">O{tile.dorm4}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[5px] text-zinc-700 font-black uppercase leading-none">Cmd Ctr</span>
                                <span className="text-[7px] font-mono text-red-500/70 italic font-bold">O{tile.cmdCtr}</span>
                              </div>
                            </div>
                          )}

                          {/* Detail hover indicator */}
                          <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Info className="w-2.5 h-2.5 text-zinc-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showForfeitConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-[320px] sm:max-w-md md:max-w-lg bg-zinc-950 border-2 border-red-600/50 p-6 md:p-8 rounded-xl md:rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse" />
              <div className="flex flex-col items-center text-center gap-4 md:gap-6 relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600/20 flex items-center justify-center border-2 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]"><ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-red-500" /></div>
                <div className="space-y-2"><h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-red-500">Emergency Abort</h2><div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em]">Protocol Level 4: Critical</div></div>
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 text-sm italic">"Doctor, are you absolutely certain you want to terminate this operation? All current progress and assets will be lost. The mission will be marked as a total tactical withdrawal."</div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button onClick={() => { if (gameState.gameMode === 'SINGLEPLAYER') { resetGame(); } else if (localPlayer) { socket?.emit('forfeit-game', { roomId: gameState.roomId, playerId: socket?.id, playerEmail: profile.email }); handleBankruptcy(localPlayer); } setShowForfeitConfirm(false); }} 
                    className="flex-1 py-4 bg-red-600 text-black font-black uppercase italic tracking-widest rounded-xl hover:bg-red-500 transition-all">Initialize Forfeit</button>
                  <button onClick={() => setShowForfeitConfirm(false)} className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-black uppercase italic tracking-widest rounded-xl border border-zinc-700 hover:bg-zinc-700 transition-all">Resume Mission</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}



        {showGameOver && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              key="game-over"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="w-full max-w-2xl bg-zinc-900 border-2 border-orange-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(255,140,0,0.2)] relative"
            >
              {/* Background Accents */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

              <div className="text-center mb-6 sm:mb-10">
                <motion.div
                  initial={{ rotate: -10, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                  className="inline-block mb-2 sm:mb-4"
                >
                  <Trophy className="w-12 h-12 sm:w-20 sm:h-20 text-orange-500 mx-auto drop-shadow-[0_0_15px_rgba(255,140,0,0.5)]" />
                </motion.div>
                <h2 className="text-2xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-1 sm:mb-2">Mission Complete</h2>
                <p className="text-zinc-500 font-black uppercase tracking-widest text-[8px] sm:text-xs">Final Operation Report</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* Winner Section */}
                <div className="bg-zinc-800/30 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Top Operator</div>
                  {gameState.players.find(p => p.id === gameState.winner) && (
                    <>
                      <div className="flex gap-4 mb-4">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-800 border-2 border-zinc-700 p-2 relative overflow-hidden">
                          <img 
                            src={gameState.players.find(p => p.id === gameState.winner)?.avatar?.url} 
                            alt="Winner Avatar" 
                            className="w-full h-full object-cover rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-orange-500/10 border-2 border-orange-500 p-2 relative overflow-hidden">
                          <img 
                            src={gameState.players.find(p => p.id === gameState.winner)?.operator?.portrait} 
                            alt="Winner Operator" 
                            className="w-full h-full object-cover rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-3 -right-3 bg-orange-500 text-black p-2 rounded-lg shadow-lg">
                            <Trophy className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                      <div className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        {gameState.players.find(p => p.id === gameState.winner)?.name}
                      </div>
                      <div className="text-orange-500 font-black uppercase tracking-widest text-[10px] mt-1">
                        {gameState.players.find(p => p.id === gameState.winner)?.operator?.title}
                      </div>
                    </>
                  )}
                </div>

                {/* Debrief Report / Rankings Section - High Capacity Scrollable */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tactical Debrief</div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full animate-pulse">
                        <CheckCircle2 className="w-2 h-2 text-green-500" />
                        <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Records Stabilized</span>
                      </div>
                    </div>
                    <div className="text-[8px] font-mono text-zinc-600 uppercase">Sector Performance Data</div>
                  </div>
                  
                  <div className="max-h-[35vh] sm:max-h-[550px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                    {([...(gameState.rankings || []), ...gameState.players.filter(p => !gameState.rankings?.some(r => r.id === p.id))].sort((a,b) => {
                      const rankA = (a as any).rank || 99;
                      const rankB = (b as any).rank || 99;
                      if (rankA !== rankB) return rankA - rankB;
                      return calculateTotalAssets(b) - calculateTotalAssets(a);
                    })).map((entry, idx) => {
                    // entry could be a Player object (fallback) or a Ranking object
                    const playerId = typeof entry.id === 'string' ? entry.id : (entry as any).id;
                    const livePlayer = gameState.players.find(p => p.id === playerId);
                    
                    // Fallback to ranking data if live player is missing (e.g. they left after mission end)
                    const operatorObj = livePlayer ? livePlayer.operator : 
                      (entry as any).operatorName ? (OPERATORS.find(op => op.name === (entry as any).operatorName) || OPERATORS[0]) : 
                      OPERATORS[0];
                    
                    const player = livePlayer || {
                      id: playerId,
                      name: entry.name,
                      avatar: AVATARS.find(a => a.id === (entry as any).avatarId) || AVATARS[0],
                      operator: operatorObj,
                      status: (entry as any).status || 'LEFT',
                      isBankrupt: true
                    };

                    const rank = entry.rank || (idx + 1);
                    const isWinner = rank === 1;

                    return (
                      <motion.div 
                        key={playerId} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + (idx * 0.1) }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                          isWinner 
                            ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                            : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black italic text-sm skew-x-[-10deg] ${
                          rank === 1 ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]' :
                          rank === 2 ? 'bg-zinc-300 text-black' :
                          rank === 3 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {rank}
                        </div>

                        <div className="flex gap-2">
                          <div className={`w-10 h-10 rounded-xl border-2 overflow-hidden bg-zinc-900 transition-transform group-hover:scale-110 ${isWinner ? 'border-orange-500' : 'border-zinc-700'}`}>
                            <img src={player.avatar.url} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className={`w-10 h-10 rounded-xl border-2 overflow-hidden bg-zinc-900 transition-transform group-hover:scale-110 ${isWinner ? 'border-orange-500' : 'border-zinc-700'}`}>
                            <img src={player.operator.portrait} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>

                        <div className="flex items-center gap-6 pr-4">
                          {/* Detailed Stats Grid */}
                          <div className="flex gap-4">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <Coins className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-[11px] font-black font-mono text-white">
                                  {(entry.stats?.orundum ?? (livePlayer?.orundum ?? 0)).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Orundum</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5 text-blue-400" />
                                <span className="text-[11px] font-black font-mono text-white">
                                  {entry.stats?.assets ?? (livePlayer?.properties?.length ?? 0)}
                                </span>
                              </div>
                              <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Sectors</div>
                            </div>
                          </div>

                          <div className="w-px h-8 bg-zinc-800" />

                          <div className="text-right min-w-[70px]">
                            <div className={`text-sm font-black font-mono ${isWinner ? 'text-orange-500' : 'text-zinc-400'}`}>
                              O{(entry.stats?.orundum ?? calculateTotalAssets(player)).toLocaleString()}
                            </div>
                            <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Net Worth</div>
                          </div>
                        </div>
                        
                        {/* Decorative scanline overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-20 pointer-events-none" />
                      </motion.div>
                    );
                  })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button 
                  onClick={resetGame}
                  className="flex-1 py-3 sm:py-4 bg-orange-500 hover:bg-orange-600 text-black font-black uppercase italic tracking-widest rounded-xl transition-all shadow-[0_4px_0_rgb(194,107,0)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-3 text-sm sm:text-base whitespace-nowrap"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Return to Base
                </button>
                <button 
                  onClick={() => setShowProfile(true)}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase italic tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 text-sm sm:text-base whitespace-nowrap"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" /> View Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isQueuing && <SearchingOverlay />}
        {!isConnected && socket && !sessionReplaced && <SignalLostOverlay />}
        {sessionReplaced && (
          <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
            <div className="w-full max-w-sm space-y-8">
              <div className="relative">
                <div className="w-24 h-24 border-2 border-red-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <div className="absolute inset-0 bg-red-500/20 blur-[40px] rounded-full" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Access <span className="text-red-500">Displaced</span></h2>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em]">Doctor ID detected elsewhere</div>
              </div>
              <p className="text-zinc-500 text-xs italic">
                "We have detected a parallel session for this Doctor ID. Rhodes Island security protocols have restricted this tactical link to prevent data corruption."
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-zinc-900 border border-zinc-700 text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                Re-initialize Link
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Orientation Lock - Enforce Landscape on Mobile */}
      <div className="fixed inset-0 z-[5000] bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center sm:hidden portrait:flex hidden">
        <div className="w-full max-w-xs space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <motion.div 
              animate={{ rotate: 90 }} 
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-full h-full border-4 border-orange-500 rounded-2xl flex items-center justify-center"
            >
              <Smartphone className="w-12 h-12 text-orange-500" />
            </motion.div>
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Tactical <span className="text-orange-500">Lock</span></h2>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocol: Landscape Required</div>
          </div>
          <p className="text-zinc-500 text-xs italic leading-relaxed">
            "Doctor, the PRTS interface requires horizontal alignment for full tactical clarity. Please rotate your terminal to continue the operation."
          </p>
          <div className="pt-4">
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }} animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-1/2 h-full bg-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission Debrief Modal (Post-Forfeit Choices) */}
      <AnimatePresence>
        {showPostBankruptcyChoice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
          >
            <div className="w-full max-w-lg bg-zinc-950 border-2 border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.2)] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-pulse" />
              
              <div className="p-8 flex flex-col gap-6">
                <div className="text-center space-y-2">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Mission <span className="text-orange-500">Debrief</span></h2>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em]">Tactical Withdrawal Confirmed</div>
                </div>

                {/* Personal Records Summary */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border-2 border-zinc-800 overflow-hidden bg-zinc-950">
                      <img src={profile.avatarId ? AVATARS.find(a => a.id === profile.avatarId)?.url : AVATARS[0].url} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Authorization: {profile.name}</div>
                      <div className="text-2xl font-black italic text-white uppercase tracking-tight">Level {profile.level}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: '45%' }} />
                        </div>
                        <span className="text-[9px] font-mono text-orange-500 font-bold">EXP GAIN: +100</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Operation Status</span>
                      <span className="text-xs font-bold text-red-500 uppercase">Terminated (Loss)</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Total Missions</span>
                      <span className="text-xs font-bold text-white uppercase">{profile.matches + 1}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-zinc-500 text-[10px] text-center italic px-4">
                    "Doctor, your tactical footprint remains in the sector. You may continue to oversee the mission or redeploy to Rhodes Island."
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => setShowPostBankruptcyChoice(false)}
                      className="py-4 bg-zinc-800 border border-zinc-700 text-zinc-300 font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Globe className="w-5 h-5 group-hover:scale-110 transition-all" />
                      Spectate
                    </button>
                    <button 
                      onClick={() => {
                        if (socket && gameState.roomId) {
                          socket.emit('leave-room', gameState.roomId);
                        }
                        resetGame();
                      }}
                      className="py-4 bg-red-600 text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 group"
                    >
                      <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      Exit Sector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
