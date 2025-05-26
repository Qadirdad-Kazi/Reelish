import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage-fix";
import { insertVideoSchema, insertCommentSchema, insertLikeSchema, insertFollowSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for video uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get user" });
    }
  });

  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get user" });
    }
  });

  app.get("/api/users/:id/videos", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const videos = await storage.getVideosByUser(userId);
      res.json(videos);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get user videos" });
    }
  });

  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const currentUserId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const videos = await storage.getFeedVideos(offset, limit, currentUserId);
      res.json(videos);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const currentUserId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const video = await storage.getVideoWithUser(videoId, currentUserId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get video" });
    }
  });

  app.post("/api/videos", upload.single('video'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }
      
      const videoData = {
        ...req.body,
        videoUrl: `/uploads/${req.file.filename}`,
        hashtags: req.body.hashtags ? JSON.parse(req.body.hashtags) : [],
        userId: parseInt(req.body.userId),
        duration: parseInt(req.body.duration) || 0,
        isPrivate: req.body.isPrivate === 'true',
      };
      
      const validatedData = insertVideoSchema.parse(videoData);
      const video = await storage.createVideo(validatedData);
      
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload video" });
    }
  });

  app.patch("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const updates = req.body;
      
      const video = await storage.updateVideo(videoId, updates);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const success = await storage.deleteVideo(videoId);
      
      if (!success) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete video" });
    }
  });

  // Comment routes
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const currentUserId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const comments = await storage.getVideoComments(videoId, currentUserId);
      res.json(comments);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to get comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const success = await storage.deleteComment(commentId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete comment" });
    }
  });

  // Like routes
  app.post("/api/likes", async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      const like = await storage.createLike(likeData);
      res.json(like);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create like" });
    }
  });

  app.delete("/api/likes", async (req, res) => {
    try {
      const { userId, videoId, commentId } = req.body;
      const success = await storage.deleteLike(
        parseInt(userId),
        videoId ? parseInt(videoId) : undefined,
        commentId ? parseInt(commentId) : undefined
      );
      
      if (!success) {
        return res.status(404).json({ message: "Like not found" });
      }
      
      res.json({ message: "Like removed successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to remove like" });
    }
  });

  // Follow routes
  app.post("/api/follows", async (req, res) => {
    try {
      const followData = insertFollowSchema.parse(req.body);
      const follow = await storage.createFollow(followData);
      res.json(follow);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to follow user" });
    }
  });

  app.delete("/api/follows", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      const success = await storage.deleteFollow(parseInt(followerId), parseInt(followingId));
      
      if (!success) {
        return res.status(404).json({ message: "Follow relationship not found" });
      }
      
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to unfollow user" });
    }
  });

  // Search routes
  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const users = await storage.searchUsers(query);
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Search failed" });
    }
  });

  app.get("/api/search/videos", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const videos = await storage.searchVideos(query);
      res.json(videos);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Search failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
