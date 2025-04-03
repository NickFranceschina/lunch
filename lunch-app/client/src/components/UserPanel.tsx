import React, { useState, useEffect } from 'react';
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
}

const UserPanel: React.FC<UserPanelProps> = ({ 
  isVisible, 
  onClose, 
  token,
  isAdmin,
  currentUserId
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

  // Fetch users on component mount
  useEffect(() => {
    if (isVisible) {
      fetchUsers();
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
      handleEdit(user);
    }
  };

  // Get selected user details
  const getSelectedUser = () => {
    return users.find(u => u.id === selectedUserId) || (users.length > 0 ? users[0] : null);
  };

  if (!isVisible) return null;

  const selectedUser = getSelectedUser();

  return (
    <div className="user-panel-overlay">
      <div className="user-panel">
        <h2>User Management</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="filter-controls">
          <label>
            <input
              type="radio"
              name="userFilter"
              checked={showOnlyLoggedIn}
              onChange={() => setShowOnlyLoggedIn(true)}
            />
            Currently Logged In
          </label>
          <label>
            <input
              type="radio"
              name="userFilter"
              checked={!showOnlyLoggedIn}
              onChange={() => setShowOnlyLoggedIn(false)}
            />
            All Users
          </label>
        </div>

        <div className="panel-layout">
          <div className="user-list-container">
            <h3>Users</h3>
            {loading && users.length === 0 ? (
              <p>Loading users...</p>
            ) : users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <div className="user-list">
                {users.map(user => (
                  <div 
                    key={user.id} 
                    className={`user-item ${user.id === currentUserId ? 'current-user' : ''} ${user.id === selectedUserId ? 'selected-user' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <span>{user.username}</span>
                    {user.isLoggedIn && <span className="logged-in-indicator">•</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="user-details">
            <h3>User Details</h3>
            {selectedUser && (
              <div className="selected-user-info">
                <div className="info-row">
                  <span>Group:</span>
                  <span>
                    {
                      (() => {
                        const groupId = selectedUser.currentGroupId;
                        if (!groupId) return 'None';
                        const group = selectedUser.groups?.find(g => g.id === groupId);
                        return group ? group.name : groupId;
                      })()
                    }
                  </span>
                </div>
                <div className="info-row">
                  <span>IP Address:</span>
                  <span>{selectedUser.ipAddress || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span>Port:</span>
                  <span>{selectedUser.port || 'N/A'}</span>
                </div>
              </div>
            )}

            {isAdmin && (
              <>
                <h3>{editingId ? 'Edit User' : 'Add New User'}</h3>
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
                    <label htmlFor="password">
                      Password {editingId && '(leave blank to keep current)'}:
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingId}
                    />
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isAdmin"
                        checked={formData.isAdmin}
                        onChange={handleInputChange}
                      />
                      Administrator
                    </label>
                  </div>
                  
                  <div className="button-group">
                    <button type="submit" disabled={loading}>
                      {editingId ? 'Update' : 'Add'} User
                    </button>
                    {editingId && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => handleDelete(editingId)}
                          className="delete-button"
                          disabled={loading || editingId === currentUserId}
                        >
                          Delete
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormData({
                              username: '',
                              password: '',
                              isAdmin: false
                            });
                            setEditingId(null);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
        
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default UserPanel; 