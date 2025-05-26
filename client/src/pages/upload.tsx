import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Music, Hash, X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [musicName, setMusicName] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get music from URL params if coming from another video
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const musicParam = urlParams.get('music');
    const hashtagParam = urlParams.get('hashtag');
    
    if (musicParam) {
      setMusicName(decodeURIComponent(musicParam));
    }
    
    if (hashtagParam) {
      setHashtags([hashtagParam]);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Video uploaded successfully! 🎉",
        description: "Your video is now live on VibeShare!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a video under 100MB",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      setHashtags([...hashtags, hashtagInput.trim().replace('#', '')]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile) {
      toast({
        title: "Video required",
        description: "Please select a video to upload",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your video",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }
    formData.append('title', title);
    formData.append('description', description);
    formData.append('musicName', musicName);
    formData.append('hashtags', JSON.stringify(hashtags));
    formData.append('isPrivate', isPrivate.toString());
    formData.append('allowComments', allowComments.toString());
    formData.append('allowDuet', allowDuet.toString());

    uploadMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Share Your Vibe</h1>
            <p className="text-gray-400">Upload a video and let the world see your creativity</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Video Upload Section */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!videoFile ? (
                    <div 
                      className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-pink-500 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Select video to upload</p>
                      <p className="text-sm text-gray-400 mb-4">Or drag and drop a file</p>
                      <p className="text-xs text-gray-500">
                        MP4, MOV, AVI up to 100MB
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={URL.createObjectURL(videoFile)}
                        className="w-full aspect-[9/16] max-h-96 object-cover rounded-lg"
                        muted={isMuted}
                        onLoadedData={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 1; // Show first frame
                          }
                        }}
                      />
                      
                      {/* Video Controls */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          type="button"
                          onClick={toggleVideoPlay}
                          className="bg-black/50 hover:bg-black/70 rounded-full"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </Button>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={toggleMute}
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full"
                        size="sm"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={() => {
                          setVideoFile(null);
                          setIsPlaying(false);
                        }}
                        className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 rounded-full"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  
                  {videoFile && (
                    <div className="text-sm text-gray-400">
                      <p><strong>File:</strong> {videoFile.name}</p>
                      <p><strong>Size:</strong> {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  )}

                  {/* Thumbnail Upload */}
                  <div>
                    <Label className="text-white">Custom Thumbnail (Optional)</Label>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        {thumbnailFile ? 'Change Thumbnail' : 'Add Thumbnail'}
                      </Button>
                      {thumbnailFile && (
                        <p className="text-sm text-gray-400 mt-2">{thumbnailFile.name}</p>
                      )}
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Video Details Section */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-white">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Add a catchy title..."
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-white">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell viewers about your video..."
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
                  </div>

                  <div>
                    <Label htmlFor="music" className="text-white flex items-center">
                      <Music className="w-4 h-4 mr-2" />
                      Sound/Music
                    </Label>
                    <Input
                      id="music"
                      value={musicName}
                      onChange={(e) => setMusicName(e.target.value)}
                      placeholder="Add music or sound name..."
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                    />
                    {musicName && (
                      <p className="text-sm text-pink-400 mt-2">
                        Others can use this sound for their videos! 🎵
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      Hashtags
                    </Label>
                    <div className="mt-2 flex space-x-2">
                      <Input
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value)}
                        placeholder="Add hashtag..."
                        className="flex-1 bg-gray-800 border-gray-700 text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHashtag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addHashtag}
                        className="bg-pink-600 hover:bg-pink-700"
                      >
                        Add
                      </Button>
                    </div>
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {hashtags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-gray-800 text-white hover:bg-gray-700"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeHashtag(tag)}
                              className="ml-2 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Privacy & Permissions</h4>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Private video</span>
                      <Button
                        type="button"
                        variant={isPrivate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={isPrivate ? "bg-pink-600" : "border-gray-700 text-white hover:bg-gray-800"}
                      >
                        {isPrivate ? "Private" : "Public"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Allow comments</span>
                      <Button
                        type="button"
                        variant={allowComments ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAllowComments(!allowComments)}
                        className={allowComments ? "bg-green-600" : "border-gray-700 text-white hover:bg-gray-800"}
                      >
                        {allowComments ? "Enabled" : "Disabled"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Allow duets</span>
                      <Button
                        type="button"
                        variant={allowDuet ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAllowDuet(!allowDuet)}
                        className={allowDuet ? "bg-blue-600" : "border-gray-700 text-white hover:bg-gray-800"}
                      >
                        {allowDuet ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 px-8"
                disabled={!videoFile || !title.trim() || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  "Share Video"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}