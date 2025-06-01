export interface Video {
  id: number;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  userId: string;
  musicName?: string | null;
  musicUrl?: string | null;
  isPrivate: boolean;
  hashtags?: string[] | null;
  mentions?: string[] | null;
  likesCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  viewsCount: number;
  duration?: number | null;
  fileSize?: number | null;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    profileImageUrl?: string | null;
  };
  isLiked?: boolean;
}
