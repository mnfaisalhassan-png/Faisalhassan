import { GoogleGenAI, Modality } from "@google/genai";

// Audio Context (Lazy init to comply with browser autoplay policies)
let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

// Base64 decoding (manual implementation)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert PCM data to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Safe AI Initialization to prevent white screen crashes
let aiClient: GoogleGenAI | null = null;

function getAi() {
    if (!aiClient) {
        // Try multiple sources for the API key
        let apiKey = '';
        
        // 1. Check window.ENV (Added in index.html for manual override)
        if ((window as any).ENV && (window as any).ENV.API_KEY) {
            apiKey = (window as any).ENV.API_KEY;
        }

        // 2. Check Vite/Modern standard import.meta.env
        const meta = (import.meta as any) || {};
        if (!apiKey && meta.env) {
             if (meta.env.VITE_API_KEY) apiKey = meta.env.VITE_API_KEY;
             else if (meta.env.API_KEY) apiKey = meta.env.API_KEY;
             else if (meta.env.GOOGLE_API_KEY) apiKey = meta.env.GOOGLE_API_KEY;
        }
        
        // 3. Check standard process.env (Node/Webpack/Polyfill) fallback
        if (!apiKey && typeof process !== 'undefined' && process.env) {
            if (process.env.API_KEY) apiKey = process.env.API_KEY;
        }

        // 4. Last resort globals
        if (!apiKey && (window as any).API_KEY) apiKey = (window as any).API_KEY;
        if (!apiKey && (window as any).VITE_API_KEY) apiKey = (window as any).VITE_API_KEY;

        if (!apiKey) {
            console.warn("Gemini API Key is missing. Please set window.ENV.API_KEY in index.html or configure environment variables.");
        }
        
        // Initialize even with empty string to allow later calls to fail gracefully with proper Google errors
        aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
    }
    return aiClient;
}

export const aiService = {
  /**
   * Generates speech from text using Gemini 2.5 Flash TTS model
   */
  speak: async (text: string) => {
    // 1. Capture AudioContext immediately to respect user gesture policies
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.warn("Could not resume audio context:", e);
        }
    }

    try {
      const ai = getAi();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Options: 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error("No audio data received. Check if your API key has access to the TTS model.");
      }

      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      
      return true;
    } catch (error: any) {
      console.error("TTS Error:", error);
      // Pass the error up to be handled by the UI
      throw error;
    }
  },

  /**
   * Generates a chat response using Gemini 3 Pro
   */
  generateChatResponse: async (message: string, history: { role: string, parts: { text: string }[] }[] = []) => {
    const ai = getAi();
    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      history: history,
    });
    
    const result = await chat.sendMessage({ message });
    return result.text;
  },

  /**
   * Generates a fast response using Gemini 2.5 Flash Lite
   */
  generateFastResponse: async (prompt: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: prompt,
    });
    return response.text;
  },

  /**
   * Transcribes audio using Gemini 3 Flash
   */
  transcribeAudio: async (base64Audio: string, mimeType: string = 'audio/wav') => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe this audio exactly as spoken."
          }
        ]
      }
    });
    return response.text;
  }
};