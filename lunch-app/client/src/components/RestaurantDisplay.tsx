import React from 'react';
import './RestaurantDisplay.css';

interface RestaurantDisplayProps {
  restaurantName: string;
  children?: React.ReactNode;
}

const RestaurantDisplay: React.FC<RestaurantDisplayProps> = ({ restaurantName, children }) => {
  return (
    <div className="restaurant-display-container">
      <div className="restaurant-name">
        <div className="restaurant-text">{restaurantName || 'Choose a restaurant'}</div>
        {children && <div className="restaurant-footer">{children}</div>}
      </div>
    </div>
  );
};

export default RestaurantDisplay; 