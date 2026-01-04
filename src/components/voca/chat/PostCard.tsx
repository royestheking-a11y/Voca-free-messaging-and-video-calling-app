import React, { useState } from 'react';
import { Post, User } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useVoca } from '../VocaContext';
import { cn } from '../../ui/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { toast } from 'sonner';

interface PostCardProps {
    post: Post;
}

export const PostCard = ({ post }: PostCardProps) => {
    const { currentUser, likePost, commentOnPost, sharePost, deletePost, users } = useVoca();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');

    const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;

    // Handle both string ID and populated user object
    const postUserId = typeof post.userId === 'string'
        ? post.userId
        : (post.userId as any)?._id || (post.userId as any)?.id;

    const isOwnPost = currentUser?.id === postUserId;

    const handleLike = () => {
        likePost(post.id);
    };

    const handleShare = () => {
        sharePost(post.id);
        toast.success('Post shared!');
    };

    const handleComment = () => {
        if (!commentText.trim()) return;
        commentOnPost(post.id, commentText);
        setCommentText('');
        toast.success('Comment added!');
    };

    const handleDelete = () => {
        deletePost(post.id);
        toast.success('Post deleted');
    };

    const getUser = (userId: string): User | undefined => {
        return users.find(u => u.id === userId);
    };

    return (
        <div className="bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] rounded-xl overflow-hidden mb-4">
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user?.avatar} />
                        <AvatarFallback className="bg-[var(--wa-primary)] text-[#0b141a]">
                            {post.user?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-[var(--wa-text-primary)]">{post.user?.name || 'Unknown User'}</p>
                        <p className="text-xs text-[var(--wa-text-secondary)]">
                            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                </div>

                {isOwnPost && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]">
                                <MoreHorizontal className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)]">
                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="text-red-400 hover:bg-[var(--wa-hover)] cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Post
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
                <p className="text-[var(--wa-text-primary)] whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
                <div className="w-full">
                    <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full max-h-[400px] object-cover"
                    />
                </div>
            )}

            {/* Stats Row */}
            <div className="px-4 py-2 flex items-center justify-between text-sm text-[var(--wa-text-secondary)] border-b border-[var(--wa-border)]">
                <div className="flex items-center gap-4">
                    {post.likes.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            {post.likes.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {post.comments.length > 0 && (
                        <span
                            className="hover:underline cursor-pointer"
                            onClick={() => setShowComments(!showComments)}
                        >
                            {post.comments.length} comment{post.comments.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {post.shares > 0 && (
                        <span>{post.shares} share{post.shares > 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-2 flex items-center justify-around border-b border-[var(--wa-border)]">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={cn(
                        "flex-1 hover:bg-[var(--wa-hover)]",
                        isLiked ? "text-red-500" : "text-[var(--wa-text-secondary)]"
                    )}
                >
                    <Heart className={cn("w-5 h-5 mr-2", isLiked && "fill-red-500")} />
                    Like
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(!showComments)}
                    className="flex-1 text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
                >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Comment
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="flex-1 text-[var(--wa-text-secondary)] hover:bg-[var(--wa-hover)]"
                >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                </Button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="p-4 bg-[var(--wa-app-bg)]">
                    {/* Comment Input */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={currentUser?.avatar} />
                            <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex items-center gap-2">
                            <Input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] h-9"
                                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                            />
                            <Button
                                size="icon"
                                onClick={handleComment}
                                disabled={!commentText.trim()}
                                className="bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 h-9 w-9"
                            >
                                <Send className="w-4 h-4 text-[#0b141a]" />
                            </Button>
                        </div>
                    </div>

                    {/* Comment List */}
                    <div className="space-y-3">
                        {post.comments.map(comment => {
                            const commentUser = getUser(comment.userId);
                            return (
                                <div key={comment.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={commentUser?.avatar} />
                                        <AvatarFallback>{commentUser?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-[var(--wa-panel-bg)] rounded-xl px-3 py-2 flex-1">
                                        <p className="font-medium text-sm text-[var(--wa-text-primary)]">{commentUser?.name}</p>
                                        <p className="text-sm text-[var(--wa-text-primary)]">{comment.content}</p>
                                        <p className="text-xs text-[var(--wa-text-secondary)] mt-1">
                                            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
