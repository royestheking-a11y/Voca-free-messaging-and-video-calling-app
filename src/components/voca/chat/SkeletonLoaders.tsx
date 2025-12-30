import React from 'react';

// Single chat item skeleton - mimics the chat item layout
export const ChatItemSkeleton = () => {
    return (
        <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 rounded-full bg-[var(--wa-border)] shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
                {/* Name and time row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="h-4 bg-[var(--wa-border)] rounded w-24" />
                    <div className="h-3 bg-[var(--wa-border)] rounded w-10" />
                </div>
                {/* Message preview */}
                <div className="h-3 bg-[var(--wa-border)] rounded w-3/4" />
            </div>
        </div>
    );
};

// Multiple skeletons for the chat list
export const ChatListSkeleton = ({ count = 8 }: { count?: number }) => {
    return (
        <div className="divide-y divide-[var(--wa-border)]">
            {Array.from({ length: count }).map((_, i) => (
                <ChatItemSkeleton key={i} />
            ))}
        </div>
    );
};

// Status ring skeleton for the status section
export const StatusSkeleton = () => {
    return (
        <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-[var(--wa-border)] ring-2 ring-[var(--wa-border)]" />
            <div className="space-y-2">
                <div className="h-4 bg-[var(--wa-border)] rounded w-20" />
                <div className="h-3 bg-[var(--wa-border)] rounded w-16" />
            </div>
        </div>
    );
};

// Call history skeleton
export const CallItemSkeleton = () => {
    return (
        <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-[var(--wa-border)]" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--wa-border)] rounded w-28" />
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[var(--wa-border)]" />
                    <div className="h-3 bg-[var(--wa-border)] rounded w-20" />
                </div>
            </div>
            <div className="w-5 h-5 rounded bg-[var(--wa-border)]" />
        </div>
    );
};

export default ChatListSkeleton;
