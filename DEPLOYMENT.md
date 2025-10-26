# Reelish Deployment Guide

This guide will help you deploy the Reelish application with the frontend on Netlify and the backend on Vercel.

## Prerequisites

- Node.js 20 or later
- PostgreSQL database (e.g., Neon, Supabase, or Railway)
- Netlify account
- Vercel account

## Important Notes Before Deployment

### Backend Considerations

The current backend implementation has some limitations for serverless deployment on Vercel:

1. **File Storage**: The backend uses local file storage (`/uploads` directory) for videos and images. For production:
   - Consider using cloud storage (AWS S3, Cloudinary, or Vercel Blob)
   - Current setup will work but files won't persist across serverless function invocations
   
2. **Session Management**: Using `memorystore` for sessions won't persist in serverless. Consider:
   - Using a database-backed session store (e.g., `connect-pg-simple`)
   - Implementing JWT-based authentication instead
   
3. **WebSocket Support**: The backend uses WebSocket (`ws`) which has limited support on Vercel
   - Consider using Vercel's Edge Runtime or a separate WebSocket service

## Part 1: Backend Deployment (Vercel)

### Step 1: Prepare Your Database

1. Create a PostgreSQL database (recommended providers):
   - [Neon](https://neon.tech) - Serverless PostgreSQL
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)

2. Get your database connection string (DATABASE_URL)

### Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=generate_a_random_secret_string
NODE_ENV=production
FRONTEND_URL=https://your-app.netlify.app
```

To generate a secure SESSION_SECRET, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Via GitHub Integration
1. Push your code to GitHub
2. Import the repository in Vercel dashboard
3. Vercel will auto-detect the configuration from `vercel.json`
4. Add environment variables in Vercel dashboard
5. Deploy!

### Step 4: Run Database Migrations

After deployment, you need to set up your database schema:

```bash
# From the server directory
cd server
npm run db:push
```

Or use Vercel CLI:
```bash
vercel env pull
npm run db:push
```

### Step 5: Note Your Backend URL

After deployment, note your backend URL (e.g., `https://your-app.vercel.app`). You'll need this for the frontend configuration.

## Part 2: Frontend Deployment (Netlify)

### Step 1: Update Configuration Files

1. Update `client/netlify.toml` - Replace the backend URL:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-actual-backend.vercel.app/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/uploads/*"
  to = "https://your-actual-backend.vercel.app/uploads/:splat"
  status = 200
  force = true
```

2. Update `client/_redirects` with the same URLs

3. Create `client/.env.production`:
```
VITE_API_URL=https://your-actual-backend.vercel.app
```

### Step 2: Build Locally to Test (Optional)

```bash
cd client
npm install
npm run build
```

### Step 3: Deploy to Netlify

#### Option A: Via Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Deploy
cd client
netlify deploy --prod
```

#### Option B: Via Netlify Dashboard
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
5. Add environment variables:
   - `VITE_API_URL`: Your Vercel backend URL
6. Deploy!

#### Option C: Drag and Drop
```bash
cd client
npm run build
# Drag the 'dist' folder to Netlify dashboard
```

### Step 4: Update Backend CORS Settings

Update the `FRONTEND_URL` environment variable in Vercel with your Netlify URL:
```
FRONTEND_URL=https://your-actual-app.netlify.app
```

Then redeploy the backend or the changes will take effect on next deployment.

## Part 3: Testing Your Deployment

1. Visit your Netlify URL
2. Try registering a new user
3. Try uploading a video
4. Check browser console for any CORS errors
5. Verify all API requests are going to your Vercel backend

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` is set correctly in Vercel
- Check that frontend is making requests to the correct backend URL
- Ensure cookies are enabled (required for sessions)

### Session/Authentication Issues
- Make sure `SESSION_SECRET` is set in Vercel
- Verify cookies are being set with correct domain
- Check that `secure: true` is set for production cookies

### File Upload Issues
- Current implementation stores files locally, which won't persist on Vercel
- For production, implement cloud storage (see recommendations above)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure your database allows connections from Vercel's IP ranges
- Check that database migrations have been run

### Build Errors on Netlify
- Ensure all dependencies are in `package.json`
- Check Node version compatibility
- Review build logs in Netlify dashboard

### API Routes Not Working
- Verify `_redirects` file is in the built output
- Check Netlify function logs
- Ensure backend is deployed and accessible

## Recommended Improvements for Production

1. **Implement Cloud Storage**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   # or
   npm install cloudinary
   # or
   npm install @vercel/blob
   ```

2. **Use Database-Backed Sessions**
   ```bash
   npm install connect-pg-simple
   ```

3. **Add Environment-Based Configuration**
   - Create separate env files for dev/staging/production
   - Use environment variables for all external service URLs

4. **Set Up Monitoring**
   - Add error tracking (Sentry, LogRocket)
   - Set up uptime monitoring
   - Configure analytics

5. **Implement CDN for Static Assets**
   - Use Cloudflare for additional caching
   - Optimize images and videos

6. **Add Rate Limiting**
   - Protect API endpoints from abuse
   - Implement request throttling

## Support

If you encounter issues:
1. Check the logs in Vercel and Netlify dashboards
2. Verify all environment variables are set correctly
3. Test API endpoints directly using Postman or curl
4. Check browser console for client-side errors

## Development vs Production

### Development
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Production
- Backend: Deployed on Vercel (serverless)
- Frontend: Deployed on Netlify (static + CDN)
- Database: Hosted PostgreSQL instance

---

**Note**: This is a basic deployment setup. For a production-grade application, consider implementing the recommended improvements listed above.

