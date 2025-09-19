import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { AnalysisStep } from '../types';
import type { Point, Unit } from '../types';
import { UNITS } from '../constants';
import { AIIcon } from './Icons';
import { distance } from '../utils/geometry';


interface ImageAnalysisProps {
  imageDataUrl: string;
  imageDimensions: { w: number; h: number };
  step: AnalysisStep;
  setStep: (step: AnalysisStep) => void;
  points: Point[];
  setPoints: (points: Point[]) => void;
  scale: { pixelLength: number; realLength: number; unit: Unit } | null;
  setScale: (scale: { pixelLength: number; realLength: number; unit: Unit } | null) => void;
  onFinalize: () => void;
  isAnalyzing: boolean;
  onAiAnalyze: () => void;
}

const ImageAnalysis: React.FC<ImageAnalysisProps> = ({
  imageDataUrl, imageDimensions, step, setStep, points, setPoints, scale, setScale, onFinalize, isAnalyzing, onAiAnalyze
}) => {
  const [scalePoints, setScalePoints] = useState<[Point, Point] | null>(null);
  const [tempScalePoint, setTempScalePoint] = useState<Point | null>(null);
  const [scaleInputValue, setScaleInputValue] = useState<string>('');
  const [scaleInputUnit, setScaleInputUnit] = useState<Unit>('ft');
  const svgRef = useRef<SVGSVGElement>(null);

  // Fix: Corrected function signature to be compatible with both React and native DOM events.
  // This resolves the type inference issue with the `useDrag` hook.
  const getSVGPoint = (e: { clientX: number; clientY: number }): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    // Fix: Added a null check for getScreenCTM() to prevent potential runtime errors.
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: 0, y: 0 };
  };

  const handleSVGClick = (e: React.MouseEvent) => {
    const pt = getSVGPoint(e);
    if (step === AnalysisStep.SCALING) {
      if (!tempScalePoint) {
        setTempScalePoint(pt);
      } else {
        setScalePoints([tempScalePoint, pt]);
        setTempScalePoint(null);
      }
    } else if (step === AnalysisStep.DRAWING) {
      setPoints([...points, pt]);
    }
  };
  
  const handleSetScale = () => {
    if (scalePoints && scaleInputValue) {
      const realLength = parseFloat(scaleInputValue);
      if (realLength > 0) {
        setScale({
          pixelLength: distance(scalePoints[0], scalePoints[1]),
          realLength,
          unit: scaleInputUnit,
        });
        setStep(AnalysisStep.BOUNDARY_METHOD_CHOICE);
      }
    }
  };

  // Fix: Corrected the useDrag handler to use normalized coordinates from the gesture state,
  // resolving type errors with different event types (e.g., TouchEvent) and fixing call signature errors.
  const bind = useDrag(({ args: [index], active, event, xy }) => {
    event.stopPropagation();
    if (active) {
      const { x, y } = getSVGPoint({ clientX: xy[0], clientY: xy[1] });
      const newPoints = [...points];
      newPoints[index] = { x, y };
      setPoints(newPoints);
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md">
        <h3 className="font-semibold text-lg text-blue-800 dark:text-blue-200">
          Step {step === AnalysisStep.SCALING ? '1' : '2'}: 
          {step === AnalysisStep.SCALING && ' Set Scale'}
          {step === AnalysisStep.BOUNDARY_METHOD_CHOICE && ' Define Boundaries'}
          {step === AnalysisStep.DRAWING && ' Edit Boundaries'}
        </h3>
        <p className="text-sm text-blue-600 dark:text-blue-300">
           {step === AnalysisStep.SCALING 
             && 'Click two points on the image to define a known distance (e.g., a fence line).'}
           {step === AnalysisStep.BOUNDARY_METHOD_CHOICE
              && 'Use Gemini AI to detect the plot boundaries automatically, or draw them yourself.'}
            {step === AnalysisStep.DRAWING
                && 'Click to add points, or drag existing points to refine the AI-generated or manual boundary.'}
        </p>
      </div>

      <div className="relative w-full aspect-w-4 aspect-h-3">
        <img src={imageDataUrl} className="w-full h-auto rounded-lg" alt="Analysis subject" />
        <svg
          ref={svgRef}
          className="absolute top-0 left-0 w-full h-full"
          viewBox={`0 0 ${imageDimensions.w} ${imageDimensions.h}`}
          onClick={handleSVGClick}
        >
          {/* Drawing Boundaries */}
          {points.length > 0 && (
            <polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="rgba(29, 78, 216, 0.3)"
              stroke="rgba(37, 99, 235, 1)"
              strokeWidth="2"
              strokeDasharray={step === AnalysisStep.DRAWING && points.length < 3 ? "5,5" : ""}
            />
          )}
          {step === AnalysisStep.DRAWING && points.map((p, i) => (
            <circle
              {...bind(i)}
              key={i}
              cx={p.x}
              cy={p.y}
              r="8"
              fill="white"
              stroke="#2563eb"
              strokeWidth="2"
              className="cursor-move"
            />
          ))}

          {/* Setting Scale */}
          {tempScalePoint && (
              <circle cx={tempScalePoint.x} cy={tempScalePoint.y} r="5" fill="rgba(220, 38, 38, 0.8)" />
          )}
          {scalePoints && (
            <>
              <line x1={scalePoints[0].x} y1={scalePoints[0].y} x2={scalePoints[1].x} y2={scalePoints[1].y} stroke="rgba(220, 38, 38, 1)" strokeWidth="3" strokeDasharray="5,5" />
              <circle cx={scalePoints[0].x} cy={scalePoints[0].y} r="5" fill="rgba(220, 38, 38, 1)" />
              <circle cx={scalePoints[1].x} cy={scalePoints[1].y} r="5" fill="rgba(220, 38, 38, 1)" />
            </>
          )}
        </svg>
      </div>
      
      {step === AnalysisStep.SCALING && scalePoints && (
          <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <label htmlFor="scale-input" className="font-semibold whitespace-nowrap">Distance:</label>
            <input
              id="scale-input"
              type="text"
              inputMode="decimal"
              value={scaleInputValue}
              onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setScaleInputValue(e.target.value)}
              className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., 50"
            />
            <select
                value={scaleInputUnit}
                onChange={(e) => setScaleInputUnit(e.target.value as Unit)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
            >
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <button onClick={handleSetScale} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors">Set Scale</button>
          </div>
      )}
      
      {step === AnalysisStep.BOUNDARY_METHOD_CHOICE && (
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md space-y-3">
            <div className="flex flex-col sm:flex-row gap-4">
                <button 
                    onClick={onAiAnalyze} 
                    disabled={isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-md font-semibold transition-colors hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-wait"
                >
                    {isAnalyzing ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : (
                        <><AIIcon className="w-5 h-5" /> Analyze with Gemini AI</>
                    )}
                </button>
                <button 
                    onClick={() => setStep(AnalysisStep.DRAWING)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-gray-600 text-white rounded-md font-semibold transition-colors hover:bg-gray-700"
                >
                    Draw Manually
                </button>
            </div>
        </div>
      )}


      {step === AnalysisStep.DRAWING && (
        <button
          onClick={onFinalize}
          disabled={points.length < 3}
          className="w-full flex items-center justify-center gap-2 p-3 bg-teal-600 text-white rounded-md font-semibold transition-colors hover:bg-teal-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Finalize Boundaries & Triangulate
        </button>
      )}
    </div>
  );
};

export default ImageAnalysis;