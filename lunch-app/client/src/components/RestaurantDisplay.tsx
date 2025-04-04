import React from 'react';
import './RestaurantDisplay.css';

interface RestaurantDisplayProps {
  restaurantName: string;
}

const RestaurantDisplay: React.FC<RestaurantDisplayProps> = ({ restaurantName }) => {
  return (
    <div className="restaurant-display-container">
      <div className="restaurant-name">{restaurantName || 'Choose a restaurant'}</div>
    </div>
  );
};

export default RestaurantDisplay; 