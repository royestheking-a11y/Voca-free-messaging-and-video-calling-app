// API Client for Voca Backend
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

// Token storage
const getToken = () => localStorage.getItem('voca_token');
const setToken = (token: string) => localStorage.setItem('voca_token', token);
const removeToken = () => localStorage.removeItem('voca_token');

// Fetch wrapper with auth
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Use URL constructor to handle slashes correctly
    // Ensure API_BASE_URL doesn't have double slashes before forming the URL object if possible, 
    // but the URL constructor is good at normalization.
    // We treat API_BASE_URL as the base.

    // Clean base URL first to ensure it's valid
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Construct URL manually to be safe against URL constructor edge cases with base paths
    // If base has /api, URL constructor with /auth/login might strip /api if not careful.
    // Actually safe concat is better:
    const url = `${cleanBase}${cleanEndpoint}`;
    // But we want to remove double slashes from the result
    const finalUrl = url.replace(/([^:]\/)\/+/g, "$1");

    const response = await fetch(finalUrl, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        removeToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }

    return data;
};

// ========== AUTH API ==========
export const authAPI = {
    signup: async (userData: {
        name: string;
        email: string;
        password: string;
        avatar?: string;
        photos?: string[];
        age?: number;
        gender?: string;
        location?: any;
        interests?: string[];
        bio?: string;
    }) => {
        const data = await fetchWithAuth('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        setToken(data.token);
        return data;
    },

    login: async (email: string, password: string) => {
        const data = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data;
    },

    googleLogin: async (dataOrCredential: string | { googleId: string; email: string; name: string; avatar: string }) => {
        let userData;

        if (typeof dataOrCredential === 'string') {
            const parseJwt = (token: string) => {
                try {
                    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                } catch (e) {
                    return null;
                }
            };

            const decoded: any = parseJwt(dataOrCredential);
            if (!decoded) throw new Error('Invalid Google Token');

            userData = {
                googleId: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                avatar: decoded.picture
            };
        } else {
            userData = dataOrCredential;
        }

        const data = await fetchWithAuth('/auth/google', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        setToken(data.token);
        return data;
    },

    adminLogin: async (email: string, password: string) => {
        const data = await fetchWithAuth('/auth/admin-login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data;
    },

    logout: async () => {
        try {
            await fetchWithAuth('/auth/logout', { method: 'POST' });
        } finally {
            removeToken();
        }
    },

    getCurrentUser: async () => {
        return await fetchWithAuth('/auth/me');
    },

    getToken,
    setToken,
    removeToken,
    isAuthenticated: () => !!getToken(),
};

// ========== USERS API ==========
export const usersAPI = {
    getAll: async () => fetchWithAuth('/users'),

    getById: async (id: string) => fetchWithAuth(`/users/${id}`),

    update: async (id: string, updates: any) =>
        fetchWithAuth(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    updateSettings: async (id: string, settings: any) =>
        fetchWithAuth(`/users/${id}/settings`, { method: 'PUT', body: JSON.stringify(settings) }),

    block: async (id: string) =>
        fetchWithAuth(`/users/${id}/block`, { method: 'POST' }),

    unblock: async (id: string) =>
        fetchWithAuth(`/users/${id}/unblock`, { method: 'POST' }),

    addToFavorites: async (id: string) =>
        fetchWithAuth(`/users/${id}/favorite`, { method: 'POST' }),

    removeFromFavorites: async (id: string) =>
        fetchWithAuth(`/users/${id}/favorite`, { method: 'DELETE' }),

    // Admin only
    delete: async (id: string) =>
        fetchWithAuth(`/users/${id}`, { method: 'DELETE' }),

    ban: async (id: string) =>
        fetchWithAuth(`/users/${id}/ban`, { method: 'POST' }),

    unban: async (id: string) =>
        fetchWithAuth(`/users/${id}/unban`, { method: 'POST' }),
};

// ========== CHATS API ==========
export const chatsAPI = {
    getAll: async () => fetchWithAuth('/chats'),

    create: async (participantId: string) =>
        fetchWithAuth('/chats', { method: 'POST', body: JSON.stringify({ participantId }) }),

    createGroup: async (name: string, participantIds: string[], groupImage?: string) =>
        fetchWithAuth('/chats', {
            method: 'POST',
            body: JSON.stringify({ isGroup: true, name, participantIds, groupImage })
        }),

    getMessages: async (chatId: string, limit = 50) =>
        fetchWithAuth(`/chats/${chatId}/messages?limit=${limit}`),

    sendMessage: async (chatId: string, content: string, type = 'text', mediaUrl?: string, replyToId?: string) =>
        fetchWithAuth(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, type, mediaUrl, replyToId }),
        }),

    deleteMessage: async (chatId: string, messageId: string, forEveryone = false) =>
        fetchWithAuth(`/chats/${chatId}/messages/${messageId}?forEveryone=${forEveryone}`, {
            method: 'DELETE',
        }),

    editMessage: async (chatId: string, messageId: string, content: string) =>
        fetchWithAuth(`/chats/${chatId}/messages/${messageId}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    archive: async (chatId: string) =>
        fetchWithAuth(`/chats/${chatId}/archive`, { method: 'POST' }),

    delete: async (chatId: string) =>
        fetchWithAuth(`/chats/${chatId}`, { method: 'DELETE' }),

    markAsRead: async (chatId: string) =>
        fetchWithAuth(`/chats/${chatId}/read`, { method: 'POST' }),
};

// ========== UPLOAD API ==========
export const uploadAPI = {
    image: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        return response.json();
    },

    video: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/upload/video`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        return response.json();
    },

    voice: async (blob: Blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'voice.webm');

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/upload/voice`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        return response.json();
    },

    avatar: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        return response.json();
    },

    base64: async (data: string, folder?: string) =>
        fetchWithAuth('/upload/base64', {
            method: 'POST',
            body: JSON.stringify({ data, folder }),
        }),
};

// ========== POSTS API ==========
export const postsAPI = {
    getAll: async (limit = 20, skip = 0) =>
        fetchWithAuth(`/posts?limit=${limit}&skip=${skip}`),

    create: async (content: string, imageUrl?: string) =>
        fetchWithAuth('/posts', { method: 'POST', body: JSON.stringify({ content, imageUrl }) }),

    like: async (postId: string) =>
        fetchWithAuth(`/posts/${postId}/like`, { method: 'POST' }),

    comment: async (postId: string, content: string) =>
        fetchWithAuth(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ content }) }),

    share: async (postId: string) =>
        fetchWithAuth(`/posts/${postId}/share`, { method: 'POST' }),

    delete: async (postId: string) =>
        fetchWithAuth(`/posts/${postId}`, { method: 'DELETE' }),
};

// ========== STATUSES API ==========
export const statusesAPI = {
    getAll: async () => fetchWithAuth('/statuses'),

    create: async (mediaUrl: string, mediaType: 'image' | 'video' | 'text', caption?: string) =>
        fetchWithAuth('/statuses', {
            method: 'POST',
            body: JSON.stringify({ mediaUrl, mediaType, caption })
        }),

    view: async (statusId: string) =>
        fetchWithAuth(`/statuses/${statusId}/view`, { method: 'POST' }),

    delete: async (statusId: string) =>
        fetchWithAuth(`/statuses/${statusId}`, { method: 'DELETE' }),
};

// ========== CALLS API ==========
export const callsAPI = {
    getAll: async () => fetchWithAuth('/calls'),

    create: async (participantId: string, type: 'voice' | 'video', status: 'missed' | 'completed', duration?: string, isIncoming?: boolean) =>
        fetchWithAuth('/calls', {
            method: 'POST',
            body: JSON.stringify({ participantId, type, status, duration, isIncoming })
        }),
};

// ========== ADMIN API ==========
export const adminAPI = {
    getStats: async () => fetchWithAuth('/admin/stats'),

    // Messages (God Mode)
    getMessages: async () => fetchWithAuth('/admin/messages'),

    // Reports
    getReports: async () => fetchWithAuth('/admin/reports'),
    updateReport: async (id: string, status: string) =>
        fetchWithAuth(`/admin/reports/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

    // Ads
    getAds: async () => fetchWithAuth('/admin/ads'),
    createAd: async (ad: any) =>
        fetchWithAuth('/admin/ads', { method: 'POST', body: JSON.stringify(ad) }),
    updateAd: async (id: string, updates: any) =>
        fetchWithAuth(`/admin/ads/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteAd: async (id: string) =>
        fetchWithAuth(`/admin/ads/${id}`, { method: 'DELETE' }),
    toggleAd: async (id: string) =>
        fetchWithAuth(`/admin/ads/${id}/toggle`, { method: 'POST' }),

    // Settings
    getSettings: async () => fetchWithAuth('/admin/settings'),
    updateSettings: async (settings: any) =>
        fetchWithAuth('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),

    // Broadcast
    sendBroadcast: async (message: string) =>
        fetchWithAuth('/admin/broadcast', { method: 'POST', body: JSON.stringify({ message }) }),

    // God Mode
    getAllMessages: async (limit = 100, includeDeleted = true) =>
        fetchWithAuth(`/admin/messages?limit=${limit}&includeDeleted=${includeDeleted}`),
    forceDeleteMessage: async (messageId: string) =>
        fetchWithAuth(`/admin/messages/${messageId}`, { method: 'DELETE' }),
};

// Export default API object
export default {
    auth: authAPI,
    users: usersAPI,
    chats: chatsAPI,
    upload: uploadAPI,
    posts: postsAPI,
    statuses: statusesAPI,
    calls: callsAPI,
    admin: adminAPI,
};
