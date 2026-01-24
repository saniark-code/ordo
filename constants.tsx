
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

// Define HOME_CATEGORIES for the main dashboard
export const HOME_CATEGORIES = [
  { 
    name: 'New Scan', 
    screen: 'scan', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
    ) 
  },
  { 
    name: 'Dream Space', 
    screen: 'inspiration', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ) 
  },
  { 
    name: 'Library', 
    screen: 'library', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ) 
  },
  { 
    name: 'Settings', 
    screen: 'settings', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ) 
  },
];
