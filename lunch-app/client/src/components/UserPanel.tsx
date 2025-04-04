import React, { useState, useEffect } from 'react';
import { websocketService } from '../services/websocket.service';
import { groupService, userService, authService } from '../services/api';
import './UserPanel.css';
import './Win98Panel.css';
import useDraggable from '../hooks/useDraggable';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  ipAddress?: string;
  port?: number;
  currentGroupId?: number;
  groups?: { id: number, name: string }[];
}

interface Group {
  id: number;
  name: string;
  users?: User[];
}

interface UserPanelProps {
  isVisible: boolean;
  onClose: () => void;
  token: string;
  isAdmin: boolean;
  currentUserId: number;
  onStartChat?: (userId: number) => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ 
  isVisible, 
  onClose, 
  token,
  isAdmin,
  currentUserId,
  onStartChat
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    isAdmin: boolean;
    currentGroupId?: number | null;
  }>({
    username: '',
    password: '',
    isAdmin: false,
    currentGroupId: null
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showOnlyLoggedIn, setShowOnlyLoggedIn] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  // Use position in the center of the screen
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 700) / 2), // 700px is approximate panel width
    y: Math.max(0, window.innerHeight / 6)
  };
  
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable('user-panel', initialPosition, true);

  // Fetch users and set up WebSocket listener
  useEffect(() => {
    if (isVisible) {
      fetchUsers();
      fetchGroups();
      
      // Set up WebSocket listener for user presence updates
      const unsubscribe = websocketService.addMessageListener('user_presence_update', (data: any) => {
        console.log('Received user presence update:', data);
        // Update the user's isLoggedIn status in our local state
        setUsers(prevUsers => {
          return prevUsers.map(user => {
            if (user.id === data.userId) {
              return { ...user, isLoggedIn: data.isLoggedIn };
            }
            return user;
          });
        });
      });
      
      // Clean up listener when component unmounts or becomes invisible
      return () => {
        unsubscribe();
      };
    }
  }, [isVisible, showOnlyLoggedIn]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers(token);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch users');
      }

      const data = response.data;
      const filteredUsers = showOnlyLoggedIn 
        ? data.filter((user: User) => user.isLoggedIn)
        : data;
      
      setUsers(filteredUsers);
      
      // Select first user by default if none selected
      if (filteredUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(filteredUsers[0].id);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading users. Please try again.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all groups
  const fetchGroups = async () => {
    try {
      const response = await groupService.getAllGroups(token);
      setGroups(response.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox separately
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      const newFormData = {
        ...formData,
        [name]: checkbox.checked
      };
      setFormData(newFormData);
      checkForChanges(newFormData);
      return;
    }
    
    // Handle other inputs
    const newFormData = {
      ...formData,
      [name]: name === 'currentGroupId' ? (value ? parseInt(value) : null) : value
    };
    setFormData(newFormData);
    checkForChanges(newFormData);
  };

  // Check if form data has changed from the original user data
  const checkForChanges = (newFormData: typeof formData) => {
    if (!selectedUserId || showAddForm) return;
    
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const hasPasswordChange = newFormData.password.trim() !== '';
    const hasUsernameChange = newFormData.username !== selectedUser.username;
    const hasAdminChange = newFormData.isAdmin !== selectedUser.isAdmin;
    const hasGroupChange = newFormData.currentGroupId !== selectedUser.currentGroupId;

    setHasChanges(hasPasswordChange || hasUsernameChange || hasAdminChange || hasGroupChange);
  };

  // Handle changing user's group
  const handleChangeGroup = async (userId: number, groupId: number | null) => {
    try {
      setLoading(true);
      
      if (groupId === null) {
        // Remove user from current group
        const user = users.find(u => u.id === userId);
        if (user && user.groups && user.groups.length > 0) {
          await groupService.removeUserFromGroup(user.groups[0].id, userId, token);
        }
      } else {
        // Add user to new group (this will automatically remove them from any existing group)
        await groupService.addUserToGroup(groupId, userId, token);
      }
      
      // Refresh user data
      await fetchUsers();
      
      setError(null);
    } catch (err) {
      setError('Error changing user group. Please try again.');
      console.error('Error changing user group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for new user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare data for submission, excluding currentGroupId
      const { currentGroupId, ...userData } = formData;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to create user');
      }

      const result = await response.json();
      
      // If a group was selected, add the user to the group
      if (currentGroupId && result.data?.id) {
        await handleChangeGroup(result.data.id, currentGroupId);
      } else if (!result.data?.id) {
        console.warn("User created, but ID not found in response for group assignment.")
      }

      // Reset form and reload users
      setFormData({
        username: '',
        password: '',
        isAdmin: false,
        currentGroupId: null
      });
      setShowAddForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error creating user. Please try again.');
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle updating a user
  const handleUpdateUser = async () => {
    if (!selectedUserId) return;
    
    try {
      setLoading(true);
      
      // Prepare data for submission, excluding currentGroupId
      const { currentGroupId, password, ...userData } = formData;
      
      // Only include password if it was provided
      const dataToSend = password ? { ...userData, password } : userData;
      
      const response = await userService.updateUser(selectedUserId, dataToSend, token);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update user');
      }

      // If group changed, update the user's group
      const selectedUser = users.find(u => u.id === selectedUserId);
      const currentGroupIdValue = selectedUser?.currentGroupId || null;
      
      if (currentGroupId !== undefined && currentGroupId !== currentGroupIdValue) {
        await handleChangeGroup(selectedUserId, currentGroupId);
      }

      // Refresh data and exit edit mode
      await fetchUsers();
      setHasChanges(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error updating user. Please try again.');
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete a user
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await userService.deleteUser(id, token);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete user');
      }

      await fetchUsers();
      if (id === selectedUserId) {
        setSelectedUserId(users.length > 0 ? users[0].id : null);
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting user. Please try again.');
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
    setFormData({
      username: user.username,
      password: '', // Password field is cleared for security
      isAdmin: user.isAdmin,
      currentGroupId: user.currentGroupId || null
    });
    setHasChanges(false);
    setShowAddForm(false);
  };

  // Toggle showing only logged in users
  const handleToggleShowOnlyLoggedIn = () => {
    setShowOnlyLoggedIn(!showOnlyLoggedIn);
  };

  // Get selected user
  const getSelectedUser = () => {
    return users.find(u => u.id === selectedUserId) || null;
  };

  // Handle start chat with user
  const handleChatWithUser = () => {
    if (selectedUserId && onStartChat) {
      onStartChat(selectedUserId);
    }
  };

  // Handle add new user button click
  const handleAddNewClick = () => {
    setFormData({
      username: '',
      password: '',
      isAdmin: false,
      currentGroupId: null
    });
    setShowAddForm(true);
    setSelectedUserId(null);
  };

  // Cancel actions
  const handleCancel = () => {
    if (showAddForm) {
      setShowAddForm(false);
      // Reselect a user if available
      if (users.length > 0) {
        setSelectedUserId(users[0].id);
        const user = users[0];
        setFormData({
          username: user.username,
          password: '',
          isAdmin: user.isAdmin,
          currentGroupId: user.currentGroupId || null
        });
        setHasChanges(false);
      }
    } else if (selectedUserId) {
      // Reset form to selected user data
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setFormData({
          username: user.username,
          password: '',
          isAdmin: user.isAdmin,
          currentGroupId: user.currentGroupId || null
        });
        setHasChanges(false);
      }
    }
  };

  // Handle group change in user details section
  const handleGroupChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedUserId) return;
    
    const groupId = e.target.value ? parseInt(e.target.value) : null;
    
    try {
      await handleChangeGroup(selectedUserId, groupId);
      // Refresh the form data after group change
      const updatedUser = users.find(u => u.id === selectedUserId);
      if (updatedUser) {
        setFormData({
          ...formData,
          currentGroupId: updatedUser.currentGroupId || null
        });
        setHasChanges(false);
      }
    } catch (err) {
      setError('Failed to change user group');
      console.error('Error changing user group:', err);
    }
  };

  if (!isVisible) return null;

  const selectedUser = getSelectedUser();

  return (
    <div className="win98-panel-overlay">
      <div 
        className="win98-panel"
        style={{
          position: 'absolute',
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: '700px'
        }}
        ref={containerRef}
      >
        <div 
          className="win98-panel-header"
          ref={dragHandleRef}
          style={{ cursor: 'move' }}
        >
          <div className="win98-panel-title">User Management</div>
          <button className="win98-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-panel-content">
          {error && <div className="win98-error-message">{error}</div>}
          
          <div className="win98-split-panel">
            <div className="win98-panel-left">
              <div className="win98-section-title">Users</div>
              <div className="win98-list user-list">
                {loading ? (
                  <div className="loading-message">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="empty-message">No users found</div>
                ) : (
                  users.map(user => (
                    <div 
                      key={user.id}
                      className={`win98-list-item ${selectedUserId === user.id ? 'selected' : ''} ${user.isLoggedIn ? 'logged-in' : ''}`}
                      onClick={() => handleUserSelect(user)}
                    >
                      {user.username} {user.isLoggedIn ? '●' : ''}
                    </div>
                  ))
                )}
              </div>
              
              <div className="win98-view-options" style={{ marginBottom: '10px' }}>
                <label className="win98-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showOnlyLoggedIn}
                    onChange={handleToggleShowOnlyLoggedIn}
                    className="win98-checkbox"
                  />
                  Show only logged in users
                </label>
              </div>
              
              {isAdmin && (
                <button 
                  className="win98-button"
                  onClick={handleAddNewClick}
                  disabled={loading}
                >
                  Add New User
                </button>
              )}
            </div>
            
            <div className="win98-panel-right">
              {showAddForm ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">Add New User</div>
                  <form onSubmit={handleSubmit}>
                    <div className="win98-fieldset">
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="username">Username:</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="win98-input"
                          required
                          autoComplete="off"
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="password">Password:</label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="win98-input"
                          required
                          autoComplete="off"
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="isAdmin">Admin:</label>
                        <input
                          type="checkbox"
                          id="isAdmin"
                          name="isAdmin"
                          checked={formData.isAdmin}
                          onChange={handleInputChange}
                          className="win98-checkbox"
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="currentGroupId">Group:</label>
                        <select 
                          id="currentGroupId"
                          name="currentGroupId"
                          value={formData.currentGroupId || ''}
                          onChange={handleInputChange}
                          className="win98-select"
                          style={{ width: 'auto', minWidth: '180px' }}
                        >
                          <option value="">No Group</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="win98-panel-footer">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="win98-button"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="win98-button primary"
                        disabled={loading || !formData.username || !formData.password}
                      >
                        Add User
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedUser ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">User Details</div>
                  
                  <div>
                    <div className="win98-fieldset">
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="username">Username:</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="win98-input"
                          required
                          disabled={selectedUser.id === currentUserId}
                          autoComplete="off"
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="password">New Password:</label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="win98-input"
                          placeholder="Leave blank to keep current"
                          disabled={selectedUser.id === currentUserId}
                          autoComplete="off"
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="isAdmin">Admin:</label>
                        <input
                          type="checkbox"
                          id="isAdmin"
                          name="isAdmin"
                          checked={formData.isAdmin}
                          onChange={handleInputChange}
                          className="win98-checkbox"
                          disabled={selectedUser.id === currentUserId}
                        />
                      </div>
                      <div className="win98-form-row">
                        <label className="win98-label" htmlFor="currentGroupId">Group:</label>
                        <select 
                          id="currentGroupId"
                          name="currentGroupId"
                          value={formData.currentGroupId || ''}
                          onChange={handleInputChange}
                          className="win98-select"
                          style={{ width: 'auto', minWidth: '180px' }}
                          disabled={selectedUser.id === currentUserId}
                        >
                          <option value="">No Group</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="win98-form-row">
                        <span className="win98-label">Status:</span>
                        <span>
                          <span className={`status-indicator ${selectedUser.isLoggedIn ? 'online' : 'offline'}`}></span>
                          {selectedUser.isLoggedIn ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  
                    {isAdmin && selectedUser.id !== currentUserId && (
                      <div className="win98-panel-footer">
                        {!hasChanges && (
                          <button 
                            className="win98-button danger"
                            onClick={() => handleDelete(selectedUser.id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        )}
                        {onStartChat && selectedUser.isLoggedIn && (
                          <button 
                            className="win98-button"
                            onClick={handleChatWithUser}
                          >
                            Chat
                          </button>
                        )}
                        {hasChanges && (
                          <button 
                            className="win98-button primary"
                            onClick={handleUpdateUser}
                            disabled={loading || !formData.username}
                          >
                            Update User
                          </button>
                        )}
                        {hasChanges && (
                          <button 
                            className="win98-button"
                            onClick={handleCancel}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="win98-section-title">Select a user to view details</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel; 