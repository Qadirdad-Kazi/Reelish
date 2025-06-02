import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Music, Play, VolumeX, Volume2, Bookmark, MoreVertical, Eye, EyeOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
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
    isFavorite?: boolean;
    isPrivate?: boolean;
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
  const [isFavorite, setIsFavorite] = useState(video.isFavorite || false);
  const [isFollowing, setIsFollowing] = useState(video.isFollowing || false);
  const [videoError, setVideoError] = useState(false);
  const [isPrivate, setIsPrivate] = useState(video.isPrivate || false);
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

  // State for likes count
  const [likesCount, setLikesCount] = useState<number>(video.likesCount || 0);

  // Like video functionality with proper authentication check
  const likeVideo = async () => {
    try {
      // Check authentication first
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        toast({
          title: "Authentication required",
          description: "Please sign in to like videos",
          variant: "destructive"
        });
        return;
      }

      // Toggle like state optimistically
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount((prev: number) => newLikedState ? prev + 1 : prev - 1);
      
      // Make API call
      const response = await fetch(`/api/videos/${video.id}/like`, {
        method: newLikedState ? 'POST' : 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Revert on error
        setIsLiked(!newLikedState);
        setLikesCount((prev: number) => !newLikedState ? prev + 1 : prev - 1);
        
        toast({
          title: "Error",
          description: "Failed to update like status",
          variant: "destructive"
        });
      } else {
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['video', video.id] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      }
    } catch (error) {
      console.error("Like error:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async () => {
    try {
      // Check authentication first
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save videos",
          variant: "destructive"
        });
        return;
      }
      
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      
      // Make API call
      const response = await fetch(`/api/videos/${video.id}/favorite`, {
        method: newFavoriteState ? 'POST' : 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Revert on error
        setIsFavorite(!newFavoriteState);
        
        toast({
          title: "Error",
          description: "Failed to update favorite status",
          variant: "destructive"
        });
      } else {
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['video', video.id] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
        
        toast({
          title: newFavoriteState ? "Saved" : "Removed",
          description: newFavoriteState ? "Video saved to your profile" : "Video removed from saved",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Favorite error:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const followUser = async () => {
    try {
      // Check authentication first
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        toast({
          title: "Authentication required",
          description: "Please sign in to follow users",
          variant: "destructive"
        });
        return;
      }

      // Toggle follow state optimistically
      const newFollowStatus = !isFollowing;
      setIsFollowing(newFollowStatus);
      
      // Make API call
      let response;
      if (newFollowStatus) {
        // Follow user
        response = await fetch('/api/follows', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ followingId: video.user.id })
        });
      } else {
        // Unfollow user
        response = await fetch(`/api/follows/${video.user.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      }
      
      if (!response.ok) {
        // Revert on error
        setIsFollowing(!newFollowStatus);
        
        toast({
          title: "Error",
          description: "Failed to update follow status",
          variant: "destructive"
        });
      } else {
        toast({
          title: newFollowStatus ? "Following!" : "Unfollowed",
          description: newFollowStatus ? `You are now following ${video.user.username}` : `You unfollowed ${video.user.username}`,
        });
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        // Invalidate follow status queries
        queryClient.invalidateQueries({ queryKey: ['/api/follows'] });
        // Invalidate profile queries that might contain follow counts
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        // Invalidate any specific follow status queries
        if (video.user && video.user.id) {
          queryClient.invalidateQueries({ queryKey: [`follow-status-${video.user.id}`] });
        }
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const createVideoWithMusic = () => {
    if (!video.musicName) return;
    
    toast({
      title: "Create with this sound",
      description: `Using "${video.musicName}" for your video`,
    });
    // Navigate to upload page with music preset
    window.location.href = `/upload?music=${encodeURIComponent(video.musicName)}`;
  };

  const [showShareOptions, setShowShareOptions] = useState(false);
  
  // Function to toggle video privacy
  const togglePrivacy = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to change video privacy settings",
        variant: "destructive"
      });
      return;
    }
    
    // Only allow the video owner to change privacy
    if (user.id !== video.user.id) {
      toast({
        title: "Permission denied",
        description: "You can only change privacy settings for your own videos",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/videos/${video.id}/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isPrivate: !isPrivate })
      });
      
      if (!response.ok) {
        throw new Error(`Error updating privacy: ${response.statusText}`);
      }
      
      await response.json(); // Get result but we don't need to use it
      
      // Update local state
      setIsPrivate(!isPrivate);
      
      // Show success message
      toast({
        title: "Privacy updated",
        description: `Video is now ${!isPrivate ? 'private' : 'public'}`,
        variant: "default"
      });
      
      // Invalidate queries to refresh video data
      queryClient.invalidateQueries({ queryKey: [`/api/videos`] });
      
    } catch (error) {
      console.error('Error updating video privacy:', error);
      toast({
        title: "Error updating privacy",
        description: (error as Error).message || "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const shareVideo = () => {
    // Toggle share options dropdown
    setShowShareOptions(!showShareOptions);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Video link copied to clipboard",
    });
    setShowShareOptions(false);
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(`${window.location.origin}/video/${video.id}`);
    const text = encodeURIComponent(`Check out this video on Reelish: ${video.description?.substring(0, 50)}${video.description && video.description.length > 50 ? '...' : ''}`);
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text} ${url}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareOptions(false);
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
                src={video.user.profileImageUrl ? `${window.location.origin}${video.user.profileImageUrl}` : `https://ui-avatars.com/api/?name=${video.user.username}`}
                alt={video.user.username}
                className="w-10 h-10 rounded-full border-2 border-white cursor-pointer object-cover"
                onError={(e) => {
                  console.error('Profile image failed to load:', video.user.profileImageUrl);
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${video.user.username}`;
                }}
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
                onClick={followUser}
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
      <div className="absolute bottom-16 right-0 flex flex-col items-center space-y-4">
        <button
          className="bg-transparent text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
          onClick={likeVideo}
        >
          <Heart className={`w-8 h-8 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          <span className="sr-only">Like</span>
        </button>
        <span className="text-white text-xs">{formatCount(likesCount)}</span>

        <button
          className="bg-transparent text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
          onClick={() => setShowComments(true)}
        >
          <MessageCircle className="w-8 h-8" />
          <span className="sr-only">Comment</span>
        </button>
        <span className="text-white text-xs">{formatCount(video.commentsCount || 0)}</span>

        <div className="relative">
          <button
            className="bg-transparent text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
            onClick={shareVideo}
          >
            <Share className="w-8 h-8" />
            <span className="sr-only">Share</span>
          </button>
          <span className="text-white text-xs">{formatCount(video.sharesCount || 0)}</span>
          
          {showShareOptions && (
            <div className="absolute right-12 bottom-0 bg-gray-900 rounded-lg shadow-lg p-3 w-48 z-50 border border-gray-700">
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={copyLink}
                  className="flex items-center space-x-2 text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Copy Link</span>
                </button>
                
                <button 
                  onClick={() => shareToSocial('twitter')}
                  className="flex items-center space-x-2 text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.1 10.1 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <span className="text-sm">Twitter</span>
                </button>
                
                <button 
                  onClick={() => shareToSocial('facebook')}
                  className="flex items-center space-x-2 text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-sm">Facebook</span>
                </button>
                
                <button 
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex items-center space-x-2 text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-sm">WhatsApp</span>
                </button>
                
                <button 
                  onClick={() => shareToSocial('telegram')}
                  className="flex items-center space-x-2 text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  <span className="text-sm">Telegram</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative mt-4">
          <button
            className="bg-transparent text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
            onClick={toggleFavorite}
          >
            <Bookmark className={`w-8 h-8 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            <span className="sr-only"></span>
          </button>
          <span className="text-white text-xs"></span>
        </div>
        
        {/* Options Menu (3-dots) */}
        {user && user.id === video.user.id && (
          <div className="relative mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="bg-transparent text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  <MoreVertical className="w-8 h-8" />
                  <span className="sr-only">Options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 text-white border-gray-700">
                <DropdownMenuItem onClick={togglePrivacy} className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800">
                  {isPrivate ? (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Make Public</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      <span>Make Private</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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