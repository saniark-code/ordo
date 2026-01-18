
export type Screen = 
  | 'splash' 
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
  | 'settings';

export interface SavedSpace {
  id: string;
  name: string;
  date: string;
  image: string;
  note?: string;
}

export type OrganizingStyle = 'Calm Minimal' | 'Aesthetic' | 'Practical' | 'Compact';

export interface AppState {
  currentScreen: Screen;
  onboardingStep: number;
  selectedStyle: OrganizingStyle;
  capturedImage: string | null;
  savedSpaces: SavedSpace[];
  currentStepIndex: number;
}
