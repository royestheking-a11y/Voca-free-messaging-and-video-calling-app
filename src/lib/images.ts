/**
 * Utility to optimize Cloudinary URLs by adding auto-format, auto-quality,
 * and optional width/height transformations.
 * 
 * @param url The original image URL
 * @param options Optimization options (width, height, quality, etc.)
 * @returns Optimized image URL
 */
export const getOptimizedImageUrl = (
    url: string | undefined, 
    options: { width?: number; height?: number; quality?: string; format?: string } = {}
): string => {
    if (!url) return '';

    // Only transform Cloudinary URLs
    if (!url.includes('cloudinary.com')) return url;

    try {
        const { width, height, quality = 'auto', format = 'auto' } = options;
        
        // Parts of a Cloudinary URL: https://res.cloudinary.com/<cloud_name>/image/upload/<transformations>/<version>/<public_id>
        const parts = url.split('/upload/');
        if (parts.length !== 2) return url;

        const transformations = [];
        
        // Add automatic format and quality
        transformations.push(`f_${format}`);
        transformations.push(`q_${quality}`);

        // Add size transformations if provided
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        
        // For avatars or cropped images, we might want c_fill
        if (width && height) {
            transformations.push('c_fill');
        } else if (width || height) {
            transformations.push('c_limit'); // Keep aspect ratio
        }

        const transformString = transformations.join(',');
        
        return `${parts[0]}/upload/${transformString}/${parts[1]}`;
    } catch (error) {
        console.error('Error optimizing image URL:', error);
        return url;
    }
};

/**
 * Common image size presets
 */
export const IMAGE_PRESETS = {
    AVATAR: { width: 100, height: 100 },
    CHAT_IMAGE: { width: 600 },
    POST_IMAGE: { width: 800 },
    THUMBNAIL: { width: 200, height: 200 },
    FULL_SCREEN: { width: 1200 }
};
