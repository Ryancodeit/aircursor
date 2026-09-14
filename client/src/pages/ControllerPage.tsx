import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  ArrowLeft,
  Sliders,
  Zap,
  LogOut,
  Monitor,
  Laptop,
  X,
  ChevronRight
} from 'lucide-react';
import { AirCursorSocketClient } from '../networking/socketClient.js';
import { MotionController } from '../motion/MotionController.js';
import { DebugPanel } from '../components/common/DebugPanel.js';
import {
  loadUserPreferences,
  saveUserPreferences,
  UserPreferences
} from '../utils/userPreferences.js';

import { SessionStatus, DeviceType, ControlMode } from '@aircursor/shared';
import { ModeSwitcherDock } from '../components/controller/ModeSwitcherDock.js';
import { AirCursorMode } from '../components/controller/AirCursorMode.js';
import { TouchpadMode } from '../components/controller/TouchpadMode.js';
import { MediaMode } from '../components/controller/MediaMode.js';
import { KeyboardMode } from '../components/controller/KeyboardMode.js';
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

  // Active Control Mode State: 'aircursor' | 'touchpad' | 'media' | 'keyboard'
  const [activeMode, setActiveMode] = useState<ControlMode>('aircursor');

  // Calibration UX state
  const [calibStep, setCalibStep] = useState<'idle' | 'calibrating' | 'ready'>('idle');
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
      // Only process phone motion sensor when in Air Cursor mode
      if (status === 'connected' && activeMode === 'aircursor') {
        socketRef.current?.sendMotion(dx, dy);

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
  }, [status, activeMode]);

  // Handle visibility state change (e.g. mobile screen lock / tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && status === 'connected' && activeMode === 'aircursor') {
        motionControllerRef.current.calibrate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [status, activeMode]);

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
    }, 400);
  };

  const handleEmergencyStop = () => {
    triggerHaptic([40, 40, 40]);
    socketRef.current?.sendEmergencyStop();
    motionControllerRef.current.calibrate();
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
  };

  // STEP 1: Controller Initial Pairing Screen
  if (status !== 'connected' && status !== 'reconnecting') {
    return (
      <div className="controller-page pairing-mode">
        <div className="pairing-container glass-card">
          <h1 className="brand-header-logo">AIRCURSOR</h1>
          <h2 className="pairing-title">Pair phone controller</h2>


          <div className="device-tab-bar">
            <button
              className={`tab-btn ${targetDeviceType === 'screen' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('screen')}
              type="button"
            >
              <Monitor size={15} />
              Browser Screen
            </button>
            <button
              className={`tab-btn ${targetDeviceType === 'desktop' ? 'active' : ''}`}
              onClick={() => setTargetDeviceType('desktop')}
              type="button"
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
              type="button"
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
              type="button"
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
      <div className="controller-page pairing-mode">
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
            type="button"
            style={{ height: '54px', borderRadius: '14px', fontWeight: 700 }}
          >
            ACTIVATE MOTION SENSORS
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: Fullscreen Universal Multi-Mode Remote Shell
  return (
    <div className="controller-page fullscreen-remote-shell">
      {/* 1. MINIMAL TOP BAR HEADER */}
      <header className="remote-top-header">
        <div className="header-left">
          <div className="app-brand-badge">
            <span className="brand-icon">▲</span>
            <span className="brand-title">AirCursor</span>
          </div>
          <div className={`status-dot-pill ${status}`}>
            <span className="dot" />
            <span className="status-text">{status === 'connected' ? 'Connected' : status.toUpperCase()}</span>
          </div>
        </div>

        <div className="header-right">
          <button className="icon-circle-btn" onClick={() => setShowSettings(true)} title="Settings" type="button">
            <Sliders size={17} />
          </button>
          <button className="icon-circle-btn danger" onClick={handleDisconnect} title="Disconnect" type="button">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Target Device Tag */}
      <div className="target-device-bar">
        <div className="target-device-info">
          {targetDeviceType === 'desktop' ? <Laptop size={14} /> : <Monitor size={14} />}
          <span>{targetDeviceType === 'desktop' ? 'Windows PC' : 'Browser Screen'}</span>
        </div>
        <ChevronRight size={14} style={{ opacity: 0.5 }} />
      </div>

      {/* 2. DYNAMIC FULLSCREEN MODE SURFACE */}
      <main className="active-mode-surface">
        {activeMode === 'aircursor' && (
          <AirCursorMode
            socketClient={socketRef.current}
            onCalibrate={handleCalibrate}
            onEmergencyStop={handleEmergencyStop}
            triggerHaptic={triggerHaptic}
            calibStep={calibStep}
            motionActive={motionActive}
            motionOffset={motionOffset}
          />
        )}

        {activeMode === 'touchpad' && (
          <TouchpadMode
            socketClient={socketRef.current}
            triggerHaptic={triggerHaptic}
          />
        )}

        {activeMode === 'media' && (
          <MediaMode
            socketClient={socketRef.current}
            triggerHaptic={triggerHaptic}
          />
        )}

        {activeMode === 'keyboard' && (
          <KeyboardMode
            socketClient={socketRef.current}
            triggerHaptic={triggerHaptic}
          />
        )}
      </main>

      {/* 3. PERSISTENT MODE SWITCHER DOCK */}
      <ModeSwitcherDock
        activeMode={activeMode}
        onSelectMode={(mode) => setActiveMode(mode)}
        triggerHaptic={triggerHaptic}
      />

      {/* SETTINGS DRAWER MODAL */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Remote Settings</span>
              <button className="icon-circle-btn" onClick={() => setShowSettings(false)} type="button">
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
              type="button"
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
