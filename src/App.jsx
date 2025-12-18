import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  Home, 
  BookOpen, 
  Apple, 
  Gamepad2, 
  CheckCircle2, 
  ArrowLeft, 
  Volume2, 
  Award,
  Circle,
  Square,
  Triangle,
  User,
  Zap,
  Heart,
  Music,
  CloudSun,
  Wind,
  Moon,
  Sun,
  Smile,
  Frown
} from 'lucide-react';

const apiKey = ""; // Runtime provides the key

// --- TTS UTILS & DEBBUGED AUDIO LOGIC ---
const pcmToWav = (pcmData, sampleRate) => {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 32 + pcmData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Format: PCM
  view.setUint16(22, 1, true); // Channels: Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length * 2, true);

  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
};

// --- GLOBAL AUDIO REFERENCE TO PREVENT OVERLAP ---
let globalAudio = null;

const speakText = async (text, retries = 5, backoff = 1000) => {
  // Stop any existing audio
  if (globalAudio) {
    globalAudio.pause();
    globalAudio = null;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Say clearly and happily for a nursery child: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
        }
      })
    });

    if (!response.ok) throw new Error(`TTS API failed with status ${response.status}`);

    const result = await response.json();
    const part = result.candidates?.[0]?.content?.parts?.[0];
    const audioBase64 = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || "audio/L16;rate=24000";
    
    // Extract sample rate from mimeType if available
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;

    if (audioBase64) {
      const binaryString = atob(audioBase64);
      const len = binaryString.length;
      const pcmData = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        pcmData[i / 2] = binaryString.charCodeAt(i) | (binaryString.charCodeAt(i + 1) << 8);
      }
      const wavBlob = pcmToWav(pcmData, sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);
      globalAudio = new Audio(audioUrl);
      globalAudio.play().catch(e => console.warn("Audio play blocked by browser:", e));
    }
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, backoff));
      return speakText(text, retries - 1, backoff * 2);
    }
    console.error("Final TTS Error after retries:", err);
  }
};

// --- EXTENDED GAME CONTENT ---
const GAMES = {
  literacy: [
    { id: 'l1', type: 'matching', question: 'Find the letter for Apple!', options: ['A', 'B', 'C'], answer: 'A', icon: '🍎' },
    { id: 'l2', type: 'matching', question: 'Find the letter for Ball!', options: ['D', 'B', 'P'], answer: 'B', icon: '⚽' },
    { id: 'l3', type: 'matching', question: 'Find the letter for Cat!', options: ['C', 'G', 'K'], answer: 'C', icon: '🐱' },
    { id: 'l4', type: 'matching', question: 'Find the letter for Dog!', options: ['B', 'D', 'E'], answer: 'D', icon: '🐶' },
    { id: 'l5', type: 'matching', question: 'Find the letter for Elephant!', options: ['F', 'H', 'E'], answer: 'E', icon: '🐘' },
    { id: 'l6', type: 'matching', question: 'Find the letter for Fish!', options: ['F', 'V', 'L'], answer: 'F', icon: '🐟' },
    { id: 'l7', type: 'matching', question: 'Find the letter for Grapes!', options: ['J', 'G', 'C'], answer: 'G', icon: '🍇' },
    { id: 'l8', type: 'matching', question: 'Find the letter for Hat!', options: ['M', 'S', 'H'], answer: 'H', icon: '👒' },
    { id: 'l9', type: 'matching', question: 'Find the letter for Ice Cream!', options: ['L', 'I', 'O'], answer: 'I', icon: '🍦' },
    { id: 'l10', type: 'matching', question: 'Find the letter for Jam!', options: ['J', 'K', 'L'], answer: 'J', icon: '🍓' },
  ],
  numeracy: [
    { id: 'n1', type: 'counting', question: 'How many stars can you see?', count: 3, options: [2, 3, 5], answer: 3, icon: <Star className="fill-amber-400 text-amber-400" /> },
    { id: 'n2', type: 'shapes', question: 'Touch the Circle!', options: ['Circle', 'Square', 'Triangle'], answer: 'Circle', icons: [<Circle />, <Square />, <Triangle />] },
    { id: 'n3', type: 'counting', question: 'Count the yummy apples!', count: 5, options: [3, 4, 5], answer: 5, icon: '🍎' },
    { id: 'n4', type: 'shapes', question: 'Which one is a Square?', options: ['Triangle', 'Square', 'Circle'], answer: 'Square', icons: [<Triangle className="text-blue-500" />, <Square className="text-red-500" />, <Circle className="text-green-500" />] },
    { id: 'n5', type: 'counting', question: 'How many fingers are here?', count: 2, options: [1, 2, 3], answer: 2, icon: '✌️' },
    { id: 'n6', type: 'counting', question: 'Count the little birds!', count: 4, options: [4, 6, 2], answer: 4, icon: '🐦' },
    { id: 'n7', type: 'shapes', question: 'Which one is a Triangle?', options: ['Square', 'Circle', 'Triangle'], answer: 'Triangle', icons: [<Square />, <Circle />, <Triangle className="text-indigo-500" />] },
    { id: 'n8', type: 'counting', question: 'How many balloons are flying?', count: 6, options: [4, 6, 8], answer: 6, icon: '🎈' },
  ],
  evs: [
    { id: 'e1', type: 'sorting', question: 'Is this a Fruit or a Vegetable?', item: 'Apple', category: 'Fruit', options: ['Fruit', 'Vegetable'], icon: '🍎' },
    { id: 'e2', type: 'sorting', question: 'Is the Lion a Wild or Domestic animal?', item: 'Lion', category: 'Wild', options: ['Wild', 'Domestic'], icon: '🦁' },
    { id: 'e3', type: 'transport', question: 'Which one flies in the sky?', options: ['Car', 'Plane', 'Bus'], answer: 'Plane', icons: ['🚗', '✈️', '🚌'] },
    { id: 'e4', type: 'sorting', question: 'Is the Cow a Wild or Domestic animal?', category: 'Domestic', options: ['Wild', 'Domestic'], icon: '🐮' },
    { id: 'e5', type: 'transport', question: 'Which one moves on the road?', options: ['Boat', 'Ship', 'Car'], answer: 'Car', icons: ['🚤', '🚢', '🚗'] },
    { id: 'e6', type: 'nature', question: 'Which one do you see at night?', options: ['Sun', 'Moon', 'Cloud'], answer: 'Moon', icons: ['☀️', '🌙', '☁️'] },
    { id: 'e7', type: 'weather', question: 'Which one is for a Rainy day?', options: ['Sunglasses', 'Umbrella', 'Coat'], answer: 'Umbrella', icons: ['🕶️', '☂️', '🧥'] },
    { id: 'e8', type: 'sorting', question: 'Is Broccoli a Fruit or a Vegetable?', category: 'Vegetable', options: ['Fruit', 'Vegetable'], icon: '🥦' },
  ],
  body: [
    { id: 'b1', type: 'body', question: 'Point to the Eye!', options: ['Eye', 'Ear', 'Nose'], answer: 'Eye', icons: ['👁️', '👂', '👃'] },
    { id: 'b2', type: 'habit', question: 'Which is a good habit?', options: ['Washing Hands', 'Eating Junk'], answer: 'Washing Hands', icons: ['🧼', '🍔'] },
    { id: 'b3', type: 'body', question: 'Which one do we use to hear sounds?', options: ['Ear', 'Nose', 'Eye'], answer: 'Ear', icons: ['👂', '👃', '👁️'] },
    { id: 'b4', type: 'habit', question: 'Which is a healthy snack?', options: ['Pizza', 'Carrot'], answer: 'Carrot', icons: ['🍕', '🥕'] },
    { id: 'b5', type: 'body', question: 'Which part helps us walk?', options: ['Hand', 'Leg', 'Face'], answer: 'Leg', icons: ['✋', '🦶', '🧒'] },
    { id: 'b6', type: 'feeling', question: 'Which one is a Happy face?', options: ['Happy', 'Sad'], answer: 'Happy', icons: [<Smile className="text-amber-500 w-12 h-12" />, <Frown className="text-blue-400 w-12 h-12" />] },
    { id: 'b7', type: 'habit', question: 'What should we do to keep teeth clean?', options: ['Brushing', 'Sleeping'], answer: 'Brushing', icons: ['🪥', '😴'] },
  ]
};

const SYLLABUS_WORLDS = [
  { id: 'literacy', title: 'Alpha Forest', icon: <BookOpen />, color: 'bg-blue-400', desc: 'ABC & Phonics' },
  { id: 'numeracy', title: 'Number Sea', icon: <Star />, color: 'bg-purple-400', desc: '123 & Shapes' },
  { id: 'evs', title: 'Nature Park', icon: <CloudSun />, color: 'bg-orange-400', desc: 'Animals & Seasons' },
  { id: 'body', title: 'Body Temple', icon: <User />, color: 'bg-pink-400', desc: 'Me & My Body' }
];

const App = () => {
  const [screen, setScreen] = useState('welcome');
  const [currentWorld, setCurrentWorld] = useState(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // Initial silent interaction check or welcome sound
    // Note: Chrome often blocks audio until first user click.
  }, []);

  // Trigger voice when a new level starts
  useEffect(() => {
    if (screen === 'game' && currentWorld) {
      const level = GAMES[currentWorld.id][levelIndex];
      speakText(level.question);
    }
  }, [levelIndex, screen, currentWorld]);

  const handleStart = () => {
    setScreen('map');
    speakText("Welcome to Discovery Quest! Pick a world to start your adventure.");
  };

  const enterWorld = (world) => {
    setCurrentWorld(world);
    setLevelIndex(0);
    setScore(0);
    setScreen('game');
    speakText(`Entering ${world.title}! Let's learn about ${world.desc}.`);
  };

  const handleAnswer = (option) => {
    if (feedback) return;
    const currentLevel = GAMES[currentWorld.id][levelIndex];
    const isCorrect = option === currentLevel.answer || option === currentLevel.category;

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 1);
      speakText("Yay! That is correct! You are so smart!");
      setTimeout(() => {
        if (levelIndex < GAMES[currentWorld.id].length - 1) {
          setLevelIndex(levelIndex + 1);
          setFeedback(null);
        } else {
          speakText("Congratulations! You completed this world! You get a gold star!");
          setScreen('result');
        }
      }, 1800);
    } else {
      setFeedback('wrong');
      speakText("Uh oh! Let's try that again. You can do it!");
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  // --- RENDERING SCREENS ---

  if (screen === 'welcome') return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="relative mb-8">
        <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Award className="w-24 h-24 text-amber-300 drop-shadow-lg" />
        </div>
        <Star className="absolute top-0 right-0 w-10 h-10 text-yellow-300 animate-bounce" />
      </div>
      <h1 className="text-5xl font-black mb-2 tracking-tight">Discovery Quest</h1>
      <p className="text-indigo-100 text-lg opacity-80 mb-10">Nursery CBSE Learning Game</p>
      <button 
        onClick={handleStart} 
        className="px-12 py-5 bg-white text-indigo-600 rounded-full text-2xl font-black shadow-[0_10px_0_rgb(224,231,255)] active:translate-y-1 active:shadow-none transition-all transform hover:scale-105"
      >
        PLAY NOW
      </button>
    </div>
  );

  if (screen === 'map') return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm">
            <Gamepad2 className="text-indigo-500 w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Adventure Map</h2>
            <p className="text-slate-400 font-bold text-sm">CHOOSE YOUR WORLD</p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {SYLLABUS_WORLDS.map(world => (
            <button 
              key={world.id} 
              onClick={() => enterWorld(world)} 
              className="w-full group flex items-center gap-4 p-5 bg-white rounded-[2rem] shadow-sm border-b-4 border-slate-200 active:translate-y-1 active:border-b-0 transition-all hover:bg-slate-50"
            >
              <div className={`${world.color} p-4 rounded-[1.5rem] text-white group-hover:scale-110 transition-transform`}>
                {React.cloneElement(world.icon, { size: 32 })}
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-slate-800">{world.title}</h3>
                <p className="text-slate-500 text-sm font-medium">{world.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (screen === 'game') {
    const level = GAMES[currentWorld.id][levelIndex];
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white flex justify-between items-center shadow-sm rounded-b-3xl">
          <button onClick={() => setScreen('map')} className="p-2 bg-slate-100 rounded-full text-slate-600"><ArrowLeft /></button>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentWorld.title}</span>
            <div className="flex gap-1.5 mt-1">
              {GAMES[currentWorld.id].map((_, i) => (
                <div key={i} className={`h-2 w-4 rounded-full transition-all duration-300 ${i === levelIndex ? 'bg-indigo-500 w-8' : i < levelIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-black text-amber-700">{score}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center max-w-md mx-auto w-full space-y-6">
          <div className="bg-white p-8 rounded-[3rem] w-full shadow-sm text-center relative border-2 border-white group">
            <button 
              onClick={() => speakText(level.question)} 
              className="absolute top-6 right-6 p-2.5 bg-indigo-50 rounded-full text-indigo-500 active:scale-125 transition-transform"
              title="Repeat question"
            >
              <Volume2 className="w-6 h-6" />
            </button>
            
            <div className="text-8xl mb-6 drop-shadow-sm flex justify-center items-center h-32">
              {level.type === 'counting' ? (
                <div className="flex flex-wrap justify-center gap-3 px-4">
                  {[...Array(level.count)].map((_, i) => <span key={i} className="animate-in fade-in zoom-in" style={{animationDelay: `${i*100}ms`}}>{level.icon}</span>)}
                </div>
              ) : level.icons && !level.answer ? (
                <div className="animate-in zoom-in duration-500">{level.icon}</div>
              ) : (
                <div className="animate-in zoom-in duration-500">{level.icon}</div>
              )}
            </div>
            
            <h3 className="text-2xl font-black text-slate-700 leading-tight px-2">{level.question}</h3>
          </div>

          <div className="grid grid-cols-1 w-full gap-4 pb-8">
            {level.options.map((opt, i) => (
              <button 
                key={i} 
                disabled={feedback}
                onClick={() => handleAnswer(opt)}
                className={`
                  p-5 rounded-3xl text-2xl font-black border-b-[6px] flex items-center justify-between transition-all relative overflow-hidden
                  ${feedback === 'correct' && (opt === level.answer || opt === level.category) ? 'bg-emerald-500 text-white border-emerald-700 translate-y-1 border-b-0' : 
                    feedback === 'wrong' && opt !== level.answer && opt !== level.category ? 'bg-red-50 text-red-400 border-red-200' : 
                    'bg-white text-slate-700 border-slate-200 active:translate-y-1 active:border-b-2'}
                `}
              >
                <div className="flex items-center gap-5">
                  {level.icons && <span className="text-4xl">{level.icons[i]}</span>}
                  <span>{opt}</span>
                </div>
                {feedback === 'correct' && (opt === level.answer || opt === level.category) && <CheckCircle2 className="w-8 h-8" />}
              </button>
            ))}
          </div>
        </div>
        
        {/* Fullscreen Success Overlay */}
        {feedback === 'correct' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
            <div className="bg-white/80 backdrop-blur-sm inset-0 absolute" />
            <div className="bg-white p-12 rounded-full shadow-2xl animate-in zoom-in duration-500 relative z-10">
              <Star className="w-24 h-24 text-amber-400 fill-amber-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'result') return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-center text-white space-y-8">
      <div className="relative">
        <div className="w-40 h-40 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Award className="w-24 h-24 text-amber-300" />
        </div>
        <div className="absolute -top-4 -right-4 bg-white text-indigo-600 p-3 rounded-full shadow-lg font-black text-xl">
          +10
        </div>
      </div>
      
      <div>
        <h2 className="text-5xl font-black mb-2 tracking-tighter">AMAZING!</h2>
        <p className="text-indigo-100 text-xl font-bold opacity-90">You are a true Junior Explorer!</p>
      </div>
      
      <div className="bg-white/10 p-8 rounded-[2.5rem] w-full max-w-xs backdrop-blur-md border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <span className="text-indigo-200 font-bold uppercase text-xs">Score</span>
          <span className="text-indigo-200 font-bold uppercase text-xs">Stars</span>
        </div>
        <div className="flex justify-between items-end px-2">
          <div className="text-6xl font-black">100</div>
          <div className="text-5xl font-black text-amber-300 flex items-center gap-1">
            {score} <Star className="w-8 h-8 fill-amber-300" />
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => setScreen('map')} 
        className="px-12 py-5 bg-white text-indigo-600 rounded-full text-2xl font-black shadow-[0_8px_0_rgb(224,231,255)] active:translate-y-1 active:shadow-none transition-all w-full max-w-xs"
      >
        BACK TO MAP
      </button>
    </div>
  );
};

export default App;
