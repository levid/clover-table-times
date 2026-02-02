'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, ExternalLink } from 'lucide-react';

interface CloverStatus {
    configured: boolean;
    connected: boolean;
    merchant?: { id: string; name: string };
}

export function CloverStatusIndicator() {
    const [status, setStatus] = useState<CloverStatus | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkStatus = useCallback(async () => {
        setIsChecking(true);
        try {
            const res = await fetch('/api/clover/status');
            const data = await res.json();
            setStatus(data);
        } catch {
            setStatus({ configured: false, connected: false });
        }
        setIsChecking(false);
    }, []); // Empty dependency array means this function is created once

    useEffect(() => {
        const initStatusCheck = async () => {
            await checkStatus();
        };
        initStatusCheck();

        // Re-check every 60 seconds
        const interval = setInterval(checkStatus, 60000);
        return () => clearInterval(interval);
    }, [checkStatus]); // Add checkStatus to the dependency array

    const handleReconnect = () => {
        window.location.href = '/api/clover/oauth';
    };

    if (!status) return null;

    if (!status.configured) {
        return (
            <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(161, 161, 170, 0.1)' }}
            >
                <WifiOff style={{ width: 14, height: 14, color: '#71717a' }} />
                <span style={{ fontSize: 12, color: '#71717a' }}>Clover not configured</span>
            </div>
        );
    }

    if (status.connected) {
        return (
            <div
                className="flex items-center cursor-pointer hover:brightness-110"
                style={{
                    gap: 10,
                    padding: '10px 18px',
                    borderRadius: 24,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
                onClick={checkStatus}
                title={status.merchant?.name || 'Connected'}
            >
                <Wifi style={{ width: 14, height: 14, color: '#22c55e' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>
                    {status.connected ? 'Connected' : 'Not connected'}
                </span>
                {isChecking && <RefreshCw style={{ width: 12, height: 12, color: '#22c55e', animation: 'spin 1s linear infinite' }} />}
            </div>
        );
    }

    return (
        <button
            onClick={handleReconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:brightness-110"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
        >
            <WifiOff style={{ width: 14, height: 14, color: '#f59e0b' }} />
            <span style={{ fontSize: 12, color: '#f59e0b' }}>Reconnect Clover</span>
            <ExternalLink style={{ width: 12, height: 12, color: '#f59e0b' }} />
        </button>
    );
}
