'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {title && (
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">{title}</h3>
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                )}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export function ConfirmationModal({
    isOpen, onClose, onConfirm, title, description,
    confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false
}: ConfirmationModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-slate-600 mb-6">{description}</p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                >
                    {cancelText}
                </button>
                <button
                    onClick={() => { onConfirm(); onClose(); }}
                    className={`px-4 py-2 font-bold text-white rounded-lg shadow-sm transition ${isDanger
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        }`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
}

export function InputModal({
    isOpen, onClose, onConfirm, title, description,
    placeholder = '', defaultValue = '', confirmText = 'Submit'
}: InputModalProps) {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) setValue(defaultValue);
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            {description && <p className="text-slate-600 mb-4">{description}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-6 bg-white text-black"
                />
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!value.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition"
                    >
                        {confirmText}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
