// frontend/src/components/ImportButton.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportButton = ({ onImport, buttonText = 'Importar Dados', dialogTitle = 'Importar Dados', dialogDescription = 'Faça o upload de um arquivo Excel (.xlsx) ou CSV para importar os dados.' }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Por favor, selecione um arquivo para importar.');
      return;
    }

    setLoading(true);
    setError('');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        onImport(jsonData);
        setOpen(false);
        setFile(null);
      } catch (err) {
        console.error('Erro ao processar o arquivo:', err);
        setError('Erro ao processar o arquivo. Certifique-se de que é um arquivo Excel ou CSV válido.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = (err) => {
      console.error('Erro ao ler o arquivo:', err);
      setError('Erro ao ler o arquivo.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="size-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              Arquivo
            </Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx, .xls, .csv"
              className="col-span-3"
              onChange={handleFileChange}
            />
          </div>
          {error && <p className="text-red-500 text-sm col-span-4 text-center">{error}</p>}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={loading || !file}>
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportButton;

