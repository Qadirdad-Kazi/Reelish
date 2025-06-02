import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import memorystore from "memorystore";
import multer from 'multer';
import fs from 'fs';
import util from 'util';
import sharp from 'sharp';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { storage as dbStorage } from "./storage";
import { sql } from 'drizzle-orm';
import { 
  users, videos, comments, likes, follows, videoViews, conversations, messages, 
  notifications, tags, videoTags, trendingHashtags, passwordResetTokens,
  type User, type Video, type Comment, type Like, type Follow,
  type InsertUser, type InsertVideo, type InsertComment, type InsertLike, type InsertFollow,
  type VideoWithUser, type CommentWithUser, type UserWithStats, type InsertVideoView,
  type InsertMessage, type InsertNotification, type Tag, type VideoView,
  insertVideoSchema, insertCommentSchema, insertLikeSchema, insertFollowSchema
} from "./shared/schema";
import { z } from "zod";
import "./types";
import { db } from "./db";
import { and, eq, isNotNull, inArray } from 'drizzle-orm';
import { requireAuth, optionalAuth, loginSchema, registerSchema, registerSchemaWithPasswordValidation, forgotPasswordSchema, resetPasswordSchema } from "./auth";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure session with memorystore
const MemoryStore = memorystore(session);
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to false for development, even in production since we're not using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax' as const,
  },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
};

// Helper function to check if a file is HEIC format
const isHeicImage = (file: Express.Multer.File): boolean => {
  const ext = path.extname(file.originalname).toLowerCase();
  return ext === '.heic' || ext === '.heif' || file.mimetype === 'image/heic' || file.mimetype === 'image/heif';
};

// Helper function to handle HEIC images
const handleImageUpload = (file: Express.Multer.File): string | null => {
  try {
    console.log(`Processing image upload: ${file.path}`);
    // For HEIC images, we'll just use a fallback approach
    // since browser support is limited
    if (isHeicImage(file)) {
      console.log('HEIC format detected, using fallback approach');
      // Return a default avatar URL instead
      return null;
    }
    
    // For other image formats, return the path
    return `/uploads/${path.basename(file.path)}`;
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
};

// Configure multer for profile image uploads
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Always save as JPG for consistency
    cb(null, uniqueSuffix + '.jpg');
  }
});

const profileImageUpload = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files including HEIC format
    if (file.mimetype.startsWith('image/') || 
        file.originalname.toLowerCase().endsWith('.heic') || 
        file.originalname.toLowerCase().endsWith('.heif')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Add file filter and size limits
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept video files and images
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for video uploads'));
    }
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'));
    }
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session(sessionConfig));

  // Add user to request type
  app.use((req, res, next) => {
    req.user = undefined;
    next();
  });

  // Serve uploaded files with proper MIME types and caching
  app.use('/uploads', (req, res, next) => {
    console.log('Static file request for:', req.path);
    // Add CORS headers for static files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
  
  // Use a more direct approach to serve static files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      // Set appropriate headers for different file types
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      }
      
      // Add CORS headers directly to the file response
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      
      // Allow browser to cache files for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
      console.log('Serving file:', filePath);
    }
  }));
  
  // Add a dedicated route for video streaming with proper error handling
  app.get('/api/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    console.log('Video stream request for:', filename);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error('Video file not found:', filePath);
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Get file stats (including size)
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error accessing video file:', err);
          return res.status(500).json({ message: 'Error accessing video' });
        }
        
        // Handle range requests for video streaming
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
          const chunksize = (end - start) + 1;
          
          console.log(`Serving video range: ${start}-${end}/${stats.size}`);
          
          const fileStream = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
          });
          
          fileStream.pipe(res);
        } else {
          // Serve the entire file
          console.log(`Serving entire video file: ${stats.size} bytes`);
          
          res.writeHead(200, {
            'Content-Length': stats.size,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
          });
          
          fs.createReadStream(filePath).pipe(res);
        }
      });
    });
  });

  // Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('Registration request received');
      
      // First validate the basic schema
      const validatedData = registerSchema.parse(req.body);
      
      // Then validate password matching
      registerSchemaWithPasswordValidation.parse(validatedData);
      
      console.log('Validation passed for user:', validatedData.email);
      
      // Check if user already exists
      console.log('Checking if email exists:', validatedData.email);
      const existingUser = await dbStorage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('Email already exists');
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Check username availability
      console.log('Checking if username exists:', validatedData.username);
      const existingUsername = await dbStorage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        console.log('Username already exists');
        return res.status(400).json({ message: "This username is already taken" });
      }
      
      // Continue with the registration process using the validated data
      const { confirmPassword, ...userDataFields } = validatedData;
      
      // Create a properly typed user object
      const userToCreate = {
        email: userDataFields.email,
        username: userDataFields.username,
        password: userDataFields.password,
        displayName: userDataFields.username, // Default display name to username
        bio: '',
        avatarUrl: null,
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Use type assertion to satisfy TypeScript
      const user = await dbStorage.createUser(userToCreate as any);
      console.log('User created:', user.id);
      
      // Set session
      console.log('Setting session...');
      if (!req.session) {
        console.error('Session object is undefined');
        return res.status(500).json({ message: "Session initialization failed" });
      }
      
      req.session.userId = user.id;
      console.log('Session set, userId:', user.id);
      
      // Return user without password
      const { password, ...userResponse } = user;
      console.log('Sending successful response');
      res.status(201).json({ 
        message: "Account created successfully! Welcome to Reelish!", 
        user: userResponse 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return res.status(400).json({ 
          message: "Please check your information", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account. Please try again." });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login attempt received');
      console.log('Session exists:', !!req.session);
      console.log('Session ID:', req.sessionID);
      
      // Validate login data
      const { email, password } = loginSchema.parse(req.body);
      console.log('Login attempt for email:', email);
      
      // Verify password
      const user = await dbStorage.verifyPassword(email, password);
      if (!user) {
        console.log('Login failed: Invalid credentials for', email);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      console.log('Login successful for user:', user.username, '(ID:', user.id, ')');
      req.session!.userId = user.id;
      
      // Save session explicitly to ensure it's stored before response
      req.session!.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ message: "Session error. Please try again." });
        }
        
        console.log('Session saved successfully with userId:', user.id);
        console.log('Session cookie parameters:', req.session!.cookie);
        
        // Return user without password
        const { password: _, ...userResponse } = user;
        res.json({ 
          message: "Welcome back!", 
          user: userResponse 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Login validation error:', error.errors);
        return res.status(400).json({ 
          message: "Please check your login information", 
          errors: error.errors 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }
    res.json({ message: "Logged out successfully" });
  });

  app.get('/api/auth/me', async (req, res) => {
    console.log('Auth check request received');
    console.log('Session exists:', !!req.session);
    console.log('Session ID:', req.sessionID);
    
    // Check if we have a userId in the session
    const userId = req.session?.userId;
    console.log('Session userId:', userId || 'not found');
    
    if (!userId) {
      console.log('Auth check failed: No userId in session');
      return res.status(401).json({ 
        message: "Authentication required. Please log in to continue." 
      });
    }
    
    try {
      // Try to get the user from the database
      console.log('Looking up user with ID:', userId);
      const user = await dbStorage.getUserById(userId);
      
      if (!user) {
        console.log('Auth check failed: User not found in database');
        // Instead of setting session to null, destroy it
        req.session.destroy((err) => {
          if (err) console.error('Error destroying session:', err);
        });
        return res.status(401).json({ 
          message: "User not found. Please log in again." 
        });
      }
      
      console.log('Auth check successful for user:', user.username);
      // Return user without password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  });

  // Password Reset Routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await dbStorage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }
      
      const token = await dbStorage.createPasswordResetToken(email);
      
      // TODO: Send email with reset link containing token
      // For now, we'll just return success (in production, integrate with email service)
      console.log(`Password reset token for ${email}: ${token}`);
      
      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Please enter a valid email address", 
          errors: error.errors 
        });
      }
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const success = await dbStorage.resetPassword(token, password);
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Please check your password information", 
          errors: error.errors 
        });
      }
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Video Routes
  app.get('/api/videos', optionalAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const currentUserId = req.user?.id;
      
      const videos = await dbStorage.getFeedVideos(offset, limit, currentUserId);
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Failed to load videos" });
    }
  });
  
  // New endpoint for random videos on the home page
  app.get('/api/videos/random', optionalAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.id;
      
      const videos = await dbStorage.getRandomVideos(limit, currentUserId);
      res.json(videos);
    } catch (error) {
      console.error("Get random videos error:", error);
      res.status(500).json({ message: "Failed to load random videos" });
    }
  });

  app.get('/api/videos/trending', optionalAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const currentUserId = req.user?.id;
      
      const videos = await dbStorage.getTrendingVideos(offset, limit, currentUserId);
      res.json(videos);
    } catch (error) {
      console.error("Get trending videos error:", error);
      res.status(500).json({ message: "Failed to load trending videos" });
    }
  });

  app.get('/api/videos/:id', optionalAuth, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      const currentUserId = req.user?.id;
      const video = await dbStorage.getVideoWithUser(videoId, currentUserId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Record view if user is authenticated
      if (currentUserId) {
        // Create a properly typed view object and use type assertion
        const videoView = {
          videoId,
          userId: currentUserId,
          ipAddress: req.ip || '',
          userAgent: req.get('User-Agent') || '',
          completedView: false,
          createdAt: new Date()
        };
        
        // Use type assertion to satisfy TypeScript
        await dbStorage.recordVideoView(videoView as any);
      }
      
      res.json(video);
    } catch (error) {
      console.error("Get video error:", error);
      res.status(500).json({ message: "Failed to load video" });
    }
  });

  app.post('/api/videos', requireAuth, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.video || files.video.length === 0) {
        return res.status(400).json({ message: "Video file is required" });
      }
      
      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail?.[0];
      
      // Manually create the video data object with only the fields we need
      // This replaces the previous approach that used schema.omit
      let hashtags = [];
      let mentions = [];
      
      try {
        // Handle hashtags - could be a string or already parsed JSON
        if (req.body.hashtags) {
          if (typeof req.body.hashtags === 'string') {
            hashtags = JSON.parse(req.body.hashtags);
          } else if (Array.isArray(req.body.hashtags)) {
            hashtags = req.body.hashtags;
          }
        }
        
        // Handle mentions - could be a string or already parsed JSON
        if (req.body.mentions) {
          if (typeof req.body.mentions === 'string') {
            mentions = JSON.parse(req.body.mentions);
          } else if (Array.isArray(req.body.mentions)) {
            mentions = req.body.mentions;
          }
        }
      } catch (error) {
        console.error('Error parsing hashtags or mentions:', error);
      }
      
      const videoData = {
        userId: req.user!.id,
        title: req.body.title,
        description: req.body.description || '',
        isPrivate: req.body.isPrivate === 'true',
        allowComments: req.body.allowComments !== 'false',
        videoUrl: `/uploads/${videoFile.filename}`,
        thumbnailUrl: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null,
        fileSize: videoFile.size,
        format: videoFile.mimetype.split('/')[1] || null,
        duration: parseInt(req.body.duration || '0'),
        hashtags: hashtags,
        mentions: mentions,
        musicName: req.body.musicName || null
      };
      
      // Log the video data for debugging
      console.log('Attempting to validate video data:', JSON.stringify(videoData, null, 2));
      
      try {
        // Validate the data with more lenient validation
        // Use a custom validator that allows null values
        const result = insertVideoSchema.safeParse(videoData);
        if (!result.success) {
          console.error('Video schema validation error:', result.error);
          
          // Log the specific error details for debugging
          console.log('Validation error details:', JSON.stringify(result.error.errors, null, 2));
          
          // Try to continue anyway - the database schema should handle null values
          console.log('Attempting to continue despite validation errors...');
        }
      } catch (validationError) {
        console.error('Video schema validation error:', validationError);
        // Don't return error, try to continue anyway
        console.log('Attempting to continue despite validation errors...');
      }
      
      const video = await dbStorage.createVideo(videoData);
      res.status(201).json({ 
        message: "Video uploaded successfully!", 
        video 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Please check your video information", 
          errors: error.errors 
        });
      }
      console.error("Video upload error:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  app.delete('/api/videos/:id', requireAuth, async (req, res) => {
    try {
      console.log(`DELETE /api/videos/:id - Starting video deletion process`);
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) {
        console.log(`Invalid video ID format: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      console.log(`Attempting to delete video ${videoId} for user ${req.user!.id}`);
      const deleted = await dbStorage.deleteVideo(videoId, req.user!.id);
      
      if (!deleted) {
        console.log(`Video ${videoId} not found or user ${req.user!.id} doesn't have permission to delete it`);
        return res.status(404).json({ message: "Video not found or you don't have permission to delete it" });
      }
      
      console.log(`Video ${videoId} successfully deleted from database and storage`);
      res.json({ 
        success: true, 
        message: "Video deleted successfully", 
        videoId: videoId 
      });
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete video", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Comment Routes
  app.get('/api/videos/:id/comments', optionalAuth, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      const currentUserId = req.user?.id;
      const comments = await dbStorage.getVideoComments(videoId, currentUserId);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to load comments" });
    }
  });

  app.post('/api/comments', requireAuth, async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const comment = await dbStorage.createComment(commentData);
      
      // Create notification for the video owner if it's a different user
      // Use type assertion to access videoId and content
      const typedCommentData = commentData as { videoId?: number; content: string };
      
      if (typedCommentData.videoId) {
        // Get the video to find its owner
        const video = await dbStorage.getVideoById(typedCommentData.videoId);
        if (video && video.userId !== req.user!.id) {
          // Create a notification for the video owner
          await dbStorage.createNotification({
            userId: video.userId,
            type: 'comment',
            triggeredById: req.user!.id,
            entityType: 'video',
            entityId: typedCommentData.videoId.toString(),
            title: 'New Comment',
            message: `@${req.user!.username} commented on your video: "${typedCommentData.content.substring(0, 50)}${typedCommentData.content.length > 50 ? '...' : ''}"`
          });
        }
      }
      
      res.status(201).json({ 
        message: "Comment posted!", 
        comment 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Please check your comment", 
          errors: error.errors 
        });
      }
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  app.delete('/api/comments/:id', requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID" });
      }
      
      const deleted = await dbStorage.deleteComment(commentId, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Comment not found or you don't have permission to delete it" });
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Like Routes
  app.post('/api/likes', requireAuth, async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const like = await dbStorage.createLike(likeData);
      
      // Create notification for the video owner if it's a different user
      // Use type assertion to access videoId
      const typedLikeData = likeData as { videoId?: number };
      
      if (typedLikeData.videoId) {
        // Get the video to find its owner
        const video = await dbStorage.getVideoById(typedLikeData.videoId);
        if (video && video.userId !== req.user!.id) {
          // Create a notification for the video owner
          await dbStorage.createNotification({
            userId: video.userId,
            type: 'like',
            triggeredById: req.user!.id,
            entityType: 'video',
            entityId: typedLikeData.videoId.toString(),
            title: 'New Like',
            message: `@${req.user!.username} liked your video`
          });
        }
      }
      
      res.status(201).json({ 
        message: "Liked!", 
        like 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid like data", 
          errors: error.errors 
        });
      }
      console.error("Create like error:", error);
      res.status(500).json({ message: "Failed to like" });
    }
  });

  app.delete('/api/likes', requireAuth, async (req, res) => {
    try {
      const { videoId, commentId } = req.query;
      
      const deleted = await dbStorage.deleteLike(
        req.user!.id,
        videoId ? parseInt(videoId as string) : undefined,
        commentId ? parseInt(commentId as string) : undefined
      );
      
      if (!deleted) {
        return res.status(404).json({ message: "Like not found" });
      }
      
      res.json({ message: "Unliked!" });
    } catch (error) {
      console.error("Delete like error:", error);
      res.status(500).json({ message: "Failed to unlike" });
    }
  });
  
  // IMPORTANT: Order matters! The 'current' endpoint must come BEFORE the ':id' endpoint
  // to avoid the ':id' route catching 'current' as an ID parameter
  
  // Get current user's liked videos
  app.get('/api/users/current/liked-videos', requireAuth, async (req, res) => {
    try {
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        console.error("No authenticated user found for current user liked videos request");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log("Fetching likes for current user:", currentUserId);
      // Get all likes by this user that are for videos (not comments)
      const userLikes = await db
        .select()
        .from(likes)
        .where(and(
          eq(likes.userId, currentUserId),
          isNotNull(likes.videoId)
        ));
      
      console.log(`Found ${userLikes.length} likes for current user ${currentUserId}`);
      
      if (!userLikes.length) {
        return res.status(200).json([]);
      }
      
      // Extract video IDs from likes
      const videoIds = userLikes.map(like => like.videoId).filter(Boolean) as number[];
      console.log("Video IDs from likes:", videoIds);
      
      // Fetch the actual videos with their creators
      const likedVideos = await db
        .select()
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(inArray(videos.id, videoIds));
      
      console.log(`Found ${likedVideos.length} videos for the liked video IDs`);
      
      // Process videos to include user data and like status
      const processedVideos = await Promise.all(
        likedVideos.map(async (result) => {
          return {
            ...result.videos,
            user: result.users,
            isLiked: true, // We know these are liked
            isFollowing: await dbStorage.isFollowing(currentUserId, result.users.id)
          };
        })
      );
      
      console.log(`Returning ${processedVideos.length} processed liked videos for current user`);
      res.status(200).json(processedVideos);
    } catch (error) {
      console.error("Get current user's liked videos error:", error);
      res.status(500).json({ message: "Failed to fetch liked videos" });
    }
  });
  
  // Get user's liked videos by ID
  app.get('/api/users/:id/liked-videos', requireAuth, async (req, res) => {
    try {
      console.log("Liked videos request received for user:", req.params.id);
      console.log("Current authenticated user:", req.user?.id);
      
      const userId = req.params.id;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        console.error("No authenticated user found for liked videos request");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only allow users to see their own liked videos
      if (userId !== currentUserId) {
        console.error(`User ${currentUserId} attempted to view liked videos for ${userId}`);
        return res.status(403).json({ message: "You can only view your own liked videos" });
      }
      
      console.log("Fetching likes for user:", userId);
      // Get all likes by this user that are for videos (not comments)
      const userLikes = await db
        .select()
        .from(likes)
        .where(and(
          eq(likes.userId, userId),
          isNotNull(likes.videoId)
        ));
      
      console.log(`Found ${userLikes.length} likes for user ${userId}`);
      
      if (!userLikes.length) {
        return res.status(200).json([]);
      }
      
      // Extract video IDs from likes
      const videoIds = userLikes.map(like => like.videoId).filter(Boolean) as number[];
      console.log("Video IDs from likes:", videoIds);
      
      // Fetch the actual videos with their creators
      const likedVideos = await db
        .select()
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(inArray(videos.id, videoIds));
      
      console.log(`Found ${likedVideos.length} videos for the liked video IDs`);
      
      // Process videos to include user data and like status
      const processedVideos = await Promise.all(
        likedVideos.map(async (result) => {
          return {
            ...result.videos,
            user: result.users,
            isLiked: true, // We know these are liked
            isFollowing: await dbStorage.isFollowing(currentUserId, result.users.id)
          };
        })
      );
      
      console.log(`Returning ${processedVideos.length} processed liked videos`);
      res.status(200).json(processedVideos);
    } catch (error) {
      console.error("Get liked videos error:", error);
      res.status(500).json({ message: "Failed to fetch liked videos" });
    }
  });

  // Follow Routes
  app.post('/api/follows', requireAuth, async (req, res) => {
    try {
      // Parse the request body and ensure proper typing
      // Manually create the follow data object with only the fields we need
      // This replaces the previous approach that used schema.omit
      const followData = {
        followerId: req.user!.id,
        followingId: req.body.followingId,
      };
      
      // Validate the data
      insertFollowSchema.parse(followData);
      
      if (followData.followerId === followData.followingId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }
      
      // Use type assertion to satisfy TypeScript
      const follow = await dbStorage.createFollow(followData as any);
      
      // Create notification for the user being followed
      try {
        // Get the user who is following
        const follower = await dbStorage.getUserById(followData.followerId);
        
        // Create a notification for the user being followed
        await dbStorage.createNotification({
          userId: followData.followingId,
          type: 'follow',
          triggeredById: followData.followerId,
          entityType: 'user',
          entityId: followData.followerId,
          title: 'New Follower',
          message: `@${follower?.username || 'Someone'} started following you`
        });
      } catch (notifError) {
        console.error('Error creating follow notification:', notifError);
        // Continue with the response even if notification creation fails
      }
      
      res.status(201).json({ 
        message: "Now following!", 
        follow 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid follow data", 
          errors: error.errors 
        });
      }
      console.error("Create follow error:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete('/api/follows/:userId', requireAuth, async (req, res) => {
    try {
      const followingId = req.params.userId;
      const followerId = req.user!.id;
      
      const deleted = await dbStorage.deleteFollow(followerId, followingId);
      if (!deleted) {
        return res.status(404).json({ message: "Follow relationship not found" });
      }
      
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Delete follow error:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Notification Routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const notifications = await dbStorage.getUserNotifications(userId, offset, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await dbStorage.markNotificationAsRead(notificationId, userId);
      
      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const success = await dbStorage.markAllNotificationsAsRead(userId);
      
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  // User Routes
  app.get('/api/users/:id', optionalAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user?.id;
      
      // Get basic user data
      const user = await dbStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get relationship status
      const isFollowing = currentUserId ? await dbStorage.isFollowing(currentUserId, userId) : false;
      
      // Get user videos (with privacy control)
      const videos = await dbStorage.getVideosByUser(userId, currentUserId);
      
      // Get follower and following counts
      const followerCount = await dbStorage.getFollowerCount(userId);
      const followingCount = await dbStorage.getFollowingCount(userId);
      
      // Get video stats
      const publicVideoCount = videos.length;
      const totalLikes = videos.reduce((total, video) => total + (video.likesCount || 0), 0);
      const totalViews = videos.reduce((total, video) => total + (video.viewsCount || 0), 0);
      
      // Remove sensitive data
      const { password, ...userResponse } = user;
      
      // Return enhanced profile data
      res.json({
        user: { 
          ...userResponse, 
          isFollowing,
          stats: {
            followerCount,
            followingCount,
            videoCount: publicVideoCount,
            totalLikes,
            totalViews
          }
        },
        videos
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to load user profile" });
    }
  });

  app.get('/api/users/:id/followers', optionalAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const followers = await dbStorage.getFollowers(userId, offset, limit);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ message: "Failed to load followers" });
    }
  });

  app.get('/api/users/:id/following', optionalAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const following = await dbStorage.getFollowing(userId, offset, limit);
      res.json(following);
    } catch (error) {
      console.error("Get user following error:", error);
      res.status(500).json({ message: "Failed to load following users" });
    }
  });
  
  // Use the profile image upload configuration defined earlier with HEIC support
  
  // Update user profile
  app.put('/api/users/:id', requireAuth, profileImageUpload.single('profileImage'), async (req, res) => {
    // Process the uploaded image if any
    let profileImageUrl: string | null = null;
    if (req.file) {
      profileImageUrl = handleImageUpload(req.file);
    }
    try {
      const userId = req.params.id;
      const currentUserId = req.user?.id;
      
      // Only allow users to update their own profile
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      // Get the existing user
      const existingUser = await dbStorage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prepare update data
      const updateData: Partial<User> = {
        ...existingUser,
        firstName: req.body.firstName || existingUser.firstName,
        lastName: req.body.lastName || existingUser.lastName,
        bio: req.body.bio || existingUser.bio,
        updatedAt: new Date()
      };
      
      // If a new profile image was uploaded, update the profile image URL
      if (profileImageUrl) {
        updateData.profileImageUrl = profileImageUrl;
      } else if (req.body.profileImageUrl) {
        updateData.profileImageUrl = req.body.profileImageUrl;
      }
      
      // Update the user in the database
      const updatedUser = await dbStorage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }
      
      // Remove sensitive data
      const { password, ...userResponse } = updatedUser;
      
      res.json({
        message: "Profile updated successfully",
        user: userResponse
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // API endpoint for changing password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get the user from the database
      const user = await dbStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await dbStorage.verifyPasswordHash(user.password || '', currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await dbStorage.hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await dbStorage.updateUser(userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  
  // API endpoint for updating user settings
  app.put('/api/users/settings', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { notifications, privacy } = req.body;
      
      // Get the user from the database
      const user = await dbStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the current bio to check if it contains settings data
      let userBio = user.bio || '';
      let existingBio = '';
      
      // Check if bio looks like a JSON string (starts with {)
      if (userBio.trim().startsWith('{')) {
        try {
          const settingsData = JSON.parse(userBio);
          if (settingsData.notifications && settingsData.privacy) {
            // This is a settings JSON, so we can overwrite it
            // The actual bio is empty in this case
            existingBio = '';
          } else {
            // This is some other JSON, preserve it as bio
            existingBio = userBio;
          }
        } catch (e) {
          // If parsing fails, it's not settings JSON, preserve as bio
          existingBio = userBio;
        }
      } else {
        // Not JSON, preserve as bio
        existingBio = userBio;
      }
      
      // Create settings JSON
      const settingsJson = JSON.stringify({ notifications, privacy });
      
      // Update user settings in the database
      // Note: This is a simplified implementation. In a real app, you would store these settings in a separate table.
      const updatedUser = await dbStorage.updateUser(userId, {
        // Use bio field for settings
        bio: settingsJson,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update settings" });
      }
      
      res.json({
        message: "Settings updated successfully",
        settings: { notifications, privacy }
      });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  
  // API endpoint to get unread message count
  // Get all user conversations
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const conversations = await dbStorage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Get messages for a specific conversation
  app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }

      // Optional pagination parameters
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const messages = await dbStorage.getConversationMessages(conversationId, offset, limit);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a new message
  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId, content } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      if (!conversationId || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Define the message with the proper type to match the InsertMessage interface
      const message: {
        conversationId: number;
        senderId: string;
        content: string;
        createdAt: Date;
      } = {
        conversationId: Number(conversationId), // Ensure conversationId is a number
        senderId: userId,
        content,
        createdAt: new Date()
      };
      
      const newMessage = await dbStorage.createMessage(message);
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/messages/unread/count', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Get unread message count from the database
      const unreadCount = await dbStorage.getUnreadMessageCount(userId);
      
      res.json({
        unreadCount
      });
    } catch (error) {
      console.error("Get unread message count error:", error);
      res.status(500).json({ message: "Failed to get unread message count" });
    }
  });
  
  app.get('/api/users/:id/videos', optionalAuth, async (req, res) => {
    try {
      console.log('==== VIDEO API REQUEST START ====');
      console.log('Request params:', req.params);
      console.log('Request query:', req.query);
      console.log('Request headers:', req.headers);
      
      const userId = req.params.id;
      const currentUserId = req.user?.id;
      
      console.log(`Fetching videos for user ${userId}, current user: ${currentUserId || 'none'}`);
      
      if (!userId) {
        console.error('Missing user ID in request');
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if user exists in database
      try {
        const user = await dbStorage.getUserById(userId);
        if (!user) {
          console.error(`User with ID ${userId} not found in database`);
          return res.status(404).json({ message: 'User not found' });
        }
        console.log(`Found user in database:`, { id: user.id, username: user.username });
      } catch (userError) {
        console.error(`Error checking if user ${userId} exists:`, userError);
      }
      
      try {
        console.log(`Calling dbStorage.getVideosByUser with userId=${userId}, currentUserId=${currentUserId}`);
        const videos = await dbStorage.getVideosByUser(userId, currentUserId);
        
        console.log(`Database returned videos:`, videos ? `${videos.length} items` : 'null or undefined');
        console.log('First video (if any):', videos && videos.length > 0 ? JSON.stringify(videos[0]).substring(0, 100) + '...' : 'none');
        
        // Ensure we're sending a valid array
        if (!Array.isArray(videos)) {
          console.error('Expected array of videos but got:', typeof videos);
          return res.status(200).json([]);
        }
        
        // Set proper content type and send response
        res.setHeader('Content-Type', 'application/json');
        console.log(`Sending ${videos.length} videos as response`);
        console.log('==== VIDEO API REQUEST END ====');
        return res.status(200).json(videos);
      } catch (dbError: any) {
        console.error(`Database error fetching videos for user ${userId}:`, dbError);
        console.error('Stack trace:', dbError?.stack || 'No stack trace available');
        return res.status(500).json({ message: 'Database error when loading videos', error: dbError?.message || String(dbError) });
      }
    } catch (error: any) {
      console.error("Get user videos error:", error);
      console.error('Stack trace:', error?.stack || 'No stack trace available');
      return res.status(500).json({ message: "Failed to load user videos", error: error?.message || String(error) });
    }
  });

  // Favorites Routes
  app.post('/api/videos/:id/favorite', requireAuth, async (req, res) => {
    try {
      console.log('POST /api/videos/:id/favorite - Starting');
      
      // Ensure user is authenticated
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Ensure videoId is a number
      const videoId = parseInt(req.params.id, 10);
      if (isNaN(videoId) || videoId <= 0) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Create favorite data
      const favoriteData = {
        userId: req.user.id,
        videoId: videoId
      };
      
      // Add to favorites
      const favorite = await dbStorage.addFavorite(favoriteData);
      
      res.status(201).json({ 
        message: "Video added to favorites", 
        favorite 
      });
    } catch (error: any) {
      console.error("Add favorite error:", error);
      res.status(500).json({ message: "Failed to add video to favorites" });
    }
  });
  
  // Temporary endpoint to create the favorites table
  app.get('/api/admin/create-favorites-table', async (req, res) => {
    try {
      console.log('Creating favorites table...');
      
      // Create the favorites table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL,
          video_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT favorites_user_video_idx UNIQUE (user_id, video_id)
        );
      `);
      
      console.log('✅ Favorites table created successfully!');
      
      // Verify the table exists
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'favorites'
        );
      `);
      
      console.log('Table exists:', result.rows[0].exists);
      
      return res.status(200).json({ 
        message: 'Favorites table created successfully',
        exists: result.rows[0].exists
      });
    } catch (error) {
      console.error('❌ Failed to create favorites table:', error);
      return res.status(500).json({ 
        message: 'Failed to create favorites table',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete('/api/videos/:id/favorite', requireAuth, async (req, res) => {
    try {
      console.log('DELETE /api/videos/:id/favorite - Starting');
      
      // Ensure user is authenticated
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Ensure videoId is a number
      const videoId = parseInt(req.params.id, 10);
      if (isNaN(videoId) || videoId <= 0) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Remove from favorites
      await dbStorage.removeFavorite(req.user.id, videoId);
      
      res.status(200).json({ message: "Video removed from favorites" });
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: "Failed to remove video from favorites" });
    }
  });

  app.get('/api/users/:id/favorites', requireAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Ensure user is authenticated
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only allow users to view their own favorites
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "You can only view your own favorites" });
      }
      
      // Parse query parameters with defaults
      const limit = parseInt(req.query.limit as string || '20', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);
      
      console.log(`Getting favorites for userId: ${userId}, limit: ${limit}, offset: ${offset}`);
      
      const favorites = await dbStorage.getUserFavorites(userId, limit, offset);
      
      res.status(200).json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ message: "Failed to load favorites" });
    }
  });
  
  // Search Routes
  app.get('/api/search', optionalAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string || 'all';
      const currentUserId = req.user?.id;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const results: any = {};
      
      if (type === 'all' || type === 'users') {
        results.users = await dbStorage.searchUsers(query, currentUserId);
      }
      
      if (type === 'all' || type === 'videos') {
        results.videos = await dbStorage.searchVideos(query, currentUserId);
      }
      
      if (type === 'all' || type === 'hashtags') {
        results.hashtags = await dbStorage.searchHashtags(query);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get('/api/trending/hashtags', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hashtags = await dbStorage.getTrendingHashtags(limit);
      res.json(hashtags);
    } catch (error) {
      console.error("Get trending hashtags error:", error);
      res.status(500).json({ message: "Failed to load trending hashtags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}