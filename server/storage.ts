import { 
  users, videos, comments, likes, follows,
  type User, type Video, type Comment, type Like, type Follow,
  type InsertUser, type InsertVideo, type InsertComment, type InsertLike, type InsertFollow,
  type VideoWithUser, type CommentWithUser
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Videos
  getVideo(id: number): Promise<Video | undefined>;
  getVideoWithUser(id: number, currentUserId?: number): Promise<VideoWithUser | undefined>;
  getVideosByUser(userId: number): Promise<Video[]>;
  getFeedVideos(offset?: number, limit?: number, currentUserId?: number): Promise<VideoWithUser[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
  
  // Comments
  getComment(id: number): Promise<Comment | undefined>;
  getVideoComments(videoId: number, currentUserId?: number): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Likes
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, videoId?: number, commentId?: number): Promise<boolean>;
  isVideoLiked(userId: number, videoId: number): Promise<boolean>;
  isCommentLiked(userId: number, commentId: number): Promise<boolean>;
  
  // Follows
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: number, followingId: number): Promise<boolean>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  
  // Search
  searchUsers(query: string): Promise<User[]>;
  searchVideos(query: string): Promise<VideoWithUser[]>;
}

export class MemStorage implements IStorage {
  // @ts-ignore
  private users: Map<number, User> = new Map();
  private videos: Map<number, Video> = new Map();
  private comments: Map<number, Comment> = new Map();
  private likes: Map<number, Like> = new Map();
  private follows: Map<number, Follow> = new Map();
  
  private currentUserId = 1;
  private currentVideoId = 1;
  private currentCommentId = 1;
  private currentLikeId = 1;
  private currentFollowId = 1;

  constructor() {
    // Create some initial users
    this.createUser({
      username: "dancequeen_maya",
      email: "maya@example.com",
      password: "password123",
      avatar: "https://pixabay.com/get/g9900e4683f4a6aba91611dfe3bf863ffdcdbbfd53bc37a65ecc8ad7f2b395ae20e7814ba82afa8a5ffaf66fe78cc63cbeefd82982898d9fae8513d2b6c3ca404_1280.jpg",
      bio: "Professional dancer and choreographer 💃✨"
    });

    this.createUser({
      username: "artbyluke",
      email: "luke@example.com", 
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50",
      bio: "Creating art that speaks to the soul 🎨"
    });

    this.createUser({
      username: "chefemily",
      email: "emily@example.com",
      password: "password123", 
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50",
      bio: "Sharing quick and delicious recipes 🍝👩‍🍳"
    });

    this.createUser({
      username: "fitnessjake",
      email: "jake@example.com",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50",
      bio: "Your daily fitness motivation 💪🔥"
    });

    // Create some initial videos
    this.createVideo({
      userId: 1,
      title: "New Dance Choreography",
      description: "New choreo to my favorite song! 💃 What do you think? #dance #choreography #viral",
      videoUrl: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
      duration: 30,
      musicName: "Original sound - dancequeen_maya",
      hashtags: ["dance", "choreography", "viral"]
    } as any);

    this.createVideo({
      userId: 2,
      title: "Art Creation Process",
      description: "Creating magic with colors 🎨 Process video coming soon! #art #painting #creative #process",
      videoUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
      duration: 45,
      musicName: "Chill beats for creative minds",
      hashtags: ["art", "painting", "creative", "process"]
    } as any);

    this.createVideo({
      userId: 3,
      title: "Quick Pasta Recipe",
      description: "60-second pasta recipe that will change your life! 🍝 #cooking #recipe #pasta #quick",
      videoUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
      duration: 60,
      musicName: "Italian cooking vibes",
      hashtags: ["cooking", "recipe", "pasta", "quick"]
    } as any);

    this.createVideo({
      userId: 4,
      title: "Morning Workout",
      description: "5-minute morning workout to start your day right! 💪 #fitness #workout #morning #health",
      videoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      thumbnailUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
      duration: 300,
      musicName: "High energy workout mix",
      hashtags: ["fitness", "workout", "morning", "health"]
    } as any);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      followersCount: 0,
      followingCount: 0,
      verified: false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoWithUser(id: number, currentUserId?: number): Promise<VideoWithUser | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const user = await this.getUser(video.userId);
    if (!user) return undefined;

    const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, video.id) : false;
    const isFollowing = currentUserId ? await this.isFollowing(currentUserId, user.id) : false;

    return {
      ...video,
      user,
      isLiked,
      isFollowing,
    };
  }

  async getVideosByUser(userId: number): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => video.userId === userId);
  }

  async getFeedVideos(offset = 0, limit = 10, currentUserId?: number): Promise<VideoWithUser[]> {
    const allVideos = Array.from(this.videos.values())
      .filter(video => !video.isPrivate)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(offset, offset + limit);

    const videosWithUser: VideoWithUser[] = [];
    
    for (const video of allVideos) {
      const user = await this.getUser(video.userId);
      if (user) {
        const isLiked = currentUserId ? await this.isVideoLiked(currentUserId, video.id) : false;
        const isFollowing = currentUserId ? await this.isFollowing(currentUserId, user.id) : false;
        
        videosWithUser.push({
          ...video,
          user,
          isLiked,
          isFollowing,
        });
      }
    }
    
    return videosWithUser;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = {
      ...insertVideo,
      id,
      viewsCount: insertVideo.viewsCount || 0,
      likesCount: insertVideo.likesCount || 0,
      commentsCount: insertVideo.commentsCount || 0,
      sharesCount: insertVideo.sharesCount || 0,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, ...updates };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<boolean> {
    return this.videos.delete(id);
  }

  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async getVideoComments(videoId: number, currentUserId?: number): Promise<CommentWithUser[]> {
    const videoComments = Array.from(this.comments.values())
      .filter(comment => comment.videoId === videoId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    const commentsWithUser: CommentWithUser[] = [];
    
    for (const comment of videoComments) {
      const user = await this.getUser(comment.userId);
      if (user) {
        const isLiked = currentUserId ? await this.isCommentLiked(currentUserId, comment.id) : false;
        
        commentsWithUser.push({
          ...comment,
          user,
          isLiked,
        });
      }
    }
    
    return commentsWithUser;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const comment: Comment = {
      ...insertComment,
      id,
      likesCount: 0,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    
    // Update video comments count
    const video = this.videos.get(insertComment.videoId);
    if (video) {
      await this.updateVideo(video.id, { commentsCount: video.commentsCount + 1 });
    }
    
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment) return false;
    
    // Update video comments count
    const video = this.videos.get(comment.videoId);
    if (video) {
      await this.updateVideo(video.id, { commentsCount: Math.max(0, video.commentsCount - 1) });
    }
    
    return this.comments.delete(id);
  }

  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = this.currentLikeId++;
    const like: Like = {
      ...insertLike,
      id,
      createdAt: new Date(),
    };
    this.likes.set(id, like);
    
    // Update likes count
    if (like.videoId) {
      const video = this.videos.get(like.videoId);
      if (video) {
        await this.updateVideo(video.id, { likesCount: video.likesCount + 1 });
      }
    } else if (like.commentId) {
      const comment = this.comments.get(like.commentId);
      if (comment) {
        const updatedComment = { ...comment, likesCount: comment.likesCount + 1 };
        this.comments.set(comment.id, updatedComment);
      }
    }
    
    return like;
  }

  async deleteLike(userId: number, videoId?: number, commentId?: number): Promise<boolean> {
    const like = Array.from(this.likes.values()).find(l => 
      l.userId === userId && 
      l.videoId === videoId && 
      l.commentId === commentId
    );
    
    if (!like) return false;
    
    // Update likes count
    if (like.videoId) {
      const video = this.videos.get(like.videoId);
      if (video) {
        await this.updateVideo(video.id, { likesCount: Math.max(0, video.likesCount - 1) });
      }
    } else if (like.commentId) {
      const comment = this.comments.get(like.commentId);
      if (comment) {
        const updatedComment = { ...comment, likesCount: Math.max(0, comment.likesCount - 1) };
        this.comments.set(comment.id, updatedComment);
      }
    }
    
    return this.likes.delete(like.id);
  }

  async isVideoLiked(userId: number, videoId: number): Promise<boolean> {
    return Array.from(this.likes.values()).some(like => 
      like.userId === userId && like.videoId === videoId
    );
  }

  async isCommentLiked(userId: number, commentId: number): Promise<boolean> {
    return Array.from(this.likes.values()).some(like => 
      like.userId === userId && like.commentId === commentId
    );
  }

  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    const id = this.currentFollowId++;
    const follow: Follow = {
      ...insertFollow,
      id,
      createdAt: new Date(),
    };
    this.follows.set(id, follow);
    
    // Update follow counts
    const follower = this.users.get(insertFollow.followerId);
    const following = this.users.get(insertFollow.followingId);
    
    if (follower) {
      await this.updateUser(follower.id, { followingCount: follower.followingCount + 1 });
    }
    if (following) {
      await this.updateUser(following.id, { followersCount: following.followersCount + 1 });
    }
    
    return follow;
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const follow = Array.from(this.follows.values()).find(f => 
      f.followerId === followerId && f.followingId === followingId
    );
    
    if (!follow) return false;
    
    // Update follow counts
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower) {
      await this.updateUser(follower.id, { followingCount: Math.max(0, follower.followingCount - 1) });
    }
    if (following) {
      await this.updateUser(following.id, { followersCount: Math.max(0, following.followersCount - 1) });
    }
    
    return this.follows.delete(follow.id);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(follow => 
      follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter(user => 
      user.username.toLowerCase().includes(lowercaseQuery) ||
      (user.bio && user.bio.toLowerCase().includes(lowercaseQuery))
    );
  }

  async searchVideos(query: string): Promise<VideoWithUser[]> {
    const lowercaseQuery = query.toLowerCase();
    const matchingVideos = Array.from(this.videos.values()).filter(video => 
      video.title.toLowerCase().includes(lowercaseQuery) ||
      (video.description && video.description.toLowerCase().includes(lowercaseQuery)) ||
      (video.hashtags && video.hashtags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );

    const videosWithUser: VideoWithUser[] = [];
    
    for (const video of matchingVideos) {
      const user = await this.getUser(video.userId);
      if (user) {
        videosWithUser.push({
          ...video,
          user,
        });
      }
    }
    
    return videosWithUser;
  }
}

export const storage = new MemStorage();
