import React from 'react';
import { useVoca } from './components/voca/VocaContext';
import { CallInterface } from './components/voca/chat/CallInterface';

export const GlobalCallUI = () => {
    const { activeCall, endCall, currentUser } = useVoca();

    if (!activeCall || !currentUser) return null;

    return (
        <CallInterface
            participant={activeCall.participant!}
            type={activeCall.type}
            isIncoming={activeCall.isIncoming}
            offer={activeCall.offer}
            onEnd={endCall}
            participantId={activeCall.participant!.id}
        />
    );
};
