import { useState } from "react";
import { VideoWithUser } from "@shared/schema";
import { Heart, MessageCircle, Share2, Music, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber, formatTimeAgo } from "@/lib/utils";
import { motion } from "framer-motion";
import useVideoActions from "@/hooks/useVideoActions";
import CommentsModal from "./CommentsModal";

interface VideoPlayerProps {
  video: VideoWithUser;
  isActive: boolean;
  currentUserId?: number;
}

export default function VideoPlayer({ video, isActive, currentUserId }: VideoPlayerProps) {
  const [showComments, setShowComments] = useState(false);
  const { handleLike, handleFollow, isLiking, isFollowing } = useVideoActions(currentUserId);

  const onLike = () => {
    if (currentUserId) {
      handleLike(video.id, video.isLiked || false);
    }
  };

  const onFollow = () => {
    if (currentUserId && !video.isFollowing) {
      handleFollow(video.user.id);
    }
  };

  const onShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <div className="video-container h-screen relative flex items-center justify-center bg-gray-900">
        {/* Video/Image Display */}
        <img
          src={video.videoUrl}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 gradient-overlay" />
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 flex">
          {/* Left side - Video info */}
          <div className="flex-1 flex flex-col justify-end p-4 pb-20">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12 border-2 border-white">
                  <AvatarImage src={video.user.avatar} alt={video.user.username} />
                  <AvatarFallback>{video.user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-white">@{video.user.username}</span>
                {!video.isFollowing && currentUserId && (
                  <Button
                    onClick={onFollow}
                    disabled={isFollowing}
                    className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black text-sm px-4 py-1 h-auto font-medium"
                  >
                    Follow
                  </Button>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white">
                {video.description}
              </p>
              {video.musicName && (
                <div className="flex items-center space-x-2">
                  <Music className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">{video.musicName}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex flex-col justify-end items-center space-y-6 p-4 pb-20">
            {/* Like Button */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={onLike}
                disabled={isLiking}
                variant="ghost"
                size="icon"
                className="w-12 h-12 bg-gray-800/50 rounded-full hover:bg-tiktok-pink/20 transition-all duration-300"
              >
                <motion.div
                  animate={video.isLiked ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Heart 
                    className={`w-6 h-6 ${video.isLiked ? 'text-tiktok-pink fill-current' : 'text-white'}`} 
                  />
                </motion.div>
              </Button>
              <span className="text-xs font-medium text-white">
                {formatNumber(video.likesCount)}
              </span>
            </div>
            
            {/* Comment Button */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={() => setShowComments(true)}
                variant="ghost"
                size="icon"
                className="w-12 h-12 bg-gray-800/50 rounded-full hover:bg-gray-600 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </Button>
              <span className="text-xs font-medium text-white">
                {formatNumber(video.commentsCount)}
              </span>
            </div>
            
            {/* Share Button */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={onShare}
                variant="ghost"
                size="icon"
                className="w-12 h-12 bg-gray-800/50 rounded-full hover:bg-gray-600 transition-colors"
              >
                <Share2 className="w-6 h-6 text-white" />
              </Button>
              <span className="text-xs font-medium text-white">
                {formatNumber(video.sharesCount)}
              </span>
            </div>
            
            {/* Profile Music Disc */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-tiktok-pink to-tiktok-cyan p-0.5 animate-spin-slow">
              <Avatar className="w-full h-full">
                <AvatarImage src={video.user.avatar} alt={video.user.username} />
                <AvatarFallback className="bg-gray-800 text-white">
                  {video.user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
        currentUserId={currentUserId}
      />
    </>
  );
}
