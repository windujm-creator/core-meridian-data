/**
 * ErrorBoundary.tsx — ZERØ MERIDIAN 2026 push111
 * Isolates tile crashes — dashboard never goes fully blank.
 * Class component required by React error boundary spec.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children:    ReactNode;
  fallback?:   ReactNode;
  tileLabel?:  string;
}

interface State {
  hasError: boolean;
  error:    string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  static displayName = 'ErrorBoundary';

  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ZM ErrorBoundary]', this.props.tileLabel ?? 'unknown', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        minHeight:      '120px',
        gap:            '8px',
        background:     'rgba(239,68,68,0.04)',
        border:         '1px solid rgba(239,68,68,0.15)',
        borderRadius:   '12px',
        padding:        '20px',
        willChange:     'transform',
      }}>
        <span style={{ fontSize: '18px' }}>⚠</span>
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '10px',
          color:         'rgba(248,113,113,0.7)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {this.props.tileLabel ?? 'Tile'} unavailable
        </span>
        <span style={{
          fontFamily:  "'JetBrains Mono', monospace",
          fontSize:    '10px',
          color:       'rgba(100,100,120,1)',
          textAlign:   'center',
          maxWidth:    '240px',
        }}>
          {this.state.error ?? 'An error occurred'}
        </span>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            marginTop:    '8px',
            fontFamily:   "'JetBrains Mono', monospace",
            fontSize:     '9px',
            letterSpacing:'0.1em',
            padding:      '4px 12px',
            borderRadius: '4px',
            background:   'rgba(248,113,113,0.1)',
            border:       '1px solid rgba(248,113,113,0.2)',
            color:        'rgba(248,113,113,0.8)',
            cursor:       'pointer',
          }}
        >
          RETRY
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
