
import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, id }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <label htmlFor={id} className="inline-flex items-center">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-secondary-300 text-primary focus:ring-primary"
        checked={checked}
        onChange={handleChange}
      />
      {label && <span className="ml-2 text-sm text-secondary-700">{label}</span>}
    </label>
  );
};

export default Checkbox;
