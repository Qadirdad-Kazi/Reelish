import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Send, MoreHorizontal, Reply, MessageCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: number;
  currentUserId?: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  replies?: Comment[];
}

export default function CommentsModal({ isOpen, onClose, videoId, currentUserId }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/videos/${videoId}/comments`],
    enabled: isOpen,
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: number }) => 
      apiRequest("/api/comments", "POST", { videoId, content: data.content, parentId: data.parentId }),
    onSuccess: () => {
      setNewComment("");
      setReplyText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
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
    mutationFn: (commentId: number) => {
      const comment = comments.find((c: Comment) => c.id === commentId);
      return comment?.isLiked 
        ? apiRequest(`/api/likes?commentId=${commentId}`, "DELETE")
        : apiRequest("/api/likes", "POST", { commentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment });
  };

  const handleReply = (commentId: number) => {
    if (!replyText.trim()) return;
    createCommentMutation.mutate({ content: replyText, parentId: commentId });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`flex space-x-3 ${isReply ? 'ml-8 mt-3' : ''}`}>
      <Link href={`/profile/${comment.user.id}`}>
        <img
          src={comment.user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
          alt={comment.user.username}
          className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-pink-500"
        />
      </Link>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <Link href={`/profile/${comment.user.id}`}>
            <span className="font-semibold text-sm hover:text-pink-400 cursor-pointer">
              @{comment.user.username}
            </span>
          </Link>
          <span className="text-gray-400 text-xs">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-100 mt-1">{comment.content}</p>
        <div className="flex items-center space-x-4 mt-2">
          <button 
            className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
              comment.isLiked ? 'text-red-500' : 'text-gray-400'
            }`}
            onClick={() => likeCommentMutation.mutate(comment.id)}
          >
            <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{comment.likesCount || 0}</span>
          </button>
          {!isReply && (
            <button 
              className="text-gray-400 hover:text-white text-xs flex items-center space-x-1"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}
        </div>
        
        {/* Reply Form */}
        {replyTo === comment.id && (
          <div className="mt-3 flex space-x-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to @${comment.user.username}...`}
              className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReply(comment.id);
                }
              }}
            />
            <Button 
              size="sm" 
              className="bg-pink-600 hover:bg-pink-700"
              onClick={() => handleReply(comment.id)}
              disabled={!replyText.trim() || createCommentMutation.isPending}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black border-gray-800 text-white h-[700px] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-xl">Comments ({comments.length})</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-lg mb-2">No comments yet</p>
              <p className="text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {comments.map((comment: Comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input */}
        <div className="border-t border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <img
              src={currentUserId ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}` : '/default-avatar.png'}
              alt="Your avatar"
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-pink-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="bg-pink-600 hover:bg-pink-700 transition-colors"
                disabled={!newComment.trim() || createCommentMutation.isPending}
              >
                {createCommentMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to post • Be respectful and kind
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}