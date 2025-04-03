import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);

/**
 * @route   GET /api/users/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateToken, userController.getCurrentUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticateToken, isAdmin, userController.getUserById);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user
 * @access  Private
 */
router.put('/me', authenticateToken, userController.updateUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

export default router; 