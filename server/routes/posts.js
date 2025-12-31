import express from 'express';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const posts = await Post.find()
            .populate('userId', 'name avatar verified isVocaTeam blockedUsers')
            .populate('comments.userId', 'name avatar')
            .sort({ timestamp: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        // Filter out posts from blocked users
        const filteredPosts = posts.filter(post => {
            const postUser = post.userId;
            // Don't show posts from users who blocked current user
            if (postUser?.blockedUsers?.includes(req.user._id)) return false;
            // Don't show posts from users that current user blocked
            if (req.user.blockedUsers?.includes(postUser?._id)) return false;
            return true;
        });

        // Add user object to each post for frontend compatibility
        const postsWithUser = filteredPosts.map(post => {
            const postObj = post.toJSON();
            postObj.user = postObj.userId;
            return postObj;
        });

        res.json(postsWithUser);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { content, imageUrl } = req.body;

        const post = await Post.create({
            userId: req.user._id,
            content,
            imageUrl,
            timestamp: new Date()
        });

        const populatedPost = await Post.findById(post._id)
            .populate('userId', 'name avatar verified');

        const postObj = populatedPost.toJSON();
        postObj.user = postObj.userId;

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        io.emit('post:new', postObj);

        res.status(201).json(postObj);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const isLiked = post.likes.includes(req.user._id);

        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            post.likes.push(req.user._id);
        }

        await post.save();
        res.json({ liked: !isLiked, likesCount: post.likes.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/posts/:id/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
    try {
        const { content } = req.body;

        const post = await Post.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    comments: {
                        userId: req.user._id,
                        content,
                        timestamp: new Date()
                    }
                }
            },
            { new: true }
        ).populate('comments.userId', 'name avatar');

        res.json(post.comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/posts/:id/share
// @desc    Share a post (increment share count)
// @access  Private
router.post('/:id/share', protect, async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { shares: 1 } },
            { new: true }
        );
        res.json({ shares: post.shares });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Only allow owner or admin to delete
        if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
