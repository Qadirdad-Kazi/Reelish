import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/user";
import type { Video } from "@/types/video";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import useVideoActions from "@/hooks/useVideoActions";
import CommentsModal from "@/components/CommentsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Play, Grid3X3, Lock, Edit, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import CreateVideoBar from "@/components/CreateVideoBar";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    bio: '',
    website: '',
    location: ''
  });
  
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser, isLoading: authLoading, logout, isLoggingOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Check if this is the current user's profile
  const isOwnProfile = userId === currentUser?.id;
  // Cast currentUser.id to number since useVideoActions expects a number
  const { handleLike } = useVideoActions(currentUser?.id ? Number(currentUser.id) : undefined);
  
  // Handle sharing a video
  const handleShare = (video: Video) => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this video on Reelish!`,
        url: `${window.location.origin}/video/${video.id}`
      }).catch(() => {
        // Fallback if sharing fails
        copyToClipboard(`${window.location.origin}/video/${video.id}`);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      copyToClipboard(`${window.location.origin}/video/${video.id}`);
    }
  };
  
  // Helper function to copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied!",
        description: "Video link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard",
        variant: "destructive"
      });
    });
  };
  
  // Open comments modal for a video
  const openComments = (video: Video) => {
    setSelectedVideo(video);
    setShowCommentsModal(true);
  };
  
  // If userId is provided, fetch that user's profile, otherwise use the current authenticated user
  const { data: profileUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [userId ? `/api/users/${userId}` : '/api/auth/me'],
    enabled: !authLoading && (!!userId || !!currentUser),
  });
  
  // Use the authenticated user if no userId is provided and profileUser isn't loaded yet
  const user = userId ? profileUser : (profileUser || currentUser || {}) as User;

  // Check if the current user is following the profile user
  const { data: followStatus, isLoading: followStatusLoading } = useQuery({
    queryKey: [`/api/follows/check`, userId, currentUser?.id],
    queryFn: async () => {
      if (!userId || !currentUser?.id || userId === currentUser?.id) return { isFollowing: false };
      try {
        const response = await fetch(`/api/follows/check?followerId=${currentUser?.id}&followingId=${userId}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to check follow status');
        return response.json();
      } catch (error) {
        console.error('Error checking follow status:', error);
        return { isFollowing: false };
      }
    },
    enabled: !!userId && !!currentUser?.id && userId !== currentUser?.id
  });

  // Set local following state based on API response
  useEffect(() => {
    if (followStatus) {
      setIsFollowing(followStatus.isFollowing);
    }
  }, [followStatus]);

  // Get user videos directly from database with robust error handling
  const { data: videos = [], isLoading: videosLoading, error: videosError, refetch: refetchVideos } = useQuery<Video[]>({
    queryKey: [`user-videos-${user?.id || ''}`],
    queryFn: async () => {
      try {
        if (!user?.id) {
          console.log('No user ID available, skipping video fetch');
          return [];
        }
        
        console.log(`Fetching videos for user: ${user.id}`);
        
        // Make a direct fetch request with explicit headers and credentials
        const response = await fetch(`/api/users/${encodeURIComponent(user.id)}/videos`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error ${response.status}: ${errorText}`);
          
          // Show detailed error in toast
          toast({
            title: `Error ${response.status}`,
            description: `Failed to load videos: ${response.statusText}`,
            variant: "destructive"
          });
          
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        // Get response as text first to inspect it
        const text = await response.text();
        console.log(`Raw response (${text.length} chars):`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        
        // Try to parse as JSON, but handle HTML or malformed responses
        try {
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              console.log(`Successfully parsed ${data.length} videos for user ${user.id}`);
              return data;
            } else {
              console.error('Expected array but got:', typeof data);
              return [];
            }
          } else {
            console.error('Response is not valid JSON:', text.substring(0, 100) + '...');
            return [];
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return [];
        }
      } catch (error) {
        console.error('Error fetching user videos:', error);
        toast({
          title: "Error loading videos",
          description: "Could not load videos from the server. Please try again later.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Initialize edit form with user data when modal opens
  useEffect(() => {
    if (showEditModal && user) {
      setEditForm({
        username: (user as any)?.username || '',
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        bio: (user as any)?.bio || '',
        website: (user as any)?.website || '',
        location: (user as any)?.location || ''
      });
    }
  }, [showEditModal, user]);
  
  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ action, followerId, followingId }: { action: 'follow' | 'unfollow', followerId: string, followingId: string }) => {
      setIsFollowLoading(true);
      try {
        const url = action === 'follow' ? '/api/follows' : `/api/follows/${followerId}/${followingId}`;
        const method = action === 'follow' ? 'POST' : 'DELETE';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: action === 'follow' ? JSON.stringify({ followerId, followingId }) : undefined,
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error(`Failed to ${action}`);
        return response.json();
      } finally {
        setIsFollowLoading(false);
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/follows/check`, userId, currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
      
      // Update local state
      setIsFollowing(!isFollowing);
      
      // Show success toast
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: isFollowing ? `You unfollowed this user` : `You are now following this user`,
      });
    },
    onError: (error) => {
      console.error('Follow error:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`,
        variant: 'destructive'
      });
    }
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof editForm) => {
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}`] });
      setShowEditModal(false);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error) => {
      console.error('Update profile error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle follow/unfollow button click
  const handleFollowToggle = () => {
    if (!currentUser?.id || !userId) return;
    
    followMutation.mutate({
      action: isFollowing ? 'unfollow' : 'follow',
      followerId: currentUser.id as string,
      followingId: userId
    });
  };
  
  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(editForm);
  };
  
  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  if (userLoading || authLoading) {
    return (
      <div className="min-h-screen bg-tiktok-dark flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tiktok-dark flex items-center justify-center">
        <div className="text-white">User not found</div>
      </div>
    );
  }
  
  // Safely access user properties with type assertions
  const username = (user as any)?.username || '';
  const avatar = (user as any)?.profileImageUrl || '';
  const verified = (user as any)?.verified || false;
  const followingCount = (user as any)?.followingCount || 0;
  const followersCount = (user as any)?.followersCount || 0;
  const bio = (user as any)?.bio || '';

  return (
    <div className="min-h-screen bg-tiktok-dark text-white">
      <Header />
      
      <div className="pt-16 md:pt-4 pb-20 md:pb-4">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start p-6 border-b">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {user?.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt={user.username} />
              ) : (
                <AvatarFallback>{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <h1 className="text-2xl font-bold">{user?.username || "User"}</h1>
              {(user as any)?.verified && (
                <Badge variant="secondary" className="bg-tiktok-pink text-black">
                  Verified
                </Badge>
              )}
            </div>
            
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="font-bold">{formatNumber(followingCount)}</div>
                <div className="text-sm text-gray-400">Following</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{formatNumber(followersCount)}</div>
                <div className="text-sm text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{formatNumber(videos.reduce((sum, video) => sum + (video.likesCount || 0), 0))}</div>
                <div className="text-sm text-gray-400">Likes</div>
              </div>
            </div>
            
            {bio && <p className="text-sm">{bio}</p>}
            
            <div className="flex flex-wrap gap-2 mt-2">
              {isOwnProfile ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowEditModal(true)}
                  >
                    Edit Profile
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={logout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      "Logout"
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isFollowing ? (
                    "Unfollow"
                  ) : (
                    "Follow"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full bg-tiktok-dark border-b border-gray-800 rounded-none h-12">
            <TabsTrigger value="videos" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-white">
              <Grid3X3 className="w-4 h-4 mr-1" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-white">
              <Heart className="w-4 h-4 mr-1" />
              Liked
            </TabsTrigger>
            {/* Only show Private tab if viewing own profile or if admin */}
            {(!userId || userId === currentUser?.id || (currentUser as any)?.isAdmin) && (
              <TabsTrigger value="private" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-white">
                <Lock className="w-4 h-4 mr-1" />
                Private
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="videos" className="mt-0">
            {videosLoading ? (
              <div className="p-4 text-center text-tiktok-light-gray">Loading videos...</div>
            ) : videosError ? (
              <div className="p-8 text-center">
                <div className="text-tiktok-light-gray mb-2">Error loading videos</div>
                <div className="text-sm text-tiktok-light-gray mb-4">There was a problem fetching videos</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchVideos()}
                  className="text-tiktok-pink border-tiktok-pink hover:bg-tiktok-pink hover:text-white"
                >
                  Try Again
                </Button>
              </div>
            ) : videos.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-tiktok-light-gray mb-2">No videos yet</div>
                <div className="text-sm text-tiktok-light-gray">This user hasn't posted any videos</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {videos.map((video) => (
                  <div key={video.id} className="aspect-[9/16] relative bg-gray-900 group cursor-pointer">
                    <img
                      src={video.thumbnailUrl || video.videoUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Video action buttons */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="flex flex-col items-center space-y-4">
                        {/* Like button */}
                        <button 
                          className={`rounded-full p-2 bg-black/50 ${video.isLiked ? 'text-red-500' : 'text-white'} hover:bg-black/70`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(video.id, !!video.isLiked);
                          }}
                        >
                          <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* Comment button */}
                        <button 
                          className="rounded-full p-2 bg-black/50 text-white hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            openComments(video);
                          }}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        
                        {/* Share button */}
                        <button 
                          className="rounded-full p-2 bg-black/50 text-white hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(video);
                          }}
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>{formatNumber(video.viewsCount)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{formatNumber(video.likesCount || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="liked" className="mt-0">
            <div className="p-8 text-center">
              <div className="text-tiktok-light-gray mb-2">Liked videos are private</div>
              <div className="text-sm text-tiktok-light-gray">Videos that this user liked are not visible to others</div>
            </div>
          </TabsContent>
          
          {/* Only render Private tab content if viewing own profile or if admin */}
          {(!userId || userId === currentUser?.id || (currentUser as any)?.isAdmin) && (
            <TabsContent value="private" className="mt-0">
              {videosLoading ? (
                <div className="p-4 text-center text-tiktok-light-gray">Loading private videos...</div>
              ) : videosError ? (
                <div className="p-8 text-center">
                  <div className="text-tiktok-light-gray mb-2">Error loading private videos</div>
                  <div className="text-sm text-tiktok-light-gray mb-4">There was a problem fetching private videos</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchVideos()}
                    className="text-tiktok-pink border-tiktok-pink hover:bg-tiktok-pink hover:text-white"
                  >
                    Try Again
                  </Button>
                </div>
              ) : videos.filter(video => video.isPrivate).length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-tiktok-light-gray mb-2">No private videos</div>
                  <div className="text-sm text-tiktok-light-gray">This user hasn't posted any private videos</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {videos.filter(video => video.isPrivate).map((video) => (
                    <div key={video.id} className="aspect-[9/16] relative bg-gray-900 group cursor-pointer">
                      <img
                        src={video.thumbnailUrl || video.videoUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      
                      {/* Video action buttons */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="flex flex-col items-center space-y-4">
                          {/* Like button */}
                          <button 
                            className={`rounded-full p-2 bg-black/50 ${video.isLiked ? 'text-red-500' : 'text-white'} hover:bg-black/70`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(video.id, !!video.isLiked);
                            }}
                          >
                            <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-current' : ''}`} />
                          </button>
                          
                          {/* Comment button */}
                          <button 
                            className="rounded-full p-2 bg-black/50 text-white hover:bg-black/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              openComments(video);
                            }}
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                          
                          {/* Share button */}
                          <button 
                            className="rounded-full p-2 bg-black/50 text-white hover:bg-black/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(video);
                            }}
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center space-x-1">
                            <Play className="w-3 h-3" />
                            <span>{formatNumber(video.viewsCount)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <Heart className="w-3 h-3" />
                              <span>{formatNumber(video.likesCount || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      <CreateVideoBar />
      <BottomNavigation onUploadClick={() => setShowUploadModal(true)} />
      
      {/* Comments Modal */}
      {showCommentsModal && selectedVideo && (
        <CommentsModal 
          isOpen={showCommentsModal} 
          onClose={() => setShowCommentsModal(false)} 
          videoId={selectedVideo.id} 
          currentUserId={currentUser?.id} 
        />
      )}
      
      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px] bg-black border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Edit Profile</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                name="username"
                value={editForm.username}
                onChange={handleInputChange}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleInputChange}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleInputChange}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-white">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={editForm.bio}
                onChange={handleInputChange}
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website" className="text-white">Website</Label>
              <Input
                id="website"
                name="website"
                value={editForm.website}
                onChange={handleInputChange}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location" className="text-white">Location</Label>
              <Input
                id="location"
                name="location"
                value={editForm.location}
                onChange={handleInputChange}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
