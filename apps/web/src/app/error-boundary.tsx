import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ocorreu uma falha inesperada na interface.
              </p>
              <Button onClick={() => window.location.reload()}>Recarregar página</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
