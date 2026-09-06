'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/lib/types';
import { ProcedureCard } from './ProcedureCard';
import { LocationCard } from './LocationCard';
import { PersonCard } from './PersonCard';
import { ServiceCard } from './ServiceCard';
import { SourceCard } from './SourceCard';
import { formatDate } from '@/lib/utils';
import { Bot, User as UserIcon, Copy, Volume2, Check } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';

export interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    setSpeaking(true);
    // In Phase 2: Connect to ElevenLabs TTS API
    // Web Speech API fallback for prototype demonstration
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setSpeaking(false), 2000);
    }
  };

  return (
    <div className={`flex gap-3.5 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
          isUser
            ? 'bg-sky-500/20 border-sky-400/30 text-sky-300'
            : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content Body */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">{isUser ? 'You' : 'NEXORA'}</span>
          <span>•</span>
          <span>{formatDate(message.timestamp)}</span>
        </div>

        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-sky-600/80 to-indigo-600/80 text-white rounded-tr-none shadow-[0_4px_20px_rgba(56,189,248,0.2)] border border-sky-400/30'
              : 'glass-panel rounded-tl-none border-white/10 text-slate-200 shadow-lg'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Structured Data Components */}
          {message.structuredData && (
            <div className="mt-2">
              {message.structuredData.type === 'procedure' && message.structuredData.procedure && (
                <ProcedureCard procedure={message.structuredData.procedure} />
              )}
              {message.structuredData.type === 'location' && message.structuredData.location && (
                <LocationCard location={message.structuredData.location} />
              )}
              {message.structuredData.person && (
                <PersonCard person={message.structuredData.person} />
              )}
              {message.structuredData.service && (
                <ServiceCard service={message.structuredData.service} />
              )}
            </div>
          )}

          {/* Citation Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Verified Community Sources
              </span>
              {message.sources.map((src) => (
                <SourceCard key={src.id} source={src} />
              ))}
            </div>
          )}
        </div>

        {/* Message Actions (For AI Responses) */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5 px-1">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 h-7"
              aria-label="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </GlassButton>

            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleSpeak}
              className={`text-xs px-2 py-1 h-7 ${speaking ? 'text-sky-400' : 'text-slate-400 hover:text-white'}`}
              aria-label="Speak response"
            >
              <Volume2 className={`w-3.5 h-3.5 mr-1 ${speaking ? 'animate-pulse text-sky-400' : ''}`} />
              <span>{speaking ? 'Speaking...' : 'Listen'}</span>
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
};
