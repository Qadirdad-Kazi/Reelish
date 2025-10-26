# Quick Deployment Checklist

## ☑️ Pre-Deployment

- [ ] Create PostgreSQL database (Neon/Supabase/Railway)
- [ ] Get DATABASE_URL connection string
- [ ] Generate SESSION_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Sign up for Vercel account
- [ ] Sign up for Netlify account

## ☑️ Backend (Vercel)

### Setup
- [ ] Connect GitHub repo to Vercel (or use Vercel CLI)
- [ ] Configure environment variables in Vercel dashboard:
  ```
  DATABASE_URL=postgresql://...
  SESSION_SECRET=your-generated-secret
  NODE_ENV=production
  FRONTEND_URL=https://your-app.netlify.app
  ```
- [ ] Deploy backend
- [ ] Note your backend URL: `https://your-backend.vercel.app`

### Database
- [ ] Run migrations: `cd server && npm run db:push`

### Verify
- [ ] Test API: `curl https://your-backend.vercel.app/api/status`
- [ ] Should return: `{"status":"ok",...}`

## ☑️ Frontend (Netlify)

### Configuration
- [ ] Update `client/netlify.toml` with your backend URL
- [ ] Update `client/_redirects` with your backend URL
- [ ] Create `client/.env.production`:
  ```
  VITE_API_URL=https://your-backend.vercel.app
  ```

### Deploy
- [ ] Connect GitHub repo to Netlify (or use Netlify CLI)
- [ ] Set build settings:
  - Base directory: `client`
  - Build command: `npm run build`
  - Publish directory: `client/dist`
- [ ] Add environment variable:
  ```
  VITE_API_URL=https://your-backend.vercel.app
  ```
- [ ] Deploy frontend
- [ ] Note your frontend URL: `https://your-app.netlify.app`

### Update Backend CORS
- [ ] Update `FRONTEND_URL` in Vercel to your Netlify URL
- [ ] Redeploy backend or wait for next deployment

## ☑️ Testing

- [ ] Visit your Netlify URL
- [ ] Open browser DevTools (Console & Network tabs)
- [ ] Register a new test user
- [ ] Login with test user
- [ ] Try uploading a video (note: local storage limitations)
- [ ] Check for CORS errors in console
- [ ] Verify cookies are being set
- [ ] Test video playback

## ☑️ Post-Deployment

- [ ] Set up custom domain (optional)
- [ ] Configure SSL certificates (auto with Netlify/Vercel)
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Configure analytics
- [ ] Set up backup strategy for database
- [ ] Document your production URLs

## 🚨 Known Limitations

⚠️ **File Storage**: Videos/images stored locally on Vercel won't persist. For production:
- Implement AWS S3, Cloudinary, or Vercel Blob storage

⚠️ **Sessions**: Memory-based sessions don't work well with serverless. Consider:
- Database-backed sessions (connect-pg-simple)
- JWT authentication

⚠️ **WebSockets**: Limited support on Vercel
- Use Vercel Edge Runtime or separate WebSocket service

## 📝 URLs to Save

```
Backend URL: https://_____________________.vercel.app
Frontend URL: https://_____________________.netlify.app
Database URL: postgresql://_____________________
Admin Panel: (if applicable)
```

## 🆘 Quick Fixes

### CORS Error
```bash
# Update Vercel environment variable
vercel env add FRONTEND_URL production
# Enter: https://your-app.netlify.app
vercel --prod
```

### Build Failed
```bash
# Test build locally first
cd client && npm run build
cd ../server && npm run build
```

### Can't Connect to Database
```bash
# Test connection
psql $DATABASE_URL
# or
node -e "const pg = require('pg'); const client = new pg.Client(process.env.DATABASE_URL); client.connect().then(() => console.log('✓ Connected')).catch(console.error)"
```

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

