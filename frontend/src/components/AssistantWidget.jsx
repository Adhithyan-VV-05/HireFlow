import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import api from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import VoiceInputButton from './ui/VoiceInputButton';
import VoiceConvertingIndicator from './ui/VoiceConvertingIndicator';

export default function AssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Voice recognition hook
    const {
        isListening,
        isConverting,
        isSpeaking,
        interimText,
        audioLevel,
        isSupported: voiceSupported,
        recognitionEngine,
        toggleListening,
        stopListening,
        resetTranscript
    } = useVoiceInput({
        onTranscriptChange: (text) => setMessage(text)
    });

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

        if (isListening) stopListening();
        const userMsg = message.trim();
        setMessage('');
        resetTranscript('');
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="online-status">Online</span>
                            {recognitionEngine !== 'none' && (
                                <span style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }} title={`Voice Engine: ${recognitionEngine}`}>
                                    🎙️ {recognitionEngine === 'webkitSpeechRecognition' ? 'Webkit Voice' : 'Speech Engine'}
                                </span>
                            )}
                        </div>
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

                    {/* Voice Converting Loading Animation */}
                    <div style={{ padding: '0 0.75rem' }}>
                        <VoiceConvertingIndicator
                            isListening={isListening}
                            isConverting={isConverting}
                            isSpeaking={isSpeaking}
                            audioLevel={audioLevel}
                            interimText={interimText}
                            targetLabel="Chat Input"
                            compact={true}
                        />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="assistant-input-form">
                        <input
                            type="text"
                            placeholder={isListening ? "Listening... Speak now..." : "Type or speak message..."}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                resetTranscript(e.target.value);
                            }}
                            disabled={isLoading}
                        />
                        <VoiceInputButton
                            isListening={isListening}
                            audioLevel={audioLevel}
                            isSupported={voiceSupported}
                            onClick={() => toggleListening(message)}
                            disabled={isLoading}
                            size="sm"
                            title={isListening ? "Stop listening" : "Click to speak"}
                        />
                        <button type="submit" disabled={!message.trim() || isLoading} title="Send message">
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
