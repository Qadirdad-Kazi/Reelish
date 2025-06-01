import { useState } from "react";
import VideoFeed from "@/components/VideoFeed";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import UploadModal from "@/components/UploadModal";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="h-screen flex flex-col relative bg-tiktok-dark">
      {/* Mobile Header */}
      <Header />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-16">
        <div className="p-4 text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Discover Random Videos</h1>
          <p className="text-gray-300 mb-6">Explore content from creators across the platform</p>
        </div>
        <VideoFeed 
          currentUserId={user?.id} 
          showPublicOnly={true} 
          randomMode={true} 
        />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentUserId={user?.id}
      />
    </div>
  );
}
