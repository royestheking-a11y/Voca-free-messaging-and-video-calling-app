import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, usersAPI, chatsAPI, postsAPI, statusesAPI, adminAPI, uploadAPI, callsAPI } from '../../lib/api';
import { User, Chat, Message, Advertisement, Report, StatusUpdate, UserSettings, Call, Post } from '../../lib/data';
import { useSocket } from './SocketContext';

interface VocaContextType {
    currentUser: User | null;
    users: User[];
    chats: Chat[];
    activeChatId: string | null;
    ads: Advertisement[];
    reports: Report[];
    statuses: StatusUpdate[];
    calls: Call[];
    loading: boolean;
    error: string | null;

    // Auth
    login: (email: string, password: string) => Promise<{ success: boolean; isAdminPanel?: boolean }>;
    googleLogin: (dataOrCredential: string | { googleId: string; email: string; name: string; avatar: string }) => Promise<{ success: boolean; isAdminPanel?: boolean; error?: string }>;
    signup: (userData: any) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfilePhoto: (url: string) => Promise<void>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;

    // Chat
    sendMessage: (chatId: string, content: string, type?: 'text' | 'image' | 'voice' | 'video' | 'doc' | 'call', mediaUrl?: string, duration?: string, replyToId?: string) => Promise<Message | undefined>;
    deleteMessage: (chatId: string, messageId: string, forEveryone: boolean) => Promise<void>;
    starMessage: (chatId: string, messageId: string) => void;
    setActiveChatId: (id: string | null) => Promise<void>;
    activeCall: { type: 'voice' | 'video', isIncoming: boolean, participant?: User, offer?: RTCSessionDescriptionInit } | null;
    startCall: (participantId: string, type: 'voice' | 'video', fallbackParticipant?: User) => void;
    endCall: (duration?: string, status?: 'missed' | 'completed') => void;
    createChat: (participantId: string) => Promise<void>;
    createGroupChat: (name: string, participantIds: string[], image?: string) => Promise<void>;
    toggleArchiveChat: (chatId: string) => Promise<void>;
    toggleFavoriteContact: (contactId: string) => Promise<void>;

    // Socket message handlers
    handleIncomingMessage: (chatId: string, message: Message) => void | Promise<void>;
    handleMessageDelivered: (chatId: string, messageId: string) => void;
    handleMessageRead: (chatId: string, messageId: string) => void;

    // Socket call handler
    handleIncomingCall: (data: { from: string, offer: RTCSessionDescriptionInit, callType: 'voice' | 'video', caller?: User }) => void;

    // Status
    createStatus: (content: string, type: 'text' | 'image', color?: string) => Promise<void>;
    deleteStatus: (statusId: string) => Promise<void>;

    // Search helper
    searchMessages: (query: string, chatId?: string) => Message[];
    editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
    getStarredMessages: () => { message: Message, chat: Chat }[];

    // Admin / User Management
    addUser: (user: Partial<User>) => void;
    deleteUser: (userId: string) => Promise<void>;
    banUser: (userId: string) => Promise<void>;
    unbanUser: (userId: string) => Promise<void>;
    updateUser: (userId: string, data: Partial<User>) => Promise<void>;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;

    // Ads
    createAd: (ad: Omit<Advertisement, 'id' | 'clicks' | 'views'>) => Promise<void>;
    deleteAd: (adId: string) => Promise<void>;
    toggleAd: (adId: string) => Promise<void>;
    incrementAdClick: (adId: string) => void;
    incrementAdView: (adId: string) => void;

    // Reports
    createReport: (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => void;
    resolveReport: (reportId: string, status: 'resolved' | 'dismissed') => Promise<void>;

    // Broadcast
    sendBroadcast: (message: string) => Promise<void>;

    // Posts
    posts: Post[];
    createPost: (content: string, imageUrl?: string) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    commentOnPost: (postId: string, content: string) => Promise<void>;
    sharePost: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;

    // System Settings
    systemSettings: { maintenanceMode: boolean; fileUploadLimitMB: number };
    updateSystemSettings: (settings: Partial<{ maintenanceMode: boolean; fileUploadLimitMB: number }>) => Promise<void>;

    isAdmin: boolean;
    refreshData: () => Promise<void>;
}

const VocaContext = createContext<VocaContextType | undefined>(undefined);

export const VocaProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [systemSettings, setSystemSettings] = useState({ maintenanceMode: false, fileUploadLimitMB: 10 });

    const [activeChatId, setActiveChatIdInternal] = useState<string | null>(null);
    const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video', isIncoming: boolean, participant?: User, offer?: RTCSessionDescriptionInit } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = currentUser?.role === 'admin';

    // Socket call handler - called by SocketContext when call events are received

    const handleIncomingCall = async (data: { from: string, offer: RTCSessionDescriptionInit, callType: 'voice' | 'video', caller?: any }) => {
        console.log('📞 VocaContext: Handling incoming call', { from: data.from, hasCaller: !!data.caller });

        // Try to find participant in local users list
        let participant = users.find(u => u.id === data.from);

        // If not found, use the caller data sent with the socket event
        if (!participant && data.caller) {
            console.log('📞 VocaContext: User not found locally, using provided caller data');

            // Handle legacy backend data (odId vs id)
            if (data.caller.odId && !data.caller.id) {
                console.log('📞 VocaContext: Fixing legacy user data (odId -> id)');
                participant = { ...data.caller, id: data.caller.odId };
            } else {
                participant = data.caller;
            }
        }

        // If still not found, try to fetch from API (emergency fallback)
        if (!participant) {
            console.log('📞 VocaContext: Caller not found, fetching from API unavailable context');
            // We rely on data.caller being sent from backend which we verified exists.
        }

        if (participant) {
            console.log('📞 VocaContext: Setting active call', { participantName: participant.name });
            setActiveCall({
                type: data.callType,
                isIncoming: true,
                participant,
                offer: data.offer
            });
        } else {
            console.error('📞 VocaContext: FAILED to start call - Call participant not found!', { from: data.from });
        }
    };

    // Load initial data on mount
    useEffect(() => {
        const initializeApp = async () => {
            if (authAPI.isAuthenticated()) {
                try {
                    const user = await authAPI.getCurrentUser();
                    setCurrentUser(user);
                    await loadAllData(user);
                } catch (err) {
                    console.error('Auth check failed:', err);
                    authAPI.removeToken();
                }
            }
            setLoading(false);
        };
        initializeApp();
    }, []);

    // Apply theme
    useEffect(() => {
        const theme = currentUser?.settings?.theme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else if (theme === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
            }
        }
    }, [currentUser?.settings?.theme]);

    const loadAllData = async (fetchedUser?: User | null) => {
        try {
            const [usersData, chatsData, postsData, statusesData, callsData] = await Promise.all([
                usersAPI.getAll().catch(() => []),
                chatsAPI.getAll().catch(() => []),
                postsAPI.getAll().catch(() => []),
                statusesAPI.getAll().catch(() => []),
                callsAPI.getAll().catch(() => [])
            ]);

            setUsers(usersData);
            setChats(chatsData);
            setPosts(postsData);
            setStatuses(statusesData);
            console.log('Fetching calls data:', callsData);
            setCalls(callsData);

            // Load admin data if admin (use fetchedUser if provided, else fall back to state)
            const role = fetchedUser?.role || currentUser?.role;
            if (role === 'admin') {
                const [adsData, reportsData, settingsData] = await Promise.all([
                    adminAPI.getAds().catch(() => []),
                    adminAPI.getReports().catch(() => []),
                    adminAPI.getSettings().catch(() => ({ maintenanceMode: false }))
                ]);
                setAds(adsData);
                setReports(reportsData);
                setSystemSettings(settingsData);
            }
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data');
        }
    };

    const refreshData = async () => {
        await loadAllData();
    };

    // ========== AUTH ==========
    const login = async (email: string, password: string): Promise<{ success: boolean; isAdminPanel?: boolean }> => {
        try {
            const response = await authAPI.login(email, password);
            setCurrentUser(response.user);
            await loadAllData();
            return { success: true, isAdminPanel: response.isAdminPanel || response.user?.isAdminPanel };
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message);
            return { success: false };
        }
    };

    const googleLogin = async (dataOrCredential: string | { googleId: string; email: string; name: string; avatar: string }): Promise<{ success: boolean; isAdminPanel?: boolean; error?: string }> => {
        try {
            const response = await authAPI.googleLogin(dataOrCredential);
            setCurrentUser(response.user);
            await loadAllData();
            return { success: true, isAdminPanel: response.isAdminPanel || response.user?.isAdminPanel };
        } catch (err: any) {
            console.error('Google Login error:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const signup = async (userData: any): Promise<boolean> => {
        try {
            const response = await authAPI.signup(userData);
            setCurrentUser(response.user);
            await loadAllData();
            return true;
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message);
            return false;
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } finally {
            setCurrentUser(null);
            setChats([]);
            setActiveChatIdInternal(null);
        }
    };

    const updateProfilePhoto = async (url: string) => {
        if (!currentUser) return;
        try {
            await usersAPI.update(currentUser.id, { avatar: url });
            setCurrentUser({ ...currentUser, avatar: url });
        } catch (err) {
            console.error('Update photo error:', err);
        }
    };

    const updateSettings = async (settings: Partial<UserSettings>) => {
        if (!currentUser) return;
        try {
            await usersAPI.updateSettings(currentUser.id, settings);
            setCurrentUser({
                ...currentUser,
                settings: { ...currentUser.settings, ...settings } as UserSettings
            });
        } catch (err) {
            console.error('Update settings error:', err);
        }
    };

    // ========== CHAT ==========
    const setActiveChatId = async (chatId: string | null) => {
        setActiveChatIdInternal(chatId);
        // Mark messages as read when opening chat
        if (chatId) {
            const chat = chats.find(c => c.id === chatId);
            if (chat && chat.unreadCount > 0) {
                // Update local state immediately
                setChats(prev => prev.map(c =>
                    c.id === chatId ? {
                        ...c,
                        unreadCount: 0,
                        messages: c.messages.map(m =>
                            m.senderId !== currentUser?.id ? { ...m, status: 'read' } : m
                        )
                    } : c
                ));

                // Call API to mark as read on server
                try {
                    await chatsAPI.markAsRead(chatId);

                    // Emit socket event for each unread message to update sender's UI
                    const unreadMessages = chat.messages.filter(m => m.senderId !== currentUser?.id && m.status !== 'read');
                    unreadMessages.forEach(msg => {
                        socket?.emit('message:read', {
                            chatId,
                            messageId: msg.id,
                            senderId: msg.senderId
                        });
                    });
                } catch (err) {
                    console.error('Failed to mark as read:', err);
                }
            }
        }
    };

    const sendMessage = async (chatId: string, content: string, type: 'text' | 'image' | 'voice' | 'video' | 'doc' | 'call' = 'text', mediaUrl?: string, duration?: string, replyToId?: string): Promise<Message | undefined> => {
        if (!currentUser) return undefined;
        try {
            const message = await chatsAPI.sendMessage(chatId, content, type, mediaUrl);

            // Update local state
            setChats(prev => prev.map(chat => {
                if (chat.id === chatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages, message]
                    };
                }
                return chat;
            }));

            // Return message so caller can emit socket event
            return message;

        } catch (err) {
            console.error('Send message error:', err);
            return undefined;
        }
    };

    const deleteMessage = async (chatId: string, messageId: string, forEveryone: boolean) => {
        try {
            await chatsAPI.deleteMessage(chatId, messageId, forEveryone);

            setChats(prev => prev.map(chat => {
                if (chat.id === chatId) {
                    return {
                        ...chat,
                        messages: chat.messages.map(m =>
                            m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
                        )
                    };
                }
                return chat;
            }));
        } catch (err) {
            console.error('Delete message error:', err);
        }
    };

    const starMessage = (chatId: string, messageId: string) => {
        setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                return {
                    ...chat,
                    messages: chat.messages.map(m =>
                        m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
                    )
                };
            }
            return chat;
        }));
    };

    const editMessage = async (chatId: string, messageId: string, newContent: string) => {
        try {
            await chatsAPI.editMessage(chatId, messageId, newContent);

            setChats(prev => prev.map(chat => {
                if (chat.id === chatId) {
                    return {
                        ...chat,
                        messages: chat.messages.map(m =>
                            m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
                        )
                    };
                }
                return chat;
            }));
        } catch (err) {
            console.error('Edit message error:', err);
        }
    };

    const createChat = async (participantId: string) => {
        try {
            const chat = await chatsAPI.create(participantId);
            setChats(prev => {
                const exists = prev.find(c => c.id === chat.id);
                if (exists) return prev;
                return [...prev, chat];
            });
            setActiveChatIdInternal(chat.id);
        } catch (err) {
            console.error('Create chat error:', err);
        }
    };

    const createGroupChat = async (name: string, participantIds: string[], image?: string) => {
        try {
            const chat = await chatsAPI.createGroup(name, participantIds, image);
            setChats(prev => [...prev, chat]);
            setActiveChatIdInternal(chat.id);
        } catch (err) {
            console.error('Create group error:', err);
        }
    };

    const toggleArchiveChat = async (chatId: string) => {
        try {
            const result = await chatsAPI.archive(chatId);
            // Update local user's archived chats
            if (currentUser) {
                const archivedChats = currentUser.archivedChats || [];
                if (result.archived) {
                    setCurrentUser({ ...currentUser, archivedChats: [...archivedChats, chatId] });
                } else {
                    setCurrentUser({ ...currentUser, archivedChats: archivedChats.filter(id => id !== chatId) });
                }
            }
        } catch (err) {
            console.error('Archive chat error:', err);
        }
    };

    const toggleFavoriteContact = async (contactId: string) => {
        if (!currentUser) return;
        try {
            const isFavorite = currentUser.favorites?.includes(contactId);
            if (isFavorite) {
                await usersAPI.removeFromFavorites(contactId);
                setCurrentUser({
                    ...currentUser,
                    favorites: currentUser.favorites?.filter(id => id !== contactId)
                });
            } else {
                await usersAPI.addToFavorites(contactId);
                setCurrentUser({
                    ...currentUser,
                    favorites: [...(currentUser.favorites || []), contactId]
                });
            }
        } catch (err) {
            console.error('Toggle favorite error:', err);
        }
    };

    // Socket message handlers - called by SocketContext when messages are received
    const handleIncomingMessage = async (chatId: string, message: Message) => {
        console.log('📨 VocaContext: Handling incoming message', { chatId, messageId: message.id, type: message.type });

        // Check if chat exists in local state
        const chatExists = chats.some(c => c.id === chatId);

        if (!chatExists) {
            // Chat not in local state, fetch all chats to get the new one
            console.log('📨 VocaContext: Chat not found locally, fetching from server...');
            try {
                const updatedChats = await chatsAPI.getAll();
                setChats(updatedChats);
                return; // The fetched chats will include the new message
            } catch (err) {
                console.error('Failed to fetch chats:', err);
                return;
            }
        }

        setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                // Check if message already exists (prevent duplicates)
                if (chat.messages.some(m => m.id === message.id)) {
                    return chat;
                }
                return {
                    ...chat,
                    messages: [...chat.messages, message],
                    unreadCount: chat.id === activeChatId ? 0 : chat.unreadCount + 1,
                    lastMessage: message
                };
            }
            return chat;
        }));
    };

    const handleMessageDelivered = (chatId: string, messageId: string) => {
        console.log('✓ VocaContext: Message delivered', { chatId, messageId });
        setChats(prev => prev.map(chat =>
            chat.id === chatId ? {
                ...chat,
                messages: chat.messages.map(m =>
                    m.id === messageId ? { ...m, status: 'delivered' } : m
                )
            } : chat
        ));
    };

    const handleMessageRead = (chatId: string, messageId: string) => {
        console.log('👁️ VocaContext: Message read', { chatId, messageId });
        setChats(prev => prev.map(chat =>
            chat.id === chatId ? {
                ...chat,
                messages: chat.messages.map(m =>
                    m.id === messageId ? { ...m, status: 'read' } : m
                )
            } : chat
        ));
    };

    const deleteChat = async (chatId: string) => {
        try {
            await chatsAPI.delete(chatId);
            setChats(prev => prev.filter(c => c.id !== chatId));
            if (activeChatId === chatId) {
                setActiveChatIdInternal(null);
            }
        } catch (err) {
            console.error('Delete chat error:', err);
        }
    };

    // ========== CALLS ==========
    const startCall = (participantId: string, type: 'voice' | 'video', fallbackParticipant?: User) => {
        const participant = users.find(u => u.id === participantId) || fallbackParticipant;
        if (participant) {
            setActiveCall({ type, isIncoming: false, participant });
        } else {
            console.error("Could not find participant for call:", participantId);
            // Optional: Show toast error here
        }
    };

    const endCall = async (duration?: string, status?: 'missed' | 'completed') => {
        console.log('📞 VocaContext: endCall called', { duration, status, hasActiveCall: !!activeCall, activeCallParticipant: activeCall?.participant?.name });

        if (activeCall && activeCall.participant && currentUser) {
            // Determine call direction and status
            const isIncomingCall = activeCall.isIncoming;
            const isMissedCall = status === 'missed';
            const callType = activeCall.type;

            const newCall: Call = {
                id: `call_${Date.now()}`,
                type: callType,
                caller: activeCall.participant!, // Always store the other participant as the 'contact' for the call log
                timestamp: new Date().toISOString(),
                duration: duration || '0:00',
                status: status || 'completed',
                direction: isIncomingCall ? 'incoming' : 'outgoing'
            };

            // Add to calls list
            setCalls(prev => [newCall, ...prev]);

            // Find or create chat with participant
            let chat = chats.find((c: Chat) =>
                !c.isGroup && c.participants.some((p: User) => p.id === activeCall.participant!.id)
            );

            if (!chat) {
                // Create new chat if doesn't exist
                try {
                    await createChat(activeCall.participant.id);
                    // Refresh chats to get the new chat
                    const updatedChats = await chatsAPI.getAll();
                    setChats(updatedChats);
                    chat = updatedChats.find((c: Chat) =>
                        !c.isGroup && c.participants.some((p: User) => p.id === activeCall.participant!.id)
                    );
                } catch (error) {
                    console.error('Error creating chat for call:', error);
                }
            }

            // Save call to backend
            try {
                // Determine if WE were the caller or receiver for the API record
                // If isIncomingCall is true, we received it.
                // If isIncomingCall is false, we initiated it.
                // The API needs 'participantId' (the OTHER person).

                const participantId = activeCall.participant.id;
                console.log('💾 Saving call to backend...', {
                    participantId,
                    callType,
                    status,
                    duration,
                    isIncomingCall
                });

                await callsAPI.create(
                    participantId,
                    callType,
                    status || 'completed',
                    duration,
                    isIncomingCall
                );

                console.log('✅ Call saved to backend successfully!');

                // Refresh calls list from backend to ensure consistency
                const updatedCalls = await callsAPI.getAll();
                setCalls(updatedCalls);
                console.log('✅ Call history refreshed from backend:', updatedCalls.length, 'total calls');


            } catch (error) {
                console.error('❌ Error saving call history to backend:', error);
                console.log('⚠️ This means Render backend is NOT deployed with ObjectId fix!');
                console.log('💾 Using fallback: Adding call to local state only (will not persist after refresh)');

                // Fallback: Add locally if backend fails
                const newCall: Call = {
                    id: `call_${Date.now()}`,
                    type: callType,
                    caller: activeCall.participant!,
                    timestamp: new Date().toISOString(),
                    duration: duration || '0:00',
                    status: status || 'completed',
                    direction: isIncomingCall ? 'incoming' : 'outgoing'
                };
                setCalls(prev => [newCall, ...prev]);
                console.log('✅ Call added to local state:', newCall);
            }

            // Add call message to chat
            if (chat) {
                const callIcon = callType === 'video' ? '📹' : '📞';
                let callLabel = '';

                if (isMissedCall) {
                    callLabel = isIncomingCall ? 'Missed' : 'Cancelled';
                } else {
                    callLabel = isIncomingCall ? 'Incoming' : 'Outgoing';
                }

                const durationText = duration && duration !== '0:00' ? ` (${duration})` : '';
                const content = `${callIcon} ${callLabel} ${callType === 'video' ? 'video' : 'voice'} call${durationText}`;

                const callMessage: Message = {
                    id: `msg_${Date.now()}`,
                    senderId: currentUser.id,
                    content,
                    type: 'call',
                    timestamp: new Date().toISOString(),
                    status: 'read',
                    duration: duration
                };

                setChats(prev => prev.map(c =>
                    c.id === chat!.id
                        ? { ...c, messages: [...c.messages, callMessage] }
                        : c
                ));

                // Also send via socket for real-time update
                try {
                    await sendMessage(chat.id, callMessage.content, callMessage.type);
                } catch (error) {
                    console.error('Error sending call message:', error);
                }
            }
        }
        console.log('📞 VocaContext: Clearing activeCall');
        setActiveCall(null);
    };

    // Fetch calls on mount (or when authenticated)
    const fetchCalls = useCallback(async () => {
        if (!currentUser) return;
        try {
            const data = await callsAPI.getAll();
            setCalls(data);
        } catch (error) {
            console.error('Error fetching calls:', error);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    // ========== STATUS ==========
    const createStatus = async (mediaUrl: string, type: 'text' | 'image', caption?: string) => {
        try {
            const status = await statusesAPI.create(mediaUrl, type, caption);
            setStatuses(prev => [status, ...prev]);
        } catch (err) {
            console.error('Create status error:', err);
        }
    };

    const deleteStatus = async (statusId: string) => {
        try {
            await statusesAPI.delete(statusId);
            setStatuses(prev => prev.filter(s => s.id !== statusId));
        } catch (err) {
            console.error('Delete status error:', err);
            throw err;
        }
    };

    // ========== POSTS ==========
    const createPost = async (content: string, imageUrl?: string) => {
        try {
            const post = await postsAPI.create(content, imageUrl);
            setPosts(prev => [post, ...prev]);
        } catch (err) {
            console.error('Create post error:', err);
        }
    };

    const likePost = async (postId: string) => {
        try {
            await postsAPI.like(postId);
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    const isLiked = p.likes.includes(currentUser?.id || '');
                    return {
                        ...p,
                        likes: isLiked
                            ? p.likes.filter(id => id !== currentUser?.id)
                            : [...p.likes, currentUser?.id || '']
                    };
                }
                return p;
            }));
        } catch (err) {
            console.error('Like post error:', err);
        }
    };

    const commentOnPost = async (postId: string, content: string) => {
        try {
            const comments = await postsAPI.comment(postId, content);
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, comments } : p
            ));
        } catch (err) {
            console.error('Comment error:', err);
        }
    };

    const sharePost = async (postId: string) => {
        try {
            await postsAPI.share(postId);
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, shares: p.shares + 1 } : p
            ));
        } catch (err) {
            console.error('Share post error:', err);
        }
    };

    const deletePost = async (postId: string) => {
        try {
            await postsAPI.delete(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (err) {
            console.error('Delete post error:', err);
        }
    };

    // ========== USER MANAGEMENT ==========
    const blockUser = async (userId: string) => {
        try {
            await usersAPI.block(userId);
            if (currentUser) {
                setCurrentUser({
                    ...currentUser,
                    blockedUsers: [...(currentUser.blockedUsers || []), userId]
                });
            }
        } catch (err) {
            console.error('Block user error:', err);
        }
    };

    const unblockUser = async (userId: string) => {
        try {
            await usersAPI.unblock(userId);
            if (currentUser) {
                setCurrentUser({
                    ...currentUser,
                    blockedUsers: currentUser.blockedUsers?.filter(id => id !== userId)
                });
            }
        } catch (err) {
            console.error('Unblock user error:', err);
        }
    };

    const updateUser = async (userId: string, data: Partial<User>) => {
        try {
            const updatedUser = await usersAPI.update(userId, data);
            setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            if (currentUser?.id === userId) {
                setCurrentUser(updatedUser);
            }
        } catch (err) {
            console.error('Update user error:', err);
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            await usersAPI.delete(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error('Delete user error:', err);
        }
    };

    const banUser = async (userId: string) => {
        try {
            await usersAPI.ban(userId);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, isBanned: true } : u
            ));
        } catch (err) {
            console.error('Ban user error:', err);
        }
    };

    const unbanUser = async (userId: string) => {
        try {
            await usersAPI.unban(userId);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, isBanned: false } : u
            ));
        } catch (err) {
            console.error('Unban user error:', err);
        }
    };

    const addUser = (user: Partial<User>) => {
        // This would typically be admin creating a user
        console.log('Add user not implemented for API', user);
    };

    // ========== ADMIN ==========
    const createAd = async (ad: Omit<Advertisement, 'id' | 'clicks' | 'views'>) => {
        try {
            const newAd = await adminAPI.createAd(ad);
            setAds(prev => [...prev, newAd]);
        } catch (err) {
            console.error('Create ad error:', err);
        }
    };

    const deleteAd = async (adId: string) => {
        try {
            await adminAPI.deleteAd(adId);
            setAds(prev => prev.filter(a => a.id !== adId));
        } catch (err) {
            console.error('Delete ad error:', err);
        }
    };

    const toggleAd = async (adId: string) => {
        try {
            const updatedAd = await adminAPI.toggleAd(adId);
            setAds(prev => prev.map(a => a.id === adId ? updatedAd : a));
        } catch (err) {
            console.error('Toggle ad error:', err);
        }
    };

    const incrementAdClick = (adId: string) => {
        setAds(prev => prev.map(a =>
            a.id === adId ? { ...a, clicks: a.clicks + 1 } : a
        ));
    };

    const incrementAdView = (adId: string) => {
        setAds(prev => prev.map(a =>
            a.id === adId ? { ...a, views: a.views + 1 } : a
        ));
    };

    const createReport = (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => {
        const newReport: Report = {
            ...report,
            id: `report_${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        setReports(prev => [...prev, newReport]);
    };

    const resolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
        try {
            await adminAPI.updateReport(reportId, status);
            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status } : r
            ));
        } catch (err) {
            console.error('Resolve report error:', err);
        }
    };

    const sendBroadcast = async (message: string) => {
        try {
            await adminAPI.sendBroadcast(message);
            // Refresh chats to show the broadcast
            const chatsData = await chatsAPI.getAll();
            setChats(chatsData);
        } catch (err) {
            console.error('Broadcast error:', err);
        }
    };

    const updateSystemSettings = async (settings: Partial<{ maintenanceMode: boolean; fileUploadLimitMB: number }>) => {
        try {
            const updated = await adminAPI.updateSettings(settings);
            setSystemSettings(updated);
        } catch (err) {
            console.error('Update settings error:', err);
        }
    };

    // ========== SEARCH HELPERS ==========
    const searchMessages = (query: string, chatId?: string): Message[] => {
        const lowerQuery = query.toLowerCase();
        let messages: Message[] = [];

        const targetChats = chatId ? chats.filter(c => c.id === chatId) : chats;
        targetChats.forEach(chat => {
            chat.messages.forEach(msg => {
                if (msg.content.toLowerCase().includes(lowerQuery)) {
                    messages.push(msg);
                }
            });
        });

        return messages;
    };

    const getStarredMessages = (): { message: Message, chat: Chat }[] => {
        const starred: { message: Message, chat: Chat }[] = [];
        chats.forEach(chat => {
            chat.messages.forEach(msg => {
                if (msg.isStarred) {
                    starred.push({ message: msg, chat });
                }
            });
        });
        return starred;
    };

    const value: VocaContextType = {
        currentUser,
        users,
        chats,
        activeChatId,
        ads,
        reports,
        statuses,
        calls,
        loading,
        error,

        login,
        googleLogin,
        signup,
        logout,
        updateProfilePhoto,
        updateSettings,

        sendMessage,
        deleteMessage,
        starMessage,
        setActiveChatId,
        activeCall,
        startCall,
        endCall,
        createChat,
        createGroupChat,
        toggleArchiveChat,
        toggleFavoriteContact,
        handleIncomingMessage,
        handleMessageDelivered,
        handleMessageRead,
        handleIncomingCall,

        createStatus,
        deleteStatus,
        searchMessages,
        editMessage,
        getStarredMessages,

        addUser,
        deleteUser,
        banUser,
        unbanUser,
        updateUser,
        blockUser,
        unblockUser,
        deleteChat,

        createAd,
        deleteAd,
        toggleAd,
        incrementAdClick,
        incrementAdView,

        createReport,
        resolveReport,
        sendBroadcast,

        posts,
        createPost,
        likePost,
        commentOnPost,
        sharePost,
        deletePost,

        systemSettings,
        updateSystemSettings,

        isAdmin,
        refreshData
    };

    return (
        <VocaContext.Provider value={value}>
            {children}
        </VocaContext.Provider>
    );
};

export const useVoca = () => {
    const context = useContext(VocaContext);
    if (context === undefined) {
        throw new Error('useVoca must be used within a VocaProvider');
    }
    return context;
};
