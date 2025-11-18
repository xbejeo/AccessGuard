import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
interface EditableFieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  type?: string;
  isEditing: boolean;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}
export const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  icon,
  type = 'text',
  isEditing,
  onSave,
  onCancel
}) => {
  const [editValue, setEditValue] = useState(value);
  const handleSave = () => {
    onSave(editValue);
  };
  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };
  if (!isEditing) {
    return <div className="flex items-center">
        {icon && <div className="mr-3">{icon}</div>}
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="font-medium">{value}</div>
        </div>
      </div>;
  }
  return <div>
      <Input label={label} value={editValue} onChange={e => setEditValue(e.target.value)} type={type} icon={icon} />
      <div className="flex gap-2 mt-2">
        <Button variant="primary" onClick={handleSave} className="flex-1">
          Сохранить
        </Button>
        <Button variant="secondary" onClick={handleCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </div>;
};