import React, { useState, useEffect, useRef } from 'react';
import { Bug, X, Play } from 'lucide-react';
import './DebugPanel.css';

interface DebugPanelProps {
  connectionState: string;
  latencyMs: number;
  lastDx?: number;
  lastDy?: number;
  cursorX?: number;
  cursorY?: number;
  onSimulateMotion?: (dx: number, dy: number) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  connectionState,
  latencyMs,
  lastDx = 0,
  lastDy = 0,
  cursorX = 0,
  cursorY = 0,
  onSimulateMotion,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [msgRate, setMsgRate] = useState<number>(0);
  const msgCountRef = useRef<number>(0);

  useEffect(() => {
    msgCountRef.current++;
  }, [lastDx, lastDy]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgRate(msgCountRef.current);
      msgCountRef.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard Arrow Simulation for Desktop Testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!onSimulateMotion) return;
      const step = 15;
      if (e.key === 'ArrowLeft') onSimulateMotion(-step, 0);
      else if (e.key === 'ArrowRight') onSimulateMotion(step, 0);
      else if (e.key === 'ArrowUp') onSimulateMotion(0, -step);
      else if (e.key === 'ArrowDown') onSimulateMotion(0, step);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSimulateMotion]);

  if (!isOpen) {
    return (
      <button
        aria-label="Open Debug Panel"
        className="btn-secondary btn-sm"
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 99990 }}
        onClick={() => setIsOpen(true)}
      >
        <Bug size={16} /> Debug Mode
      </button>
    );
  }

  // Touch/Mouse drag simulator handling
  const simStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    simStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!simStart.current || !onSimulateMotion) return;
    const dx = (e.clientX - simStart.current.x) * 0.8;
    const dy = (e.clientY - simStart.current.y) * 0.8;
    simStart.current = { x: e.clientX, y: e.clientY };
    onSimulateMotion(dx, dy);
  };

  const handlePointerUp = () => {
    simStart.current = null;
  };

  return (
    <div className="debug-panel-overlay">
      <div className="debug-header">
        <span><Bug size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> AIRCURSOR DEBUG</span>
        <button
          aria-label="Close Debug Panel"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          onClick={() => setIsOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="debug-grid">
        <div className="debug-stat-box">
          <div className="debug-stat-label">STATUS</div>
          <div className="debug-stat-val">{connectionState}</div>
        </div>
        <div className="debug-stat-box">
          <div className="debug-stat-label">LATENCY</div>
          <div className="debug-stat-val">{latencyMs} ms</div>
        </div>
        <div className="debug-stat-box">
          <div className="debug-stat-label">LAST DX / DY</div>
          <div className="debug-stat-val">{Math.round(lastDx)}, {Math.round(lastDy)}</div>
        </div>
        <div className="debug-stat-box">
          <div className="debug-stat-label">MSG RATE</div>
          <div className="debug-stat-val">{msgRate} / sec</div>
        </div>
        <div className="debug-stat-box" style={{ gridColumn: '1 / 3' }}>
          <div className="debug-stat-label">CURSOR POSITION</div>
          <div className="debug-stat-val">X: {Math.round(cursorX)}, Y: {Math.round(cursorY)}</div>
        </div>
      </div>

      {/* Simulated Motion Controller for Desktop Testing */}
      {onSimulateMotion && (
        <div className="simulator-area">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 6 }}>
            <Play size={12} style={{ display: 'inline' }} /> SIMULATED MOTION MODE
          </div>
          <div
            className="simulator-pad"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            Drag here or use Arrow Keys
          </div>
        </div>
      )}
    </div>
  );
};
