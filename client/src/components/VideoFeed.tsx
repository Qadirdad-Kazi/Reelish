import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import VideoPlayer from "./VideoPlayer";

interface VideoWithUser {
  id: number;
  title: string;
  description?: string | null;
  videoUrl: string;
  musicName?: string | null;
  hashtags?: string[] | null;
  isLiked?: boolean;
  likesCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  isFollowing?: boolean;
}

interface VideoFeedProps {
  currentUserId?: string;
  showPublicOnly?: boolean;
  hashtagFilter?: string;
  videos?: VideoWithUser[];
  randomMode?: boolean;
}

export default function VideoFeed({ currentUserId, showPublicOnly = false, hashtagFilter, videos: providedVideos, randomMode = false }: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [offset] = useState(0); // We're not updating offset in this component currently
  const limit = 10;

  // Only fetch videos if no videos are provided
  const { data: fetchedVideos = [], isLoading, error } = useQuery<VideoWithUser[]>({
    queryKey: [`/api/videos`, offset, currentUserId, showPublicOnly, hashtagFilter, randomMode],
    queryFn: async () => {
      try {
        // Use the random videos endpoint if randomMode is true
        let url = randomMode 
          ? `/api/videos/random?limit=${limit}` 
          : `/api/videos?offset=${offset}&limit=${limit}`;
        
        if (currentUserId) {
          url += `&userId=${currentUserId}`;
        }
        
        if (showPublicOnly) {
          url += '&publicOnly=true';
        }
        
        if (hashtagFilter) {
          url += `&hashtag=${hashtagFilter}`;
        }
        
        console.log('Fetching videos from URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching videos: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API response data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
      }
    },
    enabled: !providedVideos,
    refetchOnWindowFocus: true,
    staleTime: 30000 // 30 seconds
  });
  
  // Use provided videos if available, otherwise use fetched videos
  const videos = providedVideos || fetchedVideos;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let wheelTimeout: NodeJS.Timeout | null = null;
    let isScrolling = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (Math.abs(diff) > 30) { // Reduced threshold for more responsive touch gestures
        if (diff > 0 && currentVideoIndex < videos.length - 1) {
          // Swipe up - next video
          const nextIndex = currentVideoIndex + 1;
          setCurrentVideoIndex(nextIndex);
          setScrollDirection('down');
          const nextVideo = container.children[nextIndex] as HTMLElement;
          nextVideo.classList.add('video-animate-down');
          nextVideo.scrollIntoView({ behavior: 'auto' });
          setTimeout(() => {
            nextVideo.classList.remove('video-animate-down');
          }, 500);
        } else if (diff < 0 && currentVideoIndex > 0) {
          // Swipe down - previous video
          const prevIndex = currentVideoIndex - 1;
          setCurrentVideoIndex(prevIndex);
          setScrollDirection('up');
          const prevVideo = container.children[prevIndex] as HTMLElement;
          prevVideo.classList.add('video-animate-up');
          prevVideo.scrollIntoView({ behavior: 'auto' });
          setTimeout(() => {
            prevVideo.classList.remove('video-animate-up');
          }, 500);
        }
      }
    };

    // Trackpad/wheel scrolling for laptops
    const handleWheel = (e: WheelEvent) => {
      // Prevent default to disable native scrolling
      e.preventDefault();
      
      // If already scrolling, don't trigger another scroll
      if (isScrolling) return;
      
      // Process wheel events more quickly with reduced debounce
      if (wheelTimeout) clearTimeout(wheelTimeout);
      
      wheelTimeout = setTimeout(() => {
        const delta = e.deltaY;
        const threshold = 10; // Lower threshold for faster response
        
        if (Math.abs(delta) > threshold) {
          isScrolling = true;
          
          if (delta > 0 && currentVideoIndex < videos.length - 1) {
            // Scroll down - next video
            const nextIndex = currentVideoIndex + 1;
            setCurrentVideoIndex(nextIndex);
            setScrollDirection('down');
            const nextVideo = container.children[nextIndex] as HTMLElement;
            nextVideo.scrollIntoView({ behavior: 'auto' }); // Changed to 'auto' for faster scrolling
          } else if (delta < 0 && currentVideoIndex > 0) {
            // Scroll up - previous video
            const prevIndex = currentVideoIndex - 1;
            setCurrentVideoIndex(prevIndex);
            setScrollDirection('up');
            const prevVideo = container.children[prevIndex] as HTMLElement;
            prevVideo.scrollIntoView({ behavior: 'auto' }); // Changed to 'auto' for faster scrolling
          }
          
          // Reset scrolling flag after animation completes - reduced time for faster transitions
          setTimeout(() => {
            isScrolling = false;
          }, 300);
        }
      }, 20); // Reduced debounce time for faster response
    };

    // Keyboard navigation for desktop
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        const prevIndex = currentVideoIndex - 1;
        setCurrentVideoIndex(prevIndex);
        const prevVideo = container.children[prevIndex] as HTMLElement;
        prevVideo.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowDown' && currentVideoIndex < videos.length - 1) {
        const nextIndex = currentVideoIndex + 1;
        setCurrentVideoIndex(nextIndex);
        const nextVideo = container.children[nextIndex] as HTMLElement;
        nextVideo.scrollIntoView({ behavior: 'smooth' });
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [currentVideoIndex, videos?.length]);

  // Intersection Observer for tracking current video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(container.children).indexOf(entry.target);
            if (index !== -1) {
              setCurrentVideoIndex(index);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    Array.from(container.children).forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [videos]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-tiktok-dark">
        <div className="text-white">Loading videos...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-tiktok-dark">
        <div className="text-center">
          <div className="text-white text-xl mb-2">No videos found</div>
          <div className="text-tiktok-light-gray">Be the first to upload a video!</div>
          {error && (
            <div className="text-red-500 mt-4">
              Error loading videos: {(error as Error).message}
            </div>
          )}
          <button 
            className="mt-4 bg-tiktok-red text-white px-4 py-2 rounded-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto hide-scrollbar"
      style={{ scrollSnapType: 'y mandatory', height: 'calc(100vh - 120px)' }}
    >
      {videos.map((video, index) => (
        <div 
          key={video.id}
          className={`${index === currentVideoIndex ? 
            scrollDirection === 'up' ? 'video-animate-up' : 
            scrollDirection === 'down' ? 'video-animate-down' : 
            'video-animate-in' : ''}`}
        >
          <VideoPlayer
            video={video}
            isActive={index === currentVideoIndex}
            currentUserId={currentUserId}
          />
        </div>
      ))}
    </div>
  );
}
