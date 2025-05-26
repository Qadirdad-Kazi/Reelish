import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoWithUser } from "@shared/schema";
import VideoPlayer from "./VideoPlayer";

interface VideoFeedProps {
  currentUserId?: number;
}

export default function VideoFeed({ currentUserId }: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const { data: videos = [], isLoading } = useQuery<VideoWithUser[]>({
    queryKey: [`/api/videos`, offset, currentUserId],
    queryFn: () => 
      fetch(`/api/videos?offset=${offset}&limit=${limit}${currentUserId ? `&userId=${currentUserId}` : ''}`)
        .then(res => res.json()),
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentVideoIndex < videos.length - 1) {
          // Swipe up - next video
          const nextIndex = currentVideoIndex + 1;
          setCurrentVideoIndex(nextIndex);
          const nextVideo = container.children[nextIndex] as HTMLElement;
          nextVideo.scrollIntoView({ behavior: 'smooth' });
        } else if (diff < 0 && currentVideoIndex > 0) {
          // Swipe down - previous video
          const prevIndex = currentVideoIndex - 1;
          setCurrentVideoIndex(prevIndex);
          const prevVideo = container.children[prevIndex] as HTMLElement;
          prevVideo.scrollIntoView({ behavior: 'smooth' });
        }
      }
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
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentVideoIndex, videos.length]);

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
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto hide-scrollbar"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {videos.map((video, index) => (
        <VideoPlayer
          key={video.id}
          video={video}
          isActive={index === currentVideoIndex}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
