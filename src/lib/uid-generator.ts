import { randomBytes } from 'crypto';

export interface GeneratedUID {
  uid: string;
  timestamp: Date;
}

export function generateUID(): GeneratedUID {
  const timestamp = new Date();
  const randomPart = randomBytes(8).toString('hex');
  const timePart = timestamp.getTime().toString(36);
  const uid = `${timePart}-${randomPart}`;
  
  return {
    uid,
    timestamp
  };
}

export function validateUID(uid: string): boolean {
  const uidPattern = /^[a-z0-9]+-[a-f0-9]{16}$/;
  return uidPattern.test(uid);
}