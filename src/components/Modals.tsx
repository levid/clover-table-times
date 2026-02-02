'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Pencil, DollarSign, Clock, Save, AlertTriangle } from 'lucide-react';
import { Table, Settings } from '@/lib/store';
import { formatCurrency } from '@/lib/pricing';

// Apple-inspired design tokens
const spacing = {
    modal: { paddingX: 32, paddingY: 28 },
    header: { paddingY: 24 },
    section: { gap: 40, labelGap: 14 },
    input: { height: 52, paddingX: 18, radius: 14 },
    button: { height: 52, radius: 14 },
    card: { padding: 20, radius: 16 },
};

interface AddTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, tableNumber: number, hourlyRate: number) => void;
    existingNumbers: number[];
}

export function AddTableModal({ isOpen, onClose, onAdd, existingNumbers }: AddTableModalProps) {
    const [name, setName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [hourlyRate, setHourlyRate] = useState('15');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const num = parseInt(tableNumber);
        if (isNaN(num) || num < 1) {
            setError('Please enter a valid table number');
            return;
        }

        if (existingNumbers.includes(num)) {
            setError('This table number already exists');
            return;
        }

        const rate = parseFloat(hourlyRate);
        if (isNaN(rate) || rate < 0) {
            setError('Please enter a valid hourly rate');
            return;
        }

        onAdd(name || `Table ${num}`, num, rate);
        setName('');
        setTableNumber('');
        setHourlyRate('15');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ padding: 24 }}
        >
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                onClick={onClose}
            />
            <div
                className="relative w-full overflow-hidden"
                style={{
                    maxWidth: 440,
                    backgroundColor: '#18181b',
                    borderRadius: 20,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <h2
                            className="font-semibold tracking-tight"
                            style={{ fontSize: 22, color: '#fafafa' }}
                        >
                            Add New Table
                        </h2>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 36, height: 36, borderRadius: 10, marginRight: -6 }}
                        >
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: `${spacing.modal.paddingY}px ${spacing.modal.paddingX}px` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.section.gap - 10 }}>
                            {/* Table Number */}
                            <div>
                                <label
                                    className="block font-medium"
                                    style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                >
                                    Table Number
                                </label>
                                <input
                                    type="number"
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value)}
                                    placeholder="1"
                                    required
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        height: spacing.input.height,
                                        padding: `0 ${spacing.input.paddingX}px`,
                                        fontSize: 16,
                                        color: '#fafafa',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: spacing.input.radius,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Display Name */}
                            <div>
                                <label
                                    className="block font-medium"
                                    style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                >
                                    Display Name <span style={{ color: '#52525b' }}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="VIP Table, Corner Table, etc."
                                    style={{
                                        width: '100%',
                                        height: spacing.input.height,
                                        padding: `0 ${spacing.input.paddingX}px`,
                                        fontSize: 16,
                                        color: '#fafafa',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: spacing.input.radius,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Hourly Rate */}
                            <div>
                                <label
                                    className="block font-medium"
                                    style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                >
                                    Hourly Rate ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value)}
                                    placeholder="15.00"
                                    style={{
                                        width: '100%',
                                        height: spacing.input.height,
                                        padding: `0 ${spacing.input.paddingX}px`,
                                        fontSize: 16,
                                        color: '#fafafa',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: spacing.input.radius,
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                className="flex items-center gap-3"
                                style={{ marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            >
                                <AlertTriangle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0 }} />
                                <span style={{ fontSize: 14, color: '#ef4444' }}>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                    >
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 flex items-center justify-center font-semibold transition-all hover:bg-zinc-600"
                                style={{
                                    height: spacing.button.height,
                                    fontSize: 16,
                                    color: '#a1a1aa',
                                    backgroundColor: '#3f3f46',
                                    borderRadius: spacing.button.radius,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                                style={{
                                    height: spacing.button.height,
                                    fontSize: 16,
                                    color: '#fff',
                                    backgroundColor: '#0ea5e9',
                                    borderRadius: spacing.button.radius,
                                }}
                            >
                                <Plus style={{ width: 20, height: 20 }} />
                                Add Table
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (settings: Settings) => void;
    tables: Table[];
    onDeleteTable: (id: string) => void;
    onEditTable: (id: string, name: string, hourlyRate: number, timeLimitMinutes?: number) => void;
    displayMode: 'grid' | 'list';
    onDisplayModeChange: (mode: 'grid' | 'list') => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    settings,
    onSave,
    tables,
    onDeleteTable,
    onEditTable,
    displayMode,
    onDisplayModeChange,
}: SettingsModalProps) {
    const [formSettings, setFormSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'pricing' | 'tables' | 'display'>('pricing');
    const [editingTable, setEditingTable] = useState<{ id: string; name: string; hourlyRate: string; timeLimitMinutes: string } | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formSettings);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ padding: 24 }}
        >
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                onClick={onClose}
            />
            <div
                className="relative w-full flex flex-col overflow-hidden"
                style={{
                    maxWidth: 500,
                    maxHeight: '85vh',
                    backgroundColor: '#18181b',
                    borderRadius: 20,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                }}
            >
                {/* Header */}
                <div
                    className="shrink-0"
                    style={{
                        padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <h2
                            className="font-semibold tracking-tight"
                            style={{ fontSize: 22, color: '#fafafa' }}
                        >
                            Settings
                        </h2>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 36, height: 36, borderRadius: 10, marginRight: -6 }}
                        >
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div
                    className="shrink-0 flex gap-3"
                    style={{
                        padding: `20px ${spacing.modal.paddingX}px`,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <button
                        onClick={() => setActiveTab('pricing')}
                        className="font-medium transition-all"
                        style={{
                            padding: '12px 20px',
                            fontSize: 14,
                            borderRadius: 10,
                            color: activeTab === 'pricing' ? '#fff' : '#71717a',
                            backgroundColor: activeTab === 'pricing' ? '#0ea5e9' : '#27272a',
                        }}
                    >
                        Pricing & Billing
                    </button>
                    <button
                        onClick={() => setActiveTab('tables')}
                        className="font-medium transition-all"
                        style={{
                            padding: '12px 20px',
                            fontSize: 14,
                            borderRadius: 10,
                            color: activeTab === 'tables' ? '#fff' : '#71717a',
                            backgroundColor: activeTab === 'tables' ? '#0ea5e9' : '#27272a',
                        }}
                    >
                        Manage Tables
                    </button>
                    <button
                        onClick={() => setActiveTab('display')}
                        className="font-medium transition-all"
                        style={{
                            padding: '12px 20px',
                            fontSize: 14,
                            borderRadius: 10,
                            color: activeTab === 'display' ? '#fff' : '#71717a',
                            backgroundColor: activeTab === 'display' ? '#0ea5e9' : '#27272a',
                        }}
                    >
                        Display
                    </button>
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{ padding: `${spacing.modal.paddingY + 4}px ${spacing.modal.paddingX}px` }}
                >
                    {activeTab === 'pricing' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.section.gap }}>
                            {/* Venue Name */}
                            <div>
                                <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
                                    <span style={{ width: 20, height: 20, fontSize: 16 }}>🏢</span>
                                    <h3 className="font-semibold" style={{ fontSize: 17, color: '#fafafa' }}>Venue</h3>
                                </div>
                                <div>
                                    <label
                                        className="block font-medium"
                                        style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                    >
                                        Venue Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formSettings.venueName}
                                        onChange={(e) => setFormSettings({ ...formSettings, venueName: e.target.value })}
                                        placeholder="Fat Cats, Rack 'Em Up, etc."
                                        style={{
                                            width: '100%',
                                            height: spacing.input.height,
                                            padding: `0 ${spacing.input.paddingX}px`,
                                            fontSize: 16,
                                            color: '#fafafa',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #3f3f46',
                                            borderRadius: spacing.input.radius,
                                            outline: 'none',
                                        }}
                                    />
                                    <p style={{ marginTop: 10, paddingLeft: 4, fontSize: 13, color: '#52525b' }}>
                                        Displayed in the header
                                    </p>
                                </div>
                            </div>

                            {/* Pricing Settings */}
                            <div>
                                <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
                                    <DollarSign style={{ width: 20, height: 20, color: '#0ea5e9' }} />
                                    <h3 className="font-semibold" style={{ fontSize: 17, color: '#fafafa' }}>Pricing</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div>
                                        <label
                                            className="block font-medium"
                                            style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                        >
                                            Default Hourly Rate
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formSettings.defaultHourlyRate}
                                            onChange={(e) => setFormSettings({ ...formSettings, defaultHourlyRate: parseFloat(e.target.value) || 0 })}
                                            style={{
                                                width: '100%',
                                                height: spacing.input.height,
                                                padding: `0 ${spacing.input.paddingX}px`,
                                                fontSize: 16,
                                                color: '#fafafa',
                                                backgroundColor: '#27272a',
                                                border: '1px solid #3f3f46',
                                                borderRadius: spacing.input.radius,
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="block font-medium"
                                            style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                        >
                                            Minimum Charge
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formSettings.minimumCharge}
                                            onChange={(e) => setFormSettings({ ...formSettings, minimumCharge: parseFloat(e.target.value) || 0 })}
                                            style={{
                                                width: '100%',
                                                height: spacing.input.height,
                                                padding: `0 ${spacing.input.paddingX}px`,
                                                fontSize: 16,
                                                color: '#fafafa',
                                                backgroundColor: '#27272a',
                                                border: '1px solid #3f3f46',
                                                borderRadius: spacing.input.radius,
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Settings */}
                            <div>
                                <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
                                    <Clock style={{ width: 20, height: 20, color: '#0ea5e9' }} />
                                    <h3 className="font-semibold" style={{ fontSize: 17, color: '#fafafa' }}>Billing</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div>
                                        <label
                                            className="block font-medium"
                                            style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                        >
                                            Grace Period (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            value={formSettings.gracePeriodMinutes}
                                            onChange={(e) => setFormSettings({ ...formSettings, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                                            style={{
                                                width: '100%',
                                                height: spacing.input.height,
                                                padding: `0 ${spacing.input.paddingX}px`,
                                                fontSize: 16,
                                                color: '#fafafa',
                                                backgroundColor: '#27272a',
                                                border: '1px solid #3f3f46',
                                                borderRadius: spacing.input.radius,
                                                outline: 'none',
                                            }}
                                        />
                                        <p style={{ marginTop: 10, paddingLeft: 4, fontSize: 13, color: '#52525b' }}>
                                            Free time before billing starts
                                        </p>
                                    </div>
                                    <div>
                                        <label
                                            className="block font-medium"
                                            style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                        >
                                            Billing Increment
                                        </label>
                                        <select
                                            value={formSettings.billingIncrement}
                                            onChange={(e) => setFormSettings({ ...formSettings, billingIncrement: e.target.value as Settings['billingIncrement'] })}
                                            style={{
                                                width: '100%',
                                                height: spacing.input.height,
                                                padding: `0 ${spacing.input.paddingX}px`,
                                                fontSize: 16,
                                                color: '#fafafa',
                                                backgroundColor: '#27272a',
                                                border: '1px solid #3f3f46',
                                                borderRadius: spacing.input.radius,
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="MINUTE">Per Minute</option>
                                            <option value="QUARTER_HOUR">15 Minutes</option>
                                            <option value="HALF_HOUR">30 Minutes</option>
                                            <option value="HOUR">Hourly</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tables' && (
                        <div>
                            {tables.length === 0 ? (
                                <div className="text-center" style={{ padding: '48px 0', color: '#52525b' }}>
                                    No tables configured
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {tables.map((table) => (
                                        <div
                                            key={table.id}
                                            style={{
                                                padding: spacing.card.padding,
                                                borderRadius: spacing.card.radius,
                                                backgroundColor: '#27272a',
                                            }}
                                        >
                                            {editingTable?.id === table.id ? (
                                                // Edit mode
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className="flex items-center justify-center font-semibold shrink-0"
                                                            style={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 12,
                                                                fontSize: 15,
                                                                color: '#0ea5e9',
                                                                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                                            }}
                                                        >
                                                            #{table.tableNumber}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={editingTable.name}
                                                            onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                                                            placeholder="Table name"
                                                            style={{
                                                                flex: 1,
                                                                height: 44,
                                                                padding: '0 14px',
                                                                fontSize: 15,
                                                                color: '#fafafa',
                                                                backgroundColor: '#3f3f46',
                                                                border: '1px solid #52525b',
                                                                borderRadius: 10,
                                                                outline: 'none',
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span style={{ fontSize: 14, color: '#71717a' }}>$/hr:</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={editingTable.hourlyRate}
                                                                onChange={(e) => setEditingTable({ ...editingTable, hourlyRate: e.target.value })}
                                                                style={{
                                                                    width: 70,
                                                                    height: 40,
                                                                    padding: '0 10px',
                                                                    fontSize: 15,
                                                                    color: '#fafafa',
                                                                    backgroundColor: '#3f3f46',
                                                                    border: '1px solid #52525b',
                                                                    borderRadius: 10,
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span style={{ fontSize: 14, color: '#71717a' }}>Limit:</span>
                                                            <input
                                                                type="number"
                                                                placeholder="∞"
                                                                value={editingTable.timeLimitMinutes}
                                                                onChange={(e) => setEditingTable({ ...editingTable, timeLimitMinutes: e.target.value })}
                                                                style={{
                                                                    width: 60,
                                                                    height: 40,
                                                                    padding: '0 10px',
                                                                    fontSize: 15,
                                                                    color: '#fafafa',
                                                                    backgroundColor: '#3f3f46',
                                                                    border: '1px solid #52525b',
                                                                    borderRadius: 10,
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                            <span style={{ fontSize: 12, color: '#52525b' }}>min</span>
                                                        </div>
                                                        <div className="flex gap-2 ml-auto">
                                                            <button
                                                                onClick={() => setEditingTable(null)}
                                                                className="font-medium transition-all hover:bg-zinc-600"
                                                                style={{
                                                                    height: 40,
                                                                    padding: '0 14px',
                                                                    fontSize: 14,
                                                                    color: '#a1a1aa',
                                                                    backgroundColor: '#3f3f46',
                                                                    borderRadius: 10,
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onEditTable(
                                                                        editingTable.id,
                                                                        editingTable.name,
                                                                        parseFloat(editingTable.hourlyRate) || table.hourlyRate,
                                                                        editingTable.timeLimitMinutes ? parseInt(editingTable.timeLimitMinutes) : undefined
                                                                    );
                                                                    setEditingTable(null);
                                                                }}
                                                                className="font-medium transition-all hover:brightness-110"
                                                                style={{
                                                                    height: 40,
                                                                    padding: '0 14px',
                                                                    fontSize: 14,
                                                                    color: '#fff',
                                                                    backgroundColor: '#0ea5e9',
                                                                    borderRadius: 10,
                                                                }}
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View mode
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className="flex items-center justify-center font-semibold"
                                                            style={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 12,
                                                                fontSize: 15,
                                                                color: '#a1a1aa',
                                                                backgroundColor: '#3f3f46',
                                                            }}
                                                        >
                                                            #{table.tableNumber}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium" style={{ fontSize: 15, color: '#fafafa' }}>{table.name}</p>
                                                            <p style={{ fontSize: 14, color: '#71717a', marginTop: 2 }}>{formatCurrency(table.hourlyRate)}/hr</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setEditingTable({
                                                                id: table.id,
                                                                name: table.name,
                                                                hourlyRate: table.hourlyRate.toString(),
                                                                timeLimitMinutes: table.timeLimitMinutes?.toString() || '',
                                                            })}
                                                            className="flex items-center justify-center transition-all hover:bg-sky-500/10"
                                                            style={{ width: 40, height: 40, borderRadius: 10 }}
                                                            title="Edit table"
                                                        >
                                                            <Pencil style={{ width: 18, height: 18, color: '#71717a' }} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Delete ${table.name}?`)) {
                                                                    onDeleteTable(table.id);
                                                                }
                                                            }}
                                                            disabled={table.status === 'OCCUPIED'}
                                                            className="flex items-center justify-center transition-all hover:bg-red-500/10"
                                                            style={{
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: 10,
                                                                opacity: table.status === 'OCCUPIED' ? 0.3 : 1,
                                                                cursor: table.status === 'OCCUPIED' ? 'not-allowed' : 'pointer',
                                                            }}
                                                            title="Delete table"
                                                        >
                                                            <Trash2 style={{ width: 18, height: 18, color: '#71717a' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'display' && (
                        <div>
                            <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
                                <h3 className="font-semibold" style={{ fontSize: 17, color: '#fafafa' }}>View Layout</h3>
                            </div>
                            <p style={{ fontSize: 14, color: '#71717a', marginBottom: 20 }}>
                                Choose how tables are displayed on the dashboard
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onDisplayModeChange('grid')}
                                    className="flex-1 flex flex-col items-center gap-3 transition-all"
                                    style={{
                                        padding: 20,
                                        borderRadius: 14,
                                        backgroundColor: displayMode === 'grid' ? 'rgba(14, 165, 233, 0.15)' : '#27272a',
                                        border: displayMode === 'grid' ? '2px solid #0ea5e9' : '2px solid transparent',
                                    }}
                                >
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 6,
                                    }}>
                                        <div style={{ width: 20, height: 16, borderRadius: 4, backgroundColor: displayMode === 'grid' ? '#0ea5e9' : '#52525b' }} />
                                        <div style={{ width: 20, height: 16, borderRadius: 4, backgroundColor: displayMode === 'grid' ? '#0ea5e9' : '#52525b' }} />
                                        <div style={{ width: 20, height: 16, borderRadius: 4, backgroundColor: displayMode === 'grid' ? '#0ea5e9' : '#52525b' }} />
                                        <div style={{ width: 20, height: 16, borderRadius: 4, backgroundColor: displayMode === 'grid' ? '#0ea5e9' : '#52525b' }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: displayMode === 'grid' ? '#0ea5e9' : '#a1a1aa' }}>
                                        Grid
                                    </span>
                                </button>
                                <button
                                    onClick={() => onDisplayModeChange('list')}
                                    className="flex-1 flex flex-col items-center gap-3 transition-all"
                                    style={{
                                        padding: 20,
                                        borderRadius: 14,
                                        backgroundColor: displayMode === 'list' ? 'rgba(14, 165, 233, 0.15)' : '#27272a',
                                        border: displayMode === 'list' ? '2px solid #0ea5e9' : '2px solid transparent',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4,
                                    }}>
                                        <div style={{ width: 44, height: 10, borderRadius: 3, backgroundColor: displayMode === 'list' ? '#0ea5e9' : '#52525b' }} />
                                        <div style={{ width: 44, height: 10, borderRadius: 3, backgroundColor: displayMode === 'list' ? '#0ea5e9' : '#52525b' }} />
                                        <div style={{ width: 44, height: 10, borderRadius: 3, backgroundColor: displayMode === 'list' ? '#0ea5e9' : '#52525b' }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: displayMode === 'list' ? '#0ea5e9' : '#a1a1aa' }}>
                                        List
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="shrink-0 flex gap-4"
                    style={{
                        padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <button
                        onClick={onClose}
                        className="flex-1 font-semibold transition-all hover:bg-zinc-600"
                        style={{
                            height: spacing.button.height,
                            fontSize: 16,
                            color: '#fff',
                            backgroundColor: '#3f3f46',
                            borderRadius: spacing.button.radius,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                        style={{
                            height: spacing.button.height,
                            fontSize: 16,
                            color: '#fff',
                            backgroundColor: '#0ea5e9',
                            borderRadius: spacing.button.radius,
                            opacity: isSaving ? 0.5 : 1,
                        }}
                    >
                        <Save style={{ width: 20, height: 20 }} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
