'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPanelProps {
  siteId: string;
}

const SUGGESTED_PROMPTS = [
  'Summarize my traffic this month',
  'What are my top referrers?',
  'Which pages need attention?',
];

const MOBILE_BREAKPOINT = 1200;
const DEFAULT_PANEL_WIDTH = 380;
const DEFAULT_PANEL_HEIGHT = 620;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 720;
const MIN_PANEL_HEIGHT = 360;
const MAX_PANEL_HEIGHT = 900;

export function AIChatPanel({ siteId }: AIChatPanelProps) {
  const searchParams = useSearchParams();
  const selectedSiteId = searchParams.get('siteId') || siteId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [panelSize, setPanelSize] = useState({
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const clampPanelSize = useCallback((width: number, height: number) => {
    if (typeof window === 'undefined') {
      return { width, height };
    }

    const maxWidth = Math.max(280, Math.min(MAX_PANEL_WIDTH, window.innerWidth - 32));
    const maxHeight = Math.max(280, Math.min(MAX_PANEL_HEIGHT, window.innerHeight - 32));
    const minWidth = Math.min(MIN_PANEL_WIDTH, maxWidth);
    const minHeight = Math.min(MIN_PANEL_HEIGHT, maxHeight);

    return {
      width: Math.max(minWidth, Math.min(width, maxWidth)),
      height: Math.max(minHeight, Math.min(height, maxHeight)),
    };
  }, []);

  useEffect(() => {
    const updateViewportState = () => {
      const desktop = window.innerWidth > MOBILE_BREAKPOINT;
      setIsDesktop(desktop);
      setPanelSize((current) => clampPanelSize(current.width, current.height));
    };

    updateViewportState();
    window.addEventListener('resize', updateViewportState);

    return () => {
      window.removeEventListener('resize', updateViewportState);
    };
  }, [clampPanelSize]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    setMessages([]);
  }, [selectedSiteId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming || !selectedSiteId) return;

    const userMessage: ChatMessage = { role: 'user', content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          siteId: selectedSiteId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: err.error || 'Something went wrong.' },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to connect. Please try again.' },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, selectedSiteId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggleMinimized = () => {
    setIsMinimized((prev) => !prev);
  };

  const startResize = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDesktop || isMinimized) return;

    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panelSize.width;
    const startHeight = panelSize.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + (startX - moveEvent.clientX);
      const nextHeight = startHeight + (startY - moveEvent.clientY);
      setPanelSize(clampPanelSize(nextWidth, nextHeight));
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clampPanelSize, isDesktop, isMinimized, panelSize.height, panelSize.width]);

  const renderMessageContent = (message: ChatMessage) => {
    if (!message.content) {
      return (
        <span className="pulse-chat-typing">
          <span />
          <span />
          <span />
        </span>
      );
    }

    if (message.role === 'user') {
      return <p className="pulse-chat-plain-text">{message.content}</p>;
    }

    return (
      <div className="pulse-chat-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="pulse-chat-toggle"
          onClick={openChat}
          aria-label="Open AI chat"
        >
          <span className="pulse-chat-toggle-icon">&#10024;</span>
          <span className="pulse-chat-toggle-label">Open Pulse AI</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`pulse-chat-panel${isMinimized ? ' pulse-chat-panel--minimized' : ''}`}
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={isDesktop ? {
              width: `${panelSize.width}px`,
              height: isMinimized ? 'auto' : `${panelSize.height}px`,
            } : undefined}
          >
            {isDesktop && !isMinimized && (
              <button
                type="button"
                className="pulse-chat-resize-handle"
                onMouseDown={startResize}
                aria-label="Resize AI chat"
              />
            )}

            {/* Header */}
            <div className="pulse-chat-header">
              <div className="pulse-chat-header-icon">
                <span>&#10024;</span>
              </div>
              <span className="pulse-chat-header-title">Pulse AI Assistant</span>
              <div className="pulse-chat-header-actions">
                <button
                  type="button"
                  className="pulse-chat-header-btn"
                  onClick={toggleMinimized}
                  aria-label={isMinimized ? 'Expand AI chat' : 'Minimize AI chat'}
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="pulse-chat-header-btn"
                  onClick={closeChat}
                  aria-label="Close AI chat"
                  title="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="pulse-chat-messages">
                  {messages.length === 0 && (
                    <div className="pulse-chat-welcome">
                      <div className="pulse-chat-welcome-icon">&#10024;</div>
                      <p className="pulse-chat-welcome-title">
                        What can I help you with?
                      </p>
                      <div className="pulse-chat-prompts">
                        {SUGGESTED_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="pulse-chat-prompt-btn"
                            onClick={() => sendMessage(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`pulse-chat-bubble pulse-chat-bubble--${msg.role}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="pulse-chat-bubble-avatar">P</div>
                      )}
                      <div className="pulse-chat-bubble-content">
                        {renderMessageContent(msg)}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form className="pulse-chat-input-area" onSubmit={handleSubmit}>
                  <textarea
                    ref={inputRef}
                    className="pulse-chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    disabled={isStreaming}
                  />
                  <button
                    type="submit"
                    className="pulse-chat-send"
                    disabled={!input.trim() || isStreaming}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
