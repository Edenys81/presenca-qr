// Storage helpers with local fallback for development
// Uses Manus Forge when credentials available, otherwise uses local filesystem

import { ENV } from '../core/env.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

type StorageConfig = { baseUrl: string; apiKey: string } | null;

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    console.log('[STORAGE] Forge credentials missing, using local storage');
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// Local storage functions
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('[STORAGE] Erro ao criar diretório:', error);
  }
}

async function saveLocal(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<string> {
  await ensureStorageDir();
  
  const key = normalizeKey(relKey);
  const filePath = path.join(STORAGE_DIR, key);
  
  // Criar diretórios necessários
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // Salvar arquivo
  if (typeof data === 'string') {
    await fs.writeFile(filePath, data);
  } else {
    await fs.writeFile(filePath, Buffer.from(data));
  }
  
  // Retornar URL local (relativa)
  const url = `/storage/${key}`;
  console.log('[STORAGE] Arquivo salvo localmente:', url);
  return url;
}

async function getLocal(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/storage/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  
  if (config) {
    // Usar Forge (S3 remoto)
    try {
      const uploadUrl = buildUploadUrl(config.baseUrl, key);
      const fileName = key.split("/").pop() ?? key;
      const formData = toFormData(data, contentType, fileName);
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: buildAuthHeaders(config.apiKey),
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(
          `Storage upload failed (${response.status} ${response.statusText}): ${message}`
        );
      }
      
      const url = (await response.json()).url;
      return { key, url };
    } catch (error) {
      console.warn('[STORAGE] Forge upload falhou, usando local:', error);
      const url = await saveLocal(relKey, data);
      return { key, url };
    }
  } else {
    // Usar storage local
    const url = await saveLocal(relKey, data);
    return { key, url };
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  
  if (config) {
    // Usar Forge (S3 remoto)
    try {
      const url = await buildDownloadUrl(config.baseUrl, key, config.apiKey);
      return { key, url };
    } catch (error) {
      console.warn('[STORAGE] Forge download falhou, usando local:', error);
      const url = await getLocal(relKey);
      return { key, url };
    }
  } else {
    // Usar storage local
    const url = await getLocal(relKey);
    return { key, url };
  }
}

