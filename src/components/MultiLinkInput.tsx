import React, { useState } from 'react';
import {
  Link2,
  ListPlus,
  Clipboard,
  Sparkles,
  AlertCircle,
  Download,
  HardDrive,
  Globe,
  Archive,
  CheckCircle2,
  FolderGit2,
  Layers,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';
import { parseMultipleDriveLinks, extractDriveId } from '../services/drive';
import { isFileSystemAccessSupported } from '../services/localSaver';

interface MultiLinkInputProps {
  onStartAction: (
    links: string[],
    action: 'sequential-direct' | 'sequential-browser' | 'zip' | 'preview'
  ) => void;
  isScanning: boolean;
  scanStatusText?: string;
  quickFolders: Array<{ id: string; name: string }>;
  onSelectQuickFolder: (folder: { id: string; name: string }) => void;
  needsAuth: boolean;
  onLogin: () => void;
}

export const MultiLinkInput: React.FC<MultiLinkInputProps> = ({
  onStartAction,
  isScanning,
  scanStatusText,
  quickFolders,
  onSelectQuickFolder,
  needsAuth,
  onLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'multi' | 'single'>('multi');
  const [singleInput, setSingleInput] = useState('');
  const [multiInput, setMultiInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Method preference: 'direct' (folder on disk) | 'browser' (1 by 1 browser) | 'zip'
  const isFs = isFileSystemAccessSupported();
  const [downloadTarget, setDownloadTarget] = useState<'direct' | 'browser' | 'zip'>(
    isFs ? 'direct' : 'browser'
  );

  // Parse links dynamically in multi mode
  const detectedLinks = parseMultipleDriveLinks(multiInput);

  const getLinksToProcess = (): string[] => {
    if (activeTab === 'single') {
      const val = singleInput.trim();
      if (!val) return [];
      const parsed = extractDriveId(val);
      return parsed ? [val] : [];
    } else {
      if (detectedLinks.length > 0) {
        return detectedLinks.map((d) => d.raw);
      }
      // If user pasted raw text, try splitting by space/line
      const tokens = multiInput
        .split(/[\n\r,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      return tokens.filter((t) => extractDriveId(t) !== null);
    }
  };

  const handleExecuteDownload = (overrideTarget?: 'direct' | 'browser' | 'zip') => {
    setErrorMsg(null);
    const target = overrideTarget || downloadTarget;
    const links = getLinksToProcess();

    if (links.length === 0) {
      setErrorMsg(
        activeTab === 'single'
          ? 'Por favor, digite ou cole um link válido do Google Drive acima.'
          : 'Por favor, cole ao menos um link do Google Drive na caixa de texto (um por linha).'
      );
      return;
    }

    if (needsAuth) {
      onLogin();
      return;
    }

    if (target === 'direct') {
      onStartAction(links, 'sequential-direct');
    } else if (target === 'browser') {
      onStartAction(links, 'sequential-browser');
    } else {
      onStartAction(links, 'zip');
    }
  };

  const handleExecutePreview = () => {
    setErrorMsg(null);
    const links = getLinksToProcess();
    if (links.length === 0) {
      setErrorMsg('Por favor, cole ao menos um link do Google Drive para listar.');
      return;
    }
    if (needsAuth) {
      onLogin();
      return;
    }
    onStartAction(links, 'preview');
  };

  const handlePasteMulti = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setMultiInput((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
          setErrorMsg(null);
        }
      }
    } catch {
      // blocked
    }
  };

  const handlePasteSingle = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSingleInput(text.trim());
          setErrorMsg(null);
        }
      }
    } catch {
      // blocked
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Download Sequencial • 1 Arquivo por Vez na sua Máquina
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cole os Links do Drive e Baixe no Computador
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl mx-auto">
            Cole um ou mais links de pastas e arquivos. O sistema baixa arquivo por arquivo
            mantendo toda a separação por pastas no seu computador.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-center mb-5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('multi');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'multi'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>Vários Links em Lote {detectedLinks.length > 0 ? `(${detectedLinks.length})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('single');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Link Único</span>
            </button>
          </div>
        </div>

        {/* Multi Link Tab Textarea */}
        {activeTab === 'multi' ? (
          <div className="space-y-4">
            <div className="relative bg-slate-50 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 px-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Cole os links abaixo (um por linha):
                </span>
                <div className="flex items-center gap-2">
                  {multiInput && (
                    <button
                      type="button"
                      onClick={() => setMultiInput('')}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePasteMulti}
                    className="flex items-center gap-1 text-xs text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md transition-colors shadow-2xs font-medium cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Colar Links</span>
                  </button>
                </div>
              </div>

              <textarea
                value={multiInput}
                onChange={(e) => {
                  setMultiInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isScanning}
                rows={5}
                placeholder={`https://drive.google.com/drive/folders/1ABC...\nhttps://drive.google.com/file/d/1XYZ.../view\nhttps://drive.google.com/drive/folders/2DEF...`}
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-mono focus:outline-none resize-y"
              />

              {detectedLinks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {detectedLinks.length} {detectedLinks.length === 1 ? 'link do Google Drive detectado' : 'links do Google Drive detectados'}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Pronto para baixar
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single Link Tab Input */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-50 p-2.5 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
              <div className="flex items-center gap-3 px-3 flex-1">
                <Link2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <input
                  type="text"
                  value={singleInput}
                  onChange={(e) => {
                    setSingleInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="https://drive.google.com/drive/folders/1ABC..."
                  className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none py-2"
                  disabled={isScanning}
                />
                {singleInput && (
                  <button
                    type="button"
                    onClick={() => setSingleInput('')}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteSingle}
                  className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 shadow-2xs font-medium cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Colar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Destination Method Options */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              Como deseja receber os arquivos na sua máquina?
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Option 1: Native Direct Folder (Chromium) */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                downloadTarget === 'direct'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
              }`}
            >
              <input
                type="radio"
                name="target"
                value="direct"
                checked={downloadTarget === 'direct'}
                onChange={() => setDownloadTarget('direct')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-left">
                <span className="font-semibold text-xs block">
                  📁 Criar Pastas Reais no PC
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Grava cada arquivo 1 por 1 criando as pastas no seu HD/SSD.
                </span>
              </div>
            </label>

            {/* Option 2: Browser Sequential Downloads */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                downloadTarget === 'browser'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
              }`}
            >
              <input
                type="radio"
                name="target"
                value="browser"
                checked={downloadTarget === 'browser'}
                onChange={() => setDownloadTarget('browser')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-left">
                <span className="font-semibold text-xs block">
                  🌐 Download via Navegador
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Baixa 1 arquivo por vez para a sua pasta de Downloads.
                </span>
              </div>
            </label>

            {/* Option 3: ZIP */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                downloadTarget === 'zip'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
              }`}
            >
              <input
                type="radio"
                name="target"
                value="zip"
                checked={downloadTarget === 'zip'}
                onChange={() => setDownloadTarget('zip')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-left">
                <span className="font-semibold text-xs block">
                  📦 Pacote Compactado .ZIP
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  Agrupa tudo em 1 único arquivo com as pastas organizadas.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 text-rose-700 text-xs sm:text-sm bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* PRIMARY ACTION BUTTONS */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
          {/* THE BIG MAIN DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={() => handleExecuteDownload()}
            disabled={isScanning}
            className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-base sm:text-lg cursor-pointer transform active:scale-[0.99]"
          >
            {isScanning ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mapeando Links...</span>
              </>
            ) : (
              <>
                <Download className="w-6 h-6 animate-bounce" />
                <span>CLIQUE AQUI PARA BAIXAR (1 POR 1)</span>
              </>
            )}
          </button>

          {/* Secondary preview button */}
          <button
            type="button"
            onClick={handleExecutePreview}
            disabled={isScanning}
            className="sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-5 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            title="Apenas ver os arquivos antes de baixar"
          >
            <ListOrdered className="w-4 h-4 text-slate-500" />
            <span>Ver Lista de Arquivos</span>
          </button>
        </div>

        {/* Live Scan Status Text */}
        {isScanning && scanStatusText && (
          <div className="mt-4 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-indigo-900 animate-pulse">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold">Mapeando arquivos para download: </span>
              <span className="font-mono text-indigo-700">{scanStatusText}</span>
            </div>
          </div>
        )}

        {/* Quick folder shortcuts from user's Drive */}
        {quickFolders.length > 0 && !isScanning && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
              Ou escolha uma pasta do seu próprio Drive:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickFolders.slice(0, 8).map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectQuickFolder(folder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-700 transition-all font-medium cursor-pointer"
                >
                  <span className="text-amber-500">📁</span>
                  <span className="truncate max-w-[160px]">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
