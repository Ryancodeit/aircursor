import { useEffect, useState, useRef } from 'react';
import { Target, Presentation, Palette, Wifi, MousePointer, LogOut, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AirCursorSocketClient } from '../networking/socketClient.js';
import { useVirtualCursor } from '../hooks/useVirtualCursor.js';
import { VirtualCursor } from '../components/screen/VirtualCursor.js';
import { TargetGame } from '../components/screen/TargetGame.js';
import { PresentationDemo } from '../components/screen/PresentationDemo.js';
import { DrawingCanvas } from '../components/screen/DrawingCanvas.js';
import { ConnectionStatus } from '../components/common/ConnectionStatus.js';
import { DebugPanel } from '../components/common/DebugPanel.js';
import { getFriendlyDeviceLabel } from '../utils/deviceLabel.js';
import { SessionStatus } from '@aircursor/shared';
import './ScreenPage.css';

interface ScreenPageProps {
  onBack: () => void;
}

export const ScreenPage: React.FC<ScreenPageProps> = ({ onBack }) => {
  const [pairCode, setPairCode] = useState<string>('');
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [activeTab, setActiveTab] = useState<'target' | 'presentation' | 'canvas'>('target');
  const [latency, setLatency] = useState<number>(0);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || params.get('simulateMotion') === 'true') {
      setShowDebug(true);
    }
  }, []);

  const socketRef = useRef<AirCursorSocketClient | null>(null);

  const {
    cursorRef,
    mode,
    trail,
    clickRipple,
    handleMessage,
  } = useVirtualCursor();

  const initializeSession = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const client = new AirCursorSocketClient();
    socketRef.current = client;

    client.connect().then(() => {
      client.createSession();
    }).catch((err) => {
      console.error('[ScreenPage] Failed to connect WebSocket:', err);
      setStatus('error');
    });

    client.addListener((msg) => {
      switch (msg.type) {
        case 'session_created':
          setPairCode(msg.pairingCode);
          setStatus('waiting_for_controller');
          break;

        case 'controller_connected':
          setStatus('connected');
          break;

        case 'controller_disconnected':
          setStatus('waiting_for_controller');
          break;

        default:
          handleMessage(msg);
          break;
      }
    });
  };

  useEffect(() => {
    initializeSession();

    const latencyTimer = setInterval(() => {
      if (socketRef.current) {
        setLatency(socketRef.current.latencyMs);
      }
    }, 1000);

    return () => {
      clearInterval(latencyTimer);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [handleMessage]);

  const handleDisconnect = () => {
    initializeSession();
  };

  const metaEnv = (import.meta as any).env;
  const baseUrl = (metaEnv && metaEnv.VITE_APP_URL)
    ? metaEnv.VITE_APP_URL
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const joinUrl = `${baseUrl}/controller?session=${pairCode}`;

  return (
    <div className="screen-page">
      {/* Target Screen Header Bar */}
      <header className={`screen-header ${status === 'connected' ? 'minimal-connected' : ''}`}>
        <div className="header-brand" onClick={onBack}>
          <div className="header-brand-logo">
            <MousePointer size={20} />
          </div>
          <span>AIRCURSOR</span>
        </div>

        {/* Demo Mode Tabs */}
        {status === 'connected' && (
          <div className="demo-tabs">
            <button
              className={`tab-btn ${activeTab === 'target' ? 'active' : ''}`}
              onClick={() => setActiveTab('target')}
            >
              <Target size={16} /> Target Game
            </button>
            <button
              className={`tab-btn ${activeTab === 'presentation' ? 'active' : ''}`}
              onClick={() => setActiveTab('presentation')}
            >
              <Presentation size={16} /> Slides
            </button>
            <button
              className={`tab-btn ${activeTab === 'canvas' ? 'active' : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              <Palette size={16} /> Drawing
            </button>
          </div>
        )}

        <div className="header-status-area">
          {status === 'connected' ? (
            <>
              <ConnectionStatus state="CONNECTED" customText={`${getFriendlyDeviceLabel('controller')} Connected`} />

              <div className="latency-indicator">
                <Wifi size={14} /> {latency} ms
              </div>

              <button className="disconnect-btn" onClick={handleDisconnect} title="Disconnect session">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <ConnectionStatus state="CONNECTING" customText="Waiting for connection" />
          )}
        </div>
      </header>

      {/* Main Screen Content */}
      {status !== 'connected' ? (
        /* Waiting State View matching Section 7 Specs */
        <main className="screen-waiting-hero glass-card">
          <h1 className="screen-hero-title">Connect your phone to control this screen.</h1>
          <p className="screen-hero-subtitle">Scan the QR code with your phone camera</p>

          <div className="qr-wrapper-card">
            {joinUrl && (
              <QRCodeSVG
                value={joinUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#090d16"
                level="M"
                includeMargin={true}
              />
            )}
          </div>

          <p className="waiting-subtext">Or enter this code on your phone.</p>

          <div className="code-boxes-wrapper">
            {pairCode.split('').map((char, index) => (
              <div key={index} className="code-box-single">
                {char}
              </div>
            ))}
          </div>

          <div className="pulse-badge" style={{ marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
            <span className="pulse-dot" style={{ background: 'var(--accent-secondary)', boxShadow: '0 0 10px var(--accent-secondary)' }} />
            Waiting for controller...
          </div>
        </main>
      ) : (
        /* Connected Interactive Screen View */
        <main className="screen-body">
          <div className="connected-banner-bar">
            <span>
              <Smartphone size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              <strong>Phone controller ready.</strong> Move your phone to control the cursor.
            </span>
          </div>

          {activeTab === 'target' && <TargetGame />}
          {activeTab === 'presentation' && <PresentationDemo />}
          {activeTab === 'canvas' && <DrawingCanvas />}
        </main>
      )}

      {/* Hardware Accelerated Virtual Cursor Overlay */}
      {status === 'connected' && (
        <VirtualCursor
          ref={cursorRef}
          mode={mode}
          trail={trail}
          clickRipple={clickRipple}
        />
      )}

      {/* Development Debug & Simulation Panel */}
      {showDebug && (
        <DebugPanel
          connectionState={status.toUpperCase()}
          latencyMs={latency}
          cursorX={0}
          cursorY={0}
        />
      )}
    </div>
  );
};
