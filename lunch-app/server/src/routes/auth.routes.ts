import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout a user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

export default router; 