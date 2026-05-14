import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExportButton({ data }) {
  const handleExport = () => {
    if (!data || data.length === 0) return alert('No hay datos para exportar.');

    const dataToExport = data.map(({ id, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    const wscols = [
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pólizas");

    XLSX.writeFile(wb, `Polizas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 bg-white/60 hover:bg-white text-apple-600 font-medium text-[14px] py-1.5 px-3 rounded-full border border-border transition-all shadow-sm focus-ring backdrop-blur-md"
    >
      <Download size={15} className="text-apple-500" strokeWidth={2} />
      <span>Descargar CSV</span>
    </button>
  );
}
