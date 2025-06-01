import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema } from "./shared/schema";
import { z } from "zod";
import "./types";

// Authentication middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      message: "Authentication required. Please log in to continue." 
    });
  }
  
  try {
    const user = await storage.getUserById(userId);
    if (!user) {
      // Instead of setting session to null, destroy it
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
      return res.status(401).json({ 
        message: "User not found. Please log in again." 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Optional auth middleware - doesn't block if user is not authenticated
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (userId) {
    try {
      const user = await storage.getUserById(userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error("Optional auth error:", error);
    }
  }
  
  next();
}

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration validation schema
export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});