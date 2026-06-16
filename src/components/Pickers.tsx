import React, { useState, useEffect } from 'react';
import Picker from 'rmc-picker';
import { CodeComponentMeta } from "@plasmicapp/host";
import 'rmc-picker/assets/index.css';

type PickersProps = {
  data ?: { value: string | number; label: string }[];
  initialValue?: string | number;
  onChange?: (value: string | number) => void;
}

export const Pickers = (props: PickersProps) => {
  const {
    data = [],
    onChange,
    initialValue,
  } = props;
  
  const [selectedValue, setSelectedValue] = useState<string | number>(initialValue || data[0]?.value);

  // Update selectedValue whenever initialValue changes
  useEffect(() => {
    if (initialValue !== undefined) {
      setSelectedValue(initialValue);
    }
  }, [initialValue]);

  const handleChange = (value: string | number) => {
    setSelectedValue(value);
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <Picker selectedValue={selectedValue} onValueChange={handleChange}>
      {data.map((item) => (
        <Picker.Item value={item.value} key={item.value}>
          {item.label}
        </Picker.Item>
      ))}
    </Picker>
  );
};

export const PickersMeta: CodeComponentMeta<PickersProps> = {
  name: 'Pickers',
  importPath: '@/components/Pickers',
  props: {
    data: {
      type: 'array',
      defaultValue: [],
      description: 'List of options for the picker.',
    },
    initialValue: {
      type: 'number', 
      defaultValue: 0,
      description: 'Initial selected value.',
    },
    onChange: {
      type: 'eventHandler',
      argTypes: [
        {
          name: 'value',
          type: 'number',
        },
      ],
      description: 'Callback when a value is selected.',
    },
  },
  states: {
    value: {
      type: 'writable',
      variableType: 'number',
      valueProp: 'initialValue',
      onChangeProp: 'onChange',
    },
  },
};
