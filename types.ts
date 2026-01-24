
export type Screen = 
  | 'splash' 
  | 'auth'
  | 'onboarding' 
  | 'style-selection' 
  | 'home' 
  | 'scan' 
  | 'confirmation' 
  | 'processing' 
  | 'result' 
  | 'focus-timer' 
  | 'step-focus' 
  | 'ar-placement' 
  | 'completion' 
  | 'save-space' 
  | 'library' 
  | 'settings'
  | 'inspiration';

export interface UserSettings {
  defaultStyle: OrganizingStyle;
  defaultFocusTime: 5 | 7 | 10;
  gentleAnimations: boolean;
  hapticFeedback: boolean;
  largerText: boolean;
  highContrast: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  settings: UserSettings;
}

export interface SavedSpace {
  id: string;
  ownerId: string; // Linked to User.id
  name: string;
  date: string;
  image: string;
  beforeImage?: string;
  type: 'dream' | 'scan';
  note?: string;
}

export type OrganizingStyle = 'Calm Minimal' | 'Aesthetic' | 'Practical' | 'Compact';

export interface AppState {
  currentScreen: Screen;
  currentUser: User | null;
  onboardingStep: number;
  selectedStyle: OrganizingStyle;
  capturedImage: string | null;
  savedSpaces: SavedSpace[];
  currentStepIndex: number;
}
