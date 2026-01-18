
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Screen, SavedSpace, OrganizingStyle } from './types';
import { Logo } from './components/Logo';
import { Button, Card } from './components/UI';
import { ONBOARDING_CONTENT, STYLE_OPTIONS } from './constants';

interface OrganizingStep {
  title: string;
  description: string;
}

const MAX_SAVED_SPACES = 8; // Limit to prevent QuotaExceededError

const HOME_CATEGORIES = [
  { name: 'Living Room', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg> },
  { name: 'Workspace', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/><path d="M12 17v3"/></svg> },
  { name: 'Bedroom', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18a2 2 0 0 1 2 2v11"/><path d="M3 7v13"/><path d="M2 17h20"/><path d="M18 7v2"/><path d="M6 7v2"/></svg> },
  { name: 'Wardrobe', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="18" height="20" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M3 7h18"/></svg> },
];

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

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-1000 ${viewMode === 'after' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="px-8 py-4 bg-[#D2BEAA]/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl">
          <span className="text-white text-[10px] uppercase tracking-[0.4em] font-bold drop-shadow-md">
            AI-GENERATED VISUALIZATION
          </span>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<OrganizingStyle>('Calm Minimal');
  const [viewMode, setViewMode] = useState<'after' | 'before'>('after');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OrganizingStep[]>([]);
  const [savedSpaces, setSavedSpaces] = useState<SavedSpace[]>([]);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ordo_saved_spaces');
    if (saved) {
      try {
        setSavedSpaces(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved spaces", e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ordo_saved_spaces', JSON.stringify(savedSpaces));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("Storage quota exceeded. Removing oldest space.");
        if (savedSpaces.length > 0) {
          setSavedSpaces(prev => prev.slice(0, prev.length - 1));
        }
      }
    }
  }, [savedSpaces]);

  useEffect(() => {
    const timer = setTimeout(() => setScreen('onboarding'), 2000);
    return () => clearTimeout(timer);
  }, []);

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
          alert("Please enable camera permissions to scan your space.");
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
      // Downscale for performance and storage
      const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Using JPEG with quality compression to save space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        setScreen('confirmation');
      }
    }
  };

  const handleProcessing = async (style: OrganizingStyle) => {
    setSelectedStyle(style);
    setScreen('processing');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = capturedImage?.split(',')[1];
      if (!base64Data) throw new Error("No image data");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: `You are a world-class professional organizer and interior designer.  

Input: a BEFORE photo of a real space (desk, room, or shelf).
Style selected: ${style}.

Task 1: Generate a high-fidelity AFTER image based on the input style.
- Reorganize the same space, keeping all furniture and major items in place.
- Style implementation for '${style}':
  - Calm Minimal: Sparse surfaces, hidden storage, neutral tones, extreme decluttering.
  - Aesthetic: Curated displays, balanced colors, intentional arrangement of decorative objects.
  - Practical: Efficiency focused, items grouped by utility, labels where appropriate, visible but tidy storage.
  - Compact: Maximum usage of vertical space, nested items, minimal visual bulk.
- Deeply declutter: fold, stack, group, or store loose items.
- Hide cables, small objects, and visual noise.
- Maintain negative space and clean surfaces.
- Preserve realism: same perspective, furniture, walls, and natural lighting.

Task 2: Generate exactly 5 actionable organizing steps:
- Each step must reference specific visible items, surfaces, or areas from the image.
- Provide a calm, human, minimal tone.
- Each step must have:
  - title: short phrase (max 4 words)
  - description: 1-2 concise sentences (max 12 words)
- Steps should be sequential.

Output JSON format for steps:
{
  "steps": [
    { "title": "Step 1 title", "description": "Step 1 description" },
    { "title": "Step 2 title", "description": "Step 2 description" },
    { "title": "Step 3 title", "description": "Step 3 description" },
    { "title": "Step 4 title", "description": "Step 4 description" },
    { "title": "Step 5 title", "description": "Step 5 description" }
  ]
}` }
          ]
        }
      });

      let genImg = null;
      let genTxt = "";
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          genImg = `data:image/jpeg;base64,${part.inlineData.data}`;
        } else if (part.text) {
          genTxt += part.text;
        }
      }

      let parsedSteps: OrganizingStep[] = [];
      try {
        const jsonMatch = genTxt.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          parsedSteps = data.steps || [];
        }
      } catch (e) {
        console.error("JSON parse failed", e);
      }

      setAfterImage(genImg || capturedImage);
      setSteps(parsedSteps.length === 5 ? parsedSteps : [
        { title: "Define Functional Zones", description: "Identify primary purposes for each surface area." },
        { title: "Align and Rectify", description: "Straighten objects to parallel the furniture lines." },
        { title: "Fold and Stack", description: "Gather loose fabrics into uniform compact shapes." },
        { title: "Manage Visual Noise", description: "Conceal cables behind larger structural pieces." },
        { title: "Final Polish", description: "Wipe surfaces to emphasize new clean lines." }
      ]);
      setScreen('result');
    } catch (error) {
      console.error("AI Generation failed:", error);
      setAfterImage(capturedImage);
      setTimeout(() => setScreen('result'), 1500);
    }
  };

  const handleSaveToLibrary = () => {
    if (!afterImage) return;
    const newSpace: SavedSpace = {
      id: Date.now().toString(),
      name: `Space ${savedSpaces.length + 1}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      image: afterImage,
    };
    
    // Maintain a rolling library limit
    const updatedSpaces = [newSpace, ...savedSpaces].slice(0, MAX_SAVED_SPACES);
    setSavedSpaces(updatedSpaces);
    setScreen('home');
  };

  const handleRename = () => {
    if (!editingSpaceId || !tempName.trim()) return;
    setSavedSpaces(savedSpaces.map(s => s.id === editingSpaceId ? { ...s, name: tempName } : s));
    setEditingSpaceId(null);
    setTempName('');
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

      case 'onboarding':
        return (
          <div className="flex flex-col items-center justify-between h-full p-8 pb-16 text-center bg-white">
            <div className="w-full pt-16 flex flex-col items-center space-y-10">
              <Logo align={onboardingStep === 0 ? 'chaos' : 'order'} />
              <div className="space-y-4 px-4">
                <h1 className="text-2xl font-light text-[#2A2826] animate-fade-in">{ONBOARDING_CONTENT[onboardingStep].title}</h1>
                <p className="text-sm text-gray-400 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>{ONBOARDING_CONTENT[onboardingStep].description}</p>
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
            <div className="p-8 pt-20 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <h1 className="text-3xl font-light text-[#2A2826] leading-tight">Restore order to<br/>your space.</h1>
                <button onClick={() => setScreen('library')} className="p-3 bg-white shadow-sm border border-neutral-100 rounded-full active:scale-95 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A2826" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-12">
                {HOME_CATEGORIES.map((cat) => (
                  <Card key={cat.name} onClick={() => setScreen('scan')} className="aspect-square flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-[#2A2826] opacity-30 mb-4">{cat.icon}</div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2A2826]">{cat.name}</span>
                  </Card>
                ))}
              </div>
              {savedSpaces.length > 0 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-neutral-300">Recent Spaces</h2>
                    <button onClick={() => setScreen('library')} className="text-[10px] font-bold text-[#8EA3A1] uppercase tracking-wider">See all</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {savedSpaces.slice(0, 3).map(space => (
                      <div key={space.id} className="flex-shrink-0 w-48 h-60 bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-50 relative group cursor-pointer" onClick={() => { setAfterImage(space.image); setCapturedImage(space.image); setViewMode('after'); setScreen('result'); }}>
                        <img src={space.image} className="w-full h-full object-cover opacity-90 transition-opacity" alt={space.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-6">
                          <p className="text-white text-[10px] font-bold tracking-[0.1em]">{space.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 pb-12">
               <Button onClick={() => setScreen('scan')} className="w-full py-6">Begin New Scan</Button>
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="relative h-full bg-black overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="relative z-20 h-full flex flex-col items-center justify-between p-12 py-24">
              <p className="text-white text-[11px] tracking-[0.4em] uppercase font-bold opacity-70">Point at your space</p>
              <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-[5px] border-white p-1.5 active:scale-90 transition-all duration-300">
                <div className="w-full h-full rounded-full bg-white shadow-xl" />
              </button>
              <div className="h-4" />
            </div>
            <button onClick={() => setScreen('home')} className="absolute top-14 left-8 text-white p-3 z-30 bg-black/20 backdrop-blur-md rounded-full active:scale-90 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          </div>
        );

      case 'confirmation':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB]">
            <div className="flex-1 overflow-hidden relative">
               <img src={capturedImage!} className="w-full h-full object-cover" alt="Captured" />
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <h2 className="text-[28px] font-light text-[#2A2826] leading-tight">Reveal potential?</h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed">Ordo will visually organize your items to reveal a calmer version of this space.</p>
              </div>
              <div className="flex gap-4 pb-4">
                <Button onClick={() => setScreen('scan')} variant="secondary" className="flex-1 py-5">Retake</Button>
                <Button onClick={() => setScreen('style-selection')} className="flex-[2] py-5">Continue</Button>
              </div>
            </div>
          </div>
        );

      case 'style-selection':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] p-8 pt-20">
            <div className="mb-12">
              <h1 className="text-3xl font-light text-[#2A2826] mb-4">Select Style</h1>
              <p className="text-sm text-gray-400 font-light">Choose how Ordo should interpret your space.</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-10">
              {STYLE_OPTIONS.map((style) => (
                <Card 
                  key={style.title} 
                  onClick={() => handleProcessing(style.title as OrganizingStyle)}
                  className="p-6 border border-neutral-50 hover:border-[#8EA3A1]/30 transition-all group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold tracking-widest uppercase text-[#2A2826]">{style.title}</h3>
                      <p className="text-xs text-neutral-400 font-light">{style.description}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center group-hover:bg-[#8EA3A1] group-hover:text-white transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <button onClick={() => setScreen('confirmation')} className="py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-300">Back to photo</button>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-12 bg-white">
            <div className="animate-pulse scale-125"><Logo align="order" /></div>
            <div className="text-center space-y-4 px-12">
              <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-neutral-300">Applying {selectedStyle}</p>
              <div className="flex justify-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce" />
              </div>
              <p className="text-xs text-neutral-300 font-light italic mt-6">Our AI is rearranging your belongings with care.</p>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="flex flex-col h-full bg-white overflow-hidden relative">
            <div className="relative w-full h-[55vh] flex-shrink-0 z-10 border-b border-neutral-100">
              <CompareSlider before={capturedImage!} after={afterImage || capturedImage!} viewMode={viewMode} />
              <div className="absolute top-14 left-8 z-30">
                <button onClick={() => setScreen('home')} className="p-3 bg-black/10 backdrop-blur-3xl rounded-full text-white active:scale-90 transition-transform border border-white/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              </div>
              <div className="absolute bottom-8 left-0 w-full flex justify-center z-30">
                <div className="bg-[#1A1816]/60 backdrop-blur-3xl p-1.5 rounded-full flex gap-1.5 shadow-2xl border border-white/10 w-[240px]">
                  <button onClick={() => setViewMode('before')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500 ${viewMode === 'before' ? 'bg-white text-[#1A1816] shadow-xl' : 'text-white/40'}`}>Before</button>
                  <button onClick={() => setViewMode('after')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500 ${viewMode === 'after' ? 'bg-white text-[#1A1816] shadow-xl' : 'text-white/40'}`}>After</button>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-white p-10 flex flex-col items-center justify-between z-20">
              <div className="space-y-4 text-center">
                <h1 className="text-[36px] font-light tracking-tight text-[#2A2826] leading-none">Potential, realized.</h1>
                <p className="text-[15px] text-neutral-400 font-light leading-relaxed max-w-[280px]">Follow the {selectedStyle.toLowerCase()} guided plan to restore the balance.</p>
              </div>
              <div className="w-full max-w-sm mt-8 pb-6 flex flex-col gap-4">
                <Button onClick={() => { setCurrentStepIndex(0); setScreen('step-focus'); }} className="w-full py-6">Start Organizing</Button>
                <button onClick={handleSaveToLibrary} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8EA3A1] py-2">Save to Library</button>
              </div>
            </div>
          </div>
        );

      case 'step-focus':
        const currentStep = steps[currentStepIndex] || { title: "Restoring Order", description: "Follow the visual guide to arrange your items with care." };
        const isLastStep = currentStepIndex === 4;
        return (
          <div className="flex flex-col h-full bg-white">
            <div className="flex-1 px-8 pt-20 space-y-12 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8EA3A1] uppercase tracking-[0.3em]">Step {currentStepIndex + 1} of 5</span>
                <div className="flex gap-2">
                  {[0,1,2,3,4].map(i => <div key={i} className={`w-5 h-1.5 rounded-full transition-all duration-700 ${i <= currentStepIndex ? 'bg-[#8EA3A1]' : 'bg-neutral-100'}`} />)}
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-[34px] font-light text-[#2A2826] leading-tight">{currentStep.title}</h2>
                <p className="text-xl text-neutral-500 font-light leading-relaxed">{currentStep.description}</p>
              </div>
              <div className="aspect-[4/5] bg-[#FDFCFB] rounded-[48px] border border-neutral-100 flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-[#8EA3A1] to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl border border-neutral-50">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2A2826" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-neutral-400">View Transformation</span>
                </div>
              </div>
            </div>
            <div className="p-10 flex gap-4 bg-white/95 backdrop-blur-md border-t border-neutral-50 pb-14">
              <button onClick={() => currentStepIndex > 0 ? setCurrentStepIndex(v => v - 1) : setScreen('result')} className="flex-1 py-6 rounded-3xl bg-neutral-50 text-[11px] font-bold uppercase tracking-widest text-neutral-400">Back</button>
              <button onClick={() => isLastStep ? handleSaveToLibrary() : setCurrentStepIndex(v => v + 1)} className="flex-[2] py-6 rounded-3xl bg-[#2A2826] text-white text-[11px] font-bold uppercase tracking-widest shadow-2xl">{isLastStep ? 'Complete & Save' : 'Next Phase'}</button>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB] relative">
            <div className="p-8 pt-20 flex-1 overflow-y-auto">
              <div className="flex items-center gap-4 mb-10">
                <button onClick={() => setScreen('home')} className="p-2 -ml-2 text-[#2A2826] active:scale-90 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h1 className="text-2xl font-light text-[#2A2826]">Library</h1>
              </div>
              {savedSpaces.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40 space-y-4">
                  <div className="p-6 bg-neutral-100 rounded-full">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  </div>
                  <p className="text-sm font-light italic">No spaces saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 pb-20">
                  {savedSpaces.map(space => (
                    <div key={space.id} className="space-y-3 relative group">
                      <div className="aspect-[3/4] bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-100 cursor-pointer active:scale-95 transition-transform" onClick={() => { setAfterImage(space.image); setCapturedImage(space.image); setViewMode('after'); setScreen('result'); }}>
                        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
                      </div>
                      <div className="px-2 flex justify-between items-start">
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-[#2A2826] uppercase tracking-wider truncate max-w-[100px]">{space.name}</p>
                          <p className="text-[10px] text-neutral-400 font-medium tracking-tight mt-0.5">{space.date}</p>
                        </div>
                        <button onClick={() => { setEditingSpaceId(space.id); setTempName(space.name); }} className="p-1.5 opacity-40 hover:opacity-100 transition-opacity">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {editingSpaceId && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 bg-black/20 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full rounded-[48px] p-10 shadow-2xl border border-neutral-100 animate-slide-up">
                  <h3 className="text-xl font-light text-[#2A2826] mb-8">Rename space</h3>
                  <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} autoFocus className="w-full border-b border-neutral-200 py-3 text-lg font-light text-[#2A2826] focus:outline-none focus:border-[#2A2826] transition-colors mb-10" />
                  <div className="flex gap-4">
                    <button onClick={() => setEditingSpaceId(null)} className="flex-1 py-5 rounded-3xl bg-neutral-50 text-[11px] font-bold uppercase tracking-widest text-neutral-400">Cancel</button>
                    <button onClick={handleRename} className="flex-[2] py-5 rounded-3xl bg-[#2A2826] text-white text-[11px] font-bold uppercase tracking-widest">Update</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div className="p-12 text-center h-full flex items-center justify-center font-light text-gray-400 italic">Restoring balance...</div>;
    }
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto relative shadow-2xl bg-[#FDFCFB] overflow-hidden border-x border-gray-50 flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
