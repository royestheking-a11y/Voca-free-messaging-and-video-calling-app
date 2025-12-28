import { format, subMinutes, subHours, subDays } from 'date-fns';

// --- Colors ---
export const COLORS = {
  primary: '#006D77',
  accent: '#83C5BE',
  bg: '#EDF6F5',
  dark: '#004E56',
};

// --- Types ---

export type UserRole = 'user' | 'admin';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
  security: {
    twoFactor: boolean;
  };
  storage: {
    autoDownloadWifi: ('image' | 'audio' | 'video' | 'document')[];
    autoDownloadCellular: ('image' | 'audio' | 'video' | 'document')[];
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: 'online' | 'offline' | 'busy';
  lastSeen: string;
  verified: boolean;
  isBanned?: boolean;
  about?: string;
  phoneNumber?: string;
  wallpaper?: string;
  joinedAt?: string;
  settings?: UserSettings;
  favorites?: string[]; // IDs of favorite contacts
  password?: string;
  blockedUsers?: string[]; // IDs of blocked users
  archivedChats?: string[]; // IDs of archived chats (per user)
  isVocaTeam?: boolean; // Special flag for Voca Team official account (blue badge)
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'video' | 'doc' | 'call';
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string>;
  isStarred?: boolean;
  mediaUrl?: string; // For images/videos
  duration?: string; // For voice notes
  fileName?: string; // For docs
  isDeleted?: boolean; // Deleted for everyone (unsent)
  isEdited?: boolean; // Edited message
  deletedFor?: string[]; // IDs of users who deleted this message for themselves
  replyToId?: string;
  isUploading?: boolean; // Optimistic UI: true if currently uploading
  progress?: number; // Upload progress 0-100
}

export interface Chat {
  id: string;
  participants: User[];
  messages: Message[];
  unreadCount: number;
  isGroup: boolean;
  name?: string; // For groups
  groupImage?: string;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
}

export interface Call {
  id: string;
  type: 'voice' | 'video';
  caller: User;
  timestamp: string;
  duration?: string;
  status: 'missed' | 'completed' | 'ongoing';
  direction: 'incoming' | 'outgoing'; // Track call direction
}

export interface StatusUpdate {
  id: string;
  userId: string;
  user: User; // De-normalized for easier UI
  content: string; // Text or Image URL
  mediaUrl?: string; // Backend field for media
  caption?: string; // Backend field for caption
  type: 'text' | 'image';
  mediaType?: 'text' | 'image' | 'video'; // Backend field for type
  timestamp: string;
  viewers: User[];
  color?: string; // background color for text status
}

export interface Advertisement {
  id: string;
  title: string;
  content: string; // Text content
  imageUrl?: string;
  position: 'landing_page' | 'chat_list' | 'sidebar';
  active: boolean;
  link?: string;
  clicks: number;
  views: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string; // If reporting a user
  reportedContentId?: string; // If reporting a message/ad
  reason: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface PostComment {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  likes: string[]; // User IDs who liked this comment
}

export interface Post {
  id: string;
  userId: string;
  user: User; // De-normalized for easier UI
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: string[]; // User IDs who liked
  comments: PostComment[];
  shares: number;
}

// --- Mock Data ---

// Voca Team Official Profile (for broadcast messages)
const VOCA_TEAM_USER: User = {
  id: 'voca-team',
  name: 'Voca Team',
  email: 'team@voca.com',
  avatar: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=150&h=150&fit=crop',
  role: 'admin',
  status: 'online',
  lastSeen: new Date().toISOString(),
  verified: true,
  about: 'Official Voca Team - Announcements & Updates',
  phoneNumber: '',
  joinedAt: new Date('2024-01-01').toISOString(),
  isVocaTeam: true // Special flag for blue verified badge
};

const MOCK_USERS: User[] = [
  VOCA_TEAM_USER,
  {
    id: 'u1',
    name: 'Alice Chen',
    email: 'alice@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    role: 'user',
    status: 'online',
    lastSeen: new Date().toISOString(),
    verified: true,
    about: 'Design is intelligence made visible.',
    phoneNumber: '+1 (555) 010-9988',
    joinedAt: subHours(new Date(), 24 * 1).toISOString(),
    settings: {
      theme: 'dark',
      notifications: true,
      privacy: { lastSeen: 'everyone', profilePhoto: 'everyone', about: 'everyone', readReceipts: true },
      security: { twoFactor: false },
      storage: { autoDownloadWifi: ['image'], autoDownloadCellular: [] }
    },
    password: 'password123'
  },
  {
    id: 'u2',
    name: 'Bob Miller',
    email: 'bob@example.com',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop',
    role: 'user',
    status: 'offline',
    lastSeen: subMinutes(new Date(), 15).toISOString(),
    verified: true,
    about: 'Available for freelance work.',
    phoneNumber: '+1 (555) 012-3456',
    joinedAt: subHours(new Date(), 24 * 3).toISOString(),
  },
  {
    id: 'u3',
    name: 'Charlie Kim',
    email: 'charlie@example.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    role: 'user',
    status: 'busy',
    lastSeen: subHours(new Date(), 2).toISOString(),
    verified: false,
    about: 'At the gym 🏋️',
    phoneNumber: '+1 (555) 098-7654',
    joinedAt: subHours(new Date(), 24 * 5).toISOString(),
  },
  {
    id: 'admin',
    name: 'Admin User',
    email: 'admin@voca.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    role: 'admin',
    status: 'online',
    lastSeen: new Date().toISOString(),
    verified: true,
    about: 'System Administrator',
    phoneNumber: '+1 (555) 000-0000',
    joinedAt: subHours(new Date(), 24 * 6).toISOString(),
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderId: 'u2',
    content: 'Hey! Did you check out the new design?',
    type: 'text',
    timestamp: subMinutes(new Date(), 10).toISOString(),
    status: 'read',
    isStarred: true
  },
  {
    id: 'm2',
    senderId: 'me',
    content: 'Yes! The teal and mint combo looks fantastic.',
    type: 'text',
    timestamp: subMinutes(new Date(), 9).toISOString(),
    status: 'read',
  },
  {
    id: 'm3',
    senderId: 'u2',
    content: 'I know right? Very professional.',
    type: 'text',
    timestamp: subMinutes(new Date(), 8).toISOString(),
    status: 'read',
  },
  {
    id: 'm4',
    senderId: 'u2',
    content: 'Here is the project proposal.',
    type: 'doc',
    fileName: 'Project_Voca_v2.pdf',
    timestamp: subMinutes(new Date(), 7).toISOString(),
    status: 'read',
  },
  {
    id: 'm5',
    senderId: 'me',
    content: 'Thanks, I will review it.',
    type: 'voice',
    duration: '0:45',
    timestamp: subMinutes(new Date(), 6).toISOString(),
    status: 'read',
  },
  {
    id: 'm6',
    senderId: 'u2',
    content: 'Check this out!',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    timestamp: subMinutes(new Date(), 5).toISOString(),
    status: 'read',
    isStarred: true
  }
];

const MOCK_CHATS: Chat[] = [
  {
    id: 'c1',
    participants: [MOCK_USERS[0]],
    messages: [
      { id: 'm10', senderId: 'u1', content: 'Meeting is at 3 PM', type: 'text', timestamp: subHours(new Date(), 1).toISOString(), status: 'read', isStarred: true },
      { id: 'm11', senderId: 'me', content: 'Got it, thanks!', type: 'text', timestamp: subHours(new Date(), 1).toISOString(), status: 'read' },
      { id: 'm12', senderId: 'u1', content: 'Design assets', type: 'image', mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&auto=format&fit=crop&q=60', timestamp: subHours(new Date(), 1).toISOString(), status: 'read' }
    ],
    unreadCount: 0,
    isGroup: false,
  },
  {
    id: 'c2',
    participants: [MOCK_USERS[1]],
    messages: MOCK_MESSAGES,
    unreadCount: 0,
    isGroup: false,
  },
  {
    id: 'c3',
    participants: [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[2]],
    messages: [
      { id: 'm20', senderId: 'u3', content: 'Who is bringing the pizza?', type: 'text', timestamp: subHours(new Date(), 5).toISOString(), status: 'read' },
      { id: 'm21', senderId: 'u2', content: 'I can order it.', type: 'text', timestamp: subHours(new Date(), 5).toISOString(), status: 'read', isStarred: true }
    ],
    unreadCount: 0,
    isGroup: true,
    name: 'Project Voca Team',
    groupImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop'
  }
];

const MOCK_ADS: Advertisement[] = [
  {
    id: 'ad1',
    title: 'Premium Voca',
    content: 'Upgrade to Voca Premium for unlimited file sharing.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cHJlbWl1bXxlbnwwfHwwfHx8MA%3D%3D',
    position: 'chat_list',
    active: true,
    clicks: 0,
    views: 0
  },
  {
    id: 'ad2',
    title: 'Tech Conference 2025',
    content: 'Join the biggest tech event of the year.',
    position: 'landing_page',
    active: true,
    clicks: 0,
    views: 0
  },
  {
    id: 'ad3',
    title: 'Dev Tools Pro',
    content: 'The ultimate toolkit for developers.',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60',
    position: 'sidebar',
    active: true,
    clicks: 0,
    views: 0
  }
];

const MOCK_REPORTS: Report[] = [
  {
    id: 'r1',
    reporterId: 'u1',
    reportedUserId: 'u3',
    reason: 'Spamming in group chat',
    timestamp: subHours(new Date(), 2).toISOString(),
    status: 'pending'
  }
];

const MOCK_STATUSES: StatusUpdate[] = [
  {
    id: 's1',
    userId: 'u1',
    user: MOCK_USERS[0],
    content: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500&auto=format&fit=crop&q=60',
    type: 'image',
    timestamp: subMinutes(new Date(), 30).toISOString(),
    viewers: []
  },
  {
    id: 's2',
    userId: 'u2',
    user: MOCK_USERS[1],
    content: 'Working late tonight! 💻',
    type: 'text',
    color: '#005c4b',
    timestamp: subHours(new Date(), 5).toISOString(),
    viewers: []
  }
];

const MOCK_CALLS: Call[] = [
  {
    id: 'call1',
    type: 'voice',
    caller: MOCK_USERS[1],
    timestamp: subHours(new Date(), 2).toISOString(),
    duration: '12:45',
    status: 'completed',
    direction: 'incoming',
  },
  {
    id: 'call2',
    type: 'video',
    caller: MOCK_USERS[2],
    timestamp: subDays(new Date(), 1).toISOString(),
    status: 'missed',
    direction: 'incoming',
  },
  {
    id: 'call3',
    type: 'voice',
    caller: MOCK_USERS[3],
    timestamp: subDays(new Date(), 2).toISOString(),
    duration: '5:20',
    status: 'completed',
    direction: 'outgoing',
  }
];

const MOCK_POSTS: Post[] = [
  {
    id: 'post1',
    userId: 'u1',
    user: MOCK_USERS[0],
    content: "Just finished designing a new app interface! What do you all think? 🎨✨ The minimalist approach really makes the content shine.",
    imageUrl: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?w=600&auto=format&fit=crop&q=60',
    timestamp: subHours(new Date(), 2).toISOString(),
    likes: ['u2', 'u3'],
    comments: [
      { id: 'c1', userId: 'u2', content: 'Looks amazing! Love the colors 😍', timestamp: subHours(new Date(), 1.5).toISOString(), likes: ['u1'] },
      { id: 'c2', userId: 'u3', content: 'Great work Alice!', timestamp: subHours(new Date(), 1).toISOString(), likes: [] }
    ],
    shares: 3
  },
  {
    id: 'post2',
    userId: 'u2',
    user: MOCK_USERS[1],
    content: "Coffee and code - the perfect combination! ☕💻 Working on some exciting new features today.",
    timestamp: subHours(new Date(), 5).toISOString(),
    likes: ['u1'],
    comments: [],
    shares: 1
  },
  {
    id: 'post3',
    userId: 'u3',
    user: MOCK_USERS[2],
    content: "Beautiful sunset from my balcony today. Sometimes you need to stop and appreciate the little things in life. 🌅",
    imageUrl: 'https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=600&auto=format&fit=crop&q=60',
    timestamp: subDays(new Date(), 1).toISOString(),
    likes: ['u1', 'u2', 'u4'],
    comments: [
      { id: 'c3', userId: 'u1', content: 'Stunning view! 😍', timestamp: subHours(new Date(), 20).toISOString(), likes: ['u3'] }
    ],
    shares: 5
  }
];

// --- Store Logic ---

const STORAGE_KEY = 'voca_app_data_v4';

export interface SystemSettings {
  maintenanceMode: boolean;
  fileUploadLimitMB: number;
}

export const loadData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with mocks if empty
  return {
    currentUser: null, // Logged out by default
    users: MOCK_USERS,
    chats: MOCK_CHATS,
    statuses: MOCK_STATUSES,
    calls: MOCK_CALLS,
    posts: MOCK_POSTS,
    ads: MOCK_ADS,
    reports: MOCK_REPORTS,
    systemSettings: {
      maintenanceMode: false,
      fileUploadLimitMB: 10
    }
  };
};

export const saveData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getCurrentUser = () => {
  const data = loadData();
  return data.currentUser;
}
