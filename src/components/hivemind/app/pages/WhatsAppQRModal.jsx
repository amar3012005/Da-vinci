import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare, RefreshCw, X, Check, WifiOff, Smartphone } from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * WhatsAppQRModal — QR-based device pairing for WhatsApp connector.
 *
 * Flow:
 *  1. POST /api/connectors/whatsapp/qr → renders QR code
 *  2. Poll GET /api/connectors/whatsapp/status every 2s
 *  3. When paired: phone number shown, modal closes with success
 *  4. User can regenerate QR or cancel
 */

export default function WhatsAppQRModal({ onClose, onSuccess }) {
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | qr_ready | paired | error | timeout
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const TIMEOUT_S = 120;

  useEffect(() => {
    mountedRef.current = true;
    startPairing();
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function startPairing() {
    setStatus('loading');
    setErrorMessage(null);
    setQr(null);
    setElapsed(0);

    try {
      const data = await apiClient.whatsappQr();
      if (!mountedRef.current) return;

      if (data.qr) {
        setQr(data.qr);
        setStatus('qr_ready');
        startPolling();
      } else if (data.status === 'generating') {
        // QR still generating — wait and retry
        pollRef.current = setTimeout(() => {
          if (mountedRef.current) fetchQr();
        }, 2000);
      }
    } catch (e) {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(e.response?.data?.error || e.message);
      }
    }
  }

  async function fetchQr() {
    try {
      const data = await apiClient.whatsappQr();
      if (!mountedRef.current) return;
      if (data.qr) {
        setQr(data.qr);
        setStatus('qr_ready');
        startPolling();
      } else {
        setStatus('error');
        setErrorMessage('Failed to generate QR code');
      }
    } catch (e) {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(e.response?.data?.error || e.message);
      }
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollStatus, 2000);
  }

  async function pollStatus() {
    setElapsed(prev => prev + 2);

    try {
      const data = await apiClient.whatsappStatus();
      if (!mountedRef.current) return;

      if (data.paired) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus('paired');
        setPhoneNumber(data.phoneNumber);
        if (onSuccess) onSuccess({ phoneNumber: data.phoneNumber });
      } else if (elapsed >= TIMEOUT_S) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus('timeout');
      }
    } catch (e) {
      // Ignore polling errors — keep trying
    }
  }

  function handleRegenerate() {
    if (pollRef.current) clearInterval(pollRef.current);
    startPairing();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25d366]/10 border border-[#25d366]/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-[#25d366]" />
            </div>
            <div>
              <h2 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">Pair WhatsApp</h2>
              <p className="text-[#a3a3a3] text-[10px] font-mono">
                {status === 'loading' && 'Generating QR...'}
                {status === 'qr_ready' && 'Scan with your phone'}
                {status === 'paired' && 'Connected!'}
                {status === 'timeout' && 'Session expired'}
                {status === 'error' && 'Connection failed'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center">
          {status === 'loading' && (
            <div className="w-56 h-56 bg-[#f3f1ec] rounded-xl flex items-center justify-center">
              <RefreshCw size={32} className="text-[#a3a3a3] animate-spin" />
            </div>
          )}

          {status === 'qr_ready' && qr && (
            <>
              <div className="bg-white border-2 border-[#25d366]/30 rounded-xl p-3 mb-4">
                <QRCodeSVG
                  value={qr}
                  size={200}
                  level="M"
                  fgColor="#075e54"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="flex items-center gap-2 text-[#525252] text-[12px] font-['Space_Grotesk']">
                <Smartphone size={14} className="text-[#25d366]" />
                <span>Open WhatsApp → Linked Devices → Scan QR</span>
              </div>
              <p className="text-[#a3a3a3] text-[10px] font-mono mt-1">
                Expires in {TIMEOUT_S - elapsed}s
              </p>
            </>
          )}

          {status === 'paired' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Check size={28} className="text-[#16a34a]" />
              </div>
              <h3 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">
                WhatsApp Connected
              </h3>
              {phoneNumber && (
                <p className="text-[#a3a3a3] text-[11px] font-mono mt-1">{phoneNumber}</p>
              )}
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0]"
              >
                Done
              </button>
            </div>
          )}

          {status === 'timeout' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <WifiOff size={28} className="text-amber-500" />
              </div>
              <h3 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">
                QR Code Expired
              </h3>
              <p className="text-[#a3a3a3] text-[11px] font-mono mt-1 text-center">
                The pairing window timed out. Generate a new QR code.
              </p>
              <button
                onClick={handleRegenerate}
                className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold font-['Space_Grotesk'] bg-[#25d366] text-white hover:bg-[#1ea952] flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Generate New QR
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                <X size={28} className="text-[#dc2626]" />
              </div>
              <h3 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">
                Connection Failed
              </h3>
              <p className="text-[#a3a3a3] text-[11px] font-mono mt-1 text-center max-w-[240px]">
                {errorMessage || 'An error occurred'}
              </p>
              <button
                onClick={handleRegenerate}
                className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Cancel button for non-terminal states */}
          {status !== 'paired' && (
            <button
              onClick={onClose}
              className="mt-4 text-[#a3a3a3] text-[11px] font-['Space_Grotesk'] hover:text-[#dc2626] hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
