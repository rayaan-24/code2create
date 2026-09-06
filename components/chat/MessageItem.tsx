'use client';

import React, { useState, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { ProcedureCard } from './ProcedureCard';
import { LocationCard } from './LocationCard';
import { PersonCard } from './PersonCard';
import { ServiceCard } from './ServiceCard';
import { SourceCard } from './SourceCard';
import { NavigationActionCard } from './NavigationActionCard';
import { ExternalSourceCard } from './ExternalSourceCard';
import { formatDate } from '@/lib/utils';
import { Bot, User as UserIcon, Copy, Volume2, VolumeX, Check, Globe } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { voiceApi } from '@/lib/api/voice';

export interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
      return;
    }

    setSpeaking(true);

    // 1. Try ElevenLabs voice API
    try {
      const audioBlob = await voiceApi.synthesizeSpeech(message.content);
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          fallbackSpeechSynthesis();
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    // 2. Fallback to Web Speech API
    fallbackSpeechSynthesis();
  };

  const fallbackSpeechSynthesis = () => {
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
        className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all ${
          isUser
            ? 'bg-[#111111] border-[#222222] text-white shadow-xs'
            : 'bg-gradient-to-br from-[#EB4D6E] to-[#B82346] border-rose-300 text-white shadow-[0_4px_14px_rgba(235,77,110,0.35)]'
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Message Content Body */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-[#5C4B52] font-semibold">
          <span className="font-extrabold text-[#111111]">{isUser ? 'You' : 'NEXORA'}</span>
          <span>•</span>
          <span>{formatDate(message.timestamp)}</span>
          {message.isExternal && (
            <span className="text-[10px] text-[#B82346] font-bold flex items-center gap-1 ml-1 bg-[#FFE2E8] px-2 py-0.5 rounded-md border border-[#EB4D6E]/30">
              <Globe className="w-3 h-3" />
              External Web
            </span>
          )}
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-[#EB4D6E] to-[#D43154] text-white rounded-tr-none shadow-[0_4px_16px_rgba(235,77,110,0.25)] border border-[#B82346]'
              : 'bg-white rounded-tl-none border-2 border-[rgba(160,50,85,0.22)] text-[#111111] shadow-xs'
          }`}
        >
          <p className="whitespace-pre-wrap font-normal text-[#111111]">{message.content}</p>

          {/* Structured Data Components */}
          {message.structuredData && (
            <div className="mt-3 space-y-2.5">
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
              {(message.structuredData.type === 'navigation' || message.structuredData.navigationRoute) && (
                <NavigationActionCard
                  route={message.structuredData.navigationRoute || (message.structuredData as any)}
                />
              )}
            </div>
          )}

          {/* External Web Search Results */}
          {message.externalSources && message.externalSources.length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-[rgba(160,50,85,0.2)] space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-[#B82346] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#EB4D6E]" />
                Information from the Web (SerpAPI Verified)
              </span>
              <div className="space-y-2">
                {message.externalSources.map((ext, idx) => (
                  <ExternalSourceCard key={idx} source={ext} />
                ))}
              </div>
            </div>
          )}

          {/* Verified Community Citation Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-[rgba(160,50,85,0.2)] space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-[#111111]">
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
          <div className="flex items-center gap-1.5 mt-2 px-1">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-[#111111] hover:text-[#000000] hover:bg-[#FFE2E8] font-bold text-xs px-2.5 py-1 h-7 border border-[rgba(160,50,85,0.2)]"
              aria-label="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1 text-[#EB4D6E]" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </GlassButton>

            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleSpeak}
              className={`text-xs px-2.5 py-1 h-7 font-bold border transition-all ${
                speaking
                  ? 'text-[#B82346] bg-[#FFE2E8] border-[#EB4D6E]'
                  : 'text-[#111111] hover:text-[#000000] hover:bg-[#FFE2E8] border-[rgba(160,50,85,0.2)]'
              }`}
              aria-label="Speak response"
            >
              {speaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 mr-1 text-[#B82346] animate-pulse" />
                  <span>Stop Speaking</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-[#EB4D6E]" />
                  <span>Listen (ElevenLabs)</span>
                </>
              )}
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
};
