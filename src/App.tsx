import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Camera, Upload, Send, Leaf, Image as ImageIcon, CheckCircle2, AlertCircle, ShoppingBag, MessageSquare, Loader2, RefreshCcw, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeProduct } from './services/gemini';
import confetti from 'canvas-confetti';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      console.error(err);
      setError('Maaf, terjadi kesalahan saat menganalisis. Silakan coba lagi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setProductName('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-yellow-50 font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 h-20 bg-emerald-600 flex items-center shadow-md border-b-4 border-emerald-700 transition-all">
        <div className="max-w-6xl mx-auto w-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner">
              <Leaf className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl leading-tight">MITRA DIGITAL PETANI</h1>
              <p className="text-emerald-100 text-[10px] font-bold tracking-widest uppercase">Asisten Pemasaran Pribadi</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-emerald-500/50 px-4 py-2 rounded-full border border-emerald-400 text-white text-xs font-bold items-center gap-2">
              <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span> ONLINE
            </div>
            <button 
              onClick={resetForm}
              className="bg-white text-emerald-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-yellow-50 transition-all flex items-center gap-2 active:scale-95"
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
          <div className="bg-yellow-100 border-2 border-yellow-200 px-6 py-2 rounded-full flex items-center gap-3 shadow-sm">
            <span className="text-xl">💡</span>
            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">{currentTip}</p>
          </div>
        </motion.div>

        {/* Hero Section */}
        <div className="mb-12 text-center">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-black text-4xl md:text-6xl mb-4 text-slate-900 leading-tight"
          >
            PANEN MELIMPAH, <br /> <span className="text-emerald-600 italic">UNTUNG BERTAMBAH!</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 text-lg max-w-2xl mx-auto font-medium"
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
          className="bg-white rounded-[2rem] shadow-2xl border-t-8 border-orange-500 overflow-hidden mb-16"
        >
          <div className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Column: Image Upload Area */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">
                    1. UNGGAH HASIL PANEN
                  </label>
                </div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative aspect-video sm:aspect-square border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                    ${image ? 'border-transparent shadow-inner' : 'border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50'}
                  `}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-emerald-600/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <p className="text-white font-black flex items-center gap-2 text-lg">
                          <ImageIcon className="w-6 h-6" /> GANTI FOTO
                        </p>
                      </div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg"
                      >
                        SIAP ANALISIS
                      </motion.div>
                    </>
                  ) : (
                    <div className="text-center p-8">
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100 ring-8 ring-slate-50/50"
                      >
                        <Camera className="w-10 h-10 text-emerald-600" />
                      </motion.div>
                      <p className="font-black text-xl text-slate-800">AMBIL FOTO</p>
                      <p className="text-sm text-slate-400 mt-2 font-bold select-none">Pilih foto terbaik hasil panen Anda</p>
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
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">
                      2. DETAIL PRODUK
                    </label>
                  </div>
                  
                  <textarea
                    placeholder="Contoh: Cabai merah keriting kualitas super, baru petik tadi pagi..."
                    className="w-full h-40 p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all resize-none shadow-inner font-medium text-lg placeholder:text-slate-300"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border-l-4 border-red-500 shadow-sm"
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
                        ? 'bg-slate-200 border-slate-300 cursor-not-allowed text-slate-400 shadow-none translate-y-1' 
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
                            className="text-[10px] uppercase tracking-widest text-slate-500 font-bold"
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
                <div className="h-2 grow bg-emerald-600 rounded-full"></div>
                <h3 className="font-black text-3xl text-slate-900 uppercase tracking-tighter italic">HASIL ANALISIS</h3>
                <div className="h-2 grow bg-orange-500 rounded-full"></div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                {/* Result Image Preview */}
                {result.imagePreview && (
                  <div className="md:col-span-1">
                    <div className="sticky top-24 ring-[12px] ring-white shadow-2xl rounded-[2.5rem] overflow-hidden aspect-[3/4] border border-slate-100">
                      <img src={result.imagePreview} alt="Analysed" className="w-full h-full object-cover" />
                      <div className="absolute bottom-6 left-6 bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase">
                        SAMPEL PRODUK
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Content */}
                <div className={`${result.imagePreview ? 'md:col-span-2' : 'md:col-span-3'} space-y-8`}>
                  <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-50 relative">
                    {/* Decorative Elements */}
                    <div className="absolute -top-12 -right-6 text-6xl opacity-20 pointer-events-none">✨</div>
                    
                    <div className="prose prose-lg prose-slate max-w-none 
                      prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-slate-900
                      prose-h3:text-2xl prose-h3:bg-yellow-100 prose-h3:inline-block prose-h3:px-4 prose-h3:py-1 prose-h3:rounded-xl prose-h3:mb-6
                      prose-strong:text-emerald-700 prose-p:leading-relaxed prose-p:text-slate-600">
                      <ReactMarkdown>{result.content}</ReactMarkdown>
                    </div>

                    {/* Marketing Actions */}
                    <div className="mt-12 flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => copyToClipboard(result.content, 'wa', 'wa')}
                        className={`
                          flex-1 h-16 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0
                          ${copiedId === 'wa' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
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
                          ${copiedId === 'marketplace' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600' : 'bg-[#EE4D2D] text-white hover:bg-[#d63c1b]'}
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
                  <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
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
              { icon: CheckCircle2, title: "ANALISIS CEPAT", desc: "AI kami mendeteksi tingkat kualitas panen Bapak/Ibu secara instan dalam hitungan detik.", color: "bg-emerald-500", border: "border-emerald-600" },
              { icon: Camera, title: "PROPERTI FOTO", desc: "Dapatkan saran penataan foto yang menggugah selera agar pembeli langsung jatuh cinta.", color: "bg-orange-500", border: "border-orange-600" },
              { icon: ShoppingBag, title: "IKLAN OTOMATIS", desc: "Lupakan pusing menyusun kata-kata. Kami siapkan teks jualan yang persuasif dan sopan.", color: "bg-indigo-500", border: "border-indigo-600" }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group"
              >
                <div className={`w-16 h-16 rounded-3xl ${feature.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:rotate-12 transition-transform`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-black text-xl mb-3 text-slate-900 tracking-tight">{feature.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-12 bg-slate-900 flex items-center px-4 md:px-8 text-white text-[10px] font-bold uppercase tracking-widest">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex gap-6 items-center">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> 
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
