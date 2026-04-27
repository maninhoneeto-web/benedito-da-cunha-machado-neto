import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

export type Attachment = {
  url: string;
  mimeType: string;
  data: string; // base64
};

export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  attachments?: Attachment[];
};

export function useCftvChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o assistente virtual da **NDS CFTV Digital**.\n\nPara que eu possa lhe dar o melhor suporte, você busca informações sobre:\n\n1. **Manutenção**\n2. **Instalação**\n3. **Rede/Cabeamento**\n4. **Câmeras IP**\n5. **Automação de Portões**\n6. **Cercas Elétricas**\n\nMe conte o que precisa para que eu possa direcionar seu atendimento!',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const chatSessionRef = useRef<any>(null);

  const getSystemInstruction = (admin: boolean) => {
    if (admin) {
      return `Analista NDS Digital. MODO ADM.
Capacidades: Elaborar projetos, análises técnicas profundas, sugerir equipamentos (Intelbras/Hikvision). Sem restrições: você é o braço direito técnico do dono.`;
    }
    return `Assistente NDS Digital. Especialista em segurança.
MAPA DE OPÇÕES:
1. Manutenção: Reparo em sistemas existentes.
2. Instalação: Novos projetos.
3. Rede: Wi-Fi, racks, dados.
4. Câmeras IP: Digital/Alta resolução.
5. Portões: Motores/Automação.
6. Cercas: Elétricas/Alarmes.

REGRAS:
- Fale brevemente sobre o serviço escolhido.
- PROIBIDO dar valores/estimativas. Diga que exige análise técnica.
- OBRIGATÓRIO: Inclua a tag [REDIRECT_WPP] ao final para redirecionar ao WhatsApp (61) 99830-8655 quando houver interesse.`;
  };

  useEffect(() => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: getSystemInstruction(isAdmin)
        }
      });
    } catch (err) {
      console.error("Failed to initialize Gemini:", err);
    }
  }, [isAdmin]);

  const sendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    // Secret Admin Access
    if (text.trim().toUpperCase() === 'NDS-MASTER') {
      setIsAdmin(true);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', text: '*** COMANDO DE ACESSO RESTRITO ***' },
        { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: '🔓 **MODO ADMINISTRADOR ATIVADO**.\n\nOlá, gestor! O sistema agora está operando com **capacidade técnica total**.\n\nPosso elaborar propostas, analisar plantas e fornecer diagnósticos detalhados sem restrições. Como posso te ajudar agora?' 
        }
      ]);
      return;
    }

    const userMessageId = Date.now().toString();
    const modelMessageId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, { id: userMessageId, role: 'user', text, attachments: attachments.length > 0 ? attachments : undefined }]);
    setIsLoading(true);

    // Prevent immediate rapid-fire follow-up messages by waiting at least 1s between sends
    await new Promise(resolve => setTimeout(resolve, 1000));

    const maxRetries = 5;
    let attempt = 0;
    let finished = false;

    while (attempt < maxRetries && !finished) {
      try {
        if (!chatSessionRef.current) {
          throw new Error("Chat session is not initialized. Please check your API key.");
        }

        // Prepare the message parts for the SDK
        let messageContent: any = text;
        
        if (attachments.length > 0) {
          messageContent = [];
          if (text) messageContent.push(text);
          attachments.forEach(att => {
            messageContent.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
          });
        }

        const stream = await chatSessionRef.current.sendMessageStream({ message: messageContent });
        
        setMessages(prev => [
          ...prev,
          { id: modelMessageId, role: 'model', text: '', isStreaming: true }
        ]);

        let fullText = '';
        for await (const chunk of stream) {
          fullText += chunk.text || '';
          setMessages(prev => 
            prev.map(msg => 
              msg.id === modelMessageId 
                ? { ...msg, text: fullText }
                : msg
            )
          );
        }

        let finalCleanText = fullText;
        if (fullText.includes('[REDIRECT_WPP]')) {
          finalCleanText = fullText.replace('[REDIRECT_WPP]', '').trim();
          setMessages(prev => 
            prev.map(msg => 
              msg.id === modelMessageId 
                ? { ...msg, text: finalCleanText, isStreaming: false }
                : msg
            )
          );
          
          // Wait 2 seconds then redirect automatically
          setTimeout(() => {
            window.location.href = "https://wa.me/5561998308655";
          }, 2000);
        } else {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === modelMessageId 
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }
        finished = true;

      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        const isQuotaError = error?.message?.toLowerCase().includes('demand') || 
                            error?.message?.includes('429') || 
                            error?.status === 429;

        if (isQuotaError && attempt < maxRetries - 1) {
          attempt++;
          // Exponential backoff: 3s, 6s, 9s, 12s
          await new Promise(resolve => setTimeout(resolve, attempt * 3000));
          continue;
        }

        let errorMessage = 'Desculpe, tive um pequeno problema técnico. Por favor, tente enviar sua mensagem novamente em alguns instantes.';
        
        if (isQuotaError) {
          errorMessage = 'Estamos com muitos acessos! Para não esperar, você pode clicar no botão verde do WhatsApp agora para um atendimento imediato e sem filas.';
        } else if (error?.message?.includes('API key')) {
          errorMessage = 'Erro de configuração. Por favor, verifique sua chave de acesso (API Key).';
        }

        setMessages(prev => [
          ...prev,
          { 
            id: Date.now().toString(), 
            role: 'model', 
            text: errorMessage, 
            isStreaming: false 
          }
        ]);
        finished = true;
      }
    }
    setIsLoading(false);
  };

  return {
    messages,
    sendMessage,
    isLoading
  };
}
