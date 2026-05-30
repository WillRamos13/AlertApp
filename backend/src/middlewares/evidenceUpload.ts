import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../shared/errors/ApiError';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_EVIDENCE_SIZE_MB * 1024 * 1024, files: env.MAX_EVIDENCES_PER_REPORT },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(422, 'Solo se aceptan imágenes JPG, PNG o WebP.', 'INVALID_EVIDENCE_TYPE'));
      return;
    }
    callback(null, true);
  }
});
