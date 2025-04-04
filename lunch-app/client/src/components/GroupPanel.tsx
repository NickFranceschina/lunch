import React, { useState, useEffect } from 'react';
import { groupService } from '../services/api';
import './GroupPanel.css';

interface User {
  id: number;
  username: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  notificationTime?: string;
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
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    notificationTime: string;
  }>({
    name: '',
    description: '',
    notificationTime: '12:00'
  });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showUserSelector, setShowUserSelector] = useState<boolean>(false);

  // Fetch groups on component mount
  useEffect(() => {
    if (isVisible) {
      fetchGroups();
      if (isAdmin) {
        fetchAllUsers();
      }
    }
  }, [isVisible, isAdmin]);

  // Select current group initially
  useEffect(() => {
    if (groups.length > 0) {
      if (currentGroupId) {
        const currentGroup = groups.find(group => group.id === currentGroupId);
        if (currentGroup) {
          selectGroup(currentGroup);
          return;
        }
      }
      // If no current group or it wasn't found, select the first group
      selectGroup(groups[0]);
    }
  }, [groups, currentGroupId]);

  // Fetch all groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups(token);
      setGroups(response.data);
      setError(null);
    } catch (err) {
      setError('Error loading groups. Please try again.');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users (admin only)
  const fetchAllUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setAllUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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
      notificationTime: timeString,
      name: '', // Only used for new groups
      description: ''
    });
    
    setShowUserSelector(false);
  };

  // Handle form submission for new group
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      await groupService.createGroup(formData, token);

      // Reset form and reload groups
      setFormData({
        name: '',
        description: '',
        notificationTime: '12:00'
      });
      await fetchGroups();
    } catch (err) {
      setError('Error creating group. Please try again.');
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update group notification time
  const handleUpdateNotificationTime = async () => {
    if (!selectedGroup) return;
    
    try {
      setLoading(true);
      
      await groupService.updateGroup(selectedGroup.id, {
        notificationTime: formData.notificationTime
      }, token);

      await fetchGroups();
      alert('Notification time updated successfully');
    } catch (err) {
      setError('Error updating notification time. Please try again.');
      console.error('Error updating notification time:', err);
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
      alert('Successfully joined group');
    } catch (err) {
      setError('Error joining group. Please try again.');
      console.error('Error joining group:', err);
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
      alert('Successfully left group');
    } catch (err) {
      setError('Error leaving group. Please try again.');
      console.error('Error leaving group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add user to group (admin only)
  const handleAddUserToGroup = async () => {
    if (!selectedGroup || !selectedUser) return;
    
    try {
      setLoading(true);
      
      await groupService.addUserToGroup(selectedGroup.id, selectedUser, token);
      
      await fetchGroups();
      alert('User successfully added to group');
      setShowUserSelector(false);
    } catch (err) {
      setError('Error adding user to group. Please try again.');
      console.error('Error adding user to group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove user from group (admin only)
  const handleRemoveUserFromGroup = async (userId: number) => {
    if (!selectedGroup) return;
    
    // Don't allow removing yourself
    if (userId === currentUserId) {
      alert('You cannot remove yourself from a group this way. Use the Leave Group button instead.');
      return;
    }
    
    if (window.confirm('Are you sure you want to remove this user from the group?')) {
      try {
        setLoading(true);
        
        await groupService.removeUserFromGroup(selectedGroup.id, userId, token);
        
        await fetchGroups();
        alert('User successfully removed from group');
      } catch (err) {
        setError('Error removing user from group. Please try again.');
        console.error('Error removing user from group:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not set';
    try {
      // If it's a date object, format it
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return timeString;
    } catch (e) {
      return timeString || 'Not set';
    }
  };

  const isUserInGroup = (group: Group) => {
    return group.users?.some(user => user.id === currentUserId) || false;
  };

  // Reset form when switching to add new mode
  const handleAddNewClick = () => {
    setEditMode(true);
    setFormData({
      name: '',
      description: '',
      notificationTime: '12:00'
    });
  };

  // Cancel add mode
  const handleCancelAddNew = () => {
    setEditMode(false);
    if (selectedGroup) {
      selectGroup(selectedGroup);
    }
  };

  // Toggle user selector
  const handleToggleUserSelector = () => {
    setShowUserSelector(!showUserSelector);
  };

  if (!isVisible) return null;

  // Filter out users already in the group for the dropdown
  const availableUsers = allUsers.filter(user => 
    !selectedGroup?.users?.some(groupUser => groupUser.id === user.id)
  );

  return (
    <div className="group-panel-overlay">
      <div className="group-panel">
        <h2>Group Management</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="panel-layout">
          <div className="group-list-container">
            <h3>Groups</h3>
            {loading && groups.length === 0 ? (
              <p>Loading groups...</p>
            ) : groups.length === 0 ? (
              <p>No groups found.</p>
            ) : (
              <div className="group-list">
                {groups.map(group => (
                  <div 
                    key={group.id} 
                    className={`group-item ${selectedGroup?.id === group.id ? 'selected-group' : ''} ${currentGroupId === group.id ? 'current-group' : ''}`}
                    onClick={() => {
                      selectGroup(group);
                      setEditMode(false);
                    }}
                  >
                    <span>{group.name}</span>
                  </div>
                ))}
              </div>
            )}

            {!editMode ? (
              <button 
                className="add-button" 
                onClick={handleAddNewClick}
                disabled={loading}
              >
                Add New Group
              </button>
            ) : (
              <>
                <h3>Add New Group</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Group Name:</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="notificationTime">Notification Time:</label>
                    <input
                      type="time"
                      id="notificationTime"
                      name="notificationTime"
                      value={formData.notificationTime}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="button-group">
                    <button type="submit" className="add-button" disabled={loading}>
                      Add Group
                    </button>
                    <button 
                      type="button" 
                      className="cancel-button" 
                      onClick={handleCancelAddNew}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div className="group-details">
            <h3>Group Details</h3>
            {selectedGroup && !editMode ? (
              <>
                <div className="info-row">
                  <span>Current Selection:</span>
                  <span>{selectedGroup.currentRestaurant?.name || 'None'}</span>
                </div>
                <div className="info-row">
                  <span>Notification Time:</span>
                  <span>{formatTime(selectedGroup.notificationTime)}</span>
                </div>
                <div className="info-row">
                  <span>Yes Votes:</span>
                  <span>{selectedGroup.yesVotes}</span>
                </div>
                <div className="info-row">
                  <span>No Votes:</span>
                  <span>{selectedGroup.noVotes}</span>
                </div>
                <div className="info-row">
                  <span>Status:</span>
                  <span>{selectedGroup.isConfirmed ? 'Confirmed' : 'Not Confirmed'}</span>
                </div>

                <div className="group-actions">
                  {isUserInGroup(selectedGroup) ? (
                    <button 
                      onClick={() => handleLeaveGroup(selectedGroup.id)}
                      className="leave-button"
                    >
                      Leave Group
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleJoinGroup(selectedGroup.id)}
                      className="join-button"
                    >
                      Join Group
                    </button>
                  )}
                </div>

                <div className="update-notification">
                  <h3>Update Notification Time</h3>
                  <div className="update-form">
                    <input
                      type="time"
                      name="notificationTime"
                      value={formData.notificationTime}
                      onChange={handleInputChange}
                    />
                    <button 
                      onClick={handleUpdateNotificationTime}
                      disabled={loading || !isUserInGroup(selectedGroup)}
                    >
                      Update Time
                    </button>
                  </div>
                </div>

                <div className="members-list">
                  <h3>Group Members</h3>
                  {selectedGroup.users && selectedGroup.users.length > 0 ? (
                    <div>
                      <ul className="user-list">
                        {selectedGroup.users.map(user => (
                          <li key={user.id} className="user-list-item">
                            {user.username}
                            {user.id === currentUserId && <span className="current-user-indicator"> (You)</span>}
                            {isAdmin && user.id !== currentUserId && (
                              <button 
                                className="remove-user-button"
                                onClick={() => handleRemoveUserFromGroup(user.id)}
                                title="Remove user from group"
                              >
                                ✕
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isAdmin && (
                        <div className="admin-actions">
                          {!showUserSelector ? (
                            <button 
                              className="add-button"
                              onClick={handleToggleUserSelector}
                            >
                              Add User to Group
                            </button>
                          ) : (
                            <div className="user-selector">
                              <select 
                                value={selectedUser || ""}
                                onChange={handleUserSelect}
                              >
                                <option value="">-- Select User --</option>
                                {availableUsers.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.username}
                                  </option>
                                ))}
                              </select>
                              <div className="button-group">
                                <button 
                                  onClick={handleAddUserToGroup}
                                  disabled={!selectedUser || loading}
                                  className="add-button"
                                >
                                  Add User
                                </button>
                                <button 
                                  onClick={handleToggleUserSelector}
                                  className="cancel-button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>No members in this group</p>
                  )}
                </div>
              </>
            ) : !selectedGroup ? (
              <p>Select a group to view details</p>
            ) : null}
          </div>
        </div>
        
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default GroupPanel; 