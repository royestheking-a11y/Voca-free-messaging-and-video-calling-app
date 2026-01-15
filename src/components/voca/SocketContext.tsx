import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useVoca } from './VocaContext';

const SOCKET_SERVER_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:3001';

import { App as CapacitorApp } from '@capacitor/app';

interface UserStatus {
    userId: string;
    status: 'online' | 'offline';
    lastSeen: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Map<string, UserStatus>;
    sendMessage: (recipientId: string, chatId: string, message: any) => void;
    startTyping: (chatId: string, recipientId: string) => void;
    stopTyping: (chatId: string, recipientId: string) => void;
    markMessagesRead: (chatId: string, senderId: string, messageIds: string[]) => void;
    emitDeleteMessage: (chatId: string, messageId: string, recipientId: string, forEveryone: boolean) => void;
    emitEditMessage: (chatId: string, messageId: string, recipientId: string, newContent: string) => void;
    updateFcmToken: (token: string) => void;
    typingUsers: Map<string, string>; // chatId -> userId who is typing
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    onlineUsers: new Map(),
    sendMessage: () => { },
    startTyping: () => { },
    stopTyping: () => { },
    markMessagesRead: () => { },
    emitDeleteMessage: () => { },
    emitEditMessage: () => { },
    updateFcmToken: () => { },
    typingUsers: new Map()
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, chats, handleIncomingMessage, handleMessageDelivered, handleMessageRead, handleMessageDeleted, handleMessageEdited, handleIncomingCall } = useVoca();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const reconnectAttempts = useRef(0);

    // Initialize socket connection
    useEffect(() => {
        if (!currentUser) {
            console.log('⏳ Socket: No current user, skipping connection');
            return;
        }

        console.log('🔌 Socket: Connecting to', SOCKET_SERVER_URL);

        const newSocket = io(SOCKET_SERVER_URL, {
            transports: ['websocket'], // Force websocket only for better mobile performance
            reconnection: true,
            reconnectionAttempts: Infinity, // Keep processing
            reconnectionDelay: 1000,
            timeout: 20000
        });

        // Handle App State Changes (Background/Foreground)
        const setupAppStateListener = async () => {
            await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                console.log('📱 App State Changed:', isActive ? 'Foreground' : 'Background');

                if (isActive) {
                    console.log('🔄 App Resumed: Ensuring socket is active...');

                    if (!newSocket.connected) {
                        console.log('🔌 Socket Disconnected, Reconnecting...');
                        newSocket.connect();
                    }

                    // ALWAYS re-emit online status on resume to refresh server state/presence
                    // (This fixes "Active Indicators" not showing after backgrounding)
                    newSocket.emit('user:online', {
                        userId: currentUser.id,
                        name: currentUser.name,
                        avatar: currentUser.avatar,
                        fcmToken: localStorage.getItem('fcm_token')
                    });
                }
            });
        };
        setupAppStateListener();

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setIsConnected(true);
            reconnectAttempts.current = 0;

            // Emit user online status
            newSocket.emit('user:online', {
                userId: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                fcmToken: localStorage.getItem('fcm_token') // Send FCM token if available
            });
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.warn('⚠️ Socket connection error:', error.message);
            reconnectAttempts.current++;
        });

        // Listen for user online status changes
        newSocket.on('user:online', (data: { userId: string; status: 'online'; lastSeen: string }) => {
            console.log('👤 User online:', data);
            setOnlineUsers(prev => {
                const updated = new Map(prev);
                updated.set(data.userId, { ...data, status: 'online' });
                return updated;
            });
        });

        // Listen for user offline status changes
        newSocket.on('user:offline', (data: { userId: string; lastSeen: string }) => {
            console.log('👤 User offline:', data);
            setOnlineUsers(prev => {
                const updated = new Map(prev);
                updated.set(data.userId, { userId: data.userId, status: 'offline', lastSeen: data.lastSeen });
                return updated;
            });
        });

        // Listen for online users list (when first connecting)
        newSocket.on('users:online-list', (users: UserStatus[]) => {
            console.log('📋 Online users list:', users);
            const usersMap = new Map<string, UserStatus>();
            users.forEach(user => usersMap.set(user.userId, user));
            setOnlineUsers(usersMap);
        });

        // Listen for incoming messages
        newSocket.on('message:receive', (data: { chatId: string; message: any }) => {
            console.log('📨 SocketContext: Message received, forwarding to VocaContext');
            handleIncomingMessage(data.chatId, data.message);
        });

        // Listen for message delivery confirmation
        newSocket.on('message:delivered', (data: { messageId: string; chatId: string }) => {
            console.log('✓ SocketContext: Delivery confirmation received');
            handleMessageDelivered(data.chatId, data.messageId);
        });

        // Listen for typing indicators
        newSocket.on('typing:show', (data: { chatId: string; userId: string }) => {
            setTypingUsers(prev => {
                const updated = new Map(prev);
                updated.set(data.chatId, data.userId);
                return updated;
            });
        });

        newSocket.on('typing:hide', (data: { chatId: string; userId: string }) => {
            setTypingUsers(prev => {
                const updated = new Map(prev);
                updated.delete(data.chatId);
                return updated;
            });
        });

        // Listen for read receipts
        newSocket.on('message:read', (data: { chatId: string; messageId: string }) => {
            console.log('👁️ SocketContext: Read receipt received');
            handleMessageRead(data.chatId, data.messageId);
        });

        // Listen for message deletions (delete for everyone)
        newSocket.on('message:deleted', (data: { chatId: string; messageId: string }) => {
            console.log('🗑️ SocketContext: Message deleted by other user');
            handleMessageDeleted(data.chatId, data.messageId);
        });

        // Listen for message edits
        newSocket.on('message:edited', (data: { chatId: string; messageId: string; newContent: string }) => {
            console.log('✏️ SocketContext: Message edited by other user');
            handleMessageEdited(data.chatId, data.messageId, data.newContent);
        });

        // Listen for incoming calls
        newSocket.on('call:incoming', (data: { from: string; offer: RTCSessionDescriptionInit; callType: 'voice' | 'video'; caller?: any }) => {
            console.log('📞 SocketContext: Incoming call, forwarding to VocaContext');
            handleIncomingCall(data);
        });

        setSocket(newSocket);


        // Cleanup on unmount or user change
        return () => {
            console.log('🔌 Socket: Cleaning up connection');
            // Remove all listeners before disconnecting to prevent duplicates
            newSocket.off('message:receive');
            newSocket.off('message:delivered');
            newSocket.off('message:read');
            newSocket.off('message:deleted');
            newSocket.off('message:edited');
            newSocket.off('call:incoming');
            newSocket.off('call:answer');
            newSocket.off('call:ice-candidate');
            newSocket.off('call:ended');
            newSocket.off('typing:show');
            newSocket.off('typing:hide');
            newSocket.off('user:online');
            newSocket.off('user:offline');
            newSocket.off('users:online-list');
            newSocket.emit('user:offline');
            newSocket.disconnect();
        };
    }, [currentUser?.id]); // Only reconnect if user ID changes

    // Send a message through socket
    const sendMessage = useCallback((recipientId: string, chatId: string, message: any) => {
        if (socket && isConnected) {
            socket.emit('message:send', {
                recipientId,
                chatId,
                message
            });
        }
    }, [socket, isConnected]);

    // Typing indicators
    const startTyping = useCallback((chatId: string, recipientId: string) => {
        if (socket && isConnected) {
            socket.emit('typing:start', { chatId, recipientId });
        }
    }, [socket, isConnected]);

    const stopTyping = useCallback((chatId: string, recipientId: string) => {
        if (socket && isConnected) {
            socket.emit('typing:stop', { chatId, recipientId });
        }
    }, [socket, isConnected]);

    // Mark messages as read
    const markMessagesRead = useCallback((chatId: string, senderId: string, messageIds: string[]) => {
        if (socket && isConnected) {
            socket.emit('message:read', { chatId, senderId, messageIds });
        }
    }, [socket, isConnected]);

    // Emit delete message event
    const emitDeleteMessage = useCallback((chatId: string, messageId: string, recipientId: string, forEveryone: boolean) => {
        if (socket && isConnected) {
            socket.emit('message:delete', { chatId, messageId, recipientId, forEveryone });
        }
    }, [socket, isConnected]);

    // Emit edit message event
    const emitEditMessage = useCallback((chatId: string, messageId: string, recipientId: string, newContent: string) => {
        if (socket && isConnected) {
            socket.emit('message:edit', { chatId, messageId, recipientId, newContent });
        }
    }, [socket, isConnected]);

    // Update FCM Token dynamically (for first launch)
    const updateFcmToken = useCallback((token: string) => {
        if (socket && isConnected) {
            console.log('🔄 SocketContext: Updating FCM token', token);
            socket.emit('user:update-fcm', { userId: currentUser?.id, fcmToken: token });
        }
    }, [socket, isConnected, currentUser]);

    const value = {
        socket,
        isConnected,
        onlineUsers,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesRead,
        emitDeleteMessage,
        emitEditMessage,
        updateFcmToken, // Exposed
        typingUsers
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
