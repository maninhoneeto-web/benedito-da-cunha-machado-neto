'use client';

import Image from 'next/image';
import { Camera, Send, ShieldCheck, User, Paperclip, X, Cctv } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { useCftvChat, Attachment } from '@/hooks/use-cftv-chat';

export default function Home() {
  const { messages, sendMessage, isLoading } = useCftvChat();
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState(false);
  const WHATSAPP_LINK = "https://wa.me/5561998308655"; // Número do cliente: 61 998308655

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert("Por favor, envie apenas imagens ou PDFs.");
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        setPendingAttachments(prev => [...prev, {
          url: URL.createObjectURL(file), // for preview
          mimeType: file.type,
          data: base64Data
        }]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;
    sendMessage(input, pendingAttachments);
    setInput('');
    setPendingAttachments([]);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050507] text-slate-200 font-sans p-2 md:p-6 gap-4 relative">
      {/* WhatsApp Floating Button */}
      <motion.a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-32 right-6 md:bottom-32 md:right-10 z-50 flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-lg border-2 border-white/20 hover:scale-110 active:scale-95 transition-transform"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ rotate: 10 }}
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </motion.a>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 bg-[#0f1115] border border-slate-800 rounded-2xl shrink-0 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <motion.div 
            className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-orange-600/10 border border-orange-500/20 shadow-inner overflow-hidden"
            whileHover={{ scale: 1.05 }}
          >
            {!logoError ? (
              <Image 
                src="/logo.png" 
                alt="NDS CFTV Logo" 
                width={48} 
                height={48}
                className="object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Cctv className="w-6 h-6 text-orange-500 z-10" />
            )}
            <motion.div 
              className="absolute inset-0 bg-white/10"
              animate={{ 
                opacity: [0, 0.4, 0],
                rotate: [0, 90, 180, 270, 360]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
            <motion.div 
              className="absolute h-0.5 w-full bg-red-500 shadow-[0_0_8px_red]"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              NDS <span className="text-orange-500 font-black">DIGITAL</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <p className="text-[10px] text-orange-500 font-bold tracking-wider uppercase">Sistema Operacional</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex gap-4 items-center">
          <a 
            href={WHATSAPP_LINK} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors uppercase tracking-widest"
          >
            Orçamento no Zap
          </a>
          <button 
            onClick={() => alert("CONFIGURAÇÃO NDS DIGITAL:\n\n1. SALVAR NO CELULAR:\nNo iPhone (Safari), use 'Compartilhar' > 'Adicionar à Tela de Início'.\nNo Android (Chrome), use o menu de 3 pontos > 'Instalar Aplicativo'.\n\n2. INTEGRAR NO SEU SITE:\nCopie e cole este código no seu site:\n<iframe src='" + window.location.origin + "' style='border:none; width:400px; height:600px; position:fixed; bottom:20px; right:20px; z-index:9999;'></iframe>")}
            className="px-3 py-1.5 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-800 transition-colors uppercase tracking-widest"
          >
            Guia Mobile/Web
          </button>
        </div>
      </header>

      {/* Chat Area & Input Wrapped in Card */}
      <div className="flex-1 min-h-0 bg-[#0f1115] border border-slate-800 border-t-4 border-t-orange-500 rounded-2xl flex flex-col shadow-lg overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn(
                      "flex gap-3 md:gap-4 w-full",
                      isUser ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "flex-shrink-0 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full shadow-sm mt-1",
                      isUser ? "bg-orange-600 text-white" : "bg-slate-800 border border-slate-700 text-white"
                    )}>
                      {isUser ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Camera className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={cn(
                      "max-w-[85%] md:max-w-[75%] px-4 py-3 md:px-5 md:py-4 shadow-sm text-sm md:text-base leading-relaxed break-words",
                      isUser 
                        ? "bg-orange-500 text-white rounded-2xl rounded-tr-sm border-none" 
                        : "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm border-l-4 border-l-orange-500"
                    )}>
                      {isUser && message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                           {message.attachments.map((att, idx) => (
                             att.mimeType.startsWith('image/') ? (
                               <img key={idx} src={att.url} alt="anexo" className="w-48 h-auto max-w-full rounded-md object-cover border border-white/10 shadow-sm" />
                             ) : (
                               <div key={idx} className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-md text-sm border border-white/10 w-fit">
                                 <Paperclip className="w-4 h-4 shrink-0" /> <span className="truncate max-w-[150px]">Arquivo PDF</span>
                               </div>
                             )
                           ))}
                        </div>
                      )}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      ) : (
                        <div className="markdown-body prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none text-slate-100">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              strong: ({node, ...props}) => <strong className="text-orange-500 font-bold" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-orange-500 font-bold" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-orange-500 font-bold" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-orange-500 font-bold" {...props} />,
                              li: ({node, ...props}) => <li className="marker:text-orange-500" {...props} />,
                              a: ({node, ...props}) => <a className="text-orange-400 hover:text-orange-300 underline" {...props} />
                            }}
                          >
                            {message.text}
                          </ReactMarkdown>
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-orange-400 animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={bottomRef} className="h-4" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="shrink-0 bg-[#0f1115] border-t border-slate-800/50 px-4 py-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            {pendingAttachments.length > 0 && (
              <div className="flex gap-2 mb-3 p-3 bg-[#050507] border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative w-16 h-16 shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.url} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-slate-300 text-[10px] font-bold uppercase tracking-wider">PDF</div>
                    )}
                    <button 
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:scale-110 transition-transform hidden group-hover:block"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form 
              onSubmit={handleSubmit}
              className="flex items-end gap-2 md:gap-3 bg-[#050507] border border-slate-800 rounded-2xl p-1.5 md:p-2 shadow-inner focus-within:ring-1 focus-within:ring-orange-500/50 focus-within:border-orange-500/80 transition-all"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 mb-0.5 flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-slate-800 transition-all"
                aria-label="Anexar arquivo ou foto"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                 type="file" 
                 multiple 
                 accept="image/*,application/pdf"
                 className="hidden" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Detalhe o projeto ou envie uma imagem da planta/equipamento..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 resize-none py-3 px-1 md:px-2 focus:ring-0 outline-none placeholder:text-slate-600 text-slate-200 text-sm md:text-base leading-tight md:leading-normal"
                rows={1}
              />
              <button
                type="submit"
                disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                className="flex-shrink-0 mb-0.5 mr-0.5 flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-xl bg-orange-600 text-white shadow-sm hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 transition-all"
                aria-label="Enviar mensagem"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
            <p className="text-center text-[11px] md:text-xs text-slate-500 mt-4">
              O assistente pode cometer erros técnicos. Consulte sempre um técnico da NDS CFTV Digital para projetos complexos.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
