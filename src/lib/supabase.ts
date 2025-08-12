import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// During build time on Netlify, we allow missing env vars and provide defaults
// Runtime checks will handle missing variables appropriately
const isBuildTime = process.env.NETLIFY === 'true' || process.env.CI === 'true' || process.env.BUILD_ID

if (!isBuildTime && (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey)) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

// Use fallback values during build time to prevent build failures
// Note: These are non-functional placeholder values for build-time only
const fallbackUrl = 'https://build-placeholder.supabase.co'
const fallbackKey = 'build-time-placeholder-key-not-functional'

// For client-side operations (public)
export const supabase = createClient(
  supabaseUrl || fallbackUrl, 
  supabaseAnonKey || fallbackKey
)

// For server-side operations (with service role permissions)
export const supabaseAdmin = createClient(
  supabaseUrl || fallbackUrl, 
  supabaseServiceKey || fallbackKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to validate environment variables at runtime
export function validateSupabaseConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          uid: string
          firstName: string
          lastName: string
          email: string
          nid: string
          phoneNumber: string
          password: string
          address?: string
          nidPhotoPath?: string
          facePhotoPath?: string
          profileImagePath?: string
          isVerified: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          uid: string
          firstName: string
          lastName: string
          email: string
          nid: string
          phoneNumber: string
          password: string
          address?: string
          nidPhotoPath?: string
          facePhotoPath?: string
          profileImagePath?: string
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          uid?: string
          firstName?: string
          lastName?: string
          email?: string
          nid?: string
          phoneNumber?: string
          password?: string
          address?: string
          nidPhotoPath?: string
          facePhotoPath?: string
          profileImagePath?: string
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}