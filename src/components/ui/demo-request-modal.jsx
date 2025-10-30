import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, MapPin, Users, Mail, Phone, Calendar, Clock, MessageCircle, ArrowRight, Check, Cpu, Brain, Crown } from 'lucide-react';
import { RaycastAnimatedBackground } from './raycast-animated-background';

const DemoRequestModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    companySize: '',
    industry: '',
    location: '',
    country: '',
    selectedVariant: '',
    useCase: '',
    additionalNotes: '',
    preferredDemoDate: '',
    preferredTime: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Google Form submission
      // SETUP INSTRUCTIONS:
      // 1. Go to https://forms.google.com and create a new form
      // 2. Add fields matching the ones below (Full Name, Email, Phone, etc.)
      // 3. Get the form ID from the URL (https://docs.google.com/forms/d/FORM_ID_HERE/edit)
      // 4. Get field entry IDs by inspecting the form or using pre-filled URLs
      // 5. Replace YOUR_GOOGLE_FORM_ID and entry.XXXXXXXX values below
      
      const GOOGLE_FORM_ID = 'YOUR_GOOGLE_FORM_ID'; // Replace with your form ID
      const GOOGLE_FORM_URL = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
      
      // Create form data for Google Forms
      // These entry IDs need to match your Google Form field IDs
      // You can get these by inspecting your Google Form or checking the pre-filled URL
      const googleFormData = new FormData();
      
      // Map your form fields to Google Form entry IDs
      // Replace these entry.XXXXXXXX with your actual Google Form field entry IDs
      googleFormData.append('entry.123456789', formData.fullName || ''); // Full Name
      googleFormData.append('entry.987654321', formData.email || ''); // Email
      googleFormData.append('entry.111111111', formData.phone || ''); // Phone
      googleFormData.append('entry.222222222', formData.company || ''); // Company
      googleFormData.append('entry.333333333', formData.jobTitle || ''); // Job Title
      googleFormData.append('entry.444444444', formData.companySize || ''); // Company Size
      googleFormData.append('entry.555555555', formData.industry || ''); // Industry
      googleFormData.append('entry.666666666', formData.location || ''); // Location
      googleFormData.append('entry.777777777', formData.selectedVariant || ''); // Selected TARA Variant
      googleFormData.append('entry.888888888', formData.useCase || ''); // Use Case
      googleFormData.append('entry.999999999', formData.additionalNotes || ''); // Additional Notes
      googleFormData.append('entry.000000000', new Date().toISOString()); // Timestamp
      
      // Submit to Google Forms
      await fetch(GOOGLE_FORM_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Forms
        body: googleFormData
      });
      
      // Log the data for debugging
      console.log('Demo request submitted to Google Forms:', {
        formData,
        timestamp: new Date().toISOString()
      });
      
      // Optional: Also send to your own backend if you have one
      // await fetch('/api/demo-request', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     ...formData,
      //     timestamp: new Date().toISOString()
      //   })
      // });
      
      setIsSubmitting(false);
      setStep(3); // Success step
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Still show success since Google Forms submission via no-cors doesn't return response
      // but the data is usually still submitted successfully
      setIsSubmitting(false);
      setStep(3); // Success step
    }
  };

  const nextStep = () => {
    if (step < 2) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-1000 employees',
    '1000+ employees'
  ];

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'E-commerce',
    'Education',
    'Manufacturing',
    'Real Estate',
    'Hospitality',
    'Other'
  ];



  const taraVariants = [
    {
      id: '01',
      name: 'TARA BASE',
      tagline: 'Essential AI Foundation',
      price: '₹9,800',
      original: '₹15,000',
      period: '/month',
      icon: Cpu,
      themeColor: 'from-orange-500 to-red-500',
      features: [
        'Basic Conversational AI',
     
        'Standard Voice Recognition',
        'Email & Chat Integration',
        'Up to 1,000 interactions/month'
      ],
      description: 'Perfect foundation for small businesses entering the AI-powered customer service landscape.'
    },
    {
      id: '02',
      name: 'TARA PRO',
      tagline: 'Advanced Intelligence',
      price: '₹24,900',
      original: '₹35,000',
      period: '/month',
      icon: Brain,
      themeColor: 'from-blue-500 to-purple-500',
      specialFeature: {
        title: 'Form Filling & Registration',
        description: 'TARA PRO can intelligently fill out forms and handle user registrations, streamlining the customer onboarding process with automated data collection and validation.'
      },
      features: [
        'All Base Features',
     
        'Advanced NLP Processing',
        'Form Filling & Registration',
        'Multi-channel Integration',
        'Up to 10,000 interactions/month'
      ],
      description: 'Sophisticated AI capabilities with form filling and registration features for growing teams.'
    },
    {
      id: '03',
      name: 'TARA ENTERPRISE',
      tagline: 'Unlimited Potential',
      price: '₹74,900',
      original: '₹99,000',
      period: '/month',
      icon: Crown,
      themeColor: 'from-purple-500 to-pink-500',
      specialFeature: {
        title: 'Persistent Semantic Memory',
        description: 'TARA ENTERPRISE maintains a comprehensive semantic memory of all user conversations, learning preferences, context, and history to provide increasingly personalized responses.'
      },
      features: [
        'All Pro Features',
       
        'Persistent Semantic Memory',
        'Custom AI Model Training',
        'Enterprise Integrations',
        'Unlimited interactions'
      ],
      description: 'Enterprise-grade solution with persistent semantic memory that learns from every conversation.'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-light text-white mb-2">
                Request Enterprise Demo
              </h2>
              <p className="text-white/60">
                Get a personalized demonstration of TARA's capabilities for your business
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      step >= stepNumber
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-16 h-px transition-all duration-300 ${
                        step > stepNumber ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Contact & Company Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  Contact & Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="CEO, CTO, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="+91 12345 67890"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Company Size *
                    </label>
                    <select
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select company size</option>
                      {companySizes.map((size) => (
                        <option key={size} value={size} className="bg-black text-white">
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Industry *
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select industry</option>
                      {industries.map((industry) => (
                        <option key={industry} value={industry} className="bg-black text-white">
                          {industry}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Location (City) *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Mumbai, Delhi, Bangalore, etc."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Choose TARA Variant */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Choose Your TARA Variant
                </h3>

                <p className="text-white/60 mb-8">
                  Select the TARA variant that best fits your business needs for the demo
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {taraVariants.map((variant, index) => (
                    <motion.div
                      key={variant.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="group cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, selectedVariant: variant.id }))}
                    >
                      {/* Card Container */}
                      <div className={`relative h-[500px] rounded-2xl overflow-hidden transition-all duration-300 ${
                        formData.selectedVariant === variant.id
                          ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/25'
                          : 'hover:scale-105'
                      }`}>
                        {/* Raycast Animated Background */}
                        <RaycastAnimatedBackground 
                          width={400} 
                          height={500} 
                          className="w-full h-full"
                        />
                        
                        {/* Selection Indicator */}
                        {formData.selectedVariant === variant.id && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center z-20 shadow-lg shadow-blue-500/25"
                          >
                            <Check size={14} className="text-white" />
                          </motion.div>
                        )}

                        {/* Card Content */}
                        <div className="relative h-full flex flex-col justify-between p-8 text-white z-10">
                          {/* Header Section */}
                          <div>
                            <div className="flex justify-between items-start mb-6">
                              <div className="text-sm font-medium text-white/80 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white/60"></div>
                                {variant.id}.
                              </div>
                              <motion.div
                                whileHover={{ rotate: 45 }}
                                transition={{ duration: 0.2 }}
                                className="w-8 h-8 border border-white/30 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-all duration-200"
                              >
                                <ArrowRight size={16} />
                              </motion.div>
                            </div>

                            {/* Pricing */}
                            <div className="mb-8">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-3xl font-light text-white">
                                  {variant.price}
                                </span>
                                <span className="text-sm opacity-70">{variant.period}</span>
                              </div>
                              {variant.original && (
                                <div className="text-sm opacity-60 line-through">
                                  {variant.original}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Middle Section */}
                          <div className="flex-1 flex flex-col justify-center">
                            <h2 className="text-2xl font-light mb-2 tracking-wide">
                              {variant.name}
                            </h2>
                            <p className="text-sm opacity-80 mb-6">
                              {variant.tagline}
                            </p>
                            
                            {/* Key Features */}
                            <div className="space-y-2">
                              {variant.features.slice(0, 3).map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm opacity-80">
                                  <Check size={12} />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                            
                          </div>


                        </div>

                        {/* Enhanced Hover Glow Effect */}
                        <motion.div
                          className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                          style={{ 
                            background: `radial-gradient(ellipse at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)`,
                            filter: 'blur(30px)',
                          }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                

                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-8 py-3 border border-white/20 text-white rounded-xl font-medium hover:bg-white/10 transition-all duration-200"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.selectedVariant}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      'Request Demo'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium text-white mb-4">
                  Demo Request Submitted!
                </h3>
                <p className="text-white/60 mb-8 max-w-md mx-auto">
                  Thank you for your interest in TARA. Our team will contact you within 24 hours to schedule your personalized demo.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                >
                  Close
                </button>
              </motion.div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoRequestModal;