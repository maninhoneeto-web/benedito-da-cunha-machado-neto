import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NDS CFTV Digital Assistente Chat Bot',
  description: 'Assistente virtual oficial da NDS CFTV Digital para projetos de segurança eletrônica e CFTV.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-[#050507]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
