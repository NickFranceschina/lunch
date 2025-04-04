export interface Group {
  id: number;
  name: string;
  description?: string;
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