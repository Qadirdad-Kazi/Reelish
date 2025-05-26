import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, Video } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Play, Grid3X3, Lock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const currentUsername = username || "dancequeen_maya"; // Default to first user

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/username/${currentUsername}`],
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: [`/api/users/${user?.id}/videos`],
    enabled: !!user?.id,
  });

  if (userLoading) {
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

  return (
    <div className="min-h-screen bg-tiktok-dark text-white">
      <Header />
      
      <div className="pt-16 md:pt-4 pb-20 md:pb-4">
        {/* Profile Header */}
        <div className="px-4 py-6 border-b border-gray-800">
          <div className="flex items-start space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-xl font-bold">@{user.username}</h1>
                {user.verified && (
                  <Badge variant="secondary" className="bg-tiktok-pink text-black">
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex space-x-6 mb-3">
                <div className="text-center">
                  <div className="font-bold">{formatNumber(user.followingCount)}</div>
                  <div className="text-sm text-tiktok-light-gray">Following</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{formatNumber(user.followersCount)}</div>
                  <div className="text-sm text-tiktok-light-gray">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{formatNumber(videos.reduce((sum, video) => sum + video.likesCount, 0))}</div>
                  <div className="text-sm text-tiktok-light-gray">Likes</div>
                </div>
              </div>
              
              <Button className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black font-semibold px-8">
                Follow
              </Button>
            </div>
          </div>
          
          {user.bio && (
            <p className="mt-4 text-sm">{user.bio}</p>
          )}
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
            <TabsTrigger value="private" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-white">
              <Lock className="w-4 h-4 mr-1" />
              Private
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos" className="mt-0">
            {videosLoading ? (
              <div className="p-4 text-center text-tiktok-light-gray">Loading videos...</div>
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
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>{formatNumber(video.viewsCount)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{formatNumber(video.likesCount)}</span>
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
          
          <TabsContent value="private" className="mt-0">
            <div className="p-8 text-center">
              <div className="text-tiktok-light-gray mb-2">Private videos</div>
              <div className="text-sm text-tiktok-light-gray">Only visible to the user</div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <BottomNavigation />
    </div>
  );
}
