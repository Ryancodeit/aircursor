import React from 'react';
import { WSConnectionState } from '../../networking/socketClient.js';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  state: WSConnectionState;
  customText?: string;
  attempt?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, customText, attempt }) => {
  const renderText = () => {
    if (customText) return customText;
    switch (state) {
      case 'CONNECTED':
        return '● Connected';
      case 'CONNECTING':
        return '● Connecting...';
      case 'RECONNECTING':
        return `● Reconnecting... ${attempt ? `(attempt ${attempt})` : ''}`;
      case 'DISCONNECTED':
        return '○ Disconnected';
      case 'ERROR':
        return '✕ Connection Error';
      default:
        return '○ Disconnected';
    }
  };

  const cssClass = state.toLowerCase();

  return (
    <div className={`connection-status-badge ${cssClass}`}>
      <span className={`status-dot ${cssClass}`} />
      <span>{renderText()}</span>
    </div>
  );
};
