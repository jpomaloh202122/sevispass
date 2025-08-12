# Fix Database Connection Error - Step by Step

## Current Status: "Database connection error" showing on login page

## Step 1: Get Your Service Role Key
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project: `lmmqysporddybvvttmip`
3. Go to **Settings** → **API**
4. Copy the **"service_role"** key (NOT the anon key)
   - It should be very long and start with `eyJ`
   - It should end with a long string of characters

## Step 2: Update Your .env File
1. Open your `.env` file
2. Replace `[PLEASE_UPDATE_WITH_ACTUAL_SERVICE_ROLE_KEY]` with your actual service role key:
   ```
   SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key-here"
   ```

## Step 3: Create the Users Table
1. Go to your Supabase dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Copy and paste ALL the contents from `supabase-setup.sql` file
5. Click **"Run"** to execute the SQL

## Step 4: Test the Connection
Run this command in your terminal:
```bash
node test-supabase-basic.js
```

## Step 5: If Still Having Issues
Check the browser console (F12) for detailed error messages and let me know what it says.

---

## What Each File Does:
- `.env` - Contains your database credentials
- `supabase-setup.sql` - Creates the users table in your database
- `src/lib/supabase.ts` - Connects your app to Supabase
- `src/lib/db.ts` - Database operations using Supabase API

## Expected Success Messages:
✅ Environment Variables: Set
✅ Connection successful!
✅ Users table exists