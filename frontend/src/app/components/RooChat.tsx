"use client";
import { API_URL, apiFetch } from "@/lib/api";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RooPosition, useRoo } from '@/context/RooContext';
import { usePathname } from 'next/navigation';
import { Send, X, Loader2 } from 'lucide-react';

interface RooChatProps {
  position: RooPosition;
  rooWidth: number;
  rooHeight: number;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function RooChat({ position, rooWidth, rooHeight, onClose }: RooChatProps) {
  const pathname = usePathname();
  const { setAnimation } = useRoo();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "g'day! i'm roo, your market guide. ask me anything about what you see on this page!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  /* chat bubble dimensions */
  const chatWidth = Math.min(320, window.innerWidth - 40);
  const chatHeight = Math.min(400, window.innerHeight - 160);
  const padding = 16;

  /* calculate position, prefer side */
  let chatX = position.x + rooWidth + padding;
  let chatY = position.y - chatHeight / 2 + rooHeight / 2;

  /* adjust if off screen */
  if (chatX + chatWidth > window.innerWidth - 20) {
    chatX = position.x - chatWidth - padding;
  }
  if (chatX < 20) {
    chatX = 20;
  }
  if (chatY < 80) {
    chatY = 80;
  }
  if (chatY + chatHeight > window.innerHeight - 60) {
    chatY = window.innerHeight - chatHeight - 60;
  }

  // focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // scroll to bottom upon new messages 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setAnimation('thinking');

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await apiFetch(`${API_URL}/ai/roo-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          page: pathname,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('failed to get response');
      }

      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "hmm, i couldn't quite get that. try asking again!" }]);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "oops! i'm having trouble connecting to my brain. make sure the backend is running!" 
        }]);
      }
    } finally {
      setIsLoading(false);
      setAnimation('idle-right');
    }
  };

  return (
    <motion.div
      ref={chatRef}
      className="roo-chat"
      style={{
        position: 'fixed',
        left: chatX,
        top: chatY,
        width: chatWidth,
        height: chatHeight,
        zIndex: 46,
      }}
      initial={{ opacity: 0, scale: 0.9, x: position.x > chatX ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: position.x > chatX ? 20 : -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* header */}
      <div className="roo-chat-header">
        <span className="roo-chat-title">chat with roo</span>
        <button 
          className="roo-chat-close"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* messages */}
      <div className="roo-chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`roo-chat-message ${msg.role === 'user' ? 'roo-chat-message-user' : 'roo-chat-message-assistant'}`}
          >
            <p>{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="roo-chat-message roo-chat-message-assistant">
            <Loader2 size={16} className="animate-spin" />
            <span className="ml-2">thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <form className="roo-chat-input-container" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="roo-chat-input"
          placeholder="ask roo anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="roo-chat-send"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </motion.div>
  );
}
