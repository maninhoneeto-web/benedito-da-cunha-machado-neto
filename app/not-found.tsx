import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050507] text-white p-4">
      <h2 className="text-2xl font-bold mb-4">404 - Página não encontrada</h2>
      <p className="text-slate-400 mb-6">Desculpe, a página que você está procurando não existe.</p>
      <Link 
        href="/"
        className="px-6 py-2 bg-[#ff5e00] hover:bg-[#e05200] text-white rounded-lg transition-colors font-medium"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
