import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Discover from "@/pages/discover";
import NotFound from "@/pages/not-found";

// Lazy load components
const Inbox = lazy(() => import("@/pages/inbox"));
const Upload = lazy(() => import("@/pages/upload"));
const Hashtag = lazy(() => import("@/pages/hashtag"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Reelish...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-16"> {/* Add margin to account for sidebar width */}
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/profile/:userId?" component={Profile} />
            <Route path="/discover" component={Discover} />
            <Route path="/inbox" component={Inbox} />
            <Route path="/upload" component={Upload} />
            <Route path="/hashtag/:hashtag" component={Hashtag} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="bg-black text-white min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
