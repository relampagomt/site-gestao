/**
 * PDF Exporter using jsPDF and jspdf-autotable
 */

export const exportToPDF = async (data, columns, filename, options = {}) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return null;
  }

  try {
    // Dynamic imports to reduce bundle size
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const {
      title = 'Relatório',
      orientation = 'p', // 'p' for portrait, 'l' for landscape
      columnStyles = {},
      filtersSummary = '',
      pageNumbers = true,
      footer = ''
    } = options;

    // Create PDF document
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    // Set font
    doc.setFont('helvetica');

    let yPosition = 20;

    // Add title
    if (title) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPosition);
      yPosition += 10;
    }

    // Add filters summary
    if (filtersSummary) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(filtersSummary, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 4 + 5;
    }

    // Add generation date
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPosition);
    yPosition += 10;

    // Prepare table data
    const tableData = data.map(item => {
      if (columns && columns.length > 0) {
        return columns.map(col => {
          const value = item[col.key];
          if (value === null || value === undefined) return '';
          return String(value);
        });
      } else {
        // Fallback: use object values if no columns provided
        return Object.values(item).map(value => {
          if (value === null || value === undefined) return '';
          return String(value);
        });
      }
    });

    // Prepare headers
    const tableHeaders = columns && columns.length > 0 
      ? columns.map(col => col.header)
      : Object.keys(data[0] || {});

    // Add table
    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: columnStyles,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      didDrawPage: (data) => {
        // Add page numbers
        if (pageNumbers) {
          const pageCount = doc.internal.getNumberOfPages();
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            data.settings.margin.left,
            pageHeight - 10
          );
        }

        // Add footer
        if (footer) {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text(footer, 20, pageHeight - 5);
        }
      }
    });

    // Generate blob and blob URL
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      blob,
      blobUrl,
      filename: `${filename}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

