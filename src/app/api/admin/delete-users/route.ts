import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { action, userIds, confirmDelete } = await request.json();

    // Safety check - require explicit confirmation
    if (!confirmDelete) {
      return NextResponse.json({
        success: false,
        message: 'Delete confirmation required. Set confirmDelete to true.'
      }, { status: 400 });
    }

    console.log(`Admin delete action: ${action}`);

    let result;
    
    switch (action) {
      case 'delete_all_users':
        result = await deleteAllUsers();
        break;
        
      case 'delete_specific_users':
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'userIds array is required for specific user deletion'
          }, { status: 400 });
        }
        result = await deleteSpecificUsers(userIds);
        break;
        
      case 'delete_unverified_users':
        result = await deleteUnverifiedUsers();
        break;
        
      case 'count_users':
        result = await countUsers();
        break;
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: delete_all_users, delete_specific_users, delete_unverified_users, or count_users'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function deleteAllUsers() {
  console.log('Starting complete database cleanup...');
  
  // First delete biometric appointments (foreign key dependency)
  const { data: appointmentsDeleted, error: appointmentError } = await supabaseAdmin
    .from('biometric_appointments')
    .delete()
    .neq('id', 0); // Delete all records
  
  if (appointmentError) {
    throw new Error(`Failed to delete appointments: ${appointmentError.message}`);
  }
  
  // Delete all users
  const { data: usersDeleted, error: userError } = await supabaseAdmin
    .from('users')
    .delete()
    .neq('id', 0); // Delete all records
  
  if (userError) {
    throw new Error(`Failed to delete users: ${userError.message}`);
  }

  // Reset sequences if needed
  try {
    await supabaseAdmin.rpc('reset_user_sequences');
  } catch (seqError) {
    console.log('Sequence reset not available or failed (non-critical)');
  }

  return {
    message: 'All users and related data deleted successfully',
    appointmentsDeleted: appointmentsDeleted?.length || 0,
    usersDeleted: usersDeleted?.length || 0
  };
}

async function deleteSpecificUsers(userIds: string[]) {
  console.log('Deleting specific users:', userIds);
  
  // First delete their appointments
  const { data: appointmentsDeleted, error: appointmentError } = await supabaseAdmin
    .from('biometric_appointments')
    .delete()
    .in('user_uid', userIds);
  
  if (appointmentError) {
    throw new Error(`Failed to delete appointments: ${appointmentError.message}`);
  }
  
  // Delete the users
  const { data: usersDeleted, error: userError } = await supabaseAdmin
    .from('users')
    .delete()
    .in('uid', userIds);
  
  if (userError) {
    throw new Error(`Failed to delete users: ${userError.message}`);
  }

  return {
    message: `Successfully deleted ${userIds.length} users`,
    userIds: userIds,
    appointmentsDeleted: appointmentsDeleted?.length || 0,
    usersDeleted: usersDeleted?.length || 0
  };
}

async function deleteUnverifiedUsers() {
  console.log('Deleting unverified users...');
  
  // First get unverified user UIDs
  const { data: unverifiedUsers, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('uid')
    .eq('isVerified', false);
  
  if (fetchError) {
    throw new Error(`Failed to fetch unverified users: ${fetchError.message}`);
  }
  
  if (!unverifiedUsers || unverifiedUsers.length === 0) {
    return {
      message: 'No unverified users found',
      usersDeleted: 0,
      appointmentsDeleted: 0
    };
  }
  
  const unverifiedUids = unverifiedUsers.map(user => user.uid);
  
  // Delete their appointments first
  const { data: appointmentsDeleted, error: appointmentError } = await supabaseAdmin
    .from('biometric_appointments')
    .delete()
    .in('user_uid', unverifiedUids);
  
  if (appointmentError) {
    throw new Error(`Failed to delete appointments: ${appointmentError.message}`);
  }
  
  // Delete unverified users
  const { data: usersDeleted, error: userError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('isVerified', false);
  
  if (userError) {
    throw new Error(`Failed to delete unverified users: ${userError.message}`);
  }

  return {
    message: `Successfully deleted ${unverifiedUsers.length} unverified users`,
    usersDeleted: usersDeleted?.length || 0,
    appointmentsDeleted: appointmentsDeleted?.length || 0
  };
}

async function countUsers() {
  // Count all users
  const { count: totalUsers, error: totalError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });
    
  if (totalError) {
    throw new Error(`Failed to count users: ${totalError.message}`);
  }
  
  // Count verified users
  const { count: verifiedUsers, error: verifiedError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('isVerified', true);
    
  if (verifiedError) {
    throw new Error(`Failed to count verified users: ${verifiedError.message}`);
  }
  
  // Count appointments
  const { count: totalAppointments, error: appointmentError } = await supabaseAdmin
    .from('biometric_appointments')
    .select('*', { count: 'exact', head: true });
    
  if (appointmentError) {
    throw new Error(`Failed to count appointments: ${appointmentError.message}`);
  }

  return {
    totalUsers: totalUsers || 0,
    verifiedUsers: verifiedUsers || 0,
    unverifiedUsers: (totalUsers || 0) - (verifiedUsers || 0),
    totalAppointments: totalAppointments || 0
  };
}

// GET endpoint to check user counts without deleting
export async function GET(request: NextRequest) {
  try {
    const result = await countUsers();
    
    return NextResponse.json({
      success: true,
      counts: result
    });
  } catch (error) {
    console.error('User count error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to count users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}