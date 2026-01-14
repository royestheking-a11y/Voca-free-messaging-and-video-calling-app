import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoca } from './components/voca/VocaContext';
import { CallInterface } from './components/voca/chat/CallInterface';

export const GlobalCallUI = () => {
    const { activeCall, endCall, chats, createChat, setActiveChatId, currentUser } = useVoca();
    const navigate = useNavigate();

    // Handle call minimize - navigate to chat with call participant
    const handleMinimize = async () => {
        if (!activeCall?.participant) return;

        // Find existing chat with this participant
        const existingChat = chats.find(
            (c) => !c.isGroup && c.participants.some((p) => p.id === activeCall.participant!.id)
        );

        let chatId = existingChat?.id;

        // If no chat exists, create one
        if (!chatId) {
            await createChat(activeCall.participant.id);
            // Find the newly created chat
            const newChat = chats.find(
                (c) => !c.isGroup && c.participants.some((p) => p.id === activeCall.participant!.id)
            );
            chatId = newChat?.id;
        }

        if (chatId) {
            setActiveChatId(chatId);
            navigate(`/chat/${chatId}`);
        }
    };

    if (!activeCall || !currentUser) return null;

    return (
        <CallInterface
            participant={activeCall.participant!}
            type={activeCall.type}
            onEnd={endCall}
            onMinimize={handleMinimize}
            isIncoming={activeCall.isIncoming}
            offer={activeCall.offer}
            participantId={activeCall.participant!.id}
        />
    );
};
