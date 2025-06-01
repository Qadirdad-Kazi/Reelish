import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play, Heart, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";

// Define VideoWithUser interface locally instead of importing from @shared/schema
interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
}

interface VideoWithUser {
  id: number;
  userId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  user: User;
  isLiked?: boolean;
  isFollowing?: boolean;
  isFavorite?: boolean;
}

// Trending hashtags will be fetched from the server

// Define the Tag type for trending hashtags
interface Tag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  usageCount: number;
  trending: boolean;
  createdAt: string;
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "search">("trending");
  const queryClient = useQueryClient();

  // Fetch trending hashtags from the server
  const { data: trendingHashtags = [], isLoading: hashtagsLoading } = useQuery<Tag[]>({
    queryKey: ['trending-hashtags'],
    queryFn: async () => {
      const response = await fetch('/api/trending/hashtags', {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Failed to fetch trending hashtags');
        return [];
      }
      return await response.json();
    },
  });

  const { data: searchResults = [], isLoading: searchLoading } = useQuery<VideoWithUser[]>({
    queryKey: [`search`, searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=videos`, {
        credentials: 'include' // Include credentials for authentication
      });
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      return data.videos || [];
    },
  });

  const { data: trendingVideos = [] } = useQuery<VideoWithUser[]>({
    queryKey: [`/api/videos`],
    queryFn: () => fetch('/api/videos?limit=20').then(res => res.json()),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveTab("search");
      // Force refetch of search results when search button is clicked
      queryClient.invalidateQueries({ queryKey: ['search', searchQuery] });
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    setSearchQuery(hashtag);
    setActiveTab("search");
    // Force refetch when a hashtag is clicked
    queryClient.invalidateQueries({ queryKey: ['search', hashtag] });
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
                {hashtagsLoading ? (
                  <div className="text-sm text-tiktok-light-gray">Loading trending hashtags...</div>
                ) : trendingHashtags.length === 0 ? (
                  <div className="text-sm text-tiktok-light-gray">No trending hashtags found</div>
                ) : (
                  trendingHashtags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleHashtagClick(tag.name)}
                      className="px-3 py-1 bg-tiktok-gray rounded-full text-sm hover:bg-gray-700 transition-colors"
                    >
                      #{tag.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Trending Videos */}
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Trending Videos</h2>
              <div className="grid grid-cols-2 gap-2">
                {trendingVideos.map((video) => (
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
