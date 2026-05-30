import { describe, expect, it } from 'vitest';
import { assertEvidenceContent } from '../src/modules/evidencias/evidence.service';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
function file(buffer: Buffer, mimetype: string) {
  return { buffer, mimetype, originalname: 'foto.png', size: buffer.length } as Express.Multer.File;
}
describe('Seguridad de evidencias', () => {
  it('acepta una imagen PNG con firma real', () => {
    expect(() => assertEvidenceContent(file(png, 'image/png'))).not.toThrow();
  });
  it('rechaza contenido renombrado como imagen PNG', () => {
    expect(() => assertEvidenceContent(file(Buffer.from('texto que no es una imagen'), 'image/png'))).toThrowError(/contenido del archivo/i);
  });
});
