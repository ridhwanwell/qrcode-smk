import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  Sparkles, 
  Building2, 
  Search, 
  Check, 
  FileText, 
  AlertCircle, 
  RotateCcw, 
  DollarSign, 
  Percent, 
  TrendingDown, 
  ArrowRight, 
  HelpCircle, 
  Receipt, 
  Download, 
  User, 
  Calendar, 
  Layers, 
  Phone, 
  FileCheck,
  Globe,
  ExternalLink,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { SphItem, SphQuotation, Hospital } from '../types';
import { SPH_TARIFF_CATALOG, TariffItem } from '../data/sphTariffCatalog';
import { 
  SPH_ECATALOGUE_CATALOG, 
  ECatalogueItem, 
  extractCleanToolName, 
  getECatalogueTariff 
} from '../data/sphECatalogueData';
import { 
  calculateNegotiation, 
  generateSphNumber, 
  formatRupiah, 
  formatNumber, 
  formatIndonesianLongDate, 
  OFFICIAL_MARKETING_STAFF, 
  angkaTerbilang,
  getEffectivePaymentOption
} from '../utils/sphHelpers';
import { createAuthenticSphPdf } from '../lib/templateGenerator';
import { getFullTemplatesConfig } from '../lib/templateService';
import { getLocalBlob } from '../lib/localBlobStorage';
import { useAuth } from '../lib/AuthContext';

const OFFICIAL_SAMPLE_ITEMS: SphItem[] = [
  { id: 'sample-1', description: 'Anaesthesia Unit (Mesin Anesthesi)', quantity: 1, unit: 'Unit', standardPrice: 362400, unitPrice: 362400, totalPrice: 362400 },
  { id: 'sample-2', description: 'Baby Incubator', quantity: 4, unit: 'Unit', standardPrice: 362400, unitPrice: 362400, totalPrice: 1449600 },
  { id: 'sample-3', description: 'Infant Warmer', quantity: 1, unit: 'Unit', standardPrice: 362400, unitPrice: 362400, totalPrice: 362400 },
  { id: 'sample-4', description: 'Autoclave', quantity: 2, unit: 'Unit', standardPrice: 362400, unitPrice: 362400, totalPrice: 724800 },
  { id: 'sample-5', description: 'Centrifuge', quantity: 4, unit: 'Unit', standardPrice: 200000, unitPrice: 200000, totalPrice: 800000 },
  { id: 'sample-6', description: 'Electrocardiograph (ECG)', quantity: 5, unit: 'Unit', standardPrice: 195000, unitPrice: 195000, totalPrice: 975000 },
  { id: 'sample-7', description: 'Electrosurgical Unit (ESU)', quantity: 2, unit: 'Unit', standardPrice: 362400, unitPrice: 362400, totalPrice: 724800 },
  { id: 'sample-8', description: 'Fetal Doppler', quantity: 3, unit: 'Unit', standardPrice: 175000, unitPrice: 175000, totalPrice: 525000 },
  { id: 'sample-9', description: 'Infusion Pump', quantity: 12, unit: 'Unit', standardPrice: 175000, unitPrice: 175000, totalPrice: 2100000 },
  { id: 'sample-10', description: 'Syringe Pump', quantity: 10, unit: 'Unit', standardPrice: 175000, unitPrice: 175000, totalPrice: 1750000 },
  { id: 'sample-11', description: 'Lampu Operasi', quantity: 2, unit: 'Unit', standardPrice: 150000, unitPrice: 150000, totalPrice: 300000 },
  { id: 'sample-12', description: 'Meja Operasi', quantity: 2, unit: 'Unit', standardPrice: 150000, unitPrice: 150000, totalPrice: 300000 },
  { id: 'sample-13', description: 'Patient Monitor', quantity: 8, unit: 'Unit', standardPrice: 250000, unitPrice: 250000, totalPrice: 2000000 },
  { id: 'sample-14', description: 'Pulse Oximeter', quantity: 6, unit: 'Unit', standardPrice: 150000, unitPrice: 150000, totalPrice: 900000 },
  { id: 'sample-15', description: 'Suction Pump', quantity: 8, unit: 'Unit', standardPrice: 150000, unitPrice: 150000, totalPrice: 1200000 },
  { id: 'sample-16', description: 'Tensimeter Digital / Aneroid', quantity: 15, unit: 'Unit', standardPrice: 100000, unitPrice: 100000, totalPrice: 1500000 },
  { id: 'sample-17', description: 'Termometer Digital / Inframerah', quantity: 10, unit: 'Unit', standardPrice: 80000, unitPrice: 80000, totalPrice: 800000 },
  { id: 'sample-18', description: 'Timbangan Bayi / Dewasa', quantity: 6, unit: 'Unit', standardPrice: 120000, unitPrice: 120000, totalPrice: 720000 },
  { id: 'sample-19', description: 'USG (Ultrasonografi)', quantity: 2, unit: 'Unit', standardPrice: 350000, unitPrice: 350000, totalPrice: 700000 },
  { id: 'sample-20', description: 'Ventilator', quantity: 2, unit: 'Unit', standardPrice: 400000, unitPrice: 400000, totalPrice: 800000 }
];

const OFFICIAL_ECATALOGUE_SAMPLE_ITEMS: SphItem[] = [
  { 
    id: 'ecat-1', 
    description: 'Syringe Pump', 
    quantity: 5, 
    unit: 'Unit', 
    standardPrice: 460650, 
    unitPrice: 460650, 
    totalPrice: 2303250,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kesehatan-syringe-pump' 
  },
  { 
    id: 'ecat-2', 
    description: 'Infuse Pump', 
    quantity: 5, 
    unit: 'Unit', 
    standardPrice: 305250, 
    unitPrice: 305250, 
    totalPrice: 1526250,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-alat-kalibrasi-infuse-pump' 
  },
  { 
    id: 'ecat-3', 
    description: 'Centrifuge', 
    quantity: 2, 
    unit: 'Unit', 
    standardPrice: 252000, 
    unitPrice: 252000, 
    totalPrice: 504000,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-centrifuge' 
  },
  { 
    id: 'ecat-4', 
    description: 'Autoclave', 
    quantity: 1, 
    unit: 'Unit', 
    standardPrice: 428999, 
    unitPrice: 428999, 
    totalPrice: 428999,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-autoclave' 
  },
  { 
    id: 'ecat-5', 
    description: 'Electrocardiograph (ECG)', 
    quantity: 2, 
    unit: 'Unit', 
    standardPrice: 298500, 
    unitPrice: 298500, 
    totalPrice: 597000,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-pengujian-dan-atau-kalibrasi-alat-kesehatan-electrocardiograph' 
  },
  { 
    id: 'ecat-6', 
    description: 'Bed Side Monitor', 
    quantity: 4, 
    unit: 'Unit', 
    standardPrice: 350000, 
    unitPrice: 350000, 
    totalPrice: 1400000,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-bed-side-monitor' 
  },
  { 
    id: 'ecat-7', 
    description: 'Tensimeter Jarum / Sphygmomanometer', 
    quantity: 8, 
    unit: 'Unit', 
    standardPrice: 230880, 
    unitPrice: 230880, 
    totalPrice: 1847040,
    eCatalogueUrl: 'https://katalog.inaproc.id/sarana-multi-kalibrasi/jasa-kalibrasi-dan-atau-pengujian-tensi-jarum' 
  }
];

interface SphFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sph: SphQuotation) => void;
  hospitals: Hospital[];
  initialSph?: SphQuotation | null;
  existingSphCount?: number;
  initialSphType?: 'non_ecatalogue' | 'ecatalogue';
}

export const SphFormModal: React.FC<SphFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  hospitals,
  initialSph,
  existingSphCount = 45,
  initialSphType = 'non_ecatalogue'
}) => {
  const { role } = useAuth();
  const canMarkDeal = role === 'admin_utama' || role === 'admin_keuangan';

  // SPH Type (Non E-Catalogue vs E-Catalogue)
  const [sphType, setSphType] = useState<'non_ecatalogue' | 'ecatalogue'>('non_ecatalogue');

  // Form Header & Letter Info State
  const [sphNumber, setSphNumber] = useState('');
  const [subject, setSubject] = useState('Surat Penawaran Harga Kalibrasi');
  const [attachmentPages, setAttachmentPages] = useState('1 Lembar');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState('Surakarta');
  const [tembusan, setTembusan] = useState('-');
  const [notes, setNotes] = useState('-');

  // Customer Details State
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [customerUp, setCustomerUp] = useState('Direktur');

  // Payment Bank Option in Info Surat (Poin 9)
  const [paymentOption, setPaymentOption] = useState<'both' | 'jateng' | 'mandiri' | 'custom'>('both');
  const [customBankDetails, setCustomBankDetails] = useState('');

  // Items State
  const [items, setItems] = useState<SphItem[]>([]);

  // Negotiation & Pricing State
  const [accommodationFee, setAccommodationFee] = useState(0);
  const [isPpnIncluded, setIsPpnIncluded] = useState(true);
  const [negotiationTarget, setNegotiationTarget] = useState<string>('');
  const [negotiationType, setNegotiationType] = useState<'NONE' | 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT' | 'MANUAL'>('INCLUDE_PPN');
  const [status, setStatus] = useState<SphQuotation['status']>('Draft');
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  // Company and Signer Config
  const [marketingStaffName, setMarketingStaffName] = useState('Ari');
  const [marketingStaffPhone, setMarketingStaffPhone] = useState('0812-4484-2383');
  const [directorName, setDirectorName] = useState('Ahmad Fajar Ariyanto');
  const [directorTitle, setDirectorTitle] = useState('Direktur');

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Quick Catalog Picker State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('Semua');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogTab, setCatalogTab] = useState<'ecatalogue' | 'brochure'>('brochure');

  // Initialize or reset form
  useEffect(() => {
    if (initialSph) {
      setSphType(initialSph.sphType || 'non_ecatalogue');
      setCatalogTab(initialSph.sphType === 'ecatalogue' ? 'ecatalogue' : 'brochure');
      setSphNumber(initialSph.sphNumber);
      setSubject(initialSph.subject || 'Surat Penawaran Harga Kalibrasi');
      setAttachmentPages(initialSph.attachmentPages || '1 Lembar');
      setDate(initialSph.date);
      setCity(initialSph.city || 'Surakarta');
      setTembusan(initialSph.tembusan || '-');
      setNotes(initialSph.notes || '-');
      setHospitalId(initialSph.hospitalId || '');
      setHospitalName(initialSph.hospitalName);
      setHospitalAddress(initialSph.hospitalAddress);
      setCustomerUp(initialSph.recipientRole || 'Direktur');
      setItems(initialSph.items);
      setAccommodationFee(initialSph.accommodationFee || 0);
      setIsPpnIncluded(initialSph.isPpnIncluded !== false);
      setNegotiationTarget(initialSph.negotiationTarget ? String(initialSph.negotiationTarget) : '');
      setNegotiationType(initialSph.negotiationType || 'INCLUDE_PPN');
      setStatus(initialSph.status);
      setPdfUrl(initialSph.pdfUrl);
      setMarketingStaffName(initialSph.marketingStaffName || 'Ari');
      setMarketingStaffPhone(initialSph.marketingStaffPhone || '0812-4484-2383');
      setDirectorName(initialSph.directorName || 'Ahmad Fajar Ariyanto');
      setDirectorTitle(initialSph.directorTitle || 'Direktur');
      setPaymentOption(getEffectivePaymentOption(initialSph));
      setCustomBankDetails(initialSph.customBankDetails || '');
    } else {
      // New SPH defaults
      const chosenType = initialSphType || 'non_ecatalogue';
      setSphType(chosenType);
      setCatalogTab(chosenType === 'ecatalogue' ? 'ecatalogue' : 'brochure');
      setSphNumber(generateSphNumber(existingSphCount));
      setSubject('Surat Penawaran Harga Kalibrasi');
      setAttachmentPages(chosenType === 'ecatalogue' ? '2 Lembar' : '1 Lembar');
      setDate(new Date().toISOString().split('T')[0]);
      setCity('Surakarta');
      setTembusan('-');
      setNotes('-');
      setHospitalId('');
      setHospitalName('');
      setHospitalAddress('');
      setCustomerUp('Direktur');
      setPaymentOption('both');
      setCustomBankDetails('');
      setAccommodationFee(0);
      setIsPpnIncluded(true);
      setNegotiationTarget('');
      setNegotiationType('INCLUDE_PPN');
      setStatus('Draft');
      setPdfUrl(undefined);
      setMarketingStaffName('Ari');
      setMarketingStaffPhone('0812-4484-2383');
      setDirectorName('Ahmad Fajar Ariyanto');
      setDirectorTitle('Direktur');
      setItems([]);
    }
  }, [initialSph, isOpen, existingSphCount, initialSphType]);

  // Handle hospital select
  const handleHospitalChange = (hId: string) => {
    setHospitalId(hId);
    const selected = hospitals.find(h => h.id === hId);
    if (selected) {
      setHospitalName(selected.name);
      setHospitalAddress(selected.address);
    }
  };

  // Select predefined marketing staff
  const handleMarketingSelect = (name: string) => {
    const found = OFFICIAL_MARKETING_STAFF.find(m => m.name.toLowerCase() === name.toLowerCase());
    setMarketingStaffName(name);
    if (found) {
      setMarketingStaffPhone(found.phone);
    }
  };

  // Add Item from Brochure Catalog
  const handleAddItemFromBrochure = (tariff: TariffItem) => {
    const newItem: SphItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      catalogNumber: tariff.id,
      description: tariff.name,
      quantity: 1,
      unit: tariff.unit,
      standardPrice: tariff.price,
      unitPrice: tariff.price,
      totalPrice: tariff.price,
      notes: tariff.notes || '',
      eCatalogueUrl: getECatalogueTariff(tariff.name)?.link
    };
    setItems(prev => [...prev, newItem]);
  };

  // Add Item from E-Catalogue Catalog
  const handleAddItemFromECatalogue = (ecat: ECatalogueItem) => {
    const cleanName = extractCleanToolName(ecat.name);
    const newItem: SphItem = {
      id: `ecat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      catalogNumber: ecat.id,
      description: cleanName,
      quantity: 1,
      unit: ecat.unit || 'Unit',
      standardPrice: ecat.price,
      unitPrice: ecat.price,
      totalPrice: ecat.price,
      eCatalogueUrl: ecat.link
    };
    setItems(prev => [...prev, newItem]);
  };

  // Add Empty Item Manual
  const handleAddEmptyItem = () => {
    const newItem: SphItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: '',
      quantity: '' as any,
      unit: 'Unit',
      standardPrice: 0,
      unitPrice: '' as any,
      totalPrice: 0,
      eCatalogueUrl: ''
    };
    setItems(prev => [...prev, newItem]);
  };

  // Load sample items
  const handleLoadSampleItems = () => {
    if (sphType === 'ecatalogue') {
      setItems(OFFICIAL_ECATALOGUE_SAMPLE_ITEMS);
    } else {
      setItems(OFFICIAL_SAMPLE_ITEMS);
    }
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof SphItem, value: any) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        updated.totalPrice = qty * price;
      }
      return updated;
    }));
  };

  // Run Smart Negotiation Calculation
  const applyNegotiation = (targetValStr?: string, type?: 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT') => {
    const numTarget = Number(targetValStr !== undefined ? targetValStr : negotiationTarget);
    const targetMode = type || negotiationType;

    if (!numTarget || numTarget <= 0) {
      resetToBrochurePrices();
      return;
    }

    const result = calculateNegotiation({
      items,
      targetAmount: numTarget,
      targetType: targetMode,
      includePpn: isPpnIncluded,
      accommodationFee: Number(accommodationFee) || 0
    });

    setItems(result.items);
  };

  // Reset to original brochure prices
  const resetToBrochurePrices = () => {
    setItems(prev => prev.map(it => ({
      ...it,
      unitPrice: it.standardPrice || it.unitPrice,
      totalPrice: it.quantity * (it.standardPrice || it.unitPrice)
    })));
    setNegotiationTarget('');
  };

  // Calculate live totals
  const subtotalOriginal = items.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.standardPrice) || Number(it.unitPrice) || 0)), 0);
  const subtotal1 = items.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
  const subtotal2 = subtotal1 + (Number(accommodationFee) || 0);
  const ppnAmount = isPpnIncluded ? Math.round(subtotal2 * 0.11) : 0;
  const grandTotal = subtotal2 + ppnAmount;
  const discountAmount = Math.max(0, subtotalOriginal - subtotal1);
  const discountPercent = subtotalOriginal > 0 ? (discountAmount / subtotalOriginal) * 100 : 0;
  const formattedDateStr = formatIndonesianLongDate(date, city);

  // Filter Catalog
  const brochureCategories = ['Semua', ...Array.from(new Set(SPH_TARIFF_CATALOG.map(t => t.category)))];
  const filteredBrochureCatalog = SPH_TARIFF_CATALOG.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          t.id.toString().includes(catalogSearch);
    const matchesCat = selectedCatalogCategory === 'Semua' || t.category === selectedCatalogCategory;
    return matchesSearch && matchesCat;
  });

  const filteredECatalogue = SPH_ECATALOGUE_CATALOG.filter(ec => {
    const matchesSearch = 
      ec.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      ec.id.toString().includes(catalogSearch) ||
      extractCleanToolName(ec.name).toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesSearch;
  });

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!hospitalName.trim()) {
      alert('Mohon isi Nama Customer / Rumah Sakit terlebih dahulu!');
      return;
    }

    if (items.length === 0) {
      alert('Mohon tambahkan minimal 1 item alat!');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const config = await getFullTemplatesConfig();
      let resolvedLh: string | null = null;
      if (config.kop_surat?.activeUrl) {
        resolvedLh = config.kop_surat.activeUrl.startsWith('idb://')
          ? await getLocalBlob(config.kop_surat.activeUrl)
          : config.kop_surat.activeUrl;
      }

      const calculatedTerbilang = angkaTerbilang(grandTotal);
      const dynamicAttachmentPages = sphType === 'ecatalogue'
        ? (items.length > 14 ? '3 Lembar' : '2 Lembar')
        : (items.length > 18 ? '2 Lembar' : '1 Lembar');

      const cleanItems: SphItem[] = items.map((it, idx) => {
        const q = Math.max(1, Number(it.quantity) || 1);
        const uPrice = Math.max(0, Number(it.unitPrice) || 0);
        const cleanName = extractCleanToolName(it.description || '');
        const autoUrl = it.eCatalogueUrl || getECatalogueTariff(it.description)?.link || getECatalogueTariff(cleanName)?.link;

        return {
          ...it,
          no: it.no || (idx + 1),
          quantity: q,
          unitPrice: uPrice,
          totalPrice: q * uPrice,
          standardPrice: (it.standardPrice !== undefined && it.standardPrice > 0) ? it.standardPrice : uPrice,
          eCatalogueUrl: autoUrl || it.eCatalogueUrl
        };
      });

      const sphData = {
        sphType,
        sphNumber: sphNumber || generateSphNumber(existingSphCount),
        subject,
        attachmentPages: dynamicAttachmentPages,
        date,
        city,
        formattedDate: formattedDateStr,
        hospitalName,
        hospitalAddress,
        recipientRole: customerUp || 'Direktur',
        tembusan,
        notes,
        items: cleanItems.map((it, idx) => ({
          no: idx + 1,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit || 'Unit',
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          eCatalogueUrl: it.eCatalogueUrl
        })),
        subtotalOriginal,
        subtotal1,
        accommodationFee: Number(accommodationFee) || 0,
        subtotal2,
        ppnPercent: isPpnIncluded ? 11 : 0,
        isPpnIncluded,
        ppnAmount,
        grandTotal,
        terbilang: calculatedTerbilang,
        marketingStaffName,
        marketingStaffPhone,
        directorName,
        directorTitle,
        paymentOption,
        customBankDetails,
        bankName: paymentOption === 'jateng' 
          ? 'Bank Jateng Cab. Surakarta' 
          : (paymentOption === 'mandiri' ? 'Bank Mandiri Cab. Surakarta' : 'Bank Mandiri & Bank Jateng'),
        bankAccountNumber: paymentOption === 'jateng' 
          ? '1-002-01495-1' 
          : (paymentOption === 'mandiri' ? '138-00-2610846-9' : '1-002-01495-1 / 138-00-2610846-9'),
        bankAccountName: 'SARANA MULTI KALIBRASI PT'
      };

      const pdfBytes = await createAuthenticSphPdf(sphData, undefined, resolvedLh);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const cleanNumber = (sphNumber || 'SPH').replace(/[^a-zA-Z0-9-]/g, '_');
      const cleanCust = (hospitalName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(blob, `SPH_${sphType === 'ecatalogue' ? 'ECATALOGUE_' : ''}${cleanNumber}_${cleanCust}.pdf`);
    } catch (err: any) {
      console.error('Error generating direct SPH PDF:', err);
      alert('Gagal menghasilkan PDF: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalName.trim()) {
      alert('Mohon isi nama Customer / Rumah Sakit tujuan penawaran!');
      return;
    }

    if (items.length === 0) {
      alert('Mohon tambahkan minimal 1 item alat medis!');
      return;
    }

    // Pastikan item yang disimpan adalah harga dan kuantitas yang diketik manual pengguna
    const cleanItems: SphItem[] = items.map((it, idx) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const uPrice = Math.max(0, Number(it.unitPrice) || 0);
      const cleanName = extractCleanToolName(it.description || '');
      const autoUrl = it.eCatalogueUrl || getECatalogueTariff(it.description)?.link || getECatalogueTariff(cleanName)?.link;

      return {
        ...it,
        no: it.no || (idx + 1),
        quantity: q,
        unitPrice: uPrice,
        totalPrice: q * uPrice,
        standardPrice: (it.standardPrice !== undefined && it.standardPrice > 0) ? it.standardPrice : uPrice,
        eCatalogueUrl: autoUrl || it.eCatalogueUrl
      };
    });

    const calculatedSubtotalOriginal = cleanItems.reduce(
      (acc, it) => acc + (it.quantity * (it.standardPrice || it.unitPrice)),
      0
    );
    const calculatedSubtotal1 = cleanItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const calculatedSubtotal2 = calculatedSubtotal1 + (Number(accommodationFee) || 0);
    const calculatedPpn = isPpnIncluded ? Math.round(calculatedSubtotal2 * 0.11) : 0;
    const calculatedGrand = calculatedSubtotal2 + calculatedPpn;
    const calculatedTerbilang = angkaTerbilang(calculatedGrand);
    const calculatedDiscountAmount = Math.max(0, calculatedSubtotalOriginal - calculatedSubtotal1);
    const calculatedDiscountPercent = calculatedSubtotalOriginal > 0 ? (calculatedDiscountAmount / calculatedSubtotalOriginal) * 100 : 0;

    const dynamicAttachmentPages = sphType === 'ecatalogue'
      ? (cleanItems.length > 14 ? '3 Lembar' : '2 Lembar')
      : (cleanItems.length > 18 ? '2 Lembar' : '1 Lembar');

    const paymentTermText = paymentOption === 'jateng'
      ? 'Pembayaran : Bank Jateng : 1-002-01495-1 (SARANA MULTI KALIBRASI PT)'
      : paymentOption === 'mandiri'
      ? 'Pembayaran : Bank Mandiri : 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)'
      : paymentOption === 'custom' && customBankDetails
      ? `Pembayaran : ${customBankDetails}`
      : 'Pembayaran : 1. Bank Jateng: 1-002-01495-1 | 2. Bank Mandiri: 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)';

    const newSph: SphQuotation = {
      id: initialSph?.id || `SPH-${Date.now()}`,
      sphType,
      sphNumber: sphNumber || generateSphNumber(existingSphCount),
      subject,
      attachmentPages: dynamicAttachmentPages,
      date,
      city,
      formattedDate: formattedDateStr,
      hospitalId,
      hospitalName,
      hospitalAddress,
      recipientRole: customerUp || 'Direktur',
      tembusan,
      notes,
      items: cleanItems,
      subtotalOriginal: calculatedSubtotalOriginal > 0 ? calculatedSubtotalOriginal : calculatedSubtotal1,
      subtotal1: calculatedSubtotal1,
      accommodationFee: Number(accommodationFee) || 0,
      subtotal2: calculatedSubtotal2,
      ppnPercent: isPpnIncluded ? 11 : 0,
      isPpnIncluded,
      ppnAmount: calculatedPpn,
      grandTotal: calculatedGrand,
      terbilang: calculatedTerbilang,
      marketingStaffName,
      marketingStaffPhone,
      directorName,
      directorTitle,
      paymentOption,
      customBankDetails,
      bankName: paymentOption === 'jateng' 
        ? 'Bank Jateng Cab. Surakarta' 
        : (paymentOption === 'mandiri' ? 'Bank Mandiri Cab. Surakarta' : 'Bank Mandiri & Bank Jateng'),
      bankAccountNumber: paymentOption === 'jateng' 
        ? '1-002-01495-1' 
        : (paymentOption === 'mandiri' ? '138-00-2610846-9' : '1-002-01495-1 / 138-00-2610846-9'),
      bankAccountName: 'SARANA MULTI KALIBRASI PT',
      termsAndConditions: [
        isPpnIncluded ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.',
        'Harga sudah termasuk biaya transportasi dan akomodasi.',
        'Harga tidak termasuk service dan maintenance.',
        'Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.',
        'Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.',
        'Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.',
        'Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.',
        'Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.',
        paymentTermText
      ],
      status,
      discountAmount: calculatedDiscountAmount,
      discountPercent: calculatedDiscountPercent,
      createdAt: initialSph?.createdAt || date,
      validUntilDate: new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ...(negotiationTarget ? { negotiationTarget: Number(negotiationTarget) } : {}),
      ...(negotiationType ? { negotiationType } : {}),
      ...(pdfUrl ? { pdfUrl } : {})
    };

    onSave(newSph);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-5xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-[#1C658C] border-b border-[#144966] text-white flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{initialSph ? 'Edit Surat Penawaran Harga (SPH)' : 'Pembuatan Surat Penawaran Harga (SPH)'}</span>
                <span className="text-xs bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded font-mono font-bold">
                  {sphNumber}
                </span>
              </h2>
              <p className="text-xs text-[#D8D2CB]">
                Pilih format penawaran, kalkulasi negosiasi otomatis, dan unduh PDF resmi ber-Kop Surat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SPH Type Selector Banner */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jenis SPH:</span>
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setSphType('non_ecatalogue');
                  setCatalogTab('brochure');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sphType === 'non_ecatalogue'
                    ? 'bg-[#1C658C] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Non E-Catalogue (Reguler)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSphType('ecatalogue');
                  setCatalogTab('ecatalogue');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sphType === 'ecatalogue'
                    ? 'bg-[#1C658C] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-300" />
                <span>E-Catalogue (Inaproc LKPP)</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {sphType === 'ecatalogue' ? (
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                Otomatis Lampiran Lembar Link E-Catalogue Inaproc LKPP (139 Item)
              </span>
            ) : (
              <span className="text-slate-600 font-medium">
                Katalog Tarif Standar Brosur Resmi (121 Alat Medis)
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-800 bg-[#EEEEEE]/30">
          
          {/* BAGIAN 1: INFO CUSTOMER & INFO SURAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Box 1: Info Customer */}
            <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-2.5">
                <h3 className="text-xs font-bold text-[#1C658C] flex items-center gap-2 uppercase tracking-wide">
                  <User className="w-4 h-4 text-[#398AB9]" />
                  <span>Info Customer</span>
                </h3>
                {hospitals.length > 0 && (
                  <div className="relative">
                    <select
                      value={hospitalId}
                      onChange={(e) => handleHospitalChange(e.target.value)}
                      className="text-[11px] bg-[#EEEEEE] border border-[#D8D2CB] rounded px-2 py-0.5 text-slate-700 outline-none"
                    >
                      <option value="">-- Pilih dari Database RS --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Customer / Rumah Sakit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none font-semibold"
                  placeholder="Contoh: RS Umum Islam YAKSSI Gemolong"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Customer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Jl. Raya Solo - Purwodadi KM. 20 Gemolong, Sragen..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  UP (Untuk Perhatian / Nama Penerima)
                </label>
                <input
                  type="text"
                  value={customerUp}
                  onChange={(e) => setCustomerUp(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Contoh: Direktur / Bagian Pengadaan"
                />
              </div>
            </div>

            {/* Box 2: Info Surat */}
            <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-2.5">
                <h3 className="text-xs font-bold text-[#1C658C] flex items-center gap-2 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-[#398AB9]" />
                  <span>Info Surat</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Standar Format Resmi SMK
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor SPH Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sphNumber}
                    onChange={(e) => setSphNumber(e.target.value)}
                    className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    placeholder="146/SMK-SPH/IX-2026"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Perihal
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                      placeholder="Surat Penawaran Harga Kalibrasi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tembusan
                    </label>
                    <input
                      type="text"
                      value={tembusan}
                      onChange={(e) => setTembusan(e.target.value)}
                      className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                      placeholder="Direktur / Kabid Penunjang / -"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Surat
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kota Diterbitkan
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    placeholder="Surakarta"
                  />
                </div>
              </div>

              {/* Tanggal PDF Preview & Catatan */}
              <div className="p-2.5 bg-[#EEEEEE]/60 border border-[#D8D2CB] rounded-lg text-xs flex items-center justify-between">
                <span className="text-slate-500">Format Tanggal PDF:</span>
                <span className="font-semibold text-[#1C658C]">{formattedDateStr}</span>
              </div>

              {/* PILIHAN PEMBAYARAN BANK (Poin 9 SPH) */}
              <div className="pt-1 border-t border-[#D8D2CB]/60">
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#1C658C]">
                    <CreditCard className="w-3.5 h-3.5 text-[#398AB9]" />
                    <span>Pilihan Rekening Pembayaran (Poin 9)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Rekening Resmi PT SMK</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('both')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      paymentOption === 'both'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-xs'
                        : 'bg-[#EEEEEE]/60 text-slate-700 border-[#D8D2CB] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="leading-tight">2 Bank (Keduanya)</span>
                    <span className={`text-[10px] ${paymentOption === 'both' ? 'text-cyan-100' : 'text-slate-500'}`}>Jateng & Mandiri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('jateng')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      paymentOption === 'jateng'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-xs'
                        : 'bg-[#EEEEEE]/60 text-slate-700 border-[#D8D2CB] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="leading-tight">Bank Jateng Saja</span>
                    <span className={`text-[10px] font-mono ${paymentOption === 'jateng' ? 'text-cyan-100' : 'text-slate-500'}`}>1-002-01495-1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('mandiri')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      paymentOption === 'mandiri'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-xs'
                        : 'bg-[#EEEEEE]/60 text-slate-700 border-[#D8D2CB] hover:bg-[#EEEEEE]'
                    }`}
                  >
                    <span className="leading-tight">Bank Mandiri Saja</span>
                    <span className={`text-[10px] font-mono ${paymentOption === 'mandiri' ? 'text-cyan-100' : 'text-slate-500'}`}>138-00-2610846-9</span>
                  </button>
                </div>

                {/* Box Detail Rekening Terpilih */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs space-y-1">
                  <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Rekening yang tercantum pada surat SPH:</span>
                  </div>
                  {paymentOption === 'both' && (
                    <div className="space-y-0.5 text-[11px] text-slate-800">
                      <div>1. <strong>Bank Jateng:</strong> <span className="font-mono font-bold">1-002-01495-1</span> <span className="text-slate-600">(a.n. SARANA MULTI KALIBRASI PT)</span></div>
                      <div>2. <strong>Bank Mandiri:</strong> <span className="font-mono font-bold">138-00-2610846-9</span> <span className="text-slate-600">(a.n. SARANA MULTI KALIBRASI PT)</span></div>
                    </div>
                  )}
                  {paymentOption === 'jateng' && (
                    <div className="text-[11px] text-slate-800">
                      <strong>Bank Jateng:</strong> <span className="font-mono font-bold">1-002-01495-1</span> <span className="text-slate-600">(a.n. SARANA MULTI KALIBRASI PT)</span>
                    </div>
                  )}
                  {paymentOption === 'mandiri' && (
                    <div className="text-[11px] text-slate-800">
                      <strong>Bank Mandiri:</strong> <span className="font-mono font-bold">138-00-2610846-9</span> <span className="text-slate-600">(a.n. SARANA MULTI KALIBRASI PT)</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Boleh kosong atau strip (-)"
                />
              </div>

            </div>

          </div>

          {/* BAGIAN 2: INFO INTERNAL & STATUS */}
          <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-2.5">
              <h3 className="text-xs font-bold text-[#1C658C] flex items-center gap-2 uppercase tracking-wide">
                <Building2 className="w-4 h-4 text-[#398AB9]" />
                <span>Info Internal & Penanda Tangan</span>
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Status SPH:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-[#EEEEEE] border border-[#D8D2CB] text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-[#1C658C] outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Terkirim ke RS">Terkirim ke RS</option>
                  <option value="Negosiasi">Proses Negosiasi</option>
                  {(canMarkDeal || status === 'Disetujui (Deal)') && (
                    <option value="Disetujui (Deal)">Disetujui (Deal)</option>
                  )}
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Marketing Preset Selector */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pilih Staf Marketing
                </label>
                <select
                  value={marketingStaffName}
                  onChange={(e) => handleMarketingSelect(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-[#1C658C] outline-none cursor-pointer"
                >
                  {OFFICIAL_MARKETING_STAFF.map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.phone})</option>
                  ))}
                  <option value="Custom">Kustom / Lainnya</option>
                </select>
              </div>

              {/* Marketing Phone */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  No. HP Marketing
                </label>
                <input
                  type="text"
                  value={marketingStaffPhone}
                  onChange={(e) => setMarketingStaffPhone(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="0812-4484-2383"
                />
              </div>

              {/* Signer TTD */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Penanda Tangan
                </label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none font-medium"
                  placeholder="Ahmad Fajar Ariyanto"
                />
              </div>

              {/* Signer Role */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jabatan Penanda Tangan
                </label>
                <input
                  type="text"
                  value={directorTitle}
                  onChange={(e) => setDirectorTitle(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Direktur"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN 3: KALKULASI & SIMULASI NEGOSIASI HARGA */}
          <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2CB]/60 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-[#1C658C] flex items-center gap-2 uppercase tracking-wide">
                  <Calculator className="w-4 h-4 text-[#398AB9]" />
                  <span>Kalkulasi Negosiasi Harga Deal (Otomatis)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Target deal rumah sakit akan diproporsionalkan otomatis ke masing-masing item alat
                </p>
              </div>
              <button
                type="button"
                onClick={resetToBrochurePrices}
                className="px-3 py-1 bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 text-xs font-medium rounded-lg border border-[#D8D2CB] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset kembali ke harga katalog standar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Harga Standar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Input Target Deal */}
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Nominal Deal (Ketik angka saja):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs font-bold">Rp</span>
                  <input
                    type="number"
                    value={negotiationTarget === '0' ? '' : negotiationTarget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setNegotiationTarget(raw);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyNegotiation(negotiationTarget);
                      }
                    }}
                    placeholder="Contoh: 15000000"
                    className="w-full bg-[#EEEEEE]/50 border-2 border-[#1C658C] rounded-xl pl-9 pr-4 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1C658C] outline-none"
                  />
                </div>
              </div>

              {/* Mode Negosiasi */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipe Target Kesepakatan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNegotiationType('INCLUDE_PPN');
                      if (negotiationTarget) applyNegotiation(negotiationTarget, 'INCLUDE_PPN');
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      negotiationType === 'INCLUDE_PPN'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-sm font-semibold'
                        : 'bg-[#EEEEEE] text-slate-700 border-[#D8D2CB] hover:bg-[#D8D2CB]/50'
                    }`}
                  >
                    Include PPN 11%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNegotiationType('EXCLUDE_PPN');
                      if (negotiationTarget) applyNegotiation(negotiationTarget, 'EXCLUDE_PPN');
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      negotiationType === 'EXCLUDE_PPN'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-sm font-semibold'
                        : 'bg-[#EEEEEE] text-slate-700 border-[#D8D2CB] hover:bg-[#D8D2CB]/50'
                    }`}
                  >
                    Sebelum PPN (DPP)
                  </button>
                </div>
              </div>

              {/* Tombol Terapkan Negosiasi */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => applyNegotiation()}
                  className="w-full py-2 px-4 bg-[#398AB9] hover:bg-[#2b769f] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Kalkulasi & Nego</span>
                </button>
              </div>

            </div>

            {/* Quick Simulation Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-[#EEEEEE]/60 border border-[#D8D2CB] p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Nilai Awal (Harga Standar):</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatRupiah(subtotalOriginal)}
                </span>
              </div>

              <div className="bg-[#EEEEEE]/60 border border-[#D8D2CB] p-2.5 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Diskon Deal Negosiasi:</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {discountAmount > 0 ? `- ${formatRupiah(discountAmount)} (${discountPercent.toFixed(1)}%)` : '0% (Harga Normal)'}
                </span>
              </div>

              <div className="bg-[#1C658C] text-white border border-[#144966] p-2.5 rounded-xl shadow-xs">
                <span className="text-[#D8D2CB] block text-[11px] font-semibold">Total Deal Akhir (Grand Total):</span>
                <span className="font-mono font-black text-white text-base">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

          </div>

          {/* BAGIAN 4: TABEL RINCIAN ITEM ALAT */}
          <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D2CB]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1C658C] flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>Tabel Item Kalibrasi Alat Kesehatan</span>
                  <span className="text-xs bg-[#EEEEEE] text-slate-700 px-2 py-0.5 rounded-full font-mono border border-[#D8D2CB]">
                    {items.length} Item
                  </span>
                  {sphType === 'ecatalogue' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      E-Catalogue Mode
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {sphType === 'ecatalogue' 
                    ? 'Format Penawaran E-Catalogue LKPP Inaproc (otomatis mencetak Lembar Lampiran Link E-Catalogue)' 
                    : 'Daftar alat sesuai format resmi Lampiran SPH PT. Sarana Multi Kalibrasi'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleItems}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Muat contoh item siap pakai"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Muat Contoh Item</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCatalogTab(sphType === 'ecatalogue' ? 'ecatalogue' : 'brochure');
                    setShowCatalogModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {sphType === 'ecatalogue' ? 'Katalog Inaproc (139 Item)' : 'Katalog Brosur (121 Alat)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEmptyItem}
                  className="px-3 py-1.5 bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 text-xs font-medium rounded-lg border border-[#D8D2CB] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Baris Manual</span>
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-[#D8D2CB] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#00a2e8] text-white border-b border-black font-bold">
                    <th className="px-2 py-2 w-10 text-center border-r border-black/30">No</th>
                    <th className="px-3 py-2 min-w-[220px] border-r border-black/30">Nama Alat / Diskripsi</th>
                    <th className="px-2 py-2 w-16 text-center border-r border-black/30">Qty</th>
                    <th className="px-2 py-2 w-20 text-center border-r border-black/30">Satuan</th>
                    <th className="px-3 py-2 w-32 text-right border-r border-black/30">Harga Satuan (Rp)</th>
                    <th className="px-3 py-2 w-36 text-right border-r border-black/30">Total Harga (Rp)</th>
                    {sphType === 'ecatalogue' && (
                      <th className="px-3 py-2 min-w-[200px] border-r border-black/30">Link E-Catalogue</th>
                    )}
                    <th className="px-2 py-2 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2CB]/60">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                      {/* No */}
                      <td className="px-2 py-2 text-center text-slate-700 font-mono font-semibold border-r border-[#D8D2CB]/40">
                        {index + 1}
                      </td>

                      {/* Deskripsi */}
                      <td className="px-2.5 py-2 border-r border-[#D8D2CB]/40">
                        <textarea
                          rows={Math.max(1, Math.ceil((item.description || '').length / 28))}
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          placeholder="Nama alat kesehatan..."
                          className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none font-medium resize-y min-h-[30px] leading-snug"
                          required
                        />
                      </td>

                      {/* Qty */}
                      <td className="px-2 py-2 text-center border-r border-[#D8D2CB]/40">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === 0 || !item.quantity ? '' : item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = raw === '' ? ('' as any) : parseInt(raw, 10);
                            handleUpdateItem(item.id, 'quantity', val);
                          }}
                          onBlur={() => {
                            if (!item.quantity || Number(item.quantity) < 1) {
                              handleUpdateItem(item.id, 'quantity', 1);
                            }
                          }}
                          placeholder="1"
                          className="w-14 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-1.5 py-1 text-center text-xs font-bold text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                          required
                        />
                      </td>

                      {/* Satuan */}
                      <td className="px-2 py-2 text-center border-r border-[#D8D2CB]/40">
                        <input
                          type="text"
                          value={item.unit || 'Unit'}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          className="w-16 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-1.5 py-1 text-center text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-2.5 py-2 text-right border-r border-[#D8D2CB]/40">
                        <input
                          type="number"
                          value={item.unitPrice === 0 || !item.unitPrice ? '' : item.unitPrice}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            const val = raw === '' ? ('' as any) : parseFloat(raw);
                            handleUpdateItem(item.id, 'unitPrice', val);
                          }}
                          placeholder="0"
                          className="w-28 bg-[#EEEEEE]/50 border border-[#398AB9] rounded px-2 py-1 text-right text-xs font-mono font-bold text-[#1C658C] focus:ring-1 focus:ring-[#1C658C] outline-none"
                          required
                        />
                      </td>

                      {/* Total Price (Otomatis = Qty * Unit Price) */}
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 border-r border-[#D8D2CB]/40">
                        Rp {formatNumber(item.totalPrice)}
                      </td>

                      {/* Link E-Catalogue Column */}
                      {sphType === 'ecatalogue' && (
                        <td className="px-2.5 py-2 border-r border-[#D8D2CB]/40">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.eCatalogueUrl || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'eCatalogueUrl', e.target.value)}
                              placeholder="https://katalog.inaproc.id/..."
                              className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2 py-1 text-[11px] text-blue-700 font-mono focus:ring-1 focus:ring-[#1C658C] outline-none"
                            />
                            {item.eCatalogueUrl && (
                              <a 
                                href={item.eCatalogueUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="Buka Link Produk E-Katalog"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Delete */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Hapus baris alat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ringkasan Biaya & Pajak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Opsi Tambahan (Akomodasi & PPN) */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl">
                  <label className="text-slate-700 font-medium">Biaya Akomodasi & Transportasi (Rp):</label>
                  <input
                    type="number"
                    value={accommodationFee === 0 || !accommodationFee ? '' : accommodationFee}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setAccommodationFee(raw === '' ? ('' as any) : parseFloat(raw));
                    }}
                    className="w-36 bg-white border border-[#D8D2CB] rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-slate-900 outline-none"
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-800 block">Sertakan PPN 11%</span>
                    <span className="text-[11px] text-slate-500">Kalkulasi pajak resmi standar Kemenkeu RI</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPpnIncluded}
                    onChange={(e) => setIsPpnIncluded(e.target.checked)}
                    className="w-4 h-4 text-[#1C658C] rounded border-slate-300 focus:ring-[#1C658C]"
                  />
                </div>

                {/* Terbilang Box */}
                <div className="p-3 bg-white border border-[#D8D2CB] rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-[#1C658C] uppercase tracking-wider block">
                    Terbilang (Angka Huruf):
                  </span>
                  <p className="font-serif italic text-slate-700 text-xs">
                    "{angkaTerbilang(grandTotal)}"
                  </p>
                </div>
              </div>

              {/* Rekapitulasi Angka */}
              <div className="bg-[#EEEEEE]/50 border border-[#D8D2CB] p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total 1 (Subtotal Biaya Kalibrasi):</span>
                  <span className="font-mono font-semibold text-slate-800">Rp {formatNumber(subtotal1)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Akomodasi & Transportasi:</span>
                  <span className="font-mono text-slate-800">Rp {formatNumber(accommodationFee)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Total 2:</span>
                  <span className="font-mono font-semibold text-slate-800">Rp {formatNumber(subtotal2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>{isPpnIncluded ? 'PPN 11%:' : 'PPN 11% (Non-Aktif):'}</span>
                  <span className="font-mono text-slate-800">Rp {formatNumber(ppnAmount)}</span>
                </div>

                <div className="border-t-2 border-[#00a2e8] pt-2 flex justify-between items-center text-sm font-bold text-[#1C658C]">
                  <span className="uppercase">GRAND TOTAL PENAWARAN:</span>
                  <span className="font-mono text-lg font-black text-[#1C658C]">
                    Rp {formatNumber(grandTotal)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Submit & Download Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#D8D2CB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#EEEEEE] text-slate-700 text-xs font-semibold rounded-xl border border-[#D8D2CB] transition-all cursor-pointer"
            >
              Batal
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Menghasilkan PDF Resmi...' : 'Download PDF (Kop Surat Resmi)'}</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#1C658C] hover:bg-[#398AB9] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Surat Penawaran Harga (SPH)</span>
              </button>
            </div>
          </div>

        </form>

        {/* MODAL POPUP: KATALOG ALAT MEDIS (TAB E-CATALOGUE & BROSUR) */}
        {showCatalogModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              
              <div className="px-6 py-4 bg-[#1C658C] text-white border-b border-[#144966] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#EEEEEE]" />
                    <span>Katalog Alat Medis PT. Sarana Multi Kalibrasi</span>
                  </h3>
                  <p className="text-xs text-[#D8D2CB]">
                    Pilih alat dari E-Katalog LKPP Inaproc (139 Item) atau Tarif Brosur Standar (121 Item)
                  </p>
                </div>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Switcher in Catalog Modal */}
              <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setCatalogTab('ecatalogue')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      catalogTab === 'ecatalogue'
                        ? 'bg-[#1C658C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>E-Catalogue Inaproc ({filteredECatalogue.length}/139)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogTab('brochure')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      catalogTab === 'brochure'
                        ? 'bg-[#1C658C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Brosur Standar ({filteredBrochureCatalog.length}/121)</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-4 bg-[#EEEEEE]/50 border-b border-[#D8D2CB] grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari nama alat (misal: Syringe Pump, Sphygmomanometer, Autoclave)..."
                    className="w-full bg-white border border-[#D8D2CB] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    autoFocus
                  />
                </div>
                {catalogTab === 'brochure' && (
                  <div className="sm:col-span-4">
                    <select
                      value={selectedCatalogCategory}
                      onChange={(e) => setSelectedCatalogCategory(e.target.value)}
                      className="w-full bg-white border border-[#D8D2CB] rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    >
                      {brochureCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Catalog Items Grid */}
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#EEEEEE]/20">
                {catalogTab === 'ecatalogue' ? (
                  filteredECatalogue.map(ec => {
                    const cleanName = extractCleanToolName(ec.name);
                    return (
                      <div
                        key={ec.id}
                        onClick={() => handleAddItemFromECatalogue(ec)}
                        className="p-3 bg-white hover:bg-blue-50/60 border border-[#D8D2CB] hover:border-[#1C658C] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="space-y-1 max-w-[75%]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold">
                              #{ec.id}
                            </span>
                            <span className="font-bold text-slate-900 group-hover:text-[#1C658C] transition-colors line-clamp-1">
                              {cleanName}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 line-clamp-1">
                            {ec.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#1C658C] font-mono font-bold">
                              {formatRupiah(ec.price)}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-emerald-700 text-[10px] font-semibold">Inaproc LKPP</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 bg-[#1C658C]/10 group-hover:bg-[#1C658C] text-[#1C658C] group-hover:text-white border border-[#1C658C]/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pilih</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  filteredBrochureCatalog.map(tariff => (
                    <div
                      key={tariff.id}
                      onClick={() => handleAddItemFromBrochure(tariff)}
                      className="p-3 bg-white hover:bg-[#EEEEEE]/60 border border-[#D8D2CB] hover:border-[#398AB9] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                    >
                      <div className="space-y-0.5 max-w-[75%]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] px-1.5 py-0.2 rounded font-mono font-bold">
                            #{tariff.id}
                          </span>
                          <span className="font-semibold text-slate-900 group-hover:text-[#1C658C] transition-colors line-clamp-1">
                            {tariff.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="text-[#1C658C] font-mono font-bold">
                            {formatRupiah(tariff.price)}
                          </span>
                          <span>•</span>
                          <span>{tariff.category}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1 bg-[#1C658C]/10 group-hover:bg-[#1C658C] text-[#1C658C] group-hover:text-white border border-[#1C658C]/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pilih</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="px-6 py-3 bg-[#EEEEEE] border-t border-[#D8D2CB] flex justify-between items-center text-xs text-slate-600">
                <span>
                  Ditemukan {catalogTab === 'ecatalogue' ? filteredECatalogue.length : filteredBrochureCatalog.length} alat medis
                </span>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Selesai Memilih
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
