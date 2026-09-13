import { Monitor, Smartphone, Sparkles, Shield, ArrowRight, Laptop, Tablet } from 'lucide-react';
import './HomePage.css';

interface HomePageProps {
  onSelectRole: (role: 'screen' | 'controller') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectRole }) => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="brand-badge">
          <Sparkles size={14} /> Next-Gen Air Mouse
        </div>

        <h1 className="home-title">AIRCURSOR</h1>
        <p className="home-tagline">"Turn your phone into an air mouse."</p>
        <p className="home-subtitle">
          Move the cursor on another screen simply by moving your phone.
        </p>

        {/* Primary CTA Cards */}
        <div className="mode-cards-grid">
          {/* Mode A: Target Screen */}
          <div
            className="mode-card glass-card screen"
            onClick={() => onSelectRole('screen')}
          >
            <div className="icon-wrapper">
              <Monitor size={36} />
            </div>
            <h2 className="mode-card-title">Use as Screen</h2>
            <p className="mode-card-desc">
              Open on your PC, Mac, tablet, or TV. Displays a short pairing code and QR code for your phone to connect.
            </p>
            <button className="btn-primary" style={{ width: '100%' }}>
              <Monitor size={20} /> Use as Screen <ArrowRight size={18} />
            </button>
          </div>

          {/* Mode B: Controller */}
          <div
            className="mode-card glass-card controller"
            onClick={() => onSelectRole('controller')}
          >
            <div className="icon-wrapper">
              <Smartphone size={36} />
            </div>
            <h2 className="mode-card-title">Use as Controller</h2>
            <p className="mode-card-desc">
              Open on your smartphone. Uses built-in motion sensors to aim and control the target screen cursor.
            </p>
            <button className="btn-secondary" style={{ width: '100%' }}>
              <Smartphone size={20} /> Use as Controller <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="info-section">
        <h2 className="section-heading">How it works</h2>
        <div className="steps-grid">
          <div className="step-card glass-card">
            <div className="step-num">1</div>
            <h3>Open AirCursor on your screen</h3>
            <p>Select "Use as Screen" on your desktop or laptop browser.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-num">2</div>
            <h3>Scan the QR code with your phone</h3>
            <p>Point your phone camera at the screen or type the 6-character code.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-num">3</div>
            <h3>Calibrate</h3>
            <p>Hold your phone naturally and tap CALIBRATE to zero your position.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-num">4</div>
            <h3>Move your phone</h3>
            <p>Physical phone rotation smoothly moves the virtual cursor in real time.</p>
          </div>
        </div>
      </section>

      {/* Works Across Devices Section */}
      <section className="info-section">
        <h2 className="section-heading">Works across devices</h2>
        <div className="devices-grid">
          <div className="device-chip glass-card">
            <Smartphone size={20} className="icon-cyan" /> Phone <ArrowRight size={14} /> <Laptop size={20} className="icon-indigo" /> PC
          </div>
          <div className="device-chip glass-card">
            <Smartphone size={20} className="icon-cyan" /> Phone <ArrowRight size={14} /> <Laptop size={20} className="icon-indigo" /> Mac
          </div>
          <div className="device-chip glass-card">
            <Smartphone size={20} className="icon-cyan" /> Phone <ArrowRight size={14} /> <Tablet size={20} className="icon-indigo" /> Tablet
          </div>
          <div className="device-chip glass-card">
            <Smartphone size={20} className="icon-cyan" /> Phone <ArrowRight size={14} /> <Smartphone size={20} className="icon-indigo" /> Phone
          </div>
        </div>
      </section>

      {/* Privacy Statement Footer */}
      <footer className="privacy-footer-banner glass-card">
        <Shield size={22} className="icon-emerald" />
        <div className="privacy-text">
          <strong>No account. No tracking. No motion data stored.</strong>
          <p>Sessions exist transiently in server memory only while active.</p>
        </div>
      </footer>
    </div>
  );
};
