# Voca Web App 📱💬

Voca is a comprehensive, feature-rich messaging and video calling application built with modern web technologies. It combines the functionality of a chat app with social media features, offering real-time communication, media sharing, and social networking capabilities.

## 🌟 Key Features

### Core Messaging & Communication
*   **Real-time Chat:** Instant messaging using Socket.io with low latency.
*   **Group Chats:** Create and manage group conversations with multiple participants.
*   **Voice & Video Calls:** High-quality voice and video calls powered by WebRTC.
*   **Multimedia Sharing:** Send images, videos, and voice messages seamlessly.
*   **Message Interactions:** Edit, delete, star, and archive messages.
*   **Read Receipts:** See when messages are delivered and read.

### Social Features
*   **Stories / Statuses:** Share ephemeral photo or video updates (similar to WhatsApp/Instagram Stories).
*   **Posts Feed:** A social feed where users can create posts, like, comment, and share.
*   **User Profiles:** customizable profiles with avatars, bios, and interests.
*   **Discovery:** Find and connect with new users.

### User Experience (UX)
*   **PWA Support:** Installable as a Progressive Web App on mobile and desktop.
*   **Responsive Design:** Optimized for all screen sizes (Mobile, Tablet, Desktop).
*   **Dark Mode:** Sleek UI with Radix UI and Tailwind CSS.
*   **Smooth Animations:** Powered by Framer Motion for a premium feel.

### Security & Privacy
*   **Authentication:** Secure JWT-based authentication.
*   **Google Login:** OAuth integration for quick sign-up/sign-in.
*   **Privacy Controls:** Block users, report inappropriate content.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** [React](https://react.dev/) (v18+)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Radix UI](https://www.radix-ui.com/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Animations:** [Motion](https://motion.dev/) (formerly Framer Motion)
*   **State/Cache:** React Context & Custom Hooks
*   **Routing:** React Router v6
*   **Real-time:** Socket.io Client

### Backend
*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Framework:** [Express.js](https://expressjs.com/)
*   **Database:** [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
*   **Real-time:** Socket.io
*   **File Storage:** Cloudinary (implied by payload analysis)

## 📁 Project Structure

```bash
├── src/                # Frontend Source Code
│   ├── components/     # UI Components (Chat, Auth, Layouts, etc.)
│   ├── lib/            # Utilities (API client, WebRTC, Helpers)
│   ├── pages/          # Page specific components (in components/voca/pages)
│   ├── styles/         # Global styles and Tailwind config
│   ├── App.tsx         # Main Application Component & Routing
│   └── main.tsx        # Entry Point
├── server/             # Backend Source Code
│   ├── config/         # Database and Server Config
│   ├── models/         # Mongoose Data Models (User, Chat, Message, etc.)
│   ├── routes/         # API Routes (Auth, Chats, Users, etc.)
│   └── index.js        # Server Entry Point
└── public/             # Static Assets
```

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn
*   MongoDB Instance (Local or Atlas)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd voca-web-app
    ```

2.  **Install Dependencies**
    *   **Root (Frontend):**
        ```bash
        npm install
        ```
    *   **Server (Backend):**
        ```bash
        cd server
        npm install
        cd ..
        ```

3.  **Environment Setup**
    Create a `.env` file in the root directory (based on `.env.example`):
    ```env
    VITE_API_URL=http://localhost:3001/api
    VITE_SOCKET_URL=http://localhost:3001
    ```

    *Note: You may also need a `.env` file in the `server/` directory with `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_URL`, etc.*

4.  **Running the App**

    *   **Development Mode (Concurrent):**
        To run both client and server:
        ```bash
        npm run dev:all
        ```

    *   **Frontend Only:**
        ```bash
        npm run dev
        ```

    *   **Backend Only:**
        ```bash
        npm run server
        ```

## 🔌 API Documentation

The backend exposes the following RESTful endpoints (prefixed with `/api`):

### Authentication (`/auth`)
*   `POST /signup` - Register a new user
*   `POST /login` - User login
*   `POST /google` - Google OAuth login
*   `POST /admin-login` - Admin dashboard login
*   `GET /me` - Get current user profile

### Users (`/users`)
*   `GET /` - List all users
*   `GET /:id` - Get specific user details
*   `PUT /:id` - Update user profile
*   `POST /:id/block` - Block a user
*   `POST /:id/favorite` - Add user to favorites

### Chats (`/chats`)
*   `GET /` - Get all chats for current user
*   `POST /` - Start a new chat or group
*   `GET /:id/messages` - Get messages for a chat
*   `POST /:id/messages` - Send a message
*   `PUT /:id/messages/:msgId` - Edit a message
*   `DELETE /:id/messages/:msgId` - Delete a message

### Posts (`/posts`)
*   `GET /` - Get social feed
*   `POST /` - Create a new post
*   `POST /:id/like` - Like a post
*   `POST /:id/comment` - Comment on a post

### Admin (`/admin`)
*   `GET /stats` - System statistics
*   `GET /users` - Manage users (Ban/Unban)
*   `GET /reports` - View and handle reports
*   `GET /ads` - Manage advertisements
*   `POST /broadcast` - Send system-wide announcements

## 🛡️ Admin Panel

Access the hidden Admin Panel at `/admin` (requires admin privileges).
*   **Dashboard:** View real-time stats (Users, Active Chats, Server Status).
*   **User Management:** Ban/Unban users, view complete user details.
*   **Content Moderation:** Review reported messages or users.
*   **Ad Manager:** Create and manage advertisement banners.
*   **God Mode:** Super-admin features for system oversight.

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.