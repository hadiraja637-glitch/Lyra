import { GoogleGenAI } from '@google/genai';

export class LiveAudioClient {
  private ai: GoogleGenAI;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  }

  async connect(onAudioData: (base64Data: string) => void, onError: (err: any) => void) {
    try {
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
