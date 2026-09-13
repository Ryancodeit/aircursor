import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage.js';
import { ScreenPage } from './pages/ScreenPage.js';
import { ControllerPage } from './pages/ControllerPage.js';
import './styles/global.css';

export function App() {
  const [role, setRole] = useState<'home' | 'screen' | 'controller'>('home');
  const [initialCode, setInitialCode] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('session');

    if (codeParam) {
      setInitialCode(codeParam.toUpperCase());
      setRole('controller');
    } else if (path.includes('/screen') || params.get('role') === 'screen') {
      setRole('screen');
    } else if (path.includes('/controller') || params.get('role') === 'controller') {
      setRole('controller');
    }
  }, []);

  const navigateToRole = (selectedRole: 'screen' | 'controller') => {
    window.history.pushState({}, '', `/${selectedRole}`);
    setRole(selectedRole);
  };

  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    setRole('home');
  };

  return (
    <>
      {role === 'home' && <HomePage onSelectRole={navigateToRole} />}
      {role === 'screen' && <ScreenPage onBack={navigateHome} />}
      {role === 'controller' && (
        <ControllerPage initialCode={initialCode} onBack={navigateHome} />
      )}
    </>
  );
}
