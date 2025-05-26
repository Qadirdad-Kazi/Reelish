import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CommentWithUser } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, X } from "lucide-react";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: number;
  currentUserId?: number;
}

export default function CommentsModal({ isOpen, onClose, videoId, currentUserId }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/videos/${videoId}/comments`, currentUserId],
    queryFn: () => 
      fetch(`/api/videos/${videoId}/comments${currentUserId ? `?userId=${currentUserId}` : ''}`)
        .then(res => res.json()),
    enabled: isOpen,
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/comments", {
        videoId,
        userId: currentUserId,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/videos`] });
      setNewComment("");
      toast({
        title: "Comment posted!",
        description: "Your comment has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: ({ commentId, isLiked }: { commentId: number; isLiked: boolean }) => {
      if (isLiked) {
        return apiRequest("DELETE", "/api/likes", { userId: currentUserId, commentId });
      } else {
        return apiRequest("POST", "/api/likes", { userId: currentUserId, commentId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
    },
  });

  const handlePostComment = () => {
    if (!currentUserId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to post comments.",
        variant: "destructive",
      });
      return;
    }

    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const handleLikeComment = (commentId: number, isLiked: boolean) => {
    if (!currentUserId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like comments.",
        variant: "destructive",
      });
      return;
    }

    likeCommentMutation.mutate({ commentId, isLiked });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tiktok-dark border-gray-800 text-white h-[80vh] max-w-md mx-auto flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Comments</DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-tiktok-light-gray">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-tiktok-light-gray mb-2">No comments yet</div>
              <div className="text-sm text-tiktok-light-gray">Be the first to comment!</div>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                  <AvatarFallback>{comment.user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white text-sm">
                      {comment.user.username}
                    </span>
                    <span className="text-tiktok-light-gray text-xs">
                      {formatTimeAgo(comment.createdAt!)}
                    </span>
                  </div>
                  <p className="text-white text-sm break-words">{comment.content}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-tiktok-light-gray hover:text-white p-0 h-auto text-xs"
                    >
                      Reply
                    </Button>
                    <Button
                      onClick={() => handleLikeComment(comment.id, comment.isLiked || false)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-tiktok-light-gray hover:text-white p-0 h-auto"
                    >
                      <Heart className={`w-3 h-3 ${comment.isLiked ? 'text-tiktok-pink fill-current' : ''}`} />
                      <span className="text-xs">{formatNumber(comment.likesCount)}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="flex-shrink-0 border-t border-gray-800 p-4">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" alt="You" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-tiktok-gray border-gray-700 text-white placeholder-tiktok-light-gray focus:border-tiktok-pink rounded-full"
              />
              <Button
                onClick={handlePostComment}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black font-medium rounded-full px-6"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
