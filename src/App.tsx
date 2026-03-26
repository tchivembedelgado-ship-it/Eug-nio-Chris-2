import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Raffles from './pages/Raffles';
import RaffleDetail from './pages/RaffleDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Support from './pages/Support';
import MySupport from './pages/MySupport';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import MyPrizes from './pages/MyPrizes';
import Logo from './components/Logo';
import ProfileGuard from './components/ProfileGuard';
import AdminDashboard from './pages/admin/AdminDashboard';
import RaffleForm from './pages/admin/RaffleForm';
import AdminDeposits from './pages/admin/DepositApproval';
import AdminWithdrawals from './pages/admin/Withdrawals';
import AdminSupport from './pages/admin/AdminSupport';
import InstantPrizes from './pages/admin/InstantPrizes';
import AdminClaims from './pages/admin/AdminClaims';
import AdminFinance from './pages/admin/AdminFinance';
import AdminProfileConfig from './pages/admin/AdminProfileConfig';
import AdminPublicProfile from './pages/AdminPublicProfile';
import './i18n';

function ProtectedRoute({ children, adminOnly = false, requireProfile = false }: { children: React.ReactNode, adminOnly?: boolean, requireProfile?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !profile?.is_admin) return <Navigate to="/" />;

  if (requireProfile) {
    return <ProfileGuard>{children}</ProfileGuard>;
  }

  return <>{children}</>;
}

export default function App() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const hasKeys = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL';

  if (!hasKeys) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center text-white">
        <div className="max-w-md space-y-6 rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 shadow-2xl">
          <h2 className="text-3xl font-black tracking-tighter text-primary">Configuração Necessária</h2>
          <p className="text-zinc-400">
            Para colocar a RifaAngola a funcionar, precisa de configurar o Supabase.
          </p>
          <div className="space-y-4 text-left text-sm">
            <p><strong>1.</strong> Crie um projeto em <a href="https://supabase.com" target="_blank" className="text-primary underline">supabase.com</a></p>
            <p><strong>2.</strong> Vá a Project Settings → API</p>
            <p><strong>3.</strong> Adicione os seguintes <strong>Secrets</strong> no AI Studio (⚙️):</p>
            <ul className="list-disc space-y-2 pl-5 text-zinc-500">
              <li><code>VITE_SUPABASE_URL</code></li>
              <li><code>VITE_SUPABASE_ANON_KEY</code></li>
            </ul>
          </div>
          <p className="text-xs text-zinc-500 italic">A aplicação irá recarregar automaticamente após guardar os segredos.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rifas" element={<Raffles />} />
              <Route path="/rifas/:id" element={
                <ProtectedRoute requireProfile={false}>
                  <RaffleDetail />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute requireProfile={false}>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/depositar" element={
                <ProtectedRoute requireProfile={false}>
                  <Deposit />
                </ProtectedRoute>
              } />

              <Route path="/levantar" element={
                <ProtectedRoute requireProfile={true}>
                  <Withdraw />
                </ProtectedRoute>
              } />

            <Route path="/suporte" element={
                <ProtectedRoute requireProfile={false}>
                  <Support />
                </ProtectedRoute>
              } />

              <Route path="/meu-suporte" element={
                <ProtectedRoute requireProfile={false}>
                  <MySupport />
                </ProtectedRoute>
              } />

              <Route path="/perfil" element={
                <ProtectedRoute requireProfile={false}>
                  <Profile />
                </ProtectedRoute>
              } />

              <Route path="/transacoes" element={
                <ProtectedRoute requireProfile={false}>
                  <Transactions />
                </ProtectedRoute>
              } />

              <Route path="/meus-premios" element={
                <ProtectedRoute requireProfile={true}>
                  <MyPrizes />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/raffles/new" element={
                <ProtectedRoute adminOnly>
                  <RaffleForm />
                </ProtectedRoute>
              } />

              <Route path="/admin/raffles/edit/:id" element={
                <ProtectedRoute adminOnly>
                  <RaffleForm />
                </ProtectedRoute>
              } />

              <Route path="/admin/deposits" element={
                <ProtectedRoute adminOnly>
                  <AdminDeposits />
                </ProtectedRoute>
              } />

              <Route path="/admin/withdrawals" element={
                <ProtectedRoute adminOnly>
                  <AdminWithdrawals />
                </ProtectedRoute>
              } />

              <Route path="/admin/prizes" element={
                <ProtectedRoute adminOnly>
                  <InstantPrizes />
                </ProtectedRoute>
              } />

              <Route path="/admin/claims" element={
                <ProtectedRoute adminOnly>
                  <AdminClaims />
                </ProtectedRoute>
              } />

              <Route path="/admin/support" element={
                <ProtectedRoute adminOnly>
                  <AdminSupport />
                </ProtectedRoute>
              } />

              <Route path="/admin/finance" element={
                <ProtectedRoute adminOnly>
                  <AdminFinance />
                </ProtectedRoute>
              } />

              <Route path="/admin/config-perfil" element={
                <ProtectedRoute adminOnly>
                  <AdminProfileConfig />
                </ProtectedRoute>
              } />

              <Route path="/sobre-adm" element={
                <AdminPublicProfile />
              } />
            </Routes>
          </main>
          
          <footer className="border-t border-white/5 bg-zinc-900/30 py-12">
            <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
              <div className="mb-8 flex justify-center">
                <Logo className="h-12" />
              </div>
              <div className="mb-4 flex justify-center gap-6">
                <Link to="/sobre-adm" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                  Sobre o Admin
                </Link>
                <Link to="/suporte" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                  Suporte
                </Link>
              </div>
              <p className="text-sm text-zinc-500">
                © 2026 RifaAngola. Todos os direitos reservados. Jogue com responsabilidade. <span className="ml-2 inline-block rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">+18</span>
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
