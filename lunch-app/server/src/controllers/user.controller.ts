import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import * as bcrypt from 'bcrypt';

const userRepository = AppDataSource.getRepository(User);

/**
 * Get all users
 */
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await userRepository.find({
      select: ['id', 'username', 'isAdmin', 'isLoggedIn', 'ipAddress', 'port', 'currentGroupId'],
      relations: ['groups']
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'isAdmin', 'isLoggedIn', 'ipAddress', 'port', 'currentGroupId'],
      relations: ['groups']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'isAdmin', 'isLoggedIn', 'ipAddress', 'port', 'currentGroupId'],
      relations: ['groups']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id ? parseInt(req.params.id) : req.userId;
    
    // Check if user exists
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions - only admin or self can update
    if (userId !== req.userId && !req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - insufficient permissions'
      });
    }

    // Update user fields
    const { username, password, currentGroupId } = req.body;
    
    if (username) user.username = username;
    if (currentGroupId) user.currentGroupId = currentGroupId;
    
    // Only update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Save user
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        currentGroupId: user.currentGroupId
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Only admin can delete users
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Admin privileges required'
      });
    }

    // Check if user exists
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user
    await userRepository.remove(user);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 