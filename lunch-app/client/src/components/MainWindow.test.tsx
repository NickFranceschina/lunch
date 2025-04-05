// Mock axios directly to avoid dependency issues
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  })),
  get: jest.fn(),
  post: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

// Import React and testing utils first
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Import the actual MainWindow
import MainWindow from './MainWindow';

// Mock WebSocketContext
const mockWebSocketValue = {
  isConnected: false,
  lastMessage: null,
  sendMessage: jest.fn(),
  addMessageListener: jest.fn().mockReturnValue(() => {}),
  addConnectionListener: jest.fn().mockReturnValue(() => {})
};

// Mock WebSocketContext
jest.mock('../services/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useWebSocket: () => mockWebSocketValue,
  __esModule: true
}));

// Mock the AuthContext to avoid dependency issues
jest.mock('../services/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn().mockReturnValue({
    isLoggedIn: false,
    login: jest.fn(),
    logout: jest.fn(),
    token: '',
    user: null,
    isAdmin: false,
    authState: { isAuthenticated: false, token: null }
  })
}));

// Mock the child components
jest.mock('./LEDIndicator', () => ({ ledOn }: { ledOn: boolean }) => 
  <div data-testid="led-indicator" data-led-on={ledOn}>LED</div>
);
jest.mock('./RestaurantDisplay', () => ({ restaurantName }: { restaurantName: string }) => 
  <div data-testid="restaurant-display">{restaurantName || 'No restaurant'}</div>
);
jest.mock('./VotingControls', () => ({ 
  handleVoteYes, 
  handleVoteNo, 
  handleNewRandom,
  hasVoted,
  disabled 
}: { 
  handleVoteYes: () => void, 
  handleVoteNo: () => void, 
  handleNewRandom: () => void,
  hasVoted: boolean,
  disabled: boolean
}) => (
  <div data-testid="voting-controls">
    <button onClick={handleVoteYes} disabled={disabled || hasVoted}>Yes</button>
    <button onClick={handleVoteNo} disabled={disabled || hasVoted}>No</button>
    <button onClick={handleNewRandom} disabled={disabled}>New</button>
  </div>
));
jest.mock('./StatusBar', () => ({ message }: { message: string }) => 
  <div data-testid="status-bar">{message}</div>
);
jest.mock('./LoginDialog', () => ({ 
  isVisible, 
  onCancel,
  onSubmit
}: {
  isVisible: boolean,
  onCancel: () => void,
  onSubmit: (username: string, password: string) => void
}) => (
  <div data-testid="login-dialog">
    <button onClick={() => onSubmit('username', 'password')}>Login</button>
    <button onClick={onCancel}>Cancel</button>
  </div>
));

// Mock services
jest.mock('../services/api', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue({ success: true }),
    validateToken: jest.fn()
  },
  restaurantService: {
    getCurrentRestaurant: jest.fn(),
    voteYes: jest.fn(),
    voteNo: jest.fn(),
    getRandomRestaurant: jest.fn()
  },
  userService: {
    getUserById: jest.fn()
  },
  groupService: {
    getGroupById: jest.fn()
  }
}));
jest.mock('../services/socketio.service', () => ({
  socketIOService: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(false),
    clearMessageListeners: jest.fn(),
    addMessageListener: jest.fn().mockReturnValue(() => {}),
    send: jest.fn()
  }
}));

// Mock hook
jest.mock('../hooks/useDraggable', () => () => ({
  position: { x: 0, y: 0 },
  containerRef: { current: null },
  dragHandleRef: { current: null },
  resetPosition: jest.fn()
}));

// Helper function to render the component with required context providers
const renderWithProviders = (isVisible = true, toggleVisibility = jest.fn()) => {
  return render(
    <MainWindow 
      isVisible={isVisible} 
      toggleVisibility={toggleVisibility} 
    />
  );
};

describe('MainWindow Component', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('renders the main window with LUNCH title', () => {
    render(
      <MainWindow 
        isVisible={true} 
        toggleVisibility={jest.fn()} 
      />
    );
    
    // Check for LUNCH text in the title bar
    const titleElement = screen.getByText('LUNCH');
    expect(titleElement).toBeInTheDocument();
  });

  test('has close button that can be clicked', () => {
    const toggleVisibilityMock = jest.fn();
    render(
      <MainWindow 
        isVisible={true} 
        toggleVisibility={toggleVisibilityMock} 
      />
    );
    
    // Find the close button by its aria-label
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    
    // The toggleVisibility function should have been called
    expect(toggleVisibilityMock).toHaveBeenCalledTimes(1);
  });

  test('shows login prompt when not logged in', () => {
    render(
      <MainWindow 
        isVisible={true} 
        toggleVisibility={jest.fn()} 
      />
    );
    
    // Check for the login prompt text
    const loginPrompt = screen.getByText(/Please login to use the application/i);
    expect(loginPrompt).toBeInTheDocument();
  });

  test('renders the status bar', () => {
    render(
      <MainWindow 
        isVisible={true} 
        toggleVisibility={jest.fn()} 
      />
    );
    
    // Check that the status bar is rendered
    const statusBar = screen.getByTestId('status-bar');
    expect(statusBar).toBeInTheDocument();
  });
}); 