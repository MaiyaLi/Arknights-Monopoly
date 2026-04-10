# 🛡️ Arknights Monopoly: Tactical Board Mission

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black.svg)](https://socket.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-FFCA28.svg)](https://firebase.google.com/)

Welcome to **Arknights Monopoly**, a high-stakes tactical board game where the lore of Terra meets the cutthroat strategy of Monopoly. Built for Doctors of Rhodes Island, this project delivers a high-fidelity multiplayer experience with robust session persistence and unique operative-driven mechanics.

## 🎭 The Theme: Operation Terra

Step into the shoes of a **Rhodes Island Strategic Commander**. You are not just buying properties; you are securing vital tactical sectors and deploying infrastructure across Terra.

### Key Visual & Tactical Features
- **PRTS Identity Verification**: Secure your terminal with a Doctor Codename and Identification Email.
- **Animated Operator Sprites**: High-quality 4-frame animated sprites for every operative.
- **Tactical HUD**: A sleek, dark-themed interface inspired by the Arknights PRTS system, featuring a self-scaling board.
- **High-Stability Multiplayer**: 
  - **Session Displacement**: One Doctor, one terminal. Logging in from a new device safely migrates your tactical link.
  - **Final Guard Retention**: Withdrawing or losing signal doesn't erase your history. Doctors remain visible in the "Team Info" and final "Tactical Debrief" for all participants.
- **Dynamic Sidebars**: Floating "Intelligence Reports" (chat/logs) and "Team Management" panels.

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
- **Hoshiguma**: *Thorns* - Defensive aura that forces opponents to pay 10% extra rent.
- **Lappland**: *Sundial* - Immune to the first "Sanity Depleted" (Jail) event.
- **Texas**: *Tactical Delivery* - Start the mission with O1,000 extra starting capital.
- **Mostima**: *Time Lock* - Reduces opponent turn timers by 5 seconds.
- **Pramanix**: *Natural Selection* - Vital tax payments are reduced by 50%.
- **SilverAsh**: *Eagle Eyes* - 10% discount on all property/sector acquisitions.
- **Kal'tsit**: *Mon3tr's Protection* - 50% chance to negate rent once every 5 turns.
- **Exusiai**: *Apple Pie!* - Gain O200 bonus every time you roll doubles.

### 🏢 Infrastructure Development
Replace basic outposts with Rhodes Island infrastructure:
1. **Dormitories (Level 1-4)**: Increases the tactical value and "rent" of a sector.
2. **Command Center**: The ultimate upgrade, maximizing a sector's utility and defensive value.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **NPM** or **Yarn**
- **Firebase Project** (Firestore enabled for persistent data)

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
- **Production**:
  ```bash
  npm run build
  npm start
  ```

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: `React 19` + `TypeScript` + `Vite`
- **Animation**: `Framer Motion` for smooth UI transitions and sprite work.
- **Styling**: `TailwindCSS` with Arknights-inspired custom palettes.
- **Multiplayer**: `Socket.io` for real-time state synchronization and matchmaking.
- **Backend**: `Node.js` + `Express` + `TSX`.
- **Database**: `Cloud Firestore` for persistent user levels, wins, and identities.

---

## 🤝 Contributing
Doctors wishing to contribute to the Rhodes Island Infrastructure are welcome! Please open an issue or submit a pull request.

---

*Good luck, Doctor. The future of Rhodes Island is in your hands.*
