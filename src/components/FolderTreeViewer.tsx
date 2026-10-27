import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileArchive,
  Image,
  File,
  Download,
  FolderDown,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Archive,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DriveFileItem } from '../services/drive';
import { formatBytes, isFileSystemAccessSupported } from '../services/localSaver';

interface FolderTreeViewerProps {
  rootName: string;
  files: DriveFileItem[];
  totalFolders: number;
  totalBytes: number;
  onToggleSelect: (id: string) => void;
  onToggleSelectFolder: (folderPath: string, select: boolean) => void;
  onSelectAll: (select: boolean) => void;
  onStartDirectSave: () => void;
  onStartZipDownload: () => void;
  onReset: () => void;
}

export const FolderTreeViewer: React.FC<FolderTreeViewerProps> = ({
  rootName,
  files,
  totalFolders,
  totalBytes,
  onToggleSelect,
  onToggleSelectFolder,
  onSelectAll,
  onStartDirectSave,
  onStartZipDownload,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const isFsSupported = isFileSystemAccessSupported();

  // Group files by their parent directory path
  const groupedFolders = useMemo(() => {
    const groups: Record<string, DriveFileItem[]> = {};

    const filtered = files.filter((f) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        f.name.toLowerCase().includes(term) ||
        f.relativePath.toLowerCase().includes(term)
      );
    });

    filtered.forEach((file) => {
      // Get the directory portion of the relative path
      const parts = file.relativePath.split('/');
      parts.pop(); // remove file name
      const dirPath = parts.join('/') || rootName;

      if (!groups[dirPath]) {
        groups[dirPath] = [];
      }
      groups[dirPath].push(file);
    });

    return groups;
  }, [files, searchTerm, rootName]);

  const selectedCount = files.filter((f) => f.selected !== false).length;
  const selectedBytes = files
    .filter((f) => f.selected !== false)
    .reduce((acc, curr) => acc + (curr.size || 0), 0);

  const toggleFolderCollapse = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

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
      mime.includes('gzip') ||
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
      {/* Top Header Summary */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{rootName}</h2>
                <button
                  onClick={onReset}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
                  title="Trocar link"
                >
                  <RotateCcw className="w-3 h-3" /> Trocar
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-medium text-slate-700">{files.length} arquivos</span>
                <span>•</span>
                <span className="font-medium text-slate-700">{totalFolders} pastas</span>
                <span>•</span>
                <span className="font-medium text-indigo-700">Tamanho total: {formatBytes(totalBytes)}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {selectedCount} selecionados ({formatBytes(selectedBytes)})
                </span>
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {isFsSupported && (
              <button
                type="button"
                onClick={onStartDirectSave}
                disabled={selectedCount === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                title="Cria as pastas reais diretamente no seu computador"
              >
                <HardDrive className="w-4 h-4" />
                <span>Salvar Direto no PC</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartZipDownload}
              disabled={selectedCount === 0}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer ${
                isFsSupported
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300'
              }`}
              title="Baixar arquivo compactado .ZIP contendo todas as pastas separadas"
            >
              <Archive className="w-4 h-4" />
              <span>Baixar como .ZIP</span>
            </button>
          </div>
        </div>

        {/* Tip about direct PC saving */}
        {isFsSupported && (
          <div className="mt-4 p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>Dica:</strong> A opção <em>"Salvar Direto no PC"</em> criará fisicamente cada pasta e arquivo dentro da pasta que você escolher no seu computador (sem precisar descompactar zip)!
            </span>
          </div>
        )}
      </div>

      {/* Toolbar: Search, Select All, Expand All */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <span>
              {selectedCount === files.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            Mostrando {Object.keys(groupedFolders).length} diretórios
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome ou extensão..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Directory and Files List */}
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {Object.keys(groupedFolders).length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum arquivo encontrado com o filtro aplicado.
          </div>
        ) : (
          Object.entries(groupedFolders).map(([folderPath, items]) => {
            const isCollapsed = !!collapsedFolders[folderPath];
            const folderSelectedCount = items.filter((i) => i.selected !== false).length;
            const allFolderSelected = folderSelectedCount === items.length;

            return (
              <div key={folderPath} className="bg-white">
                {/* Folder Header */}
                <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50/50 hover:bg-slate-100/60 transition-colors cursor-pointer select-none border-l-4 border-l-indigo-400">
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={() => toggleFolderCollapse(folderPath)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <Folder className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 text-xs font-mono truncate">
                      {folderPath}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded-full flex-shrink-0">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectFolder(folderPath, !allFolderSelected);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-0.5 rounded hover:bg-indigo-50"
                    >
                      {allFolderSelected ? 'Desmarcar pasta' : 'Marcar pasta'}
                    </button>
                  </div>
                </div>

                {/* Files in Folder */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-50 pl-4 sm:pl-8 pr-6">
                    {items.map((file) => {
                      const isSelected = file.selected !== false;
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-colors hover:bg-slate-50 ${
                            isSelected ? 'text-slate-800' : 'text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
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

                            <div className="flex-shrink-0">{getFileIcon(file)}</div>

                            <span className="truncate font-medium">{file.name}</span>

                            {file.exportExtension && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md font-mono flex-shrink-0">
                                converte p/ {file.exportExtension}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-slate-500 font-mono text-[11px]">
                              {formatBytes(file.size || 0)}
                            </span>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="Ver no Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
