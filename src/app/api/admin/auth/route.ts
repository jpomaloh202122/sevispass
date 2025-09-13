import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Demo admin credentials - in production, these should be stored securely
const DEMO_ADMINS = [
  {
    id: 'dpm_superadmin_001',
    username: 'dpm_superadmin',
    password: 'DPM_SuperSecure2024!', // In production, this should be hashed
    name: 'DPM SuperAdmin',
    role: 'dpm_superadmin',
    adminType: 'dpm',
    department: 'Department of Personnel Management',
    title: 'Chief Digital Identity Officer',
    permissions: [
      'view_public_servant_applications', 
      'approve_public_servant_applications', 
      'reject_public_servant_applications', 
      'manage_public_servant_cards',
      'manage_admins',
      'create_admins',
      'delete_admins',
      'system_settings',
      'audit_logs',
      'bulk_operations',
      'override_decisions',
      'emergency_access'
    ],
    canOverride: true,
    maxApprovalLimit: null, // Unlimited approval authority
    applicationTypes: ['public_servant_id']
  },
  {
    id: 'ncdc_superadmin_001',
    username: 'ncdc_superadmin',
    password: 'NCDC_CityPass2024!', // In production, this should be hashed
    name: 'NCDC SuperAdmin',
    role: 'ncdc_superadmin',
    adminType: 'ncdc',
    department: 'National Capital District Commission',
    title: 'Chief City Services Officer',
    permissions: [
      'view_city_pass_applications', 
      'approve_city_pass_applications', 
      'reject_city_pass_applications', 
      'manage_city_pass_cards',
      'manage_admins',
      'create_admins',
      'delete_admins',
      'city_analytics',
      'audit_logs',
      'bulk_operations',
      'override_decisions',
      'emergency_access'
    ],
    canOverride: true,
    maxApprovalLimit: null, // Unlimited approval authority
    applicationTypes: ['city_pass']
  },
  {
    id: 'admin_001',
    username: 'dpm_admin',
    password: 'SecureAdmin2024!', // In production, this should be hashed
    name: 'DPM Administrator',
    role: 'dpm_admin',
    adminType: 'dpm',
    department: 'Department of Personnel Management',
    title: 'Public Servant ID Administrator',
    permissions: ['view_public_servant_applications', 'approve_public_servant_applications', 'reject_public_servant_applications', 'manage_public_servant_cards'],
    canOverride: false,
    maxApprovalLimit: 100, // Can approve up to 100 applications per day
    applicationTypes: ['public_servant_id']
  },
  {
    id: 'admin_002',
    username: 'ncdc_admin',
    password: 'NCDCAdmin2024!',
    name: 'NCDC Administrator',
    role: 'ncdc_admin',
    adminType: 'ncdc',
    department: 'National Capital District Commission',
    title: 'City Pass Administrator',
    permissions: ['view_city_pass_applications', 'approve_city_pass_applications', 'reject_city_pass_applications', 'manage_city_pass_cards'],
    canOverride: false,
    maxApprovalLimit: 100, // Can approve up to 100 applications per day
    applicationTypes: ['city_pass']
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-admin-jwt-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin user
    const admin = DEMO_ADMINS.find(
      a => a.username === username && a.password === password
    );

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        adminType: admin.adminType,
        permissions: admin.permissions,
        canOverride: admin.canOverride,
        maxApprovalLimit: admin.maxApprovalLimit,
        department: admin.department,
        applicationTypes: admin.applicationTypes
      },
      JWT_SECRET,
      { expiresIn: ['dpm_superadmin', 'ncdc_superadmin'].includes(admin.role) ? '12h' : '8h' } // SuperAdmin sessions last longer
    );

    // Return admin data without password
    const { password: _password, ...adminData } = admin;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      admin: adminData
    });

  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Verify admin token (for protected routes)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
    
    // Find admin to ensure they still exist
    const admin = DEMO_ADMINS.find(a => a.id === decoded.adminId);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 401 }
      );
    }

    const { password: _password, ...adminData } = admin;

    return NextResponse.json({
      success: true,
      admin: adminData
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}