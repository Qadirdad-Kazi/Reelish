import { Home, Compass, User, Music, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Sidebar() {
  const [location, setLocation] = useLocation();

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
            <item.icon className="h-5 w-5" />
          </Button>
        ))}
      </nav>
    </aside>
  );
}
