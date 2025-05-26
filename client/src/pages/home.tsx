import { useState } from "react";
import VideoFeed from "@/components/VideoFeed";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import UploadModal from "@/components/UploadModal";

export default function Home() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentUserId] = useState(1); // Mock current user

  return (
    <div className="h-screen flex flex-col relative bg-tiktok-dark">
      {/* Mobile Header */}
      <Header />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-16">
        <VideoFeed currentUserId={currentUserId} />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}
