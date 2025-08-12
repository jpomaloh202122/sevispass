import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// For client-side operations (public)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations (with service role permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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