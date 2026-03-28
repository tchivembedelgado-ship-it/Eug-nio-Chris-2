import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Footer() {
  const { profile } = useAuth();

  return (
    <footer className="border-t border-white/5 bg-zinc-900/30 py-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-center">
          <Logo className="h-12" />
        </div>
        <div className="mb-4 flex justify-center gap-6">
          <Link to="/sobre-adm" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Sobre o Admin
          </Link>
          <Link to={profile?.is_admin ? "/admin/support" : "/suporte"} className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Suporte
          </Link>
        </div>
        <p className="text-sm text-zinc-500">
          © 2026 RifaAngola. Todos os direitos reservados. Jogue com responsabilidade. <span className="ml-2 inline-block rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">+18</span>
        </p>
        <div className="mt-4 text-[10px] text-zinc-600">
          Criado por: Eugénio Tchivembe<br />
          tchivembedelgado@gmail.com<br />
          Tel: 941577529
        </div>
      </div>
    </footer>
  );
}
