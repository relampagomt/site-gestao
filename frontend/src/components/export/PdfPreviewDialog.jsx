import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';

const PdfPreviewDialog = ({ 
  open, 
  onOpenChange, 
  blobUrl, 
  filename = 'document.pdf' 
}) => {
  // Clean up blob URL when dialog closes
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleDownload = () => {
    if (!blobUrl) return;
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!blobUrl) return;
    
    // Open in new window and trigger print
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pré-visualização do PDF
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="ml-auto"
            >
              <X className="size-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border rounded-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando pré-visualização...
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="gap-2"
          >
            <X className="size-4" />
            Fechar
          </Button>
          
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!blobUrl}
            className="gap-2"
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
          
          <Button
            onClick={handleDownload}
            disabled={!blobUrl}
            className="gap-2"
          >
            <Download className="size-4" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfPreviewDialog;

