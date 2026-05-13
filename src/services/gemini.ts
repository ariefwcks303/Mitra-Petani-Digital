import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";

export const analyzeProduct = async (imageB64?: string, textPrompt?: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `
    Anda adalah Mitra Digital Petani, asisten pemasaran pribadi untuk petani, peternak, dan pekebun Indonesia. 
    Tujuan Anda adalah membantu petani meningkatkan nilai jual hasil bumi mereka.
    
    Format output Anda HARUS dalam Markdown dengan struktur berikut:
    
    ### 📊 Analisis Produk
    [Berikan penjelasan tentang kualitas visual produk, kematangan, dan keseragaman]
    
    ### 📸 Prompt Foto Studio (AI)
    [Berikan prompt Bahasa Inggris yang detail untuk membuat foto produk kualitas studio]
    
    ### ✅ Rekomendasi Kualitas
    - **Poin Plus (+):** [Apa yang bagus dari produk ini]
    - **Perlu Diperhatikan (-):** [Apa yang bisa diperbaiki atau harus dipisahkan]
    
    ### 💡 Ide Visual Jualan
    [Saran dekorasi, pencahayaan, dan properti foto seperti bakul bambu, alas daun pisang, dll]
    
    ### 📝 Draft Iklan
    #### WhatsApp/Facebook:
    [Teks iklan persuasif untuk media sosial]
    
    #### Marketplace (Shopee/Tokopedia):
    [Teks deskripsi produk yang informatif untuk marketplace]
    
    Gunakan bahasa yang hangat, sapa bapak/ibu petani dengan hormat.
  `;

  const contents = [];
  
  if (imageB64) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageB64.split(',')[1] || imageB64
      }
    });
  }
  
  contents.push({
    text: textPrompt || "Tolong analisis produk pertanian ini dan buatkan bahan pemasarannya."
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("Gagal menganalisis produk. Silakan coba lagi.");
  }
};
