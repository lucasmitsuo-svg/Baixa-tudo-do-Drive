import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  HardDrive,
  Globe,
  Archive,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  FolderTree,
  Folder,
  Layers,
} from 'lucide-react';
import { DriveFileItem } from '../services/drive';
import { formatBytes, isFileSystemAccessSupported } from '../services/localSaver';

interface DownloadQueueTableProps {
  files: DriveFileItem[];
  isQueueRunning: boolean;
  activeFileId: string | null;
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onStartSequentialDirect: () => void;
  onStartSequentialBrowser: () => void;
  onStartZipDownload: () => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onDownloadSingle: (file: DriveFileItem) => void;
  onReset: () => void;
}

export const DownloadQueueTable: React.FC<DownloadQueueTableProps> = ({
  files,
  isQueueRunning,
  activeFileId,
  onToggleSelect,
  onSelectAll,
  onStartSequentialDirect,
  onStartSequentialBrowser,
  onStartZipDownload,
  onPauseQueue,
  onResumeQueue,
  onDownloadSingle,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');

  const isFsSupported = isFileSystemAccessSupported();

  // Extract unique folders for filtering
  const folderNames = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      const parts = f.relativePath.split('/');
      parts.pop();
      const dir = parts.join('/') || 'Raiz';
      set.add(dir);
    });
    return Array.from(set);
  }, [files]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch =
        !searchTerm ||
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.relativePath.toLowerCase().includes(searchTerm.toLowerCase());

      const parts = f.relativePath.split('/');
      parts.pop();
      const dir = parts.join('/') || 'Raiz';
      const matchesFolder = selectedFolderFilter === 'all' || dir === selectedFolderFilter;

      return matchesSearch && matchesFolder;
    });
  }, [files, searchTerm, selectedFolderFilter]);

  const selectedCount = files.filter((f) => f.selected !== false).length;
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => !f.status || f.status === 'pending').length;

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const selectedBytes = files
    .filter((f) => f.selected !== false)
    .reduce((acc, f) => acc + (f.size || 0), 0);

  const overallProgress =
    files.length > 0 ? Math.round((completedCount / files.length) * 100) : 0;

  const getFileIcon = (file: DriveFileItem) => {
    const name = file.name.toLowerCase();
    const mime = file.mimeType.toLowerCase();

    if (mime.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) {
      return <Image className="w-4 h-4 text-emerald-500" />;
    }
    if (mime.includes('video') || /\.(mp4|mkv|mov|avi|webm)$/.test(name)) {
      return <FileVideo className="w-4 h-4 text-rose-500" />;
    }
    if (mime.includes('audio') || /\.(mp3|wav|ogg|m4a|flac)$/.test(name)) {
      return <FileAudio className="w-4 h-4 text-purple-500" />;
    }
    if (
      mime.includes('sheet') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      /\.(xlsx|xls|csv)$/.test(name)
    ) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (
      mime.includes('document') ||
      mime.includes('word') ||
      mime.includes('pdf') ||
      /\.(docx|doc|pdf|txt|md)$/.test(name)
    ) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (
      mime.includes('zip') ||
      mime.includes('tar') ||
      mime.includes('rar') ||
      /\.(zip|tar|gz|7z|rar)$/.test(name)
    ) {
      return <FileArchive className="w-4 h-4 text-amber-500" />;
    }
    if (/\.(json|js|ts|tsx|jsx|html|css|py|cpp|c|sh)$/.test(name)) {
      return <FileCode className="w-4 h-4 text-cyan-600" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Banner / Summary */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Fila de Download
              </span>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
                title="Inserir novos links"
              >
                <RotateCcw className="w-3 h-3" /> Adicionar / Trocar Links
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {files.length} {files.length === 1 ? 'Arquivo Encontrado' : 'Arquivos Encontrados'}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {completedCount} baixados
              </span>
              <span className="text-slate-500">{pendingCount} pendentes</span>
              {errorCount > 0 && (
                <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  {errorCount} com erro
                </span>
              )}
              <span>•</span>
              <span className="font-medium text-slate-700">Tamanho: {formatBytes(totalBytes)}</span>
              <span>•</span>
              <span className="text-indigo-700 font-medium">
                {selectedCount} selecionados ({formatBytes(selectedBytes)})
              </span>
            </div>
          </div>

          {/* Sequential Execution Controls */}
            {isQueueRunning ? (
              <button
                type="button"
                onClick={onPauseQueue}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-md cursor-pointer animate-pulse"
              >
                <Pause className="w-5 h-5" />
                <span>PAUSAR DOWNLOAD</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {/* Method 1: Direct Save into Local Directory (File System Access) */}
                {isFsSupported && (
                  <button
                    type="button"
                    onClick={onStartSequentialDirect}
                    disabled={selectedCount === 0}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                    title="Cria as pastas no seu computador e salva cada arquivo um por um"
                  >
                    <HardDrive className="w-5 h-5 animate-bounce" />
                    <span>BAIXAR 1 POR 1 NA PASTA LOCAL</span>
                  </button>
                )}

                {/* Method 2: Sequential browser downloads */}
                <button
                  type="button"
                  onClick={onStartSequentialBrowser}
                  disabled={selectedCount === 0}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer ${
                    isFsSupported
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                  }`}
                  title="Dispara o download de cada arquivo um por um pelo navegador"
                >
                  <Globe className="w-4 h-4" />
                  <span>BAIXAR 1 POR 1 VIA NAVEGADOR</span>
                </button>

                {/* Method 3: Download everything as ZIP */}
                <button
                  type="button"
                  onClick={onStartZipDownload}
                  disabled={selectedCount === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Baixar todos os arquivos agrupados em um único arquivo .ZIP"
                >
                  <Archive className="w-4 h-4 text-amber-600" />
                  <span>BAIXAR .ZIP</span>
                </button>
              </div>
            )}
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200/60">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-2">
              {isQueueRunning && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              )}
              <span>Progresso dos Downloads Sequenciais</span>
            </span>
            <span className="font-mono text-indigo-700">{overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectAll(selectedCount !== files.length)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            {selectedCount === files.length ? (
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            ) : selectedCount > 0 ? (
              <div className="w-4 h-4 rounded border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-indigo-600" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{selectedCount === files.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
          </button>

          {folderNames.length > 1 && (
            <>
              <span className="text-slate-300">|</span>
              <select
                value={selectedFolderFilter}
                onChange={(e) => setSelectedFolderFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Todas as Pastas ({folderNames.length})</option>
                {folderNames.map((name) => (
                  <option key={name} value={name}>
                    📁 {name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar arquivo..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Files Table List */}
      <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum arquivo encontrado com os filtros atuais.
          </div>
        ) : (
          filteredFiles.map((file, index) => {
            const isSelected = file.selected !== false;
            const isCurrent = activeFileId === file.id;

            return (
              <div
                key={file.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-6 text-xs transition-colors ${
                  isCurrent
                    ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600'
                    : isSelected
                    ? 'hover:bg-slate-50/80'
                    : 'bg-slate-50/40 text-slate-400 opacity-60'
                }`}
              >
                {/* Left: Checkbox + Icon + Filename + Relative Path */}
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                  <button
                    type="button"
                    onClick={() => onToggleSelect(file.id)}
                    className="focus:outline-none flex-shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  <span className="text-[11px] font-mono text-slate-400 w-6 flex-shrink-0">
                    #{index + 1}
                  </span>

                  <div className="flex-shrink-0">{getFileIcon(file)}</div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{file.name}</span>
                      {file.exportExtension && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-mono">
                          {file.exportExtension}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                      <span className="text-indigo-600 font-mono">📁 {file.relativePath}</span>
                      {file.sourceUrl && (
                        <span className="text-slate-400 truncate max-w-[200px] hidden md:inline">
                          • {file.sourceUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Size + Status + Individual Download Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 flex-shrink-0 pl-7 sm:pl-0">
                  <span className="font-mono text-slate-500 text-[11px]">
                    {formatBytes(file.size || 0)}
                  </span>

                  {/* Status Badge */}
                  {file.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Baixado
                    </span>
                  ) : file.status === 'downloading' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full font-medium animate-pulse">
                      <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Baixando... {file.downloadProgress ? `${file.downloadProgress}%` : ''}
                    </span>
                  ) : file.status === 'error' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-medium" title={file.errorMessage}>
                      <AlertCircle className="w-3 h-3 text-rose-600" /> Falha
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                      <Clock className="w-3 h-3 text-slate-400" /> Na fila
                    </span>
                  )}

                  {/* Individual Download Button */}
                  <button
                    type="button"
                    onClick={() => onDownloadSingle(file)}
                    disabled={isQueueRunning && isCurrent}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 text-[11px] font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-40"
                    title="Baixar apenas este arquivo diretamente na sua máquina"
                  >
                    <Download className="w-3 h-3 text-indigo-600" />
                    <span>Baixar</span>
                  </button>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
