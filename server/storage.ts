import { 
  users, videos, comments, likes, follows, videoViews, conversations, messages, 
  notifications, tags, videoTags, trendingHashtags, passwordResetTokens, favorites,
  type User, type Video, type Comment, type Like, type Follow, type Favorite,
  type InsertUser, type InsertVideo, type InsertComment, type InsertLike, type InsertFollow,
  type InsertFavorite, type VideoWithUser, type CommentWithUser, type UserWithStats, type InsertVideoView,
  type InsertMessage, type InsertNotification, type Tag, type VideoView
} from "./shared/schema";
import { db } from "./db";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, not, or, sql } from 'drizzle-orm';
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Authentication
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  
  // Password reset
  createPasswordResetToken(email: string): Promise<string>;
  verifyPasswordResetToken(token: string): Promise<{ email: string; valid: boolean }>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  
  // Videos
  getVideo(id: number): Promise<Video | undefined>;
  getVideoWithUser(id: number, currentUserId?: string): Promise<VideoWithUser | undefined>;
  getVideosByUser(userId: string, currentUserId?: string): Promise<VideoWithUser[]>;
  getFeedVideos(offset?: number, limit?: number, currentUserId?: string): Promise<VideoWithUser[]>;
  getRandomVideos(limit?: number, currentUserId?: string): Promise<VideoWithUser[]>;
  getTrendingVideos(offset?: number, limit?: number, currentUserId?: string): Promise<VideoWithUser[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: number, userId: string): Promise<boolean>;
  recordVideoView(view: InsertVideoView): Promise<void>;
  
  // Comments
  getComment(id: number): Promise<Comment | undefined>;
  getVideoComments(videoId: number, currentUserId?: string): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number, userId: string): Promise<boolean>;
  
  // Likes
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: string, videoId?: number, commentId?: number): Promise<boolean>;
  isVideoLiked(userId: string, videoId: number): Promise<boolean>;
  isCommentLiked(userId: string, commentId: number): Promise<boolean>;
  
  // Follows
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string, offset?: number, limit?: number): Promise<UserWithStats[]>;
  getFollowing(userId: string, offset?: number, limit?: number): Promise<UserWithStats[]>;
  
  // Search
  searchUsers(query: string, currentUserId?: string): Promise<UserWithStats[]>;
  searchVideos(query: string, currentUserId?: string): Promise<VideoWithUser[]>;
  searchHashtags(query: string): Promise<Tag[]>;
  getTrendingHashtags(limit?: number): Promise<Tag[]>;
  
  // Tags
  createTag(name: string): Promise<Tag>;
  getOrCreateTags(names: string[]): Promise<Tag[]>;
  addTagsToVideo(videoId: number, tagIds: number[]): Promise<void>;
  
  // Messaging
  getConversations(userId: string): Promise<any[]>;
  createMessage(message: InsertMessage): Promise<any>;
  getConversationMessages(conversationId: number, offset?: number, limit?: number): Promise<any[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<any>;
  getUserNotifications(userId: string, offset?: number, limit?: number): Promise<any[]>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Authentication
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = nanoid();
    // Type assertion to access password property safely
    const userData = insertUser as unknown as { password?: string };
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : undefined;
    
    // Create a properly typed user object with required fields
    const userToInsert = {
      id,
      email: (insertUser as any).email as string,
      username: (insertUser as any).username as string,
      password: hashedPassword,
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const [user] = await db
      .insert(users)
      .values(userToInsert)
      .returning();
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
  
  // Verify password with hashed password
  async verifyPasswordHash(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Hash a new password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Password reset
  async createPasswordResetToken(email: string): Promise<string> {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expiresAt,
    });
    
    return token;
  }

  async verifyPasswordResetToken(token: string): Promise<{ email: string; valid: boolean }> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false)
      ))
      .limit(1);
    
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return { email: '', valid: false };
    }
    
    return { email: resetToken.email, valid: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const verification = await this.verifyPasswordResetToken(token);
    if (!verification.valid) return false;
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, verification.email));
    
    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    
    return true;
  }

  // Videos
  async getVideo(id: number): Promise<Video | undefined> {
    try {
      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, id));
      return video;
    } catch (error) {
      console.error('Error getting video:', error);
      return undefined;
    }
  }
  
  async getVideoById(id: number): Promise<Video | undefined> {
    return this.getVideo(id);
  }

  async getVideoWithUser(id: number, currentUserId?: string): Promise<VideoWithUser | undefined> {
    const [result] = await db
      .select()
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, id) : false;
    const isFollowing = currentUserId ? await this.isFollowing(currentUserId, result.users.id) : false;
    const isFavorite = currentUserId ? await this.isFavorite(currentUserId, id) : false;
    
    return {
      ...result.videos,
      user: result.users,
      isLiked,
      isFollowing,
      isFavorite,
    };
  }

  async getVideosByUser(userId: string, currentUserId?: string): Promise<VideoWithUser[]> {
    try {
      console.log(`getVideosByUser called with userId=${userId}, currentUserId=${currentUserId || 'undefined'}`);
      
      // Build the query conditions
      const conditions = [eq(videos.userId, userId)];
      
      // Only include private videos if the current user is the owner
      if (currentUserId !== userId) {
        conditions.push(eq(videos.isPrivate, false));
      }
      
      console.log('Executing database query for videos');
      const results = await db
        .select()
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(videos.createdAt));
      
      console.log(`Query returned ${results.length} videos`);
      
      // Process each video with error handling for individual items
      const processedVideos = await Promise.all(
        results.map(async (result) => {
          try {
            // Default values in case of errors
            let isLiked = false;
            let isFollowing = false;
            let isFavorite = false;
            
            // Only try to get like/follow/favorite status if we have a current user
            if (currentUserId) {
              try {
                isLiked = await this.isVideoLiked(currentUserId, result.videos.id);
              } catch (likeError) {
                console.error(`Error checking like status for video ${result.videos.id}:`, likeError);
              }
              
              try {
                isFollowing = await this.isFollowing(currentUserId, result.users.id);
              } catch (followError) {
                console.error(`Error checking follow status for user ${result.users.id}:`, followError);
              }
              
              try {
                isFavorite = await this.isFavorite(currentUserId, result.videos.id);
              } catch (favoriteError) {
                console.error(`Error checking favorite status for video ${result.videos.id}:`, favoriteError);
              }
            }
            
            return {
              ...result.videos,
              user: result.users,
              isLiked,
              isFollowing,
              isFavorite,
            };
          } catch (itemError) {
            console.error(`Error processing video ${result.videos.id}:`, itemError);
            // Return a minimal valid object to prevent the entire request from failing
            return {
              ...result.videos,
              user: result.users,
              isLiked: false,
              isFollowing: false,
              isFavorite: false,
            };
          }
        })
      );
      
      console.log(`Successfully processed ${processedVideos.length} videos`);
      return processedVideos;
    } catch (error) {
      console.error('Error in getVideosByUser:', error);
      // Return an empty array instead of throwing an error
      return [];
    }
  }

  async getFeedVideos(offset = 0, limit = 10, currentUserId?: string): Promise<VideoWithUser[]> {
    const results = await db
      .select()
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.isPrivate, false))
      .orderBy(desc(videos.createdAt))
      .offset(offset)
      .limit(limit);
    
    return Promise.all(results.map(async (result) => {
      const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, result.videos.id) : false;
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, result.users.id) : false;
      const isFavorite = currentUserId ? await this.isFavorite(currentUserId, result.videos.id) : false;
      
      return {
        ...result.videos,
        user: result.users,
        isLiked,
        isFollowing,
        isFavorite,
      };
    }));
  }

  async getRandomVideos(limit = 20, currentUserId?: string): Promise<VideoWithUser[]> {
    // Use SQL's random() function to get random videos
    const results = await db
      .select()
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.isPrivate, false))
      .orderBy(sql`RANDOM()`)
      .limit(limit);
    
    return Promise.all(results.map(async (result) => {
      const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, result.videos.id) : false;
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, result.users.id) : false;
      const isFavorite = currentUserId ? await this.isFavorite(currentUserId, result.videos.id) : false;
      
      return {
        ...result.videos,
        user: result.users,
        isLiked,
        isFollowing,
        isFavorite,
      };
    }));
  }

  async getTrendingVideos(offset = 0, limit = 10, currentUserId?: string): Promise<VideoWithUser[]> {
    const results = await db
      .select()
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.isPrivate, false))
      .orderBy(desc(videos.viewsCount), desc(videos.likesCount))
      .offset(offset)
      .limit(limit);
    
    return Promise.all(results.map(async (result) => {
      const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, result.videos.id) : false;
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, result.users.id) : false;
      const isFavorite = currentUserId ? await this.isFavorite(currentUserId, result.videos.id) : false;
      
      return {
        ...result.videos,
        user: result.users,
        isLiked,
        isFollowing,
        isFavorite,
      };
    }));
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    // Type assertion to access required properties safely
    const videoData = insertVideo as unknown as { 
      userId: string;
      title: string;
      videoUrl: string;
      description?: string;
      thumbnailUrl?: string;
      musicName?: string;
      isPrivate?: boolean;
      hashtags?: string[];
      mentions?: string[];
      fileSize?: number;
      format?: string;
      duration?: number;
      allowComments?: boolean;
      allowDuet?: boolean;
      allowDownload?: boolean;
    };
    
    console.log('Creating video with data:', JSON.stringify(videoData, null, 2));
    
    // Create a properly typed video object with required fields
    const videoToInsert = {
      userId: videoData.userId,
      title: videoData.title,
      videoUrl: videoData.videoUrl,
      description: videoData.description || null,
      thumbnailUrl: videoData.thumbnailUrl || null,
      musicName: videoData.musicName || null,
      isPrivate: videoData.isPrivate || false,
      hashtags: videoData.hashtags || [],
      mentions: videoData.mentions || [],
      fileSize: videoData.fileSize || 0,
      format: videoData.format || null,
      duration: videoData.duration || 0,
      allowComments: videoData.allowComments !== false,
      allowDuet: videoData.allowDuet !== false,
      allowDownload: videoData.allowDownload !== false,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [video] = await db
      .insert(videos)
      .values(videoToInsert)
      .returning();
    
    // Update user's videos count
    await db
      .update(users)
      .set({ 
        videosCount: sql`${users.videosCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, videoData.userId));
    
    return video;
  }

  async updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    
    return video;
  }

  async deleteVideo(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)));
    
    if (result.rowCount && result.rowCount > 0) {
      // Update user's videos count
      await db
        .update(users)
        .set({ 
          videosCount: sql`${users.videosCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    }
    
    return false;
  }

  async recordVideoView(view: InsertVideoView): Promise<void> {
    // Type assertion to access required properties safely
    const viewData = view as unknown as { 
      videoId: number;
      userId?: string;
      completedView?: boolean;
    };
    
    // Create a properly typed view object with required fields
    const viewToInsert = {
      videoId: viewData.videoId,
      userId: viewData.userId || null,
      completedView: viewData.completedView || false,
      createdAt: new Date()
    };
    
    await db.insert(videoViews).values(viewToInsert);
    
    // Update video view count
    await db
      .update(videos)
      .set({ 
        viewsCount: sql`${videos.viewsCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(videos.id, viewData.videoId));
  }

  // Comments
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    
    return comment;
  }

  async getVideoComments(videoId: number, currentUserId?: string): Promise<CommentWithUser[]> {
    const results = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.videoId, videoId))
      .orderBy(desc(comments.createdAt));
    
    return Promise.all(results.map(async (result) => {
      const isLiked = currentUserId ? await this.isCommentLiked(currentUserId, result.comments.id) : false;
      
      return {
        ...result.comments,
        user: result.users,
        isLiked,
      };
    }));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    // Type assertion to access required properties safely
    const commentData = insertComment as unknown as { 
      userId: string;
      videoId: number;
      content: string;
      parentId?: number;
    };
    
    // Create a properly typed comment object with required fields
    const commentToInsert = {
      userId: commentData.userId,
      videoId: commentData.videoId,
      content: commentData.content,
      parentId: commentData.parentId || null,
      likesCount: 0,
      repliesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [comment] = await db
      .insert(comments)
      .values(commentToInsert)
      .returning();
    
    // Update video comments count
    await db
      .update(videos)
      .set({ 
        commentsCount: sql`${videos.commentsCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(videos.id, commentData.videoId));
    
    return comment;
  }

  async deleteComment(id: number, userId: string): Promise<boolean> {
    const comment = await this.getComment(id);
    if (!comment || comment.userId !== userId) return false;
    
    const result = await db
      .delete(comments)
      .where(eq(comments.id, id));
    
    if (result.rowCount && result.rowCount > 0) {
      // Update video comments count
      await db
        .update(videos)
        .set({ 
          commentsCount: sql`${videos.commentsCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(videos.id, comment.videoId));
      
      return true;
    }
    
    return false;
  }

  // Likes
  async createLike(insertLike: InsertLike): Promise<Like> {
    // Type assertion to access required properties safely
    const likeData = insertLike as unknown as { 
      userId: string;
      videoId?: number;
      commentId?: number;
    };
    
    // Create a properly typed like object with required fields
    const likeToInsert = {
      userId: likeData.userId,
      videoId: likeData.videoId || null,
      commentId: likeData.commentId || null,
      createdAt: new Date()
    };
    
    const [like] = await db
      .insert(likes)
      .values(likeToInsert)
      .returning();
    
    // Update counts
    if (likeData.videoId) {
      await db
        .update(videos)
        .set({ 
          likesCount: sql`${videos.likesCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(videos.id, likeData.videoId));
    } else if (likeData.commentId) {
      await db
        .update(comments)
        .set({ 
          likesCount: sql`${comments.likesCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(comments.id, likeData.commentId));
    }
    
    return like;
  }

  async deleteLike(userId: string, videoId?: number, commentId?: number): Promise<boolean> {
    const conditions = [eq(likes.userId, userId)];
    
    if (videoId) {
      conditions.push(eq(likes.videoId, videoId));
    }
    if (commentId) {
      conditions.push(eq(likes.commentId, commentId));
    }
    
    const result = await db
      .delete(likes)
      .where(and(...conditions));
    
    if (result.rowCount && result.rowCount > 0) {
      // Update counts
      if (videoId) {
        await db
          .update(videos)
          .set({ 
            likesCount: sql`${videos.likesCount} - 1`,
            updatedAt: new Date()
          })
          .where(eq(videos.id, videoId));
      } else if (commentId) {
        await db
          .update(comments)
          .set({ 
            likesCount: sql`${comments.likesCount} - 1`,
            updatedAt: new Date()
          })
          .where(eq(comments.id, commentId));
      }
      
      return true;
    }
    
    return false;
  }

  async isVideoLiked(userId: string, videoId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);
    
    return !!like;
  }

  async isCommentLiked(userId: string, commentId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.commentId, commentId)))
      .limit(1);
    
    return !!like;
  }

  // Follows
  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    // Type assertion to access required properties safely
    const followData = insertFollow as unknown as { 
      followerId: string;
      followingId: string;
    };
    
    // Create a properly typed follow object with required fields
    const followToInsert = {
      followerId: followData.followerId,
      followingId: followData.followingId,
      createdAt: new Date()
    };
    
    const [follow] = await db
      .insert(follows)
      .values(followToInsert)
      .returning();
    
    // Update follow counts
    await Promise.all([
      db
        .update(users)
        .set({ 
          followingCount: sql`${users.followingCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, followData.followerId)),
      
      db
        .update(users)
        .set({ 
          followersCount: sql`${users.followersCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, followData.followingId))
    ]);
    
    return follow;
  }

  async deleteFollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    
    if (result.rowCount && result.rowCount > 0) {
      // Update follow counts
      await Promise.all([
        db
          .update(users)
          .set({ 
            followingCount: sql`${users.followingCount} - 1`,
            updatedAt: new Date()
          })
          .where(eq(users.id, followerId)),
        
        db
          .update(users)
          .set({ 
            followersCount: sql`${users.followersCount} - 1`,
            updatedAt: new Date()
          })
          .where(eq(users.id, followingId))
      ]);
      
      return true;
    }
    
    return false;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    
    return !!follow;
  }

  async getFollowers(userId: string, offset = 0, limit = 20): Promise<UserWithStats[]> {
    const results = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .offset(offset)
      .limit(limit);
    
    return results.map(result => ({
      ...result.users,
      isFollowing: false, // Can be enhanced with current user context
    }));
  }
  
  async getFollowerCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    return result[0]?.count ?? 0;
  }

  async getFollowing(userId: string, offset = 0, limit = 20): Promise<UserWithStats[]> {
    const results = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(follows.createdAt))
      .offset(offset)
      .limit(limit);
    
    return results.map(result => ({
      ...result.users,
      isFollowing: true,
    }));
  }
  
  async getFollowingCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    return result[0]?.count ?? 0;
  }

  // Search
  async searchUsers(query: string, currentUserId?: string): Promise<UserWithStats[]> {
    // Simple search implementation that looks for matches in username, firstName, and lastName
    const cleanQuery = query.toLowerCase();
    const terms = cleanQuery.split(' ');
    
    // Build the search conditions
    const conditions = [
      like(users.username, `%${cleanQuery}%`),
      like(users.firstName, `%${cleanQuery}%`),
      like(users.lastName, `%${cleanQuery}%`),
      // For full name search, use SQL directly
      sql`CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, '')) LIKE ${`%${cleanQuery}%`}`
    ];
    
    // If we have exactly two terms, try first name + last name combinations
    if (terms.length === 2 && terms[0] && terms[1]) {
      const term0 = terms[0];
      const term1 = terms[1];
      
      // Make sure firstName and lastName are not null before using them in conditions
      if (users.firstName && users.lastName) {
        // Try first name + last name
        conditions.push(
          sql`(${users.firstName} LIKE ${`%${term0}%`} AND ${users.lastName} LIKE ${`%${term1}%`})`
        );
        // Also try reverse order (last name first, first name second)
        conditions.push(
          sql`(${users.firstName} LIKE ${`%${term1}%`} AND ${users.lastName} LIKE ${`%${term0}%`})`
        );
      }
    }
    
    // Get all users that match any of the conditions
    const results = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(50);
    
    // Score and sort results based on match quality
    const scoredResults = results.map(user => {
      let score = 0;
      const username = user.username?.toLowerCase() || '';
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Exact matches get highest score
      if (username === query.toLowerCase()) score += 100;
      if (firstName === query.toLowerCase()) score += 80;
      if (lastName === query.toLowerCase()) score += 80;
      if (fullName === query.toLowerCase()) score += 100;
      
      // Partial matches get lower scores
      if (username.includes(query.toLowerCase())) score += 50;
      if (firstName.includes(query.toLowerCase())) score += 40;
      if (lastName.includes(query.toLowerCase())) score += 40;
      if (fullName.includes(query.toLowerCase())) score += 60;
      
      // Match individual terms
      terms.forEach(term => {
        if (username.includes(term)) score += 30;
        if (firstName.includes(term)) score += 25;
        if (lastName.includes(term)) score += 25;
      });
      
      return { user, score };
    });
    
    // Sort by score and take top 20
    const sortedResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.user);
    
    // Add following status
    return Promise.all(sortedResults.map(async (user) => ({
      ...user,
      isFollowing: currentUserId ? await this.isFollowing(currentUserId, user.id) : false,
    })));
  }

  async searchVideos(query: string, currentUserId?: string): Promise<VideoWithUser[]> {
    const results = await db
      .select()
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(and(
        eq(videos.isPrivate, false),
        or(
          like(videos.title, `%${query}%`),
          like(videos.description, `%${query}%`)
        )
      ))
      .limit(20);
    
    return Promise.all(results.map(async (result) => {
      const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, result.videos.id) : false;
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, result.users.id) : false;
      const isFavorite = currentUserId ? await this.isFavorite(currentUserId, result.videos.id) : false;
      
      return {
        ...result.videos,
        user: result.users,
        isLiked,
        isFollowing,
        isFavorite,
      };
    }));
  }

  async searchHashtags(query: string): Promise<Tag[]> {
    // Remove # if present at the beginning of the query
    const cleanQuery = query.startsWith('#') ? query.substring(1) : query;
    
    // First try exact match with LOWER function
    const exactMatches = await db
      .select()
      .from(tags)
      .where(sql`LOWER(${tags.name}) = ${cleanQuery.toLowerCase()}`)
      .orderBy(desc(tags.usageCount));
    
    // Then try partial matches if we don't have enough exact matches
    if (exactMatches.length >= 5) {
      return exactMatches.slice(0, 20);
    }
    
    // Get partial matches excluding exact matches we already have
    const exactMatchIds = exactMatches.map(tag => tag.id);
    const partialMatches = await db
      .select()
      .from(tags)
      .where(
        exactMatchIds.length > 0 
          ? and(
              like(tags.name, `%${cleanQuery}%`),
              not(inArray(tags.id, exactMatchIds))
            )
          : like(tags.name, `%${cleanQuery}%`)
      )
      .orderBy(desc(tags.usageCount))
      .limit(20 - exactMatches.length);
    
    return [...exactMatches, ...partialMatches];
  }

  async getTrendingHashtags(limit = 10): Promise<Tag[]> {
    // First try to get trending hashtags
    const trendingTags = await db
      .select()
      .from(tags)
      .where(eq(tags.trending, true))
      .orderBy(desc(tags.usageCount))
      .limit(limit);
    
    // If we don't have enough trending tags, supplement with popular tags
    if (trendingTags.length < limit) {
      const trendingTagIds = trendingTags.map(tag => tag.id);
      const popularTags = await db
        .select()
        .from(tags)
        .where(
          trendingTagIds.length > 0 
            ? and(
                eq(tags.trending, false),
                not(inArray(tags.id, trendingTagIds))
              )
            : eq(tags.trending, false)
        )
        .orderBy(desc(tags.usageCount))
        .limit(limit - trendingTags.length);
      
      return [...trendingTags, ...popularTags];
    }
    
    return trendingTags;
  }

  // Tags
  async createTag(name: string): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values({ name })
      .returning();
    
    return tag;
  }

  async getOrCreateTags(names: string[]): Promise<Tag[]> {
    const existingTags = await db
      .select()
      .from(tags)
      .where(inArray(tags.name, names));
    
    const existingNames = existingTags.map(tag => tag.name);
    const newNames = names.filter(name => !existingNames.includes(name));
    
    const newTags = await Promise.all(
      newNames.map(name => this.createTag(name))
    );
    
    return [...existingTags, ...newTags];
  }

  async addTagsToVideo(videoId: number, tagIds: number[]): Promise<void> {
    await db.insert(videoTags).values(
      tagIds.map(tagId => ({ videoId, tagId }))
    );
  }

  // Messaging (basic implementation)
  async getConversations(userId: string): Promise<any[]> {
    return [];
  }

  async createMessage(message: InsertMessage): Promise<any> {
    return null;
  }

  async getConversationMessages(conversationId: number, offset = 0, limit = 50): Promise<any[]> {
    return [];
  }

  // Notifications implementation
  async createNotification(data: {
    userId: string;
    type: string;
    triggeredById?: string;
    entityType?: string;
    entityId?: string;
    title: string;
    message?: string;
    read?: boolean;
  }): Promise<any> {
    try {
      const [result] = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        triggeredById: data.triggeredById || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        title: data.title,
        message: data.message || null,
        read: data.read || false
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, offset = 0, limit = 20): Promise<any[]> {
    try {
      // Get notifications with user info for the triggeredBy field
      const results = await db
        .select({
          notification: notifications,
          triggeredBy: users,
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.triggeredById, users.id))
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Format the results
      return results.map(({ notification, triggeredBy }) => ({
        ...notification,
        triggeredBy: triggeredBy ? {
          id: triggeredBy.id,
          username: triggeredBy.username,
          profileImageUrl: triggeredBy.profileImageUrl,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Favorites/Saved Videos Methods
  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite | undefined> {
    try {
      // Check if already favorited
      const existingFavorite = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, favoriteData.userId),
            eq(favorites.videoId, favoriteData.videoId)
          )
        )
        .limit(1);

      if (existingFavorite.length > 0) {
        return existingFavorite[0];
      }

      // Insert new favorite
      const [favorite] = await db
        .insert(favorites)
        .values(favoriteData)
        .returning();

      return favorite;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return undefined;
    }
  }

  async removeFavorite(userId: string, videoId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.videoId, videoId)
          )
        );

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  }

  async isFavorite(userId: string, videoId: number): Promise<boolean> {
    try {
      const [favorite] = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.videoId, videoId)
          )
        )
        .limit(1);

      return !!favorite;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  async getUserFavorites(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const favoriteVideos = await db
        .select({
          videos: videos,
          users: users,
          favoriteId: favorites.id,
          favoriteCreatedAt: favorites.createdAt
        })
        .from(favorites)
        .innerJoin(videos, eq(favorites.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt))
        .limit(limit)
        .offset(offset);

      return favoriteVideos.map(item => ({
        ...item.videos,
        user: item.users,
        favoriteId: item.favoriteId,
        favoriteCreatedAt: item.favoriteCreatedAt,
        isFavorite: true
      }));
    } catch (error) {
      console.error('Error getting user favorites:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();