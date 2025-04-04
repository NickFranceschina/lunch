import React, { useState, useEffect, useCallback } from 'react';
import { groupService, userService } from '../services/api';
import './GroupPanel.css';
import './Win98Panel.css';
import useDraggable from '../hooks/useDraggable';

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
  const [formData, setFormData] = useState<GroupFormData>({
    id: null, // Initialize id as null
    name: '',
    description: '',
    notificationTime: '12:00' // Default time
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showUserSelector, setShowUserSelector] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
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
  };

  // Check if form data has changed from the original group data
  const checkForChanges = (newFormData: typeof formData) => {
    if (!selectedGroup || showAddForm) return;
    
    const hasNameChange = newFormData.name !== selectedGroup.name;
    const hasDescriptionChange = newFormData.description !== (selectedGroup.description || '');
    
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

    setHasChanges(hasNameChange || hasDescriptionChange || hasTimeChange);
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
      notificationTime: timeString
    });
    
    setShowUserSelector(false);
    setShowAddForm(false);
    setHasChanges(false);
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
      
      await fetchGroups(); // Refresh the group list
      // If creating, select the new group
      if (!isUpdating && response.data) {
        selectGroup(response.data);
      }
      resetForm();
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
        notificationTime: formData.notificationTime
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
      id: null,
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

  // Reset form function
  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      description: '',
      notificationTime: '12:00'
    });
    setHasChanges(false);
    setShowAddForm(false);
  };

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