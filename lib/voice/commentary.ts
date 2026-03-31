// Generate DJ commentary for track introductions

interface TrackContext {
  trackName: string;
  artistName: string;
  albumName?: string;
  genres?: string[];
  energy?: number;
  isFirst?: boolean;
}

const INTRO_TEMPLATES = [
  "Here's {artist} with {track}.",
  "Coming up, {track} by {artist}.",
  "Let's keep it going with {artist}.",
  "Next up, {track}.",
  "{artist} bringing the vibes with {track}.",
];

const FIRST_TRACK_TEMPLATES = [
  "Starting off with {artist}, here's {track}.",
  "Kicking things off, it's {track} by {artist}.",
  "Let's set the mood with {artist}.",
];

const ENERGY_COMMENTS: Record<string, string[]> = {
  high: ["Let's turn it up!", "Energy's rising!", "Here we go!"],
  low: ["Taking it smooth.", "Bringing it down a notch.", "Nice and easy."],
  mid: ["Keeping the vibe.", "Staying in the groove.", ""],
};

export function generateCommentary(context: TrackContext): string {
  const templates = context.isFirst ? FIRST_TRACK_TEMPLATES : INTRO_TEMPLATES;
  const template = templates[Math.floor(Math.random() * templates.length)];

  let commentary = template
    .replace("{track}", context.trackName)
    .replace("{artist}", context.artistName);

  // Add energy comment occasionally
  if (context.energy !== undefined && Math.random() > 0.6) {
    const energyLevel = context.energy > 0.7 ? "high" : context.energy < 0.3 ? "low" : "mid";
    const comments = ENERGY_COMMENTS[energyLevel];
    const comment = comments[Math.floor(Math.random() * comments.length)];
    if (comment) {
      commentary = comment + " " + commentary;
    }
  }

  return commentary;
}
