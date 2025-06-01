import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CloudUpload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractHashtags } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  defaultHashtag?: string;
}

export default function UploadModal({ isOpen, onClose, currentUserId, defaultHashtag }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(defaultHashtag ? `#${defaultHashtag} ` : "");
  const [privacy, setPrivacy] = useState("public");
  const [musicName, setMusicName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video uploaded!",
        description: "Your video has been successfully uploaded.",
      });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setPrivacy("public");
    setMusicName("");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a video file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (!currentUserId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to upload videos.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your video.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("userId", currentUserId.toString());
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("isPrivate", (privacy !== "public").toString());
    formData.append("musicName", musicName.trim());
    
    const hashtags = extractHashtags(description);
    formData.append("hashtags", JSON.stringify(hashtags));
    
    // Mock duration - in a real app, this would be extracted from the video
    formData.append("duration", "30");

    uploadMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tiktok-dark border-gray-800 text-white max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-lg font-semibold">Upload Video</DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Video Upload Area */}
          <div className="space-y-2">
            <Label>Video File</Label>
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center">
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-green-400 font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-tiktok-light-gray">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <CloudUpload className="mx-auto h-12 w-12 text-tiktok-light-gray mb-4" />
                  <p className="text-white mb-2">Drag and drop video files to upload</p>
                  <p className="text-tiktok-light-gray text-sm mb-4">MP4, MOV, AVI up to 50MB</p>
                  <div className="relative">
                    <Button className="bg-tiktok-pink hover:bg-tiktok-pink/80 text-black font-medium">
                      Select File
                    </Button>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a catchy title..."
              className="bg-tiktok-gray border-gray-700 text-white placeholder-tiktok-light-gray focus:border-tiktok-pink"
            />
          </div>
          
          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your video... Use #hashtags to reach more people!"
              rows={3}
              className="bg-tiktok-gray border-gray-700 text-white placeholder-tiktok-light-gray focus:border-tiktok-pink resize-none"
            />
          </div>

          {/* Music Name */}
          <div className="space-y-2">
            <Label htmlFor="music">Music/Sound</Label>
            <Input
              id="music"
              value={musicName}
              onChange={(e) => setMusicName(e.target.value)}
              placeholder="What music or sound is playing?"
              className="bg-tiktok-gray border-gray-700 text-white placeholder-tiktok-light-gray focus:border-tiktok-pink"
            />
          </div>
          
          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label>Who can view this video</Label>
            <RadioGroup value={privacy} onValueChange={setPrivacy}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="text-white cursor-pointer">Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friends" id="friends" />
                <Label htmlFor="friends" className="text-white cursor-pointer">Friends</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="text-white cursor-pointer">Only me</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim() || uploadMutation.isPending}
            className="w-full bg-tiktok-pink hover:bg-tiktok-pink/80 text-black font-medium h-12"
          >
            {uploadMutation.isPending ? "Uploading..." : "Post Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
