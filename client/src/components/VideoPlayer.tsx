import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Music, MoreHorizontal, Play, Pause, VolumeX, Volume2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
    description?: string;
    videoUrl: string;
    musicName?: string;
    hashtags?: string[];
    isLiked?: boolean;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    user: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
    isFollowing?: boolean;
  };
  isActive?: boolean;
}

export default function VideoPlayer({ video, isActive = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked || false);
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [isFollowing, setIsFollowing] = useState(video.isFollowing || false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      videoElement.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

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
    mutationFn: () => 
      isLiked 
        ? apiRequest(`/api/likes?videoId=${video.id}`, "DELETE")
        : apiRequest("/api/likes", "POST", { videoId: video.id }),
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Please log in to like videos",
        variant: "destructive",
      });
    },
  });

  const followMutation = useMutation({
    mutationFn: () => 
      isFollowing 
        ? apiRequest(`/api/follows/${video.user.id}`, "DELETE")
        : apiRequest("/api/follows", "POST", { followingId: video.user.id }),
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
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      {/* Video */}
      <div className="relative max-w-sm h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          src={video.videoUrl}
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
        />
        
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
          onClick={() => likeMutation.mutate()}
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