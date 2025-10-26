import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "../server/routes.js";

const app = express();

// Trust Vercel proxy for secure cookies
app.set('trust proxy', 1);

// CORS configuration - must match EXACTLY
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://reeliah.netlify.app', // Your Netlify domain
      'http://localhost:5173', // Local development
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize routes using top-level await
await registerRoutes(app);
console.log('✅ Routes initialized');

// Add a simple root route AFTER other routes
app.get('/', (req, res) => {
  res.json({
    name: 'Reelish API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      status: '/api/status',
      auth: '/api/auth/*',
      videos: '/api/videos',
      users: '/api/users'
    }
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
  
  console.error('Error:', err);
});

// Export the Express app directly for Vercel
export default app;

