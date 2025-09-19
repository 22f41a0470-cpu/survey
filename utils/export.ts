
import type { CalculationResult, ProjectDetails, Unit } from '../types';
import { CalculationMethod } from '../types';
import { ACRE_CONVERSION, FORMULA_DETAILS } from '../constants';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

export const generatePdf = (
  projectDetails: ProjectDetails,
  totalArea: number,
  unit: Unit
) => {
  const { jsPDF } = jspdf;
  const reportElement = document.getElementById('report-content');
  if (!reportElement) {
    console.error('Report content element not found');
    return;
  }

  const date = new Date().toLocaleDateString();
  const fileName = `${projectDetails.name || 'Triangle Report'}_${date}.pdf`;

  html2canvas(reportElement, { 
    scale: 2,
    useCORS: true,
    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
  }).then((canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  });
};

const formatInputsForExcel = (result: CalculationResult): string => {
    const { method, inputs } = result;
    switch(method) {
        case CalculationMethod.SSS:
            return `a: ${inputs.a}, b: ${inputs.b}, c: ${inputs.c}`;
        case CalculationMethod.SAS:
            return `Side 1: ${inputs.sideA}, Side 2: ${inputs.sideB}, Angle: ${inputs.angleC}°`;
        case CalculationMethod.ASA:
            return `Angle 1: ${inputs.angleA}°, Angle 2: ${inputs.angleB}°, Side: ${inputs.sideC}`;
        case CalculationMethod.BaseHeight:
            return `Base: ${inputs.base}, Height: ${inputs.height}`;
        case CalculationMethod.Coordinates:
            return `P1:(${inputs.p1x},${inputs.p1y}), P2:(${inputs.p2x},${inputs.p2y}), P3:(${inputs.p3x},${inputs.p3y})`;
        default:
            return '';
    }
}


export const generateExcel = (
  results: CalculationResult[],
  projectDetails: ProjectDetails,
  totalArea: number,
  unit: Unit
) => {
  const totalAcres = totalArea / ACRE_CONVERSION[unit];

  const data = results.map(r => ({
    'Triangle #': r.index + 1,
    'Formula': FORMULA_DETAILS[r.method].name,
    'Inputs': formatInputsForExcel(r),
    'Status': r.isValid ? 'Valid' : 'Invalid',
    [`Area (${unit}²)`]: r.isValid ? r.area.toFixed(3) : 'N/A',
  }));

  const summary = [
    {}, // empty row
    { 'Summary': `Project Name: ${projectDetails.name}`},
    { 'Summary': `Notes: ${projectDetails.notes}`},
    { 'Summary': `Total Area (${unit}²): ${totalArea.toFixed(3)}` },
    { 'Summary': `Total Area (Acres): ${totalAcres.toFixed(5)}` },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.sheet_add_json(ws, summary, { origin: -1, skipHeader: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Triangle Data');
  
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${projectDetails.name || 'Triangle Data'}_${date}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
