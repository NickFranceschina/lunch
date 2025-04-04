import React, { useState, useEffect } from 'react';
import './RestaurantPanel.css';
import './Win98Panel.css';
import useDraggable from '../hooks/useDraggable';

interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
}

interface RestaurantPanelProps {
  isVisible: boolean;
  onClose: () => void;
  token: string;
  groupId?: number;
}

const RestaurantPanel: React.FC<RestaurantPanelProps> = ({ 
  isVisible, 
  onClose, 
  token,
  groupId 
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Restaurant>>({
    name: '',
    description: '',
    address: '',
    phone: '',
    website: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable();

  // Fetch restaurants on component mount
  useEffect(() => {
    if (isVisible) {
      fetchRestaurants();
    }
  }, [isVisible]);

  // Reset position when panel opens
  useEffect(() => {
    if (isVisible) {
      resetPosition();
    }
  }, [isVisible, resetPosition]);

  // Fetch all restaurants
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/restaurants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }

      const data = await response.json();
      setRestaurants(data.restaurants);
      
      // Select first restaurant by default if none selected
      if (data.restaurants.length > 0 && !selectedRestaurantId) {
        setSelectedRestaurantId(data.restaurants[0].id);
      }
      
      setError(null);
    } catch (err) {
      setError('Error loading restaurants. Please try again.');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission for new/updated restaurant
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const url = editingId 
        ? `http://localhost:3001/api/restaurants/${editingId}`
        : 'http://localhost:3001/api/restaurants';

      const method = editingId ? 'PUT' : 'POST';
      
      const body = groupId && !editingId
        ? { ...formData, groupId }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingId ? 'update' : 'create'} restaurant`);
      }

      // Reset form and reload restaurants
      setFormData({
        name: '',
        description: '',
        address: '',
        phone: '',
        website: ''
      });
      setEditingId(null);
      setEditMode(false);
      await fetchRestaurants();
    } catch (err) {
      setError(`Error ${editingId ? 'updating' : 'creating'} restaurant. Please try again.`);
      console.error(`Error ${editingId ? 'updating' : 'creating'} restaurant:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Edit a restaurant
  const handleEdit = (restaurant: Restaurant) => {
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      website: restaurant.website || ''
    });
    setEditingId(restaurant.id);
    setEditMode(true);
  };

  // Select a restaurant
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurantId(restaurant.id);
    if (editMode) {
      handleEdit(restaurant);
    }
  };

  // Delete a restaurant
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/restaurants/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete restaurant');
      }

      await fetchRestaurants();
      if (id === selectedRestaurantId) {
        setSelectedRestaurantId(restaurants.length > 0 ? restaurants[0].id : null);
      }
      setEditMode(false);
      setEditingId(null);
    } catch (err) {
      setError('Error deleting restaurant. Please try again.');
      console.error('Error deleting restaurant:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset form for adding new restaurant
  const handleAddNewClick = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      website: ''
    });
    setEditingId(null);
    setEditMode(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      website: ''
    });
  };

  // Get selected restaurant
  const getSelectedRestaurant = () => {
    return restaurants.find(r => r.id === selectedRestaurantId) || null;
  };

  if (!isVisible) return null;

  const selectedRestaurant = getSelectedRestaurant();

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
          <div className="win98-panel-title">Restaurant Management</div>
          <button className="win98-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-panel-content">
          {error && <div className="win98-status error">{error}</div>}
          
          <div className="win98-split-panel">
            <div className="win98-panel-left">
              <div className="win98-section-title">Restaurants</div>
              <div className="win98-list">
                {loading && restaurants.length === 0 ? (
                  <div className="win98-list-item">Loading restaurants...</div>
                ) : restaurants.length === 0 ? (
                  <div className="win98-list-item">No restaurants found.</div>
                ) : (
                  restaurants.map(restaurant => (
                    <div 
                      key={restaurant.id} 
                      className={`win98-list-item ${selectedRestaurantId === restaurant.id ? 'selected' : ''}`}
                      onClick={() => handleSelectRestaurant(restaurant)}
                    >
                      {restaurant.name}
                    </div>
                  ))
                )}
              </div>
              
              {!editMode && (
                <button 
                  className="win98-button"
                  onClick={handleAddNewClick}
                  disabled={loading}
                >
                  Add New Restaurant
                </button>
              )}
            </div>

            <div className="win98-panel-right">
              {editMode ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">
                    {editingId ? 'Edit Restaurant' : 'Add New Restaurant'}
                  </div>
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
                      <label className="win98-label" htmlFor="address">Address:</label>
                      <input
                        className="win98-input"
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="phone">Phone:</label>
                      <input
                        className="win98-input"
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="win98-form-row">
                      <label className="win98-label" htmlFor="website">Website:</label>
                      <input
                        className="win98-input"
                        type="text"
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="win98-panel-footer">
                      <button 
                        type="button" 
                        className="win98-button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      {editingId && (
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
                selectedRestaurant ? (
                  <div className="win98-panel-section">
                    <div className="win98-section-title">Restaurant Details</div>
                    <div className="win98-fieldset">
                      <div className="win98-form-row">
                        <span className="win98-label">Name:</span>
                        <span>{selectedRestaurant.name}</span>
                      </div>
                      {selectedRestaurant.description && (
                        <div className="win98-form-row">
                          <span className="win98-label">Description:</span>
                          <span>{selectedRestaurant.description}</span>
                        </div>
                      )}
                      {selectedRestaurant.address && (
                        <div className="win98-form-row">
                          <span className="win98-label">Address:</span>
                          <span>{selectedRestaurant.address}</span>
                        </div>
                      )}
                      {selectedRestaurant.phone && (
                        <div className="win98-form-row">
                          <span className="win98-label">Phone:</span>
                          <span>{selectedRestaurant.phone}</span>
                        </div>
                      )}
                      {selectedRestaurant.website && (
                        <div className="win98-form-row">
                          <span className="win98-label">Website:</span>
                          <span>{selectedRestaurant.website}</span>
                        </div>
                      )}
                    </div>
                    <div className="win98-panel-footer">
                      <button 
                        className="win98-button danger"
                        onClick={() => handleDelete(selectedRestaurant.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                      <button 
                        className="win98-button primary"
                        onClick={() => handleEdit(selectedRestaurant)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="win98-section-title">Select a restaurant to view details</div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPanel; 