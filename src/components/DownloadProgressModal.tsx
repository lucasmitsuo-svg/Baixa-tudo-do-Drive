import React from 'react';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileDown,
  HardDrive,
  Archive,
  Loader2,
} from 'lucide-react';
import { DownloadProgress, formatBytes } from '../services/localSaver';

interface DownloadProgressModalProps {
  progress: DownloadProgress;
  mode: 'direct' | 'zip';
  onCancel: () => void;
  onClose: () => void;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  progress,
  mode,
  onCancel,
  onClose,
}) => {
  const isFinished = progress.status === 'completed';
  const isError = progress.status === 'error';
  const isCancelled = progress.status === 'cancelled';
  const isWorking = !isFinished && !isError && !isCancelled;

  const currentFileLoaded = progress.currentFileBytes.loaded;
  const currentFileTotal = progress.currentFileBytes.total;
  const currentFilePercent =
    currentFileTotal > 0 ? Math.round((currentFileLoaded / currentFileTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isFinished
                  ? 'bg-emerald-100 text-emerald-600'
                  : isError
                  ? 'bg-rose-100 text-rose-600'
                  : isCancelled
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              {isFinished ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isError ? (
                <XCircle className="w-6 h-6" />
              ) : isCancelled ? (
                <AlertTriangle className="w-6 h-6" />
              ) : mode === 'direct' ? (
                <HardDrive className="w-5 h-5 animate-bounce" />
              ) : (
                <Archive className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isFinished
                  ? 'Download Concluído com Sucesso!'
                  : isCancelled
                  ? 'Download Cancelado'
                  : isError
                  ? 'Ocorreu um Erro'
                  : mode === 'direct'
                  ? 'Salvando Pastas Direto no Computador...'
                  : 'Baixando e Gerando Arquivo ZIP...'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'direct'
                  ? 'Escrevendo arquivos na estrutura de diretórios escolhida'
                  : 'Compactando todas as pastas em um único arquivo .zip'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Main Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                {isWorking && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                Progresso Geral
              </span>
              <span className="font-mono text-indigo-600 text-sm">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFinished
                    ? 'bg-emerald-500'
                    : isError
                    ? 'bg-rose-500'
                    : isCancelled
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, progress.percentage))}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Arquivos Baixados</span>
              <span className="text-base font-bold text-slate-800">
                {progress.completedFiles}{' '}
                <span className="text-xs font-normal text-slate-400">/ {progress.totalFiles}</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Falhas / Ignorados</span>
              <span
                className={`text-base font-bold ${
                  progress.failedFiles > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {progress.failedFiles}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Modo</span>
              <span className="text-xs font-bold text-indigo-700 uppercase mt-1 inline-block">
                {mode === 'direct' ? 'Pastas Físicas' : 'Arquivo .ZIP'}
              </span>
            </div>
          </div>

          {/* Current File Activity */}
          {isWorking && progress.currentFileName && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-indigo-900 truncate max-w-[340px]">
                  {progress.currentFileName}
                </span>
                {currentFileTotal > 0 && (
                  <span className="text-slate-500 font-mono text-[11px]">
                    {formatBytes(currentFileLoaded)} / {formatBytes(currentFileTotal)}
                  </span>
                )}
              </div>
              {currentFileTotal > 0 && (
                <div className="w-full bg-indigo-200/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                    style={{ width: `${currentFilePercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Activity Log preview */}
          {progress.log.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Registro de Atividades:
              </span>
              <div className="bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                {progress.log.slice(-15).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 select-none">{entry.time}</span>
                    <span
                      className={
                        entry.type === 'success'
                          ? 'text-emerald-400'
                          : entry.type === 'error'
                          ? 'text-rose-400'
                          : entry.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isError && progress.errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {progress.errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          {isWorking ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancelar Download
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
