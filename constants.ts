
import type { Unit } from './types';
import { CalculationMethod } from './types';

export const UNITS: { value: Unit; label: string }[] = [
  { value: 'ft', label: 'Feet' },
  { value: 'in', label: 'Inches' },
  { value: 'm', label: 'Meters' },
];

export const CONVERSION_FACTORS = {
  // To meters
  m: 1,
  ft: 0.3048,
  in: 0.0254,
};

export const ACRE_CONVERSION = {
  // 1 acre in X
  m: 4046.856,
  ft: 43560,
  in: 6272640,
};

export const FORMULA_DETAILS: Record<CalculationMethod, { name: string; formula: string; }> = {
  [CalculationMethod.SSS]: {
    name: "Sides (Heron's)",
    formula: "√s(s-a)(s-b)(s-c)",
  },
  [CalculationMethod.SAS]: {
    name: "Side-Angle-Side",
    formula: "½ ab sin(C)",
  },
  [CalculationMethod.ASA]: {
    name: "Angle-Side-Angle",
    formula: "a² sin(B)sin(C) / 2sin(B+C)",
  },
  [CalculationMethod.BaseHeight]: {
    name: "Base & Height",
    formula: "½ × base × height",
  },
  [CalculationMethod.Coordinates]: {
    name: "Coordinates (Shoelace)",
    formula: "½ |x₁(y₂-y₃) + x₂(y₃-y₁) + x₃(y₁-y₂)|",
  },
};
