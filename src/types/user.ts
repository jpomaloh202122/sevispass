export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  nid: string; // NID or Passport Number
  phoneNumber: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  nid: string; // NID or Passport Number
  phoneNumber: string;
}

export interface UserRegistrationResponse {
  success: boolean;
  uid?: string;
  message: string;
}