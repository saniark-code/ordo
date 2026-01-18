
import React from 'react';

export const COLORS = {
  background: '#FDFCFB',
  text: '#333333',
  accent: '#8EA3A1', // Sage
  mutedBlue: '#A5B9C4',
  cardBackground: '#FFFFFF',
};

export const LOGO_LINES = [
  { width: 'w-24', order: 0 },
  { width: 'w-20', order: 1 },
  { width: 'w-16', order: 2 },
  { width: 'w-12', order: 3 },
  { width: 'w-8', order: 4 },
];

export const ONBOARDING_CONTENT = [
  { title: "Scan your space", description: "Use the camera to let Ordo understand your environment." },
  { title: "Order, revealed", description: "AI helps you find the hidden potential in your mess." },
  { title: "Guided steps, calmly", description: "Follow simple, non-urgent instructions to restore peace." },
];

export const STYLE_OPTIONS: { title: string; description: string }[] = [
  { title: 'Calm Minimal', description: 'Sparse surfaces, hidden storage, neutral tones.' },
  { title: 'Aesthetic', description: 'Curated displays, balanced colors, intentional vibes.' },
  { title: 'Practical', description: 'Efficiency focused, easy access, durable systems.' },
  { title: 'Compact', description: 'Space-saving hacks for smaller living quarters.' },
];
