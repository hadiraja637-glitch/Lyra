import { GoogleGenAI } from '@google/genai';

export class LiveAudioClient {
  private ai: GoogleGenAI;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  }

  async connect(
    settings: { userName?: string; preferredLanguage?: string; voice?: string; interests?: string },
    memories: Array<{ content: string; category?: string }>,
    onAudioData: (base64Data: string) => void,
    onError: (err: any) => void
  ) {
    try {
      const tokenResponse = await fetch('/api/live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: settings.userName,
          preferredLang: settings.preferredLanguage,
          voice: settings.voice,
          interests: settings.interests,
          memories,
        }),
      });

      const tokenContentType = tokenResponse.headers.get('content-type') || '';
      const tokenRaw = await tokenResponse.text();
      let tokenData: any = {};
      
      if (tokenContentType.includes('application/json')) {
        try {
          tokenData = JSON.parse(tokenRaw);
        } catch {}
      }

      if (!tokenResponse.ok || !tokenData.token) {
        const detail = tokenData.error || (tokenRaw.startsWith('<') ? 'Vercel returned an HTML error page instead of JSON.' : 'Could not obtain a Gemini Live session token.');
        throw new Error(detail);
      }

      // Initialize audio context and mic stream safely
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.isConnected = true;
    } catch (err: any) {
      onError(err);
      this.disconnect();
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
