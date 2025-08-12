import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

export function validateNidOrPassport(nid: string): { isValid: boolean; message?: string } {
  // Basic validation - just check if it's not empty and has reasonable length
  const trimmedNid = nid.trim();
  
  if (!trimmedNid) {
    return { 
      isValid: false, 
      message: 'NID or Passport Number is required' 
    };
  }
  
  if (trimmedNid.length < 3) {
    return { 
      isValid: false, 
      message: 'NID or Passport Number must be at least 3 characters long' 
    };
  }
  
  if (trimmedNid.length > 20) {
    return { 
      isValid: false, 
      message: 'NID or Passport Number must not exceed 20 characters' 
    };
  }
  
  return { isValid: true };
}

export function validatePhoneNumber(phoneNumber: string): { isValid: boolean; message?: string } {
  // Papua New Guinea phone format: +675 followed by 7-8 digits
  const phonePattern = /^\+675\s?\d{7,8}$/;
  
  if (!phonePattern.test(phoneNumber)) {
    return {
      isValid: false,
      message: 'Invalid Phone Number. Use +67512345678 format'
    };
  }
  
  return { isValid: true };
}