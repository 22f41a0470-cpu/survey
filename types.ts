export type Unit = 'in' | 'ft' | 'm';

export enum CalculationMethod {
  SSS = 'SSS', // 3 Sides (Heron's)
  SAS = 'SAS', // 2 Sides, 1 Included Angle
  ASA = 'ASA', // 2 Angles, 1 Included Side
  BaseHeight = 'BaseHeight',
  Coordinates = 'Coordinates', // Shoelace Formula
}

export type TriangleInputs = {
  // SSS
  a?: string;
  b?: string;
  c?: string;
  // SAS
  sideA?: string;
  sideB?: string;
  angleC?: string;
  // ASA
  angleA?: string;
  angleB?: string;
  sideC?: string;
  // BaseHeight
  base?: string;
  height?: string;
  // Coordinates
  p1x?: string; p1y?: string;
  p2x?: string; p2y?: string;
  p3x?: string; p3y?: string;
};


export interface Triangle {
  id: number;
  method: CalculationMethod;
  inputs: TriangleInputs;
}

export interface ProjectDetails {
  name: string;
  notes: string;
}

export interface CalculationResult {
  id: number;
  index: number;
  method: CalculationMethod;
  inputs: TriangleInputs;
  area: number;
  isValid: boolean;
  areaInMeters: number;
}

export enum Page {
  INPUT = 'input',
  SUMMARY = 'summary',
}

export type Point = { x: number; y: number };

export enum AnalysisStep {
  UPLOAD = 'UPLOAD',
  SCALING = 'SCALING',
  BOUNDARY_METHOD_CHOICE = 'BOUNDARY_METHOD_CHOICE',
  DRAWING = 'DRAWING',
  DONE = 'DONE',
}

export interface ProjectData {
  projectDetails: ProjectDetails;
  unit: Unit;
  triangles: Triangle[];
  imageDataUrl: string | null;
  boundaryPoints: Point[];
  scale: { pixelLength: number; realLength: number; unit: Unit } | null;
}