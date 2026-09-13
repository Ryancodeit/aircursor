import React, { useState, useEffect } from 'react';
import { Target, Trophy, RefreshCw } from 'lucide-react';
import './Demos.css';

export const TargetGame: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // percentage
  const [targetsHit, setTargetsHit] = useState(0);

  const spawnTarget = () => {
    // Generate new random target coordinates (between 15% and 85%)
    const x = Math.floor(Math.random() * 70) + 15;
    const y = Math.floor(Math.random() * 60) + 20;
    setTargetPos({ x, y });
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newScore = score + 100;
    const newHits = targetsHit + 1;
    setScore(newScore);
    setTargetsHit(newHits);
    if (newScore > highScore) setHighScore(newScore);
    spawnTarget();
  };

  const resetGame = () => {
    setScore(0);
    setTargetsHit(0);
    spawnTarget();
  };

  useEffect(() => {
    spawnTarget();
  }, []);

  return (
    <div className="demo-container target-game-container">
      <div className="game-stats-bar glass-card">
        <div className="stat-item">
          <Target size={18} className="icon-gold" />
          <span>Targets Hit: <strong>{targetsHit}</strong></span>
        </div>
        <div className="stat-item">
          <Trophy size={18} className="icon-accent" />
          <span>Score: <strong>{score}</strong></span>
        </div>
        <button className="btn-secondary btn-sm" onClick={resetGame}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      <div className="game-arena">
        <p className="game-instruction">Aim with phone and click targets to score points!</p>
        <div
          className="interactive-target"
          style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
          onClick={handleTargetClick}
        >
          <div className="target-ring ring-3" />
          <div className="target-ring ring-2" />
          <div className="target-bullseye" />
        </div>
      </div>
    </div>
  );
};
