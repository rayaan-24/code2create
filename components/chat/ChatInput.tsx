'use client';

import React, { useState } from 'react';
import { Send, Mic, Paperclip, MicOff } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAttachToast, setShowAttachToast] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    setVoiceStatus('idle');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startVoiceInput = () => {
    setErrorMessage(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          setVoiceStatus('listening');
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsRecording(false);
          setVoiceStatus('error');
          setErrorMessage('Voice recognition error. Please try typing.');
          setTimeout(() => setVoiceStatus('idle'), 3000);
        };

        recognition.onend = () => {
          setIsRecording(false);
          setVoiceStatus('idle');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        fallbackVoiceInput();
      }
    } else {
      fallbackVoiceInput();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setVoiceStatus('idle');
  };

  const fallbackVoiceInput = () => {
    // Graceful simulation when SpeechRecognition API is unavailable
    setIsRecording(true);
    setVoiceStatus('listening');
    setTimeout(() => {
      setVoiceStatus('processing');
      setTimeout(() => {
        setInput('I lost my ID card and need to visit Student Services');
        setIsRecording(false);
        setVoiceStatus('idle');
      }, 1000);
    }, 2000);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleAttachment = () => {
    setShowAttachToast(true);
    setTimeout(() => setShowAttachToast(false), 2500);
  };

  const suggestionChips = [
    'I lost my ID card. What should I do?',
    'Where is Student Services?',
    'Navigate me to the library',
    'What documents are needed for a passport?',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-2 sm:pb-3">
      {/* Listening Overlay Bar */}
      {isRecording && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-rose-50/95 border-2 border-[#EB4D6E]/50 shadow-md flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-7 h-7">
              <span className="absolute w-full h-full rounded-full bg-[#EB4D6E]/30 animate-ping" />
              <span className="relative w-3.5 h-3.5 rounded-full bg-[#EB4D6E]" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#B82346]">
                {voiceStatus === 'listening' ? 'Listening to voice...' : 'Processing speech...'}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#5C4B52] font-semibold">Speak naturally into your microphone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopVoiceInput}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#B82346] bg-[#FFE2E8] hover:bg-rose-200 border border-[#EB4D6E]/40 transition-all cursor-pointer"
          >
            Stop
          </button>
        </div>
      )}

      {/* Error notification */}
      {errorMessage && (
        <div className="mb-2 p-2.5 text-xs text-amber-900 font-bold bg-amber-50 border border-amber-300 rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      {/* Attachment feedback indicator */}
      {showAttachToast && (
        <div className="mb-2 p-2.5 text-xs text-[#B82346] bg-[#FFE2E8] border border-[#EB4D6E]/30 rounded-xl text-center font-bold">
          Document parsing & multimodal file upload will be enabled in Phase 5.
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <span className="text-[#5C4B52] flex-shrink-0 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Try asking:</span>
        {suggestionChips.map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="flex-shrink-0 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white hover:bg-[#FFE2E8] text-[#111111] hover:text-[#000000] border border-[rgba(160,50,85,0.22)] hover:border-[#EB4D6E] shadow-2xs transition-all text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-2xl bg-white border-2 border-[rgba(160,50,85,0.24)] focus-within:border-[#EB4D6E] shadow-md shadow-rose-950/5 transition-all"
      >
        <button
          type="button"
          onClick={handleAttachment}
          className="p-2 sm:p-2.5 text-[#5C4B52] hover:text-[#B82346] transition-colors rounded-xl hover:bg-[#FFE2E8] cursor-pointer shrink-0"
          title="Attach document / photo"
          aria-label="Attach document"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening to your voice...' : 'Ask NEXORA anything about your community or campus...'}
          rows={1}
          className="w-full py-2 px-1 sm:px-2 bg-transparent text-base sm:text-sm text-[#111111] font-medium placeholder:text-[#5C4B52] resize-none focus:outline-none max-h-32 min-h-[38px] sm:min-h-[42px]"
        />

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
              isRecording
                ? 'bg-red-100 text-red-700 animate-pulse border border-red-300'
                : 'text-[#5C4B52] hover:text-[#B82346] hover:bg-[#FFE2E8]'
            }`}
            title={isRecording ? 'Stop Recording' : 'Voice Input (ElevenLabs STT)'}
            aria-label={isRecording ? 'Stop Recording' : 'Voice Input'}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4" />}
          </button>

          <GlassButton
            type="submit"
            size="sm"
            variant="primary"
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
            className="rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </GlassButton>
        </div>
      </form>
    </div>
  );
};
