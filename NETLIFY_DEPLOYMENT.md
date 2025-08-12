# Netlify Deployment Guide for SevisPass

## Prerequisites

1. **Supabase Project Setup**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL script from `supabase-setup.sql` in your Supabase SQL Editor
   - Note down your project URL and API keys

## Environment Variables Setup

### Step 1: Gather Required Variables

From your Supabase project dashboard (Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-starting-with-eyJ"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-starting-with-eyJ"
JWT_SECRET="your-super-secret-jwt-key-here-change-in-production"
NODE_ENV="production"
```

### Step 2: Configure Netlify Environment Variables

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Replace with your Supabase project URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Your Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Your Supabase service role key (keep private!) |
| `JWT_SECRET` | `your-secret-key` | Generate a secure random string |
| `NODE_ENV` | `production` | Set to production for deployed environment |

### Step 3: Verify Build Settings

Make sure your `netlify.toml` has the correct configuration:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Common Issues and Solutions

### Issue 1: "Missing Supabase environment variables" during build

**Solution:** The application now handles missing environment variables gracefully during build time. However, you still need to set them in Netlify for runtime functionality.

### Issue 2: Build fails with module errors

**Solution:** Clear Netlify's build cache:
1. Go to Site settings → Build & deploy → Environment variables
2. Add `NPM_FLAGS` with value `--legacy-peer-deps` if needed
3. Trigger a new build

### Issue 3: Database connection errors at runtime

**Solution:** 
1. Verify all environment variables are correctly set in Netlify
2. Check that your Supabase project is active and not paused
3. Ensure the database schema is properly set up using `supabase-setup.sql`

## Testing Your Deployment

1. **Check Environment Variables**
   - Visit your deployed site
   - Open browser console
   - Any missing environment variables will be logged as warnings

2. **Test Registration Flow**
   - Try creating a new user account
   - Verify step 1 validation works (duplicate checking)
   - Test the complete registration process

3. **Test Login**
   - Use credentials from a successfully registered account
   - Verify authentication works correctly

## Security Notes

- Never commit the `.env` file to your repository
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secure - it has admin privileges
- Use Row Level Security (RLS) policies in Supabase for additional protection
- Regularly rotate your JWT_SECRET in production

## Support

If you encounter issues during deployment:

1. Check the Netlify deploy logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase database schema is up to date
4. Test the application locally with the same environment variables

## Files to Check

- `src/lib/supabase.ts` - Supabase configuration
- `.env.example` - Template for required environment variables
- `supabase-setup.sql` - Database schema setup
- `netlify.toml` - Netlify build configuration