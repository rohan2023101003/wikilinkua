// Audio playback helper for WikiLinkua target word pronunciation
export function playAudio(audioUrl, onStart, onEnd) {
  if (!audioUrl) return;
  const secureUrl = audioUrl.replace(/^http:\/\//, 'https://');
  const audio = new Audio(secureUrl);
  if (onStart) onStart();
  audio.play().catch(err => {
    console.warn("Failed to play audio", err);
    if (onEnd) onEnd();
  });
  audio.addEventListener('ended', () => {
    if (onEnd) onEnd();
  });
  audio.addEventListener('error', () => {
    if (onEnd) onEnd();
  });
}
