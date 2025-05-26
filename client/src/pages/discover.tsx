import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoWithUser } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play, Heart, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";

const trendingHashtags = [
  "#dance", "#cooking", "#art", "#fitness", "#comedy", "#music", "#diy", "#fashion", "#travel", "#pets"
];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "search">("trending");

  const { data: searchResults = [], isLoading: searchLoading } = useQuery<VideoWithUser[]>({
    queryKey: [`/api/search/videos`, searchQuery],
    enabled: searchQuery.length > 0,
  });

  const { data: trendingVideos = [] } = useQuery<VideoWithUser[]>({
    queryKey: [`/api/videos`],
    queryFn: () => fetch('/api/videos?limit=20').then(res => res.json()),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveTab("search");
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    setSearchQuery(hashtag);
    setActiveTab("search");
  };

  return (
    <div className="min-h-screen bg-tiktok-dark text-white">
      <Header />
      
      <div className="pt-16 md:pt-4 pb-20 md:pb-4">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tiktok-light-gray w-4 h-4" />
              <Input
                placeholder="Search videos, users, sounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-tiktok-gray border-gray-700 text-white placeholder-tiktok-light-gray focus:border-tiktok-pink"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "trending" || !searchQuery ? (
          <div>
            {/* Trending Hashtags */}
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-tiktok-pink" />
                Trending Hashtags
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((hashtag, index) => (
                  <button
                    key={hashtag}
                    onClick={() => handleHashtagClick(hashtag)}
                    className="px-3 py-1 bg-tiktok-gray rounded-full text-sm hover:bg-gray-700 transition-colors"
                  >
                    {hashtag}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Videos */}
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Trending Videos</h2>
              <div className="grid grid-cols-2 gap-2">
                {trendingVideos.map((video, index) => (
                  <div key={video.id} className="aspect-[9/16] relative bg-gray-900 rounded-lg overflow-hidden group cursor-pointer">
                    <img
                      src={video.thumbnailUrl || video.videoUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Video Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src={video.user.avatar}
                          alt={video.user.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs font-medium">@{video.user.username}</span>
                      </div>
                      <p className="text-xs line-clamp-2 mb-2">{video.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>{formatNumber(video.viewsCount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{formatNumber(video.likesCount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Search Results */
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              Search Results for "{searchQuery}"
            </h2>
            
            {searchLoading ? (
              <div className="text-center py-8 text-tiktok-light-gray">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-tiktok-light-gray mb-2">No results found</div>
                <div className="text-sm text-tiktok-light-gray">Try a different search term</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {searchResults.map((video) => (
                  <div key={video.id} className="aspect-[9/16] relative bg-gray-900 rounded-lg overflow-hidden group cursor-pointer">
                    <img
                      src={video.thumbnailUrl || video.videoUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src={video.user.avatar}
                          alt={video.user.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs font-medium">@{video.user.username}</span>
                      </div>
                      <p className="text-xs line-clamp-2 mb-2">{video.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>{formatNumber(video.viewsCount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{formatNumber(video.likesCount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
}
