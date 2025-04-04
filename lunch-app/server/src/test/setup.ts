// global setup file for server tests
// @ts-nocheck
// Using ts-nocheck to avoid TypeScript errors in this file

// Mock typeorm
jest.mock('typeorm', () => {
  const original = jest.requireActual('typeorm');
  
  return {
    ...original,
    // Mock various typeorm functions as needed
    createConnection: jest.fn(),
    getConnection: jest.fn(),
    getRepository: jest.fn(),
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue({}),
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
          getMany: jest.fn(),
          getOne: jest.fn()
        })
      })
    })),
    Entity: () => jest.fn(),
    PrimaryGeneratedColumn: () => jest.fn(),
    Column: () => jest.fn(),
    ManyToOne: () => jest.fn(),
    OneToMany: () => jest.fn(),
    JoinColumn: () => jest.fn()
  };
});

// Mock WebSocket
jest.mock('ws', () => {
  const mockedWs = {
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn()
  };
  
  const MockWebSocketServer = jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'connection') {
        // Simulate a connection
        callback(mockedWs, { url: 'ws://localhost:3001' });
      }
    }),
    clients: new Set([mockedWs]),
    handleUpgrade: jest.fn(),
    close: jest.fn()
  }));
  
  return {
    WebSocket: jest.fn().mockImplementation(() => mockedWs),
    WebSocketServer: MockWebSocketServer
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockImplementation((password) => Promise.resolve(`hashed_${password}`))
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation(() => 'mocked_token'),
  verify: jest.fn().mockImplementation(() => ({ id: 1, username: 'testuser', role: 'admin' }))
}));

// Global beforeEach and afterEach hooks
beforeEach(() => {
  jest.clearAllMocks();
});

// Don't silence console errors during tests, but do mock them
// This helps with debugging while still preventing console noise during test runs
global.console.error = jest.fn();
global.console.warn = jest.fn();
global.console.log = jest.fn(); 