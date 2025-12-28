import React, { useState, useEffect } from 'react';
import { useVoca } from '../VocaContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import {
    Users, MessageSquare, ShieldAlert, Activity,
    LogOut, Settings, Ban, Search, Bell, Eye, Trash, Zap,
    Megaphone, FileText, DollarSign, UserPlus, TrendingUp,
    AlertTriangle, CheckCircle, XCircle, MoreHorizontal, Image as ImageIcon,
    Layout, MousePointer, Plus, Check, Edit, Save, HardDrive
} from 'lucide-react';
import { Input } from '../../ui/input';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { cn } from '../../ui/utils';
import { toast } from 'sonner';
import { Switch } from '../../ui/switch';
import { Advertisement } from '../../../lib/data';
import { ImageCropper } from './ImageCropper';

// --- Sidebar ---

const AdminSidebar = ({ activeView, setActiveView }: { activeView: string, setActiveView: (v: string) => void }) => {
    const { logout } = useVoca();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Activity },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
        { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'ads', label: 'Advertisements', icon: DollarSign },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="w-20 lg:w-64 bg-[#0b141a] text-white flex flex-col h-full shrink-0 border-r border-[#202c33] transition-all duration-300">
            <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-xl flex items-center justify-center shadow-lg shadow-[#006D77]/20 shrink-0">
                    <span className="font-bold text-xl text-white">V</span>
                </div>
                <div className="hidden lg:block">
                    <h1 className="text-xl font-bold tracking-tight">Voca <span className="text-[#83C5BE]">Admin</span></h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Control Panel</p>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={cn(
                            "flex items-center gap-4 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                            activeView === item.id
                                ? 'bg-[#006D77]/20 text-[#83C5BE]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        {activeView === item.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#83C5BE] rounded-r-full" />
                        )}
                        <item.icon className={cn("w-6 h-6 shrink-0 transition-colors", activeView === item.id ? "text-[#83C5BE]" : "text-gray-500 group-hover:text-white")} />
                        <span className="hidden lg:block whitespace-nowrap">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-[#202c33]">
                <Button
                    variant="ghost"
                    className="w-full justify-center lg:justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={logout}
                >
                    <LogOut className="w-5 h-5 lg:mr-2" />
                    <span className="hidden lg:inline">Logout</span>
                </Button>
            </div>
        </div>
    );
};

// --- Dashboard ---

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1f2c34] border border-[#202c33] p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-[#83C5BE] font-bold text-lg">
                    {payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

const DashboardView = () => {
    const { ads, users, chats, posts, statuses } = useVoca();
    const [stats, setStats] = useState<any>({
        totalUsers: 0,
        newUsersToday: 0,
        activeUsers: 0,
        totalMessages: 0,
        totalReports: 0,
        activeAds: 0,
        userGrowth: []
    });
    const [loading, setLoading] = useState(true);
    const [storageUsed, setStorageUsed] = useState({ gb: 0, percentage: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { adminAPI } = await import('../../../lib/api');
                const data = await adminAPI.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                toast.error("Failed to load dashboard statistics");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Calculate storage usage
    useEffect(() => {
        const calculateStorage = () => {
            let totalMB = 0;

            // User profile photos (assume avg 500KB per photo)
            const userPhotoCount = users.reduce((acc, user) => {
                if (user.avatar && !user.avatar.includes('ui-avatars.com')) acc += 1;
                return acc;
            }, 0);
            totalMB += userPhotoCount * 0.5;

            // Messages with images (assume avg 800KB per image)
            const messageImageCount = chats.reduce((acc, chat) => {
                return acc + chat.messages.filter(m => m.type === 'image').length;
            }, 0);
            totalMB += messageImageCount * 0.8;

            // Voice messages (assume avg 200KB per voice note)
            const voiceMessageCount = chats.reduce((acc, chat) => {
                return acc + chat.messages.filter(m => m.type === 'voice').length;
            }, 0);
            totalMB += voiceMessageCount * 0.2;

            // Posts with images (assume avg 1MB per post image)
            const postImageCount = posts.filter(p => p.imageUrl).length;
            totalMB += postImageCount * 1;

            // Statuses (assume avg 600KB per status)
            const statusCount = statuses.filter(s => s.mediaUrl).length;
            totalMB += statusCount * 0.6;

            // Convert to GB and calculate percentage (assuming 100GB limit)
            const totalGB = totalMB / 1024;
            const percentage = Math.min((totalGB / 100) * 100, 100);

            setStorageUsed({
                gb: parseFloat(totalGB.toFixed(2)),
                percentage: parseFloat(percentage.toFixed(1))
            });
        };

        calculateStorage();
    }, [users, chats, posts, statuses]);

    // Derived state for specific UI elements if not in stats
    const activeAdsCount = ads.filter(ad => ad.active).length;

    // Use backend chart data or fallback
    const chartData = stats.userGrowth || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-gray-400">Welcome back, Administrator. System performance at a glance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                    { title: 'Total Users', value: stats.totalUsers, change: '+12%', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { title: 'Active Now', value: stats.activeUsers, change: 'Live', icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { title: 'Messages Sent', value: stats.totalMessages, change: '+5%', icon: MessageSquare, color: 'text-[#83C5BE]', bg: 'bg-[#83C5BE]/10' },
                    { title: 'Pending Reports', value: stats.totalReports, change: stats.totalReports > 0 ? 'Action Needed' : 'All Good', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { title: 'Active Ads', value: activeAdsCount, change: 'Revenue', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-[#1f2c34] border-[#2a3942] hover:border-[#006D77]/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">{stat.title}</CardTitle>
                            <div className={cn("p-2 rounded-lg", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className="text-xs text-[#83C5BE] mt-1">{stat.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* App Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#1f2c34] border-[#2a3942]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 font-medium">Server Uptime</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">99.98%</span>
                            <span className="text-xs text-green-400">Stable</span>
                        </div>
                        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: '99.98%' }} />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1f2c34] border-[#2a3942]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 font-medium">Storage Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">
                                {storageUsed.gb < 1
                                    ? `${(storageUsed.gb * 1024).toFixed(0)} MB`
                                    : `${storageUsed.gb} GB`}
                            </span>
                            <span className={cn(
                                "text-xs",
                                storageUsed.percentage < 50 ? "text-green-400" :
                                    storageUsed.percentage < 80 ? "text-yellow-400" :
                                        "text-red-400"
                            )}>
                                {storageUsed.percentage}% Full
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    storageUsed.percentage < 50 ? "bg-green-500" :
                                        storageUsed.percentage < 80 ? "bg-yellow-500" :
                                            "bg-red-500"
                                )}
                                style={{ width: `${storageUsed.percentage}%` }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Estimated from {users.length} users
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1f2c34] border-[#2a3942]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 font-medium">Database Latency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">12ms</span>
                            <span className="text-xs text-green-400">Optimal</span>
                        </div>
                        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '15%' }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1 bg-[#1f2c34] border-[#2a3942] shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Message Traffic</CardTitle>
                        <CardDescription className="text-gray-500">Daily message volume (Last 7 Days)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#006D77" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#006D77" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3942" vertical={false} />
                                <XAxis dataKey="name" stroke="#8696a0" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#8696a0" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="messages" stroke="#83C5BE" fillOpacity={1} fill="url(#colorMsg)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-1 bg-[#1f2c34] border-[#2a3942] shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">User Growth</CardTitle>
                        <CardDescription className="text-gray-500">New user registrations (Last 7 Days)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3942" vertical={false} />
                                <XAxis dataKey="name" stroke="#8696a0" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#8696a0" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="users" stroke="#83C5BE" strokeWidth={3} dot={{ fill: '#006D77', r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// --- User Management ---

const UserManagementView = () => {
    const { users, deleteUser, banUser, unbanUser } = useVoca();
    const [viewMode, setViewMode] = useState<'all' | 'banned'>('all');

    const displayedUsers = viewMode === 'all'
        ? users
        : users.filter(u => u.isBanned);

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to permanently delete user ${name}? This action cannot be undone.`)) {
            deleteUser(id);
            toast.success("User deleted successfully");
        }
    }

    return (
        <Card className="bg-[#1f2c34] border-[#2a3942] animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-white">User Management</CardTitle>
                        <CardDescription className="text-gray-500">Manage all registered users, permissions, and status.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-[#0b141a] rounded-lg p-1 border border-[#2a3942]">
                            <Button
                                variant={viewMode === 'all' ? "secondary" : "ghost"}
                                size="sm"
                                className={viewMode === 'all' ? "bg-[#202c33] text-white" : "text-gray-400"}
                                onClick={() => setViewMode('all')}
                            >
                                All Users
                            </Button>
                            <Button
                                variant={viewMode === 'banned' ? "secondary" : "ghost"}
                                size="sm"
                                className={viewMode === 'banned' ? "bg-[#202c33] text-red-400" : "text-gray-400"}
                                onClick={() => setViewMode('banned')}
                            >
                                Banned ({users.filter(u => u.isBanned).length})
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-[#2a3942] overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#1a252b]">
                            <TableRow className="border-[#2a3942] hover:bg-[#2a3942]">
                                <TableHead className="text-gray-400">User</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400">Role</TableHead>
                                <TableHead className="text-gray-400">Joined</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        No users found in this view.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayedUsers.map(user => (
                                    <TableRow key={user.id} className="border-[#2a3942] hover:bg-[#2a3942]/50 transition-colors">
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden ring-2 ring-transparent group-hover:ring-[#006D77] transition-all">
                                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium flex items-center gap-1">
                                                    {user.name}
                                                    {user.verified && <CheckCircle className="w-3 h-3 text-[#83C5BE]" />}
                                                </div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isBanned ? "destructive" : "secondary"} className={cn(
                                                user.isBanned ? "" : "bg-[#006D77]/20 text-[#83C5BE] hover:bg-[#006D77]/30"
                                            )}>
                                                {user.isBanned ? "Banned" : "Active"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "border-gray-600 text-gray-400",
                                                user.role === 'admin' && "border-[#83C5BE] text-[#83C5BE]"
                                            )}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.isBanned ? (
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        className="h-8 p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                        onClick={() => { unbanUser(user.id); toast.success(`Unbanned ${user.name}`); }}
                                                        title="Unban User"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        className="h-8 p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                                        onClick={() => { banUser(user.id); toast.warning(`Banned ${user.name}`); }}
                                                        title="Ban User"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    title="Delete User"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

// --- Moderation (God Mode) ---

const ModerationView = () => {
    const { deleteMessage, users } = useVoca();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(true);
    const [allMessages, setAllMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch ALL messages (God Mode)
    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const { adminAPI } = await import('../../../lib/api');
                const msgs = await adminAPI.getMessages();
                setAllMessages(msgs);
            } catch (error) {
                console.error("Failed to fetch messages:", error);
                toast.error("Failed to load global messages");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, []);

    // Helper to get user name from ID
    const getUserName = (userId: string): string => {
        const user = users.find(u => u.id === userId);
        // If user not in context (lazy loaded), try to find in message population if available
        // But for now, fallback to ID is okay
        return user?.name || userId;
    };

    // Filter messages for display
    const filteredMessages = allMessages.map(msg => ({
        ...msg,
        chatName: msg.chatId?.name || (msg.chatId?.isGroup ? 'Group Chat' : 'Direct Message'),
        // senderId might be populated object or string depending on backend response, verify backend
        // In backend routes/admin.js: .populate('senderId', 'name avatar')
        // So msg.senderId is object { _id:..., name:..., avatar:... }
        senderName: msg.senderId?.name || 'Unknown',
        senderAvatar: msg.senderId?.avatar,
        chatIdStr: msg.chatId?._id || msg.chatId // Helper for deletion
    })).filter(m => {
        // Show deleted messages based on toggle
        if (!showDeleted && m.isDeleted) return false;

        // Search filter
        const searchLower = searchTerm.toLowerCase();
        return (
            m.content?.toLowerCase().includes(searchLower) ||
            m.senderName?.toLowerCase().includes(searchLower)
        );
    });

    const handleForceDelete = (chatId: string, msgId: string) => {
        deleteMessage(chatId, msgId, true);
        toast.success("Message removed via God Mode");
    };

    return (
        <>
            {/* Image Viewer Modal */}
            {viewingImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img src={viewingImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
                        <Button
                            variant="ghost"
                            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                            onClick={() => setViewingImage(null)}
                        >
                            ✕ Close
                        </Button>
                    </div>
                </div>
            )}

            <Card className="bg-[#1f2c34] border-[#2a3942] animate-in slide-in-from-bottom-4 duration-500 shadow-2xl relative overflow-hidden">
                {/* Scanner Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50 animate-[scan_3s_linear_infinite] pointer-events-none z-10" />

                <CardHeader className="bg-[#111b21] border-b border-[#2a3942]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-red-400 flex items-center gap-2 font-mono uppercase tracking-wider text-lg">
                                <ShieldAlert className="w-5 h-5 animate-pulse" /> God Mode Inspection
                            </CardTitle>
                            <CardDescription className="text-gray-500">
                                Real-time message interception. View ALL original messages including deleted content.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 bg-[#0b141a] px-3 py-2 rounded-lg border border-[#2a3942]">
                                <Switch
                                    checked={showDeleted}
                                    onCheckedChange={setShowDeleted}
                                    className="data-[state=checked]:bg-red-500"
                                />
                                <span className="text-xs text-gray-400">Show Deleted</span>
                            </div>
                            <div className="w-full md:w-72 relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search messages or users..."
                                    className="pl-9 bg-[#0b141a] border-[#2a3942] text-white focus-visible:ring-red-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-[#1a252b] sticky top-0 z-10">
                                <TableRow className="border-[#2a3942] hover:bg-transparent">
                                    <TableHead className="w-[120px] text-gray-400 font-mono text-xs uppercase">Timestamp</TableHead>
                                    <TableHead className="text-gray-400 font-mono text-xs uppercase">Sender</TableHead>
                                    <TableHead className="text-gray-400 font-mono text-xs uppercase">Chat</TableHead>
                                    <TableHead className="text-gray-400 font-mono text-xs uppercase">Content</TableHead>
                                    <TableHead className="text-gray-400 font-mono text-xs uppercase">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right font-mono text-xs uppercase">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-[#0b141a] font-mono text-sm">
                                {allMessages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                            No messages found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    allMessages.map((msg) => (
                                        <TableRow
                                            key={msg.id}
                                            className={cn(
                                                "border-[#2a3942] group transition-colors",
                                                msg.isDeleted ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-[#1f2c34]"
                                            )}
                                        >
                                            <TableCell className="text-[#83C5BE] text-xs">
                                                <div>{format(new Date(msg.timestamp), 'MMM d')}</div>
                                                <div className="text-gray-500">{format(new Date(msg.timestamp), 'HH:mm:ss')}</div>
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{msg.senderName}</span>
                                                    <span className="text-xs text-gray-500">{typeof msg.senderId === 'object' ? (msg.senderId._id || msg.senderId.id) : msg.senderId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-xs">
                                                {msg.chatName}
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                {msg.type === 'image' ? (
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer group/img"
                                                        onClick={() => setViewingImage(msg.mediaUrl || msg.content)}
                                                    >
                                                        <div className="w-16 h-16 rounded overflow-hidden border border-[#2a3942] group-hover/img:border-blue-500 transition-colors">
                                                            <img
                                                                src={msg.mediaUrl || msg.content}
                                                                alt="Shared"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <span className="text-blue-400 text-xs flex items-center gap-1">
                                                            <Eye className="w-3 h-3" /> Click to view
                                                        </span>
                                                    </div>
                                                ) : msg.type === 'voice' ? (
                                                    <div className="flex items-center gap-2">
                                                        <audio
                                                            controls
                                                            className="h-8 max-w-[200px]"
                                                            style={{
                                                                filter: 'invert(1) hue-rotate(180deg)',
                                                            }}
                                                        >
                                                            <source src={msg.mediaUrl || msg.content} type="audio/webm" />
                                                            <source src={msg.mediaUrl || msg.content} type="audio/ogg" />
                                                            <source src={msg.mediaUrl || msg.content} type="audio/mpeg" />
                                                            Your browser does not support audio playback.
                                                        </audio>
                                                        {msg.duration && (
                                                            <span className="text-gray-500 text-xs">{msg.duration}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={cn(
                                                        "text-gray-300",
                                                        msg.isDeleted && "line-through text-red-400/70"
                                                    )}>
                                                        {msg.content}
                                                    </span>
                                                )}
                                                {msg.isEdited && (
                                                    <span className="text-yellow-500 text-xs ml-2">(edited)</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {msg.isDeleted ? (
                                                    <Badge variant="destructive" className="text-xs">DELETED</Badge>
                                                ) : msg.isEdited ? (
                                                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">EDITED</Badge>
                                                ) : (
                                                    <Badge className="bg-green-500/20 text-green-400 text-xs">ORIGINAL</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!msg.isDeleted && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10 opacity-50 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleForceDelete(msg.chatId, msg.id)}
                                                        title="Force Delete Message"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="bg-[#111b21] border-t border-[#2a3942] py-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Original: {allMessages.filter(m => !m.isDeleted && !m.isEdited).length}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Edited: {allMessages.filter(m => m.isEdited).length}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Deleted: {allMessages.filter(m => m.isDeleted).length}</span>
                        <span className="ml-auto">Total: {allMessages.length} messages</span>
                    </div>
                </CardFooter>
            </Card>
        </>
    );
};

// --- Advertisements ---

const AdvertisementsView = () => {
    const { ads, createAd, deleteAd, toggleAd, incrementAdClick, incrementAdView } = useVoca();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
    const [showImageCropper, setShowImageCropper] = useState(false);
    const [adImageUrl, setAdImageUrl] = useState('');
    const [adTitle, setAdTitle] = useState('');
    const [adContent, setAdContent] = useState('');
    const [adPosition, setAdPosition] = useState<'sidebar' | 'chat_list' | 'landing_page'>('sidebar');

    const resetForm = () => {
        setAdTitle('');
        setAdContent('');
        setAdImageUrl('');
        setAdPosition('sidebar');
        setEditingAd(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newAd = {
            title: adTitle,
            content: adContent,
            imageUrl: adImageUrl,
            position: adPosition,
            active: true,
            link: '#'
        };

        if (editingAd && editingAd.id) {
            deleteAd(editingAd.id);
            createAd(newAd);
            toast.success("Advertisement updated successfully");
        } else {
            createAd(newAd);
            toast.success("Advertisement created successfully");
        }

        setIsDialogOpen(false);
        resetForm();
    };

    const openEdit = (ad: Advertisement) => {
        setEditingAd(ad);
        setAdTitle(ad.title);
        setAdContent(ad.content);
        setAdImageUrl(ad.imageUrl || '');
        setAdPosition(ad.position);
        setIsDialogOpen(true);
    };

    const handleImageCropComplete = async (croppedImageUrl: string) => {
        setShowImageCropper(false);
        toast.loading('Uploading image...', { id: 'ad-image' });
        try {
            // Convert base64 to File
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'ad-image.jpg', { type: 'image/jpeg' });

            // Upload to Cloudinary
            const { uploadAPI } = await import('../../../lib/api');
            const result = await uploadAPI.image(file);
            setAdImageUrl(result.url);
            toast.success('Image uploaded', { id: 'ad-image' });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Upload failed: ${error.message}`, { id: 'ad-image' });
        }
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    return (
        <>
            <ImageCropper
                isOpen={showImageCropper}
                onClose={() => setShowImageCropper(false)}
                onCropComplete={handleImageCropComplete}
                aspectRatio={16 / 9}
                title="Upload Ad Image"
            />

            <Card className="bg-[#1f2c34] border-[#2a3942] animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white">Advertisements</CardTitle>
                        <CardDescription className="text-gray-500">Manage promotional content across the platform.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#006D77] hover:bg-[#005a63] text-white">
                                <Plus className="w-4 h-4 mr-2" /> Create Ad
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1f2c34] border-[#2a3942] text-white max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}</DialogTitle>
                                <DialogDescription>Fill in the details for the ad campaign.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Campaign Title</Label>
                                    <Input
                                        value={adTitle}
                                        onChange={(e) => setAdTitle(e.target.value)}
                                        required
                                        className="bg-[#0b141a] border-[#2a3942]"
                                        placeholder="e.g. Summer Sale"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <Textarea
                                        value={adContent}
                                        onChange={(e) => setAdContent(e.target.value)}
                                        required
                                        className="bg-[#0b141a] border-[#2a3942]"
                                        placeholder="Ad body text..."
                                    />
                                </div>

                                {/* Image Upload Section */}
                                <div className="space-y-2">
                                    <Label>Ad Image</Label>
                                    {adImageUrl ? (
                                        <div className="relative rounded-xl overflow-hidden border border-[#2a3942]">
                                            <img
                                                src={adImageUrl}
                                                alt="Ad preview"
                                                className="w-full h-40 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setShowImageCropper(true)}
                                                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" /> Edit
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setAdImageUrl('')}
                                                >
                                                    <Trash className="w-4 h-4 mr-1" /> Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setShowImageCropper(true)}
                                            className="border-2 border-dashed border-[#2a3942] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#006D77] hover:bg-[#006D77]/5 transition-colors"
                                        >
                                            <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
                                            <p className="text-gray-400 text-sm text-center">Click to upload image</p>
                                            <p className="text-gray-500 text-xs mt-1">Zoom, crop & rotate supported</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Position</Label>
                                    <Select value={adPosition} onValueChange={(value: 'sidebar' | 'chat_list' | 'landing_page') => setAdPosition(value)}>
                                        <SelectTrigger className="bg-[#0b141a] border-[#2a3942]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1f2c34] border-[#2a3942] text-white">
                                            <SelectItem value="sidebar">Sidebar</SelectItem>
                                            <SelectItem value="chat_list">Chat List</SelectItem>
                                            <SelectItem value="landing_page">Landing Page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-[#006D77] hover:bg-[#005a63]">
                                        {editingAd ? 'Update Ad' : 'Create Ad'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ads.map(ad => (
                            <div key={ad.id} className="bg-[#0b141a] border border-[#2a3942] rounded-xl overflow-hidden group">
                                <div className="relative h-32 bg-[#1a252b]">
                                    {ad.imageUrl ? (
                                        <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Badge className={cn("cursor-pointer", ad.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")} onClick={() => toggleAd(ad.id)}>
                                            {ad.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-white mb-1">{ad.title}</h3>
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{ad.content}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-[#202c33] pt-3">
                                        <div className="flex gap-3">
                                            <span className="flex items-center gap-1 text-blue-400">
                                                <MousePointer className="w-3 h-3" />
                                                <span className="font-medium">{ad.clicks || 0}</span>
                                            </span>
                                            <span className="flex items-center gap-1 text-green-400">
                                                <Eye className="w-3 h-3" />
                                                <span className="font-medium">{ad.views || 0}</span>
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-blue-400" onClick={() => openEdit(ad)}>
                                                <Edit className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-400" onClick={() => deleteAd(ad.id)}>
                                                <Trash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </>
    );
};

// --- Settings ---

const SettingsView = () => {
    const { systemSettings, updateSystemSettings } = useVoca();
    const [maintenance, setMaintenance] = useState(systemSettings.maintenanceMode);
    const [limit, setLimit] = useState(systemSettings.fileUploadLimitMB);

    const handleSave = () => {
        updateSystemSettings({ maintenanceMode: maintenance, fileUploadLimitMB: limit });
        toast.success("System settings updated successfully");
    };

    return (
        <Card className="bg-[#1f2c34] border-[#2a3942] max-w-2xl mx-auto mt-10">
            <CardHeader>
                <CardTitle className="text-white">System Settings</CardTitle>
                <CardDescription className="text-gray-500">Configure global application parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#0b141a] rounded-xl border border-[#2a3942]">
                    <div className="space-y-1">
                        <Label className="text-base text-white">Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Restrict access to administrators only. Users will see a maintenance page.</p>
                    </div>
                    <Switch checked={maintenance} onCheckedChange={setMaintenance} className="data-[state=checked]:bg-[#006D77]" />
                </div>

                <div className="space-y-3 p-4 bg-[#0b141a] rounded-xl border border-[#2a3942]">
                    <Label className="text-base text-white">File Upload Limit (MB)</Label>
                    <p className="text-sm text-gray-500 mb-2">Maximum file size allowed for user uploads.</p>
                    <div className="flex items-center gap-4">
                        <HardDrive className="w-5 h-5 text-gray-400" />
                        <Input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-[#1f2c34] border-[#2a3942] text-white w-32"
                        />
                        <span className="text-gray-400">MB</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-[#2a3942] pt-4">
                <Button onClick={handleSave} className="bg-[#006D77] hover:bg-[#005a63] text-white">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
};

// --- Broadcast ---

const BroadcastView = () => {
    const { sendBroadcast } = useVoca();
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (!message.trim()) return;
        sendBroadcast(message);
        setMessage('');
        toast.success("Broadcast sent from Voca Team");
    };

    return (
        <Card className="bg-[#1f2c34] border-[#2a3942] max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
            <CardHeader>
                <div className="w-12 h-12 rounded-full bg-[#006D77]/20 flex items-center justify-center mb-4">
                    <Megaphone className="w-6 h-6 text-[#83C5BE]" />
                </div>
                <CardTitle className="text-white">System Broadcast</CardTitle>
                <CardDescription className="text-gray-500">
                    Send a global announcement to all active users as <strong>Voca Team</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-gray-300">Announcement Message</Label>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your important announcement here..."
                        className="bg-[#0b141a] border-[#2a3942] min-h-[150px] text-white focus-visible:ring-[#006D77]"
                    />
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-sm text-yellow-200/80">
                        This message will be sent to every user's chat list instantly.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-[#2a3942] pt-6">
                <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setMessage('')}>Clear</Button>
                <Button
                    className="bg-[#006D77] hover:bg-[#005a63] text-white"
                    onClick={handleSend}
                    disabled={!message.trim()}
                >
                    <Zap className="w-4 h-4 mr-2" /> Send Broadcast
                </Button>
            </CardFooter>
        </Card>
    );
};

// --- Reports ---

const ReportsView = () => {
    const { reports, resolveReport } = useVoca();

    return (
        <Card className="bg-[#1f2c34] border-[#2a3942] animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
                <CardTitle className="text-white">User Reports</CardTitle>
                <CardDescription className="text-gray-500">Review and resolve reports submitted by users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#2a3942]">
                            <TableHead className="text-gray-400">Reporter</TableHead>
                            <TableHead className="text-gray-400">Reported User</TableHead>
                            <TableHead className="text-gray-400">Reason</TableHead>
                            <TableHead className="text-gray-400">Time</TableHead>
                            <TableHead className="text-gray-400">Status</TableHead>
                            <TableHead className="text-gray-400 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle className="w-8 h-8 text-green-500/50" />
                                        <p>No pending reports. Clean slate!</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map(report => (
                                <TableRow key={report.id} className="border-[#2a3942] hover:bg-[#2a3942]/50">
                                    <TableCell className="text-white">{report.reporterId}</TableCell>
                                    <TableCell className="text-white">{report.reportedUserId}</TableCell>
                                    <TableCell className="text-gray-300">{report.reason}</TableCell>
                                    <TableCell className="text-gray-500 text-xs">
                                        {format(new Date(report.timestamp), 'MMM d, HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {report.status === 'pending' && (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10"
                                                    onClick={() => resolveReport(report.id, 'dismissed')}
                                                >
                                                    Dismiss
                                                </Button>
                                                <Button
                                                    size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10"
                                                    onClick={() => resolveReport(report.id, 'resolved')}
                                                >
                                                    Resolve
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};



// --- Main Layout ---

export const AdminPanel = () => {
    const [activeView, setActiveView] = useState('dashboard');

    return (
        <div className="flex h-screen bg-[#0f1c24] overflow-hidden font-sans text-gray-100 selection:bg-[#006D77] selection:text-white">
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
            <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
                {activeView === 'dashboard' && <DashboardView />}
                {activeView === 'users' && <UserManagementView />}
                {activeView === 'moderation' && <ModerationView />}
                {activeView === 'broadcast' && <BroadcastView />}
                {activeView === 'reports' && <ReportsView />}
                {activeView === 'ads' && <AdvertisementsView />}
                {activeView === 'settings' && <SettingsView />}
            </main>
        </div>
    );
};
