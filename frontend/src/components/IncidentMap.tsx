import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({iconRetinaUrl:markerIcon2x,iconUrl:markerIcon,shadowUrl:markerShadow});
import type { ReportItem } from '../types';
import { StatusBadge } from './ui';
const ICA:[number,number]=[-14.0678,-75.7286];
function color(status:string,color:string){return status==='PENDIENTE'?'#f59e0b':status==='VALIDADO'?'#16a34a':color;}
export function IncidentMap({reports,onSelect,className=''}:{reports:ReportItem[];onSelect?:(report:ReportItem)=>void;className?:string}){return <MapContainer center={ICA} zoom={14} className={className} scrollWheelZoom><TileLayer attribution={import.meta.env.VITE_MAP_ATTRIBUTION ?? '&copy; OpenStreetMap contributors'} url={import.meta.env.VITE_MAP_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}/>{reports.map(report=><CircleMarker key={report.id} center={[report.latitud,report.longitud]} radius={10} pathOptions={{color:color(report.estado,report.colorMarcador),fillColor:color(report.estado,report.colorMarcador),fillOpacity:.75,weight:2}} eventHandlers={{click:()=>onSelect?.(report)}}><Popup><div className="space-y-2"><strong>{report.tipoNombre}</strong><StatusBadge status={report.estado}/><p>{report.titulo}</p><span className="text-xs">{report.ubicacionReferencia || report.distrito}</span></div></Popup></CircleMarker>)}</MapContainer>}
function PickerMarker({value,onChange}:{value:[number,number];onChange:(v:[number,number])=>void}){ useMapEvents({click(event){onChange([event.latlng.lat,event.latlng.lng]);}}); return <Marker position={value} draggable eventHandlers={{dragend(event){const p=(event.target as L.Marker).getLatLng();onChange([p.lat,p.lng]);}}}/>; }
export function LocationPicker({value,onChange}:{value:[number,number];onChange:(v:[number,number])=>void}){return <div className="location-picker"><MapContainer center={value} zoom={15} scrollWheelZoom><TileLayer attribution={import.meta.env.VITE_MAP_ATTRIBUTION ?? '&copy; OpenStreetMap contributors'} url={import.meta.env.VITE_MAP_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}/><PickerMarker value={value} onChange={onChange}/></MapContainer><p className="mt-2 text-xs text-slate-500">Selecciona el punto exacto del incidente. Se mostrará públicamente según la configuración aprobada.</p></div>}
