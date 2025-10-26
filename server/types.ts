import { User } from "./shared/schema.js";
import { Session, SessionData } from "express-session";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export {};