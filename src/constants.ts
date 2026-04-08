/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tile, Player, GameState, EventCard, Operator, Avatar } from './types';

export const BOARD_SIZE = 40;
export const STARTING_ORUNDUM = 7000;
export const GO_REWARD = 7000;
export const TAX_AMOUNT = 500;
export const JAIL_FEE = 1500;

export const TILES: Tile[] = [
  { id: 0, name: 'GO', type: 'GO' },
  { id: 1, name: 'Chernobog Core', type: 'PROPERTY', cost: 600, rent: 20, dorm1: 100, dorm2: 300, dorm3: 900, dorm4: 1600, cmdCtr: 2500, mortgage: 300, buildCost: 500, group: 'BROWN', color: '#8b4513' },
  { id: 2, name: 'Rhodes Island Intel', type: 'EVENT' },
  { id: 3, name: 'Ursus Wasteland', type: 'PROPERTY', cost: 600, rent: 40, dorm1: 200, dorm2: 600, dorm3: 1800, dorm4: 3200, cmdCtr: 4500, mortgage: 300, buildCost: 500, group: 'BROWN', color: '#8b4513' },
  { id: 4, name: 'Originium Tax', type: 'TAX', cost: 2000 },
  { id: 5, name: 'Lungmen General Station', type: 'TRANSPORT', cost: 2000, rent: 250, mortgage: 1000, group: 'TRANSPORT', color: '#000000' },
  { id: 6, name: 'Infected Zone', type: 'PROPERTY', cost: 1000, rent: 60, dorm1: 300, dorm2: 900, dorm3: 2700, dorm4: 4000, cmdCtr: 5500, mortgage: 500, buildCost: 500, group: 'LT BLUE', color: '#87ceeb' },
  { id: 7, name: 'L.G.D. Files', type: 'EVENT' },
  { id: 8, name: 'Reunion Camp', type: 'PROPERTY', cost: 1000, rent: 60, dorm1: 300, dorm2: 900, dorm3: 2700, dorm4: 4000, cmdCtr: 5500, mortgage: 500, buildCost: 500, group: 'LT BLUE', color: '#87ceeb' },
  { id: 9, name: 'Kazdel Penal Colony', type: 'PROPERTY', cost: 1200, rent: 80, dorm1: 400, dorm2: 1000, dorm3: 3000, dorm4: 4500, cmdCtr: 6000, mortgage: 600, buildCost: 500, group: 'LT BLUE', color: '#87ceeb' },
  { id: 10, name: 'Just Visiting / In Jail', type: 'JAIL' },
  { id: 11, name: 'Laterano Cathedral', type: 'PROPERTY', cost: 1400, rent: 100, dorm1: 500, dorm2: 1500, dorm3: 4500, dorm4: 6250, cmdCtr: 7500, mortgage: 700, buildCost: 1000, group: 'PINK', color: '#ff00ff' },
  { id: 12, name: 'Originium Shelter', type: 'UTILITY', cost: 1500, rent: 0, mortgage: 750, group: 'UTILITY', color: '#ffffff' },
  { id: 13, name: 'Bolivar Strip', type: 'PROPERTY', cost: 1400, rent: 100, dorm1: 500, dorm2: 1500, dorm3: 4500, dorm4: 6250, cmdCtr: 7500, mortgage: 700, buildCost: 1000, group: 'PINK', color: '#ff00ff' },
  { id: 14, name: 'Siesta Beach', type: 'PROPERTY', cost: 1600, rent: 120, dorm1: 600, dorm2: 1800, dorm3: 5000, dorm4: 7000, cmdCtr: 9000, mortgage: 800, buildCost: 1000, group: 'PINK', color: '#ff00ff' },
  { id: 15, name: 'Nomadic City Plate', type: 'TRANSPORT', cost: 2000, rent: 250, mortgage: 1000, group: 'TRANSPORT', color: '#000000' },
  { id: 16, name: 'Iberia Lighthouse', type: 'PROPERTY', cost: 1800, rent: 140, dorm1: 700, dorm2: 2000, dorm3: 5500, dorm4: 7500, cmdCtr: 9500, mortgage: 900, buildCost: 1000, group: 'ORANGE', color: '#ffa500' },
  { id: 17, name: 'Rhodes Island Intel', type: 'EVENT' },
  { id: 18, name: 'Kjerag Peak', type: 'PROPERTY', cost: 1800, rent: 140, dorm1: 700, dorm2: 2000, dorm3: 5500, dorm4: 7500, cmdCtr: 9500, mortgage: 900, buildCost: 1000, group: 'ORANGE', color: '#ffa500' },
  { id: 19, name: 'Leithanien Spire', type: 'PROPERTY', cost: 2000, rent: 160, dorm1: 800, dorm2: 2200, dorm3: 6000, dorm4: 8000, cmdCtr: 10000, mortgage: 1000, buildCost: 1000, group: 'ORANGE', color: '#ffa500' },
  { id: 20, name: 'Originium Crisis', type: 'FREE_PARKING' },
  { id: 21, name: 'Minos Academy', type: 'PROPERTY', cost: 2200, rent: 180, dorm1: 900, dorm2: 2500, dorm3: 7000, dorm4: 8750, cmdCtr: 10500, mortgage: 1100, buildCost: 1500, group: 'RED', color: '#ff0000' },
  { id: 22, name: 'L.G.D. Files', type: 'EVENT' },
  { id: 23, name: 'Dorgas Academy', type: 'PROPERTY', cost: 2200, rent: 180, dorm1: 900, dorm2: 2500, dorm3: 7000, dorm4: 8750, cmdCtr: 10500, mortgage: 1100, buildCost: 1500, group: 'RED', color: '#ff0000' },
  { id: 24, name: 'Lungmen Guard HQ', type: 'PROPERTY', cost: 2400, rent: 200, dorm1: 1000, dorm2: 3000, dorm3: 7500, dorm4: 9250, cmdCtr: 11000, mortgage: 1200, buildCost: 1500, group: 'RED', color: '#ff0000' },
  { id: 25, name: 'Rim Billton Mine', type: 'TRANSPORT', cost: 2000, rent: 250, mortgage: 1000, group: 'TRANSPORT', color: '#000000' },
  { id: 26, name: 'Columbian Tech Center', type: 'PROPERTY', cost: 2600, rent: 220, dorm1: 1100, dorm2: 3300, dorm3: 8000, dorm4: 9750, cmdCtr: 11500, mortgage: 1300, buildCost: 1500, group: 'YELLOW', color: '#ffff00' },
  { id: 27, name: 'Rhodes Island Engineering', type: 'PROPERTY', cost: 2600, rent: 220, dorm1: 1100, dorm2: 3300, dorm3: 8000, dorm4: 9750, cmdCtr: 11500, mortgage: 1300, buildCost: 1500, group: 'YELLOW', color: '#ffff00' },
  { id: 28, name: 'Laterano Bank', type: 'UTILITY', cost: 1500, rent: 0, mortgage: 750, group: 'UTILITY', color: '#ffffff' },
  { id: 29, name: 'Yan Pagoda', type: 'PROPERTY', cost: 2800, rent: 240, dorm1: 1200, dorm2: 3600, dorm3: 8500, dorm4: 10250, cmdCtr: 12000, mortgage: 1400, buildCost: 1500, group: 'YELLOW', color: '#ffff00' },
  { id: 30, name: 'Go To Jail', type: 'GO_TO_JAIL' },
  { id: 31, name: 'Gaulish Ruins', type: 'PROPERTY', cost: 3000, rent: 260, dorm1: 1300, dorm2: 3900, dorm3: 9000, dorm4: 11000, cmdCtr: 12750, mortgage: 1500, buildCost: 2000, group: 'GREEN', color: '#008000' },
  { id: 32, name: 'Sargon Takedown', type: 'PROPERTY', cost: 3000, rent: 260, dorm1: 1300, dorm2: 3900, dorm3: 9000, dorm4: 11000, cmdCtr: 12750, mortgage: 1500, buildCost: 2000, group: 'GREEN', color: '#008000' },
  { id: 33, name: 'Rhodes Island Intel', type: 'EVENT' },
  { id: 34, name: 'Siracusa Vineyard', type: 'PROPERTY', cost: 3200, rent: 280, dorm1: 1500, dorm2: 4500, dorm3: 10000, dorm4: 12000, cmdCtr: 15000, mortgage: 1600, buildCost: 2000, group: 'GREEN', color: '#008000' },
  { id: 35, name: 'Victoria Sky-Rail', type: 'TRANSPORT', cost: 2000, rent: 250, mortgage: 1000, group: 'TRANSPORT', color: '#000000' },
  { id: 36, name: 'L.G.D. Files', type: 'EVENT' },
  { id: 37, name: 'Kazimierz Canyon', type: 'PROPERTY', cost: 3500, rent: 350, dorm1: 1750, dorm2: 5000, dorm3: 11000, dorm4: 13000, cmdCtr: 15000, mortgage: 1750, buildCost: 2000, group: 'D. BLUE', color: '#0000ff' },
  { id: 38, name: 'Originium Surplus', type: 'TAX', cost: 1000 },
  { id: 39, name: 'Mobile Landship', type: 'PROPERTY', cost: 4000, rent: 500, dorm1: 2000, dorm2: 6000, dorm3: 14000, dorm4: 17000, cmdCtr: 20000, mortgage: 2000, buildCost: 2000, group: 'D. BLUE', color: '#0000ff' },
];

export const LGD_CARDS: EventCard[] = [
  {
    id: 1,
    title: 'Tactical Retreat',
    flavor: '"The perimeter is collapsing! Fall back to the extraction point immediately."',
    effect: 'Advance to GO. (Collect O7,000).',
    image: '/Resources/Cards/LGD FIles/Tactical Retreat.png',
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, position: 0, orundum: p.orundum + (p.operator.name === 'Amiya' ? 7700 : 7000) } : p),
      message: `Advanced to GO and collected O${player.operator.name === 'Amiya' ? '7,700' : '7,000'}.`
    })
  },
  {
    id: 2,
    title: "Ch'en's Inspection",
    flavor: '"Madam Ch\'en is conducting a surprise sweep of the district. Report for duty."',
    effect: 'Advance to Lungmen Guard HQ. If you pass GO, collect O7,000.',
    image: "/Resources/Cards/LGD FIles/Ch'en's Inspection.png",
    action: (player, players) => {
      const targetPos = 24;
      const passedGo = player.position > targetPos;
      const goReward = player.operator.name === 'Amiya' ? 7700 : 7000;
      return {
        players: players.map(p => p.id === player.id ? { ...p, position: targetPos, orundum: passedGo ? p.orundum + goReward : p.orundum } : p),
        message: `Advanced to Lungmen Guard HQ.${passedGo ? ` Collected O${goReward.toLocaleString()} for passing GO.` : ''}`
      };
    }
  },
  {
    id: 3,
    title: 'Underworld Sting',
    flavor: '"Intelligence suggests a high-value target is moving through the transit hub."',
    effect: 'Advance to Lungmen General Station. If unowned, you may buy it.',
    image: '/Resources/Cards/LGD FIles/Underworld Sting.png',
    action: (player, players) => {
      const targetPos = 5;
      const passedGo = player.position > targetPos;
      const goReward = player.operator.name === 'Amiya' ? 7700 : 7000;
      return {
        players: players.map(p => p.id === player.id ? { ...p, position: targetPos, orundum: passedGo ? p.orundum + goReward : p.orundum } : p),
        message: `Advanced to Lungmen General Station.${passedGo ? ` Collected O${goReward.toLocaleString()} for passing GO.` : ''}`
      };
    }
  },
  {
    id: 4,
    title: 'Sanity Depleted',
    flavor: '"0 Sanity remaining. The Doctor has collapsed from overwork."',
    effect: 'Go directly to Jail. Do not pass GO, do not collect O7,000.',
    image: '/Resources/Cards/LGD FIles/Sanity Depleted.png',
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p),
      message: 'Sent to detention center.',
      skipLandingAction: true
    })
  },
  {
    id: 5,
    title: 'Lungmen Connection',
    flavor: '"The L.G.D. requires priority access to city infrastructure for the upcoming operation."',
    effect: 'Advance to nearest Utility. If unowned, buy it. If owned, pay owner 10x dice roll.',
    image: '/Resources/Cards/LGD FIles/Lungmen Connection.png',
    action: (player, players, tiles, dice) => {
      const targetPos = player.position < 12 || player.position >= 28 ? 12 : 28;
      const passedGo = player.position > targetPos;
      const tile = tiles[targetPos];
      const diceTotal = dice[0] + dice[1];
      const goReward = player.operator.name === 'Amiya' ? 7700 : 7000;
      
      let updatedPlayers = players.map(p => p.id === player.id ? { ...p, position: targetPos, orundum: passedGo ? p.orundum + goReward : p.orundum } : p);
      let message = `Advanced to nearest Utility (${tile.name}).${passedGo ? ` Collected O${goReward.toLocaleString()} for passing GO.` : ''}`;
      let skipLandingAction = false;

      if (tile.ownerId && tile.ownerId !== player.id && !tile.isMortgaged) {
        const rent = 10 * diceTotal;
        const owner = players.find(p => p.id === tile.ownerId)!;
        updatedPlayers = updatedPlayers.map(p => {
          if (p.id === player.id) return { ...p, orundum: p.orundum - rent };
          if (p.id === owner.id) return { ...p, orundum: p.orundum + rent };
          return p;
        });
        message += ` Paid O${rent} (10x dice) to ${owner.name}.`;
        skipLandingAction = true;
      }
      
      return { players: updatedPlayers, message, skipLandingAction };
    }
  },
  {
    id: 9,
    title: 'Infrastructure Upgrade',
    flavor: '"Standard city maintenance is required to keep the nomadic plates shifting smoothly."',
    effect: 'Pay O250 for each Dormitory and O1,000 for each Office.',
    image: '/Resources/Cards/LGD FIles/Infrastructure Upgrade.png',
    action: (player, players, tiles) => {
      let totalCost = 0;
      player.properties.forEach(tileId => {
        const tile = tiles[tileId];
        if (tile.type === 'PROPERTY') {
          if (tile.dorms && tile.dorms < 5) {
            totalCost += tile.dorms * 250;
          } else if (tile.dorms === 5) {
            totalCost += 1000;
          }
        }
      });
      return {
        players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum - totalCost } : p),
        message: `Paid O${totalCost} for sector infrastructure maintenance.`
      };
    }
  }
];

export const INTEL_CARDS: EventCard[] = [
  {
    id: 101,
    title: "Amiya's Encouragement",
    flavor: '"Doctor, you\'re doing a great job! Everyone is motivated by your presence."',
    effect: 'Everyone gives you O100 as a "Trust" bonus.',
    image: "/Resources/Cards/Rhodes Island Intel/Amiya's Encouragement.png",
    action: (player, players) => {
      let totalCollected = 0;
      const updatedPlayers = players.map(p => {
        if (p.id !== player.id && !p.isBankrupt) {
          totalCollected += 100;
          return { ...p, orundum: p.orundum - 100 };
        }
        return p;
      });
      return {
        players: updatedPlayers.map(p => p.id === player.id ? { ...p, orundum: p.orundum + totalCollected } : p),
        message: `Collected O${totalCollected} from other Doctors as a Trust bonus.`
      };
    }
  },
  {
    id: 102,
    title: "Doctor's Guidance",
    flavor: '"A keen eye for strategy allows you to optimize resource allocation."',
    effect: 'Advance to GO. (Collect O7,000).',
    image: "/Resources/Cards/Rhodes Island Intel/Doctor's Guidance.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, position: 0, orundum: p.orundum + (p.operator.name === 'Amiya' ? 7700 : 7000) } : p),
      message: `Advanced to GO and collected O${player.operator.name === 'Amiya' ? '7,700' : '7,000'}.`
    })
  },
  {
    id: 103,
    title: "Kal'tsit's Lecture",
    flavor: '"Efficiency is not a suggestion, it is a requirement. Do not let your focus waver."',
    effect: 'Pay O1,000 for medical research funding.',
    image: "/Resources/Cards/Rhodes Island Intel/Kal'tsit Lecture.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum - 1000 } : p),
      message: 'Contributed O1,000 to medical research.'
    })
  },
  {
    id: 104,
    title: "Orundum Mining",
    flavor: '"A new vein of Originium has been discovered in a nearby sector."',
    effect: 'Receive O2,000 from the RI logistics fund.',
    image: "/Resources/Cards/Rhodes Island Intel/Orundum Mining.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum + 2000 } : p),
      message: 'Received O2,000 mining dividend.'
    })
  },
  {
    id: 105,
    title: "Recruitment Success",
    flavor: '"New elite operators have been assigned to your tactical unit."',
    effect: 'Advance to nearest Transport. If unowned, you may buy it.',
    image: "/Resources/Cards/Rhodes Island Intel/Recruitment Success.png",
    action: (player, players, tiles) => {
      const transportPositions = [5, 15, 25, 35];
      let targetPos = transportPositions.find(pos => pos > player.position) || transportPositions[0];
      const passedGo = player.position > targetPos;
      const goReward = player.operator.name === 'Amiya' ? 7700 : 7000;
      return {
        players: players.map(p => p.id === player.id ? { ...p, position: targetPos, orundum: passedGo ? p.orundum + goReward : p.orundum } : p),
        message: `Advanced to nearest Transport station.${passedGo ? ` Collected O${goReward.toLocaleString()} for passing GO.` : ''}`
      };
    }
  },
  {
    id: 106,
    title: "Trading Post Profit",
    flavor: '"The engineering department has optimized the local trading post output."',
    effect: 'Collect O1,500 in accumulated profits.',
    image: "/Resources/Cards/Rhodes Island Intel/Trading Post Profit.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum + 1500 } : p),
      message: 'Collected O1,500 profit.'
    })
  },
  {
    id: 107,
    title: "PRTS System Error",
    flavor: '"Critical System Failure. Recalibrating tactical interface..."',
    effect: 'Go back 3 spaces.',
    image: "/Resources/Cards/Rhodes Island Intel/PRTS System Error.png",
    action: (player, players) => {
      const newPos = (player.position - 3 + 40) % 40;
      return {
        players: players.map(p => p.id === player.id ? { ...p, position: newPos } : p),
        message: 'PRTS Error: Moved back 3 spaces.'
      };
    }
  },
  {
    id: 108,
    title: "Medical Treatment",
    flavor: '"Emergency medical supplies have been deployed to your location."',
    effect: 'Pay O150 for supply courier fees.',
    image: "/Resources/Cards/Rhodes Island Intel/Medical Treatment.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum - 150 } : p),
      message: 'Paid O150 for medical supplies.'
    })
  },
  {
    id: 109,
    title: "Nomadic City Life",
    flavor: '"Living on a nomadic city requires constant adaptation to shifting plates."',
    effect: 'Advance to GO. (Collect O7,000).',
    image: "/Resources/Cards/Rhodes Island Intel/Nomadic City Life.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, position: 0, orundum: p.orundum + (p.operator.name === 'Amiya' ? 7700 : 7000) } : p),
      message: `Advanced to GO and collected O${player.operator.name === 'Amiya' ? '7,700' : '7,000'}.`
    })
  },
  {
    id: 110,
    title: "Annoyance from W",
    flavor: '"A small \'gift\' was left in your headquarters. It definitely wasn\'t an explosive. Probably."',
    effect: 'Pay O2,000 for damage repairs.',
    image: "/Resources/Cards/Rhodes Island Intel/Annoyance from W.png",
    action: (player, players) => ({
      players: players.map(p => p.id === player.id ? { ...p, orundum: p.orundum - 2000 } : p),
      message: "Paid O2,000 for repairs after W's visit."
    })
  }
];

export const PLAYER_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
export const PLAYER_NAMES = ['Amiya', 'Kal\'tsit', 'Ch\'en', 'Exusiai'];

export const AVATARS: Avatar[] = [
  { id: 'avatar_doctor', name: 'The Doctor', url: 'https://picsum.photos/seed/doctor/200/200' },
  { id: 'avatar_amiya', name: 'Amiya', url: '/Resources/Characters/Operators Art/Amiya.webp' },
  { id: 'avatar_kaltsit', name: 'Kal\'tsit', url: '/Resources/Characters/Operators Art/Kal\'tsit.webp' },
  { id: 'avatar_chen', name: 'Ch\'en', url: '/Resources/Characters/Operators Art/Ch\'en.webp' },
  { id: 'avatar_hoshiguma', name: 'Hoshiguma', url: '/Resources/Characters/Operators Art/Hoshiguma.webp' },
  { id: 'avatar_lappland', name: 'Lappland', url: '/Resources/Characters/Operators Art/Lappland.webp' },
  { id: 'avatar_texas', name: 'Texas', url: '/Resources/Characters/Operators Art/Texas.webp' },
  { id: 'avatar_mostima', name: 'Mostima', url: '/Resources/Characters/Operators Art/Mostima.webp' },
  { id: 'avatar_pramanix', name: 'Pramanix', url: '/Resources/Characters/Operators Art/Pramanix.webp' },
  { id: 'avatar_silverash', name: 'SilverAsh', url: '/Resources/Characters/Operators Art/SilverAsh.webp' },
  { id: 'avatar_exusiai', name: 'Exusiai', url: '/Resources/Characters/Operators Art/Exusiai.webp' },
];

export const OPERATORS: Operator[] = [
  { 
    name: 'Amiya', 
    title: 'Leader of Rhodes Island', 
    color: '#87ceeb', 
    portrait: '/Resources/Characters/Operators Art/Amiya.webp',
    spriteFolder: 'Amiya',
    spriteBaseName: 'Amiya',
    dormImage: '/Resources/Buildings/Dorm/Amiya Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Amiya Command Center.png',
    description: 'The young leader of Rhodes Island. Her "Spirit Absorption" enables her to extract more resources from every mission milestone.',
    skill: { id: 'amiya_passive', name: 'Spirit Absorption', description: 'Gain 10% extra Orundum when passing GO.', type: 'PASSIVE' }
  },
  { 
    name: 'Ch\'en', 
    title: 'L.G.D. Special Inspection Unit', 
    color: '#ff4444', 
    portrait: '/Resources/Characters/Operators Art/Ch\'en.webp',
    spriteFolder: 'Ch\'en',
    spriteBaseName: 'Ch\'en',
    dormImage: '/Resources/Buildings/Dorm/Ch\'en Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Ch\'en Command Center.png',
    description: 'Superintendent of the Lungmen Guard Department. With "Chi-Shadowless," she applies relentless pressure, occasionally moving much faster than expected.',
    skill: { id: 'chen_passive', name: 'Chi-Shadowless', description: '15% chance to roll an extra die.', type: 'PASSIVE' }
  },
  { 
    name: 'Hoshiguma', 
    title: 'L.G.D. Superintendent', 
    color: '#2E8B57', 
    portrait: '/Resources/Characters/Operators Art/Hoshiguma.webp',
    spriteFolder: 'Hoshiguma',
    spriteBaseName: 'Hoshiguma',
    dormImage: '/Resources/Buildings/Dorm/Hoshiguma Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Hoshiguma Command Center.png',
    description: 'A titan of defense. Her "Thorns" passive ensures that anyone attempting to seize control of her sectors pays a heavy price for their intrusion.',
    skill: { id: 'hoshiguma_passive', name: 'Thorns', description: 'When someone lands on your property, they pay 10% extra.', type: 'PASSIVE' }
  },
  { 
    name: 'Lappland', 
    title: 'Siracusan Mercenary', 
    color: '#F8F8FF', 
    portrait: '/Resources/Characters/Operators Art/Lappland.webp',
    spriteFolder: 'Lappland',
    spriteBaseName: 'Lappland',
    dormImage: '/Resources/Buildings/Dorm/Lappland Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Lappland Command Center.png',
    description: 'A chaotic force on the battlefield. Her "Sundial" skill allows her to bypass legal restrictions and avoid first-time detention penalties.',
    skill: { id: 'lappland_passive', name: 'Sundial', description: 'Immune to the first "Sanity Depleted" (Jail) event.', type: 'PASSIVE' }
  },
  { 
    name: 'Texas', 
    title: 'Penguin Logistics Driver', 
    color: '#ffff44', 
    portrait: '/Resources/Characters/Operators Art/Texas.webp',
    spriteFolder: 'Texas',
    spriteBaseName: 'Texas',
    dormImage: '/Resources/Buildings/Dorm/Texas Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Texas Command Center.png',
    description: 'Reliable and efficient. As a master of "Tactical Delivery," she starts the mission with a significant resource advantage.',
    skill: { id: 'texas_passive', name: 'Tactical Delivery', description: 'Start the game with O1,000 extra.', type: 'PASSIVE' }
  },
  { 
    name: 'Mostima', 
    title: 'Messenger of Laterano', 
    color: '#4444ff', 
    portrait: '/Resources/Characters/Operators Art/Mostima.webp',
    spriteFolder: 'Mostima',
    spriteBaseName: 'Mostima',
    dormImage: '/Resources/Buildings/Dorm/Mostima Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Mostima Command Center.png',
    description: 'A mysterious traveler of time. Her "Time Lock" forces opponents to make decisions under intense temporal pressure.',
    skill: { id: 'mostima_passive', name: 'Time Lock', description: 'Opponents\' turn timers are reduced by 5 seconds.', type: 'PASSIVE' }
  },
  { 
    name: 'Pramanix', 
    title: 'Saintess of Kjerag', 
    color: '#B0C4DE', 
    portrait: '/Resources/Characters/Operators Art/Pramanix.webp',
    spriteFolder: 'Pramanix',
    spriteBaseName: 'Pramanix',
    dormImage: '/Resources/Buildings/Dorm/Pramanix Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Pramanix Command Center.png',
    description: 'The Saintess of the snow peaks. Her "Natural Selection" divine grace significantly reduces the burden of international trade taxes.',
    skill: { id: 'pramanix_passive', name: 'Natural Selection', description: 'Tax payments are reduced by 50%.', type: 'PASSIVE' }
  },
  { 
    name: 'SilverAsh', 
    title: 'Warlord of Kjerag', 
    color: '#708090', 
    portrait: '/Resources/Characters/Operators Art/SilverAsh.webp',
    spriteFolder: 'Silverash',
    spriteBaseName: 'Silverash',
    dormImage: '/Resources/Buildings/Dorm/Silverash Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/SIlverash Command Center.png',
    description: 'The chairman of Karlan Trade. His "Eagle Eyes" grant him unmatched foresight, allowing him to acquire sectors at a reduced cost.',
    skill: { id: 'silverash_passive', name: 'Eagle Eyes', description: 'Properties you land on cost 10% less to buy.', type: 'PASSIVE' }
  },
  { 
    name: 'Kal\'tsit', 
    title: 'Rhodes Island Medical Director', 
    color: '#00FA9A', 
    portrait: '/Resources/Characters/Operators Art/Kal\'tsit.webp',
    spriteFolder: 'Kal\'tsit',
    spriteBaseName: 'Kal\'tsit',
    dormImage: '/Resources/Buildings/Dorm/Kal\'tsit Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Kal\'tsit Command Center.png',
    description: 'The bedrock of Rhodes Island. Utilizing "Mon3tr\'s Protection," she demonstrates extreme resilience by occasionally negating operational costs.',
    skill: { id: 'kaltsit_passive', name: 'Mon3tr\'s Protection', description: '50% chance to avoid paying rent once every 5 turns.', type: 'PASSIVE' }
  },
  { 
    name: 'Exusiai', 
    title: 'Penguin Logistics Marksman', 
    color: '#ff8c00', 
    portrait: '/Resources/Characters/Operators Art/Exusiai.webp',
    spriteFolder: 'Exusia',
    spriteBaseName: 'Exusia',
    dormImage: '/Resources/Buildings/Dorm/Exusia Dorm.png',
    commandCenterImage: '/Resources/Buildings/Command Center/Exusia Command Center.png',
    description: 'Always aiming for the "Apple Pie!" She celebrates every successful tactical maneuver with a burst of resource generation.',
    skill: { id: 'exusiai_passive', name: 'Apple Pie!', description: 'Gain O200 every time you roll doubles.', type: 'PASSIVE' }
  }
];
