export type Role='CIUDADANO'|'AGENTE'|'ADMIN';
export interface User { id:string; nombres:string; apellidos:string; email:string; role:Role; status:string; emailVerifiedAt:string|null; }
export type ReportStatus='PENDIENTE'|'VALIDADO'|'RECHAZADO'|'RETIRADO';
export interface IncidentType { id:string; codigo:string; nombre:string; descripcion:string; colorMarcador:string; icono:string; activo:boolean; }
export interface ReportItem { id:string; titulo:string; descripcion:string; estado:ReportStatus; prioridadReportada:string; ubicacionReferencia?:string; distrito:string; fechaHoraIncidente:string; createdAt:string; revisadoAt?:string; tipoCodigo:string; tipoNombre:string; colorMarcador:string; latitud:number; longitud:number; origen:string; esDatoDemostrativo:boolean; visiblePublicamente?:boolean; ciudadanoNombre?:string; ciudadanoEmail?:string; evidencias?:EvidenceItem[]; validacion?:{decision:string;observaciones?:string;createdAt:string}|null; }
export interface EvidenceItem { id:string; mimeType:string; originalName?:string; visiblePublicamente?:boolean; }
export interface Announcement { id:string; titulo:string; contenido:string; nivel:'INFORMATIVO'|'PREVENTIVO'|'URGENTE'; zonaReferencia?:string; estado?:string; publishedAt?:string; expiresAt?:string; createdAt?:string; esDatoDemostrativo?:boolean; }
export interface ApiResponse<T> { ok:boolean; data:T; message?:string; meta?:Record<string,unknown>; pagination?:{page:number;limit:number;total:number}; }
