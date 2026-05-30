import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import api from '../services/api';

export function EvidenceImage({ id, alt, className = '' }: { id: string; alt: string; className?: string }) {
  const [source, setSource] = useState<string>('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let objectUrl = '';
    api.get(`/reportes/evidencias/${id}/acceso`, { responseType: 'blob' })
      .then((response) => {
        if (!mounted) return;
        objectUrl = URL.createObjectURL(response.data);
        setSource(objectUrl);
      })
      .catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  if (failed) return <div className={`grid place-items-center rounded-xl bg-slate-100 text-slate-500 ${className}`}><ImageOff size={22}/><span className="text-xs">No disponible</span></div>;
  if (!source) return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} aria-label="Cargando evidencia"/>;
  return <img className={className} src={source} alt={alt}/>;
}
