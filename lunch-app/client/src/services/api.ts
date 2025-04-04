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
  
  getCurrentRestaurant: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/restaurants/group/${groupId}/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get current restaurant');
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

// Group service
export const groupService = {
  getAllGroups: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get groups');
    }
    
    return response.json();
  },
  
  getGroupById: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get group');
    }
    
    return response.json();
  },
  
  createGroup: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create group');
    }
    
    return response.json();
  },
  
  updateGroup: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update group');
    }
    
    return response.json();
  },
  
  joinGroup: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to join group');
    }
    
    return response.json();
  },
  
  leaveGroup: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to leave group');
    }
    
    return response.json();
  },
  
  addUserToGroup: async (groupId: number, userId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to add user to group');
    }
    
    return response.json();
  },
  
  removeUserFromGroup: async (groupId: number, userId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove user from group');
    }
    
    return response.json();
  },
  
  deleteGroup: async (groupId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete group');
    }
    
    return response.json();
  }
};

// User service
export const userService = {
  getAllUsers: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get users');
    }
    
    return response.json();
  },
  
  getUserById: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user');
    }
    
    return response.json();
  },
  
  getCurrentUser: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    
    return response.json();
  },
  
  updateUser: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    
    return response.json();
  },
  
  deleteUser: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    
    return response.json();
  }
}; 