import React, { useState, useEffect } from 'react';
import { websocketService } from '../services/websocket.service';
import './UserPanel.css';
import './Win98Panel.css';

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
      <div className="win98-panel">
        <div className="win98-panel-header">
          <div className="win98-panel-title">User Management</div>
          <button className="win98-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-panel-content">
          {error && <div className="win98-status error">{error}</div>}
          
          <div className="win98-tabs">
            <div 
              className={`win98-tab ${showOnlyLoggedIn ? 'active' : ''}`} 
              onClick={() => setShowOnlyLoggedIn(true)}
            >
              Online Users
            </div>
            <div 
              className={`win98-tab ${!showOnlyLoggedIn ? 'active' : ''}`} 
              onClick={() => setShowOnlyLoggedIn(false)}
            >
              All Users
            </div>
          </div>
          
          <div className="win98-split-panel">
            <div className="win98-panel-left">
              <div className="win98-section-title">
                {showOnlyLoggedIn ? 'Online Users' : 'All Users'}
              </div>
              <div className="win98-list">
                {loading && users.length === 0 ? (
                  <div className="win98-list-item">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="win98-list-item">No users found.</div>
                ) : (
                  users.map(user => (
                    <div 
                      key={user.id} 
                      className={`win98-list-item ${selectedUserId === user.id ? 'selected' : ''}`}
                      onClick={() => handleUserSelect(user)}
                    >
                      {user.isLoggedIn && <span className="win98-online-indicator"></span>}
                      {!user.isLoggedIn && <span className="win98-offline-indicator"></span>}
                      {user.username} {user.isAdmin && '(Admin)'}
                    </div>
                  ))
                )}
              </div>
              
              {isAdmin && (
                <button 
                  className="win98-button"
                  onClick={() => setEditingId(0)}
                  disabled={loading}
                >
                  Add New User
                </button>
              )}
            </div>

            <div className="win98-panel-right">
              {editingId !== null ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">
                    {editingId ? 'Edit User' : 'Add New User'}
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="username">Username:</label>
                      <input
                        className="win98-input"
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="password">
                        {editingId ? 'New Password:' : 'Password:'}
                      </label>
                      <input
                        className="win98-input"
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingId}
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="isAdmin">Admin:</label>
                      <div>
                        <input
                          className="win98-checkbox"
                          type="checkbox"
                          id="isAdmin"
                          name="isAdmin"
                          checked={formData.isAdmin}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    
                    <div className="win98-panel-footer">
                      <button 
                        type="button" 
                        className="win98-button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      {editingId > 0 && (
                        <button 
                          type="button" 
                          className="win98-button danger"
                          onClick={() => handleDelete(editingId)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="win98-button primary"
                        disabled={loading}
                      >
                        {editingId ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                selectedUser ? (
                  <div className="win98-panel-section">
                    <div className="win98-section-title">User Details</div>
                    <div className="win98-fieldset">
                      <div className="win98-form-row">
                        <span className="win98-label">Username:</span>
                        <span>{selectedUser.username}</span>
                      </div>
                      <div className="win98-form-row">
                        <span className="win98-label">Status:</span>
                        <span>
                          {selectedUser.isLoggedIn ? 
                            <><span className="win98-online-indicator"></span>Online</> : 
                            <><span className="win98-offline-indicator"></span>Offline</>
                          }
                        </span>
                      </div>
                      <div className="win98-form-row">
                        <span className="win98-label">Role:</span>
                        <span>{selectedUser.isAdmin ? 'Administrator' : 'Regular User'}</span>
                      </div>
                      {selectedUser.groups && selectedUser.groups.length > 0 && (
                        <div className="win98-form-row">
                          <span className="win98-label">Groups:</span>
                          <span>{selectedUser.groups.map(g => g.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="win98-panel-footer">
                      {onStartChat && selectedUser.id !== currentUserId && (
                        <button 
                          className="win98-button"
                          onClick={handleChatWithUser}
                          disabled={!selectedUser.isLoggedIn}
                        >
                          Chat
                        </button>
                      )}
                      {isAdmin && selectedUser.id !== currentUserId && (
                        <button 
                          className="win98-button danger"
                          onClick={() => handleDelete(selectedUser.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          className="win98-button primary"
                          onClick={() => handleEdit(selectedUser)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="win98-section-title">Select a user to view details</div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel; 