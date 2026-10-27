import React from 'react';
import { User } from 'firebase/auth';
import { FolderDown, LogOut, CheckCircle2, ShieldCheck, HardDrive } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onToggleGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogin, onLogout, isLoggingIn, onToggleGuide }) => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center text-blue-600">
              <FolderDown className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                Drive<span className="text-indigo-600">Downloader</span>
              </span>
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Por Pastas
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Baixe links do Google Drive mantendo toda a estrutura de diretórios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-700 transition-colors font-medium cursor-pointer"
            title="Como usar o aplicativo na equipe"
          >
            <span>📖 Guia da Equipe</span>
          </button>
          {user ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-full pl-2 pr-1.5 py-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-7 h-7 rounded-full object-cover border border-white shadow-xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden md:block text-left text-xs leading-tight pr-1">
                <p className="font-medium text-slate-800 truncate max-w-[150px]">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Conectado ao Drive
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Desconectar conta"
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton onClick={onLogin} loading={isLoggingIn} />
          )}
        </div>
      </div>
    </header>
  );
};
