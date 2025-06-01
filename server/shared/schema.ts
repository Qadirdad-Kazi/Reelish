import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom function to create proper schema based on table type
function createCustomSchema(table: any) {
  // Create schema based on the table type
  let schema;
  
  switch(table) {
    case users:
      schema = z.object({
        id: z.string().optional(),
        email: z.string().email().optional(),
        username: z.string().min(3).max(30).optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        profileImageUrl: z.string().optional(),
        password: z.string().min(6).optional(),
        bio: z.string().optional(),
        website: z.string().optional(),
        location: z.string().optional(),
        followersCount: z.number().optional(),
        followingCount: z.number().optional(),
        videosCount: z.number().optional(),
        verified: z.boolean().optional(),
        isPrivate: z.boolean().optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      });
      break;
    case videos:
      schema = z.object({
        id: z.number().optional(),
        userId: z.string(),
        title: z.string(),
        description: z.string().nullable().optional(),
        videoUrl: z.string(),
        thumbnailUrl: z.string().nullable().optional(),
        duration: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        fileSize: z.number().optional(),
        format: z.string().nullable().optional(),
        viewsCount: z.number().optional(),
        likesCount: z.number().optional(),
        commentsCount: z.number().optional(),
        sharesCount: z.number().optional(),
        musicName: z.string().nullable().optional(),
        musicUrl: z.string().nullable().optional(),
        hashtags: z.array(z.string()).optional(),
        mentions: z.array(z.string()).optional(),
        isPrivate: z.boolean().optional(),
        allowComments: z.boolean().optional(),
        allowDuet: z.boolean().optional(),
        allowDownload: z.boolean().optional(),
        location: z.string().nullable().optional(),
        originalVideoId: z.number().optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      });
      break;
    case comments:
      schema = z.object({
        id: z.number().optional(),
        userId: z.string(),
        videoId: z.number(),
        content: z.string(),
        parentId: z.number().optional(),
        likesCount: z.number().optional(),
        repliesCount: z.number().optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      });
      break;
    case likes:
      schema = z.object({
        id: z.number().optional(),
        userId: z.string(),
        videoId: z.number().optional(),
        commentId: z.number().optional(),
        createdAt: z.date().optional(),
      });
      break;
    case follows:
      schema = z.object({
        id: z.number().optional(),
        followerId: z.string(),
        followingId: z.string(),
        createdAt: z.date().optional(),
      });
      break;
    case videoViews:
      schema = z.object({
        id: z.number().optional(),
        videoId: z.number(),
        userId: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        completedView: z.boolean().optional(),
        createdAt: z.date().optional(),
      });
      break;
    default:
      // Fallback generic schema
      schema = z.object({
        id: z.union([z.string(), z.number()]).optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      });
  }
  
  // We no longer need the omit method as we're handling field omission in the application logic
  
  return schema;
}

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

// Favorites/Saved videos
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userVideoIdx: uniqueIndex("favorites_user_video_idx").on(table.userId, table.videoId),
  };
});

// Zod schema for favorites     
export const insertFavoriteSchema = z.object({
  userId: z.string(),
  videoId: z.number(),
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Relations     
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  comments: many(comments),
  likes: many(likes),
  followersRelation: many(follows, { relationName: "followers" }),
  followingRelation: many(follows, { relationName: "following" }),
  notifications: many(notifications),
  videoViews: many(videoViews),
  favorites: many(favorites),
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
  favorites: many(favorites),
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

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [favorites.videoId],
    references: [videos.id],
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
// Create a schema without using the problematic .omit method
export const insertUserSchema = createCustomSchema(users);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertVideoSchema = createCustomSchema(videos);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertCommentSchema = createCustomSchema(comments);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertLikeSchema = createCustomSchema(likes);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertFollowSchema = createCustomSchema(follows);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertPasswordResetSchema = createCustomSchema(passwordResetTokens);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertTagSchema = createCustomSchema(tags);
// We'll handle the omission of fields in the application logic instead

export const insertVideoViewSchema = createCustomSchema(videoViews);
// We'll handle the omission of fields in the application logic instead

// Create a schema without using the problematic .omit method
export const insertMessageSchema = createCustomSchema(messages);
// We'll handle the omission of fields in the application logic instead

export const insertNotificationSchema = createCustomSchema(notifications);
// We'll handle the omission of fields in the application logic instead

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
  isFavorite?: boolean;
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
