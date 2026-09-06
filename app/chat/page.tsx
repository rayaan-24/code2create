'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { MessageItem } from '@/components/chat/MessageItem';
import { ChatInput } from '@/components/chat/ChatInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import {
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { chatApi } from '@/lib/api/chat';
import { Conversation, ChatMessage } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('conv_1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await chatApi.getConversations();
        if (res.data) {
          setConversations(res.data);
          if (initialId) {
            setActiveConvId(initialId);
          } else if (res.data.length > 0) {
            setActiveConvId(res.data[0].id);
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load conversations');
      }
    };
    loadConversations();
  }, [initialId]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      setError(null);
      try {
        const res = await chatApi.getMessages(activeConvId);
        if (res.data) {
          setMessages(res.data);
        }
      } catch (err: any) {
        setError('Unable to load message history.');
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeConvId]);

  // Handle prompt param from URL
  useEffect(() => {
    if (initialPrompt && !isLoadingMessages && messages.length > 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: activeConvId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    try {
      const res = await chatApi.sendMessage(activeConvId, text);
      if (res.data) {
        setMessages((prev) => [...prev, res.data!]);
      }
    } catch (err) {
      setError('Unable to receive response from NEXORA.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleCreateNewChat = async () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      lastMessage: 'Ask anything about your community...',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tags: ['General'],
    };
    setConversations([newConv, ...conversations]);
    setActiveConvId(newConv.id);
    setMessages([]);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(convSearch.toLowerCase())
  );

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Chat History Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/10 glass-panel overflow-hidden flex flex-col h-full`}
      >
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">Conversations</h2>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleCreateNewChat}
              className="text-xs px-2.5 py-1 h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </GlassButton>
          </div>

          {/* Search conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">No conversations found.</p>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all text-xs ${
                    isActive
                      ? 'bg-sky-500/15 border border-sky-400/30 text-white shadow-sm'
                      : 'hover:bg-white/5 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold truncate max-w-[170px] text-white">
                      {conv.title}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatDate(conv.updatedAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{conv.lastMessage}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#06080d]/60 relative">
        {/* Chat Header */}
        <div className="h-14 px-4 glass-panel border-b border-white/10 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {activeConversation?.title || 'Community AI Assistant'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Knowledge Base Connected</span>
              </div>
            </div>
          </div>

          <GlassBadge variant="outline" size="sm" className="hidden sm:inline-flex">
            <Bot className="w-3 h-3 text-sky-400" />
            <span>NEXORA 1.0</span>
          </GlassBadge>
        </div>

        {/* Messages Feed Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {error && <ErrorBanner message={error} />}

          {isLoadingMessages ? (
            <div className="max-w-xl mx-auto py-8">
              <LoadingSkeleton count={4} />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="How can NEXORA assist you?"
              description="Ask any question about procedures, faculty, labs, classroom locations, or services. NEXORA reasons over verified community data."
              actionLabel="Try Sample Query"
              onAction={() => handleSendMessage('Where is the Quantum Information Lab?')}
            />
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}

              {/* AI Thinking Indicator */}
              {isAiThinking && (
                <div className="flex gap-3 my-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="glass-panel p-4 rounded-2xl rounded-tl-none border-white/10 text-xs text-slate-300 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>NEXORA is retrieving and reasoning over verified community data...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Chat Input Form */}
        <div className="flex-shrink-0 pt-2 bg-gradient-to-t from-[#06080d] via-[#06080d]/80 to-transparent">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isAiThinking} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppShell title="AI Assistant" hideNavbar>
      <Suspense fallback={<div className="p-8"><LoadingSkeleton count={3} /></div>}>
        <ChatContent />
      </Suspense>
    </AppShell>
  );
}
