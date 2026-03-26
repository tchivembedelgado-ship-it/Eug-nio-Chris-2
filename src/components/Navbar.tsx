import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Home, Wallet, Menu, X, Ticket, Settings, Globe } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-8">
            <Logo className="h-8" showText={true} />
            <div className="hidden items-center gap-6 md:flex">
              <Link to="/" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                {t('nav.home')}
              </Link>
              <Link to="/rifas" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                {t('nav.raffles')}
              </Link>
              <Link to="/sobre-adm" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                Sobre o Admin
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4">


            {/* Mobile Priority Actions */}
            <div className="flex items-center gap-0.5 md:hidden">
              <Link
                to="/rifas"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Ticket className="h-4 w-4" />
              </Link>
              
              {user && (
                <>
                  <div className="flex items-center gap-1 rounded-full bg-primary/10 pl-2 pr-1 py-1">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary">
                      {formatCurrency(profile?.balance || 0)}
                    </span>
                    <Link
                      to="/depositar"
                      className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-black transition-transform active:scale-90"
                    >
                      +
                    </Link>
                  </div>
                  <Link
                    to="/dashboard"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_10px_rgba(0,255,0,0.3)] transition-transform active:scale-90"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-4">
                <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 sm:px-4 md:flex">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary sm:text-sm">
                    {formatCurrency(profile?.balance || 0)}
                  </span>
                  <Link
                    to="/depositar"
                    onClick={closeMenu}
                    className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-black transition-colors hover:bg-primary/80 sm:ml-2"
                  >
                    +
                  </Link>
                </div>
                
                <div className="hidden items-center gap-2 md:flex">
                  {profile?.is_admin && (
                    <div className="flex items-center gap-2">
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden lg:inline">Painel Administrador</span>
                        <span className="lg:hidden">Admin</span>
                      </Link>
                      <Link
                        to="/admin/config-perfil"
                        title="Configurar Perfil"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white"
                      >
                        <Settings className="h-5 w-5" />
                      </Link>
                    </div>
                  )}

                  <Link
                    to="/dashboard"
                    title={user.email?.endsWith('@telefone.local') ? `+${user.email.split('@')[0]}` : (user.email || user.phone)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_20px_rgba(0,255,0,0.2)] transition-all hover:scale-110 hover:shadow-[0_0_25px_rgba(0,255,0,0.4)]"
                  >
                    <User className="h-6 w-6" />
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
                  className="rounded-full p-1 text-zinc-400 hover:bg-white/5 md:hidden"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <Link
                  to="/login"
                  className="text-xs font-medium text-zinc-400 transition-colors hover:text-white sm:text-sm"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-black transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)] sm:px-6 sm:py-2 sm:text-sm"
                >
                  {t('nav.register')}
                </Link>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-white/5 md:hidden"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay - MOVED OUTSIDE NAV TO PREVENT CLIPPING */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm md:hidden"
            />
            
            {/* Side Drawer Menu - Full Height */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-[9999] flex h-screen w-[85%] max-w-[320px] flex-col bg-[#0f172a] shadow-2xl md:hidden"
              style={{ height: '100vh' }}
            >
              {/* Menu Header - Fixed at top */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-6">
                <Logo className="h-8" showText={true} />
                <button
                  onClick={closeMenu}
                  className="rounded-full bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Content - Scrollable area that takes remaining height */}
              <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="flex flex-col gap-4">
                  <Link
                    to="/"
                    onClick={closeMenu}
                    className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-base font-bold text-white transition-all active:scale-95 active:bg-white/10"
                  >
                    <Home className="h-6 w-6 text-primary" />
                    Início
                  </Link>
                  <Link
                    to="/rifas"
                    onClick={closeMenu}
                    className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-base font-bold text-white transition-all active:scale-95 active:bg-white/10"
                  >
                    <Ticket className="h-6 w-6 text-indigo-400" />
                    Rifas
                  </Link>
                  <Link
                    to="/sobre-adm"
                    onClick={closeMenu}
                    className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-base font-bold text-white transition-all active:scale-95 active:bg-white/10"
                  >
                    <Globe className="h-6 w-6 text-emerald-400" />
                    Sobre o Admin
                  </Link>
                  
                  {user ? (
                    <>
                      <div className="my-4 h-px bg-white/10" />
                      {profile?.is_admin && (
                        <>
                          <Link
                            to="/admin"
                            onClick={closeMenu}
                            className="flex items-center gap-4 rounded-2xl bg-indigo-500/10 p-5 text-base font-bold text-indigo-400 transition-all active:scale-95 active:bg-indigo-500/20"
                          >
                            <LayoutDashboard className="h-6 w-6" />
                            Painel Admin
                          </Link>
                          <Link
                            to="/admin/config-perfil"
                            onClick={closeMenu}
                            className="flex items-center gap-4 rounded-2xl bg-zinc-800/50 p-5 text-base font-bold text-zinc-400 transition-all active:scale-95 active:bg-zinc-800/80"
                          >
                            <Settings className="h-6 w-6" />
                            Configurar Perfil
                          </Link>
                        </>
                      )}
                      <Link
                        to="/dashboard"
                        onClick={closeMenu}
                        className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-base font-bold text-white transition-all active:scale-95 active:bg-white/10"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black">
                          <User className="h-6 w-6" />
                        </div>
                        Minha Conta
                      </Link>
                      <Link
                        to="/depositar"
                        onClick={closeMenu}
                        className="flex items-center gap-4 rounded-2xl bg-primary/10 p-5 text-base font-bold text-primary transition-all active:scale-95 active:bg-primary/20"
                      >
                        <Wallet className="h-6 w-6" />
                        Depositar
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-4 rounded-2xl bg-red-500/10 p-5 text-base font-bold text-red-500 transition-all active:scale-95 active:bg-red-500/20"
                      >
                        <LogOut className="h-6 w-6" />
                        Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="my-4 h-px bg-white/10" />
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-base font-bold text-white transition-all active:scale-95 active:bg-white/10"
                      >
                        <User className="h-6 w-6 text-zinc-400" />
                        Entrar
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenu}
                        className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-base font-bold text-black transition-all active:scale-95 active:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        <User className="h-6 w-6" />
                        Criar Conta
                      </Link>
                    </>
                  )}
                </div>


              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
