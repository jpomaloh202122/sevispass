# SevisPass Deployment Guide

## Netlify Deployment

### Prerequisites

1. **Database Setup**: Since Netlify Functions are serverless, you need a cloud database for production.

### Recommended Database Options:

1. **Neon (PostgreSQL)** - Free tier available
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **PlanetScale (MySQL)** - Free tier available
   - Go to [planetscale.com](https://planetscale.com)
   - Create a new database
   - Copy the connection string

3. **Supabase (PostgreSQL)** - Free tier available
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the connection string from Settings > Database

### Deployment Steps:

1. **Set Environment Variables in Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to Site Settings > Environment variables
   - Add the following variables:
     ```
     DATABASE_URL=your-database-connection-string
     JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
     ```

2. **Update Prisma Schema** (if using PostgreSQL):
   - Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`

3. **Deploy**:
   - Push your changes to GitHub
   - Netlify will automatically redeploy

### Database Migration:

For PostgreSQL databases, you may need to push the schema:
```bash
npx prisma db push
```

### Troubleshooting:

- If you see "Database connection error", check your `DATABASE_URL` environment variable
- For PostgreSQL, ensure the connection string includes `?sslmode=require`
- Check Netlify function logs for detailed error messages