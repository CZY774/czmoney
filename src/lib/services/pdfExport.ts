import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFExportOptions {
  transactions: Array<{
    date: string;
    category: string;
    type: "income" | "expense";
    amount: number;
    description?: string;
  }>;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
  };
  period: string;
  chartElement?: HTMLElement;
  currency?: string;
}

export async function generatePDF(options: PDFExportOptions): Promise<void> {
  const {
    transactions,
    summary,
    period,
    chartElement,
    currency = "IDR",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("CZmoneY", margin, yPosition);

  doc.setFontSize(16);
  doc.text("Financial Report", pageWidth - margin, yPosition, {
    align: "right",
  });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Period: ${period}`, margin, yPosition);

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Generated: ${today}`, pageWidth - margin, yPosition, {
    align: "right",
  });

  yPosition += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Summary Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("SUMMARY", margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const summaryData = [
    ["Total Income:", formatCurrency(summary.totalIncome)],
    ["Total Expense:", formatCurrency(summary.totalExpense)],
    ["Net Savings:", formatCurrency(summary.netSavings)],
    ["Savings Rate:", `${summary.savingsRate.toFixed(1)}%`],
  ];

  summaryData.forEach(([label, value]) => {
    doc.text(label, margin + 5, yPosition);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + 60, yPosition);
    doc.setFont("helvetica", "normal");
    yPosition += 6;
  });

  yPosition += 5;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Chart Image
  if (chartElement) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CATEGORY BREAKDOWN", margin, yPosition);
    yPosition += 7;

    try {
      const chartImage = await getChartImage(chartElement);

      if (chartImage) {
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = 80;

        doc.addImage(chartImage, "PNG", margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }
    } catch (error) {
      console.error("Failed to add chart to PDF:", error);
      yPosition += 5;
    }
  }

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = margin;
  }

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Transaction Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TRANSACTION DETAILS", margin, yPosition);
  yPosition += 7;

  const tableData = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    }),
    t.category,
    t.type === "income" ? "Income" : "Expense",
    formatCurrency(t.amount),
    t.description || "-",
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["Date", "Category", "Type", "Amount", "Description"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [31, 142, 241],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === "body") {
        if (transactions[data.row.index].type === "expense") {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [34, 197, 94];
        }
      }
    },
  });

  // Footer
  const pageCount = (doc as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }

  // Save PDF
  const filename = `CZmoneY_Report_${period.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

async function getChartImage(
  chartElement: HTMLElement,
): Promise<string | null> {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(chartElement, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Chart image conversion failed:", error);
    return null;
  }
}
