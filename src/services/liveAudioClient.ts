import { GoogleGenAI, Modality, Type } from '@google/genai';

type LyraState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'error';
type ToolCall = { id: string; name: string; args: any };
type ClientCallbacks = {
  onStateChange: (state: LyraState) => void;
  onTranscriptChunk: (text: string, sender: 'user' | 'lyra') => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onToolCall: (call: ToolCall) => void;
  onError: (message: string) => void;
  onInputVolume: (volume: number) => void;
  onOutputVolume: (volume: number) => void;
};

export class LiveAudioClient {
  private callbacks: ClientCallbacks;
  private session: any = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private isConnected = false;
  private isMuted = false;
  private state: LyraState = 'idle';
  private visualizerFrame: number | null = null;

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  private setState(state: LyraState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  async connect(settings: any, memories: Array<{ content: string; category?: string }> = []) {
    this.disconnect();
    this.setState('connecting');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not available in this browser. Open Lyra using HTTPS in a supported browser.');
      }

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
      const tokenRaw = await tokenResponse.text();
      let tokenData: any = {};
      try { tokenData = JSON.parse(tokenRaw); } catch {}
      if (!tokenResponse.ok || !tokenData.token) {
        const detail = tokenData.error || (tokenRaw.trim().startsWith('<')
          ? 'Lyra could not reach its API service. Check the Vercel deployment and GEMINI_API_KEY setting.'
          : 'Lyra could not start a voice session. Please try again.');
        throw new Error(detail);
      }

      this.inputContext = new AudioContext();
      this.outputContext = new AudioContext();
      await Promise.all([this.inputContext.resume(), this.outputContext.resume()]);

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.inputAnalyser = this.inputContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.outputAnalyser = this.outputContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;

      const liveAI = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1beta' },
      });

      const toolDeclarations = [{
        functionDeclarations: [
          { name: 'saveMemory', description: 'Save an important user fact or preference when requested.', parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['content', 'category'] } },
          { name: 'forgetMemory', description: 'Forget a saved memory when requested.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
          { name: 'setFocusTimer', description: 'Start a focus timer in minutes.', parameters: { type: Type.OBJECT, properties: { minutes: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['minutes'] } },
          { name: 'addReminderOrTask', description: 'Add a reminder or task.', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, priority: { type: Type.STRING } }, required: ['title'] } },
          { name: 'saveStudyNote', description: 'Save a study note.', parameters: { type: Type.OBJECT, properties: { note: { type: Type.STRING }, topic: { type: Type.STRING } }, required: ['note'] } },
        ],
      }];

      const memoryText = memories.slice(0, 60).map((m) => '- [' + (m.category || 'preferences') + '] ' + m.content).join('\n');
      this.session = await liveAI.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: settings.voice || 'Kore' },
            },
          },
          systemInstruction:
            'You are Lyra, a warm, natural, intelligent AI companion. Match the user language, especially English, Pakistani Urdu and Roman Urdu. Be conversational, kind, honest and helpful. User name: ' +
            (settings.userName || 'not provided') +
            '. Preferred language: ' + (settings.preferredLanguage || 'auto') +
            '. Interests: ' + ((settings.interests || []).join(', ') || 'not specified') +
            '. Relevant memories:\n' + (memoryText || '- none') +
            '\nKeep spoken replies concise unless asked for detail.',
          tools: toolDeclarations,
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.startMicrophoneProcessing();
            this.startVisualizer();
            this.setState(this.isMuted ? 'muted' : 'listening');
          },
          onmessage: (message: any) => {
            const userTranscript = message.serverContent?.inputTranscription?.text;
            if (typeof userTranscript === 'string' && userTranscript.trim()) {
              this.callbacks.onTranscriptChunk(userTranscript, 'user');
            }
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) this.playAudioChunk(part.inlineData.data);
                if (part.text) this.callbacks.onTranscriptChunk(part.text, 'lyra');
              }
            }
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.callbacks.onInterrupted();
              this.setState(this.isMuted ? 'muted' : 'listening');
            }
            if (message.serverContent?.turnComplete) {
              this.callbacks.onTurnComplete();
              if (this.activeSources.length === 0 && !this.isMuted) this.setState('listening');
            }
            if (message.toolCall?.functionCalls) {
              const functionResponses: any[] = [];
              for (const call of message.toolCall.functionCalls) {
                this.callbacks.onToolCall({
                  id: call.id || '',
                  name: call.name || '',
                  args: call.args || {},
                });
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: { status: 'received', message: 'Action passed to Lyra.' },
                });
              }
              try {
                this.session?.sendToolResponse({ functionResponses });
              } catch (error) {
                console.warn('[Lyra] Could not return tool response:', error);
              }
            }
          },
          onerror: (event: any) => {
            const messageText = event?.message || 'Gemini Live encountered an error.';
            this.callbacks.onError(messageText);
            this.setState('error');
          },
          onclose: (event: any) => {
            this.isConnected = false;
            if (this.state !== 'error') this.setState('idle');
            if (event?.reason) console.info('[Lyra] Live session closed:', event.reason);
          },
        },
      });
    } catch (error: any) {
      const message = error?.message || 'Could not start Lyra. Please try again.';
      this.callbacks.onError(message);
      this.setState('error');
      this.disconnect(false);
      throw error;
    }
  }

  private startMicrophoneProcessing() {
    if (!this.inputContext || !this.mediaStream || !this.session) return;
    this.sourceNode = this.inputContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.inputContext.createScriptProcessor(4096, 1, 1);
    // Feed the processor directly from the microphone. Keep the analyser on a
    // separate branch so it cannot interrupt the audio path to Gemini.
    this.sourceNode.connect(this.processorNode);
    if (this.inputAnalyser) this.sourceNode.connect(this.inputAnalyser);
    this.processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      this.callbacks.onInputVolume(Math.min(1, Math.sqrt(sum / input.length) * 4));
      const output = event.outputBuffer.getChannelData(0);
      output.fill(0);
      if (this.isMuted || !this.isConnected || !this.session) return;
      // Gemini Live expects 16 kHz PCM. Do not assume the browser's actual
      // microphone sample rate matches the requested AudioContext rate.
      const samples16k = this.resampleToRate(input, event.inputBuffer.sampleRate, 16000);
      const pcm = new Int16Array(samples16k.length);
      for (let i = 0; i < samples16k.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples16k[i]));
        pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }
      let binary = '';
      const bytes = new Uint8Array(pcm.buffer);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      try {
        this.session.sendRealtimeInput({
          audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' },
        });
      } catch (error) {
        console.warn('[Lyra] Microphone frame send failed:', error);
      }
    };
    this.processorNode.connect(this.inputContext.destination);
  }

  private resampleToRate(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (!input.length || inputRate === outputRate) return input;
    const outputLength = Math.max(1, Math.floor(input.length * outputRate / inputRate));
    const output = new Float32Array(outputLength);
    const ratio = inputRate / outputRate;
    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const left = Math.min(input.length - 1, Math.floor(position));
      const right = Math.min(input.length - 1, left + 1);
      const fraction = position - left;
      output[i] = input[left] * (1 - fraction) + input[right] * fraction;
    }
    return output;
  }

  private playAudioChunk(base64Audio: string) {
    if (!this.outputContext) return;
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const usableLength = bytes.length - (bytes.length % 2);
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, usableLength / 2);
      if (!pcm.length) return;
      const samples = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
      const buffer = this.outputContext.createBuffer(1, samples.length, 24000);
      buffer.getChannelData(0).set(samples);
      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAnalyser || this.outputContext.destination);
      if (this.outputAnalyser) this.outputAnalyser.connect(this.outputContext.destination);
      if (this.nextPlayTime < this.outputContext.currentTime) this.nextPlayTime = this.outputContext.currentTime;
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
      this.activeSources.push(source);
      this.setState('speaking');
      source.onended = () => {
        this.activeSources = this.activeSources.filter((item) => item !== source);
        if (this.activeSources.length === 0 && this.isConnected && !this.isMuted) this.setState('listening');
      };
    } catch (error) {
      console.warn('[Lyra] Audio playback chunk failed:', error);
    }
  }

  private startVisualizer() {
    if (this.visualizerFrame !== null) cancelAnimationFrame(this.visualizerFrame);
    const tick = () => {
      if (this.outputAnalyser && this.state === 'speaking') {
        const values = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(values);
        let sum = 0;
        for (let i = 0; i < values.length; i++) sum += values[i];
        this.callbacks.onOutputVolume(Math.min(1, (sum / Math.max(1, values.length) / 255) * 2));
      } else {
        this.callbacks.onOutputVolume(0);
      }
      if (this.isConnected) this.visualizerFrame = requestAnimationFrame(tick);
    };
    this.visualizerFrame = requestAnimationFrame(tick);
  }

  private stopPlayback() {
    for (const source of this.activeSources) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    this.activeSources = [];
    if (this.outputContext) this.nextPlayTime = this.outputContext.currentTime;
  }

  sendText(text: string) {
    if (!this.session || !this.isConnected) {
      this.callbacks.onError('Lyra is not connected yet. Tap the call button and try again.');
      return;
    }
    this.setState('thinking');
    try {
      this.session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    } catch {
      this.callbacks.onError('Could not send your message. Please try again.');
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopPlayback();
      this.setState('muted');
    } else {
      this.setState(this.isConnected ? 'listening' : 'idle');
    }
  }

  getIsMuted() {
    return this.isMuted;
  }

  getInputAnalyser() {
    return this.inputAnalyser;
  }

  getOutputAnalyser() {
    return this.outputAnalyser;
  }

  disconnect(updateState = true) {
    this.isConnected = false;
    this.stopPlayback();
    if (this.visualizerFrame !== null) {
      cancelAnimationFrame(this.visualizerFrame);
      this.visualizerFrame = null;
    }
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try { this.processorNode.disconnect(); } catch {}
      this.processorNode = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputContext) {
      try { void this.inputContext.close(); } catch {}
      this.inputContext = null;
    }
    if (this.outputContext) {
      try { void this.outputContext.close(); } catch {}
      this.outputContext = null;
    }
    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
    }
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.activeSources = [];
    this.nextPlayTime = 0;
    this.callbacks.onInputVolume(0);
    this.callbacks.onOutputVolume(0);
    if (updateState) this.setState('idle');
  }
}
