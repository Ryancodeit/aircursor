import React, { useState } from 'react';
import { Delete, ArrowUp, X } from 'lucide-react';
import { AirCursorSocketClient } from '../../networking/socketClient.js';


interface KeyboardModeProps {
  socketClient: AirCursorSocketClient | null;
  triggerHaptic?: (pattern?: number | number[]) => void;
}

export const KeyboardMode: React.FC<KeyboardModeProps> = ({ socketClient, triggerHaptic }) => {
  const [textBuffer, setTextBuffer] = useState<string>('');
  const [isShift, setIsShift] = useState<boolean>(false);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);

  const sendKey = (key: string, modifiers?: string[]) => {
    if (triggerHaptic) triggerHaptic(12);

    const activeMods = modifiers || activeModifiers;
    socketClient?.sendKeyboardInput(key, activeMods.length > 0 ? activeMods : undefined);

    // Update text preview buffer
    if (key === 'BACKSPACE') {
      setTextBuffer((prev) => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      setTextBuffer('');
    } else if (key === 'SPACE') {
      setTextBuffer((prev) => prev + ' ');
    } else if (key.length === 1) {
      const charToSend = isShift ? key.toUpperCase() : key.toLowerCase();
      setTextBuffer((prev) => prev + charToSend);
      if (isShift) setIsShift(false);
    }
  };

  const toggleModifier = (mod: string) => {
    if (triggerHaptic) triggerHaptic(10);
    setActiveModifiers((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const row1Letters = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2Letters = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3Letters = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const numRow1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const numRow2 = ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'];
  const numRow3 = ['.', ',', '?', '!', "'"];

  return (
    <div className="keyboard-mode-container">
      {/* Top Search / Preview Bar */}
      <div className="kb-search-bar 3d-surface">
        <input
          type="text"
          className="kb-input-preview"
          placeholder="Type a message or search..."
          value={textBuffer}
          onChange={(e) => setTextBuffer(e.target.value)}
        />
        {textBuffer && (
          <button className="kb-clear-btn" onClick={() => setTextBuffer('')} type="button">
            <X size={16} />
          </button>
        )}
      </div>

      {/* PC Quick Shortcuts Bar */}
      <div className="kb-shortcuts-bar">
        <button className="kb-shortcut-btn" onClick={() => sendKey('c', ['ctrl'])} type="button">
          Ctrl+C
        </button>
        <button className="kb-shortcut-btn" onClick={() => sendKey('v', ['ctrl'])} type="button">
          Ctrl+V
        </button>
        <button className="kb-shortcut-btn" onClick={() => sendKey('x', ['ctrl'])} type="button">
          Ctrl+X
        </button>
        <button className="kb-shortcut-btn" onClick={() => sendKey('z', ['ctrl'])} type="button">
          Ctrl+Z
        </button>
        <button className="kb-shortcut-btn" onClick={() => sendKey('a', ['ctrl'])} type="button">
          Ctrl+A
        </button>
      </div>

      {/* PC Modifiers Bar */}
      <div className="kb-modifiers-bar">
        <button
          className={`kb-mod-btn ${activeModifiers.includes('ctrl') ? 'active' : ''}`}
          onClick={() => toggleModifier('ctrl')}
          type="button"
        >
          Ctrl
        </button>
        <button
          className={`kb-mod-btn ${activeModifiers.includes('alt') ? 'active' : ''}`}
          onClick={() => toggleModifier('alt')}
          type="button"
        >
          Alt
        </button>
        <button className="kb-mod-btn" onClick={() => sendKey('WIN')} type="button">
          Win
        </button>
        <button className="kb-mod-btn" onClick={() => sendKey('TAB')} type="button">
          Tab
        </button>
        <button className="kb-mod-btn" onClick={() => sendKey('ESC')} type="button">
          Esc
        </button>
      </div>

      {/* Virtual QWERTY Keyboard */}
      <div className="kb-keys-grid">
        {!showNumbers ? (
          <>
            {/* Letters Row 1 */}
            <div className="kb-row">
              {row1Letters.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {isShift ? char.toUpperCase() : char}
                </button>
              ))}
            </div>

            {/* Letters Row 2 */}
            <div className="kb-row row-indent">
              {row2Letters.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {isShift ? char.toUpperCase() : char}
                </button>
              ))}
            </div>

            {/* Letters Row 3 with Shift & Backspace */}
            <div className="kb-row">
              <button
                className={`kb-key kb-key-action ${isShift ? 'active' : ''}`}
                onClick={() => setIsShift((prev) => !prev)}
                type="button"
              >
                <ArrowUp size={18} />
              </button>
              {row3Letters.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {isShift ? char.toUpperCase() : char}
                </button>
              ))}
              <button
                className="kb-key kb-key-action"
                onClick={() => sendKey('BACKSPACE')}
                type="button"
              >
                <Delete size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Numbers Row 1 */}
            <div className="kb-row">
              {numRow1.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Numbers Row 2 */}
            <div className="kb-row">
              {numRow2.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Numbers Row 3 */}
            <div className="kb-row">
              {numRow3.map((char) => (
                <button
                  key={char}
                  className="kb-key 3d-btn"
                  onClick={() => sendKey(char)}
                  type="button"
                >
                  {char}
                </button>
              ))}
              <button
                className="kb-key kb-key-action"
                onClick={() => sendKey('BACKSPACE')}
                type="button"
              >
                <Delete size={18} />
              </button>
            </div>
          </>
        )}

        {/* Bottom Row: 123 Toggle / Space / Enter */}
        <div className="kb-row kb-bottom-row">
          <button
            className="kb-key kb-key-toggle"
            onClick={() => setShowNumbers((prev) => !prev)}
            type="button"
          >
            {showNumbers ? 'ABC' : '123'}
          </button>

          <button
            className="kb-key kb-key-space 3d-btn"
            onClick={() => sendKey('SPACE')}
            type="button"
          >
            space
          </button>

          <button
            className="kb-key kb-key-enter"
            onClick={() => sendKey('ENTER')}
            type="button"
          >
            return
          </button>
        </div>
      </div>
    </div>
  );
};
