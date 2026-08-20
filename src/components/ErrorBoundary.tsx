import React from 'react';

export class ErrorBoundary extends React.Component<React.PropsWithChildren, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('CalcZZZ UI error', error, info); }
  render() {
    if (this.state.error) return <div className="fatal"><h2>Algo deu errado</h2><p>{this.state.error.message}</p><button onClick={() => location.reload()}>Recarregar</button></div>;
    return this.props.children;
  }
}
