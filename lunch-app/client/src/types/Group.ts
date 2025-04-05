export interface Group {
  id: number;
  name: string;
  description?: string;
  notificationTime?: string;
  timezone?: string;
  users?: { id: number; username: string }[];
  currentRestaurant?: any;
  isConfirmed?: boolean;
  yesVotes?: number;
  noVotes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupWithUsers extends Group {
  users: {
    id: number;
    username: string;
    isLoggedIn: boolean;
  }[];
} 