import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "../server/routes.js";

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Add a simple root route
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

// Initialize routes
let routesInitialized = false;

const initializeRoutes = async () => {
  if (!routesInitialized) {
    await registerRoutes(app);
    routesInitialized = true;
    console.log('✅ Routes initialized');
  }
};

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
  
  console.error('Error:', err);
});

// Export for Vercel serverless
export default async (req: Request, res: Response) => {
  await initializeRoutes();
  return app(req, res);
};

