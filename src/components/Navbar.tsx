import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { LogOut, User, LayoutDashboard, Globe, Wallet, Menu, X } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(newLang);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" onClick={closeMenu} className="text-2xl font-bold tracking-tighter text-emerald-500">
            RIFA<span className="text-white">ANGOLA</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              {t('nav.home')}
            </Link>
            <Link to="/rifas" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              {t('nav.raffles')}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleLanguage}
            className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-400 hover:bg-white/5 sm:flex"
          >
            <Globe className="h-3 w-3" />
            {i18n.language.toUpperCase()}
          </button>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 sm:px-4">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500 sm:text-sm">
                  {formatCurrency(profile?.balance || 0)}
                </span>
                <Link
                  to="/depositar"
                  onClick={closeMenu}
                  className="ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black transition-colors hover:bg-emerald-400 sm:ml-2"
                >
                  +
                </Link>
              </div>
              
              <div className="hidden items-center gap-2 md:flex">
                {profile?.is_admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden lg:inline">Painel Administrador</span>
                    <span className="lg:hidden">Admin</span>
                  </Link>
                )}

                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
                >
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="hidden sm:inline">
                    {user.email ? user.email.split('@')[0] : user.phone}
                    {profile?.is_admin && <span className="ml-2 text-[10px] text-indigo-400 font-black uppercase">Admin</span>}
                  </span>
                </Link>

                <button
                  onClick={() => signOut()}
                  className="rounded-full p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 md:hidden"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:block"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold transition-all hover:bg-emerald-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] sm:px-6"
              >
                {t('nav.register')}
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 md:hidden"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-3 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
            <Link
              to="/"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-base font-bold text-white active:bg-white/10"
            >
              <Globe className="h-5 w-5 text-emerald-500" />
              {t('nav.home')}
            </Link>
            <Link
              to="/rifas"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-base font-bold text-white active:bg-white/10"
            >
              <Wallet className="h-5 w-5 text-indigo-500" />
              {t('nav.raffles')}
            </Link>
            
            {user && (
              <>
                <div className="my-1 h-px bg-white/10" />
                {profile?.is_admin && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="flex items-center gap-3 rounded-xl bg-indigo-600/20 p-4 text-base font-bold text-indigo-400 active:bg-indigo-600/30"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Painel Administrador
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-base font-bold text-white active:bg-white/10"
                >
                  <User className="h-5 w-5 text-zinc-400" />
                  Minha Conta
                </Link>
                <Link
                  to="/depositar"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl bg-emerald-600/20 p-4 text-base font-bold text-emerald-400 active:bg-emerald-600/30"
                >
                  <Wallet className="h-5 w-5" />
                  Depositar Saldo
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                  className="flex items-center gap-3 rounded-xl bg-red-600/20 p-4 text-base font-bold text-red-400 active:bg-red-600/30"
                >
                  <LogOut className="h-5 w-5" />
                  Sair da Conta
                </button>
              </>
            )}

            {!user && (
              <>
                <div className="my-1 h-px bg-white/10" />
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-base font-bold text-white active:bg-white/10"
                >
                  <User className="h-5 w-5 text-zinc-400" />
                  Entrar
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl bg-emerald-600 p-4 text-base font-bold text-white active:bg-emerald-700"
                >
                  Criar Conta
                </Link>
              </>
            )}

            <button
              onClick={toggleLanguage}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-4 text-sm font-bold text-zinc-400 active:bg-white/5"
            >
              <Globe className="h-4 w-4" />
              IDIOMA: {i18n.language.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
