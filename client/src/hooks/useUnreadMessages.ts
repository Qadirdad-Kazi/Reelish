import { useQuery } from '@tanstack/react-query';

export function useUnreadMessages() {
  return useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      try {
        // Check if user is logged in before making the request
        // This is a simple check - you might want to use a more robust method
        const isLoggedIn = document.cookie.includes('connect.sid');
        if (!isLoggedIn) {
          // Skip the request if not logged in
          return 0;
        }
        
        const response = await fetch('/api/messages/unread/count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        // Handle different response statuses silently
        if (!response.ok) {
          // For any error (401, 404, etc.), just return 0 without logging
          return 0;
        }
        
        const data = await response.json();
        return data.unreadCount || 0;
      } catch (error) {
        // Silently handle errors without logging
        return 0;
      }
    },
    refetchInterval: 60000, // Reduce frequency to once per minute
    // Don't retry failed requests
    retry: false,
    // Prevent refetching on window focus for this background query
    refetchOnWindowFocus: false,
  });
}
