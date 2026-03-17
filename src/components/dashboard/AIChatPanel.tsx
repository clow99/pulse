'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

export function AIChatPanel({ siteId }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

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
          siteId,
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
  }, [messages, isStreaming, siteId]);

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

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="pulse-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI chat"
      >
        {isOpen ? '\u2715' : '\u2728'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="pulse-chat-panel"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="pulse-chat-header">
              <div className="pulse-chat-header-icon">
                <span>&#10024;</span>
              </div>
              <span className="pulse-chat-header-title">Pulse AI Assistant</span>
              <button
                type="button"
                className="pulse-chat-close"
                onClick={() => setIsOpen(false)}
              >
                {'\u2715'}
              </button>
            </div>

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
                    {msg.content || (
                      <span className="pulse-chat-typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
