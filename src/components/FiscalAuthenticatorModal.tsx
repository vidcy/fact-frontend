import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCw,
  Award,
  Building2,
  Copy,
  Check
} from 'lucide-react';

interface FiscalAuthenticatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | null;
  apiBase: string;
}

export function FiscalAuthenticatorModal({
  isOpen,
  onClose,
  companyId,
  apiBase,
}: FiscalAuthenticatorModalProps) {
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSeal, setCopiedSeal] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      runFiscalAudit();
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const runFiscalAudit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase}/companies/${companyId}/verify-fiscal`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al ejecutar auditoría fiscal');
      }
      const data = await res.json();
      setAuditData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación con el servicio de verificación');
    } finally {
      setLoading(false);
    }
  };

  const copySeal = () => {
    if (!auditData?.selloAutenticidadSunat) return;
    navigator.clipboard.writeText(auditData.selloAutenticidadSunat);
    setCopiedSeal(true);
    setTimeout(() => setCopiedSeal(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden flex flex-col text-slate-800">
        {/* Cabecera del Certificado */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Autenticador Fiscal Pro SUNAT</h3>
              <p className="text-xs text-emerald-100">
                Verificación Criptográfica y Validación Tributaria Oficial en Tiempo Real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido de la Auditoría */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RotateCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold">Ejecutando Validación Módulo 11 y Bóveda Criptográfica...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {auditData && !loading && (
            <>
              {/* Tarjeta de Resumen y Sello */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-base">{auditData.razonSocial}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    RUC: <span className="font-mono font-bold text-slate-900">{auditData.ruc}</span> • Estado: <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">{auditData.estadoContribuyente}</span> • Condición: <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">{auditData.condicionDomicilio}</span>
                  </p>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <div className="text-3xl font-black text-emerald-600 font-mono">
                    {auditData.scoreFiscal}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Conformidad Tributaria
                  </span>
                </div>
              </div>

              {/* Sello Digital de Autenticidad */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Sello Criptográfico de Autenticidad SUNAT
                  </span>
                  <button
                    onClick={copySeal}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {copiedSeal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSeal ? '¡Copiado!' : 'Copiar Sello'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-emerald-700 font-bold break-all select-all">
                  {auditData.selloAutenticidadSunat}
                </div>
                <p className="text-[11px] text-slate-500">
                  Verificado el: {new Date(auditData.verificadoEn).toLocaleString('es-PE')} por {auditData.auditor}
                </p>
              </div>

              {/* Lista Detallada de Verificaciones Pro */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Auditoría de 5 Puntos Clave para Emisión Real
                </h4>

                <div className="space-y-2">
                  {auditData.detalles?.map((det: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        {det.aprobado ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{det.nombre}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{det.descripcion}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          det.aprobado
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {det.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Homologación y Estándares UBL 2.1 SUNAT
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            Cerrar Verificación
          </button>
        </div>
      </div>
    </div>
  );
}

