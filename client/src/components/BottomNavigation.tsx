import { Home, Compass, Plus, Inbox, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BottomNavigationProps {
  onUploadClick?: () => void;
}

export default function BottomNavigation({ onUploadClick }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    { icon: Compass, label: "Discover", path: "/discover", active: location === "/discover" },
    { icon: Plus, label: "Upload", isUpload: true },
    { icon: Inbox, label: "Inbox", path: "/inbox", active: location === "/inbox" },
    { icon: User, label: "Profile", path: "/profile", active: location.startsWith("/profile") },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-tiktok-dark border-t border-gray-800 px-4 py-2 md:hidden z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={item.isUpload ? onUploadClick : undefined}
            className={`flex flex-col items-center py-2 px-3 ${
              item.isUpload
                ? "bg-tiktok-pink rounded-lg text-black hover:bg-tiktok-pink/80"
                : item.active
                ? "text-white"
                : "text-tiktok-light-gray hover:text-white"
            }`}
          >
            <item.icon className={`${item.isUpload ? "h-6 w-6" : "h-5 w-5"} ${item.isUpload ? "font-bold" : ""}`} />
            {!item.isUpload && (
              <span className="text-xs mt-1">{item.label}</span>
            )}
          </Button>
        ))}
      </div>
    </nav>
  );
}
