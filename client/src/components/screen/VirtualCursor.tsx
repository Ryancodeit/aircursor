import { forwardRef } from 'react';
import { TrailPoint } from '../../hooks/useVirtualCursor.js';
import './VirtualCursor.css';

interface VirtualCursorProps {
  mode?: 'cursor' | 'laser' | 'presentation';
  trail?: TrailPoint[];
  clickRipple?: { x: number; y: number; id: number; type: string } | null;
}

export const VirtualCursor = forwardRef<HTMLDivElement, VirtualCursorProps>(({
  mode = 'cursor',
  trail = [],
  clickRipple = null,
}, ref) => {
  return (
    <div className="virtual-cursor-container">
      {/* Laser Trail Particles */}
      {mode === 'laser' &&
        trail.map((point, index) => (
          <div
            key={point.id}
            className="laser-trail-dot"
            style={{
              transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
              opacity: (15 - index) / 15,
              scale: `${(15 - index) / 15}`,
            }}
          />
        ))}

      {/* Non-Blocking Click Ripple Effect */}
      {clickRipple && (
        <div
          key={clickRipple.id}
          className={`click-ripple ${clickRipple.type}`}
          style={{
            transform: `translate3d(${clickRipple.x}px, ${clickRipple.y}px, 0)`,
          }}
        />
      )}

      {/* Main Custom Pointer Element (Imperatively Controlled via Ref) */}
      <div ref={ref} className="virtual-cursor">
        {mode === 'laser' ? (
          <div className="cursor-dot-laser" />
        ) : (
          <div className="cursor-pointer-dual">
            <div className="cursor-outer-ring" />
            <div className="cursor-center-dot" />
          </div>
        )}
      </div>
    </div>
  );
});

VirtualCursor.displayName = 'VirtualCursor';
