'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, CheckCircle, Clock, AlertCircle, Mail, Phone, Timer } from 'lucide-react';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    paymentUrl: string;
    amount: number;
    tableName: string;
}

type PaymentStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'timeout';

const TIMEOUT_MINUTES = 10;

export function PaymentConfirmationModal({
    isOpen,
    onClose,
    orderId,
    paymentUrl,
    amount,
    tableName,
}: PaymentConfirmationModalProps) {
    const [status, setStatus] = useState<PaymentStatus>('pending');
    const [checking, setChecking] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_MINUTES * 60);
    const [showReceiptForm, setShowReceiptForm] = useState(false);
    const [receiptEmail, setReceiptEmail] = useState('');
    const [receiptPhone, setReceiptPhone] = useState('');
    const [sendingReceipt, setSendingReceipt] = useState(false);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Timeout countdown
    useEffect(() => {
        if (!isOpen || status === 'complete' || status === 'timeout') return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    setStatus('timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, status]);

    // Poll for payment status
    useEffect(() => {
        if (!isOpen || !orderId || status === 'timeout') return;

        const checkPaymentStatus = async () => {
            setChecking(true);
            try {
                const res = await fetch(`/api/clover/orders/${orderId}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.paid) {
                        setStatus('complete');
                    } else if (data.state === 'locked') {
                        setStatus('processing');
                    }
                }
            } catch (e) {
                // Ignore polling errors
            }
            setChecking(false);
        };

        checkPaymentStatus();
        const interval = setInterval(checkPaymentStatus, 5000);

        return () => clearInterval(interval);
    }, [isOpen, orderId, status]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount / 100);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendReceipt = async () => {
        if (!receiptEmail && !receiptPhone) return;

        setSendingReceipt(true);
        try {
            // This would send to an actual receipt API
            await fetch('/api/payments/receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    email: receiptEmail,
                    phone: receiptPhone,
                    amount,
                    tableName,
                }),
            });
            setShowReceiptForm(false);
            alert('Receipt sent!');
        } catch (e) {
            alert('Failed to send receipt');
        }
        setSendingReceipt(false);
    };

    if (!isOpen) return null;

    const statusConfig = {
        pending: {
            icon: Clock,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
            text: 'Waiting for payment...',
        },
        processing: {
            icon: Clock,
            color: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.1)',
            text: 'Payment processing...',
        },
        complete: {
            icon: CheckCircle,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
            text: 'Payment complete!',
        },
        failed: {
            icon: AlertCircle,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
            text: 'Payment failed',
        },
        timeout: {
            icon: Timer,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
            text: 'Payment timed out',
        },
    };

    const currentStatus = statusConfig[status];
    const StatusIcon = currentStatus.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 24 }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose} />
            <div className="relative w-full" style={{ maxWidth: 400, backgroundColor: '#18181b', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)' }}>

                {/* Header */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold" style={{ fontSize: 20, color: '#fafafa' }}>Payment Sent</h2>
                        <div className="flex items-center gap-3">
                            {status !== 'complete' && status !== 'timeout' && (
                                <div className="flex items-center gap-1" style={{ color: timeRemaining < 60 ? '#ef4444' : '#71717a' }}>
                                    <Timer style={{ width: 14, height: 14 }} />
                                    <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{formatTime(timeRemaining)}</span>
                                </div>
                            )}
                            <button onClick={onClose} className="hover:bg-white/10" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X style={{ width: 20, height: 20, color: '#71717a' }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '28px' }}>
                    {/* Status indicator */}
                    <div
                        className="flex items-center justify-center gap-3"
                        style={{
                            padding: 20,
                            borderRadius: 16,
                            backgroundColor: currentStatus.bg,
                            marginBottom: 24,
                        }}
                    >
                        <StatusIcon style={{ width: 24, height: 24, color: currentStatus.color }} />
                        <span style={{ fontSize: 16, color: currentStatus.color, fontWeight: 500 }}>
                            {currentStatus.text}
                        </span>
                    </div>

                    {/* Order details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="flex justify-between">
                            <span style={{ fontSize: 15, color: '#71717a' }}>Table</span>
                            <span style={{ fontSize: 15, color: '#fafafa', fontWeight: 500 }}>{tableName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ fontSize: 15, color: '#71717a' }}>Amount</span>
                            <span style={{ fontSize: 15, color: '#0ea5e9', fontWeight: 600 }}>{formatCurrency(amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ fontSize: 15, color: '#71717a' }}>Order ID</span>
                            <span className="font-mono" style={{ fontSize: 13, color: '#a1a1aa' }}>{orderId.slice(0, 12)}...</span>
                        </div>
                    </div>

                    {/* Receipt form */}
                    {status === 'complete' && showReceiptForm && (
                        <div style={{ marginTop: 20, padding: 16, backgroundColor: '#27272a', borderRadius: 12 }}>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Mail style={{ width: 16, height: 16, color: '#71717a' }} />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={receiptEmail}
                                        onChange={(e) => setReceiptEmail(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            fontSize: 14,
                                            backgroundColor: '#18181b',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone style={{ width: 16, height: 16, color: '#71717a' }} />
                                    <input
                                        type="tel"
                                        placeholder="Phone number"
                                        value={receiptPhone}
                                        onChange={(e) => setReceiptPhone(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            fontSize: 14,
                                            backgroundColor: '#18181b',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendReceipt}
                                    disabled={sendingReceipt || (!receiptEmail && !receiptPhone)}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: 14,
                                        fontWeight: 500,
                                        borderRadius: 8,
                                        color: '#fff',
                                        backgroundColor: '#0ea5e9',
                                        opacity: sendingReceipt ? 0.5 : 1,
                                    }}
                                >
                                    {sendingReceipt ? 'Sending...' : 'Send Receipt'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Open payment page button */}
                    {(status === 'pending' || status === 'processing') && (
                        <a
                            href={paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 font-semibold hover:brightness-110 mt-6"
                            style={{
                                height: 52,
                                fontSize: 16,
                                color: '#fff',
                                backgroundColor: '#0ea5e9',
                                borderRadius: 14,
                                textDecoration: 'none',
                            }}
                        >
                            <ExternalLink style={{ width: 20, height: 20 }} />
                            Open Clover Payment
                        </a>
                    )}

                    {/* Timeout - retry button */}
                    {status === 'timeout' && (
                        <button
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 font-semibold hover:brightness-110 mt-6"
                            style={{
                                height: 52,
                                fontSize: 16,
                                color: '#fff',
                                backgroundColor: '#ef4444',
                                borderRadius: 14,
                            }}
                        >
                            Close & Retry
                        </button>
                    )}

                    {/* Done button when complete */}
                    {status === 'complete' && (
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowReceiptForm(!showReceiptForm)}
                                className="flex items-center justify-center gap-2 font-semibold hover:brightness-110"
                                style={{
                                    height: 52,
                                    padding: '0 20px',
                                    fontSize: 14,
                                    color: '#71717a',
                                    backgroundColor: '#27272a',
                                    borderRadius: 14,
                                }}
                            >
                                <Mail style={{ width: 18, height: 18 }} />
                                Receipt
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 flex items-center justify-center gap-2 font-semibold hover:brightness-110"
                                style={{
                                    height: 52,
                                    fontSize: 16,
                                    color: '#fff',
                                    backgroundColor: '#22c55e',
                                    borderRadius: 14,
                                }}
                            >
                                <CheckCircle style={{ width: 20, height: 20 }} />
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                {(status === 'pending' || status === 'processing') && (
                    <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: '#52525b' }}>
                            Complete payment on the Clover payment page
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
