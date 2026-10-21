'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ImportModal({
  open,
  onOpenChange,
  entity,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: 'products' | 'customers';
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity', entity);

    try {
      const res = await fetch('/api/imports', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Erro no upload');

      toast.success('Importação iniciada em background!');
      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar {entity === 'products' ? 'Produtos' : 'Clientes'}</DialogTitle>
          <DialogDescription>
            Envie um arquivo .csv.{' '}
            {entity === 'products' ? 'Colunas: name, sku, price' : 'Colunas: name, email, document'}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={inputRef}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <>
              <FileType className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Clique para selecionar um CSV</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Enviando…' : 'Iniciar Importação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
