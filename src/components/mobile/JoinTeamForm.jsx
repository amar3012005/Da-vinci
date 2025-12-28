import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, ArrowLeft } from 'lucide-react';

const JoinTeamForm = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        email: '',
        isHannoverResident: false,
        expertise: [],
        contribution: '',
        leapOfFaith: null
    });

    const expertiseOptions = [
        'Technical Development',
        'Finance',
        'Marketing & Advertising'
    ];

    const toggleExpertise = (option) => {
        setFormData(prev => {
            if (prev.expertise.includes(option)) {
                return { ...prev, expertise: prev.expertise.filter(e => e !== option) };
            } else {
                return { ...prev, expertise: [...prev.expertise, option] };
            }
        });
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleSubmit = () => {
        if (!formData.leapOfFaith) {
            onClose(); // Return to homepage
            return;
        }

        const subject = encodeURIComponent("DAVINCI-AI / JOIN TEAM");
        const bodyContent = `
Name: ${formData.name}
Mobile: ${formData.mobile}
Email: ${formData.email}
Resident of Hannover: ${formData.isHannoverResident ? 'Yes' : 'No'}
Expertise: ${formData.expertise.join(', ')}
Contribution: ${formData.contribution}
Leap of Faith: YES
        `;

        const body = encodeURIComponent(bodyContent);

        // Check if mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // Mobile: Use standard mailto to trigger native app
            window.location.href = `mailto:amarsai2005@gmail.com?subject=${subject}&body=${body}`;
        } else {
            // Desktop: Open Gmail Web in new tab (avoids opening local clients like Thunderbird)
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=amarsai2005@gmail.com&su=${subject}&body=${body}`;
            window.open(gmailUrl, '_blank');
        }
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0
        })
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[200] bg-[#0a0a0a] overflow-hidden flex flex-col"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                >
                    {/* Background Dots */}
                    <div
                        className="fixed inset-0 pointer-events-none opacity-20"
                        style={{
                            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                        }}
                    />

                    {/* Header Bar */}
                    <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-white/40">APPLICATION</span>
                            <span className="text-white font-mono text-sm">STEP {step} / 3</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/5 border border-white/10 rounded-full text-white/50 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/5 h-1">
                        <motion.div
                            className="bg-[#A63E1B] h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 relative">
                        <div className="max-w-md mx-auto h-full flex flex-col justify-center">

                            <AnimatePresence mode="wait" custom={step}>
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        custom={step}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-light text-white mb-2">CONTACT INFO</h2>
                                            <p className="text-white/40 text-xs text-center">Let's get to know you.</p>
                                        </div>

                                        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">1. Full Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                                                    placeholder="Enter your name"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">2. Mobile Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.mobile}
                                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                                                    placeholder="+49 ..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">3. Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
                                                    placeholder="name@example.com"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        custom={step}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-light text-white mb-2">YOUR SKILLS</h2>
                                            <p className="text-white/40 text-xs text-center">How can you help build the future?</p>
                                        </div>

                                        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl space-y-6">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Expertise</label>
                                                <div className="flex flex-col gap-2">
                                                    {expertiseOptions.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => toggleExpertise(option)}
                                                            className={`text-left p-3 rounded-lg border text-sm transition-all ${formData.expertise.includes(option)
                                                                ? 'bg-white/10 border-white/40 text-white'
                                                                : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Contribution Brief</label>
                                                <textarea
                                                    value={formData.contribution}
                                                    onChange={(e) => setFormData({ ...formData, contribution: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/40 focus:outline-none transition-colors h-32 resize-none"
                                                    placeholder="Write a short brief..."
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        custom={step}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-light text-white mb-2">FINAL CHECK</h2>
                                            <p className="text-white/40 text-xs text-center">Are you ready to join?</p>
                                        </div>

                                        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl space-y-6">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Location</label>
                                                <button
                                                    onClick={() => setFormData({ ...formData, isHannoverResident: !formData.isHannoverResident })}
                                                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${formData.isHannoverResident
                                                        ? 'bg-white/10 border-white/40'
                                                        : 'bg-black/20 border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    <span className="text-sm text-white">Resident of Hannover</span>
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isHannoverResident ? 'bg-white border-white' : 'border-white/30'
                                                        }`}>
                                                        {formData.isHannoverResident && <Check size={14} className="text-black" />}
                                                    </div>
                                                </button>
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">I AM WILLING TO TAKE A LEAP OF FAITH</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setFormData({ ...formData, leapOfFaith: true })}
                                                        className={`p-4 rounded-xl border text-center transition-all ${formData.leapOfFaith === true
                                                            ? 'bg-[#A63E1B] border-[#A63E1B] text-white shadow-[0_0_15px_rgba(166,62,27,0.4)]'
                                                            : 'bg-black/20 border-white/10 text-white/40'
                                                            }`}
                                                    >
                                                        <span className="text-lg font-bold">YES</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, leapOfFaith: false })}
                                                        className={`p-4 rounded-xl border text-center transition-all ${formData.leapOfFaith === false
                                                            ? 'bg-white/10 border-white text-white'
                                                            : 'bg-black/20 border-white/10 text-white/40'
                                                            }`}
                                                    >
                                                        <span className="text-lg font-bold">NO</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer Nav */}
                    <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-md flex gap-4">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-4 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="flex-1 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                            >
                                NEXT STEP
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={formData.leapOfFaith === null}
                                className={`flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${formData.leapOfFaith === true
                                    ? 'bg-white text-black hover:bg-gray-200'
                                    : formData.leapOfFaith === false
                                        ? 'bg-transparent border border-white/20 text-white/60 hover:text-white'
                                        : 'bg-white/10 text-white/20 cursor-not-allowed'
                                    }`}
                            >
                                {formData.leapOfFaith === false ? "RETURN TO HOMEPAGE" : "SUBMIT APPLICATION"}
                            </button>
                        )}
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default JoinTeamForm;
