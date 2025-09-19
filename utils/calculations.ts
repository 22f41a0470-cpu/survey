
import type { Unit, Triangle, CalculationResult } from '../types';
import { CalculationMethod } from '../types';
import { CONVERSION_FACTORS } from '../constants';

// Helper to convert degrees to radians
const degToRad = (degrees: number): number => degrees * (Math.PI / 180);

// --- Validation Functions ---
const isSSSValid = (a: number, b: number, c: number): boolean => {
  if (a <= 0 || b <= 0 || c <= 0) return false;
  return a + b > c && a + c > b && b + c > a;
};
const isSASValid = (sideA: number, sideB: number, angleC: number): boolean => {
    return sideA > 0 && sideB > 0 && angleC > 0 && angleC < 180;
};
const isASAValid = (angleA: number, angleB: number, sideC: number): boolean => {
    return angleA > 0 && angleB > 0 && sideC > 0 && (angleA + angleB < 180);
};
const isBaseHeightValid = (base: number, height: number): boolean => {
    return base > 0 && height > 0;
};
const areCoordinatesValid = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): boolean => {
    // Check for collinearity by calculating the area. If area is ~0, they are on a line.
    const area = 0.5 * Math.abs(p1x * (p2y - p3y) + p2x * (p3y - p1y) + p3x * (p1y - p2y));
    return area > 1e-9; // Use a small epsilon to handle floating point inaccuracies
};


// --- Area Calculation Functions (in provided units) ---
const calculateAreaSSS = (a: number, b: number, c: number): number => {
  if (!isSSSValid(a, b, c)) return 0;
  const s = (a + b + c) / 2;
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
};
const calculateAreaSAS = (sideA: number, sideB: number, angleC: number): number => {
    if(!isSASValid(sideA, sideB, angleC)) return 0;
    return 0.5 * sideA * sideB * Math.sin(degToRad(angleC));
};
const calculateAreaASA = (angleA: number, angleB: number, sideC: number): number => {
    if(!isASAValid(angleA, angleB, sideC)) return 0;
    const angleC = 180 - angleA - angleB;
    const sideA = (sideC * Math.sin(degToRad(angleA))) / Math.sin(degToRad(angleC));
    return 0.5 * sideA * sideC * Math.sin(degToRad(angleB));
};
const calculateAreaBaseHeight = (base: number, height: number): number => {
    if(!isBaseHeightValid(base, height)) return 0;
    return 0.5 * base * height;
};
const calculateAreaCoordinates = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): number => {
    if (!areCoordinatesValid(p1x, p1y, p2x, p2y, p3x, p3y)) return 0;
    return 0.5 * Math.abs(p1x * (p2y - p3y) + p2x * (p3y - p1y) + p3x * (p1y - p2y));
};

// --- Master Dispatcher Function ---
export const calculateTriangleResult = (triangle: Triangle, unit: Unit, index: number): CalculationResult => {
    const { id, method, inputs } = triangle;
    let area = 0;
    let isValid = false;
    let areaInMeters = 0;
    
    const factor = CONVERSION_FACTORS[unit];

    switch (method) {
        case CalculationMethod.SSS: {
            const a = parseFloat(inputs.a || '0');
            const b = parseFloat(inputs.b || '0');
            const c = parseFloat(inputs.c || '0');
            isValid = isSSSValid(a, b, c);
            if (isValid) {
                area = calculateAreaSSS(a, b, c);
                areaInMeters = calculateAreaSSS(a * factor, b * factor, c * factor);
            }
            break;
        }
        case CalculationMethod.SAS: {
            const sideA = parseFloat(inputs.sideA || '0');
            const sideB = parseFloat(inputs.sideB || '0');
            const angleC = parseFloat(inputs.angleC || '0');
            isValid = isSASValid(sideA, sideB, angleC);
            if (isValid) {
                area = calculateAreaSAS(sideA, sideB, angleC);
                // Area scales by factor^2 for length inputs
                areaInMeters = area * factor * factor;
            }
            break;
        }
        case CalculationMethod.ASA: {
            const angleA = parseFloat(inputs.angleA || '0');
            const angleB = parseFloat(inputs.angleB || '0');
            const sideC = parseFloat(inputs.sideC || '0');
            isValid = isASAValid(angleA, angleB, sideC);
            if(isValid){
                area = calculateAreaASA(angleA, angleB, sideC);
                areaInMeters = area * factor * factor;
            }
            break;
        }
        case CalculationMethod.BaseHeight: {
            const base = parseFloat(inputs.base || '0');
            const height = parseFloat(inputs.height || '0');
            isValid = isBaseHeightValid(base, height);
            if(isValid){
                area = calculateAreaBaseHeight(base, height);
                areaInMeters = area * factor * factor;
            }
            break;
        }
        case CalculationMethod.Coordinates: {
            const p1x = parseFloat(inputs.p1x || '0');
            const p1y = parseFloat(inputs.p1y || '0');
            const p2x = parseFloat(inputs.p2x || '0');
            const p2y = parseFloat(inputs.p2y || '0');
            const p3x = parseFloat(inputs.p3x || '0');
            const p3y = parseFloat(inputs.p3y || '0');
            isValid = areCoordinatesValid(p1x, p1y, p2x, p2y, p3x, p3y);
             if(isValid){
                area = calculateAreaCoordinates(p1x, p1y, p2x, p2y, p3x, p3y);
                areaInMeters = area * factor * factor;
            }
            break;
        }
    }

    return {
        id,
        index,
        method,
        inputs,
        area,
        isValid,
        areaInMeters
    };
};

export const convertArea = (areaInMeters: number, fromUnit: Unit, toUnit: Unit): number => {
    if (fromUnit === toUnit) return areaInMeters;
    const fromFactor = CONVERSION_FACTORS[fromUnit];
    const toFactor = CONVERSION_FACTORS[toUnit];
    return areaInMeters * (fromFactor / toFactor) * (fromFactor / toFactor);
}
