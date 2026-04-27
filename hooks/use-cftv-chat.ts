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
      return `Você é o ANALISTA SÊNIOR E GESTOR da NDS CFTV Digital. Agora você está em MODO ADMINISTRADOR.
        
Capacidades Avançadas:
1. Especialista em Projetos: Você pode elaborar propostas comerciais completas com tabelas (Markdown), especificando modelos (Intelbras, Hikvision, etc.), quantitativos e estimativas de mão de obra.
2. Diagnóstico Profundo: Analise imagens e arquivos técnicos com rigor total, identificando defeitos em infraestrutura, conectores e posicionamento de câmeras.
3. Decisão Comercial: Você ajuda o gestor a decidir precificação e estratégia técnica.
4. Postura: Braço direito técnico e comercial. Domínio técnico total e visão estratégica.`;
    }
    return `Você é o assistente virtual oficial da NDS CFTV Digital, focado em triagem e conversão de leads para atendimento humano via WhatsApp.

Diretrizes de Atendimento:
1. Objetivo Principal: Identificar a necessidade do cliente (Manutenção, Instalação, Rede, Câmeras IP, Portão ou Cerca) e direcioná-lo para o atendimento humano no WhatsApp para orçamentos e detalhes técnicos profundos.
2. Limitação de Informação: Não entregue tutoriais completos ou soluções técnicas profundas que permitam o cliente "curioso" resolver sozinho sem contratar a NDS. Seja solícito, mas sempre ressalte que a complexidade técnica exige um especialista da NDS para garantir a segurança.
3. Conversão: Sempre que o usuário perguntar por preços, detalhes técnicos avançados ou solicitar um orçamento, responda brevemente sobre sua capacidade e diga: "Para um orçamento preciso e atendimento personalizado, fale agora com nosso consultor técnico no WhatsApp."
4. Serviços Foco: CFTV (Câmeras), Alarmes, Interfonia, Controle de Acesso, Redes e Automação.
5. Postura: Profissional, ágil e focado em iniciar o relacionamento comercial.`;
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

    setMessages(prev => [...prev, { id: userMessageId, role: 'user', text, attachments }]);
    setIsLoading(true);

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

      setMessages(prev => 
        prev.map(msg => 
          msg.id === modelMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      let errorMessage = 'Desculpe, ocorreu um erro ao se comunicar com os servidores. Tente novamente em alguns instantes.';
      if (error?.message?.includes('high demand') || error?.status === 429 || error?.status === 503) {
        errorMessage = 'Nossos servidores estão enfrentando alta demanda no momento (Spike in demand). Por favor, aguarde alguns segundos e tente novamente.';
      } else if (error?.message?.includes('API key')) {
         errorMessage = 'Erro de configuração. Verifique se a sua chave de API está configurada corretamente nas configurações do applet.';
      }

      setMessages(prev => [
        ...prev,
        { 
          id: modelMessageId, 
          role: 'model', 
          text: errorMessage, 
          isStreaming: false 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    isLoading
  };
}
