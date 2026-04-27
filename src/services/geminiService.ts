import { GoogleGenAI } from "@google/genai";
import { Alimento } from "../types";

// Lazy initialization to avoid errors on load if key is missing
let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada. Verifique as configurações do ambiente.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function suggestBackgroundStyles(imagesBase64: string[]): Promise<{ name: string; colors: string[]; description: string }[]> {
  try {
    const ai = getGenAI();
    
    const contents: any[] = [
      { text: "Com base nessas imagens de referência, descreva 3 variações de temas de cores (paletas) para um site de nutricionista elegante e clean. Retorne um JSON seguindo este esquema: Array<{ name: string; colors: string[] (máximo 3 hex colors); description: string (estilo visual) }>. Retorne apenas o JSON puro." }
    ];

    imagesBase64.forEach(base64 => {
      if (base64) {
        const split = base64.split(',');
        const data = split.length > 1 ? split[1] : split[0];
        contents.push({
          inlineData: {
            data: data,
            mimeType: "image/jpeg"
          }
        });
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleaned = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Background Error:", error);
    if (error instanceof Error && error.message.includes('429')) {
      throw new Error("Quota de IA excedida. Tente novamente em alguns minutos ou use os estilos pré-definidos.");
    }
    throw new Error("Falha ao processar imagens com a IA.");
  }
}

export async function suggestMeals(objetivo: string, pacienteInfo: string) {
  try {
    const ai = getGenAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sugira um plano alimentar para um paciente com o objetivo de ${objetivo}. 
      Informações adicionais do paciente: ${pacienteInfo}.
      Retorne exatamente 4 refeições (Café da Manhã, Almoço, Lanche, Jantar).
      Use o esquema JSON: Array<{ nome: string, itens: Array<{ nome: string, quantidade: string, obs: string }> }>. Retorne apenas o JSON puro.`,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleaned = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Erro AI suggestMeals:", error);
    throw error;
  }
}

export async function searchFoodSmart(query: string): Promise<Alimento[]> {
  try {
    const ai = getGenAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Aja como uma base de dados nutricional. Busque por: "${query}". 
      Retorne uma lista de até 5 alimentos (JSON) com: nome, marca, categoria, calorias, carboidratos, proteinas, gorduras, fibra, unidade (ex: 100g). Retorne apenas o JSON puro.`,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleaned = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, "").replace(/```/g, "").trim();
    const results = JSON.parse(cleaned);
    
    return results.map((r: any) => ({
      ...r,
      id: `ai_${Math.random().toString(36).substr(2, 9)}`,
      imagem: `https://source.unsplash.com/200x200/?food,${encodeURIComponent(r.nome)}`
    }));
  } catch (error) {
    console.error("Erro AI searchFoodSmart:", error);
    return [];
  }
}

export async function suggestSmartEquivalent(food: Alimento): Promise<Alimento[]> {
  try {
    const ai = getGenAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sugira 3 substitutos saudáveis (equivalentes) para: ${food.nome} (JSON: name, calories, carbs, protein, fat, unit). Retorne apenas o JSON puro.`,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleaned = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Erro AI suggestSmartEquivalent:", error);
    return [];
  }
}

export async function chatNutri(history: any[], message: string): Promise<string> {
  try {
    const ai = getGenAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: "Você é uma assistente de nutricionista focada em tirar dúvidas rápidas sobre alimentação saudável de forma motivadora e profissional."
      }
    });

    return response.text || "Desculpe, tive um problema ao processar sua dúvida.";
  } catch (error) {
    console.error("Erro no chat:", error);
    return "Ocorreu um erro na comunicação com a IA.";
  }
}
