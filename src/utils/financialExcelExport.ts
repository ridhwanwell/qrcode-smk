import XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { FinancialTransaction } from '../types';

// Thick solid black border definition to separate every cell clearly from one another
const thickCellBorder = {
  top: { style: 'medium', color: { rgb: '000000' } },
  bottom: { style: 'medium', color: { rgb: '000000' } },
  left: { style: 'medium', color: { rgb: '000000' } },
  right: { style: 'medium', color: { rgb: '000000' } },
};

const headerStyle = {
  font: { bold: true, name: 'Calibri', sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1C658C' } }, // Premium Dark Blue
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thickCellBorder,
};

const auditHeaderStyle = {
  font: { bold: true, name: 'Calibri', sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '5B21B6' } }, // Header Purple for Audit
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thickCellBorder,
};

const dataStyleCenter = {
  font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thickCellBorder,
};

const dataStyleLeft = {
  font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: thickCellBorder,
};

const dataStyleRight = {
  font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: thickCellBorder,
};

/**
 * Apply thick borders and styling to all cells in a worksheet
 */
function styleWorksheet(ws: any, isAudit: boolean = false) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Ensure gridlines are enabled
  ws['!views'] = [{ showGridLines: true }];

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const isHeader = R === 0;

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }

      const cell = ws[cellRef];

      if (isHeader) {
        cell.s = isAudit ? auditHeaderStyle : headerStyle;
      } else {
        if (typeof cell.v === 'number') {
          cell.s = dataStyleRight;
        } else if (C === 0 || C === 1 || C === 2 || C === 7 || C === 8) {
          cell.s = dataStyleCenter;
        } else {
          cell.s = dataStyleLeft;
        }
      }
    }
  }
}

/**
 * Export full financial transactions to Excel (.xlsx) with thick borders separating table cells
 */
export function exportFinancialSpreadsheet(transactions: FinancialTransaction[], filename: string = 'Laporan_Keuangan_PT_SMK.xlsx') {
  const data = transactions.map((t, index) => {
    const isIncome = (t.type || '').toLowerCase().includes('pemasukan') || (t.type || '').toLowerCase().includes('uang masuk') || t.type === 'Pemasukan';
    return {
      'No': index + 1,
      'ID Transaksi': t.id,
      'Tanggal': t.date,
      'Tipe Transaksi': isIncome ? 'Uang Masuk (Pemasukan)' : 'Uang Keluar (Pengeluaran)',
      'Kategori': t.category,
      'Keterangan': t.description || '-',
      'PIC': t.pic || t.recordedBy || '-',
      'Metode Pembayaran': t.paymentMethod || 'Transfer',
      'Nominal (Rp)': t.amount,
      'Status Audit': t.auditStatus || 'Belum Diaudit',
      'Catatan Audit': t.auditNotes || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // ID
    { wch: 14 }, // Tanggal
    { wch: 26 }, // Tipe
    { wch: 32 }, // Kategori
    { wch: 40 }, // Keterangan
    { wch: 22 }, // PIC
    { wch: 18 }, // Metode
    { wch: 18 }, // Nominal
    { wch: 20 }, // Status Audit
    { wch: 45 }  // Catatan Audit
  ];

  styleWorksheet(worksheet, false);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catatan Transaksi');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}

/**
 * Export specific Audit Report to Excel (.xlsx) with thick borders separating table cells
 */
export function exportAuditReportSpreadsheet(transactions: FinancialTransaction[], filename: string = 'Report_Audit_Keuangan_PT_SMK.xlsx') {
  const data = transactions.map((t, index) => {
    const isIncome = (t.type || '').toLowerCase().includes('pemasukan') || (t.type || '').toLowerCase().includes('uang masuk') || t.type === 'Pemasukan';
    return {
      'No': index + 1,
      'Tanggal': t.date,
      'Kategori': t.category,
      'Keterangan': t.description || '-',
      'PIC': t.pic || t.recordedBy || '-',
      'Transfer / Cash': t.paymentMethod || 'Transfer',
      'Nominal (Rp)': t.amount,
      'Uang Masuk / Uang Keluar': isIncome ? 'Uang Masuk' : 'Uang Keluar',
      'Status Audit': t.auditStatus || 'Belum Diaudit',
      'Catatan Audit': t.auditNotes || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 30 }, // Kategori
    { wch: 40 }, // Keterangan
    { wch: 22 }, // PIC
    { wch: 18 }, // Transfer / Cash
    { wch: 18 }, // Nominal
    { wch: 22 }, // Uang Masuk / Uang Keluar
    { wch: 22 }, // Status Audit
    { wch: 45 }  // Catatan Audit
  ];

  styleWorksheet(worksheet, true);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Audit Keuangan');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}
