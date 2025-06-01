import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Music, MoreHorizontal, Play, VolumeX, Volume2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CommentsModal from "./CommentsModal";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface VideoPlayerProps {
  video: {
    id: number;
    title: string;
    description?: string | null;
    videoUrl: string;
    musicName?: string | null;
    hashtags?: string[] | null;
    isLiked?: boolean;
    likesCount: number | null;
    commentsCount: number | null;
    sharesCount: number | null;
    user: {
      id: string;
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
    };
    isFollowing?: boolean;
  };
  isActive?: boolean;
}

export default function VideoPlayer({ video, isActive = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Set to false for sound on by default
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked || false);
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [isFollowing, setIsFollowing] = useState(video.isFollowing || false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Add error event handler
    const handleError = (e: Event) => {
      console.log(`Error playing video ID ${video.id}:`, (e.target as HTMLMediaElement).error);
      
      // Log the attempted video URL for debugging
      const videoSrc = video.videoUrl.startsWith('/uploads/') 
        ? `/api/stream/${video.videoUrl.replace('/uploads/', '')}` 
        : video.videoUrl;
      console.log(`Attempted to load video from: ${videoSrc}`);
      
      // Check if the user is authenticated by making a quick auth check
      fetch('/api/auth/me')
        .then(response => {
          if (!response.ok && response.status === 401) {
            console.log('Authentication error: User is not logged in');
            // If we get a 401, we need to redirect to login
            window.location.href = '/login';
          }
        })
        .catch(err => console.error('Auth check error:', err));
      
      setVideoError(true);
      setIsPlaying(false);
    };

    videoElement.addEventListener('error', handleError);

    // Force reload the video source when becoming active
    if (isActive && !videoError) {
      // Set the current time to 0 to start from the beginning
      videoElement.currentTime = 0;
      
      // Add a small delay before playing to ensure the video has loaded
      const playPromise = setTimeout(() => {
        videoElement.play()
          .then(() => {
            console.log(`Video playing: ID ${video.id}`);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error(`Error playing video ID ${video.id}:`, err);
            // Try one more time after a short delay
            setTimeout(() => {
              videoElement.play().catch(() => {});
            }, 500);
          });
      }, 100);
      
      return () => clearTimeout(playPromise);
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }

    return () => {
      videoElement.removeEventListener('error', handleError);
    };
  }, [isActive, video.id, videoError]);

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
      setIsPlaying(false);
    } else {
      videoElement.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = !videoElement.muted;
    setIsMuted(videoElement.muted);
  };

  const likeMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log(`${isLiked ? 'Unliking' : 'Liking'} video:`, video.id);
        
        // Make sure we're authenticated before liking
        if (!user) {
          throw new Error("You must be logged in to like videos");
        }
        
        const endpoint = isLiked 
          ? `/api/likes?videoId=${video.id}`
          : "/api/likes";
        
        const method = isLiked ? "DELETE" : "POST";
        const body = isLiked ? undefined : { videoId: video.id };
        
        console.log(`Making ${method} request to ${endpoint}`, body);
        
        const response = await apiRequest(method, endpoint, body);
        console.log('Like response:', response);
        return response;
      } catch (error) {
        console.error('Error in like mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      const newLikeStatus = !isLiked;
      console.log(`Video ${video.id} like status changed to:`, newLikeStatus);
      
      setIsLiked(newLikeStatus);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      
      // Show toast confirmation
      toast({
        title: newLikeStatus ? "Liked!" : "Unliked",
        description: newLikeStatus ? "Video added to your likes" : "Video removed from your likes",
      });
      
      // Invalidate videos queries
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      
      // Invalidate liked videos queries to update the likes tab
      if (user) {
        console.log(`Invalidating liked videos for user ${user.id}`);
        queryClient.invalidateQueries({ queryKey: [`user-liked-videos-${user.id}`] });
      }
    },
    onError: (error) => {
      console.error('Like mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    },
  });

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like videos",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First check if we're authenticated
      const authCheckResponse = await fetch('/api/auth/me', {
        credentials: "include"
      });
      
      if (!authCheckResponse.ok) {
        toast({
          title: "Authentication required",
          description: "Please log in to like videos",
          variant: "destructive",
        });
        return;
      }
      
      // Proceed with the like mutation
      likeMutation.mutate();
      
      // Force refresh of liked videos in profile page
      setTimeout(() => {
        if (user) {
          // Include the user ID in the query key to match the profile page
          queryClient.invalidateQueries({ queryKey: [`user-liked-videos-${user.id}`] });
          // Also invalidate the current user endpoint
          queryClient.invalidateQueries({ queryKey: [`user-liked-videos-current`] });
        }
      }, 500);
    } catch (error) {
      console.error("Error checking authentication:", error);
      toast({
        title: "Error",
        description: "Failed to like video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const followMutation = useMutation({
    mutationFn: () => 
      isFollowing 
        ? apiRequest("DELETE", `/api/follows/${video.user.id}`)
        : apiRequest("POST", "/api/follows", { followingId: video.user.id }),
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: `You ${isFollowing ? "unfollowed" : "are now following"} @${video.user.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Please log in to follow users",
        variant: "destructive",
      });
    },
  });

  const createVideoWithMusic = () => {
    if (!video.musicName) return;
    
    toast({
      title: "Create with this sound",
      description: `Using "${video.musicName}" for your video`,
    });
    // Navigate to upload page with music preset
    window.location.href = `/upload?music=${encodeURIComponent(video.musicName)}`;
  };

  const shareVideo = () => {
    const url = `${window.location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Video link copied to clipboard",
    });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const parseHashtags = (text: string) => {
    return text.split(' ').map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <Link key={index} href={`/hashtag/${word.slice(1)}`}>
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
              {word}
            </span>
          </Link>
        );
      }
      return word + ' ';
    });
  };

  return (
    <div className="relative w-full h-[85vh] bg-black flex items-center justify-center">
      {/* Video */}
      <div className="relative max-w-sm h-full">
        {videoError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-lg p-4">
            <div className="text-white text-center mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-xl font-bold">Video Unavailable</h3>
              <p className="text-gray-400 mt-2">This video could not be loaded</p>
            </div>
            <img 
              src={`https://picsum.photos/seed/${video.id}/400/600`} 
              alt={video.title} 
              className="w-full h-3/4 object-cover rounded-lg opacity-50"
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-lg"
              loop
              muted={isMuted}
              playsInline
              onClick={togglePlay}
              preload="auto"
              poster={`https://picsum.photos/seed/${video.id}/400/600`}
            >
              {/* Use the streaming endpoint for better video delivery */}
              <source 
                src={video.videoUrl.startsWith('/uploads/') 
                  ? `/api/stream/${video.videoUrl.replace('/uploads/', '')}` 
                  : video.videoUrl
                } 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
            
            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && (
                <Button
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full pointer-events-auto"
                  onClick={togglePlay}
                >
                  <Play className="w-8 h-8" />
                </Button>
              )}
            </div>
          </>
        )}

        {/* Volume Control */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>

        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center space-x-3 mb-2">
            <Link href={`/profile/${video.user.id}`}>
              <img
                src={video.user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.user.username}`}
                alt={video.user.username}
                className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
              />
            </Link>
            <div className="flex-1">
              <Link href={`/profile/${video.user.id}`}>
                <h3 className="font-semibold text-white cursor-pointer hover:underline">
                  @{video.user.username}
                </h3>
              </Link>
              <p className="text-sm text-gray-300">
                {video.user.firstName} {video.user.lastName}
              </p>
            </div>
            {user?.id !== video.user.id && (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className={isFollowing ? "border-white text-white hover:bg-white hover:text-black" : "bg-pink-600 hover:bg-pink-700 text-white"}
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
          
          <h2 className="text-white font-medium mb-2">{video.title}</h2>
          
          {video.description && (
            <p className="text-white text-sm mb-2">
              {parseHashtags(video.description)}
            </p>
          )}

          {video.hashtags && video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {video.hashtags.map((tag, index) => (
                <Link key={index} href={`/hashtag/${tag.replace('#', '')}`}>
                  <Badge variant="secondary" className="bg-gray-800 text-blue-400 hover:bg-gray-700 cursor-pointer">
                    #{tag.replace('#', '')}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {video.musicName && (
            <div 
              className="flex items-center space-x-2 text-white text-sm bg-black/50 rounded-full px-3 py-1 cursor-pointer hover:bg-black/70 transition-colors w-fit"
              onClick={createVideoWithMusic}
            >
              <Music className="w-4 h-4" />
              <span className="truncate max-w-48">{video.musicName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute right-4 bottom-20 flex flex-col space-y-4">
        <Button
          size="lg"
          variant="ghost"
          className={`rounded-full ${isLiked ? 'text-red-500' : 'text-white'} hover:scale-110 transition-transform`}
          onClick={handleLike}
        >
          <Heart className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
          <span className="sr-only">Like</span>
        </Button>
        <span className="text-white text-sm text-center font-medium">
          {formatCount(likesCount)}
        </span>

        <Button
          size="lg"
          variant="ghost"
          className="rounded-full text-white hover:scale-110 transition-transform"
          onClick={() => setShowComments(true)}
        >
          <MessageCircle className="w-8 h-8" />
          <span className="sr-only">Comment</span>
        </Button>
        <span className="text-white text-sm text-center font-medium">
          {formatCount(video.commentsCount || 0)}
        </span>

        <Button
          size="lg"
          variant="ghost"
          className="rounded-full text-white hover:scale-110 transition-transform"
          onClick={shareVideo}
        >
          <Share className="w-8 h-8" />
          <span className="sr-only">Share</span>
        </Button>
        <span className="text-white text-sm text-center font-medium">
          {formatCount(video.sharesCount || 0)}
        </span>

        <Button
          size="lg"
          variant="ghost"
          className="rounded-full text-white hover:scale-110 transition-transform"
        >
          <MoreHorizontal className="w-8 h-8" />
          <span className="sr-only">More</span>
        </Button>

        {/* Music Icon for Creating with Sound */}
        {video.musicName && (
          <Button
            size="lg"
            variant="ghost"
            className="rounded-full text-white hover:scale-110 transition-transform border-2 border-white"
            onClick={createVideoWithMusic}
            title={`Create video with "${video.musicName}"`}
          >
            <Music className="w-6 h-6" />
          </Button>
        )}
      </div>

      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
        currentUserId={user?.id}
      />
    </div>
  );
}