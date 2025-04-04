import React, { useState, useEffect } from 'react';
import { groupService } from '../services/api';
import './GroupPanel.css';
import './Win98Panel.css';

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
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showUserSelector, setShowUserSelector] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');

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
      name: group.name,
      description: group.description || '',
      notificationTime: timeString
    });
    
    setShowUserSelector(false);
    setShowAddForm(false);
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
      setShowAddForm(false);
      await fetchGroups();
    } catch (err) {
      setError('Error creating group. Please try again.');
      console.error('Error creating group:', err);
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
        notificationTime: formData.notificationTime
      }, token);

      await fetchGroups();
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
    
    try {
      setLoading(true);
      await groupService.addUserToGroup(selectedGroup.id, selectedUser, token);
      await fetchGroups();
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
      await fetchGroups();
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
      await fetchGroups();
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

  // Check if user is in group
  const isUserInGroup = (group: Group) => {
    return group.users?.some(user => user.id === currentUserId) || false;
  };

  // Handle Add New Group button
  const handleAddNewClick = () => {
    setFormData({
      name: '',
      description: '',
      notificationTime: '12:00'
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

  if (!isVisible) return null;

  return (
    <div className="win98-panel-overlay">
      <div className="win98-panel">
        <div className="win98-panel-header">
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
                  <form onSubmit={handleSubmit}>
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
                      <input
                        className="win98-input"
                        type="time"
                        id="notificationTime"
                        name="notificationTime"
                        value={formData.notificationTime}
                        onChange={handleInputChange}
                      />
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
                  </div>
                  
                  {activeTab === 'details' && (
                    <>
                      {isAdmin ? (
                        <form>
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
                            <input
                              className="win98-input"
                              type="time"
                              id="notificationTime"
                              name="notificationTime"
                              value={formData.notificationTime}
                              onChange={handleInputChange}
                            />
                          </div>
                          
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
                            <span>{formatTime(selectedGroup.notificationTime)}</span>
                          </div>
                          
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
                          >
                            Leave Group
                          </button>
                        ) : (
                          <button 
                            className="win98-button"
                            onClick={() => handleJoinGroup(selectedGroup.id)}
                            disabled={loading}
                          >
                            Join Group
                          </button>
                        )}
                        
                        {isAdmin && (
                          <>
                            <button 
                              className="win98-button danger"
                              onClick={() => handleDeleteGroup(selectedGroup.id)}
                              disabled={loading}
                            >
                              Delete Group
                            </button>
                            <button 
                              className="win98-button primary"
                              onClick={handleUpdateGroup}
                              disabled={loading}
                            >
                              Update Group
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'members' && (
                    <>
                      <div className="win98-list" style={{ height: "150px" }}>
                        {selectedGroup.users && selectedGroup.users.length > 0 ? (
                          selectedGroup.users.map(user => (
                            <div key={user.id} className="win98-list-item">
                              {user.username}
                              {isAdmin && user.id !== currentUserId && (
                                <button 
                                  className="win98-button small"
                                  style={{ float: 'right' }}
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
                      
                      {isAdmin && (
                        <div className="win98-panel-footer">
                          {showUserSelector ? (
                            <div className="win98-form-row">
                              <select 
                                className="win98-select"
                                onChange={handleUserSelect}
                                value={selectedUser || ''}
                              >
                                <option value="">Select a user to add</option>
                                {allUsers
                                  .filter(user => !selectedGroup.users?.some(u => u.id === user.id))
                                  .map(user => (
                                    <option key={user.id} value={user.id}>
                                      {user.username}
                                    </option>
                                  ))
                                }
                              </select>
                              <div style={{ display: 'flex', marginTop: '8px', gap: '8px' }}>
                                <button 
                                  className="win98-button"
                                  onClick={() => setShowUserSelector(false)}
                                >
                                  Cancel
                                </button>
                                <button 
                                  className="win98-button primary"
                                  onClick={handleAddUserToGroup}
                                  disabled={!selectedUser}
                                >
                                  Add User
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="win98-button"
                              onClick={() => setShowUserSelector(true)}
                              disabled={loading}
                            >
                              Add User to Group
                            </button>
                          )}
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
    </div>
  );
};

export default GroupPanel; 