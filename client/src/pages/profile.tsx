import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// UI components
import { Heart, Loader2, LogOut, MoreVertical, Trash, Edit, Play } from "lucide-react";
import MiniPlayer from "@/components/MiniPlayer";
import { formatNumber } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import CreateVideoBar from "@/components/CreateVideoBar";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import useVideoActions from "@/hooks/useVideoActions";
import CommentsModal from "@/components/CommentsModal";
import type { Video } from "@/types/video";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  bio: string;
  profileImageUrl: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { userId: urlUserId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Check authentication on component mount
  useEffect(() => {
    // If not authenticated and not in the process of loading, redirect to login
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok && response.status === 401) {
          console.log('Authentication check failed, redirecting to login');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    
    checkAuth();
  }, []);
  
  // State for UI components
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState<Video | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'private' | 'saved' | 'likes'>('videos');
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [privateVideos, setPrivateVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    bio: "",
    profileImageUrl: ""
  });
  
  // File upload state
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  // Image cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");

  // Determine which user profile to show
  const userId = urlUserId || (currentUser?.id || "");
  const isOwnProfile = currentUser?.id === userId;
  
  // Fetch user data
  const { data: userData, isLoading: isUserLoading, error: userError, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      console.log(`Fetching user data for ID: ${userId}`);
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch user data");
      }
      const data = await response.json();
      console.log('User data from API:', data);
      console.log('Profile image URL:', data.user?.profileImageUrl);
      return data;
    },
    enabled: !!userId
  });

  // Fetch user videos
  const { data: videosData, isLoading: isVideosLoading } = useQuery({
    queryKey: [`user-videos-${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/videos`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user videos");
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch user's liked videos (only for own profile)
  const { data: likedVideosData, isLoading: isLikedVideosLoading, error: likedVideosError, refetch: refetchLikedVideos } = useQuery({
    queryKey: [`user-liked-videos-${userId}`],
    queryFn: async () => {
      try {
        // Only fetch liked videos if we're authenticated and viewing our own profile
        if (!isAuthenticated || !isOwnProfile) {
          console.log("Not authenticated or not own profile, skipping liked videos fetch");
          return [];
        }
        
        console.log("Fetching liked videos for current user");
        
        // First ensure we're logged in by checking auth status
        const authCheckResponse = await fetch('/api/auth/me', {
          credentials: "include"
        });
        
        if (!authCheckResponse.ok) {
          console.error(`Auth check failed: ${authCheckResponse.status}`);
          throw new Error('Authentication required');
        }
        
        // Use 'current' instead of the userId to ensure we're getting the authenticated user's likes
        const response = await fetch(`/api/users/current/liked-videos`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch liked videos: ${response.status} ${errorText}`);
          throw new Error(`Failed to fetch liked videos: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Liked videos data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching liked videos:", error);
        throw error;
      }
    },
    enabled: isAuthenticated && isOwnProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
  
  // Fetch favorite/saved videos
  const { data: favoriteVideosData, error: favoriteVideosError, isLoading: isFavoriteVideosLoading } = useQuery({
    queryKey: [`user-${userId}-favorites`],
    queryFn: async () => {
      try {
        console.log("Fetching favorite videos for user:", userId);
        const response = await fetch(`/api/users/${userId}/favorites`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch favorite videos: ${response.status} ${errorText}`);
          throw new Error(`Failed to fetch favorite videos: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Favorite videos data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching favorite videos:", error);
        throw error;
      }
    },
    enabled: isAuthenticated && isOwnProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
  
  useEffect(() => {
    if (videosData && Array.isArray(videosData) && videosData.length > 0 && isOwnProfile) {
      // Filter actual private videos from the user's videos
      const realPrivateVideos = videosData.filter(video => video.isPrivate === true);
      setPrivateVideos(realPrivateVideos);
    }
  }, [videosData, isOwnProfile]);
  
  // Set favorite/saved videos from API data when available
  useEffect(() => {
    if (favoriteVideosData && Array.isArray(favoriteVideosData)) {
      console.log("Setting favorite videos from API data:", favoriteVideosData);
      setSavedVideos(favoriteVideosData);
    }
    
    if (favoriteVideosError) {
      console.error("Favorite videos error in useEffect:", favoriteVideosError);
      toast({
        title: "Error loading saved videos",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }, [favoriteVideosData, favoriteVideosError, toast]);
  
  // Set liked videos from API data when available
  useEffect(() => {
    if (likedVideosData && Array.isArray(likedVideosData)) {
      console.log("Setting liked videos from API data:", likedVideosData);
      setLikedVideos(likedVideosData);
    }
    
    if (likedVideosError) {
      console.error("Liked videos error in useEffect:", likedVideosError);
      toast({
        title: "Error loading liked videos",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }, [likedVideosData, likedVideosError, toast]);

  // Get follow status from user data instead of making a separate API call
  // The isFollowing property is already included in the user profile response

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error("You must be logged in to follow users");
      }
      
      const isCurrentlyFollowing = userData?.user?.isFollowing;
      
      if (isCurrentlyFollowing) {
        // Unfollow - DELETE request to /api/follows/:userId
        const response = await fetch(`/api/follows/${userId}`, {
          method: "DELETE",
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to unfollow user");
        }
        
        return response.json();
      } else {
        // Follow - POST request to /api/follows
        const response = await fetch(`/api/follows`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ followingId: userId })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to follow user");
        }
        
        return response.json();
      }
    },
    onSuccess: () => {
      // Only need to invalidate the user query since we're not using a separate follow-status query
      queryClient.invalidateQueries({ queryKey: [`user-${userId}`] });
      
      toast({
        title: userData?.user?.isFollowing ? "Unfollowed" : "Following",
        description: userData?.user?.isFollowing 
          ? `You are no longer following ${userData?.user?.username}`
          : `You are now following ${userData?.user?.username}`,
        duration: 3000
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 3000
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!isAuthenticated || !isOwnProfile) {
        throw new Error("You can only edit your own profile");
      }
      
      // Use FormData to handle file uploads
      const formDataToSend = new FormData();
      formDataToSend.append("firstName", data.firstName);
      formDataToSend.append("lastName", data.lastName);
      formDataToSend.append("bio", data.bio);
      
      // If we have a file, append it, otherwise use the URL
      if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
      } else if (data.profileImageUrl) {
        formDataToSend.append("profileImageUrl", data.profileImageUrl);
      }
      
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        // Don't set Content-Type header when using FormData
        // The browser will set it automatically with the correct boundary
        credentials: "include",
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowEditModal(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
        duration: 3000
      });
      
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      
      // Force refetch to update UI immediately
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
        duration: 3000
      });
    }
  });

  // Initialize form data when user data is loaded
  const openEditModal = () => {
    if (userData?.user) {
      setFormData({
        firstName: userData.user.firstName || "",
        lastName: userData.user.lastName || "",
        bio: userData.user.bio || "",
        profileImageUrl: userData.user.profileImageUrl || ""
      });
      
      // Reset file state
      setProfileImage(null);
      
      // If user has a profile image, show it in the preview
      if (userData.user.profileImageUrl) {
        setPreviewUrl(userData.user.profileImageUrl);
      } else {
        setPreviewUrl("");
      }
      
      setShowEditModal(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Function to center and create an initial crop with aspect ratio
  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ): Crop {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    )
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      
      // Create a preview URL for the image and show cropper
      const fileUrl = URL.createObjectURL(file);
      setOriginalImageUrl(fileUrl);
      setShowCropper(true);
    }
  };
  
  // Handle image load in cropper
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a circular crop (1:1 aspect ratio)
    const crop = centerAspectCrop(width, height, 1);
    setCrop(crop);
  };
  
  // Clear the file input
  const handleClearFile = () => {
    setProfileImage(null);
    setPreviewUrl("");
    setOriginalImageUrl("");
    setShowCropper(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };
  
  // Apply the crop and generate the final image
  const handleCropComplete = (crop: Crop) => {
    setCompletedCrop(crop);
  };
  
  // Apply the crop and generate the final image
  const applyCrop = () => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      canvasRef.current
    ) {
      // Get the canvas context
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return;
      }
      
      // Set canvas dimensions to match the crop size
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      // Make the canvas a perfect square for profile picture
      const size = Math.min(300, 300); // Max size of 300x300 pixels
      canvas.width = size;
      canvas.height = size;
      
      // Draw a circle for the profile picture
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw the cropped image on the canvas
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        size,
        size
      );
      
      // Convert canvas to blob and create a File object
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          // Create a new File object from the blob
          const croppedFile = new File([blob], 'profile-image.png', { type: 'image/png' });
          setProfileImage(croppedFile);
          
          // Create a preview URL for the cropped image
          const croppedUrl = URL.createObjectURL(blob);
          setPreviewUrl(croppedUrl);
          
          // Hide the cropper
          setShowCropper(false);
        }
      }, 'image/png');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleFollowToggle = () => {
    followMutation.mutate();
  };

  // Video interaction handlers
  const { handleLike } = useVideoActions(isAuthenticated ? userData?.user?.id : undefined);

  const handleVideoClick = (video: Video) => {
    setMiniPlayerVideo(video);
    setShowMiniPlayer(true);
  };

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete video");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the videos query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`user-videos-${userId}`] });
      toast({
        title: "Video deleted",
        description: "Your video has been deleted successfully",
        duration: 3000
      });
      setShowDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
        duration: 3000
      });
      setShowDeleteConfirm(null);
    }
  });

  const closeMiniPlayer = () => {
    setShowMiniPlayer(false);
    setMiniPlayerVideo(null);
  };

  const expandMiniPlayer = () => {
    if (miniPlayerVideo) {
      // Navigate to full video page or expand the player
      window.location.href = `/video/${miniPlayerVideo.id}`;
    }
  };

  // Function to open comments modal
  const openComments = (video: Video) => {
    setSelectedVideo(video);
    setShowCommentsModal(true);
  };

  // Share video function - using Web Share API with fallback
  const handleShare = (video: Video) => {
    // Share functionality
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description || 'Check out this video!',
        url: `${window.location.origin}/video/${video.id}`
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback for browsers that don't support navigator.share
      const shareUrl = `${window.location.origin}/video/${video.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Video link copied to clipboard",
        duration: 3000
      });
    }
  };
  
  // Add share and comment buttons to video items
  const renderVideoActions = (video: Video) => {
    return (
      <div className="absolute bottom-1 right-1 flex space-x-1">
        <div 
          className="p-1 bg-black/30 rounded-full" 
          onClick={(e) => {
            e.stopPropagation();
            openComments(video);
          }}
        >
          <Play className="h-3 w-3 text-white" />
        </div>
        <div 
          className="p-1 bg-black/30 rounded-full" 
          onClick={(e) => {
            e.stopPropagation();
            handleShare(video);
          }}
        >
          <LogOut className="h-3 w-3 text-white" />
        </div>
      </div>
    );
  };

  // Loading states
  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  // Error states
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">Error Loading Profile</h2>
          <p className="mt-2 text-gray-600">{(userError as Error).message || "Failed to load user profile"}</p>
          <Button className="mt-4" onClick={() => window.location.href = "/"}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const user = userData?.user;
  // Handle array format from server and filter out private videos for public display
  const allVideos = videosData && Array.isArray(videosData) ? videosData : [];
  // For the public videos tab, only show non-private videos
  const videos = allVideos.filter(video => !video.isPrivate);
  const isFollowing = userData?.user?.isFollowing || false;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Profile Header - Smaller Size */}
      <div className="container px-4 pt-2 pb-8 md:pt-4">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-background relative overflow-hidden">
            <AvatarImage 
              src={user?.profileImageUrl ? `${window.location.origin}${user.profileImageUrl}` : `https://ui-avatars.com/api/?name=${user?.username}`} 
              alt={user?.username || 'User'}
              className="object-cover w-full h-full"
              onError={(e) => {
                console.error('Image failed to load:', user?.profileImageUrl);
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.username}`;
              }}
            />
            <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h1 className="text-lg md:text-xl font-bold">{(user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : user?.username}</h1>
            <p className="text-xs text-muted-foreground">@{user?.username}</p>
            
            {user?.bio && (
              <p className="mt-1 text-xs max-w-xs text-center">{user.bio}</p>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex space-x-6 text-center">
            <div>
              <p className="text-sm font-semibold">{formatNumber(userData?.user?.stats?.videoCount || 0)}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{formatNumber(userData?.user?.stats?.followerCount || 0)}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{formatNumber(userData?.user?.stats?.followingCount || 0)}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {isOwnProfile ? (
              <>
                <Button onClick={openEditModal} variant="outline" className="px-6">
                  Edit Profile
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      // Show loading toast
                      toast({
                        title: "Logging out",
                        description: "Please wait...",
                        duration: 2000
                      });
                      
                      // Clear any cached data first
                      queryClient.clear();
                      
                      // Call the logout endpoint directly to ensure it completes
                      const response = await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include' // Important for cookies/session
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Logged out",
                          description: "You have been successfully logged out",
                          duration: 3000
                        });
                        
                        // Force a full page reload to clear all state
                        window.location.href = '/login';
                      } else {
                        throw new Error('Logout failed');
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to log out. Please try again.",
                        variant: "destructive",
                        duration: 3000
                      });
                    }
                  }} 
                  variant="destructive" 
                  className="px-6"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleFollowToggle} 
                variant={isFollowing ? "outline" : "default"}
                disabled={followMutation.isPending || !isAuthenticated}
                className="px-6"
              >
                {followMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
        </div>
        
        {/* Videos Section */}
        <div className="mt-8">
          <div className="w-full">
            <div className="flex border-b overflow-x-auto no-scrollbar">
              <button 
                className={`px-4 py-2 text-xs font-medium ${activeTab === 'videos' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('videos')}
              >
                Public
              </button>
              {isOwnProfile && (
                <>
                  <button 
                    className={`px-4 py-2 text-xs font-medium ${activeTab === 'private' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('private')}
                  >
                    Private
                  </button>
                  <button 
                    className={`px-4 py-2 text-xs font-medium ${activeTab === 'saved' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('saved')}
                  >
                    Saved
                  </button>
                  <button 
                    className={`px-4 py-2 text-xs font-medium ${activeTab === 'likes' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('likes')}
                  >
                    Likes
                  </button>
                </>
              )}
            </div>
            
            {/* Public Videos Tab */}
            {activeTab === 'videos' && (
              <div className="mt-4">
                {isVideosLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No videos yet</p>
                    {isOwnProfile && (
                      <Button className="mt-4" onClick={() => window.location.href = "/upload"}>
                        Upload a Video
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {videos.map((video: Video) => (
                    <div 
                      key={video.id} 
                      className="aspect-[9/16] relative overflow-hidden bg-gray-100 rounded-md cursor-pointer"
                      onClick={() => handleVideoClick(video)}
                    >
                      <img 
                        src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/600`}
                        alt={video.title || "Video thumbnail"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 flex items-center text-white text-xs">
                        <Play className="h-3 w-3 mr-1" />
                        <span>{formatNumber(video.viewsCount || 0)}</span>
                      </div>
                      <div 
                        className="absolute top-1 right-1 p-1 bg-black/30 rounded-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(Number(video.id), video.isLiked || false);
                        }}
                      >
                        <Heart 
                          className={`h-3 w-3 ${video.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} 
                        />
                      </div>
                      {renderVideoActions(video)}
                      
                      {/* Kebab Menu - Only show for own videos */}
                      {isOwnProfile && (
                        <div 
                          className="absolute top-1 left-1 p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                                <MoreVertical className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-32">
                              <DropdownMenuItem
                                className="text-xs cursor-pointer flex items-center gap-1"
                                onClick={() => {
                                  // For now, just show a toast since we don't have an update endpoint
                                  toast({
                                    title: "Edit video",
                                    description: "Edit functionality coming soon",
                                    duration: 3000
                                  });
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs cursor-pointer flex items-center gap-1 text-red-500 focus:text-red-500"
                                onClick={() => setShowDeleteConfirm(Number(video.id))}
                              >
                                <Trash className="h-3 w-3 mr-1" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      
                      {/* Delete Confirmation */}
                      {showDeleteConfirm === Number(video.id) && (
                        <div 
                          className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-white text-xs text-center mb-2">Are you sure you want to delete this video?</p>
                          <div className="flex gap-2">
                            <button 
                              className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                              onClick={() => deleteVideoMutation.mutate(Number(video.id))}
                            >
                              {deleteVideoMutation.isPending ? "Deleting..." : "Delete"}
                            </button>
                            <button 
                              className="bg-gray-500 text-white text-xs px-2 py-1 rounded"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Private Videos Tab - Only for own profile */}
            {activeTab === 'private' && isOwnProfile && (
              <div className="mt-4">
                {privateVideos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No private videos</p>
                    <p className="text-xs text-muted-foreground mt-1">Videos you set to private will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {privateVideos.map((video: Video) => (
                      <div 
                        key={`private-${video.id}`} 
                        className="aspect-[9/16] relative overflow-hidden bg-gray-100 rounded-md cursor-pointer"
                        onClick={() => handleVideoClick(video)}
                      >
                        <div className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-bl-md">
                          Private
                        </div>
                        <img 
                          src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/600`}
                          alt={video.title || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 flex items-center text-white text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          <span>{formatNumber(video.viewsCount || 0)}</span>
                        </div>
                        {renderVideoActions(video)}
                        
                        {/* Kebab Menu */}
                        <div 
                          className="absolute top-1 left-1 p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                                <MoreVertical className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-32">
                              <DropdownMenuItem
                                className="text-xs cursor-pointer flex items-center gap-1"
                                onClick={() => {
                                  toast({
                                    title: "Make Public",
                                    description: "This feature is coming soon",
                                    duration: 3000
                                  });
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Make Public
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs cursor-pointer flex items-center gap-1 text-red-500 focus:text-red-500"
                                onClick={() => setShowDeleteConfirm(Number(video.id))}
                              >
                                <Trash className="h-3 w-3 mr-1" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Delete Confirmation */}
                        {showDeleteConfirm === Number(video.id) && (
                          <div 
                            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-white text-xs text-center mb-2">Are you sure you want to delete this video?</p>
                            <div className="flex gap-2">
                              <button 
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                                onClick={() => deleteVideoMutation.mutate(Number(video.id))}
                              >
                                {deleteVideoMutation.isPending ? "Deleting..." : "Delete"}
                              </button>
                              <button 
                                className="bg-gray-500 text-white text-xs px-2 py-1 rounded"
                                onClick={() => setShowDeleteConfirm(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Saved Videos Tab - Only for own profile */}
            {activeTab === 'saved' && isOwnProfile && (
              <div className="mt-4">
                {isFavoriteVideosLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : savedVideos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No saved videos</p>
                    <p className="text-xs text-muted-foreground mt-1">Videos you save will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {savedVideos.map((video: Video) => (
                      <div 
                        key={`saved-${video.id}`} 
                        className="aspect-[9/16] relative overflow-hidden bg-gray-100 rounded-md cursor-pointer"
                        onClick={() => handleVideoClick(video)}
                      >
                        <div className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-bl-md">
                          Saved
                        </div>
                        <img 
                          src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/600`}
                          alt={video.title || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 flex items-center text-white text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          <span>{formatNumber(video.viewsCount || 0)}</span>
                        </div>
                        <div 
                          className="absolute top-1 right-1 p-1 bg-black/30 rounded-full" 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Call the API to remove from favorites
                              const response = await fetch(`/api/videos/${video.id}/favorite`, {
                                method: 'DELETE',
                                credentials: 'include',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to remove from favorites');
                              }
                              
                              // Remove from saved videos locally
                              setSavedVideos(savedVideos.filter(v => v.id !== video.id));
                              
                              // Invalidate queries
                              queryClient.invalidateQueries({ queryKey: ['favorites'] });
                              queryClient.invalidateQueries({ queryKey: [`user-${userId}-favorites`] });
                              
                              toast({
                                title: "Unsaved",
                                description: "Video removed from saved",
                                duration: 3000
                              });
                            } catch (error) {
                              console.error('Error removing from favorites:', error);
                              toast({
                                title: "Error",
                                description: "Failed to remove from saved videos",
                                variant: "destructive",
                                duration: 3000
                              });
                            }
                          }}
                        >
                          <Trash className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Likes Tab */}
            {activeTab === 'likes' && (
              <div className="mt-4">
                {isLikedVideosLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : likedVideos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No liked videos yet</p>
                    {isOwnProfile && (
                      <>
                        <p className="text-sm text-muted-foreground mt-2">
                          Like videos to see them here
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => {
                            // Use the refetch function directly instead of invalidating the query
                            refetchLikedVideos();
                            toast({
                              title: "Refreshing liked videos",
                              description: "Checking for your latest likes"
                            });
                          }}
                        >
                          Refresh Liked Videos
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {likedVideos.map((video: Video) => (
                      <div 
                        key={video.id} 
                        className="aspect-[9/16] relative overflow-hidden bg-gray-100 rounded-md cursor-pointer"
                        onClick={() => handleVideoClick(video)}
                      >
                        <img 
                          src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/600`}
                          alt={video.title || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 flex items-center text-white text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          <span>{formatNumber(video.viewsCount || 0)}</span>
                        </div>
                        <div className="absolute top-1 right-1 p-1 bg-red-500 rounded-full">
                          <Heart className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <div className="mt-auto">
        <CreateVideoBar />
        <BottomNavigation />
      </div>
      
      {/* Mini Player */}
      {showMiniPlayer && miniPlayerVideo && (
        <MiniPlayer 
          video={miniPlayerVideo} 
          onClose={closeMiniPlayer} 
          onExpand={expandMiniPlayer} 
        />
      )}
      
      {/* Comments Modal */}
      {showCommentsModal && selectedVideo && (
        <CommentsModal
          videoId={Number(selectedVideo.id)}
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          currentUserId={currentUser?.id}
        />
      )}
      
      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Your first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Your last name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image</Label>
              
              {/* Current profile image preview */}
              {previewUrl && !showCropper && (
                <div className="mb-2 flex flex-col items-center">
                  <img 
                    src={previewUrl} 
                    alt="Profile preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" 
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearFile}
                    className="mt-1 text-xs text-red-500"
                  >
                    Remove image
                  </Button>
                </div>
              )}
              
              {/* Image cropper */}
              {showCropper && originalImageUrl && (
                <div className="mb-4 flex flex-col items-center">
                  <div className="mb-2">
                    <ReactCrop
                      crop={crop}
                      onChange={(c: Crop) => setCrop(c)}
                      onComplete={handleCropComplete}
                      aspect={1}
                      circularCrop
                      className="max-h-[300px] max-w-full"
                    >
                      <img
                        ref={imgRef}
                        src={originalImageUrl}
                        alt="Crop me"
                        onLoad={onImageLoad}
                        className="max-h-[300px] max-w-full"
                      />
                    </ReactCrop>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={applyCrop}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Apply Crop
                    </Button>
                    <Button 
                      onClick={handleClearFile}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                  {/* Hidden canvas for cropping */}
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
              
              {/* File upload input */}
              <Input
                id="profileImage"
                name="profileImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a new profile picture or use the URL below
              </p>
              
              {/* URL input as fallback */}
              <div className="mt-2">
                <Label htmlFor="profileImageUrl" className="text-xs">Or use image URL</Label>
                <Input
                  id="profileImageUrl"
                  name="profileImageUrl"
                  value={formData.profileImageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/your-image.jpg"
                  disabled={!!profileImage}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
