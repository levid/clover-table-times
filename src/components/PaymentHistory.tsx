'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, RotateCcw, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';

interface Payment {
    id: string;
    sessionId: string | null;
    cloverOrderId: string | null;
    amount: number;
    tipAmount: number;
    totalAmount: number;
    status: string;
    paymentMethod: string | null;
    refundedAmount: number;
    createdAt: string;
    session?: {
        table?: { name: string; tableNumber: number };
    };
}

interface PaymentHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PaymentHistory({ isOpen, onClose }: PaymentHistoryProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [refundingId, setRefundingId] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchPayments();
        }
    }, [isOpen, filter]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const url = filter === 'all'
                ? '/api/payments?limit=50'
                : `/api/payments?status=${filter}&limit=50`;
            const res = await fetch(url);
            const data = await res.json();
            setPayments(data.payments || []);
        } catch (e) {
            console.error('Failed to fetch payments:', e);
        }
        setLoading(false);
    };

    const handleRefund = async (payment: Payment) => {
        if (!payment.cloverOrderId) return;

        const amount = prompt(`Enter refund amount (max ${formatCurrency(payment.totalAmount - payment.refundedAmount)}):`);
        if (!amount) return;

        const amountCents = Math.round(parseFloat(amount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) {
            alert('Invalid amount');
            return;
        }

        setRefundingId(payment.id);
        try {
            const res = await fetch('/api/clover/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: payment.cloverOrderId,
                    amount: amountCents,
                    reason: 'Customer refund',
                }),
            });

            if (!res.ok) throw new Error('Refund failed');

            alert('Refund processed successfully');
            fetchPayments();
        } catch (e) {
            alert('Refund failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        }
        setRefundingId(null);
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle style={{ width: 14, height: 14, color: '#22c55e' }} />;
            case 'PENDING': return <Clock style={{ width: 14, height: 14, color: '#f59e0b' }} />;
            case 'REFUNDED': return <RotateCcw style={{ width: 14, height: 14, color: '#3b82f6' }} />;
            case 'FAILED': return <XCircle style={{ width: 14, height: 14, color: '#ef4444' }} />;
            default: return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 24 }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose} />
            <div className="relative w-full" style={{ maxWidth: 600, maxHeight: '80vh', backgroundColor: '#18181b', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DollarSign style={{ width: 22, height: 22, color: '#0ea5e9' }} />
                            <h2 className="font-semibold" style={{ fontSize: 20, color: '#fafafa' }}>Payment History</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/10" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 mt-4">
                        <Filter style={{ width: 14, height: 14, color: '#71717a' }} />
                        {['all', 'COMPLETED', 'PENDING', 'REFUNDED'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    borderRadius: 6,
                                    color: filter === f ? '#fff' : '#71717a',
                                    backgroundColor: filter === f ? '#0ea5e9' : '#27272a',
                                }}
                            >
                                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment List */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px' }}>
                    {loading ? (
                        <div className="text-center py-8" style={{ color: '#71717a' }}>Loading...</div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-8" style={{ color: '#71717a' }}>No payments found</div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        backgroundColor: '#27272a',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(payment.status)}
                                            <span style={{ fontSize: 14, color: '#fafafa', fontWeight: 500 }}>
                                                {payment.session?.table?.name || 'Unknown Table'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 16, color: '#0ea5e9', fontWeight: 600 }}>
                                            {formatCurrency(payment.totalAmount)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div style={{ fontSize: 12, color: '#71717a' }}>
                                            {new Date(payment.createdAt).toLocaleDateString()} {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {payment.tipAmount > 0 && ` • Tip: ${formatCurrency(payment.tipAmount)}`}
                                            {payment.refundedAmount > 0 && ` • Refunded: ${formatCurrency(payment.refundedAmount)}`}
                                        </div>

                                        {payment.status === 'COMPLETED' && payment.refundedAmount < payment.totalAmount && (
                                            <button
                                                onClick={() => handleRefund(payment)}
                                                disabled={refundingId === payment.id}
                                                className="flex items-center gap-1 hover:brightness-110"
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: 11,
                                                    borderRadius: 6,
                                                    color: '#ef4444',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                }}
                                            >
                                                <RotateCcw style={{ width: 12, height: 12 }} />
                                                {refundingId === payment.id ? 'Processing...' : 'Refund'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
