import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import './Demos.css';

const SLIDES = [
  {
    id: 1,
    title: 'Welcome to AirCursor',
    subtitle: 'Zero-Hardware Motion Controller',
    content: 'AirCursor transforms your existing mobile phone into a 3D motion mouse using native web orientation sensors.',
    accent: '#6366f1',
  },
  {
    id: 2,
    title: 'Ultra-Low Latency',
    subtitle: '60 FPS Direct WebSocket Stream',
    content: 'Sensors sample at up to 120Hz, providing instantaneous visual feedback with sub-20ms responsiveness.',
    accent: '#06b6d4',
  },
  {
    id: 3,
    title: 'Laser Pointer Mode',
    subtitle: 'Toggle Laser for Presentations',
    content: 'Press the LASER button on your phone controller to switch from mouse cursor to glowing laser pointer trail.',
    accent: '#ff3366',
  },
];

export const PresentationDemo: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="demo-container presentation-container">
      <div className="slide-card glass-card">
        <div className="slide-header">
          <Presentation size={24} style={{ color: slide.accent }} />
          <span>Slide {currentSlide + 1} of {SLIDES.length}</span>
        </div>

        <div className="slide-body">
          <h2 style={{ color: slide.accent }}>{slide.title}</h2>
          <h3>{slide.subtitle}</h3>
          <p>{slide.content}</p>
        </div>

        <div className="slide-controls">
          <button className="btn-secondary" onClick={prevSlide}>
            <ChevronLeft size={20} /> Previous
          </button>
          <button className="btn-primary" onClick={nextSlide}>
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
