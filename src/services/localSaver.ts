import JSZip from 'jszip';
import { DriveFileItem, downloadFileBlob } from './drive';

export interface DownloadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFileName: string;
  currentFileBytes: { loaded: number; total: number };
  totalBytesProcessed: number;
  estimatedTotalBytes: number;
  percentage: number;
  status: 'idle' | 'downloading' | 'compressing' | 'saving' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
  log: Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }>;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Downloads a single file and prompts browser to save it
 */
export async function downloadSingleFileToBrowser(
  file: DriveFileItem,
  accessToken: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const blob = await downloadFileBlob(file, accessToken, onProgress);
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

/**
 * Saves a single file directly to an already selected FileSystemDirectoryHandle, creating subfolders if specified
 */
export async function saveSingleFileToDirectory(
  file: DriveFileItem,
  rootDirHandle: FileSystemDirectoryHandle,
  accessToken: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const blob = await downloadFileBlob(file, accessToken, onProgress);

  const segments = file.relativePath.split('/').filter(Boolean);
  const fileName = segments.pop() || file.name;

  let currentHandle: FileSystemDirectoryHandle = rootDirHandle;
  for (const folderName of segments) {
    currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: true });
  }

  const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Saves all selected files directly into a chosen local folder using the File System Access API
 */
export async function saveFilesToLocalDirectory(
  files: DriveFileItem[],
  accessToken: string,
  onProgress: (prog: Partial<DownloadProgress>) => void,
  shouldCancel: () => boolean
): Promise<{ successCount: number; failureCount: number }> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('A API File System Access não é suportada neste navegador. Utilize o download pelo navegador ou como ZIP.');
  }

  // Ask user to pick a folder on their computer once
  // @ts-expect-error - showDirectoryPicker on Window
  const rootDirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'downloads',
  });

  const selectedFiles = files.filter((f) => f.selected !== false);
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < selectedFiles.length; i++) {
    if (shouldCancel()) {
      break;
    }

    const file = selectedFiles[i];
    onProgress({
      totalFiles: selectedFiles.length,
      completedFiles: completed,
      failedFiles: failed,
      currentFileName: file.name,
      currentFileBytes: { loaded: 0, total: file.size || 0 },
      percentage: Math.round((completed / selectedFiles.length) * 100),
      status: 'downloading',
    });

    try {
      await saveSingleFileToDirectory(file, rootDirHandle, accessToken, (loaded, total) => {
        onProgress({
          currentFileBytes: { loaded, total },
        });
      });

      completed++;
    } catch (err: unknown) {
      console.error(`Erro ao salvar arquivo ${file.name}:`, err);
      failed++;
    }
  }

  return { successCount: completed, failureCount: failed };
}

/**
 * Downloads files sequentially 1 by 1 directly via browser download triggers
 */
export async function downloadFilesSequentiallyViaBrowser(
  files: DriveFileItem[],
  accessToken: string,
  onProgress: (prog: Partial<DownloadProgress>) => void,
  shouldCancel: () => boolean,
  delayBetweenMs = 800
): Promise<{ successCount: number; failureCount: number }> {
  const selectedFiles = files.filter((f) => f.selected !== false);
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < selectedFiles.length; i++) {
    if (shouldCancel()) {
      break;
    }

    const file = selectedFiles[i];
    onProgress({
      totalFiles: selectedFiles.length,
      completedFiles: completed,
      failedFiles: failed,
      currentFileName: file.name,
      currentFileBytes: { loaded: 0, total: file.size || 0 },
      percentage: Math.round((completed / selectedFiles.length) * 100),
      status: 'downloading',
    });

    try {
      await downloadSingleFileToBrowser(file, accessToken, (loaded, total) => {
        onProgress({
          currentFileBytes: { loaded, total },
        });
      });

      completed++;

      // Small delay between browser downloads to prevent browser popup blockers from blocking downloads
      if (i < selectedFiles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
      }
    } catch (err: unknown) {
      console.error(`Erro ao baixar ${file.name}:`, err);
      failed++;
    }
  }

  return { successCount: completed, failureCount: failed };
}

/**
 * Downloads all selected files into an organized ZIP preserving the folder tree
 */
export async function downloadFilesAsZip(
  files: DriveFileItem[],
  zipName: string,
  accessToken: string,
  onProgress: (prog: Partial<DownloadProgress>) => void,
  shouldCancel: () => boolean
): Promise<{ successCount: number; failureCount: number }> {
  const zip = new JSZip();
  const selectedFiles = files.filter((f) => f.selected !== false);
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < selectedFiles.length; i++) {
    if (shouldCancel()) {
      break;
    }

    const file = selectedFiles[i];
    onProgress({
      totalFiles: selectedFiles.length,
      completedFiles: completed,
      failedFiles: failed,
      currentFileName: file.name,
      currentFileBytes: { loaded: 0, total: file.size || 0 },
      percentage: Math.round(((i) / selectedFiles.length) * 90),
      status: 'downloading',
    });

    try {
      const blob = await downloadFileBlob(file, accessToken, (loaded, total) => {
        onProgress({
          currentFileBytes: { loaded, total },
        });
      });

      // JSZip supports paths directly e.g. "Pasta/Subpasta/arquivo.pdf"
      zip.file(file.relativePath, blob);
      completed++;
    } catch (err: unknown) {
      console.error(`Erro ao adicionar ${file.name} ao ZIP:`, err);
      failed++;
    }
  }

  if (shouldCancel()) {
    return { successCount: completed, failureCount: failed };
  }

  onProgress({
    status: 'compressing',
    percentage: 95,
    currentFileName: 'Gerando arquivo ZIP final...',
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger browser download
  const cleanZipName = zipName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'GoogleDrive_Arquivos';
  const finalFilename = cleanZipName.endsWith('.zip') ? cleanZipName : `${cleanZipName}.zip`;

  const blobUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = finalFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  return { successCount: completed, failureCount: failed };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
