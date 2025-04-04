import React, { useState, useEffect, useCallback } from 'react';
import { groupService, userService, systemService, restaurantService } from '../services/api';
import './GroupPanel.css';
import './Win98Panel.css';
import useDraggable from '../hooks/useDraggable';
import { DateTime } from 'luxon';

interface User {
  id: number;
  username: string;
  groups?: { id: number }[];
}

interface Group {
  id: number;
  name: string;
  description?: string;
  notificationTime?: string;
  timezone?: string;
  currentRestaurant?: {
    id: number;
    name: string;
  };
  yesVotes: number;
  noVotes: number;
  isConfirmed: boolean;
  users?: User[];
}

interface GroupPanelProps {
  isVisible: boolean;
  onClose: () => void;
  token: string;
  currentUserId: number;
  currentGroupId?: number;
  isAdmin?: boolean;
}

// Define form data state type with optional id
interface GroupFormData {
  id: number | null; // Allow null for new groups
  name: string;
  description: string;
  notificationTime: string; // Assuming HH:MM format
  timezone: string;
}

// Define common timezones
interface Timezone {
  value: string;
  label: string;
  offset: string;
}

const timezones: Timezone[] = [
  // UTC-11 to UTC-1
  { value: 'Pacific/Midway', label: 'Midway Island, Samoa', offset: 'UTC-11' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (US)', offset: 'UTC-10' },
  { value: 'America/Anchorage', label: 'Alaska (US)', offset: 'UTC-9' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: 'UTC-8' },
  { value: 'America/Phoenix', label: 'Phoenix, Arizona', offset: 'UTC-7' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: 'UTC-7' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: 'UTC-6' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: 'UTC-5' },
  { value: 'America/Caracas', label: 'Caracas, Venezuela', offset: 'UTC-4' },
  { value: 'America/Santiago', label: 'Santiago, Chile', offset: 'UTC-4' },
  { value: 'America/St_Johns', label: 'St. John\'s, Newfoundland', offset: 'UTC-3:30' },
  { value: 'America/Sao_Paulo', label: 'São Paulo, Brazil', offset: 'UTC-3' },
  { value: 'Atlantic/Azores', label: 'Azores Islands', offset: 'UTC-1' },
  { value: 'Atlantic/Cape_Verde', label: 'Cape Verde Islands', offset: 'UTC-1' },
  
  // UTC 0
  { value: 'UTC', label: 'Coordinated Universal Time', offset: 'UTC+0' },
  { value: 'Europe/London', label: 'London, Dublin, Lisbon', offset: 'UTC+0' },
  
  // UTC+1 to UTC+14
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid', offset: 'UTC+1' },
  { value: 'Europe/Helsinki', label: 'Helsinki, Kyiv, Riga, Sofia', offset: 'UTC+2' },
  { value: 'Europe/Moscow', label: 'Moscow, St. Petersburg', offset: 'UTC+3' },
  { value: 'Asia/Tehran', label: 'Tehran, Iran', offset: 'UTC+3:30' },
  { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi', offset: 'UTC+4' },
  { value: 'Asia/Kabul', label: 'Kabul, Afghanistan', offset: 'UTC+4:30' },
  { value: 'Asia/Karachi', label: 'Karachi, Islamabad', offset: 'UTC+5' },
  { value: 'Asia/Kolkata', label: 'Mumbai, New Delhi', offset: 'UTC+5:30' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu, Nepal', offset: 'UTC+5:45' },
  { value: 'Asia/Dhaka', label: 'Dhaka, Bangladesh', offset: 'UTC+6' },
  { value: 'Asia/Yangon', label: 'Yangon, Myanmar', offset: 'UTC+6:30' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Hanoi, Jakarta', offset: 'UTC+7' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Singapore', offset: 'UTC+8' },
  { value: 'Australia/Perth', label: 'Perth, Western Australia', offset: 'UTC+8' },
  { value: 'Asia/Pyongyang', label: 'Pyongyang, North Korea', offset: 'UTC+8:30' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Seoul, Osaka', offset: 'UTC+9' },
  { value: 'Australia/Adelaide', label: 'Adelaide, South Australia', offset: 'UTC+9:30' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne', offset: 'UTC+10' },
  { value: 'Australia/Lord_Howe', label: 'Lord Howe Island', offset: 'UTC+10:30' },
  { value: 'Pacific/Noumea', label: 'Noumea, New Caledonia', offset: 'UTC+11' },
  { value: 'Pacific/Auckland', label: 'Auckland, Wellington', offset: 'UTC+12' },
  { value: 'Pacific/Fiji', label: 'Fiji Islands', offset: 'UTC+12' },
  { value: 'Pacific/Tongatapu', label: 'Nuku\'alofa, Tonga', offset: 'UTC+13' },
  { value: 'Pacific/Kiritimati', label: 'Kiritimati Island', offset: 'UTC+14' },
];

// Add a utility function to get the browser timezone from Intl API
const getBrowserTimezone = (): string => {
  try {
    // Try to get the timezone from Intl API
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // If the timezone is in our list, use it
    if (timezones.some(tz => tz.value === timeZone)) {
      return timeZone;
    }
    // Otherwise, try to find a matching timezone by offset
    const now = new Date();
    const browserOffset = -now.getTimezoneOffset() / 60; // Convert minutes to hours and flip sign
    
    // Format the offset as UTC+X or UTC-X
    const offsetString = browserOffset >= 0 
      ? `UTC+${browserOffset}` 
      : `UTC${browserOffset}`;
    
    // Find a timezone with matching offset
    const matchingTimezone = timezones.find(tz => tz.offset === offsetString);
    if (matchingTimezone) {
      return matchingTimezone.value;
    }
    
    // Default to UTC if no match found
    return 'UTC';
  } catch (e) {
    console.error('Error determining browser timezone:', e);
    return 'UTC'; // Fallback to UTC
  }
};

// Get the default timezone once when component is initialized
const defaultTimezone = getBrowserTimezone();

const GroupPanel: React.FC<GroupPanelProps> = ({
  isVisible,
  onClose,
  token,
  currentUserId,
  currentGroupId,
  isAdmin = false
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    id: null,
    name: '',
    description: '',
    notificationTime: '12:00', // Default time
    timezone: defaultTimezone // Use browser timezone instead of hardcoded UTC
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showUserSelector, setShowUserSelector] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'restaurants'>('details');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [serverTimezone, setServerTimezone] = useState<{ name?: string; offsetString?: string; shortOffset: string } | null>(null);
  
  // Restaurant management state
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [groupRestaurants, setGroupRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [occurrenceRating, setOccurrenceRating] = useState<string>('sometimes');
  
  // Add state for countdown timer
  const [upcomingNotification, setUpcomingNotification] = useState<{
    estTime: string;
    utcTime: string;
    tzAbbr: string;
    countdown: string;
    minutesUntil: number;
    secondsUntil: number;
  } | null>(null);
  
  // Use position in the center of the screen
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 700) / 2), // 700px is approximate panel width
    y: Math.max(0, window.innerHeight / 6)
  };
  
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable('group-panel', initialPosition, true);

  // Fetch initial data
  useEffect(() => {
    if (isVisible) {
      fetchGroups();
      fetchAllUsers(); // Fetch all users for adding
      fetchServerTimezone(); // Fetch server timezone
      fetchAllRestaurants(); // Fetch all restaurants
    }
  }, [isVisible]);

  // Fetch all groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups(token);
      if (!response.success) { throw new Error(response.message); }
      setGroups(response.data);
      // Select first group by default
      if (response.data.length > 0 && !currentGroupId) {
        selectGroup(response.data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users (for adding to groups)
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      // Use userService
      const response = await userService.getAllUsers(token);
      if (!response.success) { throw new Error(response.message); }
      setAllUsers(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch server timezone
  const fetchServerTimezone = async () => {
    try {
      const response = await systemService.getSystemInfo();
      if (response.success) {
        // Save both the timezone name and offset string for different display options
        setServerTimezone({
          name: response.data.timezone.name,
          offsetString: response.data.timezone.offsetString,
          // Create a shortened version without minutes if they're 00
          shortOffset: response.data.timezone.offsetString.replace(/:00$/, '')
        });
      }
    } catch (err) {
      console.error('Error fetching server timezone:', err);
    }
  };

  // Fetch all restaurants
  const fetchAllRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantService.getAllRestaurants(token);
      if (!response.success) { throw new Error(response.message); }
      setAllRestaurants(response.restaurants || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurants for the selected group
  const fetchGroupRestaurants = async (groupId: number) => {
    try {
      setLoading(true);
      const response = await restaurantService.getGroupRestaurants(groupId, token);
      if (!response.success) { throw new Error(response.message); }
      setGroupRestaurants(response.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch group restaurants');
      console.error('Failed to fetch group restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for the selected group
  const fetchGroupUsers = useCallback(async (groupId: number) => {
    try {
      setLoading(true);
      // Use groupService to get group details including users
      const response = await groupService.getGroupById(groupId, token);
      if (!response.success) { throw new Error(response.message); }
      setSelectedGroup(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch group users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    checkForChanges(newFormData);
    
    // Immediately recalculate upcoming notification if relevant fields changed
    if (name === 'notificationTime' || name === 'timezone') {
      calculateTimeUntilNotification();
    }
  };

  // Check if form data has changed from the original group data
  const checkForChanges = (newFormData: typeof formData) => {
    if (!selectedGroup || showAddForm) return;
    
    const hasNameChange = newFormData.name !== selectedGroup.name;
    const hasDescriptionChange = newFormData.description !== (selectedGroup.description || '');
    const hasTimezoneChange = newFormData.timezone !== (selectedGroup.timezone || 'UTC');
    
    // Format time for comparison
    let originalTime = "12:00";
    if (selectedGroup.notificationTime) {
      try {
        if (selectedGroup.notificationTime.includes('T')) {
          // If it's a full ISO date string
          const date = new Date(selectedGroup.notificationTime);
          originalTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } else {
          // If it's already in HH:MM format
          originalTime = selectedGroup.notificationTime;
        }
      } catch (e) {
        originalTime = "12:00";
      }
    }
    
    const hasTimeChange = newFormData.notificationTime !== originalTime;

    setHasChanges(hasNameChange || hasDescriptionChange || hasTimeChange || hasTimezoneChange);
  };

  // Handle user selection change
  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUser(parseInt(e.target.value));
  };

  // Select a group and update form data
  const selectGroup = (group: Group) => {
    setSelectedGroup(group);
    
    // Format time for the input field
    let timeString = "12:00";
    if (group.notificationTime) {
      try {
        if (group.notificationTime.includes('T')) {
          // If it's a full ISO date string
          const date = new Date(group.notificationTime);
          timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } else {
          // If it's already in HH:MM format
          timeString = group.notificationTime;
        }
      } catch (e) {
        timeString = "12:00";
      }
    }
    
    setFormData({
      id: group.id,
      name: group.name,
      description: group.description || '',
      notificationTime: timeString,
      timezone: group.timezone || 'UTC'
    });
    
    setShowUserSelector(false);
    setShowAddForm(false);
    setHasChanges(false);
    setShowTimezonePicker(false);
    
    // Fetch group restaurants when a group is selected
    fetchGroupRestaurants(group.id);
  };

  // Handle form submission for new/updated group
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const isUpdating = formData.id !== null;
    
    try {
      const apiCall = isUpdating
        ? groupService.updateGroup(formData.id!, formData, token)
        : groupService.createGroup(formData, token);
        
      const response = await apiCall;
      if (!response.success) { throw new Error(response.message); }
      
      // If updating an existing group, refresh and reset form
      if (isUpdating) {
        await fetchGroups();
        resetForm();
      } 
      // If creating a new group, we need to get complete data and select it
      else if (response.data) {
        // Get the complete group data with users, etc.
        const groupDetailsResponse = await groupService.getGroupById(response.data.id, token);
        
        if (groupDetailsResponse.success) {
          // Refresh the groups list
          const newGroups = await groupService.getAllGroups(token);
          if (newGroups.success) {
            setGroups(newGroups.data);
          }
          
          // Select the new group with full details
          selectGroup(groupDetailsResponse.data);
          
          // Explicitly exit add form mode
          setShowAddForm(false);
        }
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isUpdating ? 'update' : 'create'} group`);
    } finally {
      setLoading(false);
    }
  };

  // Update group notification time
  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      setLoading(true);
      
      await groupService.updateGroup(selectedGroup.id, {
        name: formData.name,
        description: formData.description,
        notificationTime: formData.notificationTime,
        timezone: formData.timezone
      }, token);

      await fetchGroups();
      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError('Failed to update group. Please try again.');
      console.error('Failed to update group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join a group
  const handleJoinGroup = async (groupId: number) => {
    try {
      setLoading(true);
      await groupService.joinGroup(groupId, token);
      await fetchGroups();
    } catch (err) {
      setError('Failed to join group. Please try again.');
      console.error('Failed to join group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Leave a group
  const handleLeaveGroup = async (groupId: number) => {
    try {
      setLoading(true);
      await groupService.leaveGroup(groupId, token);
      await fetchGroups();
    } catch (err) {
      setError('Failed to leave group. Please try again.');
      console.error('Failed to leave group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a user to a group
  const handleAddUserToGroup = async () => {
    if (!selectedGroup || !selectedUser) return;
    
    // Find the selected user to check if they're in another group
    const selectedUserObj = allUsers.find(u => u.id === selectedUser);
    if (selectedUserObj && selectedUserObj.groups && selectedUserObj.groups.length > 0) {
      // Find the user's current group
      const currentGroup = groups.find(g => 
        selectedUserObj.groups?.some(ug => ug.id === g.id)
      );
      
      // Only confirm if user is in a different group
      if (currentGroup && currentGroup.id !== selectedGroup.id) {
        const confirmMessage = `${selectedUserObj.username} is currently in ${currentGroup.name}. Adding them to ${selectedGroup.name} will remove them from ${currentGroup.name}. Continue?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
    }
    
    try {
      setLoading(true);
      await groupService.addUserToGroup(selectedGroup.id, selectedUser, token);
      await fetchGroupUsers(selectedGroup.id); // Refresh group users
      setSelectedUser(null);
      setShowUserSelector(false);
    } catch (err) {
      setError('Failed to add user to group. Please try again.');
      console.error('Failed to add user to group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove a user from a group
  const handleRemoveUserFromGroup = async (userId: number) => {
    if (!selectedGroup) return;
    
    if (!window.confirm('Are you sure you want to remove this user from the group?')) {
      return;
    }
    
    try {
      setLoading(true);
      await groupService.removeUserFromGroup(selectedGroup.id, userId, token);
      await fetchGroupUsers(selectedGroup.id); // Refresh group users
    } catch (err) {
      setError('Failed to remove user from group. Please try again.');
      console.error('Failed to remove user from group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete a group
  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }
    
    try {
      setLoading(true);
      await groupService.deleteGroup(groupId, token);
      
      // Refresh the groups list
      const response = await groupService.getAllGroups(token);
      
      if (response.success) {
        setGroups(response.data);
        
        // Clear the selected group
        setSelectedGroup(null);
        
        // Reset the form
        resetForm();
        
        // If there are other groups, select the first one
        if (response.data.length > 0) {
          selectGroup(response.data[0]);
        }
      }
    } catch (err) {
      setError('Failed to delete group. Please try again.');
      console.error('Failed to delete group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not set';
    
    try {
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
      return timeString;
    } catch (e) {
      return timeString;
    }
  };

  // Calculate time until next notification
  const calculateTimeUntilNotification = useCallback(() => {
    const notificationTimeToUse = formData.notificationTime; 
    const timezoneToUse = formData.timezone;
                                  
    if (!notificationTimeToUse) {
      setUpcomingNotification(null);
      return;
    }

    try {
      // Parse notification time
      const [hours, minutes] = notificationTimeToUse.split(':').map(num => parseInt(num, 10));
      
      // Create a DateTime object for the notification time in the specified timezone
      const notificationTime = DateTime.now().setZone(timezoneToUse).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0
      });
      
      // If the notification time is in the past (earlier today), add a day
      let targetNotificationTime = notificationTime;
      if (targetNotificationTime < DateTime.now()) {
        targetNotificationTime = targetNotificationTime.plus({ days: 1 });
      }
      
      // Calculate difference between now and the notification time
      const diff = targetNotificationTime.diff(DateTime.now(), ['hours', 'minutes', 'seconds']);
      
      // Get the UTC time
      const utcTime = targetNotificationTime.toUTC();
      
      // Format times for display
      const localTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const utcTimeStr = utcTime.toFormat('HH:mm');
      const tzAbbr = getTimezoneAbbreviation(timezoneToUse);
      
      // Format countdown
      const hoursUntil = Math.floor(diff.hours);
      const minsUntil = Math.floor(diff.minutes);
      const secsUntil = Math.floor(diff.seconds);
      const countdownStr = `in ${hoursUntil}h ${minsUntil}m ${secsUntil}s`;
      
      // Calculate total seconds and minutes for the interface
      const totalSeconds = hoursUntil * 3600 + minsUntil * 60 + secsUntil;
      const totalMinutes = Math.floor(totalSeconds / 60);
      
      setUpcomingNotification({
        estTime: localTimeStr,
        utcTime: utcTimeStr,
        tzAbbr: tzAbbr,
        countdown: countdownStr,
        minutesUntil: totalMinutes,
        secondsUntil: totalSeconds
      });
    } catch (error) {
      console.error('Error calculating notification time:', error);
      setUpcomingNotification(null);
    }
  }, [formData.notificationTime, formData.timezone]);

  // Get timezone offset in hours from UTC
  const getTimezoneOffset = (timezoneValue: string): number => {
    const timezone = timezones.find(tz => tz.value === timezoneValue);
    if (!timezone) return 0;
    
    // Parse the offset from format like "UTC-5" or "UTC+2"
    const offsetStr = timezone.offset;
    const offsetMatch = offsetStr.match(/UTC([+-])(\d+)(?::(\d+))?/);
    
    if (!offsetMatch) return 0;
    
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(offsetMatch[2], 10) || 0;
    const minutes = parseInt(offsetMatch[3], 10) || 0;
    
    return sign * (hours + minutes / 60);
  };
  
  // Get timezone abbreviation
  const getTimezoneAbbreviation = (timezoneValue: string): string => {
    const timezone = timezones.find(tz => tz.value === timezoneValue);
    if (!timezone) return 'UTC';
    
    // For common timezones, return well-known abbreviations
    switch (timezoneValue) {
      // North America
      case 'America/New_York': return 'EST';
      case 'America/Chicago': return 'CST';
      case 'America/Denver': return 'MST';
      case 'America/Los_Angeles': return 'PST';
      case 'America/Phoenix': return 'MST';
      case 'America/Anchorage': return 'AKST';
      case 'Pacific/Honolulu': return 'HST';
      
      // Europe
      case 'Europe/London': return 'GMT';
      case 'Europe/Paris': return 'CET';
      case 'Europe/Berlin': return 'CET';
      case 'Europe/Rome': return 'CET';
      case 'Europe/Helsinki': return 'EET';
      case 'Europe/Moscow': return 'MSK';
      
      // Asia
      case 'Asia/Tokyo': return 'JST';
      case 'Asia/Shanghai': return 'CST';
      case 'Asia/Singapore': return 'SGT';
      case 'Asia/Kolkata': return 'IST';
      case 'Asia/Dubai': return 'GST';
      
      // Australia
      case 'Australia/Sydney': return 'AEST';
      case 'Australia/Perth': return 'AWST';
      
      // UTC
      case 'UTC': return 'UTC';
      
      // Default to offset if no specific abbreviation
      default:
        // Extract offset from format like "UTC-5" or "UTC+2"
        const offsetStr = timezone.offset;
        const offsetMatch = offsetStr.match(/UTC([+-]\d+(?::\d+)?)/);
        return offsetMatch ? offsetMatch[1] : timezone.offset.replace('UTC', '');
    }
  };

  // Update countdown every second
  useEffect(() => {
    calculateTimeUntilNotification();
    
    // Update every second
    const interval = setInterval(() => {
      calculateTimeUntilNotification();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [calculateTimeUntilNotification]);

  // Check if user is in group
  const isUserInGroup = (group: Group) => {
    return group.users?.some(user => user.id === currentUserId) || false;
  };

  // Handle Add New Group button
  const handleAddNewClick = () => {
    setFormData({
      id: null,
      name: '',
      description: '',
      notificationTime: '12:00',
      timezone: defaultTimezone // Use browser timezone
    });
    setSelectedGroup(null);
    setShowAddForm(true);
  };

  // Cancel add new group
  const handleCancelAddNew = () => {
    setShowAddForm(false);
    if (groups.length > 0) {
      selectGroup(groups[0]);
    }
  };

  // Reset form function
  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      description: '',
      notificationTime: '12:00',
      timezone: defaultTimezone // Use browser timezone
    });
    setHasChanges(false);
    setShowAddForm(false);
  };

  // Handle restaurant selection change
  const handleRestaurantSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRestaurant(parseInt(e.target.value));
  };

  // Handle occurrence rating change
  const handleOccurrenceRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOccurrenceRating(e.target.value);
  };

  // Add a restaurant to the group
  const handleAddRestaurantToGroup = async () => {
    if (!selectedGroup || !selectedRestaurant) return;
    
    try {
      setLoading(true);
      await restaurantService.addRestaurantToGroup(
        selectedGroup.id, 
        selectedRestaurant, 
        occurrenceRating,
        token
      );
      await fetchGroupRestaurants(selectedGroup.id); // Refresh group restaurants
      setSelectedRestaurant(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add restaurant to group. Please try again.');
      console.error('Failed to add restaurant to group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update a restaurant's occurrence rating
  const handleUpdateGroupRestaurant = async (restaurantId: number, newOccurrenceRating: string) => {
    if (!selectedGroup) return;
    
    try {
      setLoading(true);
      await restaurantService.updateGroupRestaurant(
        selectedGroup.id, 
        restaurantId, 
        newOccurrenceRating,
        token
      );
      await fetchGroupRestaurants(selectedGroup.id); // Refresh group restaurants
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update restaurant occurrence rating. Please try again.');
      console.error('Failed to update restaurant occurrence rating:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove a restaurant from the group
  const handleRemoveRestaurantFromGroup = async (restaurantId: number) => {
    if (!selectedGroup) return;
    
    if (!window.confirm('Are you sure you want to remove this restaurant from the group?')) {
      return;
    }
    
    try {
      setLoading(true);
      await restaurantService.removeRestaurantFromGroup(selectedGroup.id, restaurantId, token);
      await fetchGroupRestaurants(selectedGroup.id); // Refresh group restaurants
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove restaurant from group. Please try again.');
      console.error('Failed to remove restaurant from group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get the short timezone offset
  const getTimezoneShortOffset = (timezoneValue: string) => {
    const timezone = timezones.find(tz => tz.value === timezoneValue);
    return timezone ? timezone.offset : 'UTC';
  };

  // Select timezone and close picker
  const handleTimezoneSelect = (timezoneValue: string) => {
    const newFormData = {
      ...formData,
      timezone: timezoneValue
    };
    setFormData(newFormData);
    setShowTimezonePicker(false);
    checkForChanges(newFormData);
  };

  // Add the state variable for the timezone picker
  const [showTimezonePicker, setShowTimezonePicker] = useState<boolean>(false);

  if (!isVisible) return null;

  return (
    <div className="win98-panel-overlay">
      <div 
        className="win98-panel"
        style={{
          position: 'absolute',
          top: `${position.y}px`,
          left: `${position.x}px`
        }}
        ref={containerRef}
      >
        <div 
          className="win98-panel-header"
          ref={dragHandleRef}
          style={{ cursor: 'move' }}
        >
          <div className="win98-panel-title">Group Management</div>
          <button className="win98-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-panel-content">
          {error && <div className="win98-status error">{error}</div>}
          
          <div className="win98-split-panel">
            <div className="win98-panel-left">
              <div className="win98-section-title">Groups</div>
              <div className="win98-list">
                {loading && groups.length === 0 ? (
                  <div className="win98-list-item">Loading groups...</div>
                ) : groups.length === 0 ? (
                  <div className="win98-list-item">No groups found.</div>
                ) : (
                  groups.map(group => (
                    <div 
                      key={group.id} 
                      className={`win98-list-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                      onClick={() => selectGroup(group)}
                    >
                      {group.name}
                      {group.id === currentGroupId && ' (Current)'}
                    </div>
                  ))
                )}
              </div>
              
              {isAdmin && (
                <button 
                  className="win98-button"
                  onClick={handleAddNewClick}
                  disabled={loading}
                >
                  Add New Group
                </button>
              )}
            </div>

            <div className="win98-panel-right">
              {showAddForm ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">Add New Group</div>
                  <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="name">Name:</label>
                      <input
                        className="win98-input"
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="description">Description:</label>
                      <textarea
                        className="win98-textarea"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="notificationTime">Notification Time:</label>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <input
                          className="win98-input"
                          type="time"
                          id="notificationTime"
                          name="notificationTime"
                          value={formData.notificationTime}
                          onChange={handleInputChange}
                          style={{ flex: 1 }}
                        />
                        {serverTimezone && (
                          <span 
                            className="timezone-label" 
                            onClick={() => setShowTimezonePicker(true)}
                            title="Click to change timezone"
                          >
                            ({getTimezoneShortOffset(formData.timezone)})
                          </span>
                        )}
                      </div>
                      {upcomingNotification && (
                        <div className="win98-form-row" style={{ marginTop: '-5px', marginBottom: '5px' }}>
                          <label className="win98-label">Upcoming:</label>
                          <div style={{ fontSize: '12px' }}>
                            {upcomingNotification.estTime} {upcomingNotification.tzAbbr} / {upcomingNotification.utcTime} UTC - {upcomingNotification.countdown}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="win98-panel-footer">
                      <button 
                        type="button" 
                        className="win98-button"
                        onClick={handleCancelAddNew}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="win98-button primary"
                        disabled={loading}
                      >
                        Create Group
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedGroup ? (
                <div className="win98-panel-section">
                  <div className="win98-tabs">
                    <div 
                      className={`win98-tab ${activeTab === 'details' ? 'active' : ''}`} 
                      onClick={() => setActiveTab('details')}
                    >
                      Details
                    </div>
                    <div 
                      className={`win98-tab ${activeTab === 'members' ? 'active' : ''}`} 
                      onClick={() => setActiveTab('members')}
                    >
                      Members
                    </div>
                    <div 
                      className={`win98-tab ${activeTab === 'restaurants' ? 'active' : ''}`} 
                      onClick={() => setActiveTab('restaurants')}
                    >
                      Restaurants
                    </div>
                  </div>
                  
                  {activeTab === 'details' && (
                    <>
                      {isAdmin ? (
                        <form autoComplete="off">
                          <div className="win98-form-row">
                            <label className="win98-label" htmlFor="name">Name:</label>
                            <input
                              className="win98-input"
                              type="text"
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                            />
                          </div>
                          
                          <div className="win98-form-row">
                            <label className="win98-label" htmlFor="description">Description:</label>
                            <textarea
                              className="win98-textarea"
                              id="description"
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                            />
                          </div>
                          
                          <div className="win98-form-row">
                            <label className="win98-label" htmlFor="notificationTime">Notification Time:</label>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <input
                                className="win98-input"
                                type="time"
                                id="notificationTime"
                                name="notificationTime"
                                value={formData.notificationTime}
                                onChange={handleInputChange}
                                style={{ flex: 1 }}
                              />
                              {serverTimezone && (
                                <span 
                                  className="timezone-label" 
                                  onClick={() => setShowTimezonePicker(true)}
                                  title="Click to change timezone"
                                >
                                  ({getTimezoneShortOffset(formData.timezone)})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {upcomingNotification && (
                            <div className="win98-form-row" style={{ marginTop: '-5px', marginBottom: '5px' }}>
                              <label className="win98-label">Upcoming:</label>
                              <div style={{ fontSize: '12px' }}>
                                {upcomingNotification.estTime} {upcomingNotification.tzAbbr} / {upcomingNotification.utcTime} UTC - {upcomingNotification.countdown}
                              </div>
                            </div>
                          )}
                          
                          <div className="win98-form-row">
                            <label className="win98-label">Current Restaurant:</label>
                            <span>
                              {selectedGroup.currentRestaurant ? 
                                selectedGroup.currentRestaurant.name : 
                                'Not selected'}
                            </span>
                          </div>
                          
                          <div className="win98-form-row">
                            <label className="win98-label">Voting Status:</label>
                            <span>
                              {selectedGroup.isConfirmed ? 
                                '✅ Confirmed' : 
                                `👥 Yes: ${selectedGroup.yesVotes}, No: ${selectedGroup.noVotes}`}
                            </span>
                          </div>
                        </form>
                      ) : (
                        <div className="win98-fieldset">
                          <div className="win98-form-row">
                            <span className="win98-label">Name:</span>
                            <span>{selectedGroup.name}</span>
                          </div>
                          
                          {selectedGroup.description && (
                            <div className="win98-form-row">
                              <span className="win98-label">Description:</span>
                              <span>{selectedGroup.description}</span>
                            </div>
                          )}
                          
                          <div className="win98-form-row">
                            <span className="win98-label">Notification Time:</span>
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1 }}>{formatTime(selectedGroup.notificationTime)}</span>
                              {serverTimezone && (
                                <span 
                                  className="timezone-label"
                                  title={timezones.find(tz => tz.value === (selectedGroup?.timezone || 'UTC'))?.label || 'UTC'}
                                >
                                  ({getTimezoneShortOffset(selectedGroup?.timezone || 'UTC')})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {upcomingNotification && (
                            <div className="win98-form-row" style={{ marginTop: '-5px', marginBottom: '5px' }}>
                              <span className="win98-label">Upcoming:</span>
                              <span style={{ fontSize: '12px' }}>
                                {upcomingNotification.estTime} {upcomingNotification.tzAbbr} / {upcomingNotification.utcTime} UTC - {upcomingNotification.countdown}
                              </span>
                            </div>
                          )}
                          
                          <div className="win98-form-row">
                            <span className="win98-label">Current Restaurant:</span>
                            <span>
                              {selectedGroup.currentRestaurant ? 
                                selectedGroup.currentRestaurant.name : 
                                'Not selected'}
                            </span>
                          </div>
                          
                          <div className="win98-form-row">
                            <span className="win98-label">Voting Status:</span>
                            <span>
                              {selectedGroup.isConfirmed ? 
                                '✅ Confirmed' : 
                                `👥 Yes: ${selectedGroup.yesVotes}, No: ${selectedGroup.noVotes}`}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="win98-panel-footer">
                        {isUserInGroup(selectedGroup) ? (
                          <button 
                            className="win98-button"
                            onClick={() => handleLeaveGroup(selectedGroup.id)}
                            disabled={loading}
                            style={{ whiteSpace: 'nowrap', minWidth: '110px' }}
                          >
                            Leave Group
                          </button>
                        ) : (
                          <button 
                            className="win98-button"
                            onClick={() => handleJoinGroup(selectedGroup.id)}
                            disabled={loading}
                            style={{ whiteSpace: 'nowrap', minWidth: '110px' }}
                          >
                            Join Group
                          </button>
                        )}
                        
                        {isAdmin && (
                          <>
                            {!hasChanges && (
                              <button 
                                className="win98-button danger"
                                onClick={() => handleDeleteGroup(selectedGroup.id)}
                                disabled={loading}
                                style={{ whiteSpace: 'nowrap', minWidth: '110px' }}
                              >
                                Delete Group
                              </button>
                            )}
                            {hasChanges && (
                              <>
                                <button 
                                  className="win98-button"
                                  onClick={() => selectGroup(selectedGroup)}
                                  disabled={loading}
                                  style={{ whiteSpace: 'nowrap', minWidth: '80px' }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  className="win98-button primary"
                                  onClick={handleUpdateGroup}
                                  disabled={loading}
                                  style={{ whiteSpace: 'nowrap', minWidth: '110px' }}
                                >
                                  Update Group
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'members' && (
                    <>
                      <div className="win98-fieldset" style={{ marginTop: '10px', marginBottom: '10px', padding: '10px' }}>
                        <div className="win98-section-title" style={{ marginBottom: '8px' }}>Group Members</div>
                        
                        <div className="win98-list" style={{ height: "150px", marginBottom: '0' }}>
                          {selectedGroup.users && selectedGroup.users.length > 0 ? (
                            selectedGroup.users.map(user => (
                              <div key={user.id} className="win98-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                  {user.username}
                                  {user.id === currentUserId && <span style={{ marginLeft: '5px', fontSize: '10px', color: '#008000' }}>(You)</span>}
                                </span>
                                {isAdmin && user.id !== currentUserId && (
                                  <button 
                                    className="win98-button small"
                                    onClick={() => handleRemoveUserFromGroup(user.id)}
                                    disabled={loading}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="win98-list-item">No members in this group</div>
                          )}
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="win98-panel-footer" style={{ justifyContent: 'flex-start', padding: '0' }}>
                          {showUserSelector ? (
                            <div className="win98-fieldset" style={{ marginTop: '10px', padding: '10px' }}>
                              <div className="win98-section-title" style={{ marginBottom: '8px' }}>Add User to Group</div>
                              
                              {allUsers.filter(user => !selectedGroup.users?.some(u => u.id === user.id)).length === 0 ? (
                                <div className="win98-status" style={{ marginBottom: '10px' }}>
                                  All available users are already in this group.
                                </div>
                              ) : (
                                <>
                                  <div className="win98-form-row" style={{ marginBottom: '10px' }}>
                                    <label className="win98-label" style={{ width: '80px' }}>User:</label>
                                    <select 
                                      className="win98-select"
                                      onChange={handleUserSelect}
                                      value={selectedUser || ''}
                                    >
                                      <option value="">Select a user...</option>
                                      {allUsers
                                        .filter(user => !selectedGroup.users?.some(u => u.id === user.id))
                                        .map(user => {
                                          // Check if user is in a group
                                          let groupLabel = '';
                                          let optionStyle = {};
                                          
                                          if (user.groups && user.groups.length > 0) {
                                            // Find the user's current group
                                            const userGroup = groups.find(g => 
                                              user.groups?.some(ug => ug.id === g.id)
                                            );
                                            
                                            // Only show group info if it's a different group than the selected one
                                            if (userGroup && userGroup.id !== selectedGroup.id) {
                                              groupLabel = ` — In ${userGroup.name}`;
                                              optionStyle = { color: '#555' };
                                            }
                                          }
                                          
                                          return (
                                            <option key={user.id} value={user.id} style={optionStyle}>
                                              {user.username}{groupLabel}
                                            </option>
                                          );
                                        })
                                      }
                                    </select>
                                  </div>
                                  
                                  {selectedUser && (() => {
                                    const userWithGroups = allUsers.find(u => u.id === selectedUser);
                                    if (userWithGroups && userWithGroups.groups && userWithGroups.groups.length > 0) {
                                      // Find the user's current group
                                      const currentGroup = groups.find(g => 
                                        userWithGroups.groups?.some(ug => ug.id === g.id)
                                      );
                                      
                                      // Only show warning if user is in a different group than the selected group
                                      if (currentGroup && currentGroup.id !== selectedGroup.id) {
                                        return (
                                          <div className="win98-status warning" style={{ 
                                            marginBottom: '10px',
                                            border: '1px solid #aa0', 
                                            backgroundColor: '#ffffdd',
                                            padding: '6px',
                                            fontSize: '11px',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}>
                                            <span style={{ marginRight: '5px', fontSize: '14px' }}>⚠️</span>
                                            <span>This user is already in <strong>{currentGroup.name}</strong> and will be removed from it.</span>
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </>
                              )}
                              
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="win98-button"
                                  onClick={() => setShowUserSelector(false)}
                                >
                                  Cancel
                                </button>
                                {allUsers.filter(user => !selectedGroup.users?.some(u => u.id === user.id)).length > 0 && (
                                  <button 
                                    className="win98-button primary"
                                    onClick={handleAddUserToGroup}
                                    disabled={!selectedUser}
                                  >
                                    Add User
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Only show the "Add User to Group" button if there are users available to add
                            allUsers.filter(user => !selectedGroup.users?.some(u => u.id === user.id)).length > 0 && (
                              <button 
                                className="win98-button"
                                onClick={() => setShowUserSelector(true)}
                                disabled={loading}
                                style={{ width: 'auto' }}
                              >
                                Add User to Group
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeTab === 'restaurants' && (
                    <>
                      {isAdmin ? (
                        <div className="win98-panel-section">
                          {/* Simplified single-column layout */}
                          <div className="win98-fieldset" style={{ marginBottom: '10px', position: 'relative', paddingTop: '10px' }}>
                            <div className="win98-fieldset-title" style={{ position: 'absolute', top: '-8px', left: '10px', background: '#c0c0c0', padding: '0 4px', fontSize: '11px' }}>
                              Add Restaurant
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <select
                                className="win98-select"
                                id="restaurant"
                                value={selectedRestaurant || ''}
                                onChange={handleRestaurantSelect}
                                style={{ flex: 2 }}
                              >
                                <option value="">-- Select Restaurant --</option>
                                {allRestaurants
                                  .filter(r => !groupRestaurants.some(gr => gr.id === r.id))
                                  .map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                      {restaurant.name}
                                    </option>
                                  ))}
                              </select>
                              
                              <select
                                className="win98-select"
                                id="occurrence"
                                value={occurrenceRating}
                                onChange={handleOccurrenceRatingChange}
                                style={{ flex: 1 }}
                              >
                                <option value="seldom">Seldom</option>
                                <option value="sometimes">Sometimes</option>
                                <option value="often">Often</option>
                              </select>
                              
                              <button
                                className="win98-button"
                                onClick={handleAddRestaurantToGroup}
                                disabled={loading || !selectedRestaurant}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          
                          <div className="win98-fieldset" style={{ position: 'relative', paddingTop: '10px' }}>
                            <div className="win98-fieldset-title" style={{ position: 'absolute', top: '-8px', left: '10px', background: '#c0c0c0', padding: '0 4px', fontSize: '11px' }}>
                              Group Restaurants
                            </div>
                            <div style={{ height: "190px", overflowY: "auto" }}>
                              <table className="win98-table" style={{ width: "100%" }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#c0c0c0', zIndex: 1 }}>
                                  <tr>
                                    <th>Restaurant</th>
                                    <th style={{ width: "90px" }}>Occurrence</th>
                                    <th style={{ width: "60px" }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loading && groupRestaurants.length === 0 ? (
                                    <tr>
                                      <td colSpan={3}>Loading restaurants...</td>
                                    </tr>
                                  ) : groupRestaurants.length === 0 ? (
                                    <tr>
                                      <td colSpan={3}>No restaurants found in this group.</td>
                                    </tr>
                                  ) : (
                                    groupRestaurants.map(restaurant => (
                                      <tr key={restaurant.id}>
                                        <td>{restaurant.name}</td>
                                        <td>
                                          <select 
                                            className="win98-select"
                                            value={restaurant.occurrenceRating}
                                            onChange={(e) => handleUpdateGroupRestaurant(restaurant.id, e.target.value)}
                                            style={{ width: "100%" }}
                                          >
                                            <option value="seldom">Seldom</option>
                                            <option value="sometimes">Sometimes</option>
                                            <option value="often">Often</option>
                                          </select>
                                        </td>
                                        <td>
                                          <button
                                            className="win98-button danger small"
                                            onClick={() => handleRemoveRestaurantFromGroup(restaurant.id)}
                                            disabled={loading}
                                            style={{ width: "100%" }}
                                          >
                                            Remove
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="win98-panel-section">
                          <div className="win98-fieldset" style={{ position: 'relative', paddingTop: '10px' }}>
                            <div className="win98-fieldset-title" style={{ position: 'absolute', top: '-8px', left: '10px', background: '#c0c0c0', padding: '0 4px', fontSize: '11px' }}>
                              Group Restaurants
                            </div>
                            <div style={{ height: "220px", overflowY: "auto" }}>
                              <table className="win98-table" style={{ width: "100%" }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#c0c0c0', zIndex: 1 }}>
                                  <tr>
                                    <th>Restaurant</th>
                                    <th style={{ width: "100px" }}>Occurrence</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loading && groupRestaurants.length === 0 ? (
                                    <tr>
                                      <td colSpan={2}>Loading restaurants...</td>
                                    </tr>
                                  ) : groupRestaurants.length === 0 ? (
                                    <tr>
                                      <td colSpan={2}>No restaurants found in this group.</td>
                                    </tr>
                                  ) : (
                                    groupRestaurants.map(restaurant => (
                                      <tr key={restaurant.id}>
                                        <td>{restaurant.name}</td>
                                        <td>
                                          {restaurant.occurrenceRating === 'seldom' && 'Seldom'}
                                          {restaurant.occurrenceRating === 'sometimes' && 'Sometimes'}
                                          {restaurant.occurrenceRating === 'often' && 'Often'}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="win98-section-title">Select a group to view details</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showTimezonePicker && (
        <div className="timezone-picker">
          <div className="timezone-picker-content">
            <div className="timezone-picker-header">
              <h2>Select Timezone</h2>
              <button onClick={() => setShowTimezonePicker(false)}>×</button>
            </div>
            <div className="timezone-picker-body">
              <div className="timezone-list">
                {timezones.map(timezone => (
                  <div
                    key={timezone.value}
                    className={`timezone-item ${formData.timezone === timezone.value ? 'timezone-selected' : ''}`}
                    onClick={() => handleTimezoneSelect(timezone.value)}
                  >
                    <strong>{timezone.offset}</strong> - {timezone.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupPanel; 