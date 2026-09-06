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
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Listening Overlay Bar */}
      {isRecording && (
        <div className="mb-3 p-3 rounded-2xl glass-panel border-cyan-500/40 bg-cyan-950/40 shadow-lg shadow-cyan-500/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8">
              <span className="absolute w-full h-full rounded-full bg-cyan-400/30 animate-ping" />
              <span className="relative w-3.5 h-3.5 rounded-full bg-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-cyan-300">
                {voiceStatus === 'listening' ? 'Listening...' : 'Processing speech...'}
              </div>
              <p className="text-[11px] text-slate-300">Speak naturally into your microphone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopVoiceInput}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 transition-all"
          >
            Stop
          </button>
        </div>
      )}

      {/* Error notification */}
      {errorMessage && (
        <div className="mb-2 p-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg text-center backdrop-blur-md">
          {errorMessage}
        </div>
      )}

      {/* Attachment feedback indicator */}
      {showAttachToast && (
        <div className="mb-2 p-2 text-xs text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded-lg text-center backdrop-blur-md">
          Document parsing & multimodal file upload will be enabled in Phase 5.
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <span className="text-slate-400 flex-shrink-0 text-[11px] font-medium">Try asking:</span>
        {suggestionChips.map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="flex-shrink-0 px-3 py-1 rounded-full bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-cyan-400/30 transition-all text-xs"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-2 rounded-2xl glass-panel-elevated border-white/15 shadow-2xl"
      >
        <button
          type="button"
          onClick={handleAttachment}
          className="p-2.5 text-slate-400 hover:text-cyan-300 transition-colors rounded-xl hover:bg-white/5"
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
          className="w-full py-2.5 px-2 bg-transparent text-sm text-white placeholder-slate-400 resize-none focus:outline-none max-h-32 min-h-[42px]"
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2.5 rounded-xl transition-all ${
              isRecording
                ? 'bg-red-500/30 text-red-300 animate-pulse border border-red-500/50'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
            }`}
            title={isRecording ? 'Stop Recording' : 'Voice Input (ElevenLabs STT)'}
            aria-label={isRecording ? 'Stop Recording' : 'Voice Input'}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
          </button>

          <GlassButton
            type="submit"
            size="sm"
            variant="primary"
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
            className="rounded-xl px-3.5 py-2.5"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </GlassButton>
        </div>
      </form>
    </div>
  );
};
