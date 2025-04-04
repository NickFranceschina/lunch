// @ts-nocheck
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { login, logout, register } from '../auth.controller';
import { AppDataSource } from '../../config/database';
import { User } from '../../models/User';

// Mock the database connection and repository
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }),
  },
}));

// Mock Request and Response objects
const mockRequest = () => {
  const req: Partial<Request> = {
    body: {},
    userId: undefined,
    ip: '127.0.0.1',
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res as Response;
};

describe('Authentication Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 400 if username or password is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: '', password: '' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required',
      });
    });

    it('should return 401 if user does not exist', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: 'nonexistent', password: 'password' };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([]);

      await login(req, res);

      expect(mockFind).toHaveBeenCalledWith({ relations: ['groups'] });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid username or password',
      });
    });

    it('should return 401 if password is invalid', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: 'testuser', password: 'wrongpassword' };

      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        isAdmin: false,
        currentGroupId: null,
        groups: [],
      };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([mockUser]);

      // Mock bcrypt.compare to return false for invalid password
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

      await login(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid username or password',
      });
    });

    it('should return 200 and JWT token for successful login', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { 
        username: 'testuser', 
        password: 'correctpassword',
        ipAddress: '192.168.1.1',
        port: 1234
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        isAdmin: false,
        currentGroupId: 2,
        groups: [{ id: 2, name: 'Test Group' }],
        isLoggedIn: false,
        ipAddress: null,
        port: null,
      };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([mockUser]);

      // Mock bcrypt.compare to return true for valid password
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Mock jwt.sign
      jest.spyOn(jwt, 'sign').mockReturnValueOnce('mocked.jwt.token');

      const mockSave = AppDataSource.getRepository(User).save as jest.Mock;
      mockSave.mockResolvedValueOnce({ ...mockUser, isLoggedIn: true, ipAddress: '192.168.1.1', port: 1234 });

      await login(req, res);

      // Verify user was updated
      expect(mockSave).toHaveBeenCalledWith({
        ...mockUser,
        isLoggedIn: true,
        ipAddress: '192.168.1.1',
        port: 1234,
      });

      // Verify token was generated
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          username: 'testuser',
          isAdmin: false,
          currentGroupId: 2,
        },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        user: {
          id: 1,
          username: 'testuser',
          isAdmin: false,
          groups: [{ id: 2, name: 'Test Group' }],
          currentGroupId: 2,
        },
        token: 'mocked.jwt.token',
      });
    });
    
    it('should handle case-insensitive username matching', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { 
        username: 'TESTUSER', // Uppercase version of the username
        password: 'correctpassword',
      };

      const mockUser = {
        id: 1,
        username: 'testuser', // Stored in lowercase
        password: 'hashedpassword',
        isAdmin: false,
        currentGroupId: 2,
        groups: [],
        isLoggedIn: false,
      };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([mockUser]);

      // Mock bcrypt.compare to return true for valid password
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Mock jwt.sign
      jest.spyOn(jwt, 'sign').mockReturnValueOnce('mocked.jwt.token');

      await login(req, res);

      // Verify login was successful
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Login successful'
      }));
    });
  });

  describe('logout', () => {
    it('should return 400 if user ID is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });
    });

    it('should return 404 if user does not exist', async () => {
      const req = mockRequest();
      const res = mockResponse();
      (req as any).userId = 999; // Set non-existent user ID

      const mockFindOne = AppDataSource.getRepository(User).findOne as jest.Mock;
      mockFindOne.mockResolvedValueOnce(null);

      await logout(req, res);

      expect(mockFindOne).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 200 for successful logout', async () => {
      const req = mockRequest();
      const res = mockResponse();
      (req as any).userId = 1;

      const mockUser = {
        id: 1,
        username: 'testuser',
        isLoggedIn: true,
      };

      const mockFindOne = AppDataSource.getRepository(User).findOne as jest.Mock;
      mockFindOne.mockResolvedValueOnce(mockUser);

      const mockSave = AppDataSource.getRepository(User).save as jest.Mock;
      mockSave.mockResolvedValueOnce({ ...mockUser, isLoggedIn: false });

      await logout(req, res);

      // Verify user was updated
      expect(mockSave).toHaveBeenCalledWith({
        ...mockUser,
        isLoggedIn: false,
      });

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });
  });

  describe('register', () => {
    it('should return 400 if username or password is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: '', password: '' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required',
      });
    });

    it('should return 409 if username already exists', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: 'existinguser', password: 'password' };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([{ id: 1, username: 'existinguser' }]);

      await register(req, res);

      expect(mockFind).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username already exists',
      });
    });

    it('should handle case-insensitive username conflicts', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: 'ExistingUser', password: 'password' }; // Different case

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([{ id: 1, username: 'existinguser' }]); // Lowercase in DB

      await register(req, res);

      expect(mockFind).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username already exists',
      });
    });

    it('should return 201 for successful registration', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.body = { username: 'newuser', password: 'password123' };

      const mockFind = AppDataSource.getRepository(User).find as jest.Mock;
      mockFind.mockResolvedValueOnce([]);

      const mockCreate = AppDataSource.getRepository(User).create as jest.Mock;
      mockCreate.mockReturnValueOnce({
        id: 3,
        username: 'newuser',
        password: 'hashedpassword123',
        isAdmin: false,
        isLoggedIn: false,
      });

      const mockSave = AppDataSource.getRepository(User).save as jest.Mock;
      mockSave.mockResolvedValueOnce({
        id: 3,
        username: 'newuser',
        password: 'hashedpassword123',
        isAdmin: false,
        isLoggedIn: false,
      });

      // Mock bcrypt.hash
      jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashedpassword123');

      await register(req, res);

      // Verify bcrypt.hash was called
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      // Verify user was created and saved
      expect(mockCreate).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword123',
        isAdmin: false,
        isLoggedIn: false,
      });
      expect(mockSave).toHaveBeenCalled();

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: {
          id: 3,
          username: 'newuser',
        },
      });
    });
  });
}); 