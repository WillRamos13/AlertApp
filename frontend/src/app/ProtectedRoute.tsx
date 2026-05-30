import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { Role } from '../types';
export function ProtectedRoute({roles}:{roles:Role[]}){ const {user,loading}=useAuth(); if(loading)return <div className="page-loader">Cargando sesión...</div>; if(!user)return <Navigate to="/login" replace />; if(!roles.includes(user.role))return <Navigate to={user.role==='ADMIN'?'/admin':user.role==='AGENTE'?'/agente':'/ciudadano'} replace />; return <Outlet/>; }
