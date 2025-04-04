import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useDraggable from '../hooks/useDraggable';
import './HelpWindow.css';

interface HelpWindowProps {
  isVisible: boolean;
  onClose: () => void;
}

const HelpWindow: React.FC<HelpWindowProps> = ({ isVisible, onClose }) => {
  const [helpContent, setHelpContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set initial position for the draggable window
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 500) / 2),
    y: Math.max(0, (window.innerHeight - 400) / 4),
  };

  // Use draggable hook
  const { position, containerRef, dragHandleRef } = useDraggable('help-window', initialPosition, true);

  // Load the help.md file when component mounts
  useEffect(() => {
    const fetchHelpContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/help.md');
        if (!response.ok) {
          throw new Error('Failed to load help documentation');
        }
        const content = await response.text();
        setHelpContent(content);
      } catch (error) {
        console.error('Error loading help documentation:', error);
        setHelpContent('# Error\n\nFailed to load help documentation. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isVisible) {
      fetchHelpContent();
    }
  }, [isVisible]);

  // Save window visibility state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('window_visibility_help', isVisible.toString());
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="help-window-container"
      ref={containerRef}
      style={{ 
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="help-window">
        <div className="help-title-bar" ref={dragHandleRef}>
          <div className="help-title-bar-text">
            <img 
              src="/favicon.ico" 
              alt="Help" 
              className="help-title-icon" 
            />
            <span>Lunch App Help</span>
          </div>
          <div className="help-title-bar-controls">
            <button onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="help-toolbar">
          <button className="help-toolbar-button" title="Contents">
            <span className="help-toolbar-icon">📚</span>
          </button>
          <button className="help-toolbar-button" title="Index">
            <span className="help-toolbar-icon">📇</span>
          </button>
          <button className="help-toolbar-button" title="Search">
            <span className="help-toolbar-icon">🔍</span>
          </button>
          <button className="help-toolbar-button" title="Print">
            <span className="help-toolbar-icon">🖨️</span>
          </button>
          <button className="help-toolbar-button" title="Options">
            <span className="help-toolbar-icon">⚙️</span>
          </button>
        </div>
        <div className="help-content-container">
          <div className="help-sidebar">
            <div className="help-tabs">
              <button className="help-tab help-tab-active">Contents</button>
              <button className="help-tab">Index</button>
              <button className="help-tab">Search</button>
            </div>
            <div className="help-tree">
              <div className="help-tree-item">
                <span className="help-tree-icon">📘</span>
                <span className="help-tree-text">Lunch App Help</span>
              </div>
              <div className="help-tree-item help-tree-indent">
                <span className="help-tree-icon">📄</span>
                <span className="help-tree-text">Getting Started</span>
              </div>
              <div className="help-tree-item help-tree-indent">
                <span className="help-tree-icon">📄</span>
                <span className="help-tree-text">Main Features</span>
              </div>
              <div className="help-tree-item help-tree-indent">
                <span className="help-tree-icon">📄</span>
                <span className="help-tree-text">User Management</span>
              </div>
              <div className="help-tree-item help-tree-indent">
                <span className="help-tree-icon">📄</span>
                <span className="help-tree-text">Restaurant Selection</span>
              </div>
            </div>
          </div>
          <div className="help-content">
            {isLoading ? (
              <div className="help-loading">Loading help documentation...</div>
            ) : (
              <ReactMarkdown
                children={helpContent}
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="help-heading-1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="help-heading-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="help-heading-3" {...props} />,
                  a: ({ node, ...props }) => <a className="help-link" {...props} />,
                  ul: ({ node, ...props }) => <ul className="help-list" {...props} />,
                  ol: ({ node, ...props }) => <ol className="help-ordered-list" {...props} />,
                  li: ({ node, ...props }) => <li className="help-list-item" {...props} />,
                  p: ({ node, ...props }) => <p className="help-paragraph" {...props} />,
                  code: ({ node, ...props }) => <code className="help-code" {...props} />,
                  pre: ({ node, ...props }) => <pre className="help-pre" {...props} />,
                }}
              />
            )}
          </div>
        </div>
        <div className="help-statusbar">
          <div className="help-status-text">Press F1 for more help</div>
        </div>
      </div>
    </div>
  );
};

export default HelpWindow; 