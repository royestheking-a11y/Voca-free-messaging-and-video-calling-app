import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    url?: string;
    image?: string;
    type?: string;
}

export const SEO = ({ title, description, url, image, type = 'website' }: SEOProps) => {
    const siteName = "Voca Messenger";
    const defaultImage = "https://res.cloudinary.com/dfvc27xla/image/upload/v1767072880/voca-logo_ggdmyk.png";
    const defaultDescription = "Voca Messenger is a secure, privacy-first messaging platform offering real-time chat, voice and video calls, and encrypted communication using email-based login.";
    const baseUrl = "https://vocamessenger.vercel.app";

    const fullUrl = url ? (url.startsWith('http') ? url : `${baseUrl}${url}`) : baseUrl;

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description || defaultDescription} />

            <meta property="og:title" content={title} />
            <meta property="og:description" content={description || defaultDescription} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:image" content={image || defaultImage} />

            <meta name="twitter:card" content="summary_large_image" />

            <link rel="canonical" href={fullUrl} />
        </Helmet>
    );
};
