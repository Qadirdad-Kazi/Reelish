import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, User, Bell, Shield, Key, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SettingsFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  bio: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  notifications: {
    comments: boolean;
    likes: boolean;
    follows: boolean;
    mentions: boolean;
  };
  privacy: {
    privateAccount: boolean;
    showActivity: boolean;
    allowComments: boolean;
  };
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<SettingsFormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    bio: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      comments: true,
      likes: true,
      follows: true,
      mentions: true,
    },
    privacy: {
      privateAccount: false,
      showActivity: true,
      allowComments: true,
    }
  });
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);
  
  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const nameParts = (user.displayName || user.username || '').split(' ');
      
      // Try to parse settings from bio field if it looks like JSON
      let userBio = user.bio || '';
      let parsedSettings = {
        notifications: {
          comments: true,
          likes: true,
          follows: true,
          mentions: true,
        },
        privacy: {
          privateAccount: false,
          showActivity: true,
          allowComments: true,
        }
      };
      
      // Check if bio looks like a JSON string (starts with {)
      if (userBio.trim().startsWith('{')) {
        try {
          const settingsData = JSON.parse(userBio);
          if (settingsData.notifications && settingsData.privacy) {
            parsedSettings = settingsData;
            // If bio is settings JSON, don't display it as bio
            userBio = '';
          }
        } catch (e) {
          // If parsing fails, just use the bio as is
          console.error('Failed to parse settings from bio:', e);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        username: user.username || '',
        email: user.email || '',
        bio: userBio,
        notifications: parsedSettings.notifications,
        privacy: parsedSettings.privacy
      }));
    }
  }, [user]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle toggle changes
  const handleToggleChange = (section: 'notifications' | 'privacy', setting: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: checked
      }
    }));
  };
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<SettingsFormData>) => {
      // Create a new object with just the profile fields
      const profileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
      };
      
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      toast({
        title: 'Password changed',
        description: 'Your password has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Password change failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { notifications: any; privacy: any }) => {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Your settings have been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // We need to preserve the settings data when updating the profile
    // Only update the profile data, not the settings
    updateProfileMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      bio: formData.bio,
    });
  };
  
  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };
  
  // Handle notifications settings submission
  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      notifications: formData.notifications,
      privacy: formData.privacy,
    });
  };
  
  // Handle privacy settings submission
  const handlePrivacySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      notifications: formData.notifications,
      privacy: formData.privacy,
    });
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setLocation('/');
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-tiktok-pink" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container max-w-4xl py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information and bio.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileSubmit}>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-16 w-16 border-2 border-background">
                      <AvatarImage 
                        src={user?.profileImageUrl ? `${window.location.origin}${user.profileImageUrl}` : `https://ui-avatars.com/api/?name=${user?.username}`} 
                        alt={user?.username || 'User'}
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.username}`;
                        }}
                      />
                      <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{user?.username}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself"
                      rows={4}
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setLocation('/profile')}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="bg-tiktok-pink hover:bg-tiktok-pink/90"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Enter your new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your new password"
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="ml-auto bg-tiktok-pink hover:bg-tiktok-pink/90"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you receive.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleNotificationsSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifyComments" className="font-medium">Comments</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone comments on your videos
                        </p>
                      </div>
                      <Switch
                        id="notifyComments"
                        checked={formData.notifications.comments}
                        onCheckedChange={(checked) => 
                          handleToggleChange('notifications', 'comments', checked)
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifyLikes" className="font-medium">Likes</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone likes your videos
                        </p>
                      </div>
                      <Switch
                        id="notifyLikes"
                        checked={formData.notifications.likes}
                        onCheckedChange={(checked) => 
                          handleToggleChange('notifications', 'likes', checked)
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifyFollows" className="font-medium">Follows</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone follows you
                        </p>
                      </div>
                      <Switch
                        id="notifyFollows"
                        checked={formData.notifications.follows}
                        onCheckedChange={(checked) => 
                          handleToggleChange('notifications', 'follows', checked)
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifyMentions" className="font-medium">Mentions</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone mentions you
                        </p>
                      </div>
                      <Switch
                        id="notifyMentions"
                        checked={formData.notifications.mentions}
                        onCheckedChange={(checked) => 
                          handleToggleChange('notifications', 'mentions', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="ml-auto bg-tiktok-pink hover:bg-tiktok-pink/90"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your account privacy and security.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePrivacySubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privateAccount" className="font-medium">Private Account</Label>
                        <p className="text-sm text-muted-foreground">
                          Only approved followers can see your videos
                        </p>
                      </div>
                      <Switch
                        id="privateAccount"
                        checked={formData.privacy.privateAccount}
                        onCheckedChange={(checked) => 
                          handleToggleChange('privacy', 'privateAccount', checked)
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showActivity" className="font-medium">Activity Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Show when you're active on the platform
                        </p>
                      </div>
                      <Switch
                        id="showActivity"
                        checked={formData.privacy.showActivity}
                        onCheckedChange={(checked) => 
                          handleToggleChange('privacy', 'showActivity', checked)
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowComments" className="font-medium">Allow Comments</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to comment on your videos
                        </p>
                      </div>
                      <Switch
                        id="allowComments"
                        checked={formData.privacy.allowComments}
                        onCheckedChange={(checked) => 
                          handleToggleChange('privacy', 'allowComments', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="ml-auto bg-tiktok-pink hover:bg-tiktok-pink/90"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <div className="mt-8">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Account Actions</CardTitle>
                  <CardDescription>
                    Manage your account access and data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="destructive" 
                    className="w-full sm:w-auto"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
