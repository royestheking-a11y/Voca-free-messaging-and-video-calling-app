import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { VocaProvider, useVoca } from './components/voca/VocaContext';
import { SocketProvider } from './components/voca/SocketContext';
import { LoginPage } from './components/voca/auth/LoginPage';
import { LandingPage } from './components/voca/LandingPage';
import { ChatLayout } from './components/voca/chat/ChatLayout';
import { ChatWindow } from './components/voca/chat/ChatWindow';
import { AdminPanel } from './components/voca/admin/AdminPanel';
import { MaintenancePage } from './components/voca/MaintenancePage';
import { FeaturesPage } from './components/voca/pages/FeaturesPage';
import { SecurityPage } from './components/voca/pages/SecurityPage';
import { DownloadPage } from './components/voca/pages/DownloadPage';
import { PrivacyPage } from './components/voca/pages/PrivacyPage';
import { TermsPage } from './components/voca/pages/TermsPage';
import { ContactPage } from './components/voca/pages/ContactPage';
import { DemoPage } from './components/voca/DemoPage';
import { Toaster } from 'sonner';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
    const { currentUser, isAdmin, systemSettings } = useVoca();
    const location = useLocation();

    if (systemSettings?.maintenanceMode && !isAdmin) {
        return <MaintenancePage />;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/chat" replace />;
    }

    return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, isAdmin } = useVoca();
    if (currentUser) {
        return <Navigate to={isAdmin ? "/admin" : "/chat"} replace />;
    }
    return <>{children}</>;
};

const AppContent = () => {
    return (
        <Routes>
            <Route path="/" element={
                <PublicOnlyRoute>
                    <LandingPage />
                </PublicOnlyRoute>
            } />

            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />

            <Route path="/login" element={
                <PublicOnlyRoute>
                    <LoginPage initialMode="login" />
                </PublicOnlyRoute>
            } />

            <Route path="/signup" element={
                <PublicOnlyRoute>
                    <LoginPage initialMode="signup" />
                </PublicOnlyRoute>
            } />

            <Route path="/demo" element={<DemoPage />} />

            {/* Protected Routes */}
            {/* Protected Routes */}
            <Route path="/chat" element={
                <ProtectedRoute>
                    <ChatLayout />
                </ProtectedRoute>
            }>
                {/* Nested Routes managed by ChatLayout's Outlet */}
                <Route index element={<div className="hidden md:flex items-center justify-center h-full w-full text-gray-500">Select a chat to start messaging</div>} />
                <Route path=":id" element={<div className="h-full w-full"><ChatWindow /></div>} />
                <Route path="status" element={<div className="hidden md:flex items-center justify-center h-full w-full text-gray-500">View Status Updates</div>} />
                <Route path="calls" element={<div className="hidden md:flex items-center justify-center h-full w-full text-gray-500">View Call History</div>} />
                <Route path="groups" element={<div className="hidden md:flex items-center justify-center h-full w-full text-gray-500">Manage Groups</div>} />
            </Route>

            <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                    <AdminPanel />
                </ProtectedRoute>
            } />

            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default function App() {
    return (
        <VocaProvider>
            <SocketProvider>
                <Router>
                    <AppContent />
                    <Toaster position="top-center" theme="dark" />
                </Router>
            </SocketProvider>
        </VocaProvider>
    );
}
