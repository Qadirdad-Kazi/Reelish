import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with OAuth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  username: text("username").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: text("password"), // For local auth
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  videosCount: integer("videos_count").default(0),
  verified: boolean("verified").default(false),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Videos table with comprehensive metadata
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // in seconds
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"), // in bytes
  format: text("format"), // mp4, mov, etc
  viewsCount: integer("views_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  musicName: text("music_name"),
  musicUrl: text("music_url"),
  hashtags: text("hashtags").array(),
  mentions: text("mentions").array(),
  isPrivate: boolean("is_private").default(false),
  allowComments: boolean("allow_comments").default(true),
  allowDuet: boolean("allow_duet").default(true),
  allowDownload: boolean("allow_download").default(true),
  location: text("location"),
  originalVideoId: integer("original_video_id"), // For duets/remixes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video tags management
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color"),
  usageCount: integer("usage_count").default(0),
  trending: boolean("trending").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoTags = pgTable("video_tags", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments with threading support
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: varchar("user_id").notNull(),
  parentId: integer("parent_id"), // For replies
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Likes system
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  videoId: integer("video_id"),
  commentId: integer("comment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follows system
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video views tracking
export const videoViews = pgTable("video_views", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: varchar("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  watchTime: integer("watch_time"), // seconds watched
  completedView: boolean("completed_view").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messaging system
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: varchar("participant1_id").notNull(),
  participant2Id: varchar("participant2_id").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content"),
  messageType: text("message_type").default("text"), // text, image, video, sticker
  mediaUrl: text("media_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trending and search
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  userId: varchar("user_id"),
  resultsCount: integer("results_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trendingHashtags = pgTable("trending_hashtags", {
  id: serial("id").primaryKey(),
  hashtag: text("hashtag").notNull().unique(),
  videosCount: integer("videos_count").default(0),
  viewsCount: integer("views_count").default(0),
  trendScore: integer("trend_score").default(0),
  peakDate: timestamp("peak_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // like, comment, follow, mention, etc
  triggeredById: varchar("triggered_by_id"),
  entityType: text("entity_type"), // video, comment, user
  entityId: text("entity_id"),
  title: text("title").notNull(),
  message: text("message"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video filters and effects
export const videoFilters = pgTable("video_filters", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  filterName: text("filter_name").notNull(),
  filterParams: jsonb("filter_params"), // Store filter configuration
  createdAt: timestamp("created_at").defaultNow(),
});
