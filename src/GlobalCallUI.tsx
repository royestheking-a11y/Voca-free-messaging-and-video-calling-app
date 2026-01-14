import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoca } from './components/voca/VocaContext';
import { CallInterface } from './components/voca/chat/CallInterface';

export const GlobalCallUI = () => {
    const { activeCall, endCall, chats, createChat, setActiveChatId, currentUser } = useVoca();
    const navigate = useNavigate();

    const [isMinimized, setIsMinimized] = React.useState(false);

    console.log('🌐 GlobalCallUI Render:', { hasActiveCall: !!activeCall, isMinimized });

    // Handle call minimize - navigate to chat with call participant
    const handleMinimize = async () => {
        console.log('📉 GlobalCallUI: handleMinimize called');
        if (!activeCall?.participant) {
            console.error('❌ GlobalCallUI: No participant for minimize');
            return;
        }

        setIsMinimized(true);
        console.log('✅ GlobalCallUI: isMinimized set to true');

        // Find existing chat with this participant
        const existingChat = chats.find(
            (c) => !c.isGroup && c.participants.some((p) => p.id === activeCall.participant!.id)
        );

        let chatId = existingChat?.id;

        // If no chat exists, create one
        if (!chatId) {
            console.log('📝 GlobalCallUI: Creating new chat for minimize');
            const newChat = await createChat(activeCall.participant.id);
            chatId = newChat?.id;
        }

        if (chatId) {
            console.log('🚀 GlobalCallUI: Navigating to chat', chatId);
            setActiveChatId(chatId);
            navigate(`/chat/${chatId}`);
        } else {
            console.error('❌ GlobalCallUI: Failed to find/create chat');
        }
    };

    const handleMaximize = () => {
        console.log('🔍 GlobalCallUI: handleMaximize called');
        setIsMinimized(false);
    };

    if (!activeCall || !currentUser) return null;

    return (
        <CallInterface
            participant={activeCall.participant!}
            type={activeCall.type}
            onEnd={endCall}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            isMinimized={isMinimized}
            isIncoming={activeCall.isIncoming}
            offer={activeCall.offer}
            participantId={activeCall.participant!.id}
        />
    );
};
