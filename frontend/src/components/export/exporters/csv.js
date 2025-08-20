/**
 * CSV Exporter with UTF-8 BOM support
 */

export const exportToCSV = (data, columns, filename) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create CSV header
  const headers = columns.map(col => col.header).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Handle null/undefined values
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Add UTF-8 BOM for proper encoding
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
};

