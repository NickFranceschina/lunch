export interface User {
  id: number;
  username: string;
  email?: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  currentGroupId?: number;
  createdAt?: string;
  updatedAt?: string;
} 