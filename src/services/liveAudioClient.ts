      // 5. Request a short-lived Gemini Live token from our Vercel API.
      // Vercel Functions are not used as a long-running WebSocket proxy.
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
        try { tokenData = JSON.parse(tokenRaw); } catch {}
      }
      if (!tokenResponse.ok || !tokenData.token) {
        const detail = tokenData.error || (tokenRaw.startsWith('<') ? 'Vercel returned an HTML error page instead of JSON. Check the deployment and /api/live-token route.' : 'Could not obtain a Gemini Live session token.');
        throw new Error(detail);
      }

      const liveAI = new GoogleGenAI({ apiKey: tokenData.token });
      const systemInstruction = `You are Lyra, a warm, natural, intelligent AI companion. Match the user's language, especially English, Pakistani Urdu, and Roman Urdu. Keep the conversation conversational and helpful. User name: ${settings.userName || 'not provided'}. Preferred language: ${settings.preferredLanguage || 'auto'}. Relevant saved memories: ${memories.map((m) => m.content).join('; ') || 'none'}.`;
      const tools = [{
        functionDeclarations: [
          { name: 'saveMemory', description: 'Save a personal fact only when the user explicitly asks you to remember it or clearly shares a stable preference, goal, or important detail. Do not save secrets.', parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['content', 'category'] } },
          { name: 'forgetMemory', description: 'Forget a saved memory when the user asks.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
          { name: 'setFocusTimer', description: 'Start a focus timer.', parameters: { type: Type.OBJECT, properties: { minutes: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['minutes'] } },
          { name: 'addReminderOrTask', description: 'Add a task or reminder.', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, priority: { type: Type.STRING } }, required: ['title'] } },
          { name: 'saveStudyNote', description: 'Save a study note.', parameters: { type: Type.OBJECT, properties: { note: { type: Type.STRING }, topic: { type: Type.STRING } }, required: ['note'] } },
        ],
      }];

      this.session = await liveAI.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice || 'Kore' } } },
          systemInstruction,
          tools,
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.setState('listening');
          },
          onmessage: (serverMsg: any) => {
            if (serverMsg.serverContent?.modelTurn?.parts) {
              for (const part of serverMsg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) this.handleIncomingAudioChunk(part.inlineData.data);
                if (part.text) this.callbacks.onTranscriptChunk(part.text, 'lyra');
              }
            }
            if (serverMsg.serverContent?.interrupted) {
              this.stopAllPlayback();
              this.setState('listening');
              this.callbacks.onInterrupted();
            }
            if (serverMsg.serverContent?.turnComplete) {
              this.callbacks.onTurnComplete();
              this.checkTurnPlaybackFinished();
            }
            if (serverMsg.toolCall?.functionCalls) {
              const functionResponses: any[] = [];
              for (const call of serverMsg.toolCall.functionCalls) {
                this.callbacks.onToolCall({ id: call.id || '', name: call.name, args: call.args || {} });
                functionResponses.push({ id: call.id, name: call.name, response: { status: 'received', message: 'Action was passed to Lyra UI.' } });
              }
              try { this.session?.sendToolResponse({ functionResponses }); } catch (toolError) { console.warn('[Lyra Live] Tool response failed:', toolError); }
            }
          },
          onerror: (event: any) => {
            const message = event?.message || 'Gemini Live connection encountered an error.';
            this.callbacks.onError(message);
            this.setState('error');
          },
          onclose: (event: any) => {
            this.isConnected = false;
            if (this.state !== 'error') this.setState('idle');
            if (event?.reason) console.info('[Lyra Live] Connection closed:', event.reason);
          },
        },
      });

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
    if (!this.session) return;
    this.setState('thinking');
    try {
      this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
    } catch (error) {
      this.callbacks.onError('Could not send text to the live conversation. Please retry.');
    }
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

    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
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
