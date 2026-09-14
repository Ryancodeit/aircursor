import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Compass,
  ArrowLeft,
  Sliders,
  Zap,
  MousePointer,
  LogOut,
  Check,
  ShieldAlert,
  Monitor,
  Laptop,
  X,
  RefreshCw
} from 'lucide-react';
import { AirCursorSocketClient } from '../networking/socketClient.js';
import { MotionController } from '../motion/MotionController.js';
import { getFriendlyDeviceLabel } from '../utils/deviceLabel.js';
import { DebugPanel } from '../components/common/DebugPanel.js';
import {
  loadUserPreferences,
  saveUserPreferences,
  UserPreferences,
  SENSITIVITY_PRESETS
} from '../utils/userPreferences.js';
import { SessionStatus, DeviceType } from '@aircursor/shared';
import './ControllerPage.css';

interface ControllerPageProps {
  initialCode?: string;
  onBack: () => void;
}

export const ControllerPage: React.FC<ControllerPageProps> = ({ initialCode = '', onBack }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadUserPreferences());
  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [targetDeviceType, setTargetDeviceType] = useState<DeviceType>('screen');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Calibration UX state: 'idle' | 'calibrating' | 'ready'
  const [calibStep, setCalibStep] = useState<'idle' | 'calibrating' | 'ready'>('idle');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [motionActive, setMotionActive] = useState<boolean>(false);
  const [motionOffset, setMotionOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const socketRef = useRef<AirCursorSocketClient | null>(null);
  const motionControllerRef = useRef<MotionController>(
    new MotionController(prefs.sensitivity, prefs.smoothing, prefs.deadZone)
  );
  const motionDecayTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync preferences with MotionController & localStorage
  useEffect(() => {
    saveUserPreferences(prefs);
    const mc = motionControllerRef.current;
    mc.setSensitivity(prefs.sensitivity);
    mc.setSmoothing(prefs.smoothing);
    mc.setDeadZone(prefs.deadZone);
    mc.setInvertX(prefs.invertX);
    mc.setInvertY(prefs.invertY);
    mc.setAdaptiveSmoothing(prefs.adaptiveSmoothing);
  }, [prefs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || params.get('simulateMotion') === 'true') {
      setShowDebug(true);
    }
  }, []);

  // Motion movement listener setup
  useEffect(() => {
    const controller = motionControllerRef.current;
    const unsubscribe = controller.onMovement((dx, dy) => {
      if (status === 'connected') {
        socketRef.current?.sendMotion(dx, dy);

        // Visual feedback state
        setMotionActive(true);
        setMotionOffset({
          x: Math.max(-28, Math.min(28, dx * 1.5)),
          y: Math.max(-28, Math.min(28, dy * 1.5))
        });

        if (motionDecayTimer.current) clearTimeout(motionDecayTimer.current);
        motionDecayTimer.current = setTimeout(() => {
          setMotionActive(false);
          setMotionOffset({ x: 0, y: 0 });
        }, 200);
      }
    });

    return () => {
      unsubscribe();
      controller.stop();
      if (motionDecayTimer.current) clearTimeout(motionDecayTimer.current);
    };
  }, [status]);

  // Handle visibility state change (e.g. mobile screen lock / tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && status === 'connected') {
        motionControllerRef.current.calibrate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [status]);

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      connectToSession(initialCode);
    }
  }, [initialCode]);

  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (prefs.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore haptic failures
      }
    }
  };

  const requestMotionAccess = async () => {
    const granted = await motionControllerRef.current.start();
    setHasPermission(granted);
    if (!granted) {
      setErrorMessage(
        "Motion sensors aren't available in this browser. Try Safari on iOS or Chrome on Android, and verify motion permissions."
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
          setStatus('reconnecting');
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
    triggerHaptic([20, 50, 20]);
    setCalibStep('calibrating');

    setTimeout(() => {
      motionControllerRef.current.calibrate();
      socketRef.current?.sendCalibrate();
      setCalibStep('ready');

      setTimeout(() => {
        setCalibStep('idle');
      }, 1800);
    }, 500);
  };

  const handleLeftClick = () => {
    triggerHaptic(18);
    socketRef.current?.sendClick();
  };

  const handleRightClick = () => {
    triggerHaptic([15, 30]);
    socketRef.current?.sendRightClick();
  };

  const handleToggleDrag = () => {
    triggerHaptic(25);
    if (isDragging) {
      socketRef.current?.sendDragEnd();
      setIsDragging(false);
    } else {
      socketRef.current?.sendDragStart();
      setIsDragging(true);
    }
  };

  const handleEmergencyStop = () => {
    triggerHaptic([40, 40, 40]);
    socketRef.current?.sendEmergencyStop();
    motionControllerRef.current.calibrate();
    setIsDragging(false);
  };

  const handleDisconnect = () => {
    triggerHaptic(20);
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
    socketRef.current?.sendScroll(dy * 2.2);
  };

  const updatePreset = (presetKey: 'low' | 'medium' | 'high') => {
    triggerHaptic(12);
    const targetGain = SENSITIVITY_PRESETS[presetKey];
    setPrefs((prev) => ({
      ...prev,
      sensitivityPreset: presetKey,
      sensitivity: targetGain
    }));
  };

  // STEP 1: Controller Initial Pairing Screen
  if (status !== 'connected' && status !== 'reconnecting') {
    return (
      <div className="controller-page">
        <div className="pairing-container glass-card">
          <h1 className="brand-header-logo">AIRCURSOR</h1>
          <h2 className="pairing-title">Pair phone controller</h2>

          <div className="device-tab-bar">
            <button
              className={`tab-btn ${targetDeviceType === 'screen' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('screen')}
            >
              <Monitor size={15} />
              Browser Screen
            </button>
            <button
              className={`tab-btn ${targetDeviceType === 'desktop' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('desktop')}
            >
              <Laptop size={15} />
              Windows PC
            </button>
          </div>

          <p className="pairing-label">
            {targetDeviceType === 'desktop'
              ? 'Enter code shown in AirCursor Desktop app'
              : 'Enter pairing code shown on target browser screen'}
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
              style={{
                height: '54px',
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Zap size={20} /> CONNECT TO {targetDeviceType === 'desktop' ? 'WINDOWS PC' : 'SCREEN'}
            </button>

            <button
              className="btn-secondary"
              onClick={onBack}
              style={{
                height: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '0.25rem'
              }}
            >
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
          <Smartphone size={48} style={{ color: '#818cf8', marginBottom: '1rem' }} />
          <h2>Enable Motion Control</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '0.92rem' }}>
            AirCursor transforms your smartphone orientation sensors into a high-precision wireless air mouse.
          </p>

          {errorMessage && <div className="error-banner" style={{ marginBottom: '1.25rem' }}>{errorMessage}</div>}

          <button
            className="btn-primary btn-large"
            onClick={requestMotionAccess}
            style={{ height: '54px', borderRadius: '14px', fontWeight: 700 }}
          >
            ACTIVATE MOTION SENSORS
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: Active Connected Remote Controller Screen (390x844 Viewport Optimized)
  return (
    <div className="controller-page">
      <div className="active-controller">
        {/* 1. TOP BAR & STATUS */}
        <div className="controller-header-bar">
          <div className="header-brand">
            <span className="brand-text">AIRCURSOR</span>
            <div className={`status-badge ${status}`}>
              <span className="pulse-dot" />
              {status === 'connected' ? 'CONNECTED' : status.toUpperCase()}
            </div>
          </div>

          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Sliders size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={handleDisconnect}
              title="Disconnect"
              style={{ color: '#f87171' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* 2. TARGET & SESSION PILL */}
        <div className="target-info-pill">
          <span>
            Target:{' '}
            <strong style={{ color: '#ffffff' }}>
              {targetDeviceType === 'desktop' ? 'Windows PC (Native Mouse)' : getFriendlyDeviceLabel('screen')}
            </strong>
          </span>
          {inputCode && <span className="session-code-tag">#{inputCode}</span>}
        </div>

        {/* 3. COMPACT MOTION VISUALIZER SURFACE */}
        <div className={`motion-surface-card ${motionActive ? 'moving' : ''}`}>
          {calibStep !== 'idle' ? (
            <div className="calibration-banner">
              {calibStep === 'calibrating' && (
                <>
                  <RefreshCw size={24} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Calibrating position...</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Hold phone steady</div>
                </>
              )}
              {calibStep === 'ready' && (
                <>
                  <Check size={28} style={{ color: '#34d399' }} />
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#34d399' }}>Ready ✓</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Reference zero saved</div>
                </>
              )}
            </div>
          ) : null}

          <div className="motion-surface-ring">
            <div
              className="motion-origin-dot"
              style={{
                transform: `translate3d(${motionOffset.x}px, ${motionOffset.y}px, 0)`
              }}
            />
          </div>

          <div className="motion-guide-text">
            {motionActive ? 'Moving Cursor...' : 'Move your phone to control the cursor'}
          </div>
          <div className="motion-sub-text">
            Hold phone naturally • Tap Calibrate to zero
          </div>
        </div>

        {/* 4. SETUP ROW: PRIMARY CALIBRATE + COMPACT EMERGENCY STOP */}
        <div className="bottom-controls-wrapper">
          <div className="top-control-row">
            <button className="calibrate-primary-btn" onClick={handleCalibrate}>
              <Compass size={18} /> CALIBRATE
            </button>
            <button className="stop-emergency-btn" onClick={handleEmergencyStop} title="Emergency stop drag & reset motion">
              <ShieldAlert size={16} /> STOP
            </button>
          </div>

          {/* 5. SPEED PRESETS BAR */}
          <div className="sensitivity-preset-bar">
            <span className="sensitivity-label">Speed</span>
            <div className="preset-pills">
              <button
                className={`preset-pill ${prefs.sensitivityPreset === 'low' ? 'active' : ''}`}
                onClick={() => updatePreset('low')}
              >
                LOW
              </button>
              <button
                className={`preset-pill ${prefs.sensitivityPreset === 'medium' ? 'active' : ''}`}
                onClick={() => updatePreset('medium')}
              >
                MED
              </button>
              <button
                className={`preset-pill ${prefs.sensitivityPreset === 'high' ? 'active' : ''}`}
                onClick={() => updatePreset('high')}
              >
                HIGH
              </button>
            </div>
          </div>

          {/* 6. PRIMARY & SECONDARY ACTION GRID */}
          <div className="action-grid">
            <div className="click-card" onClick={handleLeftClick}>
              <MousePointer size={28} />
              <span>CLICK</span>
            </div>

            <div className="right-click-card" onClick={handleRightClick}>
              <span>RIGHT CLICK</span>
            </div>

            <div
              className={`drag-toggle-card ${isDragging ? 'active-drag' : ''}`}
              onClick={handleToggleDrag}
            >
              <span>{isDragging ? 'DRAG HELD' : 'DRAG / HOLD'}</span>
              {isDragging && <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>TAP TO RELEASE</span>}
            </div>
          </div>

          {/* 7. SCROLL TOUCH ZONE */}
          <div
            className="scroll-zone-bar"
            onTouchStart={handleScrollStart}
            onTouchMove={handleScrollMove}
          >
            <span>▲ DRAG UP / DOWN TO SCROLL ▼</span>
          </div>
        </div>
      </div>

      {/* SETTINGS DRAWER MODAL */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Remote Settings</span>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Custom Sensitivity Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>Cursor Speed</span>
                <span style={{ color: '#818cf8' }}>{prefs.sensitivity}x</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                value={prefs.sensitivity}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    sensitivityPreset: 'custom',
                    sensitivity: Number(e.target.value)
                  }))
                }
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            {/* Tremor Suppression (Dead Zone Slider) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>Tremor Suppression</span>
                <span style={{ color: '#818cf8' }}>{prefs.deadZone.toFixed(2)}°</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.20"
                step="0.01"
                value={prefs.deadZone}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    deadZone: Number(e.target.value)
                  }))
                }
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            {/* Adaptive Smoothing Switch */}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">Movement Smoothness</span>
                <span className="setting-desc">Auto-adjust filter for jitter reduction and fast sweeps</span>
              </div>
              <div
                className={`toggle-switch ${prefs.adaptiveSmoothing ? 'on' : ''}`}
                onClick={() => setPrefs((prev) => ({ ...prev, adaptiveSmoothing: !prev.adaptiveSmoothing }))}
              >
                <div className="toggle-knob" />
              </div>
            </div>

            {/* Invert Horizontal Switch */}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">Invert Horizontal</span>
                <span className="setting-desc">Reverse left/right cursor motion</span>
              </div>
              <div
                className={`toggle-switch ${prefs.invertX ? 'on' : ''}`}
                onClick={() => setPrefs((prev) => ({ ...prev, invertX: !prev.invertX }))}
              >
                <div className="toggle-knob" />
              </div>
            </div>

            {/* Invert Vertical Switch */}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">Invert Vertical</span>
                <span className="setting-desc">Reverse up/down cursor motion</span>
              </div>
              <div
                className={`toggle-switch ${prefs.invertY ? 'on' : ''}`}
                onClick={() => setPrefs((prev) => ({ ...prev, invertY: !prev.invertY }))}
              >
                <div className="toggle-knob" />
              </div>
            </div>

            {/* Haptic Feedback Switch */}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">Touch Vibration</span>
                <span className="setting-desc">Haptic feedback on button presses</span>
              </div>
              <div
                className={`toggle-switch ${prefs.hapticFeedback ? 'on' : ''}`}
                onClick={() => setPrefs((prev) => ({ ...prev, hapticFeedback: !prev.hapticFeedback }))}
              >
                <div className="toggle-knob" />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setShowSettings(false)}
              style={{ height: '46px', borderRadius: '12px', marginTop: '0.25rem', fontWeight: 700 }}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      )}

      {/* DEBUG PANEL */}
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
