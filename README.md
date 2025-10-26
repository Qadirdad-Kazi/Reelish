# Reelish Social Media Platform

A modern social media platform similar to TikTok, built with React, Express, and PostgreSQL.

## Project Structure

- `/client` - React frontend application (Vite + React + TypeScript)
- `/server` - Express backend API (Node.js + TypeScript)

## Features

- 🔐 User authentication and profiles
- 📹 Video upload and streaming
- 💬 Comments, likes, and shares
- #️⃣ Hashtag discovery
- 📨 Real-time messaging system
- 🔔 Notifications
- 👥 Follow/unfollow users
- ⭐ Favorites and liked videos
- 🔍 Search functionality
- 📱 Responsive design

## Getting Started (Development)

### Prerequisites

- Node.js 20 or later
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to server directory:
```bash
cd server
npm install
```

2. Set up environment variables:
Create a `.env` file in the server directory with:
```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secret-key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Get Cloudinary credentials** (free tier - 25GB storage):
- Sign up at [cloudinary.com](https://cloudinary.com)
- Go to Dashboard → Copy Cloud Name, API Key, and API Secret
- Paste them into your `.env` file

3. Run database migrations:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
npm install
```

2. Create `.env` file (optional):
```env
VITE_API_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

The client will start on http://localhost:5173

## Deployment

This project is configured for deployment with:
- **Frontend**: Netlify
- **Backend**: Vercel

📚 **Deployment Guides**:
- [Complete Deployment Guide](./DEPLOYMENT.md) - Detailed step-by-step instructions
- [Quick Checklist](./DEPLOYMENT-CHECKLIST.md) - Quick reference for deployment

### Quick Deploy

1. **Backend to Vercel**:
```bash
cd server
vercel --prod
```

2. **Frontend to Netlify**:
```bash
cd client
netlify deploy --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions and environment variables.

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- Wouter (routing)
- Radix UI components
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- Express Session
- Multer (file uploads)
- WebSocket (ws)

## Scripts

### Server
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For deployment issues or questions, check:
- [Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)
- Open an issue on GitHub
