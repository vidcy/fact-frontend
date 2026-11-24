import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CCOFACT PRO - Excepción capturada en ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('ccofact_admin_token');
      localStorage.removeItem('ccofact_admin_user');
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-3xl font-black">
              ⚠️
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">CCOFACT PRO - Recuperación Activa</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Se detectó una excepción en tiempo de ejecución. El sistema de protección evitó el bloqueo de la sesión y previno la pantalla en blanco.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-2xl text-left font-mono text-xs text-rose-400 overflow-x-auto border border-rose-950/60 max-h-48">
                <p className="font-bold text-rose-300 mb-1">Detalle del error:</p>
                <code>{this.state.error.toString()}</code>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                🔄 Recargar CCOFACT PRO
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                🧹 Limpiar Sesión y Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
