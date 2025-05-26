import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { requireAuth, optionalAuth, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth";
import { insertVideoSchema, insertCommentSchema, insertLikeSchema, insertFollowSchema } from "@shared/schema";
import { z } from "zod";
import "./types";

// Configure session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
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
      cb(new Error('Invalid field name'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session(sessionConfig));

  // Add user to request type
  app.use((req, res, next) => {
    req.user = undefined;
    next();
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Check username availability
      if (validatedData.username) {
        const existingUsername = await storage.getUserByUsername(validatedData.username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username is already taken" });
        }
      }

      // Create user
      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser(userData);
      
      // Set session
      req.session!.userId = user.id;
      
      // Return user without password
      const { password, ...userResponse } = user;
      res.status(201).json({ 
        message: "Account created successfully! Welcome to TikTok!", 
        user: userResponse 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
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
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      req.session!.userId = user.id;
      
      // Return user without password
      const { password: _, ...userResponse } = user;
      res.json({ 
        message: "Welcome back!", 
        user: userResponse 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
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
    req.session = null;
    res.json({ message: "Logged out successfully" });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    const { password, ...userResponse } = req.user!;
    res.json(userResponse);
  });

  // Password Reset Routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }
      
      const token = await storage.createPasswordResetToken(email);
      
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
      
      const success = await storage.resetPassword(token, password);
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
      
      const videos = await storage.getFeedVideos(offset, limit, currentUserId);
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Failed to load videos" });
    }
  });

  app.get('/api/videos/trending', optionalAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const currentUserId = req.user?.id;
      
      const videos = await storage.getTrendingVideos(offset, limit, currentUserId);
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
      const video = await storage.getVideoWithUser(videoId, currentUserId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Record view if user is authenticated
      if (currentUserId) {
        await storage.recordVideoView({
          videoId,
          userId: currentUserId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
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
      
      const videoData = insertVideoSchema.parse({
        ...req.body,
        userId: req.user!.id,
        videoUrl: `/uploads/${videoFile.filename}`,
        thumbnailUrl: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null,
        fileSize: videoFile.size,
        format: videoFile.mimetype.split('/')[1],
      });
      
      const video = await storage.createVideo(videoData);
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
      
      const deleted = await storage.deleteVideo(videoId, req.user!.id);
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
      const comments = await storage.getVideoComments(videoId, currentUserId);
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
      
      const comment = await storage.createComment(commentData);
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
      
      const deleted = await storage.deleteComment(commentId, req.user!.id);
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
      
      const like = await storage.createLike(likeData);
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
      
      const deleted = await storage.deleteLike(
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
      const followData = insertFollowSchema.parse({
        ...req.body,
        followerId: req.user!.id,
      });
      
      if (followData.followerId === followData.followingId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }
      
      const follow = await storage.createFollow(followData);
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
      
      const deleted = await storage.deleteFollow(followerId, followingId);
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
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isFollowing = currentUserId ? await storage.isFollowing(currentUserId, userId) : false;
      const videos = await storage.getVideosByUser(userId, currentUserId);
      
      const { password, ...userResponse } = user;
      res.json({
        user: { ...userResponse, isFollowing },
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
      
      const followers = await storage.getFollowers(userId, offset, limit);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ message: "Failed to load followers" });
    }
  });

  app.get('/api/users/:id/following', optionalAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const following = await storage.getFollowing(userId, offset, limit);
      res.json(following);
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ message: "Failed to load following" });
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
        results.users = await storage.searchUsers(query, currentUserId);
      }
      
      if (type === 'all' || type === 'videos') {
        results.videos = await storage.searchVideos(query, currentUserId);
      }
      
      if (type === 'all' || type === 'hashtags') {
        results.hashtags = await storage.searchHashtags(query);
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
      const hashtags = await storage.getTrendingHashtags(limit);
      res.json(hashtags);
    } catch (error) {
      console.error("Get trending hashtags error:", error);
      res.status(500).json({ message: "Failed to load trending hashtags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}