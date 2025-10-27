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
    <div className="h-screen flex flex-col relative bg-tiktok-dark overflow-hidden">
      {/* Mobile Header */}
      <Header />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-16 flex flex-col">
        <div className="flex-1 relative">
          <VideoFeed 
            currentUserId={user?.id} 
            showPublicOnly={true} 
            randomMode={true} 
          />
        </div>
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
