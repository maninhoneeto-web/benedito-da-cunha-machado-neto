import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NDS CFTV Digital - Assistente Chatbot',
  description: 'Assistente virtual especializado para NDS CFTV Digital, focado em projetos de segurança e CFTV.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-[#050507]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
