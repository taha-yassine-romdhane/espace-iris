import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (pusherClientInstance) {
    console.log('📦 Reusing existing Pusher client');
    return pusherClientInstance;
  }

  console.log('🔧 Creating new Pusher client with config:', {
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    authEndpoint: '/api/pusher/auth'
  });

  pusherClientInstance = new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_KEY!,
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
  );

  // Add connection state listeners
  pusherClientInstance.connection.bind('connecting', () => {
    console.log('🔄 Pusher connecting...');
  });

  pusherClientInstance.connection.bind('connected', () => {
    console.log('✅ Pusher connected!');
  });

  pusherClientInstance.connection.bind('unavailable', () => {
    console.error('❌ Pusher unavailable');
  });

  pusherClientInstance.connection.bind('failed', () => {
    console.error('❌ Pusher connection failed');
  });

  pusherClientInstance.connection.bind('disconnected', () => {
    console.warn('⚠️ Pusher disconnected');
  });

  pusherClientInstance.connection.bind('error', (err: any) => {
    console.error('❌ Pusher connection error:', err);
  });

  return pusherClientInstance;
};

// Event names
export const PUSHER_EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_READ: 'message-read',
  TYPING: 'typing',
  STOP_TYPING: 'stop-typing',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
} as const;

// Channel names
export const getPrivateUserChannel = (userId: string) => `private-user-${userId}`;
export const getConversationChannel = (conversationId: string) => `private-conversation-${conversationId}`;
export const getPresenceChannel = () => 'presence-online-users';
