import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectDetails, Triangle, Unit, CalculationResult, TriangleInputs, Point } from '../types';
import { CalculationMethod, AnalysisStep } from '../types';
import { UNITS } from '../constants';
import TriangleInput from './TriangleInput';
import ImageAnalysis from './ImageAnalysis';
import { CameraIcon, DocumentPlusIcon, TrashIcon, CalculatorIcon, UploadIcon, DownloadIcon } from './Icons';

interface InputViewProps {
  projectDetails: ProjectDetails;
  setProjectDetails: (details: ProjectDetails) => void;
  imageDataUrl: string | null;
  handleImageUpload: (file: File) => void;
  unit: Unit;
  setUnit: (unit: Unit) => void;
  triangles: Triangle[];
  updateTriangleInput: (id: number, field: keyof TriangleInputs, value: string) => void;
  updateTriangleMethod: (id: number, method: CalculationMethod) => void;
  addTriangle: () => void;
  removeTriangle: (id: number) => void;
  onCalculate: () => void;
  onReset: () => void;
  calculationResults: CalculationResult[];
  areAllCalculationsValid: boolean;
  analysisStep: AnalysisStep;
  setAnalysisStep: (step: AnalysisStep) => void;
  boundaryPoints: Point[];
  setBoundaryPoints: (points: Point[]) => void;
  scale: { pixelLength: number; realLength: number; unit: Unit } | null;
  setScale: (scale: { pixelLength: number; realLength: number; unit: Unit } | null) => void;
  imageDimensions: { w: number; h: number } | null;
  onFinalizeBoundaries: () => void;
  onImportProject: (file: File) => void;
  onExportProject: () => void;
  isAnalyzing: boolean;
  onAiAnalyze: () => void;
}

const InputView: React.FC<InputViewProps> = (props) => {
  const {
    projectDetails, setProjectDetails, imageDataUrl, handleImageUpload,
    unit, setUnit, triangles, updateTriangleInput, updateTriangleMethod,
    addTriangle, removeTriangle, onCalculate, onReset, calculationResults,
    areAllCalculationsValid, analysisStep, setAnalysisStep, boundaryPoints, setBoundaryPoints,
    scale, setScale, imageDimensions, onFinalizeBoundaries,
    onImportProject, onExportProject, isAnalyzing, onAiAnalyze
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportProject(e.target.files[0]);
    }
  };
  
  const renderAnalysisStep = () => {
    if (!imageDataUrl || !imageDimensions) {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col justify-center">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 dark:border-gray-600">Start by Uploading an Image</h2>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <CameraIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"/>
            <span className="mt-2 block text-sm font-medium text-gray-600 dark:text-gray-400">Upload Land Plot Image</span>
          </button>
        </div>
      );
    }
    
    if (analysisStep === AnalysisStep.SCALING || analysisStep === AnalysisStep.DRAWING || analysisStep === AnalysisStep.BOUNDARY_METHOD_CHOICE) {
      return (
        <ImageAnalysis
          imageDataUrl={imageDataUrl}
          imageDimensions={imageDimensions}
          step={analysisStep}
          setStep={setAnalysisStep}
          points={boundaryPoints}
          setPoints={setBoundaryPoints}
          scale={scale}
          setScale={setScale}
          onFinalize={onFinalizeBoundaries}
          isAnalyzing={isAnalyzing}
          onAiAnalyze={onAiAnalyze}
        />
      );
    }

    if (analysisStep === AnalysisStep.DONE) {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-600">
            <h2 className="text-2xl font-semibold">Triangulation Results</h2>
            <div className="relative">
              <span className="font-semibold">{UNITS.find(u => u.value === unit)?.label}</span>
            </div>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            <AnimatePresence>
              {triangles.map((triangle, index) => {
                 const result = calculationResults.find(r => r.id === triangle.id);
                 return (
                  <motion.div
                      key={triangle.id}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                  >
                      <TriangleInput
                          triangle={triangle}
                          index={index}
                          unit={unit}
                          updateTriangleInput={updateTriangleInput}
                          updateTriangleMethod={updateTriangleMethod}
                          removeTriangle={removeTriangle}
                          isValid={result?.isValid ?? false}
                          isReadOnly={true}
                      />
                  </motion.div>
              )})}
            </AnimatePresence>
          </div>
           <button onClick={addTriangle} className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/80 rounded-md font-semibold transition-colors">
              <DocumentPlusIcon className="w-5 h-5"/>
              Add Manual Triangle
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">Land Area CV Calculator</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Measure land plots from images with precision.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Project Info & Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6 lg:sticky lg:top-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2 dark:border-gray-600">Project Details</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Project Name"
                value={projectDetails.name}
                onChange={(e) => setProjectDetails({ ...projectDetails, name: e.target.value })}
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <textarea
                placeholder="Optional Notes"
                value={projectDetails.notes}
                onChange={(e) => setProjectDetails({ ...projectDetails, notes: e.target.value })}
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-2xl font-semibold mb-2 border-b pb-2 dark:border-gray-600">Project Actions</h2>
             <div className="flex flex-col sm:flex-row gap-4">
               <input type="file" accept=".json" ref={importFileRef} onChange={handleImportFileChange} className="hidden" />
               <button onClick={() => importFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/80 rounded-md font-semibold transition-colors">
                  <UploadIcon className="w-5 h-5"/> Import Project
               </button>
               <button onClick={onExportProject} className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-semibold transition-colors">
                  <DownloadIcon className="w-5 h-5"/> Export Project
               </button>
            </div>
             <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/80 rounded-md font-semibold transition-colors">
                <TrashIcon className="w-5 h-5"/> Reset All
            </button>
          </div>
        </motion.div>

        {/* Right Column: CV Analysis or Triangle Inputs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            {renderAnalysisStep()}
            
             <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onCalculate}
                  disabled={!areAllCalculationsValid}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-md font-semibold transition-colors hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <CalculatorIcon className="w-5 h-5"/>
                  Calculate & View Summary
                </button>
            </div>
            {!areAllCalculationsValid && triangles.length > 0 && <p className="text-center text-sm text-yellow-600 dark:text-yellow-400">Please ensure all triangles have valid inputs to proceed.</p>}
        </motion.div>
      </div>
    </div>
  );
};

export default InputView;