import React, { useState, useEffect } from 'react';
import { websocketService } from '../services/websocket.service';
import './UserPanel.css';

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
    
    // If admin, also set up edit form
    if (isAdmin) {
      setFormData({
        username: user.username,
        password: '', // Password field is cleared for security
        isAdmin: user.isAdmin
      });
      setEditingId(user.id);
    }
  };
  
  // Get the selected user
  const getSelectedUser = () => {
    return users.find(user => user.id === selectedUserId);
  };
  
  // Handle starting a chat with a user
  const handleChatWithUser = () => {
    if (selectedUserId && onStartChat) {
      onStartChat(selectedUserId);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="user-panel window">
      <div className="title-bar">
        <div className="title-bar-text">User Management</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="panel-content">
          {error && <div className="error-message">{error}</div>}
          
          <div className="users-section">
            <div className="filter-section">
              <label>
                <input 
                  type="checkbox" 
                  checked={showOnlyLoggedIn} 
                  onChange={() => setShowOnlyLoggedIn(!showOnlyLoggedIn)} 
                />
                Show only logged in users
              </label>
              <button 
                onClick={fetchUsers} 
                disabled={loading}
                className="refresh-button"
              >
                Refresh
              </button>
            </div>
            
            <div className="user-list-container">
              <div className="user-list">
                {loading ? (
                  <div className="loading">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="no-users">No users found</div>
                ) : (
                  users.map(user => (
                    <div 
                      key={user.id}
                      className={`user-item ${selectedUserId === user.id ? 'selected' : ''} ${user.isLoggedIn ? 'logged-in' : 'logged-out'}`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-item-name">
                        <span className="status-dot"></span>
                        <span>{user.username}</span>
                        {user.isAdmin && <span className="admin-badge">Admin</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="user-actions">
              {selectedUserId && selectedUserId !== currentUserId && onStartChat && (
                <button 
                  onClick={handleChatWithUser}
                  className="chat-button"
                  disabled={!getSelectedUser()?.isLoggedIn}
                >
                  Chat with User
                </button>
              )}
            </div>
          </div>
          
          {isAdmin && (
            <div className="user-form-section">
              <h3>{editingId ? 'Edit User' : 'Create New User'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingId} // Only required for new users
                    placeholder={editingId ? "(leave blank to keep current)" : ""}
                  />
                </div>
                
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="isAdmin"
                      checked={formData.isAdmin}
                      onChange={handleInputChange}
                    />
                    Admin User
                  </label>
                </div>
                
                <div className="form-buttons">
                  <button type="submit" disabled={loading}>
                    {editingId ? 'Update User' : 'Create User'}
                  </button>
                  
                  {editingId && (
                    <>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormData({ username: '', password: '', isAdmin: false });
                          setEditingId(null);
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => handleDelete(editingId)}
                        className="delete-button"
                        disabled={loading || editingId === currentUserId}
                      >
                        Delete User
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}
          
          {getSelectedUser() && (
            <div className="user-details">
              <h3>User Details</h3>
              <div className="details-row">
                <span className="label">Username:</span>
                <span className="value">{getSelectedUser()?.username}</span>
              </div>
              <div className="details-row">
                <span className="label">Status:</span>
                <span className="value">
                  {getSelectedUser()?.isLoggedIn ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="details-row">
                <span className="label">Role:</span>
                <span className="value">
                  {getSelectedUser()?.isAdmin ? 'Administrator' : 'Regular User'}
                </span>
              </div>
              {getSelectedUser()?.currentGroupId && (
                <div className="details-row">
                  <span className="label">Current Group:</span>
                  <span className="value">
                    {getSelectedUser()?.groups?.find(g => g.id === getSelectedUser()?.currentGroupId)?.name || 'Unknown'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPanel; 