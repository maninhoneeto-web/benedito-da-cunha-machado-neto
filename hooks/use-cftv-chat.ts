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
      return `Você é o ANALISTA SÊNIOR E GESTOR da NDS CFTV Digital. MODO ADMINISTRADOR ATIVADO.
        
Capacidades:
1. Elaboração de projetos técnicos e comerciais.
2. Análise profunda de falhas e infraestrutura.
3. Sugestão de equipamentos específicos (Intelbras, Hikvision, etc.).
4. Sem restrições de conversa: atue como o braço direito técnico do dono.`;
    }
    return `Você é o assistente virtual oficial da NDS CFTV Digital. Especialista em segurança eletrônica.

MAPEAMENTO DE OPÇÕES (Siga rigorosamente):
Quando o usuário escolher um número ou assunto, responda com foco no serviço:
1. Manutenção: Reparar sistemas existentes, câmeras com chuvisco, DVR reiniciando, etc.
2. Instalação: Novos projetos, passar cabos, fixar equipamentos.
3. Rede/Cabeamento: Infraestrutura de dados, Wi-Fi, racks e TI.
4. Câmeras IP: Tecnologia digital de ponta, alta resolução, PoE.
5. Automação de Portões: Motores deslizantes, basculantes e travas.
6. Cercas Elétricas: Proteção perimetral e alarmes.

DIRETRIZES TOTAIS:
- Se o usuário digitar um número, fale brevemente sobre o serviço correspondente.
- NUNCA dê valores, preços ou orçamentos aproximados (EX: "custa cerca de R$ 500", "varia entre X e Y"). É TERMINANTEMENTE PROIBIDO falar de valores ou estimativas. Se perguntarem preço, diga: "Valores são definidos após análise técnica. Vou te transferir para o consultor agora."
- Sempre direcione para o WhatsApp: (61) 99830-8655.
- Para qualquer usuário que escolha uma opção ou peça orçamento, você DEVE incluir a tag secreta [REDIRECT_WPP] no final da sua resposta. Isso é OBRIGATÓRIO para que o sistema o direcione automaticamente.
- Seja cortês e profissional.`;
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

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      let errorMessage = 'Desculpe, tive um pequeno problema técnico. Por favor, tente enviar sua mensagem novamente em alguns instantes.';
      
      if (error?.message?.toLowerCase().includes('demand') || error?.message?.includes('429') || error?.status === 429) {
        errorMessage = 'Estamos com muitos acessos no momento. Por favor, aguarde uns segundos e tente novamente ou nos chame direto no WhatsApp!';
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
