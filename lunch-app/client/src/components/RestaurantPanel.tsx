import React, { useState, useEffect } from 'react';
import './RestaurantPanel.css';

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

  // Fetch restaurants on component mount
  useEffect(() => {
    if (isVisible) {
      fetchRestaurants();
    }
  }, [isVisible]);

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
    <div className="restaurant-panel-overlay">
      <div className="restaurant-panel">
        <h2>Restaurant Management</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="panel-layout">
          <div className="restaurant-list-container">
            <h3>Restaurants</h3>
            {loading && restaurants.length === 0 ? (
              <p>Loading restaurants...</p>
            ) : restaurants.length === 0 ? (
              <p>No restaurants found.</p>
            ) : (
              <div className="restaurant-list">
                {restaurants.map(restaurant => (
                  <div 
                    key={restaurant.id} 
                    className={`restaurant-item ${selectedRestaurantId === restaurant.id ? 'selected-restaurant' : ''}`}
                    onClick={() => handleSelectRestaurant(restaurant)}
                  >
                    <span>{restaurant.name}</span>
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
                Add New Restaurant
              </button>
            ) : null}
          </div>

          <div className="restaurant-details">
            {editMode ? (
              <>
                <h3>{editingId ? 'Edit Restaurant' : 'Add New Restaurant'}</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Name:</label>
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
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="address">Address:</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Phone:</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="website">Website:</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="button-group">
                    <button type="submit" disabled={loading}>
                      {editingId ? 'Update' : 'Add'} Restaurant
                    </button>
                    {editingId && (
                      <button 
                        type="button" 
                        onClick={() => handleDelete(editingId)}
                        className="delete-button"
                        disabled={loading}
                      >
                        Delete Restaurant
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={handleCancelEdit}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              selectedRestaurant ? (
                <>
                  <h3>Restaurant Details</h3>
                  <div className="restaurant-info">
                    <div className="info-row">
                      <span>Name:</span>
                      <span>{selectedRestaurant.name}</span>
                    </div>
                    {selectedRestaurant.description && (
                      <div className="info-row">
                        <span>Description:</span>
                        <span>{selectedRestaurant.description}</span>
                      </div>
                    )}
                    {selectedRestaurant.address && (
                      <div className="info-row">
                        <span>Address:</span>
                        <span>{selectedRestaurant.address}</span>
                      </div>
                    )}
                    {selectedRestaurant.phone && (
                      <div className="info-row">
                        <span>Phone:</span>
                        <span>{selectedRestaurant.phone}</span>
                      </div>
                    )}
                    {selectedRestaurant.website && (
                      <div className="info-row">
                        <span>Website:</span>
                        <span>{selectedRestaurant.website}</span>
                      </div>
                    )}
                  </div>
                  <div className="restaurant-actions">
                    <button 
                      onClick={() => handleEdit(selectedRestaurant)}
                      disabled={loading}
                      className="edit-button"
                    >
                      Edit Restaurant
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedRestaurant.id)}
                      disabled={loading}
                      className="delete-button"
                    >
                      Delete Restaurant
                    </button>
                  </div>
                </>
              ) : (
                <p>Select a restaurant to view details</p>
              )
            )}
          </div>
        </div>
        
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default RestaurantPanel; 