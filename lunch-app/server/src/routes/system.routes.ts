import { Router } from 'express';
import * as systemController from '../controllers/system.controller';

const router = Router();

/**
 * @route   GET /api/system/info
 * @desc    Get server system information including timezone
 * @access  Public
 */
router.get('/info', systemController.getSystemInfo);

export default router; 