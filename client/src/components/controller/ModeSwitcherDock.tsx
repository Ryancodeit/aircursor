import React from 'react';
import { Compass, Touchpad as TouchpadIcon, Music, Keyboard } from 'lucide-react';
import { ControlMode } from '@aircursor/shared';

interface ModeSwitcherDockProps {
  activeMode: ControlMode;
  onSelectMode: (mode: ControlMode) => void;
  triggerHaptic?: (pattern?: number | number[]) => void;
}

export const ModeSwitcherDock: React.FC<ModeSwitcherDockProps> = ({
  activeMode,
  onSelectMode,
  triggerHaptic
}) => {
  const modes: { id: ControlMode; label: string; icon: React.ReactNode }[] = [
    { id: 'aircursor', label: 'Air Cursor', icon: <Compass size={17} /> },
    { id: 'touchpad', label: 'Touchpad', icon: <TouchpadIcon size={17} /> },
    { id: 'media', label: 'Media', icon: <Music size={17} /> },
    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard size={17} /> }
  ];

  const handleModeClick = (mode: ControlMode) => {
    if (mode !== activeMode) {
      if (triggerHaptic) triggerHaptic(12);
      onSelectMode(mode);
    }
  };

  return (
    <div className="mode-switcher-dock">
      {modes.map((m) => {
        const isActive = activeMode === m.id;
        return (
          <button
            key={m.id}
            className={`dock-item ${isActive ? 'active' : ''}`}
            onClick={() => handleModeClick(m.id)}
            type="button"
          >
            <span className="dock-icon">{m.icon}</span>
            <span className="dock-label">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
