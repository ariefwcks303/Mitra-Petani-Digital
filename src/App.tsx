import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Camera, Upload, Send, Leaf, Image as ImageIcon, CheckCircle2, AlertCircle, ShoppingBag, MessageSquare, Loader2, RefreshCcw, Copy, Check, Sun, Moon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeProduct, generateProductImage } from './services/gemini';
import confetti from 'canvas-confetti';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface AnalysisResult {
  content: string;
  timestamp: string;
  imagePreview?: string;
}

const TIPS = [
  "Gunakan cahaya matahari pagi untuk foto terbaik",
  "Bersihkan produk dari tanah agar terlihat premium",
  "Gunakan latar belakang kontras seperti kayu atau daun",
  "Ambil foto dari sudut atas (High Angle)",
  "Pastikan produk paling segar berada di tumpukan atas"
];

const LOADING_MESSAGES = [
  "Mengamati detail hasil panen...",
  "Menilai kesegaran visual...",
  "Menyusun strategi pemasaran terbaik...",
  "Membuat draf iklan yang menarik...",
  "Hampir selesai, memoles hasil analisisnya..."
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTip, setCurrentTip] = useState(TIPS[0]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractDraft = (content: string, type: 'wa' | 'marketplace' | 'all-ads') => {
    const adSection = content.split('### 📝 Draft Iklan')[1];
    if (!adSection) return content;

    if (type === 'wa') {
      const waPart = adSection.split('#### WhatsApp/Facebook:')[1]?.split('#### Marketplace')[0];
      return waPart?.trim() || adSection.trim();
    }
    
    if (type === 'marketplace') {
      const marketPart = adSection.split('#### Marketplace (Shopee/Tokopedia):')[1];
      return marketPart?.trim() || adSection.trim();
    }

    return adSection.trim();
  };

  const copyToClipboard = async (text: string, id: string, type: 'wa' | 'marketplace' | 'all-ads') => {
    try {
      const cleanText = extractDraft(text, type);
      await navigator.clipboard.writeText(cleanText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleAnalyze = async () => {
    if (!image && !productName) {
      setError('Silakan unggah foto atau sebutkan jenis produk bapak/ibu.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const content = await analyzeProduct(image || undefined, productName);
      setResult({
        content: content || '',
        timestamp: new Date().toLocaleTimeString('id-ID'),
        imagePreview: image || undefined
      });
      
      // Celebration!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#6366f1']
      });

      // Scroll to result
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      if (err.message === "QUOTA_EXHAUSTED") {
        setError("Kuota gratis bapak/ibu sudah habis. Karena bapak/ibu memiliki saldo $1000, silakan hubungkan API Key bapak/ibu di menu Settings > Secrets (ikon kunci di pojok kanan bawah) agar bisa lanjut menggunakan model Pro.");
        if (window.aistudio) {
          window.aistudio.openSelectKey();
        }
      } else {
        setError('Maaf, terjadi kesalahan saat menganalisis. Silakan coba lagi.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!result) return;

    // Extract prompt from result.content
    const promptMatch = result.content.split('### 📸 Prompt Foto Studio (AI)')[1]?.split('###')[0];
    const prompt = promptMatch?.trim() || productName || "High quality product photo of agricultural harvest";

    setIsGeneratingImage(true);
    setError(null);
    try {
      // Check for API key selector availability and selection
      if (window.aistudio) {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
        }
      }

      const generatedUrl = await generateProductImage(prompt);
      setAiGeneratedImage(generatedUrl);
      
      confetti({
        particleCount: 100,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#fbbf24', '#ffffff']
      });
    } catch (err: any) {
      console.error(err);
      if (err.message === "KEY_NOT_FOUND" && window.aistudio) {
        await window.aistudio.openSelectKey();
      } else {
        setError(err.message || 'Gagal membuat foto AI. Silakan coba lagi.');
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setProductName('');
    setResult(null);
    setError(null);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a05] text-slate-100' : 'bg-yellow-50 text-slate-800'} font-sans`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 h-20 border-b-4 transition-all ${isDarkMode ? 'bg-emerald-900 border-emerald-950' : 'bg-emerald-600 border-emerald-700 shadow-md'}`}>
        <div className="max-w-6xl mx-auto w-full px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-emerald-800' : 'bg-white'}`}>
              <Leaf className={`w-8 h-8 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h1 className="text-white font-black text-xl md:text-2xl leading-tight">MITRA DIGITAL PETANI</h1>
              <p className="text-emerald-100 text-[10px] font-bold tracking-widest uppercase">Asisten Pemasaran Pribadi</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-emerald-800 text-yellow-300' : 'bg-emerald-500 text-white'}`}
              title={isDarkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className={`hidden sm:flex px-4 py-2 rounded-full border text-xs font-bold items-center gap-2 ${isDarkMode ? 'bg-emerald-800/50 border-emerald-700 text-emerald-200' : 'bg-emerald-500/50 border-emerald-400 text-white'}`}>
              <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span> ONLINE
            </div>
            <button 
              onClick={resetForm}
              className={`px-4 sm:px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 ${isDarkMode ? 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700 border border-emerald-700' : 'bg-white text-emerald-600 hover:bg-yellow-50'}`}
            >
              <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Floating Greeting Tip */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex justify-center"
        >
          <div className={`border-2 px-6 py-2 rounded-full flex items-center gap-3 shadow-sm transition-colors ${isDarkMode ? 'bg-amber-900/30 border-amber-900/50' : 'bg-yellow-100 border-yellow-200'}`}>
            <span className="text-xl">💡</span>
            <p className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-amber-200' : 'text-amber-700'}`}>{currentTip}</p>
          </div>
        </motion.div>

        {/* Hero Section */}
        <div className="mb-12 text-center">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`font-black text-4xl md:text-6xl mb-4 leading-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            PANEN MELIMPAH, <br /> <span className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} italic`}>UNTUNG BERTAMBAH!</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-lg max-w-2xl mx-auto font-medium transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
          >
            Halo Bapak/Ibu! Kami bantu ubah hasil bumi Anda menjadi materi iklan berkelas dunia. Mari majukan pertanian Indonesia bersama!
          </motion.p>
        </div>

        {/* Input Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileHover={{ y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-[2rem] shadow-2xl border-t-8 border-orange-500 overflow-hidden mb-16 transition-colors ${isDarkMode ? 'bg-[#15150d] border-t-orange-600 shadow-emerald-950/20' : 'bg-white shadow-slate-200'}`}
        >
          <div className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Column: Image Upload Area */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-orange-950 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <label className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    1. UNGGAH HASIL PANEN
                  </label>
                </div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative aspect-video sm:aspect-square border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                    ${image ? 'border-transparent shadow-inner' : (isDarkMode ? 'border-slate-800 bg-slate-900/50 hover:border-emerald-700 hover:bg-emerald-900/20' : 'border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50')}
                  `}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm ${isDarkMode ? 'bg-emerald-900/60' : 'bg-emerald-600/60'}`}>
                        <p className="text-white font-black flex items-center gap-2 text-lg">
                          <ImageIcon className="w-6 h-6" /> GANTI FOTO
                        </p>
                      </div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute top-4 right-4 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg ${isDarkMode ? 'bg-emerald-700' : 'bg-emerald-600'}`}
                      >
                        SIAP ANALISIS
                      </motion.div>
                    </>
                  ) : (
                    <div className="text-center p-8">
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border ring-8 ring-opacity-50 ${isDarkMode ? 'bg-slate-800 border-slate-700 ring-slate-800/50' : 'bg-white border-slate-100 ring-slate-50/50'}`}
                      >
                        <Camera className={`w-10 h-10 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      </motion.div>
                      <p className={`font-black text-xl ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>AMBIL FOTO</p>
                      <p className={`text-sm mt-2 font-bold select-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Pilih foto terbaik hasil panen Anda</p>
                    </div>
                  )}
                </motion.div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Right Column: Text Input Area */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <label className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      2. DETAIL PRODUK
                    </label>
                  </div>
                  
                  <textarea
                    placeholder="Contoh: Cabai merah keriting kualitas super, baru petik tadi pagi..."
                    className={`w-full h-40 p-6 rounded-[2rem] border-2 focus:ring-4 transition-all resize-none shadow-inner font-medium text-lg placeholder:text-slate-400/50 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:bg-slate-800 focus:border-indigo-600 focus:ring-indigo-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-indigo-100'}`}
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-3 p-4 rounded-2xl shadow-sm border-l-4 ${isDarkMode ? 'bg-red-950/20 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-500'}`}
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-bold">{error}</p>
                    </motion.div>
                  )}
                  
                  <motion.button
                    whileHover={!isAnalyzing ? { scale: 1.02 } : {}}
                    whileTap={!isAnalyzing ? { scale: 0.98 } : {}}
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className={`
                      w-full h-20 rounded-[2rem] font-black text-xl flex flex-col items-center justify-center gap-1 transition-all shadow-xl border-b-4
                      ${isAnalyzing 
                        ? (isDarkMode ? 'bg-slate-800 border-slate-900 text-slate-600' : 'bg-slate-200 border-slate-300 text-slate-400 shadow-none translate-y-1')
                        : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-700 hover:shadow-orange-200 active:border-b-0'
                      }
                    `}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>MENGANALISIS...</span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p 
                            key={loadingStep}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}
                          >
                            {LOADING_MESSAGES[loadingStep]}
                          </motion.p>
                        </AnimatePresence>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span>🚀</span> ANALISIS SEKARANG
                        </div>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div 
              id="result-section"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12 pb-20"
            >
              <div className="flex items-center gap-6">
                <div className={`h-2 grow rounded-full ${isDarkMode ? 'bg-emerald-800' : 'bg-emerald-600'}`}></div>
                <h3 className={`font-black text-3xl uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HASIL ANALISIS</h3>
                <div className={`h-2 grow rounded-full ${isDarkMode ? 'bg-orange-800' : 'bg-orange-500'}`}></div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                <div className="md:col-span-1 space-y-6">
                  {/* Result Image Preview */}
                  {result.imagePreview && (
                    <div className={`ring-[12px] shadow-2xl rounded-[2.5rem] overflow-hidden aspect-[3/4] border ${isDarkMode ? 'ring-emerald-950 border-emerald-900 shadow-emerald-950/20' : 'ring-white border-slate-100 shadow-slate-200'}`}>
                      <img src={result.imagePreview} alt="Analysed" className="w-full h-full object-cover" />
                      <div className={`absolute bottom-6 left-6 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase ${isDarkMode ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
                        FOTO ASLI
                      </div>
                    </div>
                  )}

                  {/* AI Generated Image Section */}
                  <AnimatePresence>
                    {(aiGeneratedImage || isGeneratingImage) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`ring-[12px] shadow-2xl rounded-[2.5rem] overflow-hidden aspect-square border relative ${isDarkMode ? 'ring-amber-950/30 border-amber-900 shadow-amber-950/20' : 'ring-amber-50 border-amber-100 shadow-amber-200/50'}`}
                      >
                        {isGeneratingImage ? (
                          <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                            <Loader2 className={`w-10 h-10 animate-spin mb-4 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`} />
                            <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>Melukis Foto Produk Pro...</p>
                          </div>
                        ) : (
                          <motion.img 
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            src={aiGeneratedImage!} 
                            alt="AI Generated" 
                            className="w-full h-full object-cover" 
                          />
                        )}
                        <div className={`absolute bottom-6 left-6 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase ${isDarkMode ? 'bg-amber-700' : 'bg-amber-600'}`}>
                          FOTO PRO (AI)
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!aiGeneratedImage && !isGeneratingImage && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGenerateAIImage}
                      className={`w-full p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${isDarkMode ? 'border-amber-900/50 hover:bg-amber-900/10 text-amber-500' : 'border-amber-200 hover:bg-amber-50 text-amber-600'}`}
                    >
                      <Sparkles className="w-8 h-8" />
                      <div className="text-center">
                        <p className="font-black text-xs uppercase tracking-widest">Gunakan Credit Pro</p>
                        <p className="text-[10px] font-bold opacity-70">Ubah prompt menjadi foto nyata</p>
                      </div>
                    </motion.button>
                  )}
                </div>

                {/* Analysis Content */}
                <div className={`${result.imagePreview ? 'md:col-span-2' : 'md:col-span-3'} space-y-8`}>
                  <div className={`rounded-[3rem] p-8 md:p-12 shadow-2xl border relative transition-colors ${isDarkMode ? 'bg-[#15150d] border-emerald-900 shadow-emerald-950/20' : 'bg-white shadow-slate-200 border-slate-50'}`}>
                    {/* Decorative Elements */}
                    <div className="absolute -top-12 -right-6 text-6xl opacity-20 pointer-events-none">✨</div>
                    
                    <div className={`prose prose-lg max-w-none transition-colors
                      ${isDarkMode ? 'prose-invert prose-headings:text-white prose-h3:bg-emerald-900/50 prose-strong:text-emerald-400 prose-p:text-slate-400' : 'prose-slate prose-headings:text-slate-900 prose-h3:bg-yellow-100 prose-h3:inline-block prose-h3:px-4 prose-h3:py-1 prose-h3:rounded-xl prose-h3:mb-6 prose-strong:text-emerald-700 prose-p:text-slate-600 prose-p:leading-relaxed'}
                      prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest
                      prose-h3:text-2xl`}>
                      <ReactMarkdown>{result.content}</ReactMarkdown>
                    </div>

                    {/* Marketing Actions */}
                    <div className="mt-12 flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => copyToClipboard(result.content, 'wa', 'wa')}
                        className={`
                          flex-1 h-16 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0
                          ${copiedId === 'wa' ? (isDarkMode ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600') : (isDarkMode ? 'bg-indigo-800 text-indigo-100 hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700')}
                        `}
                      >
                        {copiedId === 'wa' ? (
                          <><Check className="w-5 h-5" /> BERHASIL DISALIN</>
                        ) : (
                          <><MessageSquare className="w-5 h-5" /> SALIN IKLAN WA/FB</>
                        )}
                      </button>
                      <button 
                         onClick={() => copyToClipboard(result.content, 'marketplace', 'marketplace')}
                         className={`
                          flex-1 h-16 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0
                          ${copiedId === 'marketplace' ? (isDarkMode ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600') : (isDarkMode ? 'bg-[#FF5722] text-white hover:bg-[#EE4D2D]' : 'bg-[#EE4D2D] text-white hover:bg-[#d63c1b]')}
                        `}
                      >
                        {copiedId === 'marketplace' ? (
                          <><Check className="w-5 h-5" /> BERHASIL DISALIN</>
                        ) : (
                          <><ShoppingBag className="w-5 h-5" /> SALIN MARKETPLACE</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Tip Box */}
                  <div className={`rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-600'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full -mr-16 -mt-16 opacity-30"></div>
                    <div className="relative z-10">
                      <h4 className="font-black text-xs tracking-widest uppercase opacity-80 mb-2">💡 Tips Unggulan</h4>
                      <p className="text-xl font-bold italic leading-tight">
                        \"Petani hebat adalah yang pandai bercerita. Pastikan kejujuran kualitas menjadi nilai utama Bapak/Ibu!\"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Grid */}
        {!result && !isAnalyzing && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
            {[
              { icon: CheckCircle2, title: "ANALISIS CEPAT", desc: "AI kami mendeteksi tingkat kualitas panen Bapak/Ibu secara instan dalam hitungan detik.", lightColors: "bg-emerald-500 border-emerald-600", darkColors: "bg-emerald-800 border-emerald-700" },
              { icon: Camera, title: "PROPERTI FOTO", desc: "Dapatkan saran penataan foto yang menggugah selera agar pembeli langsung jatuh cinta.", lightColors: "bg-orange-500 border-orange-600", darkColors: "bg-orange-800 border-orange-700" },
              { icon: ShoppingBag, title: "IKLAN OTOMATIS", desc: "Lupakan pusing menyusun kata-kata. Kami siapkan teks jualan yang persuasif dan sopan.", lightColors: "bg-indigo-500 border-indigo-600", darkColors: "bg-indigo-800 border-indigo-700" }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className={`p-8 rounded-[2.5rem] shadow-xl border flex flex-col items-center text-center relative overflow-hidden group transition-colors ${isDarkMode ? 'bg-[#15150d] border-emerald-950 shadow-emerald-950/10' : 'bg-white border-slate-100 shadow-slate-200'}`}
              >
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg transform group-hover:rotate-12 transition-transform ${isDarkMode ? feature.darkColors : feature.lightColors}`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className={`font-black text-xl mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{feature.title}</h4>
                <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className={`${isDarkMode ? 'bg-[#050503] border-t border-emerald-950' : 'bg-slate-900'} h-12 flex items-center px-4 md:px-8 text-white text-[10px] font-bold uppercase tracking-widest transition-colors`}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex gap-6 items-center">
            <span className={`${isDarkMode ? 'text-emerald-500' : 'text-emerald-400'} flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-400'}`}></span> 
              SINKRONISASI AKTIF
            </span>
            <span className="hidden sm:inline opacity-40">MITRA ID: MP-2026-IND</span>
          </div>
          <span className="opacity-40">MEMBANGUN DESA, MEMBERDAYAKAN PETANI INDONESIA</span>
        </div>
      </footer>
    </div>
  );
}
