import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the child components
jest.mock('./components/MainWindow', () => () => <div data-testid="main-window">Main Window</div>);
jest.mock('./components/Win98Taskbar', () => () => <div data-testid="win98-taskbar">Taskbar</div>);
jest.mock('./components/HelpWindow', () => () => <div data-testid="help-window">Help Window</div>);
jest.mock('./services/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));
jest.mock('./services/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="websocket-provider">{children}</div>,
}));

test('renders main application components', () => {
  render(<App />);
  
  // Check if the main components are rendered
  expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
  expect(screen.getByTestId('main-window')).toBeInTheDocument();
  expect(screen.getByTestId('win98-taskbar')).toBeInTheDocument();
  expect(screen.getByTestId('help-window')).toBeInTheDocument();
});
