import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Hash, TrendingUp, Users, Play, Heart, MessageCircle, Share } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";

interface HashtagPageData {
  hashtag: {
    id: number;
    name: string;
    description?: string;
    videosCount: number;
    viewsCount: number;
    trending: boolean;
    usageCount: number;
  };
  videos: Array<{
    id: number;
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    musicName?: string;
    hashtags?: string[];
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    user: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
    isLiked?: boolean;
    isFollowing?: boolean;
  }>;
}

export default function HashtagPage() {
  const { hashtag } = useParams<{ hashtag: string }>();
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/hashtags/${hashtag}`],
    enabled: !!hashtag,
  });

  const hashtagData = data as HashtagPageData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading #{hashtag}...</p>
        </div>
      </div>
    );
  }

  if (error || !hashtagData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-16 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Hash className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Hashtag not found</h2>
            <p className="text-gray-400 mb-4">#{hashtag} doesn't exist or has no videos yet.</p>
            <Link href="/discover">
              <Button className="bg-pink-600 hover:bg-pink-700">
                Discover Trending Hashtags
              </Button>
            </Link>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (viewMode === 'feed' && hashtagData.videos.length > 0) {
    return (
      <div className="min-h-screen bg-black">
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <div className="flex items-center justify-between">
            <Link href="/discover">
              <Button variant="ghost" size="sm" className="text-white bg-black/50 hover:bg-black/70 rounded-full">
                ← Back
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-black/50 hover:bg-black/70 rounded-full"
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </Button>
          </div>
        </div>
        
        <div className="snap-y snap-mandatory h-screen overflow-y-auto">
          {hashtagData.videos.map((video, index) => (
            <div key={video.id} className="snap-start h-screen">
              <VideoPlayer video={video} isActive={index === selectedVideoIndex} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="pt-16 pb-20">
        <div className="max-w-6xl mx-auto p-4">
          {/* Hashtag Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full flex items-center justify-center">
                <Hash className="w-10 h-10 text-white" />
              </div>
              {hashtagData.hashtag.trending && (
                <div className="ml-3">
                  <Badge className="bg-yellow-600 text-white">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                </div>
              )}
            </div>
            
            <h1 className="text-4xl font-bold mb-2">#{hashtagData.hashtag.name}</h1>
            
            {hashtagData.hashtag.description && (
              <p className="text-gray-400 text-lg mb-4 max-w-2xl mx-auto">
                {hashtagData.hashtag.description}
              </p>
            )}

            <div className="flex items-center justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {formatCount(hashtagData.hashtag.videosCount)}
                </div>
                <div className="text-sm text-gray-400">Videos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {formatCount(hashtagData.hashtag.viewsCount)}
                </div>
                <div className="text-sm text-gray-400">Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {formatCount(hashtagData.hashtag.usageCount)}
                </div>
                <div className="text-sm text-gray-400">Posts</div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button 
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => window.location.href = `/upload?hashtag=${hashtag}`}
              >
                Create Video with #{hashtag}
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-black"
                onClick={() => setViewMode('feed')}
                disabled={hashtagData.videos.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Videos
              </Button>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                Videos ({formatCount(hashtagData.videos.length)})
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-pink-600' : ''}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'feed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('feed')}
                  className={viewMode === 'feed' ? 'bg-pink-600' : ''}
                  disabled={hashtagData.videos.length === 0}
                >
                  Feed
                </Button>
              </div>
            </div>

            {hashtagData.videos.length === 0 ? (
              <div className="text-center py-12">
                <Hash className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
                <p className="text-gray-400 mb-4">
                  Be the first to create a video with #{hashtag}!
                </p>
                <Button 
                  className="bg-pink-600 hover:bg-pink-700"
                  onClick={() => window.location.href = `/upload?hashtag=${hashtag}`}
                >
                  Create First Video
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {hashtagData.videos.map((video, index) => (
                  <Card 
                    key={video.id} 
                    className="bg-gray-900 border-gray-800 cursor-pointer hover:border-pink-500 transition-colors group"
                    onClick={() => {
                      setSelectedVideoIndex(index);
                      setViewMode('feed');
                    }}
                  >
                    <CardContent className="p-0 relative aspect-[9/16]">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                          <Play className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      
                      {/* Video Stats Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <div className="flex items-center space-x-4 text-white">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm">{formatCount(video.likesCount)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">{formatCount(video.commentsCount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white ml-1" />
                        </div>
                      </div>

                      {/* Creator Info */}
                      <div className="absolute top-3 left-3">
                        <Link href={`/profile/${video.user.id}`}>
                          <div className="flex items-center space-x-2 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors">
                            <img
                              src={video.user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.user.username}`}
                              alt={video.user.username}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-white text-sm font-medium">
                              @{video.user.username}
                            </span>
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Related Hashtags */}
          <div className="mt-12">
            <h3 className="text-xl font-bold mb-4">Related Hashtags</h3>
            <div className="flex flex-wrap gap-3">
              {['viral', 'fyp', 'trending', 'dance', 'music', 'funny', 'challenge', 'duet'].map((tag) => (
                <Link key={tag} href={`/hashtag/${tag}`}>
                  <Badge 
                    variant="secondary" 
                    className="bg-gray-800 text-white hover:bg-gray-700 cursor-pointer px-4 py-2 text-sm"
                  >
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}