import React from 'react';

export default function ChatBubble({ role, content }) {
    // Remove [SCORE:X] tags from displayed content
    const displayContent = content.replace(/\[SCORE:\d+\]/g, '').trim();

    return (
        <div className={`chat-bubble ${role}`}>
            {displayContent}
        </div>
    );
}
