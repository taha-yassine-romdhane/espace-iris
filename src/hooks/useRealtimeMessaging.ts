import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getPusherClient, PUSHER_EVENTS, getPrivateUserChannel } from '@/lib/pusher';
import type { Channel } from 'pusher-js';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string | null;
  conversationId: string;
  messageType: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    telephone?: string;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    telephone?: string;
  };
}

interface UseRealtimeMessagingProps {
  onNewMessage?: (data: { message: Message; conversationId: string }) => void;
  onMessageRead?: (data: { readerId: string; messageIds: string[]; conversationId: string }) => void;
  onTyping?: (data: { userId: string; conversationId: string }) => void;
  onStopTyping?: (data: { userId: string; conversationId: string }) => void;
}

export function useRealtimeMessaging({
  onNewMessage,
  onMessageRead,
  onTyping,
  onStopTyping
}: UseRealtimeMessagingProps = {}) {
  const { data: session } = useSession();
  const channelRef = useRef<Channel | null>(null);
  const pusherClientRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  // Use refs to store latest callback versions without causing re-subscriptions
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const onTypingRef = useRef(onTyping);
  const onStopTypingRef = useRef(onStopTyping);

  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageReadRef.current = onMessageRead;
    onTypingRef.current = onTyping;
    onStopTypingRef.current = onStopTyping;
  });

  console.log('🎣 useRealtimeMessaging hook called, session:', session?.user?.id);

  useEffect(() => {
    console.log('🎣 useRealtimeMessaging useEffect triggered, session?.user?.id:', session?.user?.id);
    if (!session?.user?.id) {
      console.log('⚠️ No session user ID, skipping Pusher initialization');
      return;
    }

    console.log('🔌 Initializing Pusher for user:', session.user.id);

    // Initialize Pusher client
    if (!pusherClientRef.current) {
      pusherClientRef.current = getPusherClient();
      console.log('✅ Pusher client created');
    }

    const pusher = pusherClientRef.current;
    const userChannel = getPrivateUserChannel(session.user.id);

    console.log('📡 Subscribing to channel:', userChannel);

    // Subscribe to user's private channel
    if (!channelRef.current) {
      channelRef.current = pusher.subscribe(userChannel);

      // Add connection state listeners
      channelRef.current.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Successfully subscribed to channel:', userChannel);
      });

      channelRef.current.bind('pusher:subscription_error', (error: any) => {
        console.error('❌ Subscription error:', error);
      });
    }

    const channel = channelRef.current;

    // Wrapper functions that call the latest callback from refs
    const handleNewMessage = (data: any) => {
      console.log('📨 Received new message event:', data);
      onNewMessageRef.current?.(data);
    };

    const handleMessageRead = (data: any) => {
      console.log('👀 Received message read event:', data);
      onMessageReadRef.current?.(data);
    };

    const handleTyping = (data: any) => {
      console.log('⌨️ Received typing event:', data);
      onTypingRef.current?.(data);
    };

    const handleStopTyping = (data: any) => {
      console.log('⌨️ Received stop typing event:', data);
      onStopTypingRef.current?.(data);
    };

    // Bind wrapper event listeners
    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, handleNewMessage);
    channel.bind(PUSHER_EVENTS.MESSAGE_READ, handleMessageRead);
    channel.bind(PUSHER_EVENTS.TYPING, handleTyping);
    channel.bind(PUSHER_EVENTS.STOP_TYPING, handleStopTyping);

    console.log('✅ Event listeners bound');

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up event listeners');
      if (channel) {
        channel.unbind(PUSHER_EVENTS.NEW_MESSAGE, handleNewMessage);
        channel.unbind(PUSHER_EVENTS.MESSAGE_READ, handleMessageRead);
        channel.unbind(PUSHER_EVENTS.TYPING, handleTyping);
        channel.unbind(PUSHER_EVENTS.STOP_TYPING, handleStopTyping);
      }
    };
  }, [session?.user?.id]); // Only depend on session user ID

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    async (conversationId: string, receiverId: string) => {
      if (!session?.user?.id) return;

      try {
        await fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            receiverId,
            isTyping: true
          })
        });
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    },
    [session?.user?.id]
  );

  // Stop typing indicator
  const stopTypingIndicator = useCallback(
    async (conversationId: string, receiverId: string) => {
      if (!session?.user?.id) return;

      try {
        await fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            receiverId,
            isTyping: false
          })
        });
      } catch (error) {
        console.error('Error stopping typing indicator:', error);
      }
    },
    [session?.user?.id]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        pusherClientRef.current?.unsubscribe(getPrivateUserChannel(session?.user?.id || ''));
        channelRef.current = null;
      }
    };
  }, [session?.user?.id]);

  return {
    sendTypingIndicator,
    stopTypingIndicator
  };
}
