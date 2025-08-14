import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get a sample user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('uid, email, "firstName", "lastName"')
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'No users found',
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get user'
    }, { status: 500 });
  }
}