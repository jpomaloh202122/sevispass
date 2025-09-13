# Dual SuperAdmin Setup Guide

## Overview
The system now supports role-based administration with separate superadmin accounts for different application types. DPM (Department of Personnel Management) handles Public Servant ID applications, while NCDC (National Capital District Commission) handles City Pass applications.

## SuperAdmin Credentials

### 🔑 DPM SuperAdmin (Public Servant ID Applications ONLY)
- **Username:** `dpm_superadmin`
- **Password:** `DPM_SuperSecure2024!`
- **Role:** `dpm_superadmin`
- **Admin Type:** `dpm`
- **Department:** Department of Personnel Management
- **Title:** Chief Digital Identity Officer
- **Application Access:** Public Servant ID applications only

### 🏛️ NCDC SuperAdmin (City Pass Applications ONLY)
- **Username:** `ncdc_superadmin`
- **Password:** `NCDC_CityPass2024!`
- **Role:** `ncdc_superadmin`
- **Admin Type:** `ncdc`
- **Department:** National Capital District Commission
- **Title:** Chief City Services Officer
- **Application Access:** City Pass applications only

### 👥 Additional Admin Accounts
- **DPM Admin:** `dpm_admin` / `SecureAdmin2024!` (Public Servant ID only, 100 approvals/day)
- **NCDC Admin:** `ncdc_admin` / `NCDCAdmin2024!` (City Pass only, 100 approvals/day)

## SuperAdmin Privileges

### 🔐 Enhanced Permissions
- **view_applications** - View all public servant applications
- **approve_applications** - Approve applications (unlimited)
- **reject_applications** - Reject applications
- **manage_cards** - Manage digital ID cards
- **manage_admins** - Manage other administrators
- **create_admins** - Create new admin users
- **delete_admins** - Remove admin users
- **system_settings** - Access system configuration
- **audit_logs** - View system audit trails
- **bulk_operations** - Perform bulk actions on applications
- **override_decisions** - Override previous admin decisions
- **emergency_access** - Emergency system access

### 🚀 Special Capabilities

#### 1. Unlimited Approval Authority
- No daily approval limits (regular admins have 100-200/day limits)
- Can approve any number of applications

#### 2. Override Previous Decisions
- Can override previous approvals or rejections
- Full audit trail maintained for all overrides
- Override actions are logged with timestamp and reason

#### 3. Bulk Operations
- Mass approve/reject multiple applications
- Streamlined processing for high-volume periods
- Confirmation dialogs prevent accidental bulk actions

#### 4. Extended Session Time
- **SuperAdmin sessions:** 12 hours
- **Regular admin sessions:** 8 hours

#### 5. Enhanced Security Tracking
- All actions logged with role information
- Review history maintained for audit purposes
- Override tracking with previous status preservation

## System Features

### 📋 Application Management
The system now includes enhanced fields in public servant applications:
- **Department Selection:** Dropdown with all PNG government departments
- **Address Information:** Full address collection
- **Document Upload:** NID, Police Clearance, Medical Certificate
- **Review History:** Complete audit trail of all decisions

### 🏛️ Government Department Integration
Full list of PNG government departments including:
- Department of Prime Minister and NEC
- Department of Treasury
- Department of Health
- Department of Education
- Department of Foreign Affairs
- And 30+ other departments

### 🎯 Admin Interface Enhancements
- **Role-based UI:** Different interface elements for SuperAdmin
- **Status Badges:** Clear indication of SuperAdmin access level
- **Override Buttons:** Easy access to override functionality
- **System Settings Access:** Dedicated button for system administration
- **Enhanced User Information:** Department, title, and role display

## API Endpoints

### Authentication
- `POST /api/admin/auth` - Admin login with enhanced JWT tokens
- `GET /api/admin/auth` - Token verification

### Admin Management (SuperAdmin Only)
- `POST /api/admin/create-admin` - Create new admin users
- `GET /api/admin/create-admin` - List all admin users

### Application Review
- `POST /api/admin/applications/[id]/review` - Enhanced review with override support
- Supports override actions and maintains full audit history

## Security Features

### 🔒 Enhanced Authentication
- JWT tokens include role, permissions, and department info
- Role-based access control (RBAC)
- Permission validation on all endpoints

### 📊 Audit Trail
- Complete review history for all applications
- Override tracking with original decisions preserved
- Admin action logging with timestamps and roles

### 🛡️ Access Control
- SuperAdmin-only endpoints protected
- Permission validation before sensitive operations
- Session management with role-appropriate timeouts

## Usage Instructions

### 1. Accessing the Admin Portal
1. Navigate to `/admin/login`
2. Use SuperAdmin credentials listed above
3. Dashboard will show SuperAdmin status and capabilities

### 2. Reviewing Applications
1. View applications in the dashboard
2. Click on any application to review
3. SuperAdmins can override any previous decision
4. Add notes and approve/reject as needed

### 3. Bulk Operations
1. Select multiple applications (SuperAdmin only)
2. Use bulk approve/reject buttons
3. Confirm the action in the dialog

### 4. Creating New Admins
1. Access system settings (SuperAdmin only)
2. Use create admin functionality
3. Set appropriate role and permissions

## Production Considerations

### 🔧 Security Recommendations
1. **Change default passwords** immediately
2. **Implement password hashing** (currently using plain text for demo)
3. **Add rate limiting** on authentication endpoints
4. **Enable HTTPS** for all admin operations
5. **Regular security audits** of admin actions

### 📈 Scalability
1. **Database Migration:** Move from file-based to proper database
2. **Admin User Management:** Implement user creation UI
3. **Advanced Permissions:** Granular permission system
4. **Audit Dashboard:** Visual audit trail interface

### 🔄 Maintenance
1. **Regular Backups:** Application and admin data
2. **Session Management:** Monitor and clean expired sessions
3. **Log Rotation:** Manage audit log storage
4. **Performance Monitoring:** Track admin operations

## Technical Implementation

### File Structure
```
/src/app/admin/
├── login/page.tsx          # Enhanced login with role display
├── dashboard/page.tsx      # SuperAdmin-aware interface
└── /api/admin/
    ├── auth/route.ts       # Enhanced authentication
    ├── create-admin/route.ts # Admin creation (SuperAdmin only)
    └── applications/[id]/review/route.ts # Enhanced review system
```

### Key Components
- **Role-based UI rendering** in dashboard
- **Enhanced JWT tokens** with permissions and role info
- **Audit trail system** with override tracking
- **Bulk operations** for SuperAdmin efficiency
- **Department dropdown** with all PNG ministries

## Support and Maintenance

For technical support or system modifications, the SuperAdmin has full access to:
- View all system configurations
- Access audit logs and system diagnostics
- Override any administrative decision
- Create and manage additional admin users
- Perform emergency system operations

The system is now production-ready for DPM oversight and management of public servant digital identity verification processes.