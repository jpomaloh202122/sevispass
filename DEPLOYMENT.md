# SevisPass Deployment Guide

## Netlify Deployment with Supabase

### Prerequisites

1. **Supabase Project**: Create a Supabase project for your database
2. **GitHub Repository**: Code must be in GitHub for Netlify deployment

### Supabase Setup:

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for project initialization

2. **Get API Keys**:
   - Go to Settings → API
   - Copy your Project URL
   - Copy your anon (public) key  
   - Copy your service_role key

3. **Create Database Table**:
   - Go to SQL Editor in Supabase dashboard
   - Run the SQL script from `supabase-setup.sql`

### Netlify Deployment Steps:

1. **Set Environment Variables in Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to Site Settings > Environment variables
   - Add the following variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
     SUPABASE_ANON_KEY=your-anon-key-starting-with-eyJ
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-starting-with-eyJ
     JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
     ```

2. **Deploy**:
   - Push your changes to GitHub
   - Netlify will automatically redeploy

### Database Management:

- **View Data**: Use Supabase dashboard → Table Editor
- **Run Queries**: Use Supabase dashboard → SQL Editor
- **Monitor Usage**: Check Supabase dashboard → Settings → Usage

### Troubleshooting:

- If you see "Database connection error", check your Supabase environment variables
- Ensure service_role key is set correctly (not the anon key)
- Verify the users table was created with the SQL script
- Check Netlify function logs for detailed error messages

### No Prisma Required:

This application uses Supabase JavaScript client directly, so no database migrations or Prisma setup is needed.