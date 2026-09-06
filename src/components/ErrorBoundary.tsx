import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  title?: string;
  description?: string;
  onError?: (error: Error, errorInfo: any) => void;
  showHomeButton?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any | null;
  showDetails: boolean;
}

export class ErrorBoundary extends (React.Component as new (props: ErrorBoundaryProps) => any) {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any): void {
    console.error('Clinical ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private toggleDetails = (): void => {
    this.setState((prev: ErrorBoundaryState) => ({ showDetails: !prev.showDetails }));
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(
            this.state.error || new Error('Unknown error'),
            this.resetErrorBoundary
          );
        }
        return this.props.fallback;
      }

      const title = this.props.title || 'Component Recovered Gracefully';
      const description =
        this.props.description ||
        'A clinical component encountered an unexpected issue. The rest of the AI-HealthAssist portal remains functional.';

      return (
        <div
          role="alert"
          className="p-6 my-4 bg-slate-900 text-white rounded-2xl border border-rose-500/50 shadow-xl space-y-4 max-w-2xl mx-auto"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950 border border-rose-800 inline-block">
                Clinical Safety Intercept
              </span>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reload App</span>
            </button>

            {this.props.showHomeButton && (
              <button
                type="button"
                onClick={() => {
                  this.resetErrorBoundary();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span>Return to Top</span>
              </button>
            )}

            <button
              type="button"
              onClick={this.toggleDetails}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 py-1 px-2 rounded cursor-pointer"
            >
              <span>{this.state.showDetails ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
              {this.state.showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {this.state.showDetails && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 space-y-1.5 overflow-x-auto">
              <div className="font-bold text-slate-200">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

