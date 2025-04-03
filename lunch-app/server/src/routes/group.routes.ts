import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/groups
 * @desc    Get all groups
 * @access  Public
 */
router.get('/', groupController.getAllGroups);

/**
 * @route   GET /api/groups/:id
 * @desc    Get group by ID
 * @access  Public
 */
router.get('/:id', groupController.getGroupById);

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/', authenticateToken, groupController.createGroup);

/**
 * @route   PUT /api/groups/:id
 * @desc    Update group
 * @access  Private
 */
router.put('/:id', authenticateToken, groupController.updateGroup);

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete group
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, isAdmin, groupController.deleteGroup);

/**
 * @route   POST /api/groups/:id/join
 * @desc    Join a group
 * @access  Private
 */
router.post('/:id/join', authenticateToken, groupController.joinGroup);

/**
 * @route   POST /api/groups/:id/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post('/:id/leave', authenticateToken, groupController.leaveGroup);

export default router; 