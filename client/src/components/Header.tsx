import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-tiktok-dark/80 backdrop-blur-md px-4 py-3 flex justify-between items-center md:hidden">
      <div className="flex space-x-4">
        <Button variant="ghost" className="text-tiktok-light-gray hover:text-white p-0 h-auto font-normal">
          Live
        </Button>
        <Button variant="ghost" className="text-white font-semibold border-b-2 border-tiktok-pink pb-1 p-0 h-auto rounded-none">
          For You
        </Button>
        <Button variant="ghost" className="text-tiktok-light-gray hover:text-white p-0 h-auto font-normal">
          Following
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="text-white">
        <Search className="h-5 w-5" />
      </Button>
    </header>
  );
}
