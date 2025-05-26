import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Send, MoreHorizontal, Heart, MessageCircle, Users, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { Link } from "wouter";

interface Conversation {
  id: number;
  participant: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    isFollowing?: boolean;
  };
  lastMessage?: {
    id: number;
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    profileImageUrl?: string;
  };
}

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'mention';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  triggeredBy?: {
    id: string;
    username: string;
    profileImageUrl?: string;
  };
}

export default function Inbox() {
  const [activeTab, setActiveTab] = useState<'messages' | 'activity'>('messages');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: activeTab === 'messages',
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: [`/api/conversations/${selectedConversation}/messages`],
    enabled: !!selectedConversation,
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: activeTab === 'activity',
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: number; content: string }) =>
      apiRequest('/api/messages', 'POST', data),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversation}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: messageText,
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return new Date(dateString).toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow': return <Users className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="pt-16 pb-20">
        <div className="max-w-6xl mx-auto p-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-900 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'messages'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Activity
            </button>
          </div>

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="lg:col-span-1">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Messages</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      {loadingConversations ? (
                        <div className="flex justify-center items-center h-40">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                          <p className="text-lg mb-2">No conversations yet</p>
                          <p className="text-sm">Start chatting with your followers!</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredConversations.map((conversation: Conversation) => (
                            <button
                              key={conversation.id}
                              onClick={() => setSelectedConversation(conversation.id)}
                              className={`w-full p-4 text-left hover:bg-gray-800 transition-colors border-l-4 ${
                                selectedConversation === conversation.id
                                  ? 'bg-gray-800 border-pink-500'
                                  : 'border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage 
                                    src={conversation.participant.profileImageUrl || 
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.participant.username}`}
                                  />
                                  <AvatarFallback>
                                    {conversation.participant.username[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-white truncate">
                                      @{conversation.participant.username}
                                    </h3>
                                    {conversation.unreadCount > 0 && (
                                      <Badge className="bg-pink-600 text-white">
                                        {conversation.unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  {conversation.lastMessage && (
                                    <p className="text-sm text-gray-400 truncate">
                                      {conversation.lastMessage.content}
                                    </p>
                                  )}
                                  {conversation.lastMessage && (
                                    <p className="text-xs text-gray-500">
                                      {formatTimeAgo(conversation.lastMessage.createdAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Message Thread */}
              <div className="lg:col-span-2">
                {selectedConversation ? (
                  <Card className="bg-gray-900 border-gray-800 h-[600px] flex flex-col">
                    <CardHeader className="border-b border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage 
                              src={conversations.find((c: Conversation) => c.id === selectedConversation)?.participant.profileImageUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversations.find((c: Conversation) => c.id === selectedConversation)?.participant.username}`}
                            />
                            <AvatarFallback>
                              {conversations.find((c: Conversation) => c.id === selectedConversation)?.participant.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-white">
                              @{conversations.find((c: Conversation) => c.id === selectedConversation)?.participant.username}
                            </h3>
                            <p className="text-sm text-gray-400">Active now</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <ScrollArea className="flex-1 p-4">
                      {loadingMessages ? (
                        <div className="flex justify-center items-center h-40">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message: Message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                                  message.senderId === user?.id
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-800 text-white'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {formatTimeAgo(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="border-t border-gray-800 p-4">
                      <form onSubmit={handleSendMessage} className="flex space-x-2">
                        <Input
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-gray-800 border-gray-700 text-white"
                        />
                        <Button 
                          type="submit" 
                          className="bg-pink-600 hover:bg-pink-700"
                          disabled={!messageText.trim() || sendMessageMutation.isPending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-gray-900 rounded-lg border border-gray-800">
                    <div className="text-center text-gray-400">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                      <p>Choose a conversation to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {loadingNotifications ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-lg mb-2">No activity yet</p>
                      <p className="text-sm">Likes, comments, and follows will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification: Notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-gray-800 ${
                            notification.read 
                              ? 'bg-gray-900 border-gray-800' 
                              : 'bg-gray-800 border-pink-500/30'
                          }`}
                          onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                {notification.triggeredBy && (
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage 
                                      src={notification.triggeredBy.profileImageUrl || 
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.triggeredBy.username}`}
                                    />
                                    <AvatarFallback>
                                      {notification.triggeredBy.username[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <p className="text-sm font-medium text-white">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}