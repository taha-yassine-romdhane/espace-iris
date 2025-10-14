import { Role } from '../types';

export const checkPermission = (userRole: Role, requiredRole: Role): boolean => {
  const roleHierarchy = {
    [Role.ADMIN]: 4,
    [Role.MANAGER]: 3,
    [Role.DOCTOR]: 2,
    [Role.EMPLOYEE]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const isAuthenticated = (): boolean => {
  // Check if user is authenticated (you can implement your own logic)
  const token = localStorage.getItem('token');
  return !!token;
};

export const getCurrentUser = async () => {
  // Implement your logic to get current user from API/localStorage
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  // You would typically make an API call here to validate the token
  // and get the user data
  return null;
};
