import { useQuery } from '@tanstack/react-query';

export function useUnreadMessages() {
  return useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/messages/unread/count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch unread messages count');
        }
        
        const data = await response.json();
        return data.unreadCount || 0;
      } catch (error) {
        console.error('Error fetching unread messages:', error);
        return 0;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
