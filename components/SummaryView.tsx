import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CalculationResult, ProjectDetails, Unit, Point } from '../types';
import { CalculationMethod } from '../types';
import { ACRE_CONVERSION, FORMULA_DETAILS } from '../constants';
import { generatePdf, generateExcel } from '../utils/export';
import { ArrowUturnLeftIcon, DocumentArrowDownIcon } from './Icons';
import { earClippingTriangulation } from '../utils/geometry';


interface SummaryViewProps {
  projectDetails: ProjectDetails;
  imageDataUrl: string | null;
  unit: Unit;
  results: CalculationResult[];
  onBack: () => void;
  boundaryPoints: Point[];
  imageDimensions: { w: number; h: number } | null;
}

const SummaryCard: React.FC<{ title: string; value: string; subValue?: string; className?: string }> = ({ title, value, subValue, className = '' }) => (
    <div className={`bg-white dark:bg-gray-700/50 p-4 rounded-lg shadow-md text-center ${className}`}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>}
    </div>
);

const formatInputs = (result: CalculationResult): string => {
    const { method, inputs } = result;
    const format = (val: string | undefined) => val || '?';

    switch(method) {
        case CalculationMethod.SSS:
            return `a: ${format(inputs.a)}, b: ${format(inputs.b)}, c: ${format(inputs.c)}`;
        case CalculationMethod.SAS:
            return `s1: ${format(inputs.sideA)}, s2: ${format(inputs.sideB)}, ∠: ${format(inputs.angleC)}°`;
        case CalculationMethod.ASA:
            return `∠A: ${format(inputs.angleA)}°, ∠B: ${format(inputs.angleB)}°, s: ${format(inputs.sideC)}`;
        case CalculationMethod.BaseHeight:
            return `b: ${format(inputs.base)}, h: ${format(inputs.height)}`;
        case CalculationMethod.Coordinates:
            return `(${format(inputs.p1x)},${format(inputs.p1y)}), (${format(inputs.p2x)},${format(inputs.p2y)}), (${format(inputs.p3x)},${format(inputs.p3y)})`;
        default:
            return 'N/A';
    }
};

const SummaryView: React.FC<SummaryViewProps> = ({
  projectDetails,
  imageDataUrl,
  unit,
  results,
  onBack,
  boundaryPoints,
  imageDimensions,
}) => {
  const { totalArea, totalAcres, smallest, largest } = useMemo(() => {
    const validResults = results.filter(r => r.isValid);
    if (validResults.length === 0) {
        return { totalArea: 0, totalAcres: 0, smallest: null, largest: null };
    }
    
    const totalArea = validResults.reduce((sum, r) => sum + r.area, 0);
    const totalAcres = totalArea / ACRE_CONVERSION[unit];

    const smallest = validResults.reduce((min, r) => r.area < min.area ? r : min, validResults[0]);
    const largest = validResults.reduce((max, r) => r.area > max.area ? r : max, validResults[0]);
    
    return { totalArea, totalAcres, smallest, largest };
  }, [results, unit]);

  const triangulatedPolygons = useMemo(() => {
      if(boundaryPoints.length < 3) return [];
      return earClippingTriangulation(boundaryPoints);
  }, [boundaryPoints]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Calculation Summary</h1>
        <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                <ArrowUturnLeftIcon className="w-5 h-5"/> Back & Edit
            </button>
        </div>
      </header>

      <div id="report-content" className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="border-b-2 border-gray-200 dark:border-gray-700 pb-4 mb-8">
            <h2 className="text-3xl font-bold">{projectDetails.name || "Untitled Project"}</h2>
            <p className="text-gray-500 dark:text-gray-400">Report generated on {new Date().toLocaleDateString()}</p>
            {projectDetails.notes && <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{projectDetails.notes}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <SummaryCard title="Total Triangles" value={results.length.toString()} subValue={`${results.filter(r => r.isValid).length} valid`} />
            <SummaryCard title={`Total Area (${unit}²)`} value={totalArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
            <SummaryCard title="Total Acres" value={totalAcres.toLocaleString(undefined, { maximumFractionDigits: 5 })} />
        </div>
        
        {imageDataUrl && imageDimensions && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div>
                <h3 className="text-xl font-semibold mb-2">Boundary Overlay</h3>
                <div className="relative w-full mx-auto rounded-lg shadow-lg overflow-hidden">
                    <img src={imageDataUrl} alt="Project" className="w-full h-auto" />
                    <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${imageDimensions.w} ${imageDimensions.h}`} preserveAspectRatio="none">
                         <polygon points={boundaryPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(29, 78, 216, 0.3)" stroke="rgba(37, 99, 235, 0.8)" strokeWidth="2" />
                    </svg>
                </div>
             </div>
             <div>
                <h3 className="text-xl font-semibold mb-2">Triangulated Diagram</h3>
                <div className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner">
                    <svg className="w-full h-auto" viewBox={`0 0 ${imageDimensions.w} ${imageDimensions.h}`}>
                        {triangulatedPolygons.map((poly, i) => (
                             <polygon key={i} points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(13, 148, 136, 0.2)" stroke="rgba(15, 118, 110, 1)" strokeWidth="2" />
                        ))}
                    </svg>
                </div>
             </div>
          </div>
        )}

        <div>
            <h3 className="text-xl font-semibold mb-4">Triangle Details</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Formula Used</th>
                            <th className="p-3">Inputs ({unit})</th>
                            <th className="p-3">Area ({unit}²)</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(r => (
                            <motion.tr 
                                key={r.id}
                                className={`border-b dark:border-gray-700 
                                  ${r.id === largest?.id ? 'bg-green-100 dark:bg-green-900/50' : ''}
                                  ${r.id === smallest?.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`
                                }
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: r.index * 0.05 }}
                            >
                                <td className="p-3 font-mono">{r.index + 1}</td>
                                <td className="p-3">{FORMULA_DETAILS[r.method].name}</td>
                                <td className="p-3 font-mono text-xs">{formatInputs(r)}</td>
                                <td className="p-3 font-mono">{r.isValid ? r.area.toFixed(3) : 'N/A'}</td>
                                <td className="p-3">
                                    {r.isValid ? 
                                        <span className="text-green-600 dark:text-green-400">✅ Valid</span> : 
                                        <span className="text-red-600 dark:text-red-400">❌ Invalid</span>
                                    }
                                    {r.id === largest?.id && <span className="ml-2 text-xs text-green-700 dark:text-green-300">(Largest)</span>}
                                    {r.id === smallest?.id && <span className="ml-2 text-xs text-blue-700 dark:text-blue-300">(Smallest)</span>}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button onClick={() => generateExcel(results, projectDetails, totalArea, unit)} className="flex items-center justify-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md font-semibold hover:bg-green-200 dark:hover:bg-green-900/80 transition-colors">
                <DocumentArrowDownIcon className="w-5 h-5"/> Download Excel
            </button>
            <button onClick={() => generatePdf(projectDetails, totalArea, unit)} className="flex items-center justify-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md font-semibold hover:bg-red-200 dark:hover:bg-red-900/80 transition-colors">
                <DocumentArrowDownIcon className="w-5 h-5"/> Download PDF
            </button>
        </div>
    </div>
  );
};

export default SummaryView;
