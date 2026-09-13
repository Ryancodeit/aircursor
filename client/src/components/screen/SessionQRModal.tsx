import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, Copy, Check } from 'lucide-react';
import './SessionQRModal.css';

interface SessionQRModalProps {
  pairCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SessionQRModal: React.FC<SessionQRModalProps> = ({
  pairCode,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Build controller URL for direct QR scan join
  const joinUrl = `${window.location.origin}/?role=controller&code=${pairCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="qr-modal-overlay">
      <div className="qr-modal-content glass-card">
        <button className="qr-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="qr-modal-header">
          <div className="qr-icon-badge">
            <Smartphone size={24} />
          </div>
          <h2>Connect Your Phone</h2>
          <p>Scan the QR code or enter the code on your phone's browser</p>
        </div>

        <div className="qr-code-box">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#090d16"
            level="M"
            includeMargin={true}
          />
        </div>

        <div className="code-display-group">
          <span className="code-label">PAIRING CODE</span>
          <div className="pair-code-text">
            {pairCode.split('').map((char, index) => (
              <span key={index} className="code-digit">
                {char}
              </span>
            ))}
          </div>
          <button className="btn-secondary btn-sm copy-btn" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  );
};
