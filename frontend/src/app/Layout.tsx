import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, CreditCard, Bell, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/hunt', label: 'Hunt', icon: Search },
    { path: '/cards', label: 'Cards', icon: CreditCard },
    { path: '/alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      {/* Sticky Glassmorphic Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 font-display font-extrabold text-2xl tracking-tight text-gray-900 transition-transform active:scale-95"
            >
              <div className="bg-gradient-to-br from-brand-500 to-emerald-600 p-2 rounded-xl text-white shadow-md shadow-brand-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-brand-700 bg-clip-text text-transparent">
                DealHunter
              </span>
            </Link>

            {/* Desktop Nav links */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-4 py-2 rounded-xl text-sm font-semibold tracking-wide flex items-center gap-2 transition-all duration-300 ${
                      active
                        ? 'text-brand-600 bg-brand-50/80 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-brand-500' : 'text-gray-400'}`} />
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
              
              {/* Premium Avatar Indicator */}
              <div className="h-8 w-px bg-gray-200 mx-4" />
              <div className="flex items-center gap-3">
                <div className="relative cursor-pointer transition transform hover:scale-105 active:scale-95">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/10">
                    AH
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
              </div>
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile navigation links */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 pb-4 animate-fadeIn">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'text-brand-600 bg-brand-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-brand-500' : 'text-gray-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-gray-100 pt-4 mt-2 flex items-center gap-3 px-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  AH
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Hunter Account</p>
                  <p className="text-xs text-gray-500">Premium active</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 animate-fadeIn">
        {children}
      </main>

      {/* Modern minimal footer */}
      <footer className="border-t border-gray-200/50 py-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} DealHunter. Optimizing stacks, maximizing savings.</p>
      </footer>
    </div>
  );
}
