import React from 'react';
import './GitHubIcon.css';

const GitHubIcon: React.FC = () => {
  const openGitHubRepo = () => {
    window.open('https://github.com/NickFranceschina/lunch', '_blank');
  };

  return (
    <div className="desktop-icon github-icon" onClick={openGitHubRepo}>
      <div className="icon-image">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* GitHub Icon with white circular edge */}
          <circle cx="16" cy="16" r="15" fill="#000000" stroke="white" strokeWidth="2" />
          <path
            d="M16 3C8.83 3 3 8.83 3 16C3 21.55 6.66 26.22 11.73 27.88C12.33 28 12.58 27.64 12.58 27.32C12.58 27.03 12.57 26.11 12.57 25.09C9 25.81 8.21 23.54 8.21 23.54C7.59 22.03 6.69 21.67 6.69 21.67C5.5 20.85 6.77 20.87 6.77 20.87C8.07 20.96 8.79 22.18 8.79 22.18C10 24.23 11.92 23.6 12.61 23.28C12.73 22.42 13.09 21.79 13.48 21.44C10.56 21.09 7.49 19.96 7.49 15.12C7.49 13.72 8.01 12.57 8.81 11.67C8.68 11.37 8.22 9.98 9 8.24C9 8.24 10.08 7.91 12.56 9.55C13.67 9.27 14.84 9.13 16 9.13C17.16 9.13 18.33 9.27 19.44 9.55C21.92 7.91 23 8.24 23 8.24C23.78 9.98 23.32 11.37 23.19 11.67C23.99 12.57 24.51 13.72 24.51 15.12C24.51 19.97 21.44 21.08 18.5 21.43C19 21.86 19.44 22.7 19.44 24C19.44 25.85 19.43 26.92 19.43 27.32C19.43 27.64 19.67 28.01 20.28 27.88C25.34 26.22 29 21.55 29 16C29 8.83 23.17 3 16 3Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="icon-label">GitHub</div>
    </div>
  );
};

export default GitHubIcon; 