# Deployment Guide for Voca Web App

This guide works for deploying the **Frontend to Vercel** and the **Backend to Render**.

## 1. Backend Deployment (Render)
1.  Push your code to GitHub.
2.  Go to [Render Dashboard](https://dashboard.render.com/).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Configuration**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
    *   **Instance Type**: Free (or higher)
6.  **Environment Variables**:
    *   `MONGO_URI`: Your MongoDB connection string.
    *   `JWT_SECRET`: A secure random string.
    *   `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name.
    *   `CLOUDINARY_API_KEY`: Your Cloudinary API Key.
    *   `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret.
    *   `CLIENT_URL`: The URL of your frontend (e.g., `https://voca-app.vercel.app`). *Add this after you deploy the frontend.*
7.  Click **Create Web Service**.
    *   *Note URL*: Copy the assigned URL (e.g., `https://voca-server.onrender.com`).

## 2. Frontend Deployment (Vercel)
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configuration**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `./` (default)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `build`
5.  **Environment Variables**:
    *   `VITE_API_URL`: Your Render Backend URL + `/api` (e.g., `https://voca-server.onrender.com/api`)
    *   `VITE_SOCKET_URL`: Your Render Backend URL (e.g., `https://voca-server.onrender.com`)
6.  Click **Deploy**.

## 3. Final Step: Connect Backend to Frontend
1.  Once Vercel deployment is complete, copy your new **Frontend URL** (e.g., `https://your-project.vercel.app`).
2.  Go back to **Render Dashboard** -> Your Web Service -> **Environment**.
3.  Add/Update the `CLIENT_URL` variable with your Frontend URL.
4.  Render will auto-deploy the changes.

## Troubleshooting
*   **CORS Errors**: Ensure `CLIENT_URL` on Render matches your Vercel URL exactly (no trailing slash).
*   **Socket Connection**: Ensure `VITE_SOCKET_URL` is correct on Vercel.
