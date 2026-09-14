import React, { useRef, useState } from 'react';
import { MousePointer } from 'lucide-react';
import { AirCursorSocketClient } from '../../networking/socketClient.js';

interface TouchpadModeProps {
  socketClient: AirCursorSocketClient | null;
  triggerHaptic?: (pattern?: number | number[]) => void;
}

export const TouchpadMode: React.FC<TouchpadModeProps> = ({ socketClient, triggerHaptic }) => {
  const [isLeftHeld, setIsLeftHeld] = useState(false);
  const [isRightHeld, setIsRightHeld] = useState(false);
  const [isTapDragging, setIsTapDragging] = useState(false);

  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchCount = useRef<number>(0);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollStartPos = useRef<number | null>(null);

  // Touchpad Surface Event Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    touchCount.current = e.touches.length;
    touchStartTime.current = Date.now();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };

      // Long press detection for drag
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        setIsTapDragging(true);
        if (triggerHaptic) triggerHaptic([20, 40]);
        socketClient?.sendMouseDown('left');
      }, 350);
    } else if (e.touches.length === 2) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      scrollStartPos.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.touches.length === 1 && lastTouchPos.current) {
      const touch = e.touches[0];
      const dx = (touch.clientX - lastTouchPos.current.x) * 1.8;
      const dy = (touch.clientY - lastTouchPos.current.y) * 1.8;

      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };

      // Cancel long press timer if moved significantly
      if (touchStartPos.current) {
        const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y);
        if (dist > 8 && !isTapDragging && holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
      }

      if (dx !== 0 || dy !== 0) {
        socketClient?.sendMotion(dx, dy);
      }
    } else if (e.touches.length === 2 && scrollStartPos.current !== null) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const dy = (currentY - scrollStartPos.current) * 2.2;
      scrollStartPos.current = currentY;
      socketClient?.sendScroll(dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (holdTimer.current) clearTimeout(holdTimer.current);

    if (isTapDragging) {
      setIsTapDragging(false);
      if (triggerHaptic) triggerHaptic(10);
      socketClient?.sendMouseUp('left');
    } else if (touchStartPos.current && lastTouchPos.current) {
      const dist = Math.hypot(
        lastTouchPos.current.x - touchStartPos.current.x,
        lastTouchPos.current.y - touchStartPos.current.y
      );
      const elapsed = Date.now() - touchStartTime.current;

      if (dist < 10 && elapsed < 300) {
        if (touchCount.current === 1) {
          // Single tap -> Left Click
          if (triggerHaptic) triggerHaptic(15);
          socketClient?.sendClick();
        } else if (touchCount.current === 2) {
          // Two finger tap -> Right Click
          if (triggerHaptic) triggerHaptic([15, 30]);
          socketClient?.sendRightClick();
        }
      }
    }

    lastTouchPos.current = null;
    touchStartPos.current = null;
    scrollStartPos.current = null;
  };

  // Dedicated Scroll Wheel Handlers
  const handleScrollWheelStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      scrollStartPos.current = e.touches[0].clientY;
    }
  };

  const handleScrollWheelMove = (e: React.TouchEvent) => {
    if (scrollStartPos.current === null || e.touches.length === 0) return;
    const dy = e.touches[0].clientY - scrollStartPos.current;
    scrollStartPos.current = e.touches[0].clientY;
    socketClient?.sendScroll(dy * 2.5);
  };

  return (
    <div className="touchpad-mode-container">
      {/* Touchpad Area & Vertical Scroll Wheel Row */}
      <div className="touchpad-main-row">
        <div
          className={`touchpad-surface 3d-recessed ${isTapDragging ? 'dragging' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="touchpad-center-mark" />
          <div className="touchpad-instructions">
            <span>TOUCHPAD</span>
            <small>Swipe to move • Tap for click • 2-finger right click</small>
            {isTapDragging && <span className="drag-banner">HOLD & DRAGGING</span>}
          </div>
        </div>

        {/* Dedicated Vertical Scroll Bar */}
        <div
          className="touchpad-vertical-scroll 3d-surface"
          onTouchStart={handleScrollWheelStart}
          onTouchMove={handleScrollWheelMove}
        >
          <div className="scroll-arrow-top">▲</div>
          <div className="vertical-scroll-texture" />
          <div className="scroll-arrow-bottom">▼</div>
        </div>
      </div>

      {/* Dedicated Physical 3D Mouse Buttons */}
      <div className="mouse-buttons-row">
        <button
          className={`mouse-btn 3d-btn left-btn ${isLeftHeld ? 'pressed' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            if (triggerHaptic) triggerHaptic(18);
            setIsLeftHeld(true);
            socketClient?.sendMouseDown('left');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (isLeftHeld) {
              if (triggerHaptic) triggerHaptic(10);
              setIsLeftHeld(false);
              socketClient?.sendMouseUp('left');
            }
          }}
          onPointerLeave={() => {
            if (isLeftHeld) {
              setIsLeftHeld(false);
              socketClient?.sendMouseUp('left');
            }
          }}
          type="button"
        >
          <MousePointer size={20} />
          <span>Left Click</span>
        </button>

        <button
          className={`mouse-btn 3d-btn right-btn ${isRightHeld ? 'pressed' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            if (triggerHaptic) triggerHaptic([15, 30]);
            setIsRightHeld(true);
            socketClient?.sendMouseDown('right');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (isRightHeld) {
              if (triggerHaptic) triggerHaptic(10);
              setIsRightHeld(false);
              socketClient?.sendMouseUp('right');
            }
          }}
          onPointerLeave={() => {
            if (isRightHeld) {
              setIsRightHeld(false);
              socketClient?.sendMouseUp('right');
            }
          }}
          type="button"
        >
          <MousePointer size={20} style={{ transform: 'scaleX(-1)' }} />
          <span>Right Click</span>
        </button>
      </div>
    </div>
  );
};
