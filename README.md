# 🛡️ Arknights Monopoly: Tactical Board Mission

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black.svg)](https://socket.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-FFCA28.svg)](https://firebase.google.com/)

Welcome to **Arknights Monopoly**, a high-stakes tactical board game where the lore of Terra meets the cutthroat strategy of Monopoly. Built for Doctors of Rhodes Island, this project delivers a seamless multiplayer experience with persistent progression and unique character-driven mechanics.

## 🎭 The Theme: Operation Terra

Step into the shoes of a **Rhodes Island Strategic Commander**. Instead of simple properties, you are securing vital tactical sectors across Terra.

### Key Visual Features
- **Animated Operator Sprites**: Every player token is a high-quality 4-frame animated sprite, bringing the operators to life on the board.
- **Adaptive Tactical Overlay**: A responsive, self-scaling game board that fits any screen size without losing tactical clarity.
- **Dynamic Sidebars**: Floating "Intelligence Reports" (chat/logs) and "Team Management" panels that stay out of the way until you need them.
- **Atmospheric UI**: A sleek, dark-themed interface inspired by the Arknights "PRTS" system.

---

## 📜 Strategic Mechanics

### 💰 The Economy: Orundum (O)
All transactions are handled in **Orundum**. 
- **Starting Budget**: O7,000.
- **Cycle Reward**: O7,000 (standard) / O7,700 (Amiya).
- **Tactical Hazards**: Originium Tax (O2,000) and Mandatory Quarantine (Jail).

### 👥 Operator Passive Skills
Choose your squad leader wisely. Each Operator grants a unique tactical advantage:
- **Amiya**: *Spirit Absorption* - 10% bonus to Orundum when passing GO.
- **Ch'en**: *Chi-Shadowless* - 15% chance to roll an extra die for tactical repositioning.
- **Hoshiguma**: *Thorns* - Defensive aura that increases rent by 10% for opponents.
- **Lappland**: *Sundial* - Immune to the first "Sanity Depleted" (Jail) event.
- **Texas**: *Tactical Delivery* - Start the game with O1,000 extra starting capital.
- **Mostima**: *Time Lock* - Reduces opponent turn timers by 5 seconds, forcing them to make rushed decisions.
- **Pramanix**: *Natural Selection* - Tax payments are reduced by 50%.
- **SilverAsh**: *Eagle Eyes* - 10% discount on all property/sector acquisitions.
- **Kal'tsit**: *Mon3tr's Protection* - 50% chance to negate rent once every 5 turns.
- **Exusiai**: *Apple Pie!* - Gain O200 bonus every time you roll doubles.

### 🏢 Infrastructure Development
Replace basic houses with Rhodes Island infrastructure:
1. **Dorms (Level 1-4)**: Increases the tactical value and "rent" of a sector.
2. **Command Center**: The ultimate upgrade, maximizing the sector's utility.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **NPM** or **Yarn**
- **Firebase Project** (Optional for local, required for persistent data)

### Installation
1.  **Clone the Mission Files**:
    ```bash
    git clone https://github.com/your-repo/arknights-monopoly.git
    cd arknights-monopoly
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Configuration**:
    Create a `.env` file based on `.env.example`:
    ```env
    GEMINI_API_KEY="your_api_key"
    APP_URL="http://localhost:3000"
    PORT=3000
    ```
4.  **Firebase Setup**:
    Place your `firebase-service-account.json` in the root directory to enable the Cloud Database.

### Running the Project
- **Development**: Starts the Socket.io server and Vite dev server simultaneously.
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: `React 19` + `TypeScript` + `Vite`
- **Animation**: `Framer Motion` (Motion) for smooth UI transitions and sprite work.
- **Styling**: `TailwindCSS` with the `@tailwindcss/vite` plugin.
- **Multiplayer**: `Socket.io` for real-time state synchronization, matchmaking, and chat.
- **Backend**: `Node.js` + `Express` + `TSX` (Runtime).
- **Database**: `Firebase Admin SDK` (Firestore) for persistent user levels, wins, and matches.

### Project Structure
```text
├── src/                # Frontend React application
│   ├── components/     # UI Components (Board, Sidebar, Overlays)
│   ├── assets/         # Operator sprites and thematic images
│   └── App.tsx         # Main Game Logic and UI Assembly
├── server.ts           # Socket.io & Express Server (Multiplayer Logic)
├── firebase.json       # Hosting & Firebase configuration
├── Dockerfile          # Containerization for Render.com/Cloud Run
└── public/             # Static assets and icons
```

---

## 🌐 Deployment

The system is designed for **High-Availability Split Deployment**:
- **Frontend**: Deployed to **Firebase Hosting**.
- **Backend**: Deployed to a stateful hosting service like **Render.com** or **Railway** (to maintain Socket.io connections).
- **Database**: Hosted on **Google Cloud Firestore**.

---

## 🤝 Contributing
Doctors wishing to contribute to the Rhodes Island Infrastructure are welcome! Please open an issue or submit a pull request.

---

*Good luck, Doctor. The future of Rhodes Island is in your hands.*
