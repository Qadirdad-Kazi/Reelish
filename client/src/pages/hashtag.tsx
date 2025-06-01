import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import VideoFeed from "@/components/VideoFeed";
import { useAuth } from "@/hooks/useAuth";
import UploadModal from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { Share2, Bookmark, Hash, TrendingUp, Grid3X3, Play, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface HashtagStats {
  videosCount: number;
  viewsCount: number;
  trending?: boolean;
}

export default function Hashtag() {
  const { tag } = useParams<{ tag: string }>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch videos with the specified hashtag
  const { data: hashtagVideos = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/hashtags/${tag}/videos`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/hashtags/${tag}/videos`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching hashtag videos: ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching hashtag videos:', error);
        return [];
      }
    },
    enabled: !!tag
  });

  // Get hashtag statistics
  const { data: hashtagStats } = useQuery<HashtagStats>({
    queryKey: [`/api/hashtags/${tag}/stats`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/hashtags/${tag}/stats`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          return { videosCount: 0, viewsCount: 0 };
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching hashtag stats:', error);
        return { videosCount: 0, viewsCount: 0 };
      }
    },
    enabled: !!tag
  });

  const shareHashtag = () => {
    const url = `${window.location.origin}/hashtag/${tag}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Hashtag link copied to clipboard",
    });
  };
  
  const saveHashtag = () => {
    // This would typically save the hashtag to the user's favorites
    toast({
      title: "Hashtag saved",
      description: `#${tag} has been saved to your favorites`,
    });
  };
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Show feed view if selected and videos are available
  if (viewMode === 'feed' && hashtagVideos.length > 0) {
    return (
      <div className="h-screen flex flex-col relative bg-tiktok-dark">
        <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-black/50">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-black/70 rounded-full"
              onClick={() => setViewMode('grid')}
            >
              ← Back to Grid
            </Button>
          </div>
        </div>
        
        <div className="h-screen">
          <VideoFeed currentUserId={user?.id} videos={hashtagVideos} />
        </div>
      </div>
    );
  }

  // Default grid view
  return (
    <div className="h-screen flex flex-col relative bg-tiktok-dark">
      <Header />
      <Sidebar />

      <main className="flex-1 md:ml-16 pt-16">
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-white text-3xl font-bold mb-2">#{tag}</h1>
              <div className="flex space-x-4 text-tiktok-light-gray">
                <span>{formatCount(hashtagStats?.videosCount || 0)} videos</span>
                <span>{formatCount(hashtagStats?.viewsCount || 0)} views</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-gray-700 text-white hover:bg-gray-800"
                onClick={shareHashtag}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-gray-700 text-white hover:bg-gray-800"
                onClick={saveHashtag}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <p className="text-tiktok-light-gray mt-4 mb-6">
            Explore videos with <span className="text-tiktok-pink">#{tag}</span>
          </p>
          
          {hashtagVideos.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button 
                variant="outline" 
                className="border-gray-700 text-white hover:bg-gray-800"
                onClick={() => setViewMode('feed')}
              >
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-white">Loading videos...</div>
          </div>
        ) : hashtagVideos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-white text-xl mb-2">No videos found</div>
              <div className="text-tiktok-light-gray">Be the first to create a video with #{tag}</div>
              <Button 
                className="mt-4 bg-tiktok-pink hover:bg-tiktok-pink/80 text-black"
                onClick={() => setShowUploadModal(true)}
              >
                Create Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hashtagVideos.map((video) => (
              <div key={video.id} className="relative aspect-[9/16] rounded-md overflow-hidden group cursor-pointer">
                <Link href={`/video/${video.id}`}>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all duration-200"></div>
                  <video 
                    src={video.videoUrl} 
                    className="w-full h-full object-cover"
                    muted 
                    playsInline
                    loop
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => e.currentTarget.pause()}
                  />
                  <div className="absolute bottom-2 left-2 right-2 text-white text-sm">
                    <div className="line-clamp-1 font-medium">{video.title}</div>
                    <div className="flex items-center mt-1 text-xs text-gray-300">
                      <div className="flex items-center mr-2">
                        <Heart className="w-3 h-3 mr-1" />
                        {formatCount(video.likesCount || 0)}
                      </div>
                      <div className="flex items-center">
                        @{video.user.username}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation onUploadClick={() => setShowUploadModal(true)} />
      
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        currentUserId={user?.id}
        defaultHashtag={tag}
      />
    </div>
  );
}