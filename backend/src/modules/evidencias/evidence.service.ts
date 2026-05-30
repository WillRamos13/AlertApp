import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Express } from 'express';
import { cloudinary } from '../../config/cloudinary';
import { env } from '../../config/env';
import { ApiError } from '../../shared/errors/ApiError';

export interface StoredEvidence {
  proveedor: 'LOCAL' | 'CLOUDINARY';
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageReference: string;
}

const permittedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extensionForMime(mime: string): string {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' } as Record<string, string>)[mime] ?? '';
}

function hasPngSignature(buffer: Buffer): boolean {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}
function hasJpegSignature(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}
function hasWebpSignature(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

export function assertEvidenceContent(file: Express.Multer.File): void {
  if (!permittedMimeTypes.has(file.mimetype)) {
    throw new ApiError(422, 'Solo se aceptan imágenes JPG, PNG o WebP.', 'INVALID_EVIDENCE_TYPE');
  }
  const validByMime: Record<string, (buffer: Buffer) => boolean> = {
    'image/jpeg': hasJpegSignature,
    'image/png': hasPngSignature,
    'image/webp': hasWebpSignature
  };
  if (!validByMime[file.mimetype]?.(file.buffer)) {
    throw new ApiError(422, 'El contenido del archivo no corresponde a una imagen válida del formato indicado.', 'INVALID_EVIDENCE_CONTENT');
  }
}

function secureOriginalName(filename: string): string {
  const safeBase = path.basename(filename).replace(/[^\p{L}\p{N}._ -]/gu, '_').trim();
  return (safeBase || 'evidencia').slice(0, 255);
}

export async function storeEvidence(file: Express.Multer.File, reportId: string): Promise<StoredEvidence> {
  assertEvidenceContent(file);
  const safeId = `${reportId}/${randomUUID()}`;
  const originalName = secureOriginalName(file.originalname);
  if (env.EVIDENCE_STORAGE_PROVIDER === 'local') {
    const relative = path.join(env.LOCAL_UPLOAD_DIR, `${randomUUID()}${extensionForMime(file.mimetype)}`);
    const absolute = path.resolve(process.cwd(), relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.buffer);
    return { proveedor: 'LOCAL', publicId: safeId, originalName, mimeType: file.mimetype, sizeBytes: file.size, storageReference: absolute };
  }
  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({ folder: 'alertapp/evidencias', public_id: safeId, resource_type: 'image', type: 'authenticated', overwrite: false }, (error, response) => {
      if (error || !response) reject(error ?? new Error('No se recibió respuesta de Cloudinary.'));
      else resolve({ public_id: response.public_id });
    });
    upload.end(file.buffer);
  });
  return { proveedor: 'CLOUDINARY', publicId: result.public_id, originalName, mimeType: file.mimetype, sizeBytes: file.size, storageReference: result.public_id };
}

export async function removeStoredEvidence(stored: StoredEvidence): Promise<void> {
  if (stored.proveedor === 'LOCAL') {
    await unlink(stored.storageReference).catch(() => undefined);
    return;
  }
  await cloudinary.uploader.destroy(stored.publicId, { resource_type: 'image', type: 'authenticated', invalidate: true }).catch(() => undefined);
}

export function signedEvidenceUrl(publicId: string): string {
  return cloudinary.url(publicId, { type: 'authenticated', sign_url: true, secure: true, resource_type: 'image', expires_at: Math.floor(Date.now() / 1000) + 5 * 60 });
}
