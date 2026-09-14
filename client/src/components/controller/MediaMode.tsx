import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  RotateCw,
  Maximize2,
  Music
} from 'lucide-react';

import { AirCursorSocketClient } from '../../networking/socketClient.js';
import { MediaCommand } from '@aircursor/shared';

interface MediaModeProps {
  socketClient: AirCursorSocketClient | null;
  triggerHaptic?: (pattern?: number | number[]) => void;
}

export const MediaMode: React.FC<MediaModeProps> = ({ socketClient, triggerHaptic }) => {
  const [isPlaying, setIsPlaying] = useState(true);

  const sendMedia = (cmd: MediaCommand) => {
    if (triggerHaptic) triggerHaptic(15);
    if (cmd === 'play_pause') {
      setIsPlaying((prev) => !prev);
    }
    socketClient?.sendMediaCommand(cmd);
  };

  return (
    <div className="media-mode-container">
      {/* Media Player Visual Header */}
      <div className="media-player-card 3d-surface">
        <div className="media-album-disc">
          <Music size={32} className="album-icon" />
          <div className={`disc-ring ${isPlaying ? 'spinning' : ''}`} />
        </div>

        <div className="media-info">
          <div className="media-now-playing">Now Playing</div>
          <div className="media-title">Better Together</div>
          <div className="media-artist">Jack Johnson</div>
        </div>

        <div className="media-progress-bar">
          <span className="time-curr">1:42</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '48%' }} />
          </div>
          <span className="time-total">3:28</span>
        </div>
      </div>

      {/* Primary Playback Row */}
      <div className="playback-primary-row">
        <button
          className="media-btn 3d-btn prev-btn"
          onClick={() => sendMedia('previous')}
          title="Previous Track"
          type="button"
        >
          <SkipBack size={24} />
        </button>

        <button
          className={`media-btn 3d-btn play-pause-btn ${isPlaying ? 'playing' : ''}`}
          onClick={() => sendMedia('play_pause')}
          title="Play / Pause"
          type="button"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
        </button>

        <button
          className="media-btn 3d-btn next-btn"
          onClick={() => sendMedia('next')}
          title="Next Track"
          type="button"
        >
          <SkipForward size={24} />
        </button>
      </div>

      {/* Secondary Volume Controls Grid */}
      <div className="media-controls-grid">
        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('volume_up')}
          type="button"
        >
          <Volume2 size={20} />
          <span>Volume Up</span>
        </button>

        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('volume_down')}
          type="button"
        >
          <Volume1 size={20} />
          <span>Volume Down</span>
        </button>

        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('mute')}
          type="button"
        >
          <VolumeX size={20} />
          <span>Mute</span>
        </button>

        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('fullscreen')}
          type="button"
        >
          <Maximize2 size={20} />
          <span>Fullscreen</span>
        </button>

        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('seek_backward')}
          type="button"
        >
          <RotateCcw size={20} />
          <span>-10s Seek</span>
        </button>

        <button
          className="media-grid-btn 3d-btn"
          onClick={() => sendMedia('seek_forward')}
          type="button"
        >
          <RotateCw size={20} />
          <span>+10s Seek</span>
        </button>
      </div>
    </div>
  );
};
