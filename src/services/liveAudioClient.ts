import { CompanionState, UserSettings, MemoryItem } from '../types/companion';

export interface LiveAudioCallbacks {
  onStateChange: (state: CompanionState) => void;
  onTranscriptChunk: (text: string, sender: 'user' | 'lyra') => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onToolCall: (call: { id: string; name: string; args: any; memory?: any }) => void;
  onError: (error: string) => void;
  onInputVolume: (volume: number) => void;
  onOutputVolume: (volume: number) => void;
}

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private isMuted = false;
  private isConnected = false;
  private state: CompanionState = 'idle';

  private callbacks: LiveAudioCallbacks;
  private animFrameId: number | null = null;
  private outputVolumeTrackerId: number | null = null;

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): CompanionState {
    return this.state;
  }

  private setState(newState: CompanionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  /**
   * Connect to the Gemini Live session via WebSocket
   */
  public async connect(settings: UserSettings, memories: MemoryItem[] = []): Promise<void> {
    this.setState('connecting');

    try {
      // 1. Request microphone permission upfront
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      this.mediaStream = stream;

      // 2. Set up Input AudioContext (16kHz for Gemini input)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      await this.inputAudioCtx.resume();

      // 3. Set up Output AudioContext (24kHz for Gemini output)
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
      await this.outputAudioCtx.resume();

      // Set up Analysers
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;

      // 4. Connect microphone to processor
      const source = this.inputAudioCtx.createMediaStreamSource(stream);
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(this.inputAnalyser);
      this.inputAnalyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);

      // Handle mic audio processing
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume for audio visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onInputVolume(Math.min(1, rms * 5));

        // If user is speaking significantly and Lyra is speaking, local detection can trigger
        if (rms > 0.04 && this.state === 'speaking') {
          this.stopAllPlayback();
          this.setState('listening');
        } else if (rms > 0.02 && this.state === 'idle') {
          this.setState('listening');
        }

        // Convert Float32 to 16-bit PCM little-endian
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = this.pcmToBase64(pcm16);

        this.ws.send(
          JSON.stringify({
            type: 'audio',
            data: base64,
          })
        );
      };

      // 5. Connect WebSocket to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Client WS] Connected to live bridge, sending init');
        this.ws?.send(
          JSON.stringify({
            type: 'init',
            userName: settings.userName,
            preferredLang: settings.preferredLanguage,
            voice: settings.voice,
            interests: settings.interests,
            memories,
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            this.isConnected = true;
            this.setState('listening');
          } else if (msg.type === 'audio' && msg.audio) {
            this.handleIncomingAudioChunk(msg.audio);
          } else if (msg.type === 'text_chunk' && msg.text) {
            this.callbacks.onTranscriptChunk(msg.text, 'lyra');
          } else if (msg.type === 'interrupted') {
            console.log('[Client WS] Model interrupted');
            this.stopAllPlayback();
            this.setState('listening');
            this.callbacks.onInterrupted();
          } else if (msg.type === 'turn_complete') {
            this.callbacks.onTurnComplete();
            // Once all scheduled audio finishes, return to listening state
            this.checkTurnPlaybackFinished();
          } else if (msg.type === 'tool_call') {
            this.callbacks.onToolCall(msg.call);
          } else if (msg.type === 'error') {
            console.error('[Client WS] Received error:', msg.error);
            this.callbacks.onError(msg.error);
          }
        } catch (parseErr) {
          console.error('[Client WS] Parse error:', parseErr);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[Client WS] WebSocket error:', e);
        this.callbacks.onError('Connection to voice service encountered an error.');
        this.setState('error');
      };

      this.ws.onclose = () => {
        console.log('[Client WS] WebSocket closed');
        this.isConnected = false;
        if (this.state !== 'error') {
          this.setState('idle');
        }
      };

      this.startVisualizerLoops();
    } catch (err: any) {
      console.error('[Client WS] Failed to initialize audio/mic:', err);
      this.setState('error');
      let msg = 'Failed to access microphone. Please allow microphone permissions in your browser.';
      if (err.name === 'NotAllowedError') {
        msg = 'Microphone access was denied. Please allow microphone permissions in your browser bar.';
      }
      this.callbacks.onError(msg);
      throw err;
    }
  }

  /**
   * Handle incoming raw 24kHz PCM audio from Gemini Live
   */
  private handleIncomingAudioChunk(base64Audio: string) {
    if (!this.outputAudioCtx) return;

    if (this.state !== 'speaking') {
      this.setState('speaking');
    }

    try {
      const float32 = this.base64ToFloat32(base64Audio);
      if (float32.length === 0) return;

      const buffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;

      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
        this.outputAnalyser.connect(this.outputAudioCtx.destination);
      } else {
        source.connect(this.outputAudioCtx.destination);
      }

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.state === 'speaking') {
          this.setState('listening');
        }
      };
    } catch (err) {
      console.error('Error scheduling audio chunk:', err);
    }
  }

  private checkTurnPlaybackFinished() {
    if (this.activeSources.length === 0) {
      this.setState('listening');
    }
  }

  /**
   * Immediately stops all currently playing audio chunks (for interruptions)
   */
  public stopAllPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  /**
   * Send a text message to the live session
   */
  public sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.setState('thinking');
    this.ws.send(
      JSON.stringify({
        type: 'text',
        text,
      })
    );
  }

  /**
   * Toggle mute state
   */
  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.setState('muted');
    } else {
      this.setState(this.isConnected ? 'listening' : 'idle');
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Visualizer frequency loop
   */
  private startVisualizerLoops() {
    const updateLevels = () => {
      if (this.outputAnalyser && this.state === 'speaking') {
        const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(dataArray as any);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        this.callbacks.onOutputVolume(Math.min(1, avg * 2));
      } else {
        this.callbacks.onOutputVolume(0);
      }

      this.animFrameId = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }

  /**
   * Disconnect and clean up all audio context resources
   */
  public disconnect() {
    this.isConnected = false;
    this.stopAllPlayback();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.setState('idle');
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  // --- Helper Conversion Utilities ---

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private pcmToBase64(pcm16: Int16Array): string {
    const buffer = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }
}
