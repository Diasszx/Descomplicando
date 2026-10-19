import { useHealth } from '../hooks/use-health';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export function HealthStatusCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md shadow-md" data-testid="health-loading">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/5 shadow-md" data-testid="health-error">
        <CardHeader>
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle className="text-lg">Falha de Conexão com API</CardTitle>
          </div>
          <CardDescription>
            {error?.message || 'Não foi possível se comunicar com o backend.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full max-w-md shadow-md" data-testid="health-empty">
        <CardHeader>
          <CardTitle>Estado Indefinido</CardTitle>
          <CardDescription>Nenhum dado retornado pela API.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-md border-emerald-500/20" data-testid="health-success">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Saúde do Sistema</span>
          </CardTitle>
          <Badge variant="success" className="uppercase">
            {data.status}
          </Badge>
        </div>
        <CardDescription>Verificação ponta a ponta dos serviços integrados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Serviço:</span>
          <span className="font-medium">{data.service}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Versão:</span>
          <span className="font-mono">{data.version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Último ping:</span>
          <span className="font-mono text-xs">{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
