import { CalibrationSchedule } from '../types';
import { formatIndonesianDate, formatRupiah } from './helpers';
import { exportHtmlToWord, getWordKopSuratHtml, getWordFooterHtml } from './wordExport';

export function exportSpkToWord(schedule: CalibrationSchedule) {
  const totalVolumePO = schedule.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const hospitalAddress = schedule.hospitalAddress || `${schedule.hospitalName}, ${schedule.hospitalCity}`;

  const devicesRowsHtml = schedule.targetDevices.map((d, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="font-weight: bold;">${d.name}</td>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #0f766e;">${d.labelNumber || '-'}</td>
      <td>${d.brandModel || '-'}</td>
      <td style="font-family: monospace;">${d.serialNumber || '-'}</td>
      <td>${d.room || '-'}</td>
      <td style="text-align: center; font-weight: bold;">${d.quantity || 1}</td>
      <td>${d.notes || 'Kalibrasi Berkala Medis'}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div class="Section1">
      ${getWordKopSuratHtml('Laboratorium Kalibrasi')}

      <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          SURAT PERINTAH KERJA (SPK) KALIBRASI
        </div>
        <div style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-top: 3px;">
          Nomor: ${schedule.workOrderNumber || 'SPK/SMK/2026/08/021'}
        </div>
      </div>

      <div style="margin-bottom: 12px; font-size: 10pt;">
        Yang bertanda tangan di bawah ini menerangkan bahwa telah menugaskan Tim Teknisi Elektromedis PT. Sarana Multi Kalibrasi untuk melaksanakan kalibrasi alat kesehatan:
      </div>

      <table class="no-border" style="width: 100%; font-size: 10pt; margin-bottom: 15px;">
        <tr>
          <td style="width: 25%; font-weight: bold;">Nama Faskes / RS</td>
          <td style="width: 3%;">:</td>
          <td style="width: 72%; font-weight: bold;">${schedule.hospitalName}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Alamat Rumah Sakit</td>
          <td>:</td>
          <td>${hospitalAddress}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">PIC / Kepala IPSRS</td>
          <td>:</td>
          <td>${schedule.hospitalPic} (${schedule.hospitalPhone || '-'})</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Tanggal Pelaksanaan</td>
          <td>:</td>
          <td>${formatIndonesianDate(schedule.scheduledDate)} s.d ${formatIndonesianDate(schedule.endDate || schedule.scheduledDate)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Ketua Tim Teknisi</td>
          <td>:</td>
          <td><b>${schedule.leadTechnicianName}</b></td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Anggota Teknisi</td>
          <td>:</td>
          <td>${schedule.supportTechnicianNames.join(', ') || '-'}</td>
        </tr>
      </table>

      <div style="font-weight: bold; font-size: 10.5pt; margin-top: 15px; margin-bottom: 6px;">
        DAFTAR PERALATAN MEDIS YANG DIKALIBRASI (${totalVolumePO} Unit) - Rentang Label: ${schedule.labelRange || (schedule.labelStart ? `${schedule.labelStart} - ${schedule.labelEnd}` : '-')}
      </div>

      <table style="width: 100%; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="width: 5%; text-align: center;">No</th>
            <th style="width: 25%;">Nama Alat Kesehatan</th>
            <th style="width: 14%; text-align: center;">No. Label (7-Digit)</th>
            <th style="width: 14%;">Merk / Type</th>
            <th style="width: 14%;">No. Seri</th>
            <th style="width: 14%;">Ruangan / Lokasi</th>
            <th style="width: 6%; text-align: center;">Qty</th>
            <th style="width: 8%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${devicesRowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 15px; font-size: 10pt; line-height: 1.4;">
        <b>Catatan Tugas:</b>
        <ol style="margin-top: 4px; padding-left: 20px;">
          <li>Lakukan pengujian keselamatan listrik (Electrical Safety) & kinerja sesuai metode kerja terakreditasi ISO/IEC 17025.</li>
          <li>Pastikan lembar kerja (Worksheet) dan Berita Acara (BAP & BASTP) ditandatangani oleh pihak Rumah Sakit / IPSRS setempat.</li>
        </ol>
      </div>

      <table class="signature-table no-border" style="width: 100%; margin-top: 30px; font-size: 10pt;">
        <tr>
          <td style="width: 50%; text-align: center;">
            <div>Pemberi Tugas,</div>
            <div style="font-weight: bold;">PT. SARANA MULTI KALIBRASI</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">Hafizh Pasifianto, S.Tr.T.</div>
            <div style="font-size: 9pt; color: #4b5563;">Manajer Teknik & Mutu</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div>Penerima Tugas (Lead Teknisi),</div>
            <div style="font-weight: bold;">Tim Kalibrasi Elektromedis</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${schedule.leadTechnicianName}</div>
            <div style="font-size: 9pt; color: #4b5563;">Teknisi Elektromedis Ber-STR</div>
          </td>
        </tr>
      </table>

      ${getWordFooterHtml()}
    </div>
  `;

  exportHtmlToWord({
    title: `SPK - ${schedule.hospitalName} - ${schedule.workOrderNumber}`,
    filename: `SPK_${schedule.workOrderNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${schedule.hospitalName.replace(/[^a-zA-Z0-9]/g, '_')}.doc`,
    bodyHtml
  });
}

export function exportBapToWord(schedule: CalibrationSchedule) {
  const totalVolumePO = schedule.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalRealisasi = schedule.targetDevices.reduce((sum, d) => {
    if (d.status === 'Pass' || d.status === 'Fail') return sum + (d.quantity || 1);
    return sum;
  }, 0);
  const totalSisa = Math.max(0, totalVolumePO - totalRealisasi);

  const devicesRowsHtml = schedule.targetDevices.map((d, index) => {
    const isCompleted = d.status === 'Pass' || d.status === 'Fail';
    const volumeKalibrasi = isCompleted ? (d.quantity || 1) : 0;
    const volumeSisa = (d.quantity || 1) - volumeKalibrasi;

    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-weight: bold;">${d.name}</td>
        <td>${d.brandModel || '-'}</td>
        <td style="font-family: monospace;">${d.serialNumber || '-'}</td>
        <td>${d.room || '-'}</td>
        <td style="text-align: center;">${d.quantity || 1}</td>
        <td style="text-align: center; font-weight: bold;">${volumeKalibrasi}</td>
        <td style="text-align: center;">${volumeSisa}</td>
        <td style="font-weight: bold; color: ${d.status === 'Pass' ? '#059669' : d.status === 'Fail' ? '#dc2626' : '#d97706'};">
          ${d.status === 'Pass' ? 'Laik Pakai' : d.status === 'Fail' ? 'Tidak Laik' : 'Proses'}
        </td>
      </tr>
    `;
  }).join('');

  const bodyHtml = `
    <div class="Section1">
      ${getWordKopSuratHtml('Laboratorium Penguji & Kalibrasi')}

      <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          BERITA ACARA PEKERJAAN (BAP) KALIBRASI
        </div>
        <div style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-top: 3px;">
          Nomor: ${schedule.bapNumber || '021/SMK/BAP/VIII/2026'}
        </div>
      </div>

      <div style="font-size: 10pt; margin-bottom: 12px; line-height: 1.4;">
        Pada hari ini <b>${formatIndonesianDate(schedule.endDate || schedule.scheduledDate)}</b>, bertempat di <b>${schedule.hospitalName}</b>, telah diselesaikan pelaksanaan pekerjaan kalibrasi alat kesehatan berdasarkan Surat Perintah Kerja No: <b>${schedule.workOrderNumber}</b>.
      </div>

      <table class="no-border" style="width: 100%; font-size: 10pt; margin-bottom: 15px;">
        <tr>
          <td style="width: 25%; font-weight: bold;">Fasilitas Pelayanan</td>
          <td style="width: 3%;">:</td>
          <td style="width: 72%; font-weight: bold;">${schedule.hospitalName}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Pihak Pertama (Pelaksana)</td>
          <td>:</td>
          <td>PT. SARANA MULTI KALIBRASI (Lead: ${schedule.leadTechnicianName})</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Pihak Kedua (RS / Faskes)</td>
          <td>:</td>
          <td>${schedule.hospitalPic} (${schedule.hospitalName})</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Total Volume Alkes</td>
          <td>:</td>
          <td>${totalVolumePO} Unit Terdaftar | Terealisasi: ${totalRealisasi} Unit | Sisa: ${totalSisa} Unit</td>
        </tr>
      </table>

      <div style="font-weight: bold; font-size: 10.5pt; margin-top: 15px; margin-bottom: 6px;">
        RINCIAN REALISASI KALIBRASI ALAT MEDIS
      </div>

      <table style="width: 100%; font-size: 9pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="width: 4%; text-align: center;">No</th>
            <th style="width: 24%;">Nama Alat Kesehatan</th>
            <th style="width: 14%;">Merk/Type</th>
            <th style="width: 14%;">No. Seri</th>
            <th style="width: 14%;">Ruangan</th>
            <th style="width: 6%; text-align: center;">PO</th>
            <th style="width: 8%; text-align: center;">Real</th>
            <th style="width: 6%; text-align: center;">Sisa</th>
            <th style="width: 10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${devicesRowsHtml}
        </tbody>
      </table>

      <table class="signature-table no-border" style="width: 100%; margin-top: 30px; font-size: 10pt;">
        <tr>
          <td style="width: 50%; text-align: center;">
            <div>Pihak Kedua (Rumah Sakit),</div>
            <div style="font-weight: bold;">${schedule.hospitalName}</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${schedule.hospitalPic}</div>
            <div style="font-size: 9pt; color: #4b5563;">Kepala IPSRS / ATEM</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div>Pihak Pertama (Pelaksana),</div>
            <div style="font-weight: bold;">PT. SARANA MULTI KALIBRASI</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${schedule.leadTechnicianName}</div>
            <div style="font-size: 9pt; color: #4b5563;">Ketua Tim Teknisi</div>
          </td>
        </tr>
      </table>

      ${getWordFooterHtml()}
    </div>
  `;

  exportHtmlToWord({
    title: `BAP - ${schedule.hospitalName}`,
    filename: `BAP_${schedule.hospitalName.replace(/[^a-zA-Z0-9]/g, '_')}_${schedule.workOrderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.doc`,
    bodyHtml
  });
}

export function exportBastpToWord(schedule: CalibrationSchedule) {
  const totalVolumePO = schedule.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const laikPakaiCount = schedule.targetDevices.reduce((sum, d) => d.status === 'Pass' ? sum + (d.quantity || 1) : sum, 0);
  const tidakLaikCount = schedule.targetDevices.reduce((sum, d) => d.status === 'Fail' ? sum + (d.quantity || 1) : sum, 0);

  const devicesRowsHtml = schedule.targetDevices.map((d, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="font-weight: bold;">${d.name}</td>
      <td>${d.brandModel || '-'}</td>
      <td style="font-family: monospace;">${d.serialNumber || '-'}</td>
      <td>${d.room || '-'}</td>
      <td style="text-align: center; font-weight: bold;">${d.quantity || 1}</td>
      <td style="font-weight: bold; color: ${d.status === 'Pass' ? '#059669' : '#dc2626'};">
        ${d.status === 'Pass' ? 'LAIK PAKAI (Lulus)' : d.status === 'Fail' ? 'TIDAK LAIK (Perlu Perbaikan)' : 'Dalam Pengujian'}
      </td>
      <td>Terlampir Sertifikat</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div class="Section1">
      ${getWordKopSuratHtml('Laboratorium Penguji & Kalibrasi')}

      <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          BERITA ACARA SERAH TERIMA PEKERJAAN (BASTP)
        </div>
        <div style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-top: 3px;">
          Nomor: BASTP/SMK/${schedule.hospitalName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}/2026/08
        </div>
      </div>

      <div style="font-size: 10pt; margin-bottom: 12px; line-height: 1.4;">
        Dengan ini diserahterimakan hasil pekerjaan pengujian dan kalibrasi alat kesehatan pada <b>${schedule.hospitalName}</b> beserta sertifikat dan label kalibrasi terakreditasi KAN LK-532-IDN.
      </div>

      <table class="no-border" style="width: 100%; font-size: 10pt; margin-bottom: 15px;">
        <tr>
          <td style="width: 25%; font-weight: bold;">Nama Rumah Sakit</td>
          <td style="width: 3%;">:</td>
          <td style="width: 72%; font-weight: bold;">${schedule.hospitalName}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Surat Perintah Kerja (SPK)</td>
          <td>:</td>
          <td>${schedule.workOrderNumber}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Ringkasan Hasil</td>
          <td>:</td>
          <td><b>${laikPakaiCount} Unit Laik Pakai</b> | <b>${tidakLaikCount} Unit Tidak Laik</b> dari total ${totalVolumePO} Unit</td>
        </tr>
      </table>

      <div style="font-weight: bold; font-size: 10.5pt; margin-top: 15px; margin-bottom: 6px;">
        STATUS SERAH TERIMA FISIK & SERTIFIKAT
      </div>

      <table style="width: 100%; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="width: 5%; text-align: center;">No</th>
            <th style="width: 28%;">Nama Alat Kesehatan</th>
            <th style="width: 16%;">Merk/Type</th>
            <th style="width: 16%;">No. Seri</th>
            <th style="width: 13%;">Ruang</th>
            <th style="width: 6%; text-align: center;">Qty</th>
            <th style="width: 16%;">Hasil Kalibrasi</th>
          </tr>
        </thead>
        <tbody>
          ${devicesRowsHtml}
        </tbody>
      </table>

      <table class="signature-table no-border" style="width: 100%; margin-top: 30px; font-size: 10pt;">
        <tr>
          <td style="width: 50%; text-align: center;">
            <div>Yang Menerima,</div>
            <div style="font-weight: bold;">${schedule.hospitalName}</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">${schedule.hospitalPic}</div>
            <div style="font-size: 9pt; color: #4b5563;">Kepala Bagian IPSRS</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div>Yang Menyerahkan,</div>
            <div style="font-weight: bold;">PT. SARANA MULTI KALIBRASI</div>
            <div style="height: 60px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">Hafizh Pasifianto, S.Tr.T.</div>
            <div style="font-size: 9pt; color: #4b5563;">Manajer Teknik & Metrologi</div>
          </td>
        </tr>
      </table>

      ${getWordFooterHtml()}
    </div>
  `;

  exportHtmlToWord({
    title: `BASTP - ${schedule.hospitalName}`,
    filename: `BASTP_${schedule.hospitalName.replace(/[^a-zA-Z0-9]/g, '_')}_${schedule.workOrderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.doc`,
    bodyHtml
  });
}
