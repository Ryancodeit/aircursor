import React, { useRef, useState, useEffect } from 'react';
import { Compass, ShieldAlert, MousePointer, RefreshCw, Check } from 'lucide-react';
import { AirCursorSocketClient } from '../../networking/socketClient.js';

interface AirCursorModeProps {
  socketClient: AirCursorSocketClient | null;
  onCalibrate: () => void;
  onEmergencyStop: () => void;
  triggerHaptic?: (pattern?: number | number[]) => void;
  calibStep?: 'idle' | 'calibrating' | 'ready';
  motionActive?: boolean;
  motionOffset?: { x: number; y: number };
}

export const AirCursorMode: React.FC<AirCursorModeProps> = ({
  socketClient,
  onCalibrate,
  onEmergencyStop,
  triggerHaptic,
  calibStep = 'idle',
  motionActive = false,
  motionOffset = { x: 0, y: 0 }
}) => {
  const [isLeftHeld, setIsLeftHeld] = useState<boolean>(false);
  const [isRightHeld, setIsRightHeld] = useState<boolean>(false);
  const scrollStartPos = useRef<number | null>(null);

  // Safety cleanup for held buttons on unmount
  useEffect(() => {
    return () => {
      if (isLeftHeld && socketClient) {
        socketClient.sendMouseUp('left');
      }
      if (isRightHeld && socketClient) {
        socketClient.sendMouseUp('right');
      }
    };
  }, [isLeftHeld, isRightHeld, socketClient]);

  const handleLeftDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (triggerHaptic) triggerHaptic(18);
    setIsLeftHeld(true);
    socketClient?.sendMouseDown('left');
  };

  const handleLeftUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isLeftHeld) {
      if (triggerHaptic) triggerHaptic(10);
      setIsLeftHeld(false);
      socketClient?.sendMouseUp('left');
    }
  };

  const handleRightDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (triggerHaptic) triggerHaptic([15, 30]);
    setIsRightHeld(true);
    socketClient?.sendMouseDown('right');
  };

  const handleRightUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRightHeld) {
      if (triggerHaptic) triggerHaptic(10);
      setIsRightHeld(false);
      socketClient?.sendMouseUp('right');
    }
  };

  // Wide Scroll Wheel touch / pointer handler
  const handleScrollStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      scrollStartPos.current = e.touches[0].clientY;
    }
  };

  const handleScrollMove = (e: React.TouchEvent) => {
    if (scrollStartPos.current === null || e.touches.length === 0) return;
    const dy = e.touches[0].clientY - scrollStartPos.current;
    scrollStartPos.current = e.touches[0].clientY;
    socketClient?.sendScroll(dy * 2.5);
  };

  const handleScrollEnd = () => {
    scrollStartPos.current = null;
  };

  return (
    <div className="aircursor-mode-container">
      {/* Central Motion Area & Right-Side Vertical Scroll Wheel Container */}
      <div className="aircursor-surface-row">
        <div className={`motion-surface-card ${motionActive ? 'moving' : ''}`}>
          {calibStep !== 'idle' && (
            <div className="calibration-banner">
              {calibStep === 'calibrating' && (
                <>
                  <RefreshCw size={22} className="spin-icon" />
                  <span style={{ fontWeight: 700 }}>Calibrating position...</span>
                </>
              )}
              {calibStep === 'ready' && (
                <>
                  <Check size={24} style={{ color: '#34d399' }} />
                  <span style={{ fontWeight: 700, color: '#34d399' }}>Ready ✓</span>
                </>
              )}
            </div>
          )}

          <div className="motion-surface-ring">
            <div
              className="motion-origin-dot"
              style={{
                transform: `translate3d(${motionOffset.x}px, ${motionOffset.y}px, 0)`
              }}
            />
          </div>

          <div className="motion-guide-text">
            {motionActive ? 'Moving Cursor...' : 'Move your phone to control cursor'}
          </div>
          <div className="motion-sub-text">Air Mouse Mode</div>
        </div>

        {/* Tall Vertical Scroll Wheel on the Right Side */}
        <div
          className="vertical-right-scroll 3d-surface"
          onTouchStart={handleScrollStart}
          onTouchMove={handleScrollMove}
          onTouchEnd={handleScrollEnd}
          onTouchCancel={handleScrollEnd}
          title="Thumb Scroll Wheel (Swipe Up / Down)"
        >
          <div className="scroll-arrow">▲</div>
          <div className="vertical-scroll-ridges" />
          <div className="scroll-dot-indicator">●</div>
          <div className="vertical-scroll-ridges" />
          <div className="scroll-arrow">▼</div>
        </div>
      </div>

      {/* Realistic 3D Mouse Buttons */}
      <div className="mouse-buttons-row">
        <button
          className={`mouse-btn 3d-btn left-btn ${isLeftHeld ? 'pressed' : ''}`}
          onPointerDown={handleLeftDown}
          onPointerUp={handleLeftUp}
          onPointerLeave={handleLeftUp}
          onPointerCancel={handleLeftUp}
          type="button"
        >
          <MousePointer size={20} />
          <span className="btn-label">{isLeftHeld ? 'DRAG HELD' : 'Left Click'}</span>
          {isLeftHeld && <span className="hold-badge">HOLDING</span>}
        </button>

        <button
          className={`mouse-btn 3d-btn right-btn ${isRightHeld ? 'pressed' : ''}`}
          onPointerDown={handleRightDown}
          onPointerUp={handleRightUp}
          onPointerLeave={handleRightUp}
          onPointerCancel={handleRightUp}
          type="button"
        >
          <MousePointer size={20} style={{ transform: 'scaleX(-1)' }} />
          <span className="btn-label">{isRightHeld ? 'RIGHT HELD' : 'Right Click'}</span>
        </button>
      </div>

      {/* Secondary Controls Bar (Calibrate + Emergency Stop) */}
      <div className="aircursor-action-row">
        <button className="calibrate-primary-btn" onClick={onCalibrate} type="button">
          <Compass size={16} /> CALIBRATE
        </button>
        <button className="stop-emergency-btn" onClick={onEmergencyStop} type="button">
          <ShieldAlert size={15} /> STOP
        </button>
      </div>
    </div>
  );
};

