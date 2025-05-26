import { useState } from "react";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import { Play, Heart, MessageCircle, Share, Users, Sparkles, TrendingUp } from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Background Video Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/20 to-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,20,147,0.1),transparent_70%)]" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 animate-bounce">
          <div className="w-12 h-12 bg-pink-500 rounded-full opacity-60" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse">
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce delay-200">
          <MessageCircle className="w-6 h-6 text-blue-400" />
        </div>
        <div className="absolute bottom-20 right-40 animate-pulse delay-300">
          <Share className="w-7 h-7 text-green-400" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              VibeShare
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Share Your Vibe. Create amazing videos, discover trending sounds, and connect with creators worldwide.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              onClick={() => openAuth("register")}
              className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Join VibeShare
            </Button>
            <Button
              onClick={() => openAuth("login")}
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-black px-8 py-3 text-lg font-semibold rounded-full transition-all duration-300"
            >
              Log In
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-500 mb-2">1B+</div>
              <div className="text-gray-400">Global Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">500M+</div>
              <div className="text-gray-400">Daily Videos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">180+</div>
              <div className="text-gray-400">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Why TikTok?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Play className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Amazing Videos</h3>
              <p className="text-gray-400">
                Use our powerful editing tools, filters, and effects to create videos that stand out and express your unique style.
              </p>
            </div>

            <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Build Your Community</h3>
              <p className="text-gray-400">
                Connect with like-minded creators, grow your following, and engage with millions of users worldwide.
              </p>
            </div>

            <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Go Viral</h3>
              <p className="text-gray-400">
                Our algorithm helps talented creators reach millions of viewers. Your next video could be the one that changes everything.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20 px-6 bg-gradient-to-r from-pink-600/10 via-purple-600/10 to-blue-600/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join millions of creators and start your TikTok journey today. It's free, fun, and full of possibilities.
          </p>
          <Button
            onClick={() => openAuth("register")}
            className="bg-pink-600 hover:bg-pink-700 text-white px-12 py-4 text-xl font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
          >
            <Sparkles className="w-6 h-6 mr-3" />
            Get Started Now
          </Button>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authTab}
      />
    </div>
  );
}