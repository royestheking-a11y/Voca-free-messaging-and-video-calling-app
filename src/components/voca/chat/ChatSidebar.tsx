import React, { useState, useEffect } from 'react';
import { useVoca } from '../VocaContext';
import { useSocket } from '../SocketContext';
import { CameraComponent } from './CameraComponent';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  Search, Plus, MoreVertical, MessageSquare, CircleDashed,
  Users, Phone, Camera, Archive, PhoneIncoming, PhoneOutgoing,
  Video, Star, ArrowLeft, Clock, Check, CheckCheck, Edit, FileText, BarChart2
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '../../ui/utils';
import { toast } from 'sonner';
import { UserProfileSettings } from './UserProfileSettings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../../ui/context-menu';
import { StarredMessagesView } from './StarredMessagesView';
import { CreateStatusDialog } from './CreateStatusDialog';
import { StatusViewer } from './StatusViewer';
import { NewChatDialog } from './NewChatDialog';
import { NewGroupDialog } from './NewGroupDialog';
import { ContactPickerDialog } from './ContactPickerDialog';
import { CreatePostDialog } from './CreatePostDialog';
import { PostCard } from './PostCard';
import { ChatListSkeleton, CallItemSkeleton, StatusSkeleton } from './SkeletonLoaders';

type SidebarTab = 'chats' | 'status' | 'posts' | 'groups' | 'calls';
type ChatFilter = 'all' | 'unread' | 'favorites' | 'groups';

import { useNavigate, useLocation, useMatch } from 'react-router-dom';

export const ChatSidebar = () => {
  const {
    chats, activeChatId, setActiveChatId, currentUser, logout, statuses, createStatus,
    calls, createChat, toggleArchiveChat, toggleFavoriteContact, createGroupChat, startCall, deleteChat,
    posts, users, loading, ads, incrementAdClick, incrementAdView
  } = useVoca();
  const { isConnected, onlineUsers, typingUsers } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const isStatus = !!useMatch('/chat/status');
  const isCalls = !!useMatch('/chat/calls');
  const isGroups = !!useMatch('/chat/groups');
  const isPosts = !!useMatch('/chat/posts'); // Assuming posts might have a route or stay hidden

  let activeTab: SidebarTab = 'chats';
  if (isStatus) activeTab = 'status';
  else if (isCalls) activeTab = 'calls';
  else if (isGroups) activeTab = 'groups';
  else if (isPosts) activeTab = 'posts';
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Dialogs State
  const [showProfile, setShowProfile] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerMode, setContactPickerMode] = useState<'call' | 'favorite'>('call');
  const [viewingStatus, setViewingStatus] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [lastCallsViewTime, setLastCallsViewTime] = useState<number>(Date.now());

  // Mark calls as "viewed" when user opens the Calls tab
  useEffect(() => {
    if (activeTab === 'calls') {
      setLastCallsViewTime(Date.now());
    }
  }, [activeTab]);

  // Camera capture handler for status
  const handleCameraCapture = async (imageData: string, caption?: string) => {
    try {
      // Upload to Cloudinary  
      const { uploadAPI } = await import('../../../lib/api');
      const result = await uploadAPI.base64(imageData, 'status');
      const imageUrl = result.url;

      // Create status with image
      await createStatus(imageUrl, 'image', caption);
      toast.success('Status posted!');
    } catch (error) {
      console.error('Status camera upload error:', error);
      toast.error('Failed to post status');
    }
  };

  // --- Logic ---

  // --- Logic ---

  // Chats Logic (Moved up to fix ReferenceError)
  const userArchivedChats = currentUser?.archivedChats || [];

  const visibleChats = chats.filter(chat => {
    // Filter by participation
    if (!currentUser || !chat.participants.some(p => p.id === currentUser.id)) return false;

    const isArchived = userArchivedChats.includes(chat.id);
    if (showArchived) return isArchived;
    return !isArchived;
  });

  const filteredChats = visibleChats.filter(chat => {
    // Search
    const otherParticipant = chat.participants.find(p => p.id !== currentUser?.id);
    const name = chat.isGroup ? chat.name : otherParticipant?.name;
    const messages = chat.messages || [];
    const lastMsg = messages[messages.length - 1]?.content;
    const matchesSearch = name?.toLowerCase().includes(searchTerm.toLowerCase()) || lastMsg?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filters
    if (activeFilter === 'unread' && chat.unreadCount === 0) return false;
    if (activeFilter === 'groups' && !chat.isGroup) return false;
    if (activeFilter === 'favorites') {
      if (chat.isGroup) return false; // Groups can't be 'favorite' contacts easily in this model
      return currentUser?.favorites?.includes(otherParticipant?.id || '');
    }

    // Tab specific
    if (activeTab === 'groups' && !chat.isGroup) return false;

    return true;
  }).sort((a, b) => {
    // Sort by last message time
    // Chats WITH messages sort by timestamp (newest first)
    // Chats WITHOUT messages (drafts) go to the bottom
    const messagesA = a.messages || [];
    const messagesB = b.messages || [];
    const lastMsgA = messagesA[messagesA.length - 1];
    const lastMsgB = messagesB[messagesB.length - 1];

    // If one has messages and one doesn't, chat with messages comes first
    if (lastMsgA && !lastMsgB) return -1;
    if (!lastMsgA && lastMsgB) return 1;

    // If neither has messages, maintain order (both are drafts)
    if (!lastMsgA && !lastMsgB) return 0;

    // Both have messages, sort by timestamp (newest first)
    const timeA = new Date(lastMsgA.timestamp).getTime();
    const timeB = new Date(lastMsgB.timestamp).getTime();

    return timeB - timeA;
  });


  // Filter Ads
  const sidebarAds = ads.filter(a => a.active && a.position === 'sidebar');
  const chatListAds = ads.filter(a => a.active && a.position === 'chat_list');

  // Status Logic
  const validStatuses = statuses.filter(s => {
    const timeDiff = new Date().getTime() - new Date(s.timestamp).getTime();
    return timeDiff < 24 * 60 * 60 * 1000;
  });
  // Handle both string userId and populated user object from backend
  const getStatusUserId = (s: any): string | null => {
    if (!s || !s.userId) return null;
    const uid = s.userId;

    // If it's a simple string ID
    if (typeof uid === 'string') return uid;

    // If it's a populated object, try _id first (Mongoose default), then id
    if (uid._id) return String(uid._id);
    if (uid.id) return String(uid.id);

    // Fallback: If it's an ObjectId-like object that converts to string cleanly
    if (uid.toString && uid.toString() !== '[object Object]') {
      return uid.toString();
    }

    return null;
  };

  const myStatus = validStatuses.filter(s => {
    const sid = getStatusUserId(s);
    return sid && String(sid) === String(currentUser?.id);
  });
  const otherStatuses = validStatuses.filter(s => {
    // Only show status if it's not mine AND if I have a chat/connection with them
    // For simplicity, we check if they are in 'visibleChats'
    const statusUserId = getStatusUserId(s);
    if (!statusUserId || String(statusUserId) === String(currentUser?.id)) return false;

    const isKnownContact = visibleChats.some(chat => chat.participants.some(p => p.id === statusUserId));
    if (!isKnownContact) return false;

    // Hide status if the poster has blocked the current user
    const poster = users.find((u: any) => u.id === statusUserId);
    if (poster?.blockedUsers?.includes(currentUser?.id || '')) return false;

    return true;
  });
  const groupedStatuses: Record<string, typeof otherStatuses> = {};
  otherStatuses.forEach(s => {
    const userId = getStatusUserId(s);
    if (userId) {
      if (!groupedStatuses[userId]) groupedStatuses[userId] = [];
      groupedStatuses[userId].push(s);
    }
  });
  const recentUserIds = Object.keys(groupedStatuses);
  if (myStatus.length > 0 && currentUser) {
    groupedStatuses[currentUser.id] = myStatus;
  }

  const archivedCount = userArchivedChats.length;
  const favoriteContacts = currentUser?.favorites || [];

  // Count chats with unread messages
  const unreadChatsCount = visibleChats.filter(c => c.unreadCount > 0).length;

  // Count NEW missed calls (only calls that arrived after last viewing the Calls tab)
  const missedCallsCount = calls.filter(c =>
    c.status === 'missed' && new Date(c.timestamp).getTime() > lastCallsViewTime
  ).length;

  // Derive "Added Contacts" from unique participants in chats
  const allMyContacts = React.useMemo(() => {
    const unique = new Map();
    chats.forEach(chat => {
      chat.participants.forEach(p => {
        if (p.id !== currentUser?.id) {
          unique.set(p.id, p);
        }
      });
    });
    return Array.from(unique.values());
  }, [chats, currentUser]);

  const filteredContactsForCalls = allMyContacts.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Calls
  const filteredCalls = calls.filter(call => {
    // Show all calls associated with this user context
    return call.caller.name.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  console.log('ChatSidebar Calls Debug:', { total: calls.length, filtered: filteredCalls.length, calls, contactsFound: filteredContactsForCalls.length });

  // --- Handlers ---

  const handleOpenStatus = (userId: string) => {
    setViewingStatus(userId);
  };



  const handleContactPick = (userId: string) => {
    if (contactPickerMode === 'call') {
      // Mock starting a call
      // In real app: createCall(userId, 'voice');
      console.log("Starting call with", userId);
      createChat(userId); // For now, just open chat as fallback
    } else {
      toggleFavoriteContact(userId);
    }
  };

  // --- Renders ---

  // Handle navbar camera click
  const handleCameraClick = () => {
    setShowCamera(true);
  };

  const renderHeader = () => (
    <div className="px-4 py-3 flex items-center justify-between shrink-0 bg-[var(--wa-app-bg)] z-10">
      {showArchived ? (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowArchived(false)} className="text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)] rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-[20px] font-medium text-[var(--wa-text-primary)]">Archived</h1>
        </div>
      ) : (
        <h1 className="text-[26px] font-bold text-[var(--wa-text-primary)] tracking-tight">Voca</h1>
      )}

      {!showArchived && (
        <div className="flex gap-4 text-[var(--wa-text-primary)]">
          {activeTab === 'chats' || activeTab === 'status' ? (
            <Camera
              className="w-6 h-6 cursor-pointer hover:text-[var(--wa-primary)] transition-colors"
              onClick={handleCameraClick}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreVertical className="w-6 h-6 cursor-pointer hover:text-[var(--wa-primary)] transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)]">
              <DropdownMenuItem onClick={() => setShowProfile(true)} className="focus:bg-[var(--wa-hover)] focus:text-[var(--wa-text-primary)] cursor-pointer">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStarred(true)} className="focus:bg-[var(--wa-hover)] focus:text-[var(--wa-text-primary)] cursor-pointer">
                Starred Messages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowArchived(true)} className="focus:bg-[var(--wa-hover)] focus:text-[var(--wa-text-primary)] cursor-pointer">
                Archived Chats
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--wa-border)]" />
              <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-[var(--wa-hover)] cursor-pointer" onClick={logout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  const renderSearch = () => (
    <div className="px-4 pb-3 bg-[var(--wa-app-bg)] z-10">
      <div className="relative">
        <Search className="absolute left-4 top-2.5 h-5 w-5 text-[var(--wa-text-secondary)]" />
        <Input
          placeholder="Search..."
          className="pl-12 bg-[var(--wa-header-bg)] border-none text-[var(--wa-text-primary)] placeholder:text-[var(--wa-text-secondary)] rounded-full h-10 focus-visible:ring-0 text-[16px] transition-all focus:bg-[var(--wa-hover)]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar bg-[var(--wa-app-bg)] z-10">
      <button
        onClick={() => setActiveFilter('all')}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          activeFilter === 'all' ? "bg-[var(--wa-primary)] text-[#0b141a]" : "bg-[var(--wa-header-bg)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
        )}
      >
        All
      </button>
      <button
        onClick={() => setActiveFilter('unread')}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          activeFilter === 'unread' ? "bg-[var(--wa-primary)] text-[#0b141a]" : "bg-[var(--wa-header-bg)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
        )}
      >
        Unread
      </button>
      <button
        onClick={() => setActiveFilter('favorites')}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          activeFilter === 'favorites' ? "bg-[var(--wa-primary)] text-[#0b141a]" : "bg-[var(--wa-header-bg)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
        )}
      >
        Favorites
      </button>
      <button
        onClick={() => setActiveFilter('groups')}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          activeFilter === 'groups' ? "bg-[var(--wa-primary)] text-[#0b141a]" : "bg-[var(--wa-header-bg)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
        )}
      >
        Groups
      </button>
    </div>
  );

  const renderSidebarAd = () => {
    if (sidebarAds.length === 0) return null;
    // Rotate ads or show random? Show first for now
    const ad = sidebarAds[0];

    return (
      <div className="mx-4 mb-2 p-3 bg-[var(--wa-panel-bg)] rounded-lg border border-[var(--wa-border)] shadow-sm relative group cursor-pointer"
        onClick={() => {
          incrementAdClick(ad.id);
          if (ad.link) window.open(ad.link, '_blank');
        }}
        onMouseEnter={() => incrementAdView(ad.id)}
      >
        <div className="flex gap-3">
          {ad.imageUrl && (
            <img src={ad.imageUrl} alt={ad.title} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-[var(--wa-text-primary)] text-sm truncate pr-4">{ad.title}</h4>
              <span className="text-[10px] text-[var(--wa-text-secondary)] border border-[var(--wa-border)] px-1 rounded uppercase tracking-wide">Ad</span>
            </div>
            <p className="text-[var(--wa-text-secondary)] text-xs line-clamp-2 mt-0.5">{ad.content}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderChatsList = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)] pb-20">
      {/* Show skeleton loaders while loading */}
      {loading && chats.length === 0 && (
        <ChatListSkeleton count={8} />
      )}

      {/* Sidebar Ad */}
      {!loading && renderSidebarAd()}

      {/* Archived Row (only shown if not in archived view and not filtering) */}
      {!loading && !showArchived && activeFilter === 'all' && archivedCount > 0 && (
        <div
          onClick={() => setShowArchived(true)}
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--wa-hover)] transition-colors mx-2 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent">
              <Archive className="w-5 h-5 text-[var(--wa-primary)]" />
            </div>
            <span className="text-[var(--wa-text-primary)] font-medium text-[16px]">Archived</span>
          </div>
          <span className="text-[var(--wa-primary)] font-medium text-xs">{archivedCount}</span>
        </div>
      )}

      {filteredChats.map(chat => {
        const otherParticipant = chat.participants.find(p => p.id !== currentUser?.id);
        const chatName = chat.isGroup ? chat.name : otherParticipant?.name;
        const chatImage = chat.isGroup ? chat.groupImage : otherParticipant?.avatar;
        const lastMessage = chat.messages[chat.messages.length - 1];
        const isActive = chat.id === activeChatId;
        const isTyping = typingUsers.get(chat.id) === otherParticipant?.id;



        // Determine if we should show an ad after this chat
        // Algorithm: Show ad after every 5th chat (index 4, 9, 14...)
        // Use modulus logic relative to available ads
        const showAd = chatListAds.length > 0 && (filteredChats.indexOf(chat) + 1) % 5 === 0;
        const adIndex = Math.floor((filteredChats.indexOf(chat) + 1) / 5) - 1;
        const ad = chatListAds[adIndex % chatListAds.length];

        return (
          <React.Fragment key={chat.id}>
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  onClick={() => {
                    navigate(`/chat/${chat.id}`);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 px-4 cursor-pointer transition-colors hover:bg-[var(--wa-hover)] border-b border-[var(--wa-border)]",
                    isActive && "bg-[var(--wa-hover)]"
                  )}
                >
                  {/* Avatar with online status indicator */}
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chatImage} />
                      <AvatarFallback className="bg-[#6a7f8a] text-white">{chatName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {/* Online status dot */}
                    {!chat.isGroup && otherParticipant && (
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--wa-bg-secondary)]",
                          onlineUsers.get(otherParticipant.id)?.status === 'online'
                            ? "bg-green-500"
                            : "bg-gray-500"
                        )}
                        title={
                          onlineUsers.get(otherParticipant.id)?.status === 'online'
                            ? 'Online'
                            : onlineUsers.get(otherParticipant.id)?.lastSeen
                              ? `Last seen ${formatDistanceToNow(new Date(onlineUsers.get(otherParticipant.id)!.lastSeen), { addSuffix: true })}`
                              : 'Offline'
                        }
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 max-w-[70%]">
                        <h3 className="font-semibold text-[var(--wa-text-primary)] text-[17px] truncate">{chatName}</h3>
                        {/* Blue verified badge for Voca Team */}
                        {!chat.isGroup && otherParticipant?.isVocaTeam && (
                          <span className="shrink-0 flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full" title="Official Voca Team">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <span className={cn("text-xs whitespace-nowrap font-medium", chat.unreadCount > 0 ? "text-[var(--wa-primary)]" : "text-[var(--wa-text-secondary)]")}>
                          {format(new Date(lastMessage.timestamp), 'h:mm a')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={cn("text-[15px] truncate max-w-[85%] leading-5 flex items-center gap-1.5",
                        isTyping ? "text-[var(--wa-primary)] font-medium" :
                          chat.unreadCount > 0 ? "text-[var(--wa-text-primary)] font-medium" : "text-[var(--wa-text-secondary)]"
                      )}>
                        {isTyping ? (
                          "Typing..."
                        ) : lastMessage ? (
                          lastMessage.isDeleted ? (
                            <span className="flex items-center gap-1.5 opacity-80">
                              {/* 3D Deleted/Ban Icon */}
                              <div className="relative w-4 h-4 flex items-center justify-center">
                                <svg width="0" height="0">
                                  <defs>
                                    <linearGradient id="gray-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#9ca3af" />
                                      <stop offset="100%" stopColor="#4b5563" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <div className="w-4 h-4 rounded-full bg-gray-500/10 flex items-center justify-center border border-white/5">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="url(#gray-gradient-sidebar)" strokeWidth="2.5" className="w-3 h-3">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m4.9 4.9 14.2 14.2" />
                                  </svg>
                                </div>
                              </div>
                              <span className="italic">This message was deleted</span>
                            </span>
                          ) : lastMessage.type === 'call' ? (
                            /* Premium 3D Call Icon Logic */
                            (() => {
                              const text = lastMessage.content.toLowerCase();
                              const isVideo = text.includes('video');
                              const isMissed = text.includes('missed') || text.includes('cancelled');
                              const isIncoming = text.includes('incoming');

                              // Determine colors
                              let gradientId = "green-gradient-sidebar";
                              let bgClass = "bg-emerald-500/10";
                              let strokeColor = "#22c55e"; // Fallback

                              if (isMissed) {
                                gradientId = "red-gradient-sidebar";
                                bgClass = "bg-red-500/10";
                              } else if (isIncoming) {
                                gradientId = "blue-gradient-sidebar";
                                bgClass = "bg-blue-500/10";
                              }

                              return (
                                <span className="flex items-center gap-1.5">
                                  {/* SVG Defs for Local Gradients */}
                                  <svg width="0" height="0" className="absolute">
                                    <defs>
                                      <linearGradient id="green-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4ade80" />
                                        <stop offset="100%" stopColor="#22c55e" />
                                      </linearGradient>
                                      <linearGradient id="red-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f87171" />
                                        <stop offset="100%" stopColor="#ef4444" />
                                      </linearGradient>
                                      <linearGradient id="blue-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#60a5fa" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                      </linearGradient>
                                    </defs>
                                  </svg>

                                  <div className={cn("w-4 h-4 rounded-md flex items-center justify-center border border-white/5", bgClass)}>
                                    {isVideo ? (
                                      <Video
                                        className="w-3 h-3 drop-shadow-sm"
                                        style={{ stroke: `url(#${gradientId})`, strokeWidth: 2.5 }}
                                      />
                                    ) : (
                                      <Phone
                                        className={cn("w-3 h-3 drop-shadow-sm", isMissed ? "rotate-[135deg]" : "")}
                                        style={{ stroke: `url(#${gradientId})`, strokeWidth: 2.5 }}
                                      />
                                    )}
                                  </div>
                                  <span className={cn(isMissed ? "text-red-400" : "", "truncate")}>
                                    {isMissed ? 'Missed call' :
                                      text.includes('cancelled') ? 'Cancelled call' :
                                        isIncoming ? `Incoming ${isVideo ? 'video' : 'voice'} call` :
                                          `Outgoing ${isVideo ? 'video' : 'voice'} call`}
                                  </span>
                                </span>
                              );
                            })()
                          ) : (
                            <>
                              {/* Status icon for sent messages */}
                              {lastMessage.senderId === currentUser?.id && (
                                <span className="text-[var(--wa-text-secondary)] shrink-0">
                                  {lastMessage.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                                  {lastMessage.status === 'sent' && <Check className="w-3.5 h-3.5" />}
                                  {(lastMessage.status === 'delivered' || lastMessage.status === 'read' || !lastMessage.status) && <CheckCheck className="w-3.5 h-3.5" />}
                                </span>
                              )}
                              {lastMessage.type === 'image' ? (
                                <span className="flex items-center gap-1.5">
                                  {/* 3D Photo Icon */}
                                  <div className="w-4 h-4 rounded-md bg-purple-500/10 flex items-center justify-center border border-white/5">
                                    <svg width="0" height="0" className="absolute">
                                      <defs>
                                        <linearGradient id="purple-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#c084fc" />
                                          <stop offset="100%" stopColor="#9333ea" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    <Camera
                                      className="w-3 h-3 drop-shadow-sm"
                                      style={{ stroke: "url(#purple-gradient-sidebar)", strokeWidth: 2.5 }}
                                    />
                                  </div>
                                  Photo
                                </span>
                              ) : lastMessage.type === 'audio' ? (
                                <span className="flex items-center gap-1.5">
                                  {/* 3D Audio Icon */}
                                  <div className="w-4 h-4 rounded-md bg-orange-500/10 flex items-center justify-center border border-white/5">
                                    <svg width="0" height="0" className="absolute">
                                      <defs>
                                        <linearGradient id="orange-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#FB923C" />
                                          <stop offset="100%" stopColor="#EA580C" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    {/* Headphones Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#orange-gradient-sidebar)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-headphones"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M2 19a3 3 0 0 0 3 3h2v-9H2v6z" /><path d="M22 19a3 3 0 0 1-3 3h-2v-9h5v6z" /></svg>
                                  </div>
                                  Audio
                                </span>
                              ) : lastMessage.type === 'voice' ? (
                                <span className="flex items-center gap-1.5">
                                  {/* 3D Mic Icon */}
                                  <div className="w-4 h-4 rounded-md bg-green-500/10 flex items-center justify-center border border-white/5">
                                    <svg width="0" height="0" className="absolute">
                                      <defs>
                                        <linearGradient id="green-mic-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#4ADE80" />
                                          <stop offset="100%" stopColor="#22C55E" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    {/* Mic Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#green-mic-gradient-sidebar)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                                  </div>
                                  Voice message
                                </span>
                              ) : lastMessage.type === 'poll' ? (
                                <span className="flex items-center gap-1.5">
                                  {/* 3D Poll Icon */}
                                  <div className="w-4 h-4 rounded-md bg-yellow-500/10 flex items-center justify-center border border-white/5">
                                    <svg width="0" height="0" className="absolute">
                                      <defs>
                                        <linearGradient id="yellow-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#FACC15" />
                                          <stop offset="100%" stopColor="#EAB308" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    {/* Chart Icon */}
                                    <BarChart2 className="w-3 h-3 drop-shadow-sm" style={{ stroke: "url(#yellow-gradient-sidebar)", strokeWidth: 2.5 }} />
                                  </div>
                                  Poll
                                </span>
                              ) : lastMessage.type === 'event' ? (
                                <span className="flex items-center gap-1.5">
                                  {/* 3D Event Icon */}
                                  <div className="w-4 h-4 rounded-md bg-pink-500/10 flex items-center justify-center border border-white/5">
                                    <svg width="0" height="0" className="absolute">
                                      <defs>
                                        <linearGradient id="pink-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#EC4899" />
                                          <stop offset="100%" stopColor="#DB2777" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    {/* Calendar Icon */}
                                    <Clock className="w-3 h-3 drop-shadow-sm" style={{ stroke: "url(#pink-gradient-sidebar)", strokeWidth: 2.5 }} />
                                  </div>
                                  Event
                                </span>
                              ) : (
                                <span className="truncate">{lastMessage.content}</span>
                              )}
                            </>
                          )
                        ) : <span className="italic text-sm">Draft</span>}
                      </p>
                      {chat.unreadCount > 0 && lastMessage?.senderId !== currentUser?.id && (
                        <div className="min-w-[22px] h-[22px] rounded-full bg-[var(--wa-primary)] text-[#111b21] flex items-center justify-center text-xs font-bold px-1.5 shrink-0">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)]">
                <ContextMenuItem onClick={() => toggleArchiveChat(chat.id)} className="hover:bg-[var(--wa-hover)] cursor-pointer">
                  {userArchivedChats.includes(chat.id) ? 'Unarchive' : 'Archive'} chat
                </ContextMenuItem>
                {!chat.isGroup && otherParticipant && (
                  <ContextMenuItem
                    onClick={() => toggleFavoriteContact(otherParticipant.id)}
                    className="hover:bg-[var(--wa-hover)] cursor-pointer"
                  >
                    {currentUser?.favorites?.includes(otherParticipant.id) ? 'Remove from' : 'Add to'} favorites
                  </ContextMenuItem>
                )}
                <ContextMenuItem className="hover:bg-[var(--wa-hover)] cursor-pointer text-red-400" onClick={() => deleteChat(chat.id)}>
                  Delete chat
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {/* In-List Ad */}
            {
              showAd && ad && (
                <div
                  className="mx-4 my-2 p-3 bg-[var(--wa-panel-bg)] rounded-lg border border-[var(--wa-border)] shadow-sm relative group cursor-pointer hover:bg-[var(--wa-hover)] transition-colors"
                  onClick={() => {
                    incrementAdClick(ad.id);
                    if (ad.link) window.open(ad.link, '_blank');
                  }}
                  onMouseEnter={() => incrementAdView(ad.id)}
                >
                  <div className="flex gap-3 items-center">
                    {ad.imageUrl && (
                      <img src={ad.imageUrl} alt={ad.title} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[var(--wa-text-primary)] text-sm truncate">{ad.title}</h4>
                        <span className="text-[9px] text-[var(--wa-text-secondary)] border border-[var(--wa-border)] px-1 rounded uppercase tracking-wide shrink-0">Ad</span>
                      </div>
                      <p className="text-[var(--wa-text-secondary)] text-xs truncate">{ad.content}</p>
                    </div>
                  </div>
                </div>
              )
            }
          </React.Fragment>
        );
      })}

      {
        filteredChats.length === 0 && (
          <div className="p-8 text-center text-[var(--wa-text-secondary)] text-sm mt-10">
            {showArchived ? "No archived chats" : "No chats found"}
          </div>
        )
      }
    </div >
  );

  const renderGroupsList = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)] pb-20">
      <div
        onClick={() => setShowNewGroup(true)}
        className="px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--wa-hover)] transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--wa-primary)] flex items-center justify-center relative shadow-lg shadow-[#00a884]/20">
          <Users className="w-6 h-6 text-[#0b141a]" />
          <div className="absolute -bottom-1 -right-1 bg-[var(--wa-panel-bg)] rounded-full p-0.5 border-2 border-[var(--wa-app-bg)]">
            <Plus className="w-3 h-3 text-[var(--wa-primary)]" />
          </div>
        </div>
        <span className="text-[var(--wa-text-primary)] font-medium text-[17px]">New Group</span>
      </div>

      <div className="px-4 py-2 text-[var(--wa-primary)] font-bold text-xs tracking-wider mt-4 mb-2">YOUR GROUPS</div>

      {filteredChats.filter(c => c.isGroup).map(chat => (
        <div
          key={chat.id}
          onClick={() => navigate(`/chat/${chat.id}`)}
          className={cn(
            "flex items-center gap-3 p-3 px-4 cursor-pointer transition-colors hover:bg-[var(--wa-hover)] border-b border-[var(--wa-border)]",
            activeChatId === chat.id && "bg-[var(--wa-hover)]"
          )}
        >
          <Avatar className="h-12 w-12 shrink-0 rounded-xl">
            <AvatarImage src={chat.groupImage} />
            <AvatarFallback className="bg-[#6a7f8a] text-white">{chat.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-medium text-[var(--wa-text-primary)] text-[17px] truncate">{chat.name}</h3>
              <span className="text-[var(--wa-text-secondary)] text-xs">
                {chat.messages.length > 0 ? format(new Date(chat.messages[chat.messages.length - 1].timestamp), 'MM/dd') : 'New'}
              </span>
            </div>
            <p className="text-[var(--wa-text-secondary)] text-sm truncate">
              {chat.participants.length} members
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCallsList = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)] pb-20">
      {/* SVG Definitions for Gradients - Defined once for the list */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="green-gradient-calls" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="red-gradient-calls" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="blue-gradient-calls" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Show Contacts Search Results if searching */}
      {searchTerm ? (
        <>
          <div className="px-4 py-2 text-[var(--wa-primary)] font-bold text-xs tracking-wider">CONTACTS</div>
          {filteredContactsForCalls.length === 0 && filteredCalls.length === 0 ? (
            <div className="p-8 text-center text-[var(--wa-text-secondary)] text-sm">
              No contacts or calls found matching "{searchTerm}"
            </div>
          ) : (
            <>
              {filteredContactsForCalls.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3 px-4 cursor-pointer transition-colors hover:bg-[var(--wa-hover)] border-b border-[var(--wa-border)] group">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--wa-text-primary)] text-[17px] truncate">{user.name}</h3>
                    <p className="text-[var(--wa-text-secondary)] text-xs truncate">{user.about || "Available"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/10 rounded-full"
                      onClick={() => startCall(user.id, 'voice', user)}
                    >
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/10 rounded-full"
                      onClick={() => startCall(user.id, 'video', user)}
                    >
                      <Video className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredCalls.length > 0 && <div className="px-4 py-2 text-[var(--wa-primary)] font-bold text-xs tracking-wider mt-4">PAST CALLS</div>}
            </>
          )}
        </>
      ) : (
        <>
          <div className="px-4 py-4">
            <h3 className="text-[var(--wa-text-primary)] font-medium text-[17px] mb-4">Favorites</h3>
            {/* ... Favorites Content ... */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              <div
                className="flex flex-col items-center gap-2 cursor-pointer group min-w-[60px]"
                onClick={() => {
                  setContactPickerMode('favorite');
                  setShowContactPicker(true);
                }}
              >
                <div className="w-14 h-14 rounded-full bg-[var(--wa-header-bg)] border-2 border-dashed border-[var(--wa-text-secondary)] flex items-center justify-center group-hover:border-[var(--wa-primary)] group-hover:text-[var(--wa-primary)] transition-colors text-[var(--wa-text-secondary)]">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[var(--wa-text-secondary)] text-xs">Add</span>
              </div>

              {favoriteContacts.map(id => {
                const user = chats.flatMap(c => c.participants).find(u => u.id === id); // Quick lookup hack
                if (!user) return null;
                return (
                  <div key={id} className="flex flex-col items-center gap-2 cursor-pointer min-w-[60px]" onClick={() => createChat(user.id)}>
                    <Avatar className="h-14 w-14 border-2 border-[var(--wa-panel-bg)] ring-2 ring-[var(--wa-primary)]">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[var(--wa-text-primary)] text-xs truncate max-w-[60px]">{user.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-2 text-[var(--wa-primary)] font-bold text-xs tracking-wider mt-4">RECENT</div>
        </>
      )}

      {/* Render Past Calls (filtered or list) */}
      {(searchTerm ? filteredCalls : filteredCalls).length === 0 && !searchTerm ? (
        <div className="p-8 text-center text-[var(--wa-text-secondary)] text-sm">
          No recent calls
        </div>
      ) : null}

      {/* Calls List Mapping (same as before but conditional rendering logic wrapper) */}
      {(searchTerm ? filteredCalls : filteredCalls).map((call) => {
        // Determine styles based on call state
        let gradientId = "green-gradient-calls";
        let bgClass = "bg-emerald-500/10";

        if (call.status === 'missed') {
          gradientId = "red-gradient-calls";
          bgClass = "bg-red-500/10";
        } else if (call.direction === 'incoming') {
          gradientId = "blue-gradient-calls";
          bgClass = "bg-blue-500/10";
        }

        return (
          <div key={call.id} className="flex items-center gap-3 p-3 px-4 cursor-pointer transition-colors hover:bg-[var(--wa-hover)] border-b border-[var(--wa-border)] group">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={call.caller.avatar} />
              <AvatarFallback>{call.caller.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h3 className={cn("font-medium text-[17px] truncate", call.status === 'missed' ? "text-red-500" : "text-[var(--wa-text-primary)]")}>
                  {call.caller.name}
                </h3>
                <span className="text-[11px] text-[var(--wa-text-secondary)] whitespace-nowrap">
                  {(() => {
                    const date = new Date(call.timestamp);
                    if (isToday(date)) return format(date, 'h:mm a');
                    if (isYesterday(date)) return 'Yesterday';
                    return format(date, 'MM/dd/yy');
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--wa-text-secondary)] text-[13px] truncate">
                {/* Call Icon Indicator */}
                {call.type === 'video' ? (
                  <Video className={cn("w-4 h-4", call.status === 'missed' ? "text-red-500 fill-red-500/10" : "text-[var(--wa-text-secondary)]")} />
                ) : (
                  <Phone className={cn("w-3.5 h-3.5", call.status === 'missed' ? "text-red-500 fill-red-500/10" : "text-[var(--wa-text-secondary)]", call.direction === 'outgoing' ? "rotate-45" : "rotate-[135deg]")} />
                )}

                {/* Status Text & Duration */}
                <span className="truncate">
                  {call.direction === 'outgoing' ? 'Outgoing' : (call.status === 'missed' ? 'Missed' : 'Incoming')}
                </span>

                {call.duration && call.duration !== '0:00' && (
                  <>
                    <span className="text-[var(--wa-text-secondary)]/50">•</span>
                    <span>{call.duration}</span>
                  </>
                )}
              </div>
            </div>

            {/* Call Back Action */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/10 hover:text-[var(--wa-primary)] rounded-full shrink-0 opacity-80 group-hover:opacity-100 transition-all"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                startCall(call.caller.id, call.type, call.caller);
              }}
            >
              {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </Button>
          </div>
        );
      })
      }
    </div>
  );

  const renderStatusList = () => {
    const filteredRecentUserIds = recentUserIds.filter(userId => {
      const user = groupedStatuses[userId][0].user;
      return user.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)] pb-20">
        {/* My Status */}
        <div
          className={cn(
            "p-4 flex items-center gap-4 transition-colors",
            myStatus.length > 0 ? "cursor-pointer hover:bg-[var(--wa-hover)]" : ""
          )}
          onClick={() => {
            if (myStatus.length > 0) {
              handleOpenStatus(currentUser!.id);
            }
          }}
        >
          <div className="relative">
            <Avatar className={cn("h-14 w-14", myStatus.length > 0 && "ring-2 ring-[var(--wa-primary)] ring-offset-2 ring-offset-[var(--wa-app-bg)]")}>
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className="absolute bottom-0 right-0 bg-[var(--wa-primary)] rounded-full p-1 border-2 border-[var(--wa-app-bg)] hover:scale-110 transition-transform shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateStatus(true);
              }}
            >
              <Plus className="w-4 h-4 text-[#0b141a]" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[var(--wa-text-primary)] font-medium text-[17px]">My Status</h3>
            <p className="text-[var(--wa-text-secondary)] text-sm">Tap to add status update</p>
          </div>
        </div>

        <div className="px-4 py-2 text-[var(--wa-primary)] font-bold text-xs tracking-wider mt-4">RECENT UPDATES</div>

        {filteredRecentUserIds.length === 0 ? (
          <div className="p-8 text-center text-[var(--wa-text-secondary)] text-sm">
            {searchTerm ? "No status updates found" : "No recent updates"}
          </div>
        ) : (
          filteredRecentUserIds.map(userId => {
            const userStatuses = groupedStatuses[userId];
            const user = userStatuses[0].user;
            return (
              <div key={userId} onClick={() => handleOpenStatus(userId)} className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--wa-hover)] transition-colors">
                <div className="p-[2px] rounded-full border-2 border-[var(--wa-primary)]">
                  <Avatar className="h-12 w-12 border-2 border-[var(--wa-app-bg)]">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <h3 className="text-[var(--wa-text-primary)] font-medium text-[17px]">{user.name}</h3>
                  <p className="text-[var(--wa-text-secondary)] text-sm">{format(new Date(userStatuses[0].timestamp), 'h:mm a')}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderPostsList = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)] pb-20">
      {/* Create Post Card */}
      <div
        onClick={() => setShowCreatePost(true)}
        className="m-4 p-4 bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] rounded-xl cursor-pointer hover:bg-[var(--wa-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 py-2 px-4 bg-[var(--wa-app-bg)] rounded-full text-[var(--wa-text-secondary)] text-sm">
            What's on your mind?
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="px-4">
        {(() => {
          // Filter posts to hide content from users who blocked the current user
          // AND filter by search term
          const visiblePosts = posts.filter(post => {
            // Always show own posts (unless searching)
            // Hide posts from users who blocked the current user
            const poster = users.find(u => u.id === post.userId);
            if (post.userId !== currentUser?.id && poster?.blockedUsers?.includes(currentUser?.id || '')) {
              return false;
            }

            // Search filter - match post content or user name
            if (searchTerm.trim()) {
              const searchLower = searchTerm.toLowerCase();
              const contentMatch = post.content.toLowerCase().includes(searchLower);
              const userMatch = post.user.name.toLowerCase().includes(searchLower);
              return contentMatch || userMatch;
            }

            return true;
          });

          return visiblePosts.length === 0 ? (
            <div className="text-center text-[var(--wa-text-secondary)] py-12">
              {searchTerm.trim() ? (
                <>
                  <p className="text-lg mb-2">No posts found</p>
                  <p className="text-sm">Try a different search term</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No posts yet</p>
                  <p className="text-sm">Be the first to share something!</p>
                </>
              )}
            </div>
          ) : (
            visiblePosts.map(post => <PostCard key={post.id} post={post} />)
          );
        })()}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-[var(--wa-sidebar-bg)] border-r border-[var(--wa-border)] relative">

      <UserProfileSettings isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <CreateStatusDialog isOpen={showCreateStatus} onClose={() => setShowCreateStatus(false)} />
      {showCamera && (
        <CameraComponent
          mode="status"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      <CreatePostDialog isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />
      <NewChatDialog isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
      <NewGroupDialog isOpen={showNewGroup} onClose={() => setShowNewGroup(false)} />
      <ContactPickerDialog
        isOpen={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title={contactPickerMode === 'call' ? 'New Call' : 'New Chat'}
        filterIds={contactPickerMode === 'call' ? allMyContacts.map(u => u.id) : undefined}
        onSelect={(user) => {
          if (contactPickerMode === 'call') {
            startCall(user.id, 'voice', user);
          } else if (contactPickerMode === 'favorite') {
            toggleFavoriteContact(user.id);
          } else {
            // Default new chat behavior
            createChat(user.id);
          }
        }}
      />
      {/* Status Viewer Overlay */}
      {viewingStatus && (
        <StatusViewer
          statuses={groupedStatuses[viewingStatus]}
          onClose={() => setViewingStatus(null)}
        />
      )}

      {/* Starred Messages View (Overlay) */}
      {showStarred && <StarredMessagesView onClose={() => setShowStarred(false)} />}

      {/* Header & Search */}
      {renderHeader()}
      {!showArchived && renderSearch()}
      {activeTab === 'chats' && !showArchived && renderFilters()}

      {/* Content Area */}
      {activeTab === 'chats' && renderChatsList()}
      {activeTab === 'groups' && renderGroupsList()}
      {activeTab === 'calls' && renderCallsList()}
      {activeTab === 'status' && renderStatusList()}
      {activeTab === 'posts' && renderPostsList()}

      {/* FABs */}
      {activeTab === 'chats' && !showArchived && (
        <div className="absolute bottom-24 right-5 z-10 animate-in zoom-in duration-300">
          <Button
            onClick={() => setShowNewChat(true)}
            className="w-14 h-14 rounded-2xl bg-[#00a884] hover:bg-[#008f72] text-[#0b141a] shadow-lg flex items-center justify-center p-0 transition-transform hover:scale-105"
          >
            <MessageSquare className="w-6 h-6 fill-current" />
          </Button>
        </div>
      )}
      {activeTab === 'posts' && (
        <div className="absolute bottom-24 right-5 z-10 animate-in zoom-in duration-300">
          <Button
            onClick={() => setShowCreatePost(true)}
            className="w-14 h-14 rounded-2xl bg-[#00a884] hover:bg-[#008f72] text-[#0b141a] shadow-lg flex items-center justify-center p-0 transition-transform hover:scale-105"
          >
            <Edit className="w-6 h-6" />
          </Button>
        </div>
      )}
      {activeTab === 'status' && (
        <div className="absolute bottom-24 right-5 z-10 flex flex-col gap-4 animate-in zoom-in duration-300">
          <Button
            onClick={() => setShowCamera(true)}
            className="w-14 h-14 rounded-2xl bg-[#00a884] hover:bg-[#008f72] text-[#0b141a] shadow-lg flex items-center justify-center p-0 transition-transform hover:scale-105"
          >
            <Camera className="w-6 h-6" />
          </Button>
        </div>
      )}
      {activeTab === 'calls' && (
        <div className="absolute bottom-24 right-5 z-10 animate-in zoom-in duration-300">
          <Button
            onClick={() => {
              setContactPickerMode('call');
              setShowContactPicker(true);
            }}
            className="w-14 h-14 rounded-2xl bg-[#00a884] hover:bg-[#008f72] text-[#0b141a] shadow-lg flex items-center justify-center p-0 transition-transform hover:scale-105"
          >
            <Phone className="w-6 h-6 fill-current" />
          </Button>
        </div>
      )}


      {/* Bottom Navigation */}
      <div className="h-20 bg-[var(--wa-app-bg)] border-t border-[var(--wa-border)] flex items-center justify-around absolute bottom-0 w-full z-20 pb-2">
        <div
          onClick={() => navigate('/chat')}
          className={cn("flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors", activeTab === 'chats' ? "text-[var(--wa-text-primary)]" : "text-[var(--wa-text-secondary)]")}
        >
          <div className={cn("px-4 py-1 rounded-full transition-colors", activeTab === 'chats' && "bg-[var(--wa-hover)]")}>
            <MessageSquare className={cn("w-6 h-6", activeTab === 'chats' ? "fill-[var(--wa-text-primary)]" : "fill-none")} />
            {/* Badge Mock */}
            {unreadChatsCount > 0 && (
              <div className="absolute top-3 ml-6 bg-[var(--wa-primary)] text-[#0b141a] text-[10px] font-bold px-1.5 rounded-full">
                {unreadChatsCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Chats</span>
        </div>

        <div
          onClick={() => navigate('/chat/status')}
          className={cn("flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors", activeTab === 'status' ? "text-[var(--wa-text-primary)]" : "text-[var(--wa-text-secondary)]")}
        >
          <div className={cn("px-4 py-1 rounded-full transition-colors", activeTab === 'status' && "bg-[var(--wa-hover)]")}>
            <CircleDashed className="w-6 h-6" />
            {otherStatuses.length > 0 && <div className="w-2 h-2 bg-[var(--wa-primary)] rounded-full absolute top-3 ml-6 border border-[var(--wa-app-bg)]"></div>}
          </div>
          <span className="text-xs font-medium">Status</span>
        </div>

        <div
          onClick={() => navigate('/chat/posts')} // Assuming you might add this route to App.tsx later or keep it local? For now routing.
          className={cn("flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors", activeTab === 'posts' ? "text-[var(--wa-text-primary)]" : "text-[var(--wa-text-secondary)]")}
        >
          <div className={cn("px-4 py-1 rounded-full transition-colors", activeTab === 'posts' && "bg-[var(--wa-hover)]")}>
            <FileText className={cn("w-6 h-6", activeTab === 'posts' ? "fill-[var(--wa-text-primary)]" : "fill-none")} />
          </div>
          <span className="text-xs font-medium">Posts</span>
        </div>

        <div
          onClick={() => navigate('/chat/groups')}
          className={cn("flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors", activeTab === 'groups' ? "text-[var(--wa-text-primary)]" : "text-[var(--wa-text-secondary)]")}
        >
          <div className={cn("px-4 py-1 rounded-full transition-colors", activeTab === 'groups' && "bg-[var(--wa-hover)]")}>
            <Users className={cn("w-6 h-6", activeTab === 'groups' ? "fill-[var(--wa-text-primary)]" : "fill-none")} />
          </div>
          <span className="text-xs font-medium">Groups</span>
        </div>

        <div
          onClick={() => navigate('/chat/calls')}
          className={cn("flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors", activeTab === 'calls' ? "text-[var(--wa-text-primary)]" : "text-[var(--wa-text-secondary)]")}
        >
          <div className={cn("px-4 py-1 rounded-full transition-colors", activeTab === 'calls' && "bg-[var(--wa-hover)]")}>
            <Phone className={cn("w-6 h-6", activeTab === 'calls' ? "fill-[var(--wa-text-primary)]" : "fill-none")} />
            {missedCallsCount > 0 && (
              <div className="absolute top-3 ml-6 bg-[var(--wa-primary)] text-[#0b141a] text-[10px] font-bold px-1.5 rounded-full">
                {missedCallsCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Calls</span>
        </div>
      </div>
    </div>
  );
};
