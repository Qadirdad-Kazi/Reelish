import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema } from "./shared/schema";
import { z } from "zod";
import "./types";

// Authentication middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth middleware called for path:', req.path);
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  
  // Check if we have a userId in the session
  const userId = req.session?.userId;
  console.log('Session userId:', userId || 'not found');
  
  if (!userId) {
    console.log('Authentication failed: No userId in session');
    return res.status(401).json({ 
      message: "Authentication required. Please log in to continue." 
    });
  }
  
  try {
    // Try to get the user from the database
    console.log('Looking up user with ID:', userId);
    const user = await storage.getUserById(userId);
    
    if (!user) {
      console.log('Authentication failed: User not found in database');
      // Instead of setting session to null, destroy it
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
      return res.status(401).json({ 
        message: "User not found. Please log in again." 
      });
    }
    
    console.log('Authentication successful for user:', user.username);
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

// Define a proper type for the registration data
export type RegisterUserInput = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  // Include other optional user fields
  firstName?: string;
  lastName?: string;
  bio?: string;
  website?: string;
  location?: string;
  profileImageUrl?: string;
};

// Registration validation schema
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  // Optional fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

// Add password matching validation
export const registerSchemaWithPasswordValidation = registerSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
});

// Add password matching validation using refine
export const resetPasswordSchemaWithValidation = resetPasswordSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);