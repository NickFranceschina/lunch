const API_BASE_URL = 'http://localhost:3001/api';

// Auth service
export const authService = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
  
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    
    return response.json();
  }
};

// Restaurant service
export const restaurantService = {
  getRandomRestaurant: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/random-restaurant`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get random restaurant');
    }
    
    return response.json();
  },
  
  voteYes: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vote: 'yes' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to vote yes');
    }
    
    return response.json();
  },
  
  voteNo: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vote: 'no' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to vote no');
    }
    
    return response.json();
  }
}; 