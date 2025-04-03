import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const userRepository = AppDataSource.getRepository(User);

/**
 * Handle user login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password, ipAddress, port } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find the user
    const user = await userRepository.findOne({ 
      where: { username },
      relations: ['groups']
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Update user login status and connection info
    user.isLoggedIn = true;
    user.ipAddress = ipAddress || req.ip;
    user.port = port || null;
    await userRepository.save(user);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        isAdmin: user.isAdmin 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        groups: user.groups,
        currentGroupId: user.currentGroupId
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during login' 
    });
  }
};

/**
 * Handle user logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || (req as any).userId;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update user login status
    user.isLoggedIn = false;
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during logout' 
    });
  }
};

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = userRepository.create({
      username,
      password: hashedPassword,
      isAdmin: false,
      isLoggedIn: false
    });

    await userRepository.save(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during registration' 
    });
  }
}; 