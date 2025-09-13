import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-admin-jwt-secret-key-2024';

// This would be stored in a database in production
const adminDatabase = [
  {
    id: 'dpm_superadmin_001',
    username: 'dpm_superadmin',
    password: 'DPM_SuperSecure2024!',
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
    maxApprovalLimit: null,
    applicationTypes: ['public_servant_id'],
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'ncdc_superadmin_001',
    username: 'ncdc_superadmin',
    password: 'NCDC_CityPass2024!',
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
    maxApprovalLimit: null,
    applicationTypes: ['city_pass'],
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

export async function POST(request: NextRequest) {
  try {
    // Verify superadmin token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string; adminType?: string };
    
    if (!['dpm_superadmin', 'ncdc_superadmin'].includes(decoded.role)) {
      return NextResponse.json(
        { error: 'Only SuperAdmins can create admin users' },
        { status: 403 }
      );
    }

    const {
      username,
      password,
      name,
      role,
      department,
      title,
      permissions,
      maxApprovalLimit
    } = await request.json();

    // Validate required fields
    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, name, role' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingAdmin = adminDatabase.find(admin => admin.username === username);
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['dpm_admin', 'ncdc_admin', 'senior_admin', 'dpm_superadmin', 'ncdc_superadmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: dpm_admin, ncdc_admin, senior_admin, dmp_superadmin, ncdc_superadmin' },
        { status: 400 }
      );
    }

    // Only superadmins can create other superadmins
    if (['dpm_superadmin', 'ncdc_superadmin'].includes(role) && !['dmp_superadmin', 'ncdc_superadmin'].includes(decoded.role)) {
      return NextResponse.json(
        { error: 'Only SuperAdmins can create other SuperAdmins' },
        { status: 403 }
      );
    }

    // Set default permissions based on role
    let defaultPermissions = [];
    let canOverride = false;
    let approvalLimit = null;
    let adminType = '';
    let applicationTypes = [];

    switch (role) {
      case 'dpm_admin':
        defaultPermissions = ['view_public_servant_applications', 'approve_public_servant_applications', 'reject_public_servant_applications', 'manage_public_servant_cards'];
        approvalLimit = maxApprovalLimit || 100;
        adminType = 'dpm';
        applicationTypes = ['public_servant_id'];
        break;
      case 'ncdc_admin':
        defaultPermissions = ['view_city_pass_applications', 'approve_city_pass_applications', 'reject_city_pass_applications', 'manage_city_pass_cards'];
        approvalLimit = maxApprovalLimit || 100;
        adminType = 'ncdc';
        applicationTypes = ['city_pass'];
        break;
      case 'senior_admin':
        defaultPermissions = ['view_applications', 'approve_applications', 'reject_applications', 'manage_cards', 'manage_admins'];
        approvalLimit = maxApprovalLimit || 200;
        adminType = 'general';
        applicationTypes = ['public_servant_id', 'city_pass'];
        break;
      case 'dpm_superadmin':
        defaultPermissions = [
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
        ];
        canOverride = true;
        approvalLimit = null;
        adminType = 'dpm';
        applicationTypes = ['public_servant_id'];
        break;
      case 'ncdc_superadmin':
        defaultPermissions = [
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
        ];
        canOverride = true;
        approvalLimit = null;
        adminType = 'ncdc';
        applicationTypes = ['city_pass'];
        break;
    }

    // Create new admin
    const newAdmin = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      password, // In production, this should be hashed
      name,
      role,
      adminType,
      department: department || (adminType === 'ncdc' ? 'National Capital District Commission' : 'Department of Personnel Management'),
      title: title || 'Administrator',
      permissions: permissions || defaultPermissions,
      canOverride,
      maxApprovalLimit: approvalLimit,
      applicationTypes,
      createdAt: new Date().toISOString(),
      createdBy: decoded.username
    };

    // Add to database (in production, save to actual database)
    adminDatabase.push(newAdmin);

    // Return admin data without password
    const { password: _password, ...adminData } = newAdmin;

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: adminData
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify superadmin token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (!['dpm_superadmin', 'ncdc_superadmin'].includes(decoded.role)) {
      return NextResponse.json(
        { error: 'Only SuperAdmins can view admin users' },
        { status: 403 }
      );
    }

    // Return all admins without passwords
    const adminsWithoutPasswords = adminDatabase.map(({ password: _password, ...admin }) => admin);

    return NextResponse.json({
      success: true,
      admins: adminsWithoutPasswords
    });

  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve admin users' },
      { status: 500 }
    );
  }
}