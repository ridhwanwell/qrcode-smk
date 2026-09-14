// Helper for generating and downloading Microsoft Word (.doc / .docx compatible) documents
// Compatible with Microsoft Word, LibreOffice, WPS Office, and Google Docs

interface WordDocumentOptions {
  title: string;
  filename: string;
  bodyHtml: string;
}

export function exportHtmlToWord({ title, filename, bodyHtml }: WordDocumentOptions) {
  const header = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm; /* A4 */
      margin: 1.5cm 1.5cm 1.5cm 1.5cm;
      mso-header-margin: 0.8cm;
      mso-footer-margin: 0.8cm;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      color: #111827;
      line-height: 1.35;
      background: #ffffff;
    }
    h1, h2, h3, h4, h5 {
      font-family: 'Calibri', 'Arial', sans-serif;
      margin: 0;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 8px;
      margin-bottom: 8px;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #1f2937;
      padding: 5px 8px;
      vertical-align: top;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
    }
    .no-border, .no-border td, .no-border th {
      border: none !important;
      padding: 2px 4px;
    }
    .kop-table {
      width: 100%;
      border-bottom: 2.5pt solid #111827 !important;
      margin-bottom: 12px;
    }
    .kop-table td {
      border: none !important;
      padding: 0 0 8px 0;
    }
    .footer-table {
      width: 100%;
      border-top: 2pt solid #111827 !important;
      margin-top: 16px;
      font-size: 8.5pt;
    }
    .footer-table td {
      border: none !important;
      padding: 6px 4px 0 4px;
    }
    .page-break {
      page-break-before: always;
      mso-special-character: line-break;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .text-sm { font-size: 9.5pt; }
    .text-xs { font-size: 8.5pt; }
  </style>
</head>
<body>
  <div class="Section1">
    ${bodyHtml}
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', header], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Letterhead HTML string for Word documents
export function getWordKopSuratHtml(titleText: string = 'Laboratorium Kalibrasi', customLetterheadSrc?: string | null) {
  if (customLetterheadSrc && (customLetterheadSrc.startsWith('data:image/') || customLetterheadSrc.startsWith('http'))) {
    return `
      <div style="text-align: center; margin-bottom: 16px; width: 100%;">
        <img src="${customLetterheadSrc}" alt="Kop Surat Resmi" style="width: 100%; max-height: 125px; object-fit: contain;" />
      </div>
    `;
  }

  return `
    <table class="kop-table no-border" style="width: 100%; margin-bottom: 16px;">
      <tr>
        <td style="width: 24%; vertical-align: middle;">
          <div style="display: inline-block; padding: 4px 8px; border: 2pt solid #0284c7; border-radius: 6px; text-align: center; background: #f0f9ff;">
            <div style="font-size: 16pt; font-weight: 900; color: #0284c7; font-family: 'Arial Black', Arial, sans-serif; letter-spacing: 1px;">
              SMK
            </div>
            <div style="font-size: 6pt; font-weight: bold; color: #0369a1; text-transform: uppercase;">
              SARANA MULTI KALIBRASI
            </div>
          </div>
        </td>
        <td style="width: 52%; text-align: center; vertical-align: middle;">
          <div style="font-size: 15pt; font-weight: 900; color: #000000; text-transform: uppercase; font-family: 'Arial Black', Arial, sans-serif; letter-spacing: -0.3px;">
            PT. SARANA MULTI KALIBRASI
          </div>
          <div style="font-size: 11pt; font-weight: bold; color: #0f172a; margin-top: 2px;">
            ${titleText}
          </div>
        </td>
        <td style="width: 24%; text-align: right; vertical-align: middle;">
          <div style="display: inline-block; text-align: center; border: 1.5pt solid #0b4d9c; padding: 3px 8px; background: #f8fafc; border-radius: 4px;">
            <div style="font-size: 12pt; font-weight: 900; color: #0b4d9c; font-family: Arial, sans-serif;">
              <span style="color: #d90429;">&#10004;</span> KAN
            </div>
            <div style="font-size: 7pt; font-weight: 600; color: #1e293b;">
              Komite Akreditasi Nasional
            </div>
            <div style="font-size: 8.5pt; font-weight: 900; color: #0f172a;">
              LK-532-IDN
            </div>
          </div>
        </td>
      </tr>
    </table>
  `;
}

// Footer HTML string for Word documents
export function getWordFooterHtml() {
  return `
    <table class="footer-table no-border" style="width: 100%; border-top: 1.5pt solid #000000; margin-top: 20px; font-size: 8pt; color: #111827;">
      <tr>
        <td style="width: 42%; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 2px;">Alamat:</div>
          <div>Jl. Kenari 3 No. A3, Ngipang RT 005/ RW 017,</div>
          <div>Kadipiro, Banjarsari, Kota Surakarta, Jawa Tengah,</div>
          <div>Indonesia</div>
        </td>
        <td style="width: 33%; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 2px;">No. Telephone & HOTLINE:</div>
          <div>Telephone : (0271) 2023035</div>
          <div>WhatsApp : (0851) 1234570</div>
        </td>
        <td style="width: 25%; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 2px;">E-mail :</div>
          <div>ptsaranamultikalibrasi@gmail.com</div>
          <div>aptsaranamultikalibrasi@gmail.com</div>
        </td>
      </tr>
    </table>
  `;
}
