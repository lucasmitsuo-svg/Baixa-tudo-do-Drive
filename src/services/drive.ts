export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number; // in bytes
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  relativePath: string; // e.g. "Minhas Imagens/2024/foto.jpg"
  folderId?: string;
  isFolder: boolean;
  exportMimeType?: string;
  exportExtension?: string;
  selected?: boolean;
  // Queue tracking fields
  sourceUrl?: string;
  status?: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
  downloadProgress?: number; // 0 to 100
  errorMessage?: string;
}

export interface FolderScanProgress {
  totalFoldersScanned: number;
  totalFilesFound: number;
  currentFolderScanning: string;
  totalBytesEstimate: number;
  currentLinkIndex?: number;
  totalLinksCount?: number;
}

// Google Docs export mapping
export const GOOGLE_APPS_EXPORT_MAP: Record<string, { exportMime: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    exportMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: '.docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
  },
  'application/vnd.google-apps.presentation': {
    exportMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: '.pptx',
  },
  'application/vnd.google-apps.drawing': {
    exportMime: 'image/png',
    ext: '.png',
  },
  'application/vnd.google-apps.script': {
    exportMime: 'application/vnd.google-apps.script+json',
    ext: '.json',
  },
};

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Extracts a Google Drive Folder or File ID from various link formats or direct IDs
 */
export function extractDriveId(input: string): { id: string; type: 'folder' | 'file' | 'unknown' } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Folder URL patterns:
  // https://drive.google.com/drive/folders/1ABC...
  // https://drive.google.com/drive/u/0/folders/1ABC...
  // https://drive.google.com/folderview?id=1ABC...
  const folderMatch = trimmed.match(/(?:folders\/|folderview\?id=)([a-zA-Z0-9_-]{10,})/);
  if (folderMatch && folderMatch[1]) {
    return { id: folderMatch[1], type: 'folder' };
  }

  // 2. File and Docs URL patterns:
  // https://drive.google.com/file/d/1ABC.../view
  // https://docs.google.com/document/d/1ABC.../edit
  // https://docs.google.com/spreadsheets/d/1ABC.../edit
  // https://docs.google.com/presentation/d/1ABC.../edit
  const fileMatch = trimmed.match(/(?:\/file\/d\/|\/document\/d\/|\/spreadsheets\/d\/|\/presentation\/d\/|\/d\/)([a-zA-Z0-9_-]{10,})/);
  if (fileMatch && fileMatch[1]) {
    return { id: fileMatch[1], type: 'file' };
  }

  // 3. Parameter patterns:
  // https://drive.google.com/open?id=1ABC...
  // https://drive.google.com/uc?id=1ABC...
  const paramMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (paramMatch && paramMatch[1]) {
    return { id: paramMatch[1], type: 'unknown' };
  }

  // 4. Any general Drive URL containing alphanumeric ID
  const generalDriveMatch = trimmed.match(/google\.com\/[^ \n\r\t]+[=/]([a-zA-Z0-9_-]{15,60})/);
  if (generalDriveMatch && generalDriveMatch[1]) {
    return { id: generalDriveMatch[1], type: 'unknown' };
  }

  // 5. Direct alphanumeric ID (standard Drive IDs are 15-60 characters)
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return { id: trimmed, type: 'unknown' };
  }

  // 6. If user pasted a string with an ID anywhere:
  const anyIdMatch = trimmed.match(/[a-zA-Z0-9_-]{25,50}/);
  if (anyIdMatch) {
    return { id: anyIdMatch[0], type: 'unknown' };
  }

  return null;
}

/**
 * Parses multiple links or IDs from raw multi-line or comma-separated text
 */
export function parseMultipleDriveLinks(rawText: string): Array<{ raw: string; id: string; type: 'folder' | 'file' | 'unknown' }> {
  if (!rawText || !rawText.trim()) return [];

  // Split by line breaks, commas, semicolons, or spaces
  const tokens = rawText
    .split(/[\n\r,;\s]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const seenIds = new Set<string>();
  const parsedList: Array<{ raw: string; id: string; type: 'folder' | 'file' | 'unknown' }> = [];

  for (const token of tokens) {
    const extracted = extractDriveId(token);
    if (extracted && !seenIds.has(extracted.id)) {
      seenIds.add(extracted.id);
      parsedList.push({
        raw: token,
        id: extracted.id,
        type: extracted.type,
      });
    }
  }

  // If tokens didn't match (e.g. text containing embedded links), search for full URLs
  if (parsedList.length === 0) {
    const urlMatches = rawText.match(/(https?:\/\/[^\s"'<>]+)/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        const extracted = extractDriveId(url);
        if (extracted && !seenIds.has(extracted.id)) {
          seenIds.add(extracted.id);
          parsedList.push({
            raw: url,
            id: extracted.id,
            type: extracted.type,
          });
        }
      }
    }
  }

  return parsedList;
}

/**
 * Fetch metadata of a file or folder
 */
export async function getFileMetadata(
  fileId: string,
  accessToken: string
): Promise<{ id: string; name: string; mimeType: string; size?: string; webViewLink?: string; iconLink?: string }> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink,iconLink&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message ||
        `Erro ao buscar informações do Drive (${res.status}). Verifique se o link possui permissão de leitura.`
    );
  }

  return res.json();
}

/**
 * List files inside a specific parent folder with pagination
 */
export async function listFolderChildren(
  folderId: string,
  accessToken: string
): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
}>> {
  const allItems: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    webViewLink?: string;
    iconLink?: string;
    shortcutDetails?: { targetId?: string; targetMimeType?: string };
  }> = [];

  let pageToken: string | null = null;

  do {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent(
      'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, shortcutDetails)'
    );
    let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Sua sessão com o Google expirou. Por favor, clique em Entrar com o Google para renovar.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ao listar conteúdo da pasta (${res.status})`);
    }

    const data = await res.json();
    if (data.files && Array.isArray(data.files)) {
      allItems.push(...data.files);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return allItems;
}

/**
 * Recursively scans a folder and all subfolders, returning a flat list of all files with their relative paths
 */
export async function scanDriveFolderRecursive(
  rootFolderId: string,
  rootFolderName: string,
  accessToken: string,
  onProgress?: (progress: FolderScanProgress) => void,
  shouldCancel?: () => boolean,
  basePrefix = ''
): Promise<{ files: DriveFileItem[]; totalFolders: number; totalBytes: number }> {
  const allFiles: DriveFileItem[] = [];
  let totalFolders = 1;
  let totalBytes = 0;

  const initialRelativePath = basePrefix ? `${basePrefix}/${rootFolderName}` : rootFolderName;

  // Queue of folders to process: [folderId, currentRelativePath]
  const folderQueue: Array<{ id: string; name: string; relativePath: string }> = [
    { id: rootFolderId, name: rootFolderName, relativePath: initialRelativePath },
  ];

  while (folderQueue.length > 0) {
    if (shouldCancel && shouldCancel()) {
      break;
    }

    const currentFolder = folderQueue.shift()!;
    if (onProgress) {
      onProgress({
        totalFoldersScanned: totalFolders,
        totalFilesFound: allFiles.length,
        currentFolderScanning: currentFolder.relativePath,
        totalBytesEstimate: totalBytes,
      });
    }

    const items = await listFolderChildren(currentFolder.id, accessToken);

    for (const item of items) {
      if (shouldCancel && shouldCancel()) break;

      // Handle Drive shortcuts if present
      const effectiveMimeType =
        item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetMimeType
          ? item.shortcutDetails.targetMimeType
          : item.mimeType;

      const effectiveId =
        item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails?.targetId
          ? item.shortcutDetails.targetId
          : item.id;

      const isFolder = effectiveMimeType === FOLDER_MIME;
      const cleanName = item.name.replace(/[/\\?%*:|"<>]/g, '_'); // sanitize filename for local file systems
      const itemRelativePath = `${currentFolder.relativePath}/${cleanName}`;

      if (isFolder) {
        totalFolders++;
        folderQueue.push({
          id: effectiveId,
          name: cleanName,
          relativePath: itemRelativePath,
        });
      } else {
        const exportConfig = GOOGLE_APPS_EXPORT_MAP[effectiveMimeType];
        let finalName = cleanName;
        let exportMimeType: string | undefined;
        let exportExtension: string | undefined;

        if (exportConfig) {
          exportMimeType = exportConfig.exportMime;
          exportExtension = exportConfig.ext;
          if (!finalName.toLowerCase().endsWith(exportConfig.ext)) {
            finalName += exportConfig.ext;
          }
        }

        const fileSize = item.size ? parseInt(item.size, 10) : 0;
        totalBytes += fileSize;

        allFiles.push({
          id: effectiveId,
          name: finalName,
          mimeType: effectiveMimeType,
          size: fileSize,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink,
          iconLink: item.iconLink,
          relativePath: `${currentFolder.relativePath}/${finalName}`,
          folderId: currentFolder.id,
          isFolder: false,
          exportMimeType,
          exportExtension,
          selected: true,
          status: 'pending',
          downloadProgress: 0,
        });
      }
    }
  }

  return { files: allFiles, totalFolders, totalBytes };
}

/**
 * Scans multiple links (a mix of folder links and file links) and builds an integrated file queue
 */
export async function scanMultipleDriveLinks(
  rawLinks: string[],
  accessToken: string,
  onProgress?: (progress: FolderScanProgress) => void,
  shouldCancel?: () => boolean
): Promise<{ files: DriveFileItem[]; totalFolders: number; totalBytes: number; errors: Array<{ link: string; error: string }> }> {
  const allFiles: DriveFileItem[] = [];
  const errors: Array<{ link: string; error: string }> = [];
  let totalFolders = 0;
  let totalBytes = 0;

  for (let i = 0; i < rawLinks.length; i++) {
    if (shouldCancel && shouldCancel()) break;

    const rawLink = rawLinks[i];
    const parsed = extractDriveId(rawLink);
    if (!parsed) {
      errors.push({ link: rawLink, error: 'Link ou ID inválido' });
      continue;
    }

    try {
      if (onProgress) {
        onProgress({
          totalFoldersScanned: totalFolders,
          totalFilesFound: allFiles.length,
          currentFolderScanning: `Consultando link ${i + 1} de ${rawLinks.length}...`,
          totalBytesEstimate: totalBytes,
          currentLinkIndex: i + 1,
          totalLinksCount: rawLinks.length,
        });
      }

      const meta = await getFileMetadata(parsed.id, accessToken);

      if (meta.mimeType === FOLDER_MIME) {
        // Scan folder recursively
        const scanRes = await scanDriveFolderRecursive(
          meta.id,
          meta.name,
          accessToken,
          onProgress,
          shouldCancel
        );
        // Tag with source link
        scanRes.files.forEach((f) => {
          f.sourceUrl = rawLink;
        });
        allFiles.push(...scanRes.files);
        totalFolders += scanRes.totalFolders;
        totalBytes += scanRes.totalBytes;
      } else {
        // Single file
        const cleanName = meta.name.replace(/[/\\?%*:|"<>]/g, '_');
        const exportConfig = GOOGLE_APPS_EXPORT_MAP[meta.mimeType];
        let finalName = cleanName;
        let exportMimeType: string | undefined;
        let exportExtension: string | undefined;

        if (exportConfig) {
          exportMimeType = exportConfig.exportMime;
          exportExtension = exportConfig.ext;
          if (!finalName.toLowerCase().endsWith(exportConfig.ext)) {
            finalName += exportConfig.ext;
          }
        }

        const size = meta.size ? parseInt(meta.size, 10) : 0;
        totalBytes += size;

        allFiles.push({
          id: meta.id,
          name: finalName,
          mimeType: meta.mimeType,
          size,
          relativePath: `Arquivos Individuais/${finalName}`,
          isFolder: false,
          exportMimeType,
          exportExtension,
          selected: true,
          sourceUrl: rawLink,
          webViewLink: meta.webViewLink,
          iconLink: meta.iconLink,
          status: 'pending',
          downloadProgress: 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao acessar link';
      errors.push({ link: rawLink, error: msg });
    }
  }

  return { files: allFiles, totalFolders, totalBytes, errors };
}

/**
 * Downloads a single file or exports a Google Doc as a Blob
 */
export async function downloadFileBlob(
  file: DriveFileItem,
  accessToken: string,
  onBytesProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<Blob> {
  let downloadUrl = '';

  if (file.exportMimeType) {
    // Export Google Workspace Doc/Sheet/Slide
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(
      file.exportMimeType
    )}&supportsAllDrives=true`;
  } else {
    // Binary or normal file
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
  }

  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Falha ao baixar "${file.name}" (Status ${response.status}): ${errorText || response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : (file.size || 0);

  if (!response.body || !window.ReadableStream) {
    const blob = await response.blob();
    if (onBytesProgress && total > 0) onBytesProgress(total, total);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (onBytesProgress) {
        onBytesProgress(loaded, total > 0 ? total : loaded);
      }
    }
  }

  return new Blob(chunks as BlobPart[]);
}

/**
 * Quick fetch of user's own root folders or shared drives for direct picking
 */
export async function listUserQuickFolders(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const query = encodeURIComponent(`mimeType = '${FOLDER_MIME}' and trashed = false and 'root' in parents`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=25`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.files || [];
}
