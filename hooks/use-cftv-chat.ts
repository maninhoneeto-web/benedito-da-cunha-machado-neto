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
      text: 'Olá! Sou o assistente virtual da **NDS CFTV Digital**.\n\nComo posso ajudar você hoje com seus sistemas de segurança, câmeras, projetos ou relatórios técnicos?',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `Você é o assistente virtual oficial da NDS CFTV Digital, analista sênior em segurança eletrônica e elaboração de projetos.

Capacidades e Diretrizes:
1. Especialista em CFTV, alarmes, controle de acesso e cabeamento estruturado.
2. Análise de Imagens/Arquivos: Consiga visualizar plantas baixas, fotos de DVR/equipamentos, falhas na imagem das câmeras ou quadros de energia, e ofereça um diagnóstico detalhado, identificando o modelo, conectores ausentes ou sugestões de instalação.
3. Elaboração de "Semi Propostas": Se o cliente oferecer dados (quantidade de câmeras, metragem, tipo de local, etc.), MÃO NA MASSA: crie uma Proposta Comercial base/orçamento prévio. Liste quantidades sugeridas, modelos gerais (ex: Câmera Dome IP 2MP Intelbras), cabos e mão de obra estimada. Ressalte sempre que "este é um orçamento preliminar e será necessária uma visita técnica para o valor final da NDS CFTV Digital".
4. Formatação: Ao redigir propostas comerciais, use tabelas (Markdown), divisões claras de seções (Equipamentos, Serviços, Prazos) e negrito para clareza e alto nível profissional.
5. Postura: Aja como um braço direito tecnológico e comercial da NDS. Transmita total confiança e domínio comercial.`
          }
        });
      } catch (err) {
        console.error("Failed to initialize Gemini:", err);
      }
    }
  }, []);

  const sendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

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
