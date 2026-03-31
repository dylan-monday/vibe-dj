// ElevenLabs API client for voice synthesis

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export async function synthesizeSpeech(
  text: string,
  voiceId?: string
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not configured");
    return null;
  }

  const settings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
  };

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId || defaultVoiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: settings,
        }),
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs API error:", response.status);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Voice synthesis failed:", error);
    return null;
  }
}
