import React from 'react';
import type { Triangle, Unit, TriangleInputs } from '../types';
import { CalculationMethod } from '../types';
import { FORMULA_DETAILS } from '../constants';
import { TrashIcon } from './Icons';

interface TriangleInputProps {
  triangle: Triangle;
  index: number;
  unit: Unit;
  updateTriangleInput: (id: number, field: keyof TriangleInputs, value: string) => void;
  updateTriangleMethod: (id: number, method: CalculationMethod) => void;
  removeTriangle: (id: number) => void;
  isValid: boolean;
  isReadOnly?: boolean;
}

const InputField: React.FC<{
    placeholder: string;
    value: string | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    isReadOnly?: boolean;
}> = ({ placeholder, value, onChange, className = '', isReadOnly = false }) => (
    <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        readOnly={isReadOnly}
        className={`w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-center focus:ring-2 focus:ring-blue-500 outline-none ${className} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
    />
);


const TriangleInput: React.FC<TriangleInputProps> = ({ triangle, index, unit, updateTriangleInput, updateTriangleMethod, removeTriangle, isValid, isReadOnly = false }) => {
  
  const handleInputChange = (field: keyof TriangleInputs, value: string) => {
    if (isReadOnly) return;
    // Allow numbers, single decimal, and negative sign for coordinates
    if (/^-?\d*\.?\d*$/.test(value)) {
      updateTriangleInput(triangle.id, field, value);
    }
  };

  const renderInputs = () => {
      const { inputs } = triangle;
      switch (triangle.method) {
          case CalculationMethod.SSS:
              return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <InputField placeholder={`a (${unit})`} value={inputs.a} onChange={e => handleInputChange('a', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={`b (${unit})`} value={inputs.b} onChange={e => handleInputChange('b', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={`c (${unit})`} value={inputs.c} onChange={e => handleInputChange('c', e.target.value)} isReadOnly={isReadOnly} />
                  </div>
              );
          case CalculationMethod.SAS:
              return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <InputField placeholder={`Side 1 (${unit})`} value={inputs.sideA} onChange={e => handleInputChange('sideA', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={`Side 2 (${unit})`} value={inputs.sideB} onChange={e => handleInputChange('sideB', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={'Angle (°)'} value={inputs.angleC} onChange={e => handleInputChange('angleC', e.target.value)} isReadOnly={isReadOnly} />
                  </div>
              );
          case CalculationMethod.ASA:
              return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <InputField placeholder={'Angle 1 (°)'} value={inputs.angleA} onChange={e => handleInputChange('angleA', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={`Side (${unit})`} value={inputs.sideC} onChange={e => handleInputChange('sideC', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={'Angle 2 (°)'} value={inputs.angleB} onChange={e => handleInputChange('angleB', e.target.value)} isReadOnly={isReadOnly} />
                  </div>
              );
          case CalculationMethod.BaseHeight:
              return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InputField placeholder={`Base (${unit})`} value={inputs.base} onChange={e => handleInputChange('base', e.target.value)} isReadOnly={isReadOnly} />
                      <InputField placeholder={`Height (${unit})`} value={inputs.height} onChange={e => handleInputChange('height', e.target.value)} isReadOnly={isReadOnly} />
                  </div>
              );
          case CalculationMethod.Coordinates:
            return (
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">P1:</span>
                        <InputField placeholder={`x₁ (${unit})`} value={inputs.p1x} onChange={e => handleInputChange('p1x', e.target.value)} isReadOnly={isReadOnly} />
                        <InputField placeholder={`y₁ (${unit})`} value={inputs.p1y} onChange={e => handleInputChange('p1y', e.target.value)} isReadOnly={isReadOnly} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">P2:</span>
                        <InputField placeholder={`x₂ (${unit})`} value={inputs.p2x} onChange={e => handleInputChange('p2x', e.target.value)} isReadOnly={isReadOnly} />
                        <InputField placeholder={`y₂ (${unit})`} value={inputs.p2y} onChange={e => handleInputChange('p2y', e.target.value)} isReadOnly={isReadOnly} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">P3:</span>
                        <InputField placeholder={`x₃ (${unit})`} value={inputs.p3x} onChange={e => handleInputChange('p3x', e.target.value)} isReadOnly={isReadOnly} />
                        <InputField placeholder={`y₃ (${unit})`} value={inputs.p3y} onChange={e => handleInputChange('p3y', e.target.value)} isReadOnly={isReadOnly} />
                    </div>
                </div>
            )
          default:
              return null;
      }
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg text-gray-500 dark:text-gray-400">{index + 1}.</span>
        <select
            value={triangle.method}
            onChange={(e) => updateTriangleMethod(triangle.id, e.target.value as CalculationMethod)}
            disabled={isReadOnly}
            className={`flex-1 appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
        >
            {Object.entries(FORMULA_DETAILS).map(([key, {name}]) => (
                <option key={key} value={key}>{name}</option>
            ))}
        </select>
        <span className={`text-2xl transition-transform duration-300 ${isValid ? 'scale-100' : 'scale-90'}`}>{isValid ? '✅' : '❌'}</span>
        <button onClick={() => removeTriangle(triangle.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <TrashIcon className="w-5 h-5"/>
        </button>
      </div>
      <div className="pl-2 sm:pl-8">
        {renderInputs()}
      </div>
    </div>
  );
};

export default TriangleInput;
