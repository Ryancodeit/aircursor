# AirCursor Desktop (Windows Mouse Controller)

> Control your actual Windows OS mouse cursor wirelessly using your smartphone's 3D motion sensors.

AirCursor Desktop is a native C# / .NET 8 Windows desktop application that connects to the AirCursor signaling server over secure WebSockets (`wss://`) and translates smartphone gyro/accel motion into real Windows operating system mouse movements (`SendInput` / `SetCursorPos` / `mouse_event`).

---

## 🌟 Key Capabilities

- 🖱 **Real Windows OS Cursor Control**: Controls the real Windows mouse pointer across all applications, games, and desktop windows (even when AirCursor is not the active browser tab).
- 🖥 **Multi-Monitor & High-DPI Support**: Uses `GetSystemMetrics` for virtual screen bounds to support 1080p, 1440p, 4K, and multi-display setups seamlessly.
- 🔒 **0 Administrator Privilege Requirement**: Runs as a standard Windows user application without requesting elevated admin privileges.
- 🛑 **Safety Guards & Emergency Stop**:
  - Clamps max mouse delta to 150px per update to prevent runaway jumps.
  - Rejects NaN/Infinity and malformed WebSocket payloads.
  - Auto-releases held mouse buttons (`LEFT_UP`, `RIGHT_UP`, `MIDDLE_UP`) on disconnect or when Emergency Stop is triggered.
  - Dedicated `🛑 Emergency Stop` button in UI and System Tray menu.
- 📌 **System Tray Integration**: Minimizes cleanly to the Windows system tray with quick status checking and emergency stop actions.

---

## 🏗 Architecture

```
Phone MotionSensors
       │
       ▼
   MotionEngine (Phone)
       │ (WebSocket WSS)
       ▼
 AirCursor Render Server (Signaling Relay)
       │ (WebSocket WSS)
       ▼
 DesktopWebSocketClient (AirCursor Desktop)
       │
       ▼
   MotionProcessor (Clamping & Safety Guards)
       │
       ▼
 WindowsMouseController (Win32 SendInput / SetCursorPos)
       │
       ▼
 REAL WINDOWS MOUSE CURSOR
```

---

## 📦 Requirements & Building

### Requirements
- **OS**: Windows 10 or Windows 11
- **Runtime / SDK**: .NET 8.0 SDK (`dotnet`)

### Build Command
From the root workspace or `desktop/` folder:

```bash
# Build desktop WPF application
dotnet build desktop/src/AirCursorDesktop.csproj

# Run automated desktop unit test suite (7 tests)
dotnet test desktop/tests/AirCursorDesktop.Tests.csproj

# Publish standalone executable
dotnet publish desktop/src/AirCursorDesktop.csproj -c Release -r win-x64 --self-contained false -o desktop/dist
```

The compiled Windows executable is generated at:
```
desktop/dist/AirCursorDesktop.exe
```

---

## 📱 How to Pair & Use

1. Launch `desktop/dist/AirCursorDesktop.exe` on your Windows PC.
2. A 6-character pairing code will be displayed (e.g. `842713`).
3. Open `http://<your-server>/controller` on your smartphone browser.
4. Select **"Control Windows PC"**, enter the 6-character pairing code, and tap **CONNECT**.
5. Tap **ENABLE MOTION CONTROL** and **CALIBRATE** on your phone.
6. Move your phone to move the real Windows cursor!
   - **Left Click**: Tap `CLICK`
   - **Right Click**: Tap `RIGHT CLICK`
   - **Drag & Drop**: Tap `DRAG / HOLD` (press to hold, tap to release)
   - **Scroll**: Drag your thumb on `SCROLL`
   - **Emergency Stop**: Tap red `STOP` button or tray icon option
