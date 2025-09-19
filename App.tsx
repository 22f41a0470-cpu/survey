import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleGenAI, Type } from '@google/genai';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ProjectDetails, Triangle, Unit, CalculationResult, TriangleInputs, Point, ProjectData } from './types';
import { Page, CalculationMethod, AnalysisStep } from './types';
import { calculateTriangleResult } from './utils/calculations';
import { earClippingTriangulation, distance } from './utils/geometry';
import InputView from './components/InputView';
import SummaryView from './components/SummaryView';
import { SunIcon, MoonIcon } from './components/Icons';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('darkMode', false);
  const [page, setPage] = useState<Page>(Page.INPUT);
  
  // Local storage persisted state
  const [projectDetails, setProjectDetails] = useLocalStorage<ProjectDetails>('projectDetails', { name: '', notes: '' });
  const [triangles, setTriangles] = useLocalStorage<Triangle[]>('triangles', []);
  const [unit, setUnit] = useLocalStorage<Unit>('unit', 'ft');
  const [imageDataUrl, setImageDataUrl] = useLocalStorage<string | null>('imageDataUrl', null);
  const [boundaryPoints, setBoundaryPoints] = useLocalStorage<Point[]>('boundaryPoints', []);
  const [scale, setScale] = useLocalStorage<{ pixelLength: number; realLength: number; unit: Unit } | null>('scale', null);
  
  // Transient state
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(AnalysisStep.UPLOAD);
  const [imageDimensions, setImageDimensions] = useState<{w: number, h: number} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  useEffect(() => {
    // Determine initial analysis step based on loaded data
    if (imageDataUrl) {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => setImageDimensions({ w: img.width, h: img.height });
      
      if (triangles.length > 0) {
        setAnalysisStep(AnalysisStep.DONE);
      } else if (boundaryPoints.length > 2) {
        setAnalysisStep(AnalysisStep.DRAWING); // Allow editing
      } else if (scale) {
        setAnalysisStep(AnalysisStep.BOUNDARY_METHOD_CHOICE);
      } else {
        setAnalysisStep(AnalysisStep.SCALING);
      }
    } else {
      setAnalysisStep(AnalysisStep.UPLOAD);
    }
  }, []); // Run only on initial mount


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageDataUrl(url);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImageDimensions({ w: img.width, h: img.height });
        // Reset analysis state for new image
        setScale(null);
        setBoundaryPoints([]);
        setTriangles([]);
        setAnalysisStep(AnalysisStep.SCALING);
      };
    };
    reader.readAsDataURL(file);
  };
  
  const handleFinalizeBoundaries = useCallback(() => {
      if (!scale || boundaryPoints.length < 3 || !imageDimensions) return;
  
      const triangulatedPolygons = earClippingTriangulation(boundaryPoints);
      const conversionFactor = scale.realLength / scale.pixelLength;
  
      const newTriangles = triangulatedPolygons.map((poly, index) => {
          const [p1, p2, p3] = poly;
          const sideA_pixels = distance(p2, p3);
          const sideB_pixels = distance(p1, p3);
          const sideC_pixels = distance(p1, p2);
  
          const sideA_real = (sideA_pixels * conversionFactor).toFixed(2);
          const sideB_real = (sideB_pixels * conversionFactor).toFixed(2);
          const sideC_real = (sideC_pixels * conversionFactor).toFixed(2);
  
          return {
              id: Date.now() + index,
              method: CalculationMethod.SSS,
              inputs: { a: sideA_real, b: sideB_real, c: sideC_real },
          };
      });
      setUnit(scale.unit);
      setTriangles(newTriangles);
      setAnalysisStep(AnalysisStep.DONE);

  }, [scale, boundaryPoints, imageDimensions, setTriangles, setUnit]);

    const handleAiAnalysis = async () => {
    if (!imageDataUrl) {
      alert("No image available for analysis.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const mimeType = imageDataUrl.substring(imageDataUrl.indexOf(":") + 1, imageDataUrl.indexOf(";"));
      const base64Data = imageDataUrl.split(',')[1];
      
      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        },
      };
      
      const textPart = {
        text: `Analyze the provided image showing a plot of land. Identify the main, contiguous plot and return its boundary vertices.

Instructions:
1. The origin (0,0) is the top-left corner.
2. Trace the primary land plot's boundary.
3. Return coordinates as a JSON object containing a 'boundary' key. The value should be an array of objects, each with 'x' and 'y' number properties representing pixel coordinates.
4. Order the points sequentially around the perimeter.
5. Provide only the JSON object in your response.`,
      };

      const responseSchema = {
          type: Type.OBJECT,
          properties: {
              boundary: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          x: { type: Type.NUMBER, description: 'The x-coordinate of the boundary point.' },
                          y: { type: Type.NUMBER, description: 'The y-coordinate of the boundary point.' }
                      },
                      required: ["x", "y"]
                  },
                  description: 'An array of points representing the boundary of the land plot.'
              }
          },
          required: ["boundary"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText);
      
      if (result.boundary && Array.isArray(result.boundary)) {
        const points: Point[] = result.boundary.map((p: any) => ({ x: p.x, y: p.y }));
        if (points.length > 2) {
          setBoundaryPoints(points);
          setAnalysisStep(AnalysisStep.DRAWING); // Go to the editing step
        } else {
          throw new Error("AI returned an invalid polygon (less than 3 points).");
        }
      } else {
        throw new Error("AI response did not match the expected format.");
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
      alert("An error occurred during AI analysis. Please try again or draw the boundaries manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTriangle = () => {
    setTriangles([...triangles, { 
      id: Date.now(), 
      method: CalculationMethod.SSS,
      inputs: { a: '', b: '', c: '' } 
    }]);
  };

  const updateTriangleMethod = (id: number, method: CalculationMethod) => {
    setTriangles(triangles.map(t => t.id === id ? { ...t, method, inputs: {} } : t));
  };

  const updateTriangleInput = (id: number, field: keyof TriangleInputs, value: string) => {
    setTriangles(
      triangles.map((t) => (t.id === id ? { ...t, inputs: { ...t.inputs, [field]: value } } : t))
    );
  };

  const removeTriangle = (id: number) => {
    setTriangles(triangles.filter((t) => t.id !== id));
  };
  
  const resetAllData = useCallback(() => {
    if(window.confirm("Are you sure you want to reset all data? This cannot be undone.")){
        setProjectDetails({ name: '', notes: '' });
        setTriangles([]);
        setUnit('ft');
        setImageDataUrl(null);
        setBoundaryPoints([]);
        setScale(null);
        setImageDimensions(null);
        setAnalysisStep(AnalysisStep.UPLOAD);
        setPage(Page.INPUT);
    }
  }, [setProjectDetails, setTriangles, setUnit, setImageDataUrl, setBoundaryPoints, setScale]);

  const handleExportProject = () => {
      const projectData: ProjectData = {
          projectDetails,
          unit,
          triangles,
          imageDataUrl,
          boundaryPoints,
          scale,
      };
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      const date = new Date().toISOString().split('T')[0];
      link.download = `${projectDetails.name || 'land-area-project'}_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
  };

  const handleImportProject = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const jsonString = event.target?.result as string;
              const data: ProjectData = JSON.parse(jsonString);
              setProjectDetails(data.projectDetails);
              setUnit(data.unit);
              setTriangles(data.triangles);
              setImageDataUrl(data.imageDataUrl);
              setBoundaryPoints(data.boundaryPoints || []);
              setScale(data.scale || null);

              if (data.imageDataUrl) {
                  const img = new Image();
                  img.src = data.imageDataUrl;
                  img.onload = () => {
                      setImageDimensions({ w: img.width, h: img.height });
                       if (data.triangles.length > 0) {
                          setAnalysisStep(AnalysisStep.DONE);
                      } else if (data.boundaryPoints && data.boundaryPoints.length > 2) {
                          setAnalysisStep(AnalysisStep.DRAWING);
                      } else if (data.scale) {
                          setAnalysisStep(AnalysisStep.BOUNDARY_METHOD_CHOICE);
                      } else {
                          setAnalysisStep(AnalysisStep.SCALING);
                      }
                  }
              } else {
                  setAnalysisStep(AnalysisStep.UPLOAD);
              }
              setPage(Page.INPUT);
          } catch (error) {
              alert('Error importing project file. It may be corrupted.');
              console.error(error);
          }
      };
      reader.readAsText(file);
  };


  const calculationResults: CalculationResult[] = useMemo(() => {
    return triangles.map((triangle, index) => calculateTriangleResult(triangle, unit, index));
  }, [triangles, unit]);
  
  const areAllCalculationsValid = useMemo(() => {
      if (triangles.length === 0) return false;
      return calculationResults.every(r => r.isValid);
  }, [calculationResults, triangles]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="absolute top-4 right-4 z-50">
          <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
          >
              {darkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-gray-700" />}
          </button>
      </div>
      <main className="container mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {page === Page.INPUT && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
            >
              <InputView
                projectDetails={projectDetails}
                setProjectDetails={setProjectDetails}
                imageDataUrl={imageDataUrl}
                handleImageUpload={handleImageUpload}
                unit={unit}
                setUnit={setUnit}
                triangles={triangles}
                updateTriangleInput={updateTriangleInput}
                updateTriangleMethod={updateTriangleMethod}
                addTriangle={addTriangle}
                removeTriangle={removeTriangle}
                onCalculate={() => setPage(Page.SUMMARY)}
                onReset={resetAllData}
                calculationResults={calculationResults}
                areAllCalculationsValid={areAllCalculationsValid}
                analysisStep={analysisStep}
                setAnalysisStep={setAnalysisStep}
                boundaryPoints={boundaryPoints}
                setBoundaryPoints={setBoundaryPoints}
                scale={scale}
                setScale={setScale}
                imageDimensions={imageDimensions}
                onFinalizeBoundaries={handleFinalizeBoundaries}
                onImportProject={handleImportProject}
                onExportProject={handleExportProject}
                isAnalyzing={isAnalyzing}
                onAiAnalyze={handleAiAnalysis}
              />
            </motion.div>
          )}

          {page === Page.SUMMARY && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <SummaryView
                projectDetails={projectDetails}
                imageDataUrl={imageDataUrl}
                unit={unit}
                results={calculationResults}
                onBack={() => setPage(Page.INPUT)}
                boundaryPoints={boundaryPoints}
                imageDimensions={imageDimensions}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;