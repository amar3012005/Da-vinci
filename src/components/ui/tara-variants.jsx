import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Cpu, Crown, ArrowRight, Check, FileText, Brain, Database } from 'lucide-react';
import { RaycastAnimatedBackground } from './raycast-animated-background';

const TaraVariants = () => {
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [0, 1000], [0, -100]);
  
  const taraModels = [
    {
      id: '01',
      name: 'TARA BASE',
      tagline: 'Essential AI Foundation',
      price: '₹9,800',
      original: '₹15,000',
      period: '/month',
      icon: MessageCircle,
      theme: {
        accent: 'from-orange-500 to-red-500',
        border: 'border-orange-500/30',
        glow: 'rgba(251, 146, 60, 0.4)',
        textAccent: 'text-orange-400',
        bgOverlay: 'bg-orange-500/10'
      },
      features: [
        'Basic Conversational AI',
        '5 Indian Languages',
        'Standard Voice Recognition',
        'Email & Chat Integration',
        'Up to 1,000 interactions/month'
      ],
      description: 'Perfect foundation for small businesses entering the AI-powered customer service landscape.'
    },
    {
      id: '02',
      name: 'TARA PRO',
      tagline: 'Advanced Intelligence + Form Automation',
      price: '₹24,900',
      original: '₹35,000',
      period: '/month',
      icon: FileText,
      theme: {
        accent: 'from-blue-500 to-purple-500',
        border: 'border-blue-500/30',
        glow: 'rgba(59, 130, 246, 0.4)',
        textAccent: 'text-blue-400',
        bgOverlay: 'bg-blue-500/10'
      },
      features: [
        'All Base Features',
        '15+ Indian Languages',
        'Advanced NLP Processing',
        'Smart Form Filling & Registration',
        'Multi-channel Integration',
        'Up to 10,000 interactions/month'
      ],
      specialFeature: {
        title: 'Intelligent Form Processing',
        description: 'TARA PRO can automatically fill forms, handle user registrations, collect KYC documents, and process complex multi-step applications with zero human intervention.'
      },
      description: 'Sophisticated AI capabilities with intelligent form automation - TARA can handle user registrations, fill forms, and manage complex data collection processes automatically.'
    },
    {
      id: '03',
      name: 'TARA ENTERPRISE',
      tagline: 'Unlimited Potential + Persistent Memory',
      price: '₹74,900',
      original: '₹99,000',
      period: '/month',
      icon: Brain,
      theme: {
        accent: 'from-purple-500 to-pink-500',
        border: 'border-purple-500/30',
        glow: 'rgba(168, 85, 247, 0.4)',
        textAccent: 'text-purple-400',
        bgOverlay: 'bg-purple-500/10'
      },
      features: [
        'All Pro Features',
        'Unlimited Languages',
        'Persistent Semantic Memory',
        'Custom AI Model Training',
        'Enterprise Integrations',
        'Unlimited interactions'
      ],
      specialFeature: {
        title: 'Persistent Semantic Memory',
        description: 'TARA ENTERPRISE maintains a comprehensive semantic memory of all user conversations, learning preferences, context, and history to provide increasingly personalized and intelligent responses over time.'
      },
      description: 'Enterprise-grade solution with persistent semantic memory that remembers and learns from every user conversation, providing deeply personalized experiences across all interactions.'
    }
  ];

  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ y: yTransform }}
    >
      <div className="container mx-auto px-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-6xl md:text-7xl font-light text-white mb-8">
        
          </h2>
          <div className="w-24 h-px bg-white/30 mx-auto mb-6"></div>
          <p className="text-xl text-white/60 max-w-4xl mx-auto leading-relaxed">
           
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {taraModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
              {/* Card Container */}
              <div className="relative h-[500px] rounded-2xl overflow-hidden">
                {/* Raycast Animated Background */}
                <RaycastAnimatedBackground 
                  width={400} 
                  height={500} 
                  className="w-full h-full"
                />

                {/* Card Content */}
                <div className="relative h-full flex flex-col justify-between p-8 text-white z-10">
                  {/* Header Section */}
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-sm font-medium text-white/80 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/60"></div>
                        {model.id}.
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
                          {model.price}
                        </span>
                        <span className="text-sm opacity-70">{model.period}</span>
                      </div>
                      {model.original && (
                        <div className="text-sm opacity-60 line-through">
                          {model.original}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Section */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-2xl font-light mb-2 tracking-wide">
                      {model.name}
                    </h2>
                    <p className="text-sm opacity-80 mb-6">
                      {model.tagline}
                    </p>
                    
                    {/* Key Features */}
                    <div className="space-y-2">
                      {model.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm opacity-80">
                          <div className="w-3 h-3 rounded-full bg-white/60 flex items-center justify-center">
                            <Check size={8} className="text-white" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div>
                    
                  </div>
                </div>

                {/* Enhanced Hover Glow Effect */}
                <motion.div
                  className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                  style={{ 
                    background: `radial-gradient(ellipse at center, ${model.theme.glow} 0%, transparent 70%)`,
                    filter: 'blur(30px)',
                  }}
                ></motion.div>
                
                {/* Additional Animated Border Effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(45deg, transparent 30%, ${model.theme.glow.replace('0.4', '0.2')} 50%, transparent 70%)`,
                    backgroundSize: '200% 200%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                ></motion.div>
                
                {/* Pulsing Ring Effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
                  style={{
                    border: `1px solid ${model.theme.glow.replace('0.4', '0.6')}`,
                  }}
                  animate={{
                    scale: [1, 1.02, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                ></motion.div>
              </div>

              {/* Card Description */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.2 + 0.5 }}
                viewport={{ once: true }}
                className="mt-6 px-2"
              >
                <p className="text-white/60 text-sm leading-relaxed">
                  {model.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-light text-white mb-4">
              Need Something Different?
            </h3>
            <p className="text-white/60 mb-8 leading-relaxed">
              Our team can craft a custom TARA solution tailored specifically to your unique business requirements and industry needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 border border-white/20 rounded-xl text-white font-medium hover:bg-white/10 transition-all duration-200"
              >
                Join Waitlist
              </motion.button>
              
            </div>
          </div>
        </motion.div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </motion.section>
  );
};

export default TaraVariants;