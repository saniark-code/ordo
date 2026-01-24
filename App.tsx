
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Screen, SavedSpace, OrganizingStyle, User, UserSettings } from './types';
import { OrdoBackend } from './backend';
import { Logo } from './components/Logo';
import { Button, Card } from './components/UI';
import { ONBOARDING_CONTENT, STYLE_OPTIONS, HOME_CATEGORIES } from './constants';

interface OrganizingStep {
  title: string;
  description: string;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-all duration-500 relative ${checked ? 'bg-[#8EA3A1]' : 'bg-neutral-200'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500 shadow-sm ${checked ? 'left-7' : 'left-1'}`} />
  </button>
);

const CompareSlider: React.FC<{ before: string; after: string; viewMode: 'before' | 'after' }> = ({ before, after, viewMode }) => {
  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#1A1816]">
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]" 
        style={{ 
          opacity: viewMode === 'before' ? 1 : 0,
          transform: viewMode === 'before' ? 'scale(1)' : 'scale(1.08)',
          filter: viewMode === 'before' ? 'none' : 'blur(24px)'
        }}
      >
        <img src={before} className="w-full h-full object-cover" alt="Before" />
      </div>
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]" 
        style={{ 
          opacity: viewMode === 'after' ? 1 : 0,
          transform: viewMode === 'after' ? 'scale(1)' : 'scale(0.92)',
        }}
      >
        <img src={after} className="w-full h-full object-cover" alt="After" />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<OrganizingStyle>('Calm Minimal');
  const [viewMode, setViewMode] = useState<'after' | 'before'>('after');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OrganizingStep[]>([]);
  const [savedSpaces, setSavedSpaces] = useState<SavedSpace[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [inspirationPrompt, setInspirationPrompt] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const [isDreamSpaceResult, setIsDreamSpaceResult] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // Auth Form States
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // Custom Modal States
  const [editingSpace, setEditingSpace] = useState<SavedSpace | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const session = OrdoBackend.getSession();
    if (session) {
      setUser(session);
      setSelectedStyle(session.settings.defaultStyle);
      loadSpaces(session.id);
      setTimeout(() => setScreen('home'), 2000);
    } else {
      setTimeout(() => setScreen('auth'), 2000);
    }
  }, []);

  const loadSpaces = async (userId: string) => {
    try {
      setIsSyncing(true);
      const data = await OrdoBackend.getSpaces(userId);
      setSavedSpaces(data);
    } catch (e) {
      console.error("Failed to load spaces", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const getGeminiApiKey = () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
    if (!key || key === 'your_gemini_api_key_here') {
      setAiError('Missing Gemini API key. Set VITE_GEMINI_API_KEY in .env.local and restart the dev server.');
      return null;
    }
    return key;
  };

  const handleAuth = async () => {
    setAuthError('');
    setIsSyncing(true);
    try {
      let loggedUser: User;
      if (authMode === 'signup') {
        if (!name || !email || !password) throw new Error('All fields are required.');
        loggedUser = await OrdoBackend.signUp(email, name, password);
      } else {
        if (!email || !password) throw new Error('Email and password are required.');
        loggedUser = await OrdoBackend.signIn(email, password);
      }
      setUser(loggedUser);
      setSelectedStyle(loggedUser.settings.defaultStyle);
      await loadSpaces(loggedUser.id);
      setScreen('onboarding');
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const updatedUser = { ...user, settings: { ...user.settings, ...newSettings } };
    setUser(updatedUser);
    await OrdoBackend.updateUserSettings(user.id, updatedUser.settings);
  };

  const handleSignOut = () => {
    OrdoBackend.signOut();
    setUser(null);
    setScreen('auth');
    setSavedSpaces([]);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      setIsSyncing(true);
      await OrdoBackend.deleteAccount(user.id);
      setUser(null);
      setScreen('auth');
      setIsDeletingAccount(false);
    } catch (e) {
      console.error("Account deletion failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (screen === 'scan') {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => videoRef.current?.play();
          }
        } catch (err) { 
          console.error("Camera access denied", err); 
          setScreen('home');
        }
      };
      startCamera();
    } else if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }, [screen]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (video && video.readyState >= 2) { 
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        setScreen('confirmation');
      }
    }
  };

  const handleGenerateInspiration = async () => {
    if (!inspirationPrompt.trim()) return;
    setAiError('');
    const apiKey = getGeminiApiKey();
    if (!apiKey) return;
    setIsGeneratingInspiration(true);
    setIsDreamSpaceResult(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [{ text: `Generate a high-fidelity, high-resolution interior design visualization of a perfectly organized and minimalist space. Description: ${inspirationPrompt}. The image should feel calm, clean, and professional. Ensure realistic lighting and textures. Style: ${user?.settings.defaultStyle || 'Minimalist Organizers'}.` }]
        },
      });

      let genImg = null;
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          genImg = `data:image/jpeg;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (genImg) {
        setAfterImage(genImg);
        setCapturedImage(null);
        setSteps([]);
        setScreen('result');
      } else {
        setAiError('No image returned from Gemini. Check your API key access to image generation.');
      }
    } catch (error) {
      console.error("Moodboard generation failed", error);
      setAiError('Dream space generation failed. Check your API key, model access, and the browser console for details.');
    } finally {
      setIsGeneratingInspiration(false);
    }
  };

  const handleProcessing = async (style: OrganizingStyle) => {
    setAiError('');
    const apiKey = getGeminiApiKey();
    if (!apiKey) return;
    setSelectedStyle(style);
    setIsDreamSpaceResult(false);
    setScreen('processing');
    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = capturedImage?.split(',')[1];
      if (!base64Data) throw new Error("No image data");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: `Professional organizer AI. Style: ${style}. Task: Generate high-fidelity AFTER image of this space rearranged perfectly. Task 2: Return JSON { "steps": [{ "title": "...", "description": "..." }] } with 5 steps.` }
          ]
        }
      });

      let genImg = null;
      let genTxt = "";
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) genImg = `data:image/jpeg;base64,${part.inlineData.data}`;
        else if (part.text) genTxt += part.text;
      }

      if (!genImg) {
        setAiError('No image returned from Gemini. Check your API key access to image generation.');
      }

      let parsedSteps: OrganizingStep[] = [];
      try {
        const fullText = response.text || genTxt;
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedSteps = JSON.parse(jsonMatch[0]).steps || [];
      } catch (e) { console.error("JSON parse failed", e); }

      setAfterImage(genImg || capturedImage);
      setSteps(parsedSteps.length > 0 ? parsedSteps : [
        { title: "Define Functional Zones", description: "Identify primary purposes for each surface area." },
        { title: "Align and Rectify", description: "Straighten objects to parallel the furniture lines." },
        { title: "Fold and Stack", description: "Gather loose fabrics into uniform compact shapes." },
        { title: "Manage Visual Noise", description: "Conceal cables behind larger structural pieces." },
        { title: "Final Polish", description: "Wipe surfaces to emphasize new clean lines." }
      ]);
      setScreen('result');
    } catch (error) {
      console.error("AI Generation failed:", error);
      setAiError('Image generation failed. Check your API key, model access, and the browser console for details.');
      setAfterImage(capturedImage);
      setTimeout(() => setScreen('result'), 1500);
    }
  };

  const handleSaveToLibrary = async () => {
    // Only block if critical data is missing
    if (!afterImage || !newSpaceName.trim() || !user) {
      console.warn("Save failed: Missing data", { hasImage: !!afterImage, name: newSpaceName, user: !!user });
      return;
    }

    const newSpace: SavedSpace = {
      id: Date.now().toString(),
      ownerId: user.id,
      name: newSpaceName.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      image: afterImage,
      beforeImage: capturedImage || undefined,
      type: isDreamSpaceResult ? 'dream' : 'scan'
    };
    
    try {
      setIsSyncing(true);
      await OrdoBackend.saveSpace(newSpace);
      // Wait for load to finish so library is up to date
      await loadSpaces(user.id);
      setNewSpaceName('');
      setScreen('home');
    } catch (e) {
      console.error("Failed to save space", e);
      alert("Encountered an error saving this space. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmDelete = async () => {
    if (!editingSpace || !user) return;
    try {
      setIsSyncing(true);
      await OrdoBackend.deleteSpace(editingSpace.id);
      await loadSpaces(user.id);
      setIsDeleting(false);
      setEditingSpace(null);
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmRename = async () => {
    if (!editingSpace || !renameInput.trim() || !user) return;
    try {
      setIsSyncing(true);
      await OrdoBackend.updateSpace(editingSpace.id, { name: renameInput.trim() });
      await loadSpaces(user.id);
      setIsRenaming(false);
      setEditingSpace(null);
    } catch (e) {
      console.error("Rename failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLibraryItemClick = (space: SavedSpace) => {
    setIsDreamSpaceResult(space.type === 'dream');
    setAfterImage(space.image);
    setCapturedImage(space.beforeImage || null);
    setViewMode('after');
    setScreen('result');
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setScreen('completion');
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-white">
            <Logo align="order" />
            <p className="mt-12 text-xs tracking-[0.4em] uppercase opacity-40 font-medium animate-pulse">Ordo</p>
          </div>
        );

      case 'auth':
        return (
          <div className="flex flex-col h-full bg-white p-8 pt-24 animate-fade-in">
            <div className="flex-1 space-y-12">
              <div className="space-y-4">
                <h1 className="text-4xl font-light text-[#2A2826]">{authMode === 'signin' ? 'Welcome back' : 'Create space'}</h1>
                <p className="text-sm text-neutral-400 font-light leading-relaxed">Enter your details to synchronize your sanctuary.</p>
              </div>
              
              <div className="space-y-6">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 px-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-neutral-50 rounded-2xl p-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-[#8EA3A1] transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 px-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-50 rounded-2xl p-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-[#8EA3A1] transition-all"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 px-1">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-50 rounded-2xl p-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-[#8EA3A1] transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {authError && (
                  <p className="text-[11px] text-red-500 font-medium px-1 italic">*{authError}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-6 pb-12">
              <Button onClick={handleAuth} className="w-full py-6">
                {isSyncing ? 'Authenticating...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
              <div className="text-center">
                <button 
                  onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
                  className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400"
                >
                  {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </div>
          </div>
        );

      case 'onboarding':
        return (
          <div className="flex flex-col items-center justify-between h-full p-8 pb-16 text-center bg-white">
            <div className="w-full pt-16 flex flex-col items-center space-y-10">
              <Logo align={onboardingStep === 0 ? 'chaos' : 'order'} />
              <div className="space-y-4 px-4">
                <h1 className="text-2xl font-light text-[#2A2826] animate-fade-in">{ONBOARDING_CONTENT[onboardingStep].title}</h1>
                <p className="text-sm text-gray-400 font-light leading-relaxed animate-fade-in">{ONBOARDING_CONTENT[onboardingStep].description}</p>
              </div>
            </div>
            <div className="w-full space-y-8">
               <div className="flex justify-center gap-2">
                 {[0,1,2].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === onboardingStep ? 'bg-[#333] w-4' : 'bg-gray-200'}`} />)}
               </div>
               <Button onClick={() => onboardingStep < 2 ? setOnboardingStep(onboardingStep + 1) : setScreen('home')} className="w-full">
                {onboardingStep === 2 ? 'Start' : 'Continue'}
               </Button>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB]">
            <div className="p-8 pt-20 flex-1 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <h1 className="text-3xl font-light text-[#2A2826] leading-tight tracking-tight">Welcome, {user?.name.split(' ')[0]}<br/>restore order.</h1>
                  {isSyncing && <p className="text-[10px] text-[#8EA3A1] font-bold uppercase tracking-widest animate-pulse">Syncing...</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setScreen('settings')} className="p-3 bg-white shadow-sm border border-neutral-100 rounded-full active:scale-95 transition-transform" aria-label="Settings">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A2826" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>
                  <button onClick={() => setScreen('library')} className="p-3 bg-white shadow-sm border border-neutral-100 rounded-full active:scale-95 transition-transform" aria-label="Library">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A2826" strokeWidth="1.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-12">
                {HOME_CATEGORIES.map((cat) => (
                  <Card key={cat.name} onClick={() => setScreen(cat.screen as Screen)} className="aspect-square flex flex-col items-center justify-center p-6 text-center shadow-md hover:shadow-xl transition-all border border-neutral-100 group">
                    <div className="text-[#2A2826] opacity-80 mb-4 scale-150 group-active:scale-125 transition-transform">{cat.icon}</div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2A2826] mt-4">{cat.name}</span>
                  </Card>
                ))}
              </div>
            </div>
            <div className="p-8 pb-12">
               <Button onClick={() => setScreen('scan')} className="w-full py-6 text-[11px] font-bold uppercase tracking-[0.3em]">Begin New Scan</Button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] overflow-hidden animate-fade-in">
            <div className="p-8 pt-20 flex-1 overflow-y-auto no-scrollbar pb-32">
              <div className="flex items-center gap-4 mb-12">
                <button onClick={() => setScreen('home')} className="p-2 -ml-2 text-[#2A2826]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h1 className="text-2xl font-light text-[#2A2826]">Settings</h1>
              </div>

              {/* Account Section */}
              <div className="space-y-6 mb-12">
                <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-300">Account</h2>
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-neutral-50 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#2A2826]">{user?.name}</p>
                    <p className="text-[11px] text-neutral-400 font-light">{user?.email}</p>
                  </div>
                  <button onClick={handleSignOut} className="text-[10px] font-bold text-[#8EA3A1] uppercase tracking-widest px-3 py-1.5 border border-[#8EA3A1]/20 rounded-full">Sign Out</button>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-6 mb-12">
                <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-300">Preferences</h2>
                <div className="bg-white rounded-[32px] p-2 shadow-sm border border-neutral-50">
                  <div className="p-4 space-y-4">
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2A2826] opacity-40">Default Style</p>
                      <div className="flex flex-wrap gap-2">
                        {STYLE_OPTIONS.map(opt => (
                          <button 
                            key={opt.title} 
                            onClick={() => updateSettings({ defaultStyle: opt.title as OrganizingStyle })}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${user?.settings.defaultStyle === opt.title ? 'bg-[#2A2826] text-white' : 'bg-neutral-50 text-[#2A2826] opacity-60'}`}
                          >
                            {opt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-[1px] bg-neutral-50" />

                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#2A2826]">Default Focus</p>
                        <p className="text-[10px] text-neutral-400 font-light uppercase tracking-widest">Time allocated for tasks</p>
                      </div>
                      <div className="flex bg-neutral-50 p-1 rounded-full">
                        {[5, 7, 10].map(t => (
                          <button 
                            key={t} 
                            onClick={() => updateSettings({ defaultFocusTime: t as any })}
                            className={`w-10 h-8 rounded-full text-[10px] font-bold transition-all ${user?.settings.defaultFocusTime === t ? 'bg-white shadow-sm text-[#2A2826]' : 'text-neutral-400'}`}
                          >
                            {t}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-[1px] bg-neutral-50" />

                    <div className="flex items-center justify-between py-2">
                      <p className="text-sm font-medium text-[#2A2826]">Gentle Animations</p>
                      <Toggle checked={user?.settings.gentleAnimations || false} onChange={v => updateSettings({ gentleAnimations: v })} />
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <p className="text-sm font-medium text-[#2A2826]">Haptic Feedback</p>
                      <Toggle checked={user?.settings.hapticFeedback || false} onChange={v => updateSettings({ hapticFeedback: v })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accessibility Section */}
              <div className="space-y-6 mb-12">
                <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-300">Accessibility</h2>
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-neutral-50 space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#2A2826]">Larger Text</p>
                    <Toggle checked={user?.settings.largerText || false} onChange={v => updateSettings({ largerText: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#2A2826]">High Contrast</p>
                    <Toggle checked={user?.settings.highContrast || false} onChange={v => updateSettings({ highContrast: v })} />
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="space-y-6 mb-12">
                <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-300">About Ordo</h2>
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-neutral-50 space-y-8 text-center">
                  <div className="space-y-3">
                    <h3 className="text-lg font-light text-[#2A2826]">Ordo v1.0.4</h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed italic">Restoring balance through computer vision and mindful organization.</p>
                  </div>
                  <div className="flex justify-center gap-6">
                    <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8EA3A1]">Privacy</button>
                    <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8EA3A1]">Terms</button>
                  </div>
                </div>
              </div>

              <div className="pt-8 text-center">
                 <button onClick={() => setIsDeletingAccount(true)} className="text-[10px] font-bold text-red-400/50 uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Delete Account</button>
              </div>
            </div>

            {isDeletingAccount && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-xs rounded-[40px] p-10 shadow-2xl space-y-8 text-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 19a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17 19a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM19 12h-4v-4h4v4Z"/></svg>
                    </div>
                    <h3 className="text-xl font-light text-[#2A2826]">Erase all record?</h3>
                    <p className="text-xs text-neutral-400 font-light px-4">All spaces, history, and preferences will be permanently deleted. This cannot be undone.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleDeleteAccount} className="w-full py-5 bg-red-500 text-white rounded-full text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-500/20">Wipe My Account</button>
                    <button onClick={() => setIsDeletingAccount(false)} className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 py-2">Return to Safety</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'inspiration':
        return (
          <div className="flex flex-col h-full bg-white relative animate-fade-in">
            <div className="flex-1 p-8 pt-20 flex flex-col items-center justify-center space-y-12">
              <button onClick={() => setScreen('home')} className="absolute top-14 left-8 p-3 text-neutral-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-light text-[#2A2826]">Dream Space</h1>
                <p className="text-sm text-neutral-400 font-light px-8 leading-relaxed italic">Describe a space, and let Ordo visualize its most organized potential.</p>
              </div>
              {isGeneratingInspiration ? (
                <div className="flex flex-col items-center space-y-6 animate-pulse">
                  <div className="w-16 h-[1px] bg-neutral-100" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8EA3A1]">Dreaming of order...</p>
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  <input 
                    type="text" 
                    placeholder="e.g. A Japandi reading nook..."
                    value={inspirationPrompt}
                    onChange={(e) => setInspirationPrompt(e.target.value)}
                    autoFocus
                    className="w-full text-center text-xl font-light text-[#2A2826] bg-transparent border-b border-neutral-100 py-4 focus:outline-none focus:border-[#8EA3A1] transition-colors"
                  />
                  {aiError && (
                    <p className="mt-6 text-[11px] text-red-500 font-medium text-center">{aiError}</p>
                  )}
                  <div className="mt-12 flex justify-center">
                    <Button onClick={handleGenerateInspiration} className="w-full py-5">Generate Visualization</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'save-space':
        return (
          <div className="flex flex-col h-full bg-white relative animate-fade-in">
            <div className="flex-1 p-8 pt-20 flex flex-col items-center justify-center space-y-12">
              <button onClick={() => setScreen('result')} className="absolute top-14 left-8 p-3 text-neutral-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-light text-[#2A2826]">Name this space</h1>
                <p className="text-sm text-neutral-400 font-light px-8 leading-relaxed italic">Give your newly organized space a memory.</p>
              </div>
              <div className="w-full max-w-sm">
                <input 
                  type="text" 
                  placeholder="e.g. My Workspace, Bedroom Corner"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  autoFocus
                  className="w-full text-center text-xl font-light text-[#2A2826] bg-transparent border-b border-neutral-100 py-4 focus:outline-none focus:border-[#8EA3A1] transition-colors"
                />
                <div className="mt-12 flex justify-center">
                  <Button onClick={handleSaveToLibrary} className="w-full py-5">
                    {isSyncing ? 'Syncing...' : 'Confirm & Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="relative h-full bg-black overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
            <div className="relative z-20 h-full flex flex-col items-center justify-between p-12 py-24">
              <p className="text-white text-[11px] tracking-[0.4em] uppercase font-bold opacity-70 bg-black/20 backdrop-blur-md px-6 py-2 rounded-full">Point at your space</p>
              <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-[5px] border-white p-1.5 active:scale-90 transition-all duration-300 shadow-2xl">
                <div className="w-full h-full rounded-full bg-white shadow-xl" />
              </button>
              <button onClick={() => setScreen('home')} className="absolute top-14 left-8 text-white p-3 z-30 bg-black/20 backdrop-blur-md rounded-full border border-white/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] animate-fade-in">
            <div className="flex-1 overflow-hidden relative shadow-inner">
               <img src={capturedImage!} className="w-full h-full object-cover" alt="Captured" />
            </div>
            <div className="p-10 space-y-8 bg-white rounded-t-[48px] -mt-12 z-20 shadow-2xl">
              <h2 className="text-[28px] font-light text-[#2A2826] leading-tight">Reveal potential?</h2>
              <div className="flex gap-4">
                <Button onClick={() => setScreen('scan')} variant="secondary" className="flex-1 py-5">Retake</Button>
                <Button onClick={() => setScreen('style-selection')} className="flex-[2] py-5">Continue</Button>
              </div>
            </div>
          </div>
        );

      case 'style-selection':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] p-8 pt-20 animate-fade-in">
            <h1 className="text-3xl font-light text-[#2A2826] mb-8 tracking-tight">Select Style</h1>
            {aiError && (
              <p className="text-[11px] text-red-500 font-medium mb-4">{aiError}</p>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
              {STYLE_OPTIONS.map((style) => (
                <Card key={style.title} onClick={() => handleProcessing(style.title as OrganizingStyle)} className="p-6 border border-neutral-50 hover:border-[#8EA3A1]/30 transition-all active:scale-[0.98]">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[#2A2826] mb-1">{style.title}</h3>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed">{style.description}</p>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-12 bg-white">
            <div className="animate-pulse scale-125"><Logo align="order" /></div>
            <div className="text-center space-y-4 px-12">
              <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-[#8EA3A1] italic animate-pulse">Arranging with precision.</p>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="flex flex-col h-full bg-white overflow-hidden relative animate-fade-in">
            <div className="relative w-full h-[55vh] flex-shrink-0 z-10 border-b border-neutral-100 bg-neutral-50 shadow-lg">
              {isDreamSpaceResult || !capturedImage ? (
                <img src={afterImage || capturedImage!} className="w-full h-full object-cover animate-fade-in" alt="Result" />
              ) : (
                <CompareSlider before={capturedImage!} after={afterImage || capturedImage!} viewMode={viewMode} />
              )}
              
              <div className="absolute top-14 left-8 z-30">
                <button onClick={() => setScreen('home')} className="p-3 bg-black/10 backdrop-blur-3xl rounded-full text-white border border-white/20 shadow-xl">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              </div>
              
              {!isDreamSpaceResult && capturedImage && (
                <div className="absolute bottom-8 left-0 w-full flex justify-center z-30 animate-fade-in">
                  <div className="bg-[#1A1816]/60 backdrop-blur-3xl p-1.5 rounded-full flex gap-1.5 shadow-2xl border border-white/10 w-[240px]">
                    <button onClick={() => setViewMode('before')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${viewMode === 'before' ? 'bg-white text-[#1A1816]' : 'text-white/40'}`}>Before</button>
                    <button onClick={() => setViewMode('after')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${viewMode === 'after' ? 'bg-white text-[#1A1816]' : 'text-white/40'}`}>After</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 bg-white p-10 flex flex-col items-center justify-between z-20">
              <div className="space-y-4 text-center">
                <h1 className="text-[36px] font-light tracking-tight text-[#2A2826] leading-none">
                  {isDreamSpaceResult ? 'Dream, visualized.' : 'Potential, realized.'}
                </h1>
                <p className="text-[15px] text-neutral-400 font-light leading-relaxed max-w-[280px] mx-auto italic">
                  {isDreamSpaceResult ? 'A glimpse of your space in its most balanced state.' : 'Follow the guided plan to restore the balance.'}
                </p>
                {aiError && (
                  <p className="text-[11px] text-red-500 font-medium">{aiError}</p>
                )}
              </div>
              
              <div className="w-full max-w-sm mt-8 flex flex-col gap-4">
                {!isDreamSpaceResult && (
                  <Button 
                    onClick={() => { 
                      console.log("Navigating to step-focus..."); 
                      setCurrentStepIndex(0); 
                      setScreen('step-focus'); 
                    }} 
                    className="w-full py-6 text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl"
                  >
                    Start Organizing
                  </Button>
                )}
                <button onClick={() => setScreen('save-space')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8EA3A1] py-3 hover:text-[#2A2826] transition-colors">Save to Library</button>
              </div>
            </div>
          </div>
        );

      case 'step-focus':
        const currentStep = steps[currentStepIndex];
        return (
          <div className="flex flex-col h-full bg-white p-8 pt-24 animate-fade-in">
            <div className="flex-1 space-y-12 text-center">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#8EA3A1]">Step {currentStepIndex + 1} of {steps.length}</span>
                <h1 className="text-4xl font-light text-[#2A2826] leading-tight px-4">{currentStep?.title || 'Restore Order'}</h1>
                <div className="w-12 h-[1px] bg-neutral-100 mx-auto mt-6" />
              </div>
              <p className="text-lg text-neutral-400 font-light leading-relaxed px-6 italic">
                {currentStep?.description || 'Take a moment to center yourself before beginning.'}
              </p>
              
              {user?.settings.defaultFocusTime && (
                <div className="pt-10">
                   <div className="inline-flex items-center gap-3 px-6 py-3 bg-neutral-50 rounded-full border border-neutral-100">
                     <div className="w-2 h-2 rounded-full bg-[#8EA3A1] animate-pulse" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{user.settings.defaultFocusTime} Minute Focus Session</span>
                   </div>
                </div>
              )}
            </div>
            
            <div className="pb-16 px-4">
              <Button onClick={handleNextStep} className="w-full py-6 text-[11px] font-bold uppercase tracking-[0.3em]">
                {currentStepIndex === steps.length - 1 ? 'Finish Flow' : 'Next Step'}
              </Button>
              <button onClick={() => setScreen('home')} className="w-full mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">Cancel Session</button>
            </div>
          </div>
        );

      case 'completion':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-white p-12 text-center animate-fade-in">
            <div className="space-y-12">
              <Logo align="order" />
              <div className="space-y-4">
                <h1 className="text-3xl font-light text-[#2A2826]">Order Restored</h1>
                <p className="text-sm text-neutral-400 font-light px-8 leading-relaxed">The sanctuary is synchronized. Carry this peace forward.</p>
              </div>
            </div>
            <div className="mt-24 w-full max-w-xs">
              <Button onClick={() => setScreen('home')} className="w-full py-6 text-[11px] font-bold uppercase tracking-[0.3em]">Return to Home</Button>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] animate-fade-in">
            <div className="p-8 pt-20 flex-1 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('home')} className="p-2 -ml-2 text-[#2A2826]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <h1 className="text-2xl font-light text-[#2A2826] tracking-tight">Library</h1>
                </div>
              </div>
              
              {savedSpaces.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <p className="text-sm font-light italic">No spaces saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 pb-20">
                  {savedSpaces.map(space => (
                    <div key={space.id} className="space-y-3 relative group">
                      <div 
                        className="aspect-[3/4] bg-white rounded-[32px] overflow-hidden shadow-md border border-neutral-100 cursor-pointer relative hover:shadow-xl transition-all" 
                        onClick={() => handleLibraryItemClick(space)}
                      >
                        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-50">
                             <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingSpace(space);
                                  setRenameInput(space.name);
                                  setIsRenaming(true);
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-white/95 backdrop-blur-xl rounded-full shadow-xl text-[#2A2826] active:scale-90 transition-transform pointer-events-auto"
                             >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                             </button>
                             <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingSpace(space);
                                  setIsDeleting(true);
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-white/95 backdrop-blur-xl rounded-full shadow-xl text-red-500 active:scale-90 transition-transform pointer-events-auto"
                             >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                             </button>
                        </div>
                      </div>
                      <div className="px-1 flex items-center justify-between pointer-events-none">
                        <p className="text-[10px] font-bold text-[#2A2826] uppercase tracking-wider truncate flex-1">{space.name}</p>
                        <span className="text-[8px] text-neutral-300 font-medium">{space.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isRenaming && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-xs rounded-[40px] p-10 shadow-2xl space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-xl font-light text-[#2A2826]">Rename Space</h3>
                    <p className="text-xs text-neutral-400 font-light">Give this location a new identity.</p>
                  </div>
                  <input 
                    autoFocus
                    className="w-full border-b border-neutral-100 py-3 text-lg font-light focus:outline-none focus:border-[#8EA3A1] transition-colors"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                  />
                  <div className="flex flex-col gap-3">
                    <Button onClick={confirmRename} className="w-full py-4">Save Changes</Button>
                    <button onClick={() => setIsRenaming(false)} className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 py-2">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {isDeleting && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-xs rounded-[40px] p-10 shadow-2xl space-y-8 text-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-400">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </div>
                    <h3 className="text-xl font-light text-[#2A2826]">Delete this space?</h3>
                    <p className="text-xs text-neutral-400 font-light px-4">This action cannot be undone. All layout data for "{editingSpace?.name}" will be lost.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={confirmDelete} className="w-full py-5 bg-red-500 text-white rounded-full text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-500/20">Delete Permanently</button>
                    <button onClick={() => setIsDeleting(false)} className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 py-2">Keep Space</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-neutral-300 italic">
            <p>Screen not found.</p>
            <button onClick={() => setScreen('home')} className="mt-4 text-[10px] font-bold uppercase tracking-widest">Return Home</button>
          </div>
        );
    }
  };

  const animDuration = user?.settings.gentleAnimations ? '0.8s' : '0.3s';
  const animEasing = user?.settings.gentleAnimations ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'ease-out';

  return (
    <div className={`h-screen w-full max-w-md mx-auto relative shadow-2xl bg-[#FDFCFB] overflow-hidden border-x border-gray-50 flex flex-col ${user?.settings.largerText ? 'ordo-larger-text' : ''} ${user?.settings.highContrast ? 'ordo-high-contrast' : ''}`}>
      <div className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn ${animDuration} ${animEasing} forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Accessibility Overrides */
        .ordo-larger-text h1 { font-size: 115% !important; }
        .ordo-larger-text p { font-size: 110% !important; }
        .ordo-larger-text button { transform: scale(1.05); }
        
        .ordo-high-contrast { background-color: #ffffff !important; }
        .ordo-high-contrast .bg-[#FDFCFB] { background-color: #ffffff !important; }
        .ordo-high-contrast * { border-color: #00000033 !important; }
        .ordo-high-contrast p, .ordo-high-contrast span { color: #000000 !important; }
        .ordo-high-contrast .text-neutral-300, .ordo-high-contrast .text-neutral-400 { color: #333333 !important; }
        
        button {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default App;
