import React, { useState } from 'react';
import {
  Link2,
  Search,
  Clipboard,
  FolderSearch,
  AlertCircle,
  HelpCircle,
  Sparkles,
  FolderGit2,
} from 'lucide-react';

interface DriveLinkInputProps {
  onScan: (urlOrId: string) => void;
  isScanning: boolean;
  scanStatusText?: string;
  quickFolders: Array<{ id: string; name: string }>;
  onSelectQuickFolder: (folder: { id: string; name: string }) => void;
  needsAuth: boolean;
  onLogin: () => void;
}

export const DriveLinkInput: React.FC<DriveLinkInputProps> = ({
  onScan,
  isScanning,
  scanStatusText,
  quickFolders,
  onSelectQuickFolder,
  needsAuth,
  onLogin,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = inputValue.trim();
    if (!val) {
      setErrorMsg('Por favor, cole o link ou ID da pasta do Google Drive.');
      return;
    }

    if (needsAuth) {
      onLogin();
      return;
    }

    onScan(val);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputValue(text.trim());
          setErrorMsg(null);
        }
      }
    } catch {
      // Browser might block clipboard read without user permission
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Download Recursivo com Separação por Pastas
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Insira o Link do Google Drive
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl mx-auto">
            Cole o link de uma pasta compartilhada ou arquivo. O sistema irá mapear todas as
            subpastas e baixar tudo organizado para o seu computador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-50 p-2 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
            <div className="flex items-center gap-3 px-3 flex-1">
              <Link2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="https://drive.google.com/drive/folders/1ABC..."
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none py-2"
                disabled={isScanning}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded"
                  title="Limpar"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 shadow-2xs"
                title="Colar da área de transferência"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Colar</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60 cursor-pointer text-sm sm:text-base"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Escaneando...</span>
                </>
              ) : (
                <>
                  <FolderSearch className="w-4 h-4" />
                  <span>Mapear Arquivos</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 text-rose-600 text-xs sm:text-sm bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isScanning && scanStatusText && (
            <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-indigo-900 animate-pulse">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold">Mapeando pastas: </span>
                <span className="font-mono text-indigo-700">{scanStatusText}</span>
              </div>
            </div>
          )}
        </form>

        {/* Quick folder shortcuts from user's Drive */}
        {quickFolders.length > 0 && !isScanning && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                Pastas Recentes do Seu Drive:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFolders.slice(0, 8).map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectQuickFolder(folder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-700 transition-all font-medium"
                >
                  <span className="text-amber-500">📁</span>
                  <span className="truncate max-w-[160px]">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Helpful instructions accordion/cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>1. Formatos Aceitos</span>
            </div>
            <p className="text-slate-500">
              Links de pastas normais, Drives Compartilhados, arquivos individuais ou IDs diretos.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>2. Subpastas Recursivas</span>
            </div>
            <p className="text-slate-500">
              O sistema navega automaticamente por todas as ramificações e níveis de subpastas.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>3. Conversão Automática</span>
            </div>
            <p className="text-slate-500">
              Google Docs viram .docx, Planilhas viram .xlsx e Apresentações viram .pptx.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
