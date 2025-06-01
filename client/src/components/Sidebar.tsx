import { Home, Compass, User, Music, Inbox, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/hooks/useAuth";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  // Only fetch unread messages if user is authenticated
  const { data: unreadCount = 0 } = useUnreadMessages();
  
  // Only show notification badge if user is authenticated
  const showNotifications = !!user;

  const navItems = [
    { icon: Home, path: "/", active: location === "/", label: "Home" },
    { icon: Compass, path: "/discover", active: location === "/discover", label: "Discover" },
    { icon: Inbox, path: "/inbox", active: location === "/inbox", label: "Inbox" },
    { icon: User, path: "/profile", active: location.startsWith("/profile"), label: "Profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-16 bg-tiktok-gray border-r border-gray-800 z-40">
      <div className="p-4">
        <div className="w-8 h-8 bg-tiktok-pink rounded-lg flex items-center justify-center">
          <Music className="text-white w-4 h-4" />
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-6 mt-8">
        {navItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            size="icon"
            onClick={() => setLocation(item.path)}
            className={`w-full p-3 rounded-lg transition-colors ${
              item.active
                ? "bg-tiktok-pink/20 text-tiktok-pink"
                : "hover:bg-gray-800 text-white"
            }`}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              
              {/* Show notification badge for Inbox if there are unread messages and user is authenticated */}
              {item.label === "Inbox" && showNotifications && unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-tiktok-pink text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </div>
          </Button>
        ))}
      </nav>
      
      {/* Settings at the bottom */}
      <div className="px-3 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/settings')}
          className={`w-full p-3 rounded-lg transition-colors ${
            location === '/settings'
              ? "bg-tiktok-pink/20 text-tiktok-pink"
              : "hover:bg-gray-800 text-white"
          }`}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </aside>
  );
}
