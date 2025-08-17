"use client";

import React from "react";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
    label?: string;
    placeholder?: string;
}

export default function SelectField({
    name,
    value,
    onChange,
    options,
    placeholder,
    label,
    ...rest
}: SelectFieldProps) {
    return (
        <div className="flex flex-col">
            {label && (
                <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className="border border-gray-300 p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                required
                {...rest}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
