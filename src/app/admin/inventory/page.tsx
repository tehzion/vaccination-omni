'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Package, Plus, AlertTriangle, Calendar, Search, Edit2, Trash2 } from 'lucide-react';

export default function InventoryPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editItemId, setEditItemId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        vaccineName: '',
        batchNumber: '',
        expiryDate: '',
        count: 0,
        minThreshold: 10
    });

    const inventory = useLiveQuery(async () => {
        return await db.inventory.toArray();
    });

    const filteredInventory = inventory?.filter(item =>
        item.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Stats
    const totalDoses = inventory?.reduce((acc, item) => acc + item.count, 0) || 0;
    const lowStockCount = inventory?.filter(item => item.count <= item.minThreshold).length || 0;
    const expiringSoonCount = inventory?.filter(item => {
        const expiry = new Date(item.expiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays >= 0;
    }).length || 0;

    const handleSave = async () => {
        if (!formData.vaccineName || !formData.batchNumber || !formData.expiryDate) {
            alert('Please fill in required fields.');
            return;
        }

        if (editItemId) {
            await db.inventory.update(editItemId, formData);
        } else {
            await db.inventory.add({
                ...formData,
                count: Number(formData.count),
                minThreshold: Number(formData.minThreshold)
            });
        }

        closeModal();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this batch?')) {
            await db.inventory.delete(id);
        }
    };

    const openAddModal = () => {
        setEditItemId(null);
        setFormData({
            vaccineName: '',
            batchNumber: '',
            expiryDate: '',
            count: 0,
            minThreshold: 10
        });
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setEditItemId(item.id);
        setFormData(item);
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditItemId(null);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
                <p className="text-slate-500">Track vaccine stock, batches, and expiry dates.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center sm:flex-col sm:items-start gap-4 hover:border-slate-300 transition-colors">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Doses</p>
                        <p className="text-2xl font-bold text-slate-900">{totalDoses}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center sm:flex-col sm:items-start gap-4 hover:border-slate-300 transition-colors">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Low Stock Alerts</p>
                        <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center sm:flex-col sm:items-start gap-4 hover:border-slate-300 transition-colors">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Expiring (30 Days)</p>
                        <p className="text-2xl font-bold text-orange-600">{expiringSoonCount}</p>
                    </div>
                </div>
            </div>

            {/* Actions & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search vaccine or batch..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-neutral-800 transition shadow-sm w-full md:w-auto justify-center"
                >
                    <Plus className="w-5 h-5" /> Add Stock
                </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th className="p-4">Vaccine Name</th>
                            <th className="p-4">Batch No.</th>
                            <th className="p-4">Expiry Date</th>
                            <th className="p-4 text-right">Available</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredInventory.map(item => {
                            const isLow = item.count <= item.minThreshold;
                            const expiryDate = new Date(item.expiryDate);
                            const isExpired = expiryDate < new Date();
                            const isExpiringSoon = !isExpired && (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30;

                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-900">{item.vaccineName}</td>
                                    <td className="p-4 font-mono text-slate-600">{item.batchNumber}</td>
                                    <td className="p-4 text-slate-600">{expiryDate.toLocaleDateString()}</td>
                                    <td className="p-4 text-right font-bold text-lg">{item.count}</td>
                                    <td className="p-4 text-center">
                                        {isExpired ? (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">Expired</span>
                                        ) : isLow ? (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">Low Stock</span>
                                        ) : isExpiringSoon ? (
                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase">Expiring</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Healthy</span>
                                        )}
                                    </td>
                                    <td className="p-4 flex justify-end gap-2">
                                        <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInventory.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    No inventory items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">{editItemId ? 'Edit Batch' : 'Add New Batch'}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Vaccine Name</label>
                                <input
                                    className="w-full p-2 border rounded-lg bg-white text-black"
                                    placeholder="e.g. Pfizer Comirnaty"
                                    value={formData.vaccineName}
                                    onChange={e => setFormData({ ...formData, vaccineName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Batch Number</label>
                                    <input
                                        className="w-full p-2 border rounded-lg font-mono bg-white text-black"
                                        placeholder="AB12345"
                                        value={formData.batchNumber}
                                        onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Expiry Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-lg bg-white text-black"
                                        value={formData.expiryDate}
                                        onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Quantity (Doses)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg font-bold bg-white text-black"
                                        value={formData.count}
                                        onChange={e => setFormData({ ...formData, count: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Low Warning Threshold</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg bg-white text-black"
                                        value={formData.minThreshold}
                                        onChange={e => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-neutral-800"
                            >
                                Save Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
