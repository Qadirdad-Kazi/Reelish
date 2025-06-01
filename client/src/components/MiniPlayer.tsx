import { useState, useRef, useEffect } from "react";
import { X, Maximize2, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Video } from "@/types/video";

// Create a local useMediaQuery hook to avoid import issues
function useMediaQuery(query: string): boolean {
  // Initialize with the current match state if window is available
  const getMatches = (): boolean => {
    // Check if window is defined (for SSR safety)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches());

  useEffect(() => {
    // Safety check for SSR
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(query);
    
    // Initial check
    setMatches(mediaQuery.matches);

    // Create listener function
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener for subsequent changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

interface MiniPlayerProps {
  video: Video;
  onClose: () => void;
  onExpand: () => void;
}

export default function MiniPlayer({ video, onClose, onExpand }: MiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Set to false for sound on by default
  const [videoError, setVideoError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Add error event handler
    const handleError = (e: Event) => {
      console.log(`Mini player error: Could not load video for ID ${video.id}`);
      console.error('Video error details:', (e.target as HTMLMediaElement).error);
      
      // Log the attempted video URL for debugging
      const videoSrc = video.videoUrl.startsWith('/uploads/') 
        ? `/api/stream/${video.videoUrl.replace('/uploads/', '')}` 
        : video.videoUrl;
      console.log(`Attempted to load video from: ${videoSrc}`);
      
      setVideoError(true);
      setIsPlaying(false);
    };

    videoElement.addEventListener('error', handleError);

    // Play video when component mounts
    if (!videoError) {
      videoElement.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error(`Error playing mini video ID ${video.id}:`, err);
        });
    }

    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.pause();
    };
  }, [video.id, videoError]);

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
      setIsPlaying(false);
    } else {
      videoElement.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error(`Error playing mini video ID ${video.id}:`, err);
        });
    }
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    videoElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`
        ${isMobile ? 'fixed inset-0 w-full h-full' : 'fixed z-50 shadow-lg overflow-hidden flex flex-col rounded-lg bg-black'}
        ${!isMobile && !isFullscreen ? 'w-[375px] h-[667px] bottom-16 left-1/2 -translate-x-1/2' : ''}
        ${isFullscreen ? 'fixed inset-0 w-full h-full z-50' : ''}
      `}>
      {/* Close button - always visible and positioned in the top-right */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 rounded-full p-1 text-white transition-colors"
        aria-label="Close mini player"
      >
        <X className="w-5 h-5" />
      </button>
      {/* Video container */}
      <div className="relative flex-grow">
        {videoError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-2">
            <div className="text-white text-center text-xs">
              <svg className="w-8 h-8 mx-auto mb-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-gray-400">Video Unavailable</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            onClick={togglePlay}
            poster={`https://picsum.photos/seed/${video.id}/400/600`}
          >
            <source 
              src={video.videoUrl.startsWith('/uploads/') 
                ? `/api/stream/${video.videoUrl.replace('/uploads/', '')}` 
                : video.videoUrl
              } 
              type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        )}

        {/* Controls overlay */}
        <div className="absolute top-8 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-2 flex justify-end items-center">
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-black/20 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-black/20 rounded-full"
              onClick={isFullscreen ? toggleFullscreen : onExpand}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Play/Pause overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {!isPlaying && (
            <Button
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white rounded-full"
              onClick={togglePlay}
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="bg-black/80 absolute bottom-0 left-0 right-0 p-3 flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-gray-800/50 rounded-full"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <div className="text-white text-sm truncate flex-1 mx-3 font-medium">
          {video.title || "Video"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-gray-800/50 rounded-full"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
