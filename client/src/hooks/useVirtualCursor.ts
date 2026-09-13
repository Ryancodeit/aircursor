import { useState, useCallback, useRef, useEffect } from 'react';
import { WSMessage } from '@aircursor/shared';
import { CursorEngine } from '../cursor/CursorEngine.js';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface TrailPoint extends CursorPosition {
  id: number;
  alpha: number;
}

export function useVirtualCursor() {
  const [mode, setMode] = useState<'cursor' | 'laser' | 'presentation'>('cursor');
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; id: number; type: string } | null>(null);

  const cursorRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CursorEngine>(new CursorEngine());

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Initialize and start CursorEngine requestAnimationFrame loop
  useEffect(() => {
    const engine = engineRef.current;
    if (cursorRef.current) {
      engine.attachElement(cursorRef.current);
    }
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  // Callback to attach ref element dynamically
  const attachRef = useCallback((node: HTMLDivElement | null) => {
    cursorRef.current = node;
    engineRef.current.attachElement(node);
  }, []);

  const moveCursor = useCallback((deltaX: number, deltaY: number) => {
    const engine = engineRef.current;
    // Add raw delta to imperative CursorEngine loop (zero React state updates!)
    engine.addMotionDelta(deltaX, deltaY);

    if (modeRef.current === 'laser') {
      const pos = engine.getPosition();
      setTrail((tPrev) => [
        { x: pos.x, y: pos.y, id: Date.now() + Math.random(), alpha: 1 },
        ...tPrev.slice(0, 15),
      ]);
    }
  }, []);

  const triggerDOMClick = useCallback((type: 'click' | 'double_click' | 'right_click') => {
    const { x, y } = engineRef.current.getPosition();
    const targetEl = document.elementFromPoint(x, y) as HTMLElement;

    if (!targetEl) return;

    if (type === 'click') {
      setClickRipple({ x, y, id: Date.now(), type: 'left' });
      targetEl.focus?.();
      targetEl.click();
    } else if (type === 'double_click') {
      setClickRipple({ x, y, id: Date.now(), type: 'left' });
      targetEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    } else if (type === 'right_click') {
      setClickRipple({ x, y, id: Date.now(), type: 'right' });
      targetEl.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 2,
        })
      );
    }
  }, []);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case 'motion':
          moveCursor(msg.dx, msg.dy);
          break;
        case 'click':
          triggerDOMClick('click');
          break;
        case 'double_click':
          triggerDOMClick('double_click');
          break;
        case 'right_click':
          triggerDOMClick('right_click');
          break;
        case 'scroll': {
          const { x, y } = engineRef.current.getPosition();
          const targetEl = document.elementFromPoint(x, y) || window;
          targetEl.dispatchEvent(
            new WheelEvent('wheel', {
              bubbles: true,
              cancelable: true,
              deltaY: (msg.dy || 0) * 3,
              clientX: x,
              clientY: y,
            })
          );
          break;
        }
      }
    },
    [moveCursor, triggerDOMClick]
  );

  return {
    cursorRef: attachRef,
    mode,
    setMode,
    trail,
    clickRipple,
    moveCursor,
    handleMessage,
  };
}
