import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useVoca } from './VocaContext';

const SOCKET_SERVER_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:3001';

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
    typingUsers: new Map()
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, chats, handleIncomingMessage, handleMessageDelivered, handleMessageRead, handleIncomingCall } = useVoca();
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
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setIsConnected(true);
            reconnectAttempts.current = 0;

            // Emit user online status
            newSocket.emit('user:online', {
                userId: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar
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

        // Listen for user status changes
        newSocket.on('user:status-change', (data: UserStatus) => {
            console.log('👤 User status change:', data);
            setOnlineUsers(prev => {
                const updated = new Map(prev);
                updated.set(data.userId, data);
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

        // Listen for incoming calls
        newSocket.on('call:incoming', (data: { from: string; offer: RTCSessionDescriptionInit; callType: 'voice' | 'video'; caller?: any }) => {
            console.log('📞 SocketContext: Incoming call, forwarding to VocaContext');
            handleIncomingCall(data);
        });

        setSocket(newSocket);

        // Cleanup on unmount or user change
        return () => {
            console.log('🔌 Socket: Cleaning up connection');
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

    const value = {
        socket,
        isConnected,
        onlineUsers,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesRead,
        typingUsers
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
