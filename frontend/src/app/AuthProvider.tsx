import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api, { apiMessage, ensureCsrf } from '../services/api';
import type { User } from '../types';
interface AuthContextValue { user:User|null; loading:boolean; login:(email:string,password:string)=>Promise<User>; logout:()=>Promise<void>; refreshUser:()=>Promise<void>; error:string|null; }
const AuthContext=createContext<AuthContextValue|null>(null);
export function AuthProvider({children}:{children:ReactNode}){ const [user,setUser]=useState<User|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const refreshUser=async()=>{ try{ const {data}=await api.get('/auth/me'); setUser(data.data.user); setError(null); }catch{ setUser(null); } finally{setLoading(false);} };
 useEffect(()=>{ void ensureCsrf().finally(()=>void refreshUser()); },[]);
 const login=async(email:string,password:string)=>{ try{ const {data}=await api.post('/auth/login',{email,password}); setUser(data.data.user); setError(null); return data.data.user as User; }catch(err){ const msg=apiMessage(err); setError(msg); throw new Error(msg); }};
 const logout=async()=>{ await api.post('/auth/logout'); setUser(null); };
 const value=useMemo(()=>({user,loading,login,logout,refreshUser,error}),[user,loading,error]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; }
export function useAuth(){ const ctx=useContext(AuthContext); if(!ctx)throw new Error('AuthProvider requerido'); return ctx; }
