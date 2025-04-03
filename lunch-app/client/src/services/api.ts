const API_BASE_URL = 'http://localhost:3001';

// Auth service
export const authService = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },
  
  logout: async (token: string) => {
    if (!token) {
      throw new Error('Token is required for logout');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    
    return response.json();
  }
};

// Restaurant service
export const restaurantService = {
  getRandomRestaurant: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/group/${groupId}/random`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get random restaurant');
    }
    
    return response.json();
  },
  
  voteYes: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/group/${groupId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vote: 'yes' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to vote yes');
    }
    
    return response.json();
  },
  
  voteNo: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/group/${groupId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vote: 'no' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to vote no');
    }
    
    return response.json();
  },
  
  getAllRestaurants: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get restaurants');
    }
    
    return response.json();
  },
  
  createRestaurant: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create restaurant');
    }
    
    return response.json();
  },
  
  updateRestaurant: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update restaurant');
    }
    
    return response.json();
  },
  
  deleteRestaurant: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete restaurant');
    }
    
    return response.json();
  }
}; 