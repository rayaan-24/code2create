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
import { useMobileMenu } from '@/components/layout/AppShell';
import { Menu } from 'lucide-react';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt');
  const { openMobileMenu } = useMobileMenu();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('conv_1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Default sidebar open only on desktop
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    scrollToBottom(true);
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
    if (!text || !text.trim() || isAiThinking) {
      console.warn('[Chat Page] Submission ignored: request pending or prompt empty.');
      return;
    }

    const sanitizedText = text.trim();
    console.log('[Chat Page] Sending chat prompt:', sanitizedText);

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: activeConvId,
      role: 'user',
      content: sanitizedText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);
    setError(null);

    // Safety timeout: terminates loading indicator after 62 seconds if network stalls
    const safetyTimer = setTimeout(() => {
      setIsAiThinking((prev) => {
        if (prev) {
          setError('The request timed out (60s limit). Please check server connection or try again.');
          return false;
        }
        return false;
      });
    }, 62000);

    try {
      const res = await chatApi.sendMessage(activeConvId, sanitizedText);
      clearTimeout(safetyTimer);
      if (res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setError(null);
      } else if (res.error) {
        setError(res.error);
        const errMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          conversationId: activeConvId,
          role: 'assistant',
          content: `⚠️ ${res.error}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      clearTimeout(safetyTimer);
      const msg = err?.message || 'Unable to receive response from NEXORA.';
      setError(msg);
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        conversationId: activeConvId,
        role: 'assistant',
        content: `⚠️ ${msg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      clearTimeout(safetyTimer);
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(convSearch.toLowerCase())
  );

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#FFF8FA] text-[#171717] relative">
      {/* Mobile Backdrop for Chat History Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat History Sidebar (Slide-over on mobile, inline panel on desktop) */}
      <div
        className={`${
          sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'
        } fixed lg:static inset-y-0 left-0 z-40 lg:z-auto flex-shrink-0 transition-all duration-300 ease-in-out border-r-2 border-[rgba(160,50,85,0.18)] bg-white/95 lg:bg-white/80 backdrop-blur-xl overflow-hidden flex flex-col h-full shadow-2xl lg:shadow-none`}
      >
        <div className="p-4 border-b border-[rgba(160,50,85,0.14)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#EB4D6E]" />
              <h2 className="text-sm font-black text-[#111111]">Conversations</h2>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleCreateNewChat}
              className="text-xs px-2.5 py-1 h-8 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </GlassButton>
          </div>

          {/* Search conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C4B52]" />
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[rgba(160,50,85,0.24)] placeholder:text-[#5C4B52] text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/20"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          {filteredConversations.length === 0 ? (
            <p className="text-center py-8 text-xs text-[#5C4B52] font-semibold">No conversations found.</p>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full p-3 rounded-xl text-left transition-all text-xs cursor-pointer ${
                    isActive
                      ? 'bg-[#FFE2E8] border-2 border-[#EB4D6E] text-[#B82346] font-bold shadow-xs'
                      : 'hover:bg-[#FFF0F4] text-[#111111] border border-transparent font-medium'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold truncate max-w-[170px] text-[#111111]">
                      {conv.title}
                    </span>
                    <span className="text-[10px] text-[#5C4B52] font-bold">{formatDate(conv.updatedAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#2D2226] font-medium truncate">{conv.lastMessage}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#FFF8FA] relative overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 px-3 sm:px-4 bg-white/90 backdrop-blur-xl border-b border-[rgba(160,50,85,0.18)] flex items-center justify-between z-10 flex-shrink-0 select-none shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Global App Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={openMobileMenu}
              className="lg:hidden p-2 rounded-xl text-[#5C4B52] hover:text-[#111111] hover:bg-[#FFE2E8] transition-colors cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#EB4D6E]" />
            </button>

            {/* Chat History Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-xl text-[#3D2D33] hover:text-[#000000] hover:bg-[#FFE2E8] transition-colors cursor-pointer shrink-0"
              title={sidebarOpen ? 'Collapse history' : 'Expand history'}
              aria-label={sidebarOpen ? 'Collapse history' : 'Expand history'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-[#111111] truncate max-w-[150px] sm:max-w-md">
                {activeConversation?.title || 'Community AI Assistant'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-[#B82346] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EB4D6E] animate-pulse shrink-0" />
                <span className="truncate">Verified Grounding</span>
              </div>
            </div>
          </div>

          <GlassBadge variant="primary" size="sm" className="hidden sm:inline-flex shrink-0">
            <Bot className="w-3 h-3 text-[#B82346]" />
            <span>NEXORA AI</span>
          </GlassBadge>
        </div>

        {/* Messages Feed Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
        >
          {error && <ErrorBanner message={error} />}

          {isLoadingMessages ? (
            <div className="max-w-xl mx-auto py-8">
              <LoadingSkeleton count={4} />
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#EB4D6E] to-[#D43154] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(212,49,84,0.35)]">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  Tell me what you need.
                </h3>
                <p className="text-xs sm:text-sm text-[#2D2226] font-medium max-w-md mx-auto">
                  Ask about campus procedures, office hours, classroom locations, or navigation routes.
                </p>
              </div>

              {/* Suggested Prompt Pills */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  'I lost my student ID card. What should I do?',
                  'Where is the Student Services Center?',
                  'Find faculty in the Computer Science department',
                  'What documents are needed for an Indian passport?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs font-semibold px-4 py-2.5 rounded-full bg-white border-2 border-[rgba(160,50,85,0.22)] text-[#111111] hover:border-[#EB4D6E] hover:bg-[#FFE2E8] transition-all cursor-pointer shadow-2xs hover:shadow-xs text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}

              {/* AI Thinking Indicator */}
              {isAiThinking && (
                <div className="flex gap-3 my-4">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE2E8] border border-[#EB4D6E]/40 text-[#B82346] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-[rgba(160,50,85,0.2)] text-xs text-[#111111] font-semibold flex items-center gap-2 shadow-xs">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EB4D6E] animate-ping" />
                    <span>NEXORA is synthesizing verified community guidelines...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Chat Input Form */}
        <div className="flex-shrink-0 pt-2 pb-3 bg-[#FFF8FA] border-t border-[rgba(160,50,85,0.12)]">
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
