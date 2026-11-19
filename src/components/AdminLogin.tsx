import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  RotateCw,
  AlertCircle,
  Receipt,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (user: any, token: string) => void;
  apiBase: string;
}

/**
 * ============================================================================
 * CCOFACT PRO - PANTALLA DE ACCESO ADMINISTRADOR MAESTRO (TEMA CLARO PRO)
 * ============================================================================
 * Control de acceso exclusivo para la administración central de empresas
 * emisoras, bóveda de certificados, correlativos y colas de contingencia SUNAT.
 */
export function AdminLogin({ onLoginSuccess, apiBase }: AdminLoginProps) {
  // Estado de credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manejo del inicio de sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales de Administrador incorrectas');
      }

      // Guardar token y datos en localStorage
      localStorage.setItem('ccofact_admin_token', data.token);
      localStorage.setItem('ccofact_admin_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex items-center justify-center p-4">
      {/* Tarjeta Central de Inicio de Sesión */}
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">
        {/* Cabecera con Degradado Corporativo */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white text-center relative overflow-hidden">
          {/* Elemento visual decorativo */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

          <div className="inline-flex p-3 bg-white/15 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">CCOFACT PRO</h1>
          <p className="text-xs text-indigo-100 font-medium mt-1">
            Plataforma Soberana de Facturación Electrónica SUNAT UBL 2.1
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-[11px] font-bold mt-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Acceso Seguro al Sistema
          </div>
        </div>

        {/* Formulario */}
        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Campo: Correo / Usuario */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-semibold">Correo Electrónico o Usuario</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-semibold">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Acceso */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer text-sm mt-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Garantías de Seguridad */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium">Conexión cifrada y acceso seguro al sistema</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/80 px-8 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Corporación Ccoplex S.A.C. • Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}

