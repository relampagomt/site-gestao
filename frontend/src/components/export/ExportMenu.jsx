import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson,
  Loader2
} from 'lucide-react';
import { exportToCSV } from './exporters/csv';
import { exportToJSON } from './exporters/json';
import { exportToPDF } from './exporters/pdf';
import PdfPreviewDialog from './PdfPreviewDialog';

const ExportMenu = ({ 
  data, 
  columns, 
  filename, 
  fileBaseName,
  pdfOptions = {} 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Use fileBaseName if provided, otherwise fallback to filename
  const baseFileName = fileBaseName || filename || 'export';

  const handleCSVExport = () => {
    exportToCSV(data, columns, baseFileName);
    setIsOpen(false);
  };

  const handleJSONExport = () => {
    exportToJSON(data, baseFileName);
    setIsOpen(false);
  };

  const handleExcelExport = () => {
    // Excel export is essentially CSV with .xlsx extension for compatibility
    exportToCSV(data, columns, baseFileName);
    setIsOpen(false);
  };

  const handlePDFExport = async () => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      const result = await exportToPDF(data, columns, baseFileName, pdfOptions);
      if (result) {
        setPdfPreview(result);
        setShowPdfPreview(true);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // You might want to show a toast notification here
    } finally {
      setIsGeneratingPDF(false);
      setIsOpen(false);
    }
  };

  const handlePdfPreviewClose = () => {
    setShowPdfPreview(false);
    if (pdfPreview?.blobUrl) {
      URL.revokeObjectURL(pdfPreview.blobUrl);
    }
    setPdfPreview(null);
  };

  const isDisabled = !data || data.length === 0;

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={isDisabled}
          >
            <Download className="size-4" />
            Exportar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="end">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleCSVExport}
              disabled={isDisabled}
            >
              <FileSpreadsheet className="size-4" />
              CSV
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleJSONExport}
              disabled={isDisabled}
            >
              <FileJson className="size-4" />
              JSON
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleExcelExport}
              disabled={isDisabled}
            >
              <FileSpreadsheet className="size-4" />
              Excel (CSV)
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handlePDFExport}
              disabled={isDisabled || isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              PDF (prévia)
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <PdfPreviewDialog
        open={showPdfPreview}
        onOpenChange={handlePdfPreviewClose}
        blobUrl={pdfPreview?.blobUrl}
        filename={pdfPreview?.filename}
      />
    </>
  );
};

export default ExportMenu;

