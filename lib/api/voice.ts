import { getAuthToken } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const voiceApi = {
  /**
   * Synthesize text to speech using ElevenLabs backend endpoint.
   */
  async synthesizeSpeech(text: string, voiceId?: string): Promise<Blob | null> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/voice/speech`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, voice_id: voiceId }),
      });

      if (res.ok) {
        return await res.blob();
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Transcribe recorded audio payload into text.
   */
  async transcribeSpeech(audioBlob: Blob): Promise<string> {
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.text || '';
      }
      return '';
    } catch {
      return '';
    }
  },

  /**
   * Helper to play audio blob.
   */
  playAudioBlob(blob: Blob): HTMLAudioElement {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    return audio;
  },
};
