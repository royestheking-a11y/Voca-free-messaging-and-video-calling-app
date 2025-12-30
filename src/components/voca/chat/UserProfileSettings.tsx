import React, { useState } from 'react';
import { useVoca } from '../VocaContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/sheet';
import { ScrollArea } from '../../ui/scroll-area';
import { Switch } from '../../ui/switch';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Separator } from '../../ui/separator';
import {
    Camera, Edit2, Check, ArrowLeft, Lock, Shield, Bell, Moon,
    Database, HelpCircle, UserPlus, LogOut, ChevronRight, Upload,
    Eye, EyeOff, Smartphone, Globe, Sun, Image as ImageIcon, FileText, Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropper } from '../shared/ImageCropper';

interface UserProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsView = 'main' | 'privacy' | 'security' | 'notifications' | 'storage' | 'theme' | 'help' | 'terms' | 'app_info';

export const UserProfileSettings = ({ isOpen, onClose }: UserProfileSettingsProps) => {
    const { currentUser, updateSettings, updateProfilePhoto, updateUser, logout } = useVoca();
    const [currentView, setCurrentView] = useState<SettingsView>('main');
    const [name, setName] = useState(currentUser?.name || '');
    const [about, setAbout] = useState(currentUser?.about || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [showImageCropper, setShowImageCropper] = useState(false);

    if (!currentUser) return null;

    const handleSaveProfile = () => {
        updateUser(currentUser.id, { name, about });
        setIsEditingName(false);
        setIsEditingAbout(false);
        toast.success("Profile updated");
    };

    const handlePhotoUpload = () => {
        setShowImageCropper(true);
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        // Convert base64 to file for upload
        try {
            toast.loading('Uploading profile photo...', { id: 'photo-upload' });

            // Upload base64 directly or convert to blob then upload
            const res = await fetch(croppedImageUrl);
            const blob = await res.blob();
            const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });

            const { uploadAPI } = await import('../../../lib/api');
            const result = await uploadAPI.image(file);

            await updateProfilePhoto(result.url);
            toast.success("Profile photo updated", { id: 'photo-upload' });
            setShowImageCropper(false);
        } catch (error: any) {
            console.error('Photo upload error:', error);
            toast.error(`Upload failed: ${error.message}`, { id: 'photo-upload' });
        }
    };

    const renderHeader = (title: string, backTo: SettingsView | null) => (
        <div className="bg-[var(--wa-header-bg)] h-16 px-4 flex items-center gap-4 shrink-0 text-[var(--wa-text-primary)]">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => backTo ? setCurrentView(backTo) : onClose()}
                className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)]"
            >
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-medium">{title}</h2>
        </div>
    );

    const renderMainView = () => (
        <>
            <div className="bg-[var(--wa-header-bg)] h-28 p-4 flex items-end pb-4 text-[var(--wa-text-primary)] shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)] md:hidden">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-xl font-medium">Profile & Settings</h2>
                </div>
            </div>

            <ScrollArea className="h-[calc(100vh-112px)]">
                <div className="flex flex-col">
                    <div className="p-6 flex flex-col items-center -mt-10 relative z-10 mb-4">
                        {/* Avatar */}
                        <div className="relative group cursor-pointer" onClick={handlePhotoUpload}>
                            <Avatar className="w-40 h-40 border-4 border-[var(--wa-sidebar-bg)] shadow-lg">
                                <AvatarImage src={currentUser.avatar} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-[#6a7f8a] text-white">{currentUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex flex-col items-center text-white text-center">
                                    <Camera className="w-8 h-8 mb-1 mx-auto" />
                                    <span className="text-xs uppercase font-medium tracking-wide">Change</span>
                                    <span className="text-xs uppercase font-medium tracking-wide">Photo</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full mt-8 space-y-6">
                            {/* Name Section */}
                            <div className="bg-transparent p-0 relative group">
                                <Label className="text-[var(--wa-primary)] text-sm mb-4 block font-normal">Your Name</Label>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="border-b-2 border-[var(--wa-primary)] rounded-none border-t-0 border-x-0 px-0 focus-visible:ring-0 h-9 bg-transparent text-[var(--wa-text-primary)] text-[17px]"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleSaveProfile} className="hover:bg-transparent">
                                            <Check className="w-6 h-6 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-[var(--wa-text-primary)] text-[17px]">{name}</p>
                                        <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)} className="hover:bg-transparent">
                                            <Edit2 className="w-5 h-5 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* About Section */}
                            <div className="bg-transparent p-0 relative">
                                <Label className="text-[var(--wa-primary)] text-sm mb-4 block font-normal">About</Label>
                                {isEditingAbout ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={about}
                                            onChange={(e) => setAbout(e.target.value)}
                                            className="border-b-2 border-[var(--wa-primary)] rounded-none border-t-0 border-x-0 px-0 focus-visible:ring-0 h-9 bg-transparent text-[var(--wa-text-primary)] text-[17px]"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleSaveProfile} className="hover:bg-transparent">
                                            <Check className="w-6 h-6 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-[var(--wa-text-primary)] text-[17px]">{about || "Hey there! I am using Voca."}</p>
                                        <Button size="icon" variant="ghost" onClick={() => setIsEditingAbout(true)} className="hover:bg-transparent">
                                            <Edit2 className="w-5 h-5 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-2 bg-[var(--wa-app-bg)]" />

                    {/* Settings Menu */}
                    <div className="py-2">
                        {[
                            { id: 'privacy', icon: Lock, label: 'Privacy', sub: 'Last seen, profile photo, about' },
                            { id: 'security', icon: Shield, label: 'Security', sub: 'End-to-end encryption' },
                            { id: 'notifications', icon: Bell, label: 'Notifications', sub: 'Message, group & call tones' },
                            { id: 'storage', icon: Database, label: 'Storage and data', sub: 'Network usage, auto-download' },
                            { id: 'theme', icon: Moon, label: 'Theme', sub: 'Dark Teal & Midnight' },
                            { id: 'help', icon: HelpCircle, label: 'Help', sub: 'Help center, contact us, privacy policy' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-6 px-6 py-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors" onClick={() => setCurrentView(item.id as SettingsView)}>
                                <item.icon className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                                <div>
                                    <h4 className="text-[var(--wa-text-primary)] text-[16px] font-normal">{item.label}</h4>
                                    {item.sub && <p className="text-[var(--wa-text-secondary)] text-sm">{item.sub}</p>}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-6 px-6 py-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors text-red-400" onClick={logout}>
                            <LogOut className="w-5 h-5" />
                            <h4 className="text-[16px] font-normal">Logout</h4>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </>
    );

    const renderPrivacyView = () => {
        const privacy = currentUser.settings?.privacy || { lastSeen: 'everyone', profilePhoto: 'everyone', about: 'everyone', readReceipts: true };

        const options = [
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'My contacts' },
            { value: 'nobody', label: 'Nobody' }
        ];

        const handlePrivacyChange = (field: string, value: string) => {
            updateSettings({
                privacy: {
                    ...privacy,
                    [field]: value
                }
            });
            toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} privacy updated`);
        };

        return (
            <>
                {renderHeader('Privacy', 'main')}
                <ScrollArea className="h-[calc(100vh-64px)] p-6 space-y-6">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[var(--wa-primary)] text-sm font-medium mb-4">Who can see my personal info</h3>
                            <div className="space-y-6">
                                {/* Last seen and online */}
                                <div>
                                    <h4 className="text-[var(--wa-text-primary)] text-[16px] mb-2">Last seen and online</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map(opt => (
                                            <Button
                                                key={opt.value}
                                                variant={privacy.lastSeen === opt.value ? 'default' : 'outline'}
                                                size="sm"
                                                className={privacy.lastSeen === opt.value
                                                    ? 'bg-[var(--wa-primary)] text-white hover:bg-[var(--wa-primary)]/90'
                                                    : 'border-[var(--wa-border)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]'}
                                                onClick={() => handlePrivacyChange('lastSeen', opt.value)}
                                            >
                                                {opt.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <Separator className="bg-[var(--wa-border)]" />

                                {/* Profile photo */}
                                <div>
                                    <h4 className="text-[var(--wa-text-primary)] text-[16px] mb-2">Profile photo</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map(opt => (
                                            <Button
                                                key={opt.value}
                                                variant={privacy.profilePhoto === opt.value ? 'default' : 'outline'}
                                                size="sm"
                                                className={privacy.profilePhoto === opt.value
                                                    ? 'bg-[var(--wa-primary)] text-white hover:bg-[var(--wa-primary)]/90'
                                                    : 'border-[var(--wa-border)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]'}
                                                onClick={() => handlePrivacyChange('profilePhoto', opt.value)}
                                            >
                                                {opt.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <Separator className="bg-[var(--wa-border)]" />

                                {/* About */}
                                <div>
                                    <h4 className="text-[var(--wa-text-primary)] text-[16px] mb-2">About</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map(opt => (
                                            <Button
                                                key={opt.value}
                                                variant={privacy.about === opt.value ? 'default' : 'outline'}
                                                size="sm"
                                                className={privacy.about === opt.value
                                                    ? 'bg-[var(--wa-primary)] text-white hover:bg-[var(--wa-primary)]/90'
                                                    : 'border-[var(--wa-border)] text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]'}
                                                onClick={() => handlePrivacyChange('about', opt.value)}
                                            >
                                                {opt.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[var(--wa-text-primary)] text-[16px]">Read receipts</h4>
                                    <p className="text-[var(--wa-text-secondary)] text-sm max-w-[280px]">If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.</p>
                                </div>
                                <Switch checked={privacy.readReceipts !== false} onCheckedChange={(v: boolean) => updateSettings({ privacy: { ...privacy, readReceipts: v } })} />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </>
        );
    };

    const renderSecurityView = () => (
        <>
            {renderHeader('Security', 'main')}
            <ScrollArea className="h-[calc(100vh-64px)] p-6">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 bg-[var(--wa-primary)]/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-10 h-10 text-[var(--wa-primary)]" />
                    </div>
                    <h3 className="text-[var(--wa-text-primary)] text-lg font-medium">End-to-end encrypted</h3>
                    <p className="text-[var(--wa-text-secondary)] text-sm mt-2 max-w-xs">
                        Messages and calls are end-to-end encrypted. No one outside of this chat, not even Voca, can read or listen to them.
                    </p>
                </div>

                <Separator className="bg-[var(--wa-border)] mb-6" />

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-[var(--wa-text-primary)] text-[16px]">Two-step verification</h4>
                        <p className="text-[var(--wa-text-secondary)] text-sm">For added security, enable two-step verification.</p>
                    </div>
                    <Switch checked={currentUser.settings?.security?.twoFactor} onCheckedChange={(v: boolean) => updateSettings({ security: { twoFactor: v } })} />
                </div>
            </ScrollArea>
        </>
    );

    const renderNotificationsView = () => (
        <>
            {renderHeader('Notifications', 'main')}
            <ScrollArea className="h-[calc(100vh-64px)] p-6">
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[var(--wa-text-primary)] text-[16px]">Message Notifications</h4>
                                <p className="text-[var(--wa-text-secondary)] text-sm">Show notifications for new messages</p>
                            </div>
                            <Switch checked={currentUser.settings?.notifications} onCheckedChange={(v: boolean) => updateSettings({ notifications: v })} />
                        </div>
                    </div>
                    <Separator className="bg-[var(--wa-border)]" />
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[var(--wa-text-primary)] text-[16px]">Sound</h4>
                                <p className="text-[var(--wa-text-secondary)] text-sm">Play sounds for incoming messages</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </div>
                    <Separator className="bg-[var(--wa-border)]" />
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[var(--wa-text-primary)] text-[16px]">Reaction Notifications</h4>
                                <p className="text-[var(--wa-text-secondary)] text-sm">Show notifications for reactions</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </>
    );

    const renderStorageView = () => (
        <>
            {renderHeader('Storage and Data', 'main')}
            <ScrollArea className="h-[calc(100vh-64px)] p-6">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-[var(--wa-text-primary)] text-[16px]">Manage Storage</h4>
                            <p className="text-[var(--wa-text-secondary)] text-sm">2.4 GB used</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                    </div>
                    <Separator className="bg-[var(--wa-border)]" />

                    <div>
                        <h3 className="text-[var(--wa-text-secondary)] text-sm font-medium mb-4 uppercase">Media Auto-Download</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[var(--wa-text-primary)]">Photos</div>
                                <div className="text-[var(--wa-text-secondary)] text-sm flex items-center gap-2">Wi-Fi <Wifi className="w-3 h-3" /></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-[var(--wa-text-primary)]">Audio</div>
                                <div className="text-[var(--wa-text-secondary)] text-sm flex items-center gap-2">Wi-Fi <Wifi className="w-3 h-3" /></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-[var(--wa-text-primary)]">Videos</div>
                                <div className="text-[var(--wa-text-secondary)] text-sm flex items-center gap-2">Wi-Fi <Wifi className="w-3 h-3" /></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-[var(--wa-text-primary)]">Documents</div>
                                <div className="text-[var(--wa-text-secondary)] text-sm flex items-center gap-2">Wi-Fi <Wifi className="w-3 h-3" /></div>
                            </div>
                        </div>
                    </div>
                    <Separator className="bg-[var(--wa-border)]" />

                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-[var(--wa-text-primary)] text-[16px]">Use less data for calls</h4>
                        </div>
                        <Switch />
                    </div>
                </div>
            </ScrollArea>
        </>
    );

    const renderThemeView = () => (
        <>
            {renderHeader('Theme', 'main')}
            <div className="p-6">
                <RadioGroup
                    value={currentUser.settings?.theme || 'dark'}
                    onValueChange={(v: string) => updateSettings({ theme: v as 'light' | 'dark' })}
                    className="space-y-4"
                >
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => updateSettings({ theme: 'light' })}>
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="text-[var(--wa-text-primary)] text-lg font-normal cursor-pointer flex items-center gap-2">
                            <Sun className="w-5 h-5" /> Light
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => updateSettings({ theme: 'dark' })}>
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="text-[var(--wa-text-primary)] text-lg font-normal cursor-pointer flex items-center gap-2">
                            <Moon className="w-5 h-5" /> Dark
                        </Label>
                    </div>
                </RadioGroup>
                <p className="text-[var(--wa-text-secondary)] text-sm mt-8">
                    Note: Dark mode is the primary aesthetic for Voca Premium. Light mode is currently in beta.
                </p>
            </div>
        </>
    );

    const renderHelpView = () => (
        <>
            {renderHeader('Help', 'main')}
            <div className="py-2">
                <div
                    className="flex items-center gap-6 px-6 py-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors"
                    onClick={() => window.open('mailto:support@voca.com')}
                >
                    <HelpCircle className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                    <div>
                        <h4 className="text-[var(--wa-text-primary)] text-[16px] font-normal">Contact us</h4>
                        <p className="text-[var(--wa-text-secondary)] text-sm">Questions? Need help?</p>
                    </div>
                </div>
                <div
                    className="flex items-center gap-6 px-6 py-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors"
                    onClick={() => setCurrentView('terms')}
                >
                    <FileText className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                    <div>
                        <h4 className="text-[var(--wa-text-primary)] text-[16px] font-normal">Terms and Privacy Policy</h4>
                    </div>
                </div>
                <div
                    className="flex items-center gap-6 px-6 py-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors"
                    onClick={() => setCurrentView('app_info')}
                >
                    <Globe className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                    <div>
                        <h4 className="text-[var(--wa-text-primary)] text-[16px] font-normal">App info</h4>
                    </div>
                </div>
            </div>
        </>
    );

    const renderTermsView = () => (
        <>
            {renderHeader('Terms & Privacy', 'help')}
            <ScrollArea className="h-[calc(100vh-64px)] p-6">
                <div className="space-y-6 text-[var(--wa-text-primary)]">
                    <h3 className="text-lg font-medium">Terms of Service</h3>
                    <p className="text-sm text-[var(--wa-text-secondary)] leading-relaxed">
                        Welcome to Voca. By using our services, you agree to these terms. Please read them carefully.
                        Our services are diverse, so sometimes additional terms or product requirements may apply.
                    </p>

                    <h3 className="text-lg font-medium pt-4">Privacy Policy</h3>
                    <p className="text-sm text-[var(--wa-text-secondary)] leading-relaxed">
                        Your privacy is important to us. It is Voca's policy to respect your privacy regarding any information we may collect from you across our website and applications.
                    </p>
                    <p className="text-sm text-[var(--wa-text-secondary)] leading-relaxed">
                        We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.
                    </p>

                    <div className="pt-8 text-xs text-[var(--wa-text-secondary)] text-center">
                        Last updated: December 2025
                    </div>
                </div>
            </ScrollArea>
        </>
    );

    const renderAppInfoView = () => (
        <>
            {renderHeader('App Info', 'help')}
            <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-[#00a884] rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg mb-8">
                    <span className="text-4xl text-white font-bold">V</span>
                </div>

                <h3 className="text-2xl font-medium text-[var(--wa-text-primary)] mb-2">Voca Web</h3>
                <p className="text-[var(--wa-text-secondary)] text-lg mb-8">Version 3.0</p>

                <div className="text-sm text-[var(--wa-text-secondary)] opacity-60">
                    © 2025 Voca Inc. All rights reserved.
                </div>
            </div>
        </>
    );

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="left" className="w-[350px] sm:w-[400px] p-0 bg-[var(--wa-sidebar-bg)] border-r border-[var(--wa-border)]">
                <SheetHeader className="sr-only">
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>App settings</SheetDescription>
                </SheetHeader>

                {currentView === 'main' && renderMainView()}
                {currentView === 'privacy' && renderPrivacyView()}
                {currentView === 'security' && renderSecurityView()}
                {currentView === 'theme' && renderThemeView()}
                {currentView === 'help' && renderHelpView()}
                {currentView === 'terms' && renderTermsView()}
                {currentView === 'app_info' && renderAppInfoView()}
                {currentView === 'notifications' && renderNotificationsView()}
                {currentView === 'storage' && renderStorageView()}

                {/* Image Cropper Dialog */}
                <ImageCropper
                    isOpen={showImageCropper}
                    onClose={() => setShowImageCropper(false)}
                    onCropComplete={handleCropComplete}
                    title="Edit Profile Photo"
                    aspectRatio={1} // Square for profile photos
                />
            </SheetContent>
        </Sheet>
    );
};
