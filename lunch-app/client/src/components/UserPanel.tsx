import React, { useState, useEffect } from 'react';
import { websocketService } from '../services/websocket.service';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    isAdmin: boolean;
  }>({
    username: '',
    password: '',
    isAdmin: false
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showOnlyLoggedIn, setShowOnlyLoggedIn] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable();

  // Fetch users on component mount and set up WebSocket listener
  useEffect(() => {
    if (isVisible) {
      fetchUsers();
      
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

  // Reset position when panel opens
  useEffect(() => {
    if (isVisible) {
      resetPosition();
    }
  }, [isVisible, resetPosition]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const filteredUsers = showOnlyLoggedIn 
        ? data.data.filter((user: User) => user.isLoggedIn)
        : data.data;
      
      setUsers(filteredUsers);
      
      // Select first user by default if none selected
      if (filteredUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(filteredUsers[0].id);
      }
      
      setError(null);
    } catch (err) {
      setError('Error loading users. Please try again.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission for new/updated user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const url = editingId 
        ? `http://localhost:3001/api/users/${editingId}`
        : 'http://localhost:3001/api/auth/register';

      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingId ? 'update' : 'create'} user`);
      }

      // Reset form and reload users
      setFormData({
        username: '',
        password: '',
        isAdmin: false
      });
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      setError(`Error ${editingId ? 'updating' : 'creating'} user. Please try again.`);
      console.error(`Error ${editingId ? 'updating' : 'creating'} user:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Edit a user
  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      password: '', // Password field is cleared for security
      isAdmin: user.isAdmin
    });
    setEditingId(user.id);
  };

  // Delete a user
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
    } catch (err) {
      setError('Error deleting user. Please try again.');
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
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

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      username: '',
      password: '',
      isAdmin: false
    });
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
              <div className="win98-view-options">
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
              
              {/* User action buttons */}
              <div className="win98-button-row">
                {onStartChat && selectedUserId && selectedUserId !== currentUserId && (
                  <button 
                    className="win98-button"
                    onClick={handleChatWithUser}
                    disabled={!selectedUser?.isLoggedIn}
                    title={!selectedUser?.isLoggedIn ? "User is not logged in" : ""}
                  >
                    Chat with User
                  </button>
                )}
              </div>
            </div>
            
            <div className="win98-panel-right">
              <div className="user-details">
                <h3 className="win98-section-title">User Details</h3>
                {selectedUser ? (
                  <div className="user-details-content">
                    <div className="win98-form-row">
                      <label className="win98-label">Username:</label>
                      <div className="win98-value">{selectedUser.username}</div>
                    </div>
                    <div className="win98-form-row">
                      <label className="win98-label">Role:</label>
                      <div className="win98-value">{selectedUser.isAdmin ? 'Administrator' : 'User'}</div>
                    </div>
                    <div className="win98-form-row">
                      <label className="win98-label">Status:</label>
                      <div className="win98-value">
                        <span className={`status-indicator ${selectedUser.isLoggedIn ? 'online' : 'offline'}`}></span>
                        {selectedUser.isLoggedIn ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    {selectedUser.groups && selectedUser.groups.length > 0 && (
                      <div className="win98-form-row">
                        <label className="win98-label">Group:</label>
                        <div className="win98-value">{selectedUser.groups[0]?.name || 'None'}</div>
                      </div>
                    )}
                    
                    {isAdmin && selectedUser.id !== currentUserId && (
                      <div className="user-actions">
                        <button 
                          className="win98-button small"
                          onClick={() => handleEdit(selectedUser)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button 
                          className="win98-button small danger"
                          onClick={() => handleDelete(selectedUser.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                        {onStartChat && selectedUser.isLoggedIn && (
                          <button 
                            className="win98-button small"
                            onClick={handleChatWithUser}
                          >
                            Chat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-message">Select a user to view details</div>
                )}
              </div>
              
              {isAdmin && (
                <div className="user-form">
                  <h3 className="win98-section-title">{editingId ? 'Edit User' : 'Add New User'}</h3>
                  <form onSubmit={handleSubmit}>
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
                      />
                    </div>
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="password">
                        {editingId ? 'New Password:' : 'Password:'}
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="win98-input"
                        required={!editingId}
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
                    <div className="win98-form-footer">
                      {editingId && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="win98-button"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="win98-button primary"
                        disabled={loading || !formData.username || (!editingId && !formData.password)}
                      >
                        {editingId ? 'Update' : 'Add User'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel; 