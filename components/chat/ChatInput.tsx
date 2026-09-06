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
  const [showAttachToast, setShowAttachToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleRecording = () => {
    // In Phase 2: Connect to ElevenLabs/WebSpeech audio streamer
    if (!isRecording) {
      setIsRecording(true);
      // Auto-simulate sample voice speech input for demo
      setTimeout(() => {
        setInput('Where can I get my transcript signed by the registrar?');
        setIsRecording(false);
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  const handleAttachment = () => {
    setShowAttachToast(true);
    setTimeout(() => setShowAttachToast(false), 2500);
  };

  const suggestionChips = [
    'Lost ID Card procedure',
    'Where is the Quantum Lab?',
    'Campus Clinic timings',
    'Transcript verification',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Attachment feedback indicator */}
      {showAttachToast && (
        <div className="mb-2 p-2 text-xs text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded-lg text-center backdrop-blur-md">
          Document parsing & multimodal file upload will be enabled in Phase 2.
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <span className="text-slate-400 flex-shrink-0 text-[11px] font-medium">Quick Prompts:</span>
        {suggestionChips.map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="flex-shrink-0 px-3 py-1 rounded-full bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-sky-400/30 transition-all text-xs"
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
          className="p-2.5 text-slate-400 hover:text-sky-300 transition-colors rounded-xl hover:bg-white/5"
          title="Attach document / photo"
          aria-label="Attach document"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening to your voice...' : 'Ask NEXORA anything about your community...'}
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
                : 'text-slate-400 hover:text-sky-300 hover:bg-white/5'
            }`}
            title={isRecording ? 'Stop Recording' : 'Voice Input (ElevenLabs ready)'}
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
