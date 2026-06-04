import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AutoTableOptions = {
  head: string[][];
  body: (string | number)[][];
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
};

/**
 * Generate a styled PDF document with a header and auto-table.
 */
export function generatePDF(options: {
  title: string;
  subtitle?: string;
  table: AutoTableOptions;
  fileName: string;
}): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, 14, 20);

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 28);
  }

  // Table
  autoTable(doc, {
    startY: options.subtitle ? 34 : 28,
    head: options.table.head,
    body: options.table.body,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      ...options.table.styles,
    },
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      ...options.table.headStyles,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 14, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    },
  });

  doc.save(options.fileName);
}
