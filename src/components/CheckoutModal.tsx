'use client';

import { useState, useEffect } from 'react';
import { X, Check, CreditCard, Receipt, Banknote, ExternalLink, Users, Percent } from 'lucide-react';
import { formatCurrency, formatDuration, getElapsedSeconds } from '@/lib/pricing';
import { Table, Session } from '@/lib/store';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    table: Table | null;
    session: Session | null;
    finalCharge: number;
}

interface PaymentInfo {
    orderId: string;
    paymentUrl: string;
    amount: number;
    tipAmount: number;
}

const TIP_PRESETS = [
    { label: 'No Tip', percent: 0 },
    { label: '15%', percent: 15 },
    { label: '20%', percent: 20 },
    { label: '25%', percent: 25 },
];

export function CheckoutModal({ isOpen, onClose, onConfirm, table, session, finalCharge }: CheckoutModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
    const [cloverConnected, setCloverConnected] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

    // Tip state
    const [selectedTip, setSelectedTip] = useState<number>(0); // percent
    const [customTip, setCustomTip] = useState<string>('');
    const [showCustomTip, setShowCustomTip] = useState(false);

    // Split payment state
    const [splitCount, setSplitCount] = useState<number>(1);
    const [showSplit, setShowSplit] = useState(false);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            checkCloverStatus();
            setPaymentInfo(null);
            setSelectedTip(0);
            setCustomTip('');
            setShowCustomTip(false);
            setSplitCount(1);
            setShowSplit(false);
        }
    }, [isOpen]);

    const checkCloverStatus = async () => {
        try {
            const res = await fetch('/api/clover/status');
            const data = await res.json();
            setCloverConnected(data.connected);
        } catch {
            setCloverConnected(false);
        }
    };

    if (!isOpen || !table || !session) return null;

    // Calculate tip amount
    const tipAmount = showCustomTip
        ? parseFloat(customTip || '0')
        : (finalCharge * selectedTip) / 100;

    const totalWithTip = finalCharge + tipAmount;
    const perPersonAmount = splitCount > 1 ? totalWithTip / splitCount : totalWithTip;

    // Show payment confirmation modal if we have payment info
    if (paymentInfo) {
        return (
            <PaymentConfirmationModal
                isOpen={true}
                onClose={() => {
                    setPaymentInfo(null);
                    onClose();
                }}
                orderId={paymentInfo.orderId}
                paymentUrl={paymentInfo.paymentUrl}
                amount={paymentInfo.amount}
                tableName={table.name}
            />
        );
    }

    const totalSeconds = getElapsedSeconds(new Date(session.startTime), session.totalPausedMs, session.endTime ? new Date(session.endTime) : null);
    const durationStr = formatDuration(totalSeconds);

    const handleConfirm = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            if (paymentMethod === 'card' && cloverConnected) {
                // Create Clover order
                const orderRes = await fetch('/api/clover/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tableName: table.name,
                        tableNumber: table.tableNumber,
                        sessionId: session.id,
                    }),
                });

                if (!orderRes.ok) {
                    throw new Error('Failed to create Clover order');
                }

                const orderData = await orderRes.json();

                // Add line item and get payment URL (including tip)
                const paymentRes = await fetch('/api/clover/orders', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderData.orderId,
                        amount: finalCharge,
                        tipAmount: tipAmount,
                        tableName: table.name,
                        duration: durationStr,
                        splitCount: splitCount,
                    }),
                });

                if (!paymentRes.ok) {
                    throw new Error('Failed to prepare payment');
                }

                const paymentData = await paymentRes.json();

                // Show payment confirmation modal FIRST
                setPaymentInfo({
                    orderId: orderData.orderId,
                    paymentUrl: paymentData.paymentUrl,
                    amount: paymentData.amount,
                    tipAmount: Math.round(tipAmount * 100),
                });

                // Complete the session locally
                await onConfirm();
            } else {
                // Cash payment - just complete the session
                await onConfirm();
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConnectClover = () => {
        window.location.href = '/api/clover/oauth';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 24 }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose} />
            <div className="relative w-full" style={{ maxWidth: 440, maxHeight: '90vh', overflow: 'auto', backgroundColor: '#18181b', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)' }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Receipt style={{ width: 22, height: 22, color: '#0ea5e9' }} />
                            <h2 className="font-semibold" style={{ fontSize: 22, color: '#fafafa' }}>Checkout</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/10" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '28px 32px' }}>
                    {/* Table Info */}
                    <div className="text-center" style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 18, fontSize: 28, color: '#a1a1aa', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700 }}>#{table.tableNumber}</div>
                        <h3 className="font-semibold" style={{ fontSize: 18, color: '#fafafa' }}>{table.name}</h3>
                    </div>

                    {/* Session Details */}
                    <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="flex justify-between"><span style={{ fontSize: 15, color: '#71717a' }}>Duration</span><span className="font-mono" style={{ fontSize: 15, color: '#fafafa' }}>{durationStr}</span></div>
                        <div className="flex justify-between"><span style={{ fontSize: 15, color: '#71717a' }}>Rate</span><span style={{ fontSize: 15, color: '#fafafa' }}>{formatCurrency(table.hourlyRate)}/hr</span></div>
                        <div className="flex justify-between"><span style={{ fontSize: 15, color: '#71717a' }}>Subtotal</span><span style={{ fontSize: 15, color: '#fafafa' }}>{formatCurrency(finalCharge)}</span></div>
                    </div>

                    {/* Tip Selection */}
                    {paymentMethod === 'card' && (
                        <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Percent style={{ width: 16, height: 16, color: '#71717a' }} />
                                    <span style={{ fontSize: 15, color: '#71717a' }}>Add Tip</span>
                                </div>
                                {tipAmount > 0 && (
                                    <span style={{ fontSize: 14, color: '#22c55e' }}>+{formatCurrency(tipAmount)}</span>
                                )}
                            </div>

                            {!showCustomTip ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {TIP_PRESETS.map((tip) => (
                                        <button
                                            key={tip.percent}
                                            onClick={() => setSelectedTip(tip.percent)}
                                            style={{
                                                padding: '10px 0',
                                                fontSize: 13,
                                                fontWeight: 500,
                                                borderRadius: 8,
                                                color: selectedTip === tip.percent ? '#fff' : '#a1a1aa',
                                                backgroundColor: selectedTip === tip.percent ? '#0ea5e9' : '#27272a',
                                            }}
                                        >
                                            {tip.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Enter custom tip"
                                        value={customTip}
                                        onChange={(e) => setCustomTip(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 14px',
                                            fontSize: 14,
                                            borderRadius: 8,
                                            backgroundColor: '#27272a',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        }}
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShowCustomTip(!showCustomTip);
                                    if (!showCustomTip) setSelectedTip(0);
                                }}
                                style={{
                                    marginTop: 8,
                                    fontSize: 13,
                                    color: '#71717a',
                                    textDecoration: 'underline',
                                }}
                            >
                                {showCustomTip ? 'Use preset' : 'Custom amount'}
                            </button>
                        </div>
                    )}

                    {/* Split Payment */}
                    {paymentMethod === 'card' && (
                        <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <button
                                onClick={() => setShowSplit(!showSplit)}
                                className="flex items-center gap-2"
                                style={{ fontSize: 15, color: '#71717a' }}
                            >
                                <Users style={{ width: 16, height: 16 }} />
                                Split Payment {splitCount > 1 && `(${splitCount} ways)`}
                            </button>

                            {showSplit && (
                                <div className="flex items-center gap-3 mt-3">
                                    <span style={{ fontSize: 14, color: '#a1a1aa' }}>Split</span>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => setSplitCount(num)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 8,
                                                    fontSize: 15,
                                                    fontWeight: 500,
                                                    color: splitCount === num ? '#fff' : '#a1a1aa',
                                                    backgroundColor: splitCount === num ? '#0ea5e9' : '#27272a',
                                                }}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 14, color: '#a1a1aa' }}>ways</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Total Amount */}
                    <div className="text-center" style={{ margin: '24px 0', padding: 28, borderRadius: 16, backgroundColor: '#27272a' }}>
                        <p style={{ fontSize: 15, color: '#71717a', marginBottom: 10 }}>
                            {splitCount > 1 ? `Per Person (${splitCount} ways)` : 'Total Amount'}
                        </p>
                        <p className="font-bold" style={{ fontSize: 44, color: '#0ea5e9' }}>{formatCurrency(perPersonAmount)}</p>
                        {splitCount > 1 && (
                            <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>
                                Total: {formatCurrency(totalWithTip)}
                            </p>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div>
                        <p style={{ fontSize: 15, color: '#71717a', marginBottom: 14 }}>Payment Method</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className="flex items-center justify-center gap-3 font-semibold"
                                style={{
                                    height: 52,
                                    fontSize: 15,
                                    borderRadius: 12,
                                    color: paymentMethod === 'card' ? '#fff' : '#71717a',
                                    backgroundColor: paymentMethod === 'card' ? '#0ea5e9' : '#27272a'
                                }}
                            >
                                <CreditCard style={{ width: 20, height: 20 }} />
                                Card
                            </button>
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className="flex items-center justify-center gap-3 font-semibold"
                                style={{
                                    height: 52,
                                    fontSize: 15,
                                    borderRadius: 12,
                                    color: paymentMethod === 'cash' ? '#fff' : '#71717a',
                                    backgroundColor: paymentMethod === 'cash' ? '#0ea5e9' : '#27272a'
                                }}
                            >
                                <Banknote style={{ width: 20, height: 20 }} />
                                Cash
                            </button>
                        </div>

                        {/* Clover connection status */}
                        {paymentMethod === 'card' && cloverConnected === false && (
                            <button
                                onClick={handleConnectClover}
                                className="w-full flex items-center justify-center gap-2 font-medium mt-4"
                                style={{
                                    height: 44,
                                    fontSize: 14,
                                    color: '#f59e0b',
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                }}
                            >
                                <ExternalLink style={{ width: 16, height: 16 }} />
                                Connect to Clover for card payments
                            </button>
                        )}

                        {paymentMethod === 'card' && cloverConnected === true && (
                            <div
                                className="flex items-center justify-center gap-2 mt-4"
                                style={{
                                    height: 44,
                                    fontSize: 14,
                                    color: '#22c55e',
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: 10,
                                }}
                            >
                                <Check style={{ width: 16, height: 16 }} />
                                Clover connected
                            </div>
                        )}

                        {error && (
                            <div
                                className="mt-4 text-center"
                                style={{
                                    padding: 12,
                                    fontSize: 14,
                                    color: '#ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 10,
                                }}
                            >
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-4" style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={onClose} className="flex-1 font-semibold hover:bg-zinc-600" style={{ height: 52, fontSize: 16, color: '#fff', backgroundColor: '#3f3f46', borderRadius: 14 }}>Cancel</button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 font-semibold hover:brightness-110"
                        style={{
                            height: 52,
                            fontSize: 16,
                            color: '#fff',
                            backgroundColor: '#0ea5e9',
                            borderRadius: 14,
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        <Check style={{ width: 20, height: 20 }} />
                        {isProcessing ? 'Processing...' : 'Complete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
