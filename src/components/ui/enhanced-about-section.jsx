import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Plus } from 'lucide-react';

const TextReveal = ({ children, className = "", delay = 0 }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
      >
        {children}
      </motion.div>
    </div>
  );
};


function EnhancedAboutSection() {
  const { scrollY } = useScroll();
  const scaleTransform = useTransform(scrollY, [1400, 2000], [0.9, 1.1]);

  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ scale: scaleTransform }}
    >
      <div className="container mx-auto px-16 relative z-10">
        
        {/* Header */}
        <TextReveal>
          <div className="flex justify-between items-start mb-20">
            {/* Left - Plus icon and About label */}
            <div className="space-y-8">
              <motion.div 
                className="w-12 h-12 border border-white/30 flex items-center justify-center cursor-pointer"
                whileHover={{ rotate: 90, borderColor: "rgba(255,255,255,0.6)" }}
                transition={{ duration: 0.3 }}
              >
                <Plus className="w-6 h-6 text-white/70" />
              </motion.div>
              
              <div>
                <div className="text-white/50 font-mono text-sm uppercase tracking-wider mb-4">
                  About
                </div>
                
                {/* Founder avatar */}
                <div className="flex -space-x-3">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-full border-2 border-white/20"
                    whileHover={{ scale: 1.2, zIndex: 10 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            </div>

            {/* Right - About title */}
            <div className="text-right">
              <div className="text-white/40 font-mono text-sm mb-4">
                Da'vinci Solutions
              </div>
              <h2 className="text-8xl font-light text-white mb-8">
                About Us
              </h2>
            </div>
          </div>
        </TextReveal>

        {/* About Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left - About Da'vinci Solutions */}
          <TextReveal>
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl font-light text-white mb-4">
                  About Da'vinci Solutions
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  Founded by Amar Sai, Da'vinci Solutions aims to revolutionize enterprise automation for India and global markets.
                </p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Vision
                  </div>
                  <div className="text-white text-lg font-light">Build AI agents that understand, support, and empower every user in their own language.</div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Expertise
                  </div>
                  <div className="text-white text-lg font-light">Conversational AI, multilingual voice assistants, streamlined enterprise automation.</div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Impact
                  </div>
                  <div className="text-white text-lg font-light">Enabling businesses—large and small—to deliver truly human, scalable, and cost-effective support.</div>
                </div>
              </div>
            </div>
          </TextReveal>

          {/* Right - Founder Contact */}
          <TextReveal>
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl font-light text-white mb-4">
                  Contact the Founder
                </h3>
                <p className="text-white/60 text-lg">
                  Get in touch with Amar Sai
                </p>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="space-y-6">
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Name
                    </div>
                    <div className="text-white text-xl font-medium">Amar Sai</div>
                  </div>
                  
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Email
                    </div>
                    <div className="text-white text-lg font-light">amarsai2005@gmail.com</div>
                  </div>
                  
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Current Education
                    </div>
                    <div className="text-white text-lg font-light">B.Tech , IIT Mandi</div>
                  </div>
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Location
                    </div>
                    <div className="text-white text-lg font-light">Himachal Pradesh, India</div>
                  </div>
                  
                  {/* Contact Button */}
                  <motion.button
                    className="w-full mt-8 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium rounded-lg
                               hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const subject = encodeURIComponent("Lets Connect - Davinci Solutions");
                      const emailAddress = "amarsai2005@gmail.com";
                      window.location.href = `mailto:${emailAddress}?subject=${subject}`;
                    }}
                  >
                    Send Message
                  </motion.button>
                </div>
              </div>
            </div>
          </TextReveal>
        </div>
      </div>
    </motion.section>
  );
}

export default EnhancedAboutSection;