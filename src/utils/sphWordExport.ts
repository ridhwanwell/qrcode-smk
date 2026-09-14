import { SphQuotation } from '../types';
import { exportHtmlToWord, getWordKopSuratHtml, getWordFooterHtml } from './wordExport';
import { formatNumber } from './sphHelpers';
import { formatIndonesianDate } from './helpers';

export function exportSphToWord(
  sph: SphQuotation, 
  mode: 'ALL' | '1' | '2' = 'ALL',
  customLetterheadSrc?: string | null
) {
  const kopHtml = getWordKopSuratHtml('Laboratorium Kalibrasi', customLetterheadSrc);
  const footerHtml = getWordFooterHtml();
  const dateStr = formatIndonesianDate(sph.date);
  const totalUnits = sph.items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const signatoryName = sph.directorName || 'Ahmad Fajar Ariyanto';
  const signatoryTitle = sph.directorTitle || 'Direktur';

  // Split items across pages (30 items per page for standard A4)
  const itemsPerPage = 30;
  const itemChunks: typeof sph.items[] = [];
  for (let i = 0; i < sph.items.length; i += itemsPerPage) {
    itemChunks.push(sph.items.slice(i, i + itemsPerPage));
  }
  if (itemChunks.length === 0) itemChunks.push([]);

  const lampiranCount = `${itemChunks.length} Lembar`;

  // Page 1: Surat Pengantar Resmi SPH
  const page1Html = `
    ${kopHtml}
    
    <table class="no-border" style="width: 100%; margin-top: 6px; font-size: 9.5pt;">
      <tr>
        <td style="width: 75px; font-weight: bold;">Nomor</td>
        <td style="width: 10px;">:</td>
        <td style="font-weight: bold;">${sph.sphNumber}</td>
        <td style="text-align: right;">${sph.city || 'Surakarta'}, ${dateStr}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Perihal</td>
        <td>:</td>
        <td style="font-weight: bold;">${sph.subject || 'Surat Penawaran Harga Kalibrasi'}</td>
        <td></td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Lampiran</td>
        <td>:</td>
        <td>${sph.attachmentPages || lampiranCount}</td>
        <td></td>
      </tr>
    </table>

    <div style="margin-top: 14px; font-size: 9.5pt; line-height: 1.35;">
      <div>Kepada Yth:</div>
      <div style="font-weight: bold;">${sph.recipientRole || 'Direktur'}</div>
      <div style="font-weight: bold;">${sph.hospitalName}</div>
      <div style="color: #334155;">${sph.hospitalAddress || 'Di Tempat'}</div>
    </div>

    <div style="margin-top: 12px; font-size: 9pt; line-height: 1.4; text-align: justify;">
      <p style="margin: 0 0 6px 0;"><b>Dengan Hormat,</b></p>
      <p style="margin: 0 0 6px 0;">
        Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, <b>PT. Sarana Multi Kalibrasi</b> telah memiliki izin dari Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:
      </p>

      <ol style="margin: 0; padding-left: 20px; font-size: 8.8pt;">
        <li style="margin-bottom: 3px;">${sph.isPpnIncluded ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.'}</li>
        <li style="margin-bottom: 3px;">Harga sudah termasuk biaya transportasi dan akomodasi.</li>
        <li style="margin-bottom: 3px;">Harga tidak termasuk service dan maintenance.</li>
        <li style="margin-bottom: 3px;">Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.</li>
        <li style="margin-bottom: 3px;">Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.</li>
        <li style="margin-bottom: 3px;">Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.</li>
        <li style="margin-bottom: 3px;">Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.</li>
        <li style="margin-bottom: 3px;">Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.</li>
        <li style="margin-bottom: 3px;">
          Pembayaran : ${sph.bankName || 'Bank Mandiri Cab. Surakarta'}<br/><br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>No. Rek : ${sph.bankAccountNumber || '138-00-2610846-9'} (${sph.bankAccountName || 'SARANA MULTI KALIBRASI PT'})</b>
        </li>
      </ol>

      <p style="margin: 14px 0 14px 0;">
        Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.
      </p>
      <p style="margin: 0 0 14px 0;">
        Untuk informasi lebih lanjut dapat menghubungi marketing kami di : <b>${sph.marketingStaffPhone || '0821-3670-7421'} (${sph.marketingStaffName || 'Sulis'})</b>. Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.
      </p>
    </div>

    <table class="no-border" style="width: 100%; margin-top: 24px; font-size: 10pt;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <div style="font-weight: bold;">PT. SARANA MULTI KALIBRASI</div>
          <div style="height: 110px;"></div>
          <div style="font-weight: bold; text-decoration: underline;">${signatoryName}</div>
          <div style="font-size: 9pt; color: #334155;">${signatoryTitle}</div>
        </td>
        <td style="width: 50%; vertical-align: top;">
          <div style="font-weight: bold;">Disetujui oleh Pelanggan,</div>
          <div style="height: 110px;"></div>
          <div style="font-weight: bold;">( ………………………………… )</div>
        </td>
      </tr>
    </table>

    ${footerHtml}
  `;

  // Page 2+: Lampiran Tabel
  const tablePagesHtml = itemChunks.map((chunk, chunkIdx) => {
    const isLastChunk = chunkIdx === itemChunks.length - 1;

    const rowsHtml = chunk.map((item, idx) => {
      const globalIdx = (chunkIdx * itemsPerPage) + idx + 1;
      return `
        <tr>
          <td style="text-align: center; width: 32px; font-size: 8.5pt;">${globalIdx}</td>
          <td style="font-size: 8.5pt;">
            <div style="font-weight: bold;">${item.description}</div>
            ${item.notes ? `<div style="font-size: 7.5pt; color: #64748b; font-style: italic;">${item.notes}</div>` : ''}
          </td>
          <td style="text-align: center; width: 40px; font-size: 8.5pt;">${item.quantity}</td>
          <td style="text-align: center; width: 50px; font-size: 8.5pt;">${item.unit || 'Unit'}</td>
          <td style="width: 110px; font-size: 8.5pt;">
            <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
              <tr>
                <td style="text-align: left; padding: 0;">Rp</td>
                <td style="text-align: right; padding: 0;">${formatNumber(item.unitPrice)}</td>
              </tr>
            </table>
          </td>
          <td style="width: 120px; font-size: 8.5pt; font-weight: bold;">
            <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
              <tr>
                <td style="text-align: left; padding: 0;">Rp</td>
                <td style="text-align: right; padding: 0;">${formatNumber(item.totalPrice)}</td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

    const summaryRowsHtml = isLastChunk ? `
      <tr>
        <td colspan="2" style="text-align: center; font-weight: bold; font-size: 9pt;">Jumlah</td>
        <td style="text-align: center; font-weight: bold; font-size: 9pt;">${totalUnits}</td>
        <td style="text-align: center; font-weight: bold; font-size: 9pt;">Unit</td>
        <td style="text-align: right; font-weight: bold; font-size: 9pt;">Total 1</td>
        <td style="font-weight: bold; font-size: 9pt;">
          <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
            <tr>
              <td style="text-align: left; padding: 0;">Rp</td>
              <td style="text-align: right; padding: 0;">${formatNumber(sph.subtotal1)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="4" rowspan="4" style="vertical-align: top; padding: 0; background: #ffffff;">
          <div style="background-color: #0099e6; color: #ffffff; font-weight: bold; font-size: 8pt; padding: 3px 6px;">
            Terbilang:
          </div>
          <div style="padding: 12px 8px; text-align: center; font-weight: bold; font-style: italic; font-size: 9pt; color: #0f172a;">
            "${sph.terbilang || 'Nol Rupiah'}"
          </div>
        </td>
        <td style="text-align: right; font-weight: bold; font-size: 9pt;">PPN 11%</td>
        <td style="font-weight: bold; font-size: 9pt;">
          <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
            <tr>
              <td style="text-align: left; padding: 0;">Rp</td>
              <td style="text-align: right; padding: 0;">${formatNumber(sph.ppnAmount)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: right; font-weight: bold; font-size: 9pt;">Total 2</td>
        <td style="font-weight: bold; font-size: 9pt;">
          <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
            <tr>
              <td style="text-align: left; padding: 0;">Rp</td>
              <td style="text-align: right; padding: 0;">${formatNumber(sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount))}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: right; font-weight: bold; font-size: 9pt;">Akomodasi</td>
        <td style="font-weight: bold; font-size: 9pt;">
          <table class="no-border" style="width: 100%; margin: 0; padding: 0;">
            <tr>
              <td style="text-align: left; padding: 0;">Rp</td>
              <td style="text-align: right; padding: 0;">${sph.accommodationFee > 0 ? formatNumber(sph.accommodationFee) : '-'}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr style="background-color: #0099e6; color: #ffffff;">
        <td style="text-align: right; font-weight: bold; font-size: 9.5pt; color: #ffffff;">GRAND TOTAL</td>
        <td style="font-weight: 900; font-size: 9.5pt; color: #ffffff;">
          <table class="no-border" style="width: 100%; margin: 0; padding: 0; color: #ffffff;">
            <tr style="color: #ffffff;">
              <td style="text-align: left; padding: 0; color: #ffffff; font-weight: bold;">Rp</td>
              <td style="text-align: right; padding: 0; color: #ffffff; font-weight: bold;">${formatNumber(sph.grandTotal)}</td>
            </tr>
          </table>
        </td>
      </tr>
    ` : '';

    return `
      ${kopHtml}

      <table class="no-border" style="width: 100%; margin-top: 4px; font-size: 9pt;">
        <tr>
          <td style="width: 75px; font-weight: bold;">Nomor</td>
          <td style="width: 10px;">:</td>
          <td style="font-weight: bold;">${sph.sphNumber}</td>
          <td style="text-align: right;">${sph.city || 'Surakarta'}, ${dateStr}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Perihal</td>
          <td>:</td>
          <td style="font-weight: bold;">${sph.subject || 'Surat Penawaran Harga Kalibrasi'}</td>
          <td></td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Lampiran</td>
          <td>:</td>
          <td>${sph.attachmentPages || lampiranCount}</td>
          <td></td>
        </tr>
      </table>

      <div style="text-align: center; margin: 8px 0 6px 0;">
        <span style="font-size: 11pt; font-weight: bold; text-decoration: underline;">
          Surat Penawaran Harga
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
        <thead>
          <tr style="background-color: #0099e6; color: #ffffff;">
            <th style="width: 32px; color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">No.</th>
            <th style="color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">Diskripsi</th>
            <th style="width: 40px; color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">Qty</th>
            <th style="width: 50px; color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">Satuan</th>
            <th style="width: 110px; color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">Satuan Harga</th>
            <th style="width: 120px; color: #ffffff; border: 1px solid #000000; text-align: center; padding: 4px;">Total Harga</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          ${summaryRowsHtml}
        </tbody>
      </table>

      ${isLastChunk ? `
        <div style="margin-top: 8px; font-size: 7.5pt; color: #334155; line-height: 1.3;">
          <div>*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat</div>
          <div>**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi</div>
          <div>***Alat dilakukan penarikan untuk subkontraktor pekerjaan</div>
          <div>****Tidak termasuk jenis alat wajib kalibrasi</div>
        </div>
      ` : ''}

      ${footerHtml}
    `;
  });

  let finalBodyHtml = '';
  let filename = `SPH_${sph.sphNumber.replace(/[\/\\]/g, '_')}`;

  if (mode === '1') {
    finalBodyHtml = page1Html;
    filename += '_Halaman1_Surat';
  } else if (mode === '2') {
    finalBodyHtml = tablePagesHtml.join('<div class="page-break"></div>');
    filename += '_Halaman2_Lampiran';
  } else {
    finalBodyHtml = [page1Html, ...tablePagesHtml].join('<div class="page-break"></div>');
    filename += '_Lengkap';
  }

  exportHtmlToWord({
    title: `SPH - ${sph.sphNumber} - ${sph.hospitalName}`,
    filename: `${filename}.doc`,
    bodyHtml: finalBodyHtml
  });
}
