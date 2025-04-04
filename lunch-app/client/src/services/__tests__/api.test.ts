import { authService, restaurantService } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to mock successful fetch responses
const mockFetchSuccess = (data: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

// Helper to mock failed fetch responses
const mockFetchFailure = (errorMessage: string) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    statusText: errorMessage,
  });
};

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authService', () => {
    describe('login', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        isAdmin: false,
      };
      const mockResponse = {
        success: true,
        message: 'Login successful',
        user: mockUser,
        token: 'test-token-123',
      };

      it('should make a POST request to login endpoint with correct parameters', async () => {
        mockFetchSuccess(mockResponse);

        const result = await authService.login('testuser', 'password123');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: 'testuser', password: 'password123' }),
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when login fails', async () => {
        mockFetchFailure('Invalid credentials');

        await expect(authService.login('testuser', 'wrongpassword')).rejects.toThrow('Login failed');
      });
    });

    describe('logout', () => {
      const mockResponse = {
        success: true,
        message: 'Logout successful',
      };

      it('should make a POST request to logout endpoint with correct token', async () => {
        mockFetchSuccess(mockResponse);

        const result = await authService.logout('test-token-123');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/auth/logout',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token-123',
            },
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when token is not provided', async () => {
        await expect(authService.logout('')).rejects.toThrow('Token is required for logout');
      });

      it('should throw an error when logout fails', async () => {
        mockFetchFailure('Unauthorized');

        await expect(authService.logout('invalid-token')).rejects.toThrow('Logout failed');
      });
    });
  });

  describe('restaurantService', () => {
    const token = 'test-token-123';
    const groupId = 1;

    describe('getRandomRestaurant', () => {
      const mockResponse = {
        success: true,
        restaurant: { id: 1, name: 'Test Restaurant', cuisine: 'Italian' },
      };

      it('should make a GET request to random restaurant endpoint with correct parameters', async () => {
        mockFetchSuccess(mockResponse);

        const result = await restaurantService.getRandomRestaurant(groupId, token);

        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3001/api/restaurants/group/${groupId}/random`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when request fails', async () => {
        mockFetchFailure('Error getting random restaurant');

        await expect(restaurantService.getRandomRestaurant(groupId, token)).rejects.toThrow(
          'Failed to get random restaurant'
        );
      });
    });

    describe('getCurrentRestaurant', () => {
      const mockResponse = {
        restaurant: { id: 1, name: 'Current Restaurant' },
        isConfirmed: true,
        yesVotes: 3,
        noVotes: 1,
        activeUsers: 5,
      };

      it('should make a GET request to current restaurant endpoint with correct parameters', async () => {
        mockFetchSuccess(mockResponse);

        const result = await restaurantService.getCurrentRestaurant(groupId, token);

        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3001/api/restaurants/group/${groupId}/current`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when request fails', async () => {
        mockFetchFailure('Error getting current restaurant');

        await expect(restaurantService.getCurrentRestaurant(groupId, token)).rejects.toThrow(
          'Failed to get current restaurant'
        );
      });
    });

    describe('voteYes', () => {
      const mockResponse = {
        success: true,
        message: 'Vote recorded',
        yesVotes: 3,
        noVotes: 1,
        isConfirmed: false,
      };

      it('should make a POST request to vote endpoint with correct parameters', async () => {
        mockFetchSuccess(mockResponse);

        const result = await restaurantService.voteYes(groupId, token);

        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3001/api/restaurants/group/${groupId}/vote`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ vote: 'yes' }),
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when request fails', async () => {
        mockFetchFailure('Error voting');

        await expect(restaurantService.voteYes(groupId, token)).rejects.toThrow(
          'Failed to vote yes'
        );
      });
    });

    describe('voteNo', () => {
      const mockResponse = {
        success: true,
        message: 'Vote recorded',
        yesVotes: 2,
        noVotes: 2,
        isConfirmed: false,
      };

      it('should make a POST request to vote endpoint with correct parameters', async () => {
        mockFetchSuccess(mockResponse);

        const result = await restaurantService.voteNo(groupId, token);

        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3001/api/restaurants/group/${groupId}/vote`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ vote: 'no' }),
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw an error when request fails', async () => {
        mockFetchFailure('Error voting');

        await expect(restaurantService.voteNo(groupId, token)).rejects.toThrow(
          'Failed to vote no'
        );
      });
    });
  });
}); 