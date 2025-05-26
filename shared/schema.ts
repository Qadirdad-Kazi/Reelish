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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  comments: many(comments),
  likes: many(likes),
  followersRelation: many(follows, { relationName: "followers" }),
  followingRelation: many(follows, { relationName: "following" }),
  notifications: many(notifications),
  videoViews: many(videoViews),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
  views: many(videoViews),
  tags: many(videoTags),
  filters: many(videoFilters),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [likes.videoId],
    references: [videos.id],
  }),
  comment: one(comments, {
    fields: [likes.commentId],
    references: [comments.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "followers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  followersCount: true,
  followingCount: true,
  videosCount: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  viewsCount: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  likesCount: true,
  repliesCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  used: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  usageCount: true,
  trending: true,
  createdAt: true,
});

export const insertVideoViewSchema = createInsertSchema(videoViews).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  readAt: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type VideoTag = typeof videoTags.$inferSelect;
export type VideoView = typeof videoViews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type TrendingHashtag = typeof trendingHashtags.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type VideoFilter = typeof videoFilters.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertVideoView = z.infer<typeof insertVideoViewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extended types for API responses
export type VideoWithUser = Video & {
  user: User;
  isLiked?: boolean;
  isFollowing?: boolean;
  tags?: Tag[];
  filters?: VideoFilter[];
};

export type CommentWithUser = Comment & {
  user: User;
  isLiked?: boolean;
  replies?: CommentWithUser[];
};

export type UserWithStats = User & {
  isFollowing?: boolean;
  mutualFollowersCount?: number;
};

export type NotificationWithUser = Notification & {
  triggeredBy?: User;
};

export type ConversationWithMessages = Conversation & {
  participant1: User;
  participant2: User;
  lastMessage?: Message;
  unreadCount?: number;
};

export type MessageWithSender = Message & {
  sender: User;
};
