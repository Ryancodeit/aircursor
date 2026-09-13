# AirCursor

> Turn your phone into a browser-based wireless air mouse.

AirCursor is a modern, high-performance web application that transforms any smartphone into a 3D motion controller for a target screen (laptop, desktop, TV, tablet) with zero software downloads or OS drivers required.

> **Note**: AirCursor does not control the operating-system cursor in this version. All interactions take place strictly within the AirCursor browser application.

---

## 📋 Table of Contents

- [What AirCursor Is](#-what-aircursor-is)
- [Architecture](#-architecture)
- [System Requirements](#-system-requirements)
- [Installation](#-installation)
- [Development](#-development)
- [Environment Variables](#-environment-variables)
- [Test Commands](#-test-commands)
- [Production Build](#-production-build)
- [Deployment Strategy](#-deployment-strategy)
- [Browser Sensor Limitations](#-browser-sensor-limitations)
- [iOS Permission Behavior](#-ios-permission-behavior)
- [Privacy Model](#-privacy-model)
- [Future Architecture](#-future-architecture)

---

## 🎯 What AirCursor Is

AirCursor turns a mobile device into an interactive air mouse. By processing smartphone gyroscopes and accelerometers, motion is translated into normalized 2D movement deltas (`dx`, `dy`) and streamed over low-latency WebSockets to move a virtual cursor on a target browser screen.

### Features
- 📱 **Mobile Motion Controller**: Native `DeviceOrientationEvent` processing with dynamic calibration, deadband filtering, and low-pass Exponential Moving Average (EMA) smoothing.
- 🎯 **Target Screen Demos**: Built-in interactive playgrounds (Presentation Slide Deck with Laser Pointer mode, Drawing Canvas, Precision Target Game).
- ⚡ **Low-Latency Streaming**: Real-time 60Hz sensor streaming over WebSocket protocol with automatic reconnection and latency ping/pong monitoring.
- 🔒 **Zero Data Storage & Ephemeral Sessions**: Pairing via 6-character cryptographically safe room codes or QR code scanning. No databases, accounts, or stored motion logs.
- 🎮 **Simulated Motion Mode**: Desktop testing via `?simulateMotion=true` mouse & keyboard arrow controls.
- 📲 **PWA & Trackpad Fallback**: Installable PWA support with touch trackpad fallback for devices without motion sensors.

---

## 🏗 Architecture

AirCursor is designed as a modular monorepo using TypeScript and clean separation of concerns:

```
aircursor/
├── shared/       # Protocol specification, discriminated TS unions, message schemas
├── server/       # Express HTTP & native WebSocket server ('ws') with session management
└── client/       # React 18 + Vite frontend application
    ├── src/motion/       # MotionEngine: sensor access, orientation normalization, calibration, filtering
    ├── src/cursor/       # CursorEngine: 60 FPS rAF loop, boundary clamping, physics integration
    ├── src/networking/   # ControllerTransport / AirCursorSocketClient: WS abstraction with auto-reconnect
    └── src/hooks/        # Lightweight state management hooks (useSessionState)
```

### Component Architecture & Decoupling
- **MotionEngine**: Measures phone tilt, normalizes orientation (`alpha`, `beta`, `gamma`), applies sensitivity & smoothing filters, and produces normalized movement vectors. Knows **nothing** about React or WebSockets.
- **CursorEngine**: Maintains virtual $(x, y)$ coordinates, applies acceleration & boundaries, and updates cursor DOM styles imperatively using `requestAnimationFrame`. Does **not** trigger React re-renders.
- **NetworkEngine (`INetworkTransport`)**: Transports messages asynchronously. Allows future swap to WebRTC or LAN discovery without touching sensor logic.
- **Server**: Ephemeral session routing, socket pair association, payload validation, and inactive session expiration. Does **not** calculate cursor physics.

---

## 💻 System Requirements

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Browsers**:
  - **Controller**: iOS Safari 13+ (requires HTTPS for motion sensors) or Android Chrome.
  - **Target Screen**: Modern desktop or tablet browser (Chrome, Edge, Safari, Firefox).

---

## 📦 Installation

Clone the repository and install workspace dependencies:

```bash
git clone https://github.com/your-repo/aircursor.git
cd aircursor
npm install
```

---

## 🛠 Development

Start both the backend WebSocket server (`ws://localhost:3001`) and frontend Vite development server (`http://localhost:3000`) concurrently:

```bash
npm run dev
```

Access the app in your browser:
- **Landing Page**: `http://localhost:3000`
- **Target Screen**: `http://localhost:3000/screen`
- **Mobile Controller**: `http://localhost:3000/controller`
- **Desktop Simulation Mode**: `http://localhost:3000/controller?simulateMotion=true`

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` in the root and `client/` directories:

```env
# Server Port (Backend)
PORT=3001

# Public Frontend URL (Used for QR Code Generation)
VITE_APP_URL=http://localhost:3000

# Public WebSocket URL for Client Connections
VITE_WS_URL=ws://localhost:3001
```

For production deployments, set `VITE_WS_URL` to your secure WebSocket endpoint (`wss://your-backend-domain.com`).

---

## 🧪 Test Commands

Run the comprehensive unit and integration test suite:

```bash
# Run all tests (Server & Client Vitest suites)
npm run test

# Run TypeScript typechecks across all monorepo packages
npm run typecheck
```

---

## 🏗 Production Build

To build all monorepo packages (`shared`, `server`, `client`):

```bash
npm run build
```

This compiles TypeScript for `shared` and `server`, and generates optimized static production assets in `client/dist`.

---

## 🚢 Render Deployment Guide (Recommended Single Web Service)

AirCursor is optimized for deployment as a **single unified Web Service on Render**, serving both the frontend React app and the real-time WebSocket server from a single instance on Render's free tier.

### Render Configuration Summary
- **Service Type**: **Web Service**
- **Environment**: **Node**
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Health Check Path**: `/health`

### Step-by-Step Render Deployment:

1. **Push your repository** to GitHub or GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New + $\to$ Web Service**.
3. Connect your AirCursor repository.
4. Fill in the service configuration:
   - **Name**: `aircursor` (or your preferred service name)
   - **Region**: Choose closest to your target audience
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free` (or Starter)
5. Expand **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Environment Variables** (Optional):
     - `VITE_APP_URL`: `https://aircursor.onrender.com` (Replace with your actual Render URL)
6. Click **Create Web Service**.

Render will automatically run `npm run build` (which builds `shared`, `server`, and `client/dist`), start Node.js via `npm run start`, monitor `/health`, and assign `https://` + `wss://` endpoints automatically.


---

## 📱 Browser Sensor Limitations

1. **HTTPS Requirement**: Mobile browsers (especially iOS Safari and modern Chrome) block `DeviceOrientationEvent` and `DeviceMotionEvent` on insecure `http://` origins. Secure `https://` is required in production.
2. **Gyroscope Availability**: Devices lacking gyroscope hardware (e.g., older desktop browsers or budget tablets) automatically fall back to **Touch Trackpad Mode**.
3. **Sensor Frequency**: Mobile browsers emit orientation updates at varying rates (30Hz–120Hz). The `MotionProcessor` filters noise and normalizes timing deltas to ensure uniform cursor responsiveness across hardware.

---

## 🔐 iOS Permission Behavior

iOS 13+ introduced strict privacy permissions for Motion & Orientation sensors:
- **Explicit Permission**: Sensor access **cannot** be requested automatically on page load.
- **User Gesture Requirement**: `DeviceOrientationEvent.requestPermission()` must be triggered directly by an explicit user gesture (button tap).
- AirCursor presents an onboard **"ENABLE MOTION CONTROL"** prompt prior to initiating sensor streams on iOS devices.

---

## 🛡 Privacy Model

Privacy is a core design principle of AirCursor:
- ❌ **No Motion Logging**: Sensor data streams directly between paired clients in real-time and is discarded instantly.
- ❌ **No Database / Accounts**: No persistent storage, user profiles, or tracking cookies.
- ⏱ **Ephemeral Sessions**: Sessions live strictly in server RAM and automatically expire after 15 minutes of inactivity.
- 🔒 **One Controller Limit**: Each session strictly enforces a 1-Target to 1-Controller limit to prevent session hijacking.

---

## 🔮 Future Architecture & Roadmap

The current architecture (`MotionEngine`, `CursorEngine`, `INetworkTransport`, `ISessionStore`) is designed to modularly support the following future expansions without requiring core rewrites:

- 💻 **OS-Level Cursor Control**: Windows OS mouse driver / macOS companion app integration via local native websocket listeners.
- ⚡ **WebRTC P2P DataChannels**: Sub-10ms direct peer-to-peer data transport bypassing server relays.
- 📡 **LAN / mDNS Discovery**: Automatic local network pairing without internet connectivity.
- 🎮 **Multi-Controller Support**: Multi-user interactive canvas & presentation collaboration (expanding the `1:1` room model).
- ⌨️ **Keyboard Input & Media Controls**: Phone virtual keyboard passthrough, volume control, play/pause, and presentation slide shortcuts.
- 🎯 **Advanced Motion & Custom Gestures**: Gyroscope calibration profiles, flick-to-swipe gestures, and customized haptic feedback triggers.
- 📱 **Native Mobile Apps**: Android & iOS native wrappers using high-frequency native sensor APIs.
- 🌐 **Remote Browser Navigation**: Address bar URL dispatching and tab management.

---

## ⚡ Important Architecture Scope & Distinction

```
AirCursor Architecture (MVP Scope):
[ PHONE CONTROLLER ] ---> ( WebSocket Relay ) ---> [ TARGET BROWSER ] ---> ( Virtual Cursor DOM )

Future Desktop Integration Scope:
[ PHONE CONTROLLER ] ---> ( Native Daemon )   ---> [ WINDOWS / macOS OS ] ---> ( OS System Pointer )
```

> **Crucial Distinction**: In this version, AirCursor operates **strictly within the browser**. Motion sensors control a virtual cursor rendered inside the target web page. It does **not** control or move the native Windows or macOS operating-system mouse cursor.

