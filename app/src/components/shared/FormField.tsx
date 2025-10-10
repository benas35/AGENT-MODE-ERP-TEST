import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  id: string;
  type?: 'text' | 'email' | 'number' | 'tel' | 'textarea';
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  onBlur?: () => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  rows = 3,
  onBlur
}) => {
  const InputComponent = type === 'textarea' ? Textarea : Input;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <InputComponent
        id={id}
        type={type === 'textarea' ? undefined : type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
          onChange(e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        rows={type === 'textarea' ? rows : undefined}
        onBlur={onBlur}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
