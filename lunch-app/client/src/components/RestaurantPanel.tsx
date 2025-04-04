import React, { useState, useEffect } from 'react';
import { restaurantService } from '../services/api'; // Import the service
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
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  // Use position in the center of the screen
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 700) / 2), // 700px is approximate panel width
    y: Math.max(0, window.innerHeight / 6)
  };
  
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable('restaurant-panel', initialPosition, true);

  // Fetch restaurants
  useEffect(() => {
    if (isVisible) {
      fetchRestaurants();
    }
  }, [isVisible]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      // Use the restaurantService
      const response = await restaurantService.getAllRestaurants(token);
      console.log('Restaurant API response:', response);

      if (!response.success) { // Adjust based on actual response structure
        throw new Error(response.message || 'Failed to fetch restaurants');
      }
      
      // Fix: The API returns restaurants in response.restaurants, not response.data
      console.log('Setting restaurants state with:', response.restaurants);
      setRestaurants(response.restaurants); 
      setError(null);
    } catch (err: any) {
      setError('Error loading restaurants. Please try again.');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    checkForChanges(newFormData);
  };

  // Check if form data has changed from the original restaurant data
  const checkForChanges = (newFormData: Partial<Restaurant>) => {
    if (!selectedRestaurantId) return;
    
    const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
    if (!selectedRestaurant) return;

    const hasNameChange = newFormData.name !== selectedRestaurant.name;
    const hasDescriptionChange = newFormData.description !== (selectedRestaurant.description || '');
    const hasAddressChange = newFormData.address !== (selectedRestaurant.address || '');
    const hasPhoneChange = newFormData.phone !== (selectedRestaurant.phone || '');
    const hasWebsiteChange = newFormData.website !== (selectedRestaurant.website || '');

    setHasChanges(hasNameChange || hasDescriptionChange || hasAddressChange || hasPhoneChange || hasWebsiteChange);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = editingId
      ? `/api/restaurants/${editingId}` // Use relative path
      : '/api/restaurants'; // Use relative path
    const method = editingId ? 'PUT' : 'POST';

    try {
      // Keep fetch for now, but use relative URL
      // Ideally, use restaurantService.updateRestaurant or restaurantService.createRestaurant
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingId ? 'update' : 'create'} restaurant`);
      }

      // Reset form and reload
      setFormData({ name: '', description: '', address: '', phone: '', website: '' });
      setEditingId(null);
      await fetchRestaurants(); // Reload restaurants
    } catch (err: any) {
      setError(err.message || `Error ${editingId ? 'updating' : 'creating'} restaurant.`);
      console.error(`Error ${editingId ? 'updating' : 'creating'} restaurant:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Edit a restaurant
  const handleEdit = (restaurant: Restaurant) => {
    setEditingId(restaurant.id);
    setSelectedRestaurantId(restaurant.id); // Keep showing details while editing
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      website: restaurant.website || ''
    });
  };

  // Select a restaurant
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    if (editingId === restaurant.id) {
      // If already editing this one, just show details (or toggle off editing?)
      // For now, let's just keep editing
      setSelectedRestaurantId(restaurant.id); 
    } else {
      setSelectedRestaurantId(restaurant.id); // Show details
      setEditingId(null); // Ensure not in edit mode unless Edit is clicked
      
      // Populate the form with the selected restaurant's data for viewing
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        website: restaurant.website || ''
      });
    }
  };

  // Delete a restaurant
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) {
      return;
    }

    try {
      setLoading(true);
      // Use the restaurantService
      const response = await restaurantService.deleteRestaurant(id, token);

      if (!response.success) { // Adjust based on actual response structure
        throw new Error(response.message || 'Failed to delete restaurant');
      }

      await fetchRestaurants(); // Reload restaurants
    } catch (err: any) {
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
    setSelectedRestaurantId(null);
  };

  // Cancel changes
  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', address: '', phone: '', website: '' });
    // Keep selectedRestaurantId as is, to continue showing details
  };

  // Handle form submission for updates
  const handleUpdate = async () => {
    if (!selectedRestaurantId) return;
    
    try {
      setLoading(true);
      
      // Use the restaurantService instead of hardcoded URL
      const response = await restaurantService.updateRestaurant(
        selectedRestaurantId,
        formData,
        token
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to update restaurant');
      }

      // Refresh data
      await fetchRestaurants();
      setHasChanges(false);
      setError(null);
    } catch (err: any) {
      setError('Error updating restaurant. Please try again.');
      console.error('Error updating restaurant:', err);
    } finally {
      setLoading(false);
    }
  };

  // Replace the getSelectedRestaurant function with useMemo
  const selectedRestaurant = React.useMemo(() => {
    // First check if restaurants is defined and is an array
    if (!restaurants || !Array.isArray(restaurants)) {
      return null;
    }
    // Then safely use .find()
    return restaurants.find(r => r.id === selectedRestaurantId) || null;
  }, [restaurants, selectedRestaurantId]);

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
          <div className="win98-panel-title">Restaurant Management</div>
          <button className="win98-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="win98-panel-content">
          {error && <div className="win98-status error">{error}</div>}
          
          <div className="win98-split-panel">
            <div className="win98-panel-left">
              <div className="win98-section-title">Restaurants</div>
              <div className="win98-list">
                {loading && (!restaurants || restaurants.length === 0) ? (
                  <div className="win98-list-item">Loading restaurants...</div>
                ) : !restaurants || restaurants.length === 0 ? (
                  <div className="win98-list-item">No restaurants found.</div>
                ) : (
                  restaurants.map(restaurant => (
                    <div 
                      key={restaurant.id} 
                      className={`win98-list-item ${selectedRestaurantId === restaurant.id ? 'selected' : ''}`}
                      onClick={() => handleRestaurantSelect(restaurant)}
                    >
                      {restaurant.name}
                    </div>
                  ))
                )}
              </div>
              
              {!selectedRestaurantId && (
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
              {!selectedRestaurantId ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">
                    Add New Restaurant
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
                      />
                    </div>
                    
                    <div className="win98-panel-footer">
                      <button 
                        type="button" 
                        className="win98-button"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="win98-button primary"
                        disabled={loading}
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedRestaurant ? (
                <div className="win98-panel-section">
                  <div className="win98-section-title">Restaurant Details</div>
                  <div className="win98-fieldset">
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="win98-panel-footer">
                    {!hasChanges && (
                      <button 
                        className="win98-button danger"
                        onClick={() => handleDelete(selectedRestaurant.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                    {hasChanges && (
                      <button 
                        className="win98-button primary"
                        onClick={handleUpdate}
                        disabled={loading || !formData.name}
                      >
                        Update
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
                </div>
              ) : (
                <div className="win98-section-title">Select a restaurant to view details</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPanel; 