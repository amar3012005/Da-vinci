import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare, RefreshCw, X, Check, WifiOff, Smartphone, AlertTriangle } from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * WhatsAppQRModal — QR-based device pairing for WhatsApp connector.
 *
 * Flow:
 *  1. POST /v1/connectors/whatsapp/qr -> renders QR code
 *  2. Poll GET /v1/connectors/whatsapp/status every 2s
 *  3. When paired: phone number shown, modal closes with success
 *  4. User can regenerate QR or cancel
 */

export default function WhatsAppQRModal({ onClose, onSuccess }) {
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | qr_ready | paired | error | timeout
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState('bot');
  const [selfChatPhone, setSelfChatPhone] = useState('');
  const pollRef = useRef(null);
  const fetchQrRef = useRef(null);
  const mountedRef = useRef(true);
  const elapsedRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  const TIMEOUT_S = 120;

  const pairingPayload = useCallback(() => {
    const normalizedPhone = String(selfChatPhone || '').replace(/\D/g, '');
    if (mode === 'self_chat') {
      return {
        mode,
        allowedUsers: normalizedPhone ? [normalizedPhone] : [],
        pairedPhoneNumber: normalizedPhone || null,
      };
    }

    return { mode: 'bot', allowedUsers: [] };
  }, [mode, selfChatPhone]);

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    setElapsed(prev => {
      const next = prev + 2;
      elapsedRef.current = next;
      return next;
    });

    try {
      const data = await apiClient.whatsappStatus();
      if (!mountedRef.current) return;

      if (data.paired) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus('paired');
        setPhoneNumber(data.phoneNumber);
        if (onSuccess) onSuccess({ phoneNumber: data.phoneNumber });
      } else if (elapsedRef.current >= TIMEOUT_S) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus('timeout');
      }
    } catch (e) {
      // Ignore polling errors — keep trying
    }
  }, [onSuccess]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      pollStatus();
    }, 2000);
  }, [pollStatus]);

  const scheduleQrRetry = useCallback((delayMs = 2000) => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      if (mountedRef.current) fetchQrRef.current?.();
    }, delayMs);
  }, []);

  const fetchQr = useCallback(async () => {
    try {
      const data = await apiClient.whatsappQr(pairingPayload());
      if (!mountedRef.current) return;
      if (data.qr) {
        setQr(data.qr);
        setStatus('qr_ready');
        startPolling();
      } else if (data.status === 'generating') {
        setStatus('loading');
        scheduleQrRetry();
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to generate QR code');
      }
    } catch (e) {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(e.response?.data?.error || e.message);
      }
    }
  }, [pairingPayload, scheduleQrRetry, startPolling]);

  fetchQrRef.current = fetchQr;

  const startPairing = useCallback(async () => {
    if (mode === 'self_chat' && !String(selfChatPhone || '').replace(/\D/g, '')) {
      setStatus('error');
      setErrorMessage('Enter your WhatsApp number before starting self-chat mode.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    setQr(null);
    setElapsed(0);
    elapsedRef.current = 0;
    clearTimers();

    try {
      const data = await apiClient.whatsappQr(pairingPayload());
      if (!mountedRef.current) return;

      if (data.qr) {
        setQr(data.qr);
        setStatus('qr_ready');
        startPolling();
      } else if (data.status === 'generating') {
        scheduleQrRetry();
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to generate QR code');
      }
    } catch (e) {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(e.response?.data?.error || e.message);
      }
    }
  }, [clearTimers, mode, pairingPayload, scheduleQrRetry, selfChatPhone, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    startPairing();
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers, startPairing]);

  function handleRegenerate() {
    clearTimers();
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
          {status !== 'paired' && (
            <div className="w-full mb-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3 text-left">
              <p className="text-[#0a0a0a] text-[11px] font-semibold font-['Space_Grotesk']">
                WhatsApp setup for HIVEMIND
              </p>
              <p className="mt-1 text-[#525252] text-[11px] font-['Space_Grotesk'] leading-5">
                This pairs a real WhatsApp account through WhatsApp Web. No Meta Business API account is required.
              </p>
              <div className="mt-3 grid gap-2 text-[11px] text-[#525252] font-['Space_Grotesk']">
                <div>
                  <span className="font-semibold text-[#0a0a0a]">Recommended:</span> use a dedicated number for the bot.
                </div>
                <div>
                  <span className="font-semibold text-[#0a0a0a]">Testing:</span> pair your own account and message yourself.
                </div>
                <div>
                  <span className="font-semibold text-[#0a0a0a]">Usage:</span> keep it conversational and avoid bulk outbound messaging.
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8b857c]">Mode</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('bot')}
                      className={`rounded-xl border px-3 py-2 text-left text-[11px] font-['Space_Grotesk'] transition ${
                        mode === 'bot'
                          ? 'border-[#0a0a0a] bg-white text-[#0a0a0a]'
                          : 'border-[#e3e0db] bg-[#f8f6f1] text-[#525252]'
                      }`}
                    >
                      <div className="font-semibold">Bot number</div>
                      <div className="mt-1 text-[10px] leading-4 opacity-80">Best for a shared assistant line.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('self_chat')}
                      className={`rounded-xl border px-3 py-2 text-left text-[11px] font-['Space_Grotesk'] transition ${
                        mode === 'self_chat'
                          ? 'border-[#0a0a0a] bg-white text-[#0a0a0a]'
                          : 'border-[#e3e0db] bg-[#f8f6f1] text-[#525252]'
                      }`}
                    >
                      <div className="font-semibold">Self-chat</div>
                      <div className="mt-1 text-[10px] leading-4 opacity-80">Only your own number can talk to HIVE.</div>
                    </button>
                  </div>
                </div>
                {mode === 'self_chat' && (
                  <label className="block">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8b857c]">Your WhatsApp number</p>
                    <input
                      type="tel"
                      value={selfChatPhone}
                      onChange={(e) => setSelfChatPhone(e.target.value)}
                      placeholder="+491234567890"
                      className="mt-2 w-full rounded-xl border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none transition focus:border-[#0a0a0a]"
                    />
                    <p className="mt-1 text-[10px] text-[#8b857c] font-['Space_Grotesk']">
                      Used to reject other chats after pairing.
                    </p>
                  </label>
                )}
              </div>
            </div>
          )}

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
              <div className="mt-4 w-full rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
                  <p className="text-[10px] leading-5 text-amber-800 font-['Space_Grotesk']">
                    This uses an unofficial WhatsApp Web integration. For lower risk, use a dedicated phone number and avoid spammy or unsolicited outbound messaging.
                  </p>
                </div>
              </div>
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
