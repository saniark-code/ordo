import React, { useState, useEffect, useRef } from 'react';
import { Screen, SavedSpace, OrganizingStyle } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logo } from './components/Logo';
import { Button, Card } from './components/UI';
import { ONBOARDING_CONTENT, STYLE_OPTIONS } from './constants';

interface OrganizingStep {
  title: string;
  description: string;
}

const OrdoBackend = {
  dbName: 'OrdoDB',
  storeName: 'spaces',

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllSpaces(): Promise<SavedSpace[]> {
    const db = await this.init() as IDBDatabase;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => Number(b.id) - Number(a.id)));
      request.onerror = () => reject(request.error);
    });
  },

  async saveSpace(space: SavedSpace): Promise<void> {
    const db = await this.init() as IDBDatabase;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(space);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async updateSpace(id: string, updates: Partial<SavedSpace>): Promise<void> {
    const db = await this.init() as IDBDatabase;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = { ...getRequest.result, ...updates };
        store.put(data).onsuccess = () => resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  },

  async deleteSpace(id: string): Promise<void> {
    const db = await this.init() as IDBDatabase;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

const HOME_CATEGORIES = [
  { name: 'Dream Space', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>, screen: 'inspiration' },
  { name: 'Scan Workspace', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/><path d="M12 17v3"/></svg>, screen: 'scan' },
  { name: 'Wardrobe', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="18" height="20" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M3 7h18"/></svg>, screen: 'scan' },
  { name: 'Living Room', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>, screen: 'scan' },
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [inspirationPrompt, setInspirationPrompt] = useState('');
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize app - load spaces and show onboarding
  useEffect(() => {
    loadSpaces();
    const timer = setTimeout(() => setScreen('onboarding'), 2000);
    return () => clearTimeout(timer);
  }, []);

  // IndexedDB operations
  const loadSpaces = async () => {
    try {
      setIsSyncing(true);
      const spaces = await OrdoBackend.getAllSpaces();
      setSavedSpaces(spaces);
    } catch (e) {
      console.error("Failed to load spaces", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSpace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this space?")) {
      try {
        await OrdoBackend.deleteSpace(id);
        await loadSpaces();
      } catch (error) {
        console.error("Failed to delete space:", error);
        alert("Failed to delete space. Please try again.");
      }
    }
  };

  const handleSaveToLibrary = async () => {
    if (!afterImage) return;
    try {
      const space: SavedSpace = {
        id: Date.now().toString(),
        name: tempName || `Space ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        image: afterImage,
      };
      await OrdoBackend.saveSpace(space);
      await loadSpaces();
      setScreen('library');
    } catch (error) {
      console.error("Failed to save space:", error);
      alert("Failed to save space. Please try again.");
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

  // Helper function to call Gemini API directly
  const callGeminiAPI = async (type: 'inspiration' | 'processing', data: {
    imageData?: string;
    prompt: string;
    style?: string;
  }) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in .env.local. Please add it and restart the server.');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

      let result;

      if (type === 'inspiration') {
        // Text-to-image generation for Dream Space
        const systemInstruction = "You are a professional interior designer. Generate a high-resolution, professional interior design visualization. The image should be from an eye-level perspective, minimalist and clean, with no humans. Focus on the organized space described.";
        const fullPrompt = `${systemInstruction}\n\nUser's dream space: ${data.prompt}`;

        result = await model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }] }],
        });
      } else {
        // Image-to-image generation for processing
        const optimizedPrompt = `Professional organizer. Transform this BEFORE photo into an organized AFTER image.

Style: ${data.style}
- Calm Minimal: Sparse surfaces, hidden storage, neutral tones.
- Aesthetic: Curated displays, balanced colors.
- Practical: Items grouped by utility, visible but tidy storage.
- Compact: Maximum vertical space, nested items.

Requirements:
- Keep same furniture and perspective.
- Declutter: fold, stack, group loose items.
- Hide cables and visual noise.
- Clean surfaces, minimalist, no humans.
- Professional interior design visualization, eye-level perspective.

Then provide 5 organizing steps in JSON:
{
  "steps": [
    { "title": "Step 1", "description": "Description 1" },
    { "title": "Step 2", "description": "Description 2" },
    { "title": "Step 3", "description": "Description 3" },
    { "title": "Step 4", "description": "Description 4" },
    { "title": "Step 5", "description": "Description 5" }
  ]
}`;

        // Convert base64 data URL to base64 string if needed
        const base64Data = data.imageData?.includes(',') ? data.imageData.split(',')[1] : data.imageData || '';

        result = await model.generateContent({
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                { text: optimizedPrompt },
              ],
            },
          ],
        });
      }

      // Parse response
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];

      let generatedImage = null;
      let generatedText = '';
      let steps = null;

      for (const part of parts) {
        if (part.inlineData) {
          generatedImage = `data:image/jpeg;base64,${part.inlineData.data}`;
        } else if (part.text) {
          generatedText += part.text;
        }
      }

      // Try to parse steps from text if it's JSON
      if (generatedText) {
        try {
          const jsonMatch = generatedText.match(/\{[\s\S]*"steps"[\s\S]*\}/);
          if (jsonMatch) {
            steps = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse steps JSON:', e);
        }
      }

      return {
        success: true,
        image: generatedImage,
        text: generatedText,
        steps: steps?.steps || null,
      };
    } catch (error: any) {
      console.error('❌ Gemini API error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Parse error if it's a JSON string
      if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error) {
            throw new Error(parsed.error.message || parsed.error);
          }
        } catch (e) {
          // Not JSON, use original message
        }
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleProcessing = async (style: OrganizingStyle) => {
    setSelectedStyle(style);
    setScreen('processing');
    
    try {
      if (!capturedImage) {
        throw new Error("No image data available");
      }

      // Optimize image: compress and resize if too large
      let base64Data = capturedImage.split(',')[1];
      if (base64Data.length > 500000) {
        console.log("Image is large, compressing for faster processing...");
        const img = new Image();
        img.src = capturedImage;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        const canvas = document.createElement('canvas');
        const maxDimension = 1024;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          base64Data = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        }
      }

      const prompt = `Professional organizer. Transform this BEFORE photo into an organized AFTER image.

Style: ${style}
- Calm Minimal: Sparse surfaces, hidden storage, neutral tones.
- Aesthetic: Curated displays, balanced colors.
- Practical: Items grouped by utility, visible but tidy storage.
- Compact: Maximum vertical space, nested items.

Requirements:
- Keep same furniture and perspective.
- Declutter: fold, stack, group loose items.
- Hide cables and visual noise.
- Clean surfaces, minimalist, no humans.
- Professional interior design visualization, eye-level perspective.

Then provide 5 organizing steps in JSON:
{
  "steps": [
    { "title": "Step 1", "description": "Description 1" },
    { "title": "Step 2", "description": "Description 2" },
    { "title": "Step 3", "description": "Description 3" },
    { "title": "Step 4", "description": "Description 4" },
    { "title": "Step 5", "description": "Description 5" }
  ]
}`;

      const startTime = Date.now();
      const result = await callGeminiAPI('processing', {
        imageData: base64Data,
        prompt,
        style,
      });
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ API call completed in ${elapsedTime}s`);

      const parsedSteps: OrganizingStep[] = result.steps || [];
      
      setAfterImage(result.image || capturedImage);
      setSteps(parsedSteps.length === 5 ? parsedSteps : [
        { title: "Define Functional Zones", description: "Identify primary purposes for each surface area." },
        { title: "Align and Rectify", description: "Straighten objects to parallel the furniture lines." },
        { title: "Fold and Stack", description: "Gather loose fabrics into uniform compact shapes." },
        { title: "Manage Visual Noise", description: "Conceal cables behind larger structural pieces." },
        { title: "Final Polish", description: "Wipe surfaces to emphasize new clean lines." }
      ]);
      setScreen('result');
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      const errorMsg = error?.message || error?.error || "Unknown error occurred";
      
      if (errorMsg.includes("quota") || errorMsg.includes("429")) {
        alert(`⚠️ API Quota Exceeded\n\nPlease wait a minute and try again.`);
      } else if (errorMsg.includes("API key not valid") || errorMsg.includes("INVALID_ARGUMENT")) {
        alert(`⚠️ API Authentication Error\n\n${errorMsg}\n\nPlease check your GEMINI_API_KEY in .env.local`);
      } else {
        alert(`⚠️ Image Generation Failed\n\n${errorMsg}`);
      }
      
      setAfterImage(capturedImage);
      setScreen('result');
    }
  };
  
  

  const handleGenerateInspiration = async () => {
    if (!inspirationPrompt.trim()) {
      alert("Please describe your dream space.");
      return;
    }

    setIsGeneratingInspiration(true);
    setScreen('processing');
    
    try {
      const result = await callGeminiAPI('inspiration', {
        prompt: inspirationPrompt,
      });

      if (!result.image) {
        throw new Error("No image generated");
      }

      setAfterImage(result.image);
      setCapturedImage(result.image);
      setViewMode('after');
      setSteps([
        { title: "Visualize Your Space", description: "This is your dream space visualization. Use it as inspiration for organizing." },
        { title: "Identify Key Elements", description: "Note the organizational principles shown in this design." },
        { title: "Plan Your Layout", description: "Consider how to apply these concepts to your actual space." },
        { title: "Start Small", description: "Begin with one area that matches this vision." },
        { title: "Maintain Progress", description: "Keep this image as a reference for your organizing journey." }
      ]);
      setSelectedStyle('Aesthetic');
      setIsGeneratingInspiration(false);
      setScreen('result');
    } catch (error: any) {
      console.error("Inspiration generation failed:", error);
      const errorMsg = error?.message || error?.error || "Unknown error occurred";
      
      if (errorMsg.includes("API key not valid") || errorMsg.includes("INVALID_ARGUMENT")) {
        alert(`⚠️ API Authentication Error\n\n${errorMsg}\n\nPlease check your GEMINI_API_KEY in .env.local`);
      } else {
        alert(`⚠️ Failed to generate inspiration image\n\n${errorMsg}`);
      }
      setIsGeneratingInspiration(false);
      setScreen('inspiration');
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
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <h1 className="text-3xl font-light text-[#2A2826] leading-tight">Restore order to<br/>your space.</h1>
                  {isSyncing && <p className="text-[10px] text-[#8EA3A1] font-bold uppercase tracking-widest animate-pulse">Syncing...</p>}
                </div>
                <button onClick={() => setScreen('library')} className="p-3 bg-white shadow-sm border border-neutral-100 rounded-full active:scale-95 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A2826" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-12">
                {HOME_CATEGORIES.map((cat) => (
                  <Card 
                    key={cat.name} 
                    onClick={() => (cat as any).screen ? setScreen((cat as any).screen as Screen) : setScreen('scan')} 
                    className="aspect-square flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className={`text-[#2A2826] opacity-30 mb-4 ${cat.name === 'Dream Space' ? 'text-[#8EA3A1]' : ''}`}>{cat.icon}</div>
                    <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${cat.name === 'Dream Space' ? 'text-[#8EA3A1]' : 'text-[#2A2826]'}`}>{cat.name}</span>
                  </Card>
                ))}
              </div>
              {savedSpaces.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-neutral-300 px-2">Recent Library</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {savedSpaces.slice(0, 3).map(space => (
                      <div key={space.id} className="flex-shrink-0 w-48 h-60 bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-50 relative cursor-pointer" onClick={() => { setAfterImage(space.image); setCapturedImage(space.image); setViewMode('after'); setScreen('result'); }}>
                        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
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
              <button onClick={() => setScreen('home')} className="absolute top-14 left-8 text-white p-3 z-30 bg-black/20 backdrop-blur-md rounded-full">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB]">
            <div className="flex-1 overflow-hidden relative">
               <img src={capturedImage!} className="w-full h-full object-cover" alt="Captured" />
            </div>
            <div className="p-10 space-y-8">
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
          <div className="flex flex-col h-full bg-[#FDFCFB] p-8 pt-20">
            <h1 className="text-3xl font-light text-[#2A2826] mb-8">Select Style</h1>
            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
              {STYLE_OPTIONS.map((style) => (
                <Card key={style.title} onClick={() => handleProcessing(style.title as OrganizingStyle)} className="p-6 border border-neutral-50 hover:border-[#8EA3A1]/30 transition-all active:scale-[0.98]">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[#2A2826] mb-1">{style.title}</h3>
                  <p className="text-xs text-neutral-400 font-light">{style.description}</p>
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
              {isGeneratingInspiration ? (
                <>
                  <p className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: '#8EA3A1' }}>Dreaming of order...</p>
                  <div className="flex justify-center gap-1.5">
                    <div className="w-1 h-1 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: '#8EA3A1' }} />
                    <div className="w-1 h-1 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: '#8EA3A1' }} />
                    <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: '#8EA3A1' }} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-neutral-300">Applying {selectedStyle}</p>
                  <div className="flex justify-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 rounded-full bg-neutral-200 animate-bounce" />
                  </div>
                  <p className="text-xs text-neutral-300 font-light italic mt-6">Our AI is rearranging your belongings with care.</p>
                </>
              )}
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="flex flex-col h-full bg-white overflow-hidden relative">
            <div className="relative w-full h-[55vh] flex-shrink-0 z-10 border-b border-neutral-100">
              <CompareSlider before={capturedImage!} after={afterImage || capturedImage!} viewMode={viewMode} />
              <div className="absolute top-14 left-8 z-30">
                <button onClick={() => setScreen('home')} className="p-3 bg-black/10 backdrop-blur-3xl rounded-full text-white border border-white/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              </div>
              <div className="absolute bottom-8 left-0 w-full flex justify-center z-30">
                <div className="bg-[#1A1816]/60 backdrop-blur-3xl p-1.5 rounded-full flex gap-1.5 shadow-2xl border border-white/10 w-[240px]">
                  <button onClick={() => setViewMode('before')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${viewMode === 'before' ? 'bg-white text-[#1A1816]' : 'text-white/40'}`}>Before</button>
                  <button onClick={() => setViewMode('after')} className={`flex-1 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${viewMode === 'after' ? 'bg-white text-[#1A1816]' : 'text-white/40'}`}>After</button>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-white p-10 flex flex-col items-center justify-between z-20">
              <div className="space-y-4 text-center">
                <h1 className="text-[36px] font-light tracking-tight text-[#2A2826] leading-none">Potential, realized.</h1>
                <p className="text-[15px] text-neutral-400 font-light leading-relaxed max-w-[280px]">Follow the guided plan to restore the balance.</p>
              </div>
              <div className="w-full max-w-sm mt-8 flex flex-col gap-4">
                {steps.length > 0 && <Button onClick={() => { setCurrentStepIndex(0); setScreen('step-focus'); }} className="w-full py-6">Start Organizing</Button>}
                <button onClick={handleSaveToLibrary} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8EA3A1] py-2">Save to Library</button>
              </div>
            </div>
          </div>
        );

      case 'step-focus':
        const currentStep = steps[currentStepIndex] || { title: "Restoring Order", description: "Follow the visual guide to arrange your items." };
        const isLastStep = currentStepIndex === 4;
        return (
          <div className="flex flex-col h-full bg-white">
            <div className="flex-1 px-8 pt-20 space-y-12">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8EA3A1] uppercase tracking-[0.3em]">Step {currentStepIndex + 1} of 5</span>
              </div>
              <div className="space-y-6">
                <h2 className="text-[34px] font-light text-[#2A2826] leading-tight">{currentStep.title}</h2>
                <p className="text-xl text-neutral-500 font-light leading-relaxed">{currentStep.description}</p>
              </div>
            </div>
            <div className="p-10 flex gap-4 bg-white border-t border-neutral-50 pb-14">
              <button onClick={() => currentStepIndex > 0 ? setCurrentStepIndex(v => v - 1) : setScreen('result')} className="flex-1 py-6 rounded-3xl bg-neutral-50 text-[11px] font-bold uppercase tracking-widest text-neutral-400">Back</button>
              <button onClick={() => isLastStep ? handleSaveToLibrary() : setCurrentStepIndex(v => v + 1)} className="flex-[2] py-6 rounded-3xl bg-[#2A2826] text-white text-[11px] font-bold uppercase tracking-widest">{isLastStep ? 'Complete' : 'Next'}</button>
            </div>
          </div>
        );

      case 'inspiration':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB]">
            <div className="p-8 pt-20 flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-md space-y-12">
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-light text-[#2A2826] leading-tight">Dream your space.</h1>
                  <p className="text-sm text-gray-400 font-light">Describe your ideal organized space, and we'll visualize it.</p>
                </div>
                
                <div className="space-y-6">
                  <textarea
                    value={inspirationPrompt}
                    onChange={(e) => setInspirationPrompt(e.target.value)}
                    placeholder="e.g., A Japandi kitchen with stone textures and hidden appliances"
                    className="w-full min-h-[120px] p-6 rounded-3xl border border-neutral-100 bg-white text-[#2A2826] text-base font-light placeholder:text-neutral-300 focus:outline-none focus:border-[#8EA3A1] focus:ring-2 focus:ring-[#8EA3A1]/20 transition-all resize-none"
                    autoFocus
                  />
                  
                  <Button 
                    onClick={handleGenerateInspiration} 
                    className="w-full py-6"
                    style={{ backgroundColor: inspirationPrompt.trim() ? '#8EA3A1' : undefined }}
                  >
                    Generate Dream Space
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-8 pb-12">
              <button 
                onClick={() => setScreen('home')} 
                className="w-full py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-300"
              >
                Back to Home
              </button>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="flex flex-col h-full bg-[#FDFCFB]">
            <div className="p-8 pt-20 flex-1 overflow-y-auto no-scrollbar">
              <div className="flex items-center gap-4 mb-10">
                <button onClick={() => setScreen('home')} className="p-2 -ml-2 text-[#2A2826]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h1 className="text-2xl font-light text-[#2A2826]">Library</h1>
              </div>
              {savedSpaces.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <p className="text-sm font-light italic">No spaces saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 pb-20">
                  {savedSpaces.map(space => (
                    <div key={space.id} className="space-y-3 group">
                      <div className="aspect-[3/4] bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-100 cursor-pointer relative" onClick={() => { setAfterImage(space.image); setCapturedImage(space.image); setViewMode('after'); setScreen('result'); }}>
                        <img src={space.image} className="w-full h-full object-cover" alt={space.name} />
                        <button
                          onClick={(e) => handleDeleteSpace(space.id, e)}
                          className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                          aria-label="Delete space"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-[#2A2826] uppercase tracking-wider truncate px-1">{space.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto relative shadow-2xl bg-[#FDFCFB] overflow-hidden border-x border-gray-50 flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
