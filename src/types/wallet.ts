export interface DigitalCard {
  id: string;
  type: 'sevispass' | 'government' | 'medical' | 'education' | 'custom' | 'city_pass' | 'public_servant_id';
  name: string;
  holderName: string;
  cardNumber: string;
  issueDate: string;
  expiryDate?: string;
  issuer: string;
  qrCode?: string;
  profileImage?: string;
  metadata: {
    [key: string]: string | number | boolean | null;
  };
  colors?: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CityPassCategory = 'student' | 'employee' | 'business_owner' | 'property_owner' | 'visitor';

export type PublicServantIdCategory = 'government_employee' | 'contractor' | 'consultant' | 'volunteer';

export interface CityPassApplication {
  id: string;
  userId: string;
  category: CityPassCategory;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  identificationNumber: string;
  identificationType: 'national_id' | 'passport' | 'drivers_license';
  supportingDocuments: {
    identificationDocument: string;
    proofOfAddress: string;
    categorySpecificDocument?: string;
  };
  categorySpecificData: {
    [key: string]: string | number | boolean | null;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  validityPeriod: number;
  applicationDate: string;
  reviewDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  reviewedBy?: string;
  adminNotes?: string;
  ncdcReference?: string;
}

export interface CityPassCard extends DigitalCard {
  type: 'city_pass';
  passCategory: CityPassCategory;
  ncdcReference: string;
  validityPeriod: number;
}

export interface PublicServantIdApplication {
  id: string;
  userId: string;
  category: PublicServantIdCategory;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  identificationNumber: string;
  identificationType: 'national_id' | 'passport' | 'drivers_license';
  supportingDocuments: {
    nidDocument: string;
    policeClearance: string;
    medicalCertificate: string;
  };
  employmentDetails: {
    department: string;
    position: string;
    employeeId: string;
    governmentEmail: string;
    startDate: string;
    contractType: 'permanent' | 'contract' | 'temporary' | 'consultant';
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  validityPeriod: number;
  applicationDate: string;
  reviewDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  reviewedBy?: string;
  adminNotes?: string;
  dpmReference?: string;
}

export interface PublicServantIdCard extends DigitalCard {
  type: 'public_servant_id';
  passCategory: PublicServantIdCategory;
  dpmReference: string;
  validityPeriod: number;
  employmentDetails: {
    department: string;
    position: string;
    employeeId: string;
  };
}

export interface WalletState {
  cards: DigitalCard[];
  activeCardId: string | null;
  isLocked: boolean;
  lastAccessed: string;
}

export interface WalletContextType {
  wallet: WalletState;
  addCard: (card: Omit<DigitalCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  removeCard: (cardId: string) => Promise<boolean>;
  updateCard: (cardId: string, updates: Partial<DigitalCard>) => Promise<boolean>;
  setActiveCard: (cardId: string | null) => void;
  exportCard: (cardId: string, format: 'json' | 'qr' | 'pdf' | 'png') => Promise<string | Blob>;
  importCard: (data: string | File) => Promise<boolean>;
  lockWallet: () => void;
  unlockWallet: (pin?: string) => boolean;
  searchCards: (query: string) => DigitalCard[];
  getCardsByType: (type: DigitalCard['type']) => DigitalCard[];
  loadCityPasses: () => Promise<void>;
}