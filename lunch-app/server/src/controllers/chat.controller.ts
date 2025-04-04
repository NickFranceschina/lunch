import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Chat, ChatType } from '../models/Chat';
import { User } from '../models/User';
import { Group } from '../models/Group';
import { getWebSocketServer } from '../config/websocket';

// Extended request interface with auth data
interface AuthRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
}

// Initialize repositories
const chatRepository = AppDataSource.getRepository(Chat);
const userRepository = AppDataSource.getRepository(User);
const groupRepository = AppDataSource.getRepository(Group);

/**
 * Send a direct message from one user to another
 */
export const sendDirectMessage = async (req: Request, res: Response) => {
  try {
    const { recipientId, message } = req.body;
    const authReq = req as AuthRequest;
    const senderId = authReq.userId;

    // Need to get sender info for the message
    const sender = await userRepository.findOne({ where: { id: senderId } });

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found - invalid authentication'
      });
    }

    // Validate required fields
    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and message are required'
      });
    }

    // Check if recipient exists
    const recipient = await userRepository.findOne({ where: { id: recipientId } });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create and save the chat message
    const chatMessage = new Chat();
    chatMessage.type = ChatType.USER_TO_USER;
    chatMessage.senderId = senderId!;
    chatMessage.recipientId = recipientId;
    chatMessage.message = message;

    const savedChat = await chatRepository.save(chatMessage);

    // Send message through WebSocket if available
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendToUser(recipientId, {
        type: 'chat_message',
        data: {
          id: savedChat.id,
          senderId,
          senderName: sender.username,
          message,
          timestamp: savedChat.sentAt
        }
      });
    }

    return res.status(201).json({
      success: true,
      data: savedChat
    });
  } catch (error) {
    console.error('Error sending direct message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Send a message to a group
 */
export const sendGroupMessage = async (req: Request, res: Response) => {
  try {
    const { groupId, message } = req.body;
    const authReq = req as AuthRequest;
    const senderId = authReq.userId;

    // Get sender info
    const sender = await userRepository.findOne({ 
      where: { id: senderId },
      relations: ['currentGroup']
    });

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found - invalid authentication'
      });
    }

    // Validate required fields
    if (!groupId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Group ID and message are required'
      });
    }

    // Check if group exists
    const group = await groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group
    if (group.id !== sender.currentGroupId) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Create and save the chat message
    const chatMessage = new Chat();
    chatMessage.type = ChatType.GROUP;
    chatMessage.senderId = senderId!;
    chatMessage.groupId = groupId;
    chatMessage.message = message;

    const savedChat = await chatRepository.save(chatMessage);

    // Send message through WebSocket if available
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToGroup(groupId, {
        type: 'chat_message',
        data: {
          id: savedChat.id,
          senderId,
          senderName: sender.username,
          groupId,
          message,
          timestamp: savedChat.sentAt
        }
      });
    }

    return res.status(201).json({
      success: true,
      data: savedChat
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get direct message history between two users
 */
export const getDirectMessageHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authReq = req as AuthRequest;
    const currentUserId = authReq.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Convert to numbers for comparison
    const userIdNum = parseInt(userId);
    
    // Get messages where either user is sender or recipient
    const messages = await chatRepository
      .createQueryBuilder('chat')
      .where('chat.type = :type', { type: ChatType.USER_TO_USER })
      .andWhere(
        '(chat.senderId = :currentUserId AND chat.recipientId = :otherUserId) OR ' +
        '(chat.senderId = :otherUserId AND chat.recipientId = :currentUserId)',
        { currentUserId, otherUserId: userIdNum }
      )
      .orderBy('chat.sentAt', 'ASC')
      .getMany();
    
    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error retrieving direct message history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get message history for a group
 */
export const getGroupMessageHistory = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const authReq = req as AuthRequest;
    const currentUserId = authReq.userId;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }
    
    const groupIdNum = parseInt(groupId);
    
    // Verify user is member of the group
    const user = await userRepository.findOne({ 
      where: { id: currentUserId }
    });
    
    if (!user || user.currentGroupId !== groupIdNum) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    // Get all messages for the group
    const messages = await chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.sender', 'sender')
      .where('chat.type = :type', { type: ChatType.GROUP })
      .andWhere('chat.groupId = :groupId', { groupId: groupIdNum })
      .orderBy('chat.sentAt', 'ASC')
      .getMany();
    
    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error retrieving group message history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 