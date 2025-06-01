import { Plus, Video, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

interface CreateVideoBarProps {
  className?: string;
}

export default function CreateVideoBar({ className = "" }: CreateVideoBarProps) {
  const [location, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleUploadClick = () => {
    setLocation("/upload");
  };
  
  return (
    <div className={`fixed bottom-16 md:bottom-4 left-1/2 transform -translate-x-1/2 z-40 ${className}`}>
      {isExpanded ? (
        <div className="bg-black/80 backdrop-blur-md rounded-full p-2 flex items-center space-x-2 border border-gray-700 shadow-lg">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-pink-600 hover:bg-pink-700 text-white rounded-full w-12 h-12"
            onClick={handleUploadClick}
          >
            <Video className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12"
            onClick={() => setLocation("/upload?mode=camera")}
          >
            <Camera className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-gray-700 hover:bg-gray-800 text-white rounded-full w-10 h-10"
            onClick={() => setIsExpanded(false)}
          >
            <Plus className="h-5 w-5 rotate-45" />
          </Button>
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-pink-600 hover:bg-pink-700 text-white rounded-full w-14 h-14 shadow-lg"
          onClick={() => setIsExpanded(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
