import React, { useState, useEffect } from 'react';
import './LoginDialog.css';
import './Win98Panel.css';
import useDraggable from '../hooks/useDraggable';

interface LoginDialogProps {
  onLogin: (username: string, password: string) => void;
  onCancel: () => void;
  isVisible: boolean;
  errorMessage?: string;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ onLogin, onCancel, isVisible, errorMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Use initial position in the center of the screen
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 320) / 2), // 320px is dialog width
    y: Math.max(0, window.innerHeight / 3)
  };
  
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable('login-dialog', initialPosition, true);

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onCancel]);

  // Reset form when dialog becomes visible
  useEffect(() => {
    if (isVisible) {
      setUsername('');
      setPassword('');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="win98-panel-overlay">
      <div 
        className="win98-panel" 
        style={{ 
          width: '320px',
          position: 'absolute',
          top: `${position.y}px`,
          left: `${position.x}px`
        }}
        ref={containerRef}
      >
        <div 
          className="win98-panel-header"
          ref={dragHandleRef}
          style={{ cursor: 'move' }}
        >
          <div className="win98-panel-title">Login</div>
          <button className="win98-panel-close" onClick={onCancel}>×</button>
        </div>

        <div className="win98-panel-content">
          <form onSubmit={handleSubmit}>
            <div className="win98-form-row">
              <label className="win98-label" htmlFor="username">Username:</label>
              <input
                className="win98-input"
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className="win98-form-row">
              <label className="win98-label" htmlFor="password">Password:</label>
              <input
                className="win98-input"
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="win98-panel-footer">
              <button 
                type="button" 
                className="win98-button" 
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="win98-button primary"
                disabled={!username || !password}
              >
                Login
              </button>
            </div>
          </form>
        </div>
        <div className={`win98-status-bar ${errorMessage ? 'error' : ''}`}>
          {errorMessage || ''}
        </div>
      </div>
    </div>
  );
}

export default LoginDialog; 