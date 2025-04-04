import { Router } from 'express';
import { 
  sendDirectMessage, 
  sendGroupMessage, 
  getDirectMessageHistory, 
  getGroupMessageHistory 
} from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Direct chat endpoints
router.post('/direct', (req, res) => sendDirectMessage(req, res));
router.get('/direct/:userId', (req, res) => getDirectMessageHistory(req, res));

// Group chat endpoints
router.post('/group', (req, res) => sendGroupMessage(req, res));
router.get('/group/:groupId', (req, res) => getGroupMessageHistory(req, res));

export default router; 