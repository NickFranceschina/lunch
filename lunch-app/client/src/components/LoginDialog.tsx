import React, { useState } from 'react';
import './LoginDialog.css';

interface LoginDialogProps {
  onLogin: (username: string, password: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ onLogin, onCancel, isVisible }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="login-overlay">
      <div className="login-dialog">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="button-group">
            <button type="submit">Login</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginDialog; 