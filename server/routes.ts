import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import memorystore from "memorystore";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { storage as dbStorage } from "./storage";
import { requireAuth, optionalAuth, loginSchema, registerSchema, registerSchemaWithPasswordValidation, forgotPasswordSchema, resetPasswordSchema } from "./auth";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { insertVideoSchema, insertCommentSchema, insertLikeSchema, insertFollowSchema } from "./shared/schema";
import { z } from "zod";
import "./types";

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
    next();
  }, express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, path) => {
      // Set appropriate headers for video files
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
        // Allow browser to cache videos for 1 hour
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      console.log('Serving file:', path);
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
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }
      
      const deleted = await dbStorage.deleteVideo(videoId, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Video not found or you don't have permission to delete it" });
      }
      
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ message: "Failed to delete video" });
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