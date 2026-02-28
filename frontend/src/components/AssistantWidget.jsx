import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import api from '../api/client';

export default function AssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [history, isOpen, isMinimized]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;

        const userMsg = message.trim();
        setMessage('');
        setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await api.assistantChat({ message: userMsg, history: history });
            setHistory(prev => [...prev, { role: 'assistant', content: res.response }]);
        } catch (err) {
            console.error('[Assistant] Chat error:', err);
            setHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="assistant-fab"
                title="Open HireFlow AI Assistant"
            >
                <Bot size={28} />
                <span className="pulse-ring" />
            </button>
        );
    }

    return (
        <div className={`assistant-window ${isMinimized ? 'minimized' : ''}`}>
            {/* Header */}
            <div className="assistant-header">
                <div className="header-info">
                    <Bot size={20} className="header-icon" />
                    <div>
                        <h3>HireFlow AI</h3>
                        <span className="online-status">Online</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="icon-btn">
                        {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="icon-btn">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="assistant-messages">
                        {history.length === 0 && (
                            <div className="welcome-msg">
                                <Bot size={40} className="bot-welcome-icon" />
                                <p>Hi! I'm your HireFlow assistant. Ask me anything about candidates, resumes, or the hiring process.</p>
                            </div>
                        )}
                        {history.map((msg, i) => (
                            <div key={i} className={`msg-bubble ${msg.role}`}>
                                <div className="bubble-icon">
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className="bubble-content">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="msg-bubble assistant">
                                <div className="bubble-icon"><Bot size={14} /></div>
                                <div className="bubble-content">
                                    <span className="loading-dots">Typing</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="assistant-input-form">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!message.trim() || isLoading}>
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
