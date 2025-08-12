export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  nid: string; // NID or Passport Number
  phoneNumber: string;
  address?: string;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string; // Optional since validation is handled in frontend
  nid: string; // NID or Passport Number
  phoneNumber: string;
}

export interface UserRegistrationResponse {
  success: boolean;
  uid?: string;
  message: string;
}