"use client";

import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
}

export default function InputField({
    name,
    value,
    onChange,
    placeholder,
    type = "text",
    label,
    ...rest
}: InputFieldProps) {
    return (
        <div className="flex flex-col">
            {label && (
                <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                type={type}
                placeholder={placeholder}
                className="border border-gray-300 p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
                {...rest}
            />
        </div>
    );
}
