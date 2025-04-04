import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

const groupRepository = AppDataSource.getRepository(Group);
const userRepository = AppDataSource.getRepository(User);

/**
 * Get all groups
 */
export const getAllGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await groupRepository.find({
      relations: ['users', 'currentRestaurant']
    });

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get group by ID
 */
export const getGroupById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const group = await groupRepository.findOne({
      where: { id },
      relations: ['users', 'currentRestaurant', 'groupRestaurants', 'groupRestaurants.restaurant']
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Create new group
 */
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, notificationTime } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Check if group with same name already exists
    const existingGroup = await groupRepository.findOne({ where: { name } });
    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: 'Group with this name already exists'
      });
    }

    // Convert notification time string to Date if provided
    let notificationTimeDate: Date | undefined = undefined;
    if (notificationTime) {
      notificationTimeDate = new Date();
      const [hours, minutes] = notificationTime.split(':').map(Number);
      notificationTimeDate.setHours(hours, minutes, 0, 0);
    }

    // Create and save the new group
    const group = groupRepository.create({
      name,
      description,
      notificationTime: notificationTimeDate,
      yesVotes: 0,
      noVotes: 0,
      isConfirmed: false
    });

    await groupRepository.save(group);

    // Add the creating user to the group if userId is provided
    if (req.userId) {
      const user = await userRepository.findOne({ 
        where: { id: req.userId },
        relations: ['groups']
      });

      if (user) {
        // Remove user from any existing groups since a user can only be in one group
        if (user.groups && user.groups.length > 0) {
          user.groups = [];
        }
        
        if (!user.groups) user.groups = [];
        user.groups.push(group);
        user.currentGroupId = group.id;
        await userRepository.save(user);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update group
 */
export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if group exists
    const group = await groupRepository.findOne({ where: { id } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Update group fields
    const { name, description, notificationTime } = req.body;
    
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    
    // Convert notification time string to Date if provided
    if (notificationTime) {
      const notificationTimeDate = new Date();
      const [hours, minutes] = notificationTime.split(':').map(Number);
      notificationTimeDate.setHours(hours, minutes, 0, 0);
      group.notificationTime = notificationTimeDate;
    }

    // Save group
    await groupRepository.save(group);

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Delete group
 */
export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Only admin can delete groups
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Admin privileges required'
      });
    }

    // Check if group exists
    const group = await groupRepository.findOne({ where: { id } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Delete group
    await groupRepository.remove(group);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Join group
 */
export const joinGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = req.userId;
    
    // Check if group exists
    const group = await groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user exists
    const user = await userRepository.findOne({ 
      where: { id: userId },
      relations: ['groups']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already in the group
    if (user.groups && user.groups.some(g => g.id === groupId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Remove user from any existing groups since a user can only be in one group
    if (user.groups && user.groups.length > 0) {
      user.groups = [];
    }

    // Add user to group
    if (!user.groups) user.groups = [];
    user.groups.push(group);
    user.currentGroupId = groupId;
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'Successfully joined group',
      data: { groupId, userId }
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Leave group
 */
export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = req.userId;
    
    // Check if user exists
    const user = await userRepository.findOne({ 
      where: { id: userId },
      relations: ['groups']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is in the group
    if (!user.groups || !user.groups.some(g => g.id === groupId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }

    // Remove user from group
    user.groups = user.groups.filter(g => g.id !== groupId);
    
    // If the user's current group is the one being left, set currentGroupId to undefined or another group
    if (user.currentGroupId === groupId) {
      user.currentGroupId = user.groups.length > 0 ? user.groups[0].id : undefined;
    }
    
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'Successfully left group',
      data: { groupId, userId }
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Add a user to a group (admin only)
 */
export const addUserToGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    // Check if group exists
    const group = await groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user exists
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['groups']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already in the group
    if (user.groups && user.groups.some(g => g.id === groupId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Remove user from any existing groups since a user can only be in one group
    if (user.groups && user.groups.length > 0) {
      user.groups = [];
    }

    // Add user to group
    if (!user.groups) user.groups = [];
    user.groups.push(group);
    
    // Set this as their current group
    user.currentGroupId = groupId;
    
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'User successfully added to group',
      data: { 
        groupId, 
        userId,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error adding user to group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Remove a user from a group (admin only)
 */
export const removeUserFromGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    // Check if group exists
    const group = await groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user exists
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['groups']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is in the group
    if (!user.groups || !user.groups.some(g => g.id === groupId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }

    // Remove user from group
    user.groups = user.groups.filter(g => g.id !== groupId);
    
    // If the user's current group is the one being left, set currentGroupId to undefined or another group
    if (user.currentGroupId === groupId) {
      user.currentGroupId = user.groups.length > 0 ? user.groups[0].id : undefined;
    }
    
    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'User successfully removed from group',
      data: { 
        groupId, 
        userId,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error removing user from group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update a group's notification time
 */
export const updateGroupNotificationTime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notificationTime } = req.body;
    
    if (!notificationTime) {
      return res.status(400).json({ message: 'Notification time is required' });
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(notificationTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM format (e.g., 12:30)' });
    }
    
    const group = await groupRepository.findOne({ where: { id: parseInt(id) } });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Create a Date object with today's date but with the specified time
    const [hours, minutes] = notificationTime.split(':').map(Number);
    
    // Create today's date at midnight (to avoid timezone issues)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add the specified hours and minutes
    const timeObj = new Date(today);
    timeObj.setHours(hours, minutes, 0, 0);
    
    console.log(`Setting notification time for group ${group.name} to:`, {
      rawTime: notificationTime,
      parsedHours: hours,
      parsedMinutes: minutes,
      dateObject: timeObj,
      dateString: timeObj.toISOString(),
      timeString: timeObj.toTimeString()
    });
    
    // Update the group
    group.notificationTime = timeObj;
    await groupRepository.save(group);
    
    // After saving, fetch the group again to verify how the time was stored
    const savedGroup = await groupRepository.findOne({ where: { id: parseInt(id) } });
    console.log(`Verification - Group ${group.name} notification time stored as:`, {
      rawValue: savedGroup?.notificationTime,
      type: savedGroup?.notificationTime ? typeof savedGroup.notificationTime : 'undefined'
    });
    
    res.status(200).json({ 
      message: 'Group notification time updated successfully',
      notificationTime: timeObj.toTimeString().slice(0, 5),
      hours,
      minutes
    });
  } catch (error) {
    console.error('Error updating group notification time:', error);
    res.status(500).json({ message: 'Error updating group notification time' });
  }
};

/**
 * Get a group's notification time
 */
export const getGroupNotificationTime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const group = await groupRepository.findOne({ where: { id: parseInt(id) } });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    res.status(200).json({ 
      notificationTime: group.notificationTime ? group.notificationTime.toTimeString().slice(0, 5) : null
    });
  } catch (error) {
    console.error('Error getting group notification time:', error);
    res.status(500).json({ message: 'Error getting group notification time' });
  }
}; 