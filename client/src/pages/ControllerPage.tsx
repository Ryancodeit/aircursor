import { useState, useEffect, useRef } from 'react';
import { Smartphone, Compass, ArrowLeft, Sliders, Zap, MousePointer, LogOut, QrCode, Check, ShieldAlert, Monitor, Laptop } from 'lucide-react';
import { AirCursorSocketClient } from '../networking/socketClient.js';
import { MotionController } from '../motion/MotionController.js';
import { getFriendlyDeviceLabel } from '../utils/deviceLabel.js';
import { DebugPanel } from '../components/common/DebugPanel.js';
import { SessionStatus, DeviceType } from '@aircursor/shared';
import './ControllerPage.css';

interface ControllerPageProps {
  initialCode?: string;
  onBack: () => void;
}

export const ControllerPage: React.FC<ControllerPageProps> = ({ initialCode = '', onBack }) => {
  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [targetDeviceType, setTargetDeviceType] = useState<DeviceType>('screen');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCalibratedToast, setIsCalibratedToast] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(22);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || params.get('simulateMotion') === 'true') {
      setShowDebug(true);
    }
  }, []);

  const socketRef = useRef<AirCursorSocketClient | null>(null);
  const motionControllerRef = useRef<MotionController>(new MotionController(sensitivity));

  useEffect(() => {
    motionControllerRef.current.setSensitivity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    const controller = motionControllerRef.current;
    const unsubscribe = controller.onMovement((dx, dy) => {
      if (status === 'connected') {
        socketRef.current?.sendMotion(dx, dy);
      }
    });

    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [status]);

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      connectToSession(initialCode);
    }
  }, [initialCode]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const requestMotionAccess = async () => {
    const granted = await motionControllerRef.current.start();
    setHasPermission(granted);
    if (!granted) {
      setErrorMessage(
        "Motion sensors aren't available in this browser. Try Safari on iPhone or Chrome on Android, and make sure motion access is enabled."
      );
    }
  };

  const connectToSession = async (codeToUse?: string) => {
    const targetCode = (codeToUse || inputCode).trim().toUpperCase();
    if (!targetCode || targetCode.length < 6) {
      setErrorMessage('Please enter a valid 6-character pairing code.');
      return;
    }

    setErrorMessage('');
    setStatus('waiting_for_controller');

    if (!socketRef.current) {
      socketRef.current = new AirCursorSocketClient();
    }

    const client = socketRef.current;

    try {
      await client.connect();

      client.addStateListener((wsState, attempt) => {
        if (wsState === 'RECONNECTING') {
          setErrorMessage(`Reconnecting to server... (attempt ${attempt})`);
        } else if (wsState === 'DISCONNECTED') {
          setStatus('disconnected');
          setErrorMessage('Disconnected from device');
        }
      });

      client.addListener((msg) => {
        if (msg.type === 'session_joined') {
          setStatus('connected');
          if (msg.targetDeviceType) {
            setTargetDeviceType(msg.targetDeviceType);
          }
        } else if (msg.type === 'error') {
          setStatus('error');
          setErrorMessage(msg.message);
        }
      });

      client.joinSession(targetCode);
    } catch (err) {
      setStatus('error');
      setErrorMessage('Failed to connect to server.');
    }
  };

  const handleCalibrate = () => {
    triggerHaptic();
    motionControllerRef.current.calibrate();
    socketRef.current?.sendCalibrate();
    setIsCalibratedToast(true);
    setTimeout(() => setIsCalibratedToast(false), 2500);
  };

  const handleLeftClick = () => {
    triggerHaptic();
    socketRef.current?.sendClick();
  };

  const handleRightClick = () => {
    triggerHaptic();
    socketRef.current?.sendRightClick();
  };

  const handleToggleDrag = () => {
    triggerHaptic();
    if (isDragging) {
      socketRef.current?.sendDragEnd();
      setIsDragging(false);
    } else {
      socketRef.current?.sendDragStart();
      setIsDragging(true);
    }
  };

  const handleEmergencyStop = () => {
    triggerHaptic();
    socketRef.current?.sendEmergencyStop();
    setIsDragging(false);
  };

  const handleDisconnect = () => {
    triggerHaptic();
    motionControllerRef.current.stop();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('idle');
    setInputCode('');
    setIsDragging(false);
  };

  const scrollStartPos = useRef<number | null>(null);
  const handleScrollStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      scrollStartPos.current = e.touches[0].clientY;
    }
  };

  const handleScrollMove = (e: React.TouchEvent) => {
    if (scrollStartPos.current === null || e.touches.length === 0) return;
    const dy = e.touches[0].clientY - scrollStartPos.current;
    scrollStartPos.current = e.touches[0].clientY;
    socketRef.current?.sendScroll(dy * 2);
  };

  // STEP 1: Controller Initial Screen
  if (status !== 'connected') {
    return (
      <div className="controller-page">
        <div className="pairing-container glass-card">
          <h1 className="brand-header-logo">AIRCURSOR</h1>
          <h2 className="pairing-title">Pair with a target device</h2>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', justifyContent: 'center' }}>
            <button
              className={`tab-btn ${targetDeviceType === 'screen' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('screen')}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Monitor size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Browser Screen
            </button>
            <button
              className={`tab-btn ${targetDeviceType === 'desktop' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('desktop')}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Laptop size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Windows PC
            </button>
          </div>

          <p className="pairing-label">
            {targetDeviceType === 'desktop' ? 'Enter code from AirCursor Desktop' : 'Enter pairing code from browser screen'}
          </p>

          <div className="code-input-form">
            <input
              type="text"
              maxLength={6}
              className="code-input-field"
              placeholder="842713"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            />

            {errorMessage && <div className="error-banner">{errorMessage}</div>}

            <button
              className="btn-primary btn-large"
              onClick={() => connectToSession()}
            >
              <Zap size={20} /> CONNECT TO {targetDeviceType === 'desktop' ? 'WINDOWS PC' : 'SCREEN'}
            </button>

            <button className="btn-secondary btn-large" onClick={() => {}}>
              <QrCode size={20} /> SCAN QR CODE
            </button>

            <button className="btn-secondary" onClick={onBack} style={{ marginTop: '0.5rem' }}>
              <ArrowLeft size={18} /> Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Motion Permission Prompt
  if (hasPermission === false || hasPermission === null) {
    return (
      <div className="controller-page">
        <div className="pairing-container glass-card">
          <Smartphone size={48} style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }} />
          <h2>Motion control</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            AirCursor needs access to your phone's motion sensors to move the cursor.
          </p>

          {errorMessage && <div className="error-banner" style={{ marginBottom: '1.5rem' }}>{errorMessage}</div>}

          <button className="btn-primary btn-large" onClick={requestMotionAccess}>
            ENABLE MOTION CONTROL
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: Active Connected Controller
  return (
    <div className="controller-page">
      <div className="active-controller">
        {/* Header */}
        <div className="controller-header">
          <span className="controller-brand-title">AIRCURSOR</span>
          <button className="btn-secondary btn-sm" onClick={onBack}>
            <ArrowLeft size={16} /> Home
          </button>
        </div>

        {/* Connected Info Box */}
        <div className="connected-info-box">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CONNECTED TO</div>
            <div className="target-device-name">
              {targetDeviceType === 'desktop' ? 'Windows PC (Real Cursor)' : getFriendlyDeviceLabel('screen')}
            </div>
          </div>
          <div className="pulse-badge">
            <span className="pulse-dot" /> Connected
          </div>
        </div>

        <p className="controller-instruction-text">
          {targetDeviceType === 'desktop' ? 'Move your phone to control the real Windows mouse.' : 'Hold your phone naturally.'}
        </p>

        {/* Calibration Toast Feedback */}
        {isCalibratedToast && (
          <div className="pulse-badge" style={{ margin: '0 auto 1rem auto', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
            <Check size={16} /> CALIBRATED ✓ Move your phone to control the cursor.
          </div>
        )}

        {/* Large One-Handed Touch Motion Controls */}
        <div className="motion-controls-wrapper">
          {/* CALIBRATE & EMERGENCY STOP ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginBottom: '10px' }}>
            <button className="calibrate-large-btn" onClick={handleCalibrate} style={{ width: '100%', margin: 0 }}>
              <Compass size={22} /> CALIBRATE
            </button>
            <button
              onClick={handleEmergencyStop}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <ShieldAlert size={20} /> STOP
            </button>
          </div>

          {/* Sensitivity Slider */}
          <div className="sensitivity-card">
            <Sliders size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span className="sensitivity-label">Sensitivity</span>
            <input
              type="range"
              min="10"
              max="45"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Action Touch Buttons */}
          <div className="action-buttons-grid">
            <div className="click-huge-btn" onClick={handleLeftClick}>
              <MousePointer size={36} />
              <span>CLICK</span>
            </div>

            <div className="right-click-huge-btn" onClick={handleRightClick}>
              <span>RIGHT CLICK</span>
            </div>

            <div
              className={`right-click-huge-btn ${isDragging ? 'active-drag' : ''}`}
              onClick={handleToggleDrag}
              style={{ background: isDragging ? 'var(--accent-primary)' : 'var(--bg-glass-card)' }}
            >
              <span>{isDragging ? 'RELEASE DRAG' : 'DRAG / HOLD'}</span>
            </div>

            <div
              className="scroll-huge-zone"
              onTouchStart={handleScrollStart}
              onTouchMove={handleScrollMove}
            >
              <span>SCROLL</span>
            </div>
          </div>

          {/* DISCONNECT Button */}
          <button className="disconnect-footer-btn" onClick={handleDisconnect}>
            <LogOut size={18} /> DISCONNECT
          </button>
        </div>
      </div>

      {/* Simulated Motion & Debug Panel */}
      {showDebug && (
        <DebugPanel
          connectionState={status.toUpperCase()}
          latencyMs={0}
          onSimulateMotion={(dx, dy) => socketRef.current?.sendMotion(dx, dy)}
        />
      )}
    </div>
  );
};
