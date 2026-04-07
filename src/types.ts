/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TileType = 'PROPERTY' | 'GO' | 'JAIL' | 'FREE_PARKING' | 'GO_TO_JAIL' | 'EVENT' | 'TAX' | 'TRANSPORT' | 'UTILITY';

export interface Tile {
  id: number;
  name: string;
  type: TileType;
  cost?: number;
  rent?: number;
  group?: string;
  color?: string;
  ownerId?: string;
  dorm1?: number;
  dorm2?: number;
  dorm3?: number;
  dorm4?: number;
  cmdCtr?: number;
  mortgage?: number;
  buildCost?: number;
  dorms?: number;
  isMortgaged?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'PASSIVE' | 'ACTIVE';
  cooldown?: number; // Turns
}

export interface Operator {
  name: string;
  title: string;
  color: string;
  portrait: string;
  spriteFolder: string;
  spriteBaseName: string;
  dormImage: string;
  commandCenterImage: string;
  description: string;
  skill: Skill;
}

export interface Avatar {
  id: string;
  name: string;
  url: string;
}

export interface Player {
  id: string;
  name: string;
  email?: string;
  position: number;
  orundum: number;
  properties: number[];
  isBankrupt: boolean;
  inJail: boolean;
  jailTurns: number;
  color: string;
  hasGetOutOfJailFreeCard?: boolean;
  isAI?: boolean;
  operator: Operator;
  avatar: Avatar;
  skillCooldown?: number;
  skillUsed?: boolean;
  turnCount: number;
  isMoving?: boolean;
  animationFrame?: number;
}

export type TradeStatus = 'PROPOSED' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED';

export interface TradeOffer {
  proposerId: string;
  receiverId: string;
  proposerProperties: number[];
  receiverProperties: number[];
  proposerOrundum: number;
  receiverOrundum: number;
  status: TradeStatus;
  waitingForId: string;
}

export type GameMode = 'SINGLEPLAYER' | 'MULTIPLAYER_HOST' | 'MULTIPLAYER_JOIN' | 'MULTIPLAYER_QUEUE';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  dice: [number, number];
  isRolling: boolean;
  hasRolled: boolean;
  message: string;
  log: string[];
  selectedTileId: number | null;
  activeCard: EventCard | null;
  activeTrade: TradeOffer | null;
  activeAuction: AuctionState | null;
  winner: string | null;
  gameStarted: boolean;
  gameMode: GameMode | null;
  roomId: string | null;
  isHost: boolean;
  readyPlayers: string[];
  consecutiveDoubles: number;
  canRollAgain: boolean;
  turnTimer: number; // Seconds remaining
  auctionTimer: number; // Seconds remaining for current bid
  turnTimeLimit: number;
  chatMessages: ChatMessage[];
  tiles: Tile[];
  turnCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface AuctionState {
  tileId: number;
  highestBidderId: string | null;
  highestBid: number;
  biddingPlayerIds: string[];
  currentPlayerIndex: number;
}

export interface EventCard {
  id: number;
  title: string;
  flavor: string;
  effect: string;
  image: string;
  action: (player: Player, players: Player[], tiles: Tile[], dice: [number, number]) => { 
    players: Player[], 
    message: string, 
    skipLandingAction?: boolean 
  };
}
