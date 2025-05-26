import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function useVideoActions(currentUserId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const likeMutation = useMutation({
    mutationFn: ({ videoId, isLiked }: { videoId: number; isLiked: boolean }) => {
      if (isLiked) {
        return apiRequest("DELETE", "/api/likes", { userId: currentUserId, videoId });
      } else {
        return apiRequest("POST", "/api/likes", { userId: currentUserId, videoId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const followMutation = useMutation({
    mutationFn: ({ followingId, isFollowing }: { followingId: number; isFollowing: boolean }) => {
      if (isFollowing) {
        return apiRequest("DELETE", "/api/follows", { followerId: currentUserId, followingId });
      } else {
        return apiRequest("POST", "/api/follows", { followerId: currentUserId, followingId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = (videoId: number, isLiked: boolean) => {
    if (!currentUserId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like videos.",
        variant: "destructive",
      });
      return;
    }
    
    likeMutation.mutate({ videoId, isLiked });
  };

  const handleFollow = (followingId: number, isFollowing = false) => {
    if (!currentUserId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to follow users.",
        variant: "destructive",
      });
      return;
    }

    followMutation.mutate({ followingId, isFollowing });
  };

  return {
    handleLike,
    handleFollow,
    isLiking: likeMutation.isPending,
    isFollowing: followMutation.isPending,
  };
}
