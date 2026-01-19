import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, MessageCircle, Play, Mic, PhoneOff, Cpu, Brain, Crown, ArrowRight, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Orb } from './orb';
import { Message } from './message-ui';
import { useConversation } from '@elevenlabs/react';

const DemoPortal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('pin'); // 'pin', 'grid', 'call'
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(1); // 0, 1, 2
  const [showTranscript, setShowTranscript] = useState(false);

  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentState, setAgentState] = useState(null); // 'listening', 'talking', 'thinking'
  const [transcript, setTranscript] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [micStream, setMicStream] = useState(null);

  const callTimerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ElevenLabs SDK
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsCallActive(true);
      setAgentState('listening');
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    },
    onDisconnect: () => {
      console.log('Disconnected');
      setIsCallActive(false);
      setAgentState(null);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setMicStream(null);
      setUserVolume(0);
    },
    onMessage: (message) => {
      if (message.message) {
        setTranscript(prev => [...prev, {
          role: message.source === 'ai' ? 'agent' : 'user',
          text: message.message
        }]);
      }
    },
    onError: (error) => {
      console.error('Neural Link Error:', error);
      setIsCallActive(false);
      setAgentState(null);
    }
  });

  const { isSpeaking, status } = conversation;

  // Volume Analyzer Logic for Responsive Orb
  useEffect(() => {
    if (!micStream) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(micStream);
    source.connect(analyser);
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Normalize to 0-1 range for the Orb. Boost sensitivity.
      setUserVolume(Math.min(1, average / 30));
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContext.close();
    };
  }, [micStream]);

  // Sync agentState with SDK status
  useEffect(() => {
    if (status === 'connected') {
      setAgentState(isSpeaking ? 'talking' : 'listening');
    } else if (status === 'connecting') {
      setAgentState('thinking');
    } else {
      setAgentState(null);
    }
  }, [isSpeaking, status]);

  const TARA_VARIANTS = [
    {
      id: '01',
      name: 'Lexi',
      org: 'B&B',
      tagline: 'Precision Italian Engineering',
      languages: ['German', 'English'],
      icon: Cpu,
      agentId: 'agent_9201kezh527fecmbqqrnxtsj172z',
      theme: 'from-orange-500 to-red-500',
      glow: 'rgba(239, 68, 68, 0.4)'
    },
    {
      id: '02',
      name: 'Tara',
      org: 'DAVINCI',
      tagline: 'Technical Heritage & Innovation',
      languages: ['English', 'German'],
      icon: Brain,
      agentId: 'agent_9901kezhb55yfr39m2d7kqnttyc0',
      theme: 'from-blue-500 to-purple-500',
      glow: 'rgba(59, 130, 246, 0.4)'
    },
    {
      id: '03',
      name: 'MIA',
      org: 'TRANSLATION HUB',
      tagline: 'Multilingual Bridge',
      languages: ['English', 'Hindi', 'German'],
      icon: Crown,
      agentId: 'agent_9201kezh527fecmbqqrnxtsj172z',
      theme: 'from-purple-500 to-pink-500',
      glow: 'rgba(168, 85, 247, 0.4)'
    }
  ];

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === '000000') {
      setStep('grid');
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AUDIO LOGIC (Direct Relay or Mock)
  // ═══════════════════════════════════════════════════════════════

  const startCall = async (agent) => {
    setTranscript([]);
    setCallDuration(0);
    try {
      // Request mic permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // Start session with public agent ID
      await conversation.startSession({
        agentId: agent.agentId,
      });
    } catch (err) {
      console.error("Initiation failed:", err);
      alert("Neural handshake failed. Please ensure mic access is granted and agent is public.");
    }
  };

  const endCall = async () => {
    await conversation.endSession();
  };


  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-3xl bg-black border border-white/20 rounded-none overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-[75vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 md:p-8 border-bottom border-white/5 bg-black/20">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-none flex items-center justify-center border border-white/10">
                <Sparkles size={16} className="text-blue-400 md:size-20" />
              </div>
              <div>
                <h3 className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.3em]">TARA Demo Portal</h3>
                <p className="text-[8px] md:text-[9px] font-mono text-white/30 uppercase tracking-widest">Authorized Personnel Only</p>
              </div>
            </div>
            {/* NO X CLOSING SIGN AS REQUESTED */}
          </div>

          <div className="flex-1 overflow-hidden relative">
            {/* NO BACKGROUND EFFECT */}

            {/* CONTENT STEPS */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center pb-16 md:pb-24 p-8">

              {/* STEP 1: PIN ENTRY */}
              {step === 'pin' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm text-center"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 border border-blue-500/20">
                    <Lock size={28} className="text-blue-400 md:size-32" />
                  </div>
                  <h2 className="text-[10px] md:text-[12px] font-black text-white uppercase tracking-[0.4em] mb-2">Access Code Required</h2>
                  <p className="text-white/40 text-[8px] md:text-[9px] uppercase tracking-widest mb-6 md:mb-8">Enter your 6-digit demo authorization code</p>

                  <form onSubmit={handlePinSubmit} className="flex flex-col items-center space-y-4 md:space-y-6">
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      placeholder="------"
                      className={`w-full bg-white/5 border ${pinError ? 'border-red-500/50' : 'border-white/10'} rounded-none p-3 md:p-4 text-center text-2xl md:text-3xl tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all font-black`}
                      autoFocus
                    />
                    {pinError && <p className="text-red-400 text-[9px] uppercase tracking-widest">Invalid authorization code.</p>}
                    <button
                      type="submit"
                      className="px-16 py-3.5 md:py-4 bg-[#e5e5e5] text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] relative overflow-hidden hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-8 md:mt-12"
                    >
                      <span className="relative z-10">Unlock Access</span>
                      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black opacity-20" />
                      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-black opacity-20" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* STEP 2: AGENT GRID */}
              {step === 'grid' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center"
                >
                  <p className="text-white/40 text-[9px] font-mono uppercase tracking-[0.3em] text-center mb-12 max-w-xl">
                    Welcome, <span className="text-white font-black">Architect</span>. Select a TARA variant to initiate neural handshake.
                  </p>

                  <div className="relative w-full max-w-sm flex items-center justify-center">
                    {/* Navigation Left */}
                    <button
                      onClick={() => setCurrentSlide(prev => (prev > 0 ? prev - 1 : TARA_VARIANTS.length - 1))}
                      className="absolute -left-12 p-3 text-white/20 hover:text-white transition-colors z-20"
                    >
                      <ChevronLeft size={32} strokeWidth={1} />
                    </button>

                    <div className="w-full overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentSlide}
                          initial={{ x: 50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -50, opacity: 0 }}
                          className="w-full"
                        >
                          <div className="group relative h-[320px] md:h-[360px] bg-white/[0.03] border border-white/10 rounded-none p-6 md:p-10 flex flex-col justify-between overflow-hidden">
                            <div>
                              <div className="flex items-center justify-between mb-6 md:mb-8 pb-3 md:pb-4 border-b border-white/10">
                                <span className="text-[10px] md:text-[12px] font-black text-white uppercase tracking-[0.3em]">
                                  {TARA_VARIANTS[currentSlide].org}
                                </span>
                                <span className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                                  MOD_{TARA_VARIANTS[currentSlide].id}
                                </span>
                              </div>
                              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-none border border-white/10 flex items-center justify-center mb-6 md:mb-8">
                                {React.createElement(TARA_VARIANTS[currentSlide].icon, { size: 20, className: "text-white/80 md:size-24" })}
                              </div>
                              <h4 className="text-[16px] md:text-[18px] font-black text-white mb-1 md:mb-2 uppercase tracking-[0.2em]">
                                {TARA_VARIANTS[currentSlide].name}
                              </h4>
                              <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest leading-relaxed mb-3 md:mb-4">
                                {TARA_VARIANTS[currentSlide].tagline}
                              </p>
                              <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-4">
                                {TARA_VARIANTS[currentSlide].languages.map((lang, idx) => (
                                  <span key={idx} className="text-[7px] md:text-[8px] font-mono py-0.5 md:py-1 px-1.5 md:px-2 border border-white/10 text-white/60 uppercase tracking-tighter">
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedAgent(TARA_VARIANTS[currentSlide]);
                                setStep('call');
                              }}
                              className="w-full py-4 bg-[#e5e5e5] text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white transition-all relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] mt-6 md:mt-8"
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                Request Demo <ArrowRight className="w-3 h-3 md:w-3 md:h-3 stroke-[3px]" />
                              </span>
                              <div className="absolute top-0 right-0 w-2 h-2 bg-black opacity-20" />
                              <div className="absolute bottom-0 left-0 w-2 h-2 bg-black opacity-20" />
                            </button>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Navigation Right */}
                    <button
                      onClick={() => setCurrentSlide(prev => (prev < TARA_VARIANTS.length - 1 ? prev + 1 : 0))}
                      className="absolute -right-12 p-3 text-white/20 hover:text-white transition-colors z-20"
                    >
                      <ChevronRight size={32} strokeWidth={1} />
                    </button>
                  </div>

                  {/* Pagination Dots */}
                  <div className="flex gap-2 mt-12">
                    {TARA_VARIANTS.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-white' : 'w-4 bg-white/10'}`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: CONVERSATIONAL CALL */}
              {step === 'call' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col items-center relative pt-12 md:pt-20"
                >
                  {/* TOP SECTION: ORB & IDENTITY */}
                  <div className="flex-1 flex flex-col items-center justify-center -mt-12 md:-mt-16 w-full">
                    {/* ORB SECTION */}
                    <div className="w-32 h-32 md:w-48 md:h-48 relative mb-8 md:mb-10">
                      <Orb
                        agentState={agentState}
                        volumeMode="manual"
                        manualInput={userVolume}
                        manualOutput={isSpeaking ? (0.6 + Math.random() * 0.4) : 0}
                        colors={["#CADCFC", "#A0B9D1"]}
                      />
                    </div>

                    <div className="text-center mb-8 md:mb-16">
                      {!isCallActive ? (
                        <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
                          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white/20" />
                          <span className="text-[10px] md:text-[12px] font-black text-white/40 uppercase tracking-[0.4em]">
                            Neural Link Ready
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
                          <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                          <span className="text-[10px] md:text-[12px] font-black text-white uppercase tracking-[0.4em]">
                            {status === 'connecting' ? 'Establishing Link...' :
                              isSpeaking ? 'Incoming Transmission' :
                                status === 'connected' ? 'Awaiting Input' :
                                  'Handshaking...'}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <div className="px-2 md:px-2.5 py-0.5 md:py-1 bg-white/5 border border-white/10 mb-2 md:mb-2.5">
                          <p className="text-[9px] md:text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">{selectedAgent?.org}</p>
                        </div>
                        <h3 className="text-[18px] md:text-[20px] font-black text-white uppercase tracking-[0.3em] mb-1 md:mb-1.5">{selectedAgent?.name}</h3>
                      </div>
                      {isCallActive && (
                        <p className="text-[10px] md:text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</p>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM SECTION: CONTROLS (Positioned at ~3/4 height) */}
                  <div className="h-[25%] flex items-start justify-center w-full">
                    <div className="flex items-center gap-4 md:gap-6">
                      {!isCallActive ? (
                        <button
                          onClick={() => startCall(selectedAgent)}
                          className="py-4 md:py-4 px-14 md:px-16 bg-white text-black text-[10px] md:text-[10px] font-black uppercase tracking-[0.3em] relative overflow-hidden hover:bg-blue-400 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                          <span className="relative z-10 flex items-center gap-2 md:gap-2.5">
                            <Play size={14} fill="black" className="md:size-14" /> Start Call
                          </span>
                          <div className="absolute top-0 right-0 w-2 h-2 bg-black opacity-10" />
                          <div className="absolute bottom-0 left-0 w-2 h-2 bg-black opacity-10" />
                        </button>
                      ) : (
                        <>
                          {/* TERMINATE */}
                          <button
                            onClick={endCall}
                            className="py-3 md:py-4 px-8 md:px-10 bg-red-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] relative overflow-hidden hover:bg-red-600 transition-all shadow-lg"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <PhoneOff size={12} className="md:size-14" /> End Call
                            </span>
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black opacity-20" />
                            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-black opacity-20" />
                          </button>

                          {/* CHAT TOGGLE */}
                          <button
                            onClick={() => setShowTranscript(true)}
                            className="p-3 md:p-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
                          >
                            <MessageCircle size={18} className="text-white/60 group-hover:text-white md:size-20" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* OVERLAY TRANSCRIPT */}
                  <AnimatePresence>
                    {showTranscript && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 z-50 bg-black flex flex-col border border-white/20 p-8"
                      >
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Neural Link Transcript</span>
                          <button
                            onClick={() => setShowTranscript(false)}
                            className="p-2 hover:bg-white/10 transition-colors"
                          >
                            <X size={20} className="text-white/60" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-2">
                          {transcript.length === 0 && (
                            <div className="h-full flex items-center justify-center text-white/5 text-[9px] text-center p-8 uppercase tracking-[0.4em] font-black">
                              HANDSHAKE_ESTABLISHED // WAITING_FOR_DATA
                            </div>
                          )}
                          {transcript.map((msg, i) => (
                            <Message key={i} from={msg.role} missionName={selectedAgent?.name}>
                              {msg.text}
                            </Message>
                          ))}
                          <div ref={transcriptEndRef} />
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                          <p className="text-[9px] font-mono text-white/20 leading-relaxed uppercase tracking-widest">
                            V1.0.4 // AGENT: {selectedAgent?.id} // SECURE_HANDSHAKE
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* BOTTOM INFO BAR */}
                  {!showTranscript && (
                    <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-center opacity-30">
                      <p className="text-[8px] font-mono text-white/40 uppercase tracking-[0.2em]">
                        LATENCY: 124MS // SAMPLING: 16KHZ // ENCRYPTED
                      </p>
                      <p className="text-[8px] font-mono text-white/40 uppercase tracking-[0.2em]">
                        V1.04_RELAY
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
};

export default DemoPortal;