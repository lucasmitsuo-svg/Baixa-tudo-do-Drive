/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from './services/auth';
import {
  extractDriveId,
  getFileMetadata,
  scanDriveFolderRecursive,
  scanMultipleDriveLinks,
  DriveFileItem,
  listUserQuickFolders,
  FOLDER_MIME,
} from './services/drive';
import {
  DownloadProgress,
  downloadSingleFileToBrowser,
  saveSingleFileToDirectory,
  downloadFilesAsZip,
  isFileSystemAccessSupported,
} from './services/localSaver';
import { Header } from './components/Header';
import { MultiLinkInput } from './components/MultiLinkInput';
import { DownloadQueueTable } from './components/DownloadQueueTable';
import { DownloadProgressModal } from './components/DownloadProgressModal';
import { TeamGuideModal } from './components/TeamGuideModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import {
  FolderTree,
  ListOrdered,
  Layers,
  FolderSync,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [quickFolders, setQuickFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [showGuide, setShowGuide] = useState(false);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scannedFiles, setScannedFiles] = useState<DriveFileItem[]>([]);
  const [scanErrors, setScanErrors] = useState<Array<{ link: string; error: string }>>([]);
  const [scanGeneralError, setScanGeneralError] = useState<string | null>(null);

  // Queue state
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const isPausedRef = useRef(false);
  const cancelQueueRef = useRef(false);
  const cancelScanRef = useRef(false);

  // ZIP Download progress modal state
  const [zipProgress, setZipProgress] = useState<DownloadProgress | null>(null);
  const cancelZipRef = useRef(false);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        loadQuickFolders(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setQuickFolders([]);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadQuickFolders = async (token: string) => {
    try {
      const folders = await listUserQuickFolders(token);
      setQuickFolders(folders);
    } catch {
      // Non-critical, ignore
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        loadQuickFolders(res.accessToken);
      }
    } catch (err: unknown) {
      console.error('Falha no login Google:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setScannedFiles([]);
  };

  const ensureToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    const res = await googleSignIn();
    if (!res) return null;
    setUser(res.user);
    setAccessToken(res.accessToken);
    return res.accessToken;
  };

  // Immediate Unified Handler triggered directly from the MultiLinkInput card
  const handleStartAction = async (
    links: string[],
    action: 'sequential-direct' | 'sequential-browser' | 'zip' | 'preview'
  ) => {
    const token = await ensureToken();
    if (!token) return;

    setIsScanning(true);
    setScanGeneralError(null);
    setScanErrors([]);
    setScanStatusText(`Mapeando ${links.length} link(s)...`);
    cancelScanRef.current = false;

    try {
      const res = await scanMultipleDriveLinks(
        links,
        token,
        (prog) => {
          setScanStatusText(
            `Link ${prog.currentLinkIndex || 1}/${prog.totalLinksCount || links.length}: ${prog.totalFilesFound} arquivos mapeados em ${prog.totalFoldersScanned} pastas`
          );
        },
        () => cancelScanRef.current
      );

      setScannedFiles(res.files);
      setScanErrors(res.errors);

      if (res.files.length === 0) {
        if (res.errors.length > 0) {
          setScanGeneralError('Não foi possível acessar os arquivos. Verifique se os links possuem permissão de leitura.');
        } else {
          setScanGeneralError('Nenhum arquivo encontrado nos links fornecidos.');
        }
        return;
      }

      // Immediately launch the requested download method!
      if (action === 'sequential-direct') {
        runSequentialDirect(res.files, token);
      } else if (action === 'sequential-browser') {
        runSequentialBrowser(res.files, token);
      } else if (action === 'zip') {
        runZip(res.files, token);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar links do Google Drive.';
      setScanGeneralError(msg);
    } finally {
      setIsScanning(false);
      setScanStatusText('');
    }
  };

  const handleSelectQuickFolder = (folder: { id: string; name: string }) => {
    handleStartAction([folder.id], 'preview');
  };

  const handleToggleSelectFile = (fileId: string) => {
    setScannedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setScannedFiles((prev) => prev.map((f) => ({ ...f, selected: select })));
  };

  // Download ONE single file individually to browser
  const handleDownloadSingle = async (file: DriveFileItem) => {
    const token = await ensureToken();
    if (!token) return;

    setScannedFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, status: 'downloading', downloadProgress: 0 } : f
      )
    );

    try {
      await downloadSingleFileToBrowser(file, token, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 50;
        setScannedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, downloadProgress: percent } : f
          )
        );
      });

      setScannedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, status: 'completed', downloadProgress: 100, errorMessage: undefined }
            : f
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao baixar arquivo.';
      setScannedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'error', errorMessage: msg } : f
        )
      );
    }
  };

  // EXECUTION ENGINE 1: SEQUENTIAL DIRECT LOCAL FOLDER SAVING
  const runSequentialDirect = async (filesList: DriveFileItem[], token: string) => {
    if (!isFileSystemAccessSupported()) {
      alert(
        'A gravação direta com criação de pastas requer Chrome, Edge ou Opera. Iniciando download 1 por 1 pelo navegador...'
      );
      runSequentialBrowser(filesList, token);
      return;
    }

    // Prompt user once for destination directory on PC
    let rootDirHandle: FileSystemDirectoryHandle;
    try {
      // @ts-expect-error - showDirectoryPicker on Window
      rootDirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads',
      });
    } catch {
      // User cancelled picker dialog
      return;
    }

    setIsQueueRunning(true);
    cancelQueueRef.current = false;
    isPausedRef.current = false;

    const filesToProcess = filesList.filter(
      (f) => f.selected !== false && f.status !== 'completed'
    );

    for (const file of filesToProcess) {
      if (cancelQueueRef.current) break;

      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelQueueRef.current) break;
      }
      if (cancelQueueRef.current) break;

      setActiveFileId(file.id);

      setScannedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'downloading', downloadProgress: 0 } : f
        )
      );

      try {
        await saveSingleFileToDirectory(file, rootDirHandle, token, (loaded, total) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 50;
          setScannedFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, downloadProgress: percent } : f
            )
          );
        });

        setScannedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'completed', downloadProgress: 100, errorMessage: undefined }
              : f
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar arquivo';
        setScannedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'error', errorMessage: msg } : f
          )
        );
      }
    }

    setActiveFileId(null);
    setIsQueueRunning(false);
  };

  // EXECUTION ENGINE 2: SEQUENTIAL BROWSER DOWNLOADS
  const runSequentialBrowser = async (filesList: DriveFileItem[], token: string) => {
    setIsQueueRunning(true);
    cancelQueueRef.current = false;
    isPausedRef.current = false;

    const filesToProcess = filesList.filter(
      (f) => f.selected !== false && f.status !== 'completed'
    );

    for (let i = 0; i < filesToProcess.length; i++) {
      if (cancelQueueRef.current) break;

      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelQueueRef.current) break;
      }
      if (cancelQueueRef.current) break;

      const file = filesToProcess[i];
      setActiveFileId(file.id);

      setScannedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'downloading', downloadProgress: 0 } : f
        )
      );

      try {
        await downloadSingleFileToBrowser(file, token, (loaded, total) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 50;
          setScannedFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, downloadProgress: percent } : f
            )
          );
        });

        setScannedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'completed', downloadProgress: 100, errorMessage: undefined }
              : f
          )
        );

        // Interval between file downloads so browser download manager registers each one cleanly
        if (i < filesToProcess.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao baixar arquivo';
        setScannedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'error', errorMessage: msg } : f
          )
        );
      }
    }

    setActiveFileId(null);
    setIsQueueRunning(false);
  };

  // EXECUTION ENGINE 3: ZIP DOWNLOAD
  const runZip = async (filesList: DriveFileItem[], token: string) => {
    cancelZipRef.current = false;
    const initialProgress: DownloadProgress = {
      totalFiles: filesList.filter((f) => f.selected !== false).length,
      completedFiles: 0,
      failedFiles: 0,
      currentFileName: 'Preparando arquivos...',
      currentFileBytes: { loaded: 0, total: 0 },
      totalBytesProcessed: 0,
      estimatedTotalBytes: 0,
      percentage: 0,
      status: 'downloading',
      log: [
        {
          time: new Date().toLocaleTimeString(),
          text: 'Iniciando download dos arquivos para compactação...',
          type: 'info',
        },
      ],
    };
    setZipProgress(initialProgress);

    try {
      const res = await downloadFilesAsZip(
        filesList,
        'Arquivos_GoogleDrive',
        token,
        (update) => {
          setZipProgress((prev) => {
            if (!prev) return null;
            const newLog = [...prev.log];
            if (update.currentFileName && update.currentFileName !== prev.currentFileName) {
              newLog.push({
                time: new Date().toLocaleTimeString(),
                text:
                  update.status === 'compressing'
                    ? update.currentFileName
                    : `Baixando: ${update.currentFileName}`,
                type: update.status === 'compressing' ? 'warning' : 'info',
              });
            }
            return {
              ...prev,
              ...update,
              log: newLog,
            };
          });
        },
        () => cancelZipRef.current
      );

      if (cancelZipRef.current) {
        setZipProgress((prev) =>
          prev ? { ...prev, status: 'cancelled', currentFileName: 'Operação cancelada.' } : null
        );
      } else {
        setZipProgress((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                percentage: 100,
                completedFiles: res.successCount,
                failedFiles: res.failureCount,
                log: [
                  ...prev.log,
                  {
                    time: new Date().toLocaleTimeString(),
                    text: `✓ Sucesso! ${res.successCount} arquivo(s) empacotados no arquivo ZIP.`,
                    type: 'success',
                  },
                ],
              }
            : null
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar ZIP.';
      setZipProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: msg,
              log: [
                ...prev.log,
                { time: new Date().toLocaleTimeString(), text: `Erro: ${msg}`, type: 'error' },
              ],
            }
          : null
      );
    }
  };

  const handlePauseQueue = () => {
    isPausedRef.current = true;
    setIsQueueRunning(false);
  };

  const handleResumeQueue = () => {
    isPausedRef.current = false;
    setIsQueueRunning(true);
  };

  const handleReset = () => {
    cancelQueueRef.current = true;
    setIsQueueRunning(false);
    setActiveFileId(null);
    setScannedFiles([]);
    setScanGeneralError(null);
    setScanErrors([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onToggleGuide={() => setShowGuide(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner if not signed in */}
        {!user && (
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
                <FolderSync className="w-3.5 h-3.5 text-amber-300" />
                Conexão com Google Drive
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Múltiplos Links & Download 1 por 1
              </h2>
              <p className="text-indigo-100 text-sm max-w-xl">
                Conecte sua conta do Google para colar vários links de pastas ou arquivos e baixar
                cada arquivo na sua máquina de forma sequencial ou sob demanda.
              </p>
            </div>
            <div className="flex-shrink-0">
              <GoogleSignInButton onClick={handleLogin} loading={isLoggingIn} />
            </div>
          </div>
        )}

        {/* Input Form (Shown when queue is empty or user is adding more links) */}
        {scannedFiles.length === 0 && (
          <MultiLinkInput
            onStartAction={handleStartAction}
            isScanning={isScanning}
            scanStatusText={scanStatusText}
            quickFolders={quickFolders}
            onSelectQuickFolder={handleSelectQuickFolder}
            needsAuth={!user}
            onLogin={handleLogin}
          />
        )}

        {/* Errors list if any links failed */}
        {(scanGeneralError || scanErrors.length > 0) && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs sm:text-sm space-y-2">
            <div className="font-semibold flex items-center gap-2 text-rose-900">
              <span>Atenção ao processar links:</span>
            </div>
            {scanGeneralError && <p>{scanGeneralError}</p>}
            {scanErrors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-rose-700 font-mono text-[11px]">
                {scanErrors.map((err, i) => (
                  <li key={i}>
                    {err.link}: {err.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Download Queue View (Shown when files are scanned) */}
        {scannedFiles.length > 0 && (
          <DownloadQueueTable
            files={scannedFiles}
            isQueueRunning={isQueueRunning}
            activeFileId={activeFileId}
            onToggleSelect={handleToggleSelectFile}
            onSelectAll={handleSelectAll}
            onStartSequentialDirect={async () => {
              const token = await ensureToken();
              if (token) runSequentialDirect(scannedFiles, token);
            }}
            onStartSequentialBrowser={async () => {
              const token = await ensureToken();
              if (token) runSequentialBrowser(scannedFiles, token);
            }}
            onStartZipDownload={async () => {
              const token = await ensureToken();
              if (token) runZip(scannedFiles, token);
            }}
            onPauseQueue={handlePauseQueue}
            onResumeQueue={handleResumeQueue}
            onDownloadSingle={handleDownloadSingle}
            onReset={handleReset}
          />
        )}

        {/* Feature Highlights Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Download 1 por 1</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Processa sequencialmente arquivo por arquivo sem travar o navegador ou exceder limites de conexão.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Vários Links em Lote</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cole múltiplos links de pastas e arquivos de uma vez só. O sistema agrupa tudo em uma fila única organizada.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Separação por Pastas</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mantém a hierarquia de cada pasta mapeada criando as pastas físicas no computador ou exportando em ZIP.
            </p>
          </div>
        </section>
      </main>

      {/* ZIP Progress Modal */}
      {zipProgress && (
        <DownloadProgressModal
          progress={zipProgress}
          mode="zip"
          onCancel={() => {
            cancelZipRef.current = true;
          }}
          onClose={() => setZipProgress(null)}
        />
      )}

      {/* Team Guide Modal */}
      <TeamGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>DriveFolderDownloader • Baixe arquivos do Google Drive 1 por 1 na sua máquina</p>
          <p className="text-[11px] text-slate-400">
            Separação automática por diretórios
          </p>
        </div>
      </footer>
    </div>
  );
}
