"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CanvasRevealEffect } from "./canvas-reveal-effect";
import { 
  Bot, 
  Users, 
  Clock, 
  Globe, 
  Zap, 
  Shield, 
  CheckCircle,
  XCircle,
  Star
} from "lucide-react";

const Card = ({ title, icon, children, features, comparison }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border border-white/[0.2] group/canvas-card flex flex-col items-center justify-center dark:border-white/[0.2] max-w-sm w-full mx-auto p-6 relative h-[35rem] relative bg-white/5 backdrop-blur-sm rounded-xl"
    >
      {/* Corner Icons */}
      <div className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-white">
        {icon}
      </div>
      <div className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-white">
        {icon}
      </div>
      <div className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-white">
        {icon}
      </div>
      <div className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-white">
        {icon}
      </div>

      {/* Canvas Reveal Effect */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full absolute inset-0 rounded-xl overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Content */}
      <div className="relative z-20 text-center">
        <div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full mx-auto flex items-center justify-center mb-4">
          {icon}
        </div>
        
        <h2 className="dark:text-white text-xl opacity-100 group-hover/canvas-card:opacity-0 relative z-10 text-white mt-4 font-bold group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200">
          {title}
        </h2>

        {/* Features List */}
        <div className="mt-6 space-y-3 text-left">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm text-white/80">
              {feature.status === 'available' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : feature.status === 'limited' ? (
                <XCircle className="w-4 h-4 text-yellow-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={feature.status === 'available' ? 'text-white' : 'text-white/60'}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* Comparison Badge */}
        {comparison && (
          <div className="mt-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              comparison === 'winner' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : comparison === 'good'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {comparison === 'winner' && <Star className="w-3 h-3 mr-1" />}
              {comparison === 'winner' ? 'Winner' : comparison === 'good' ? 'Good' : 'Basic'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ComparisonCards = () => {
  const comparisonData = [
    {
      title: "TARA_x1",
      icon: <Bot className="w-8 h-8" />,
      comparison: "winner",
      features: [
        { text: "24/7 Instant Response", status: "available" },
        { text: "20+ Languages Support", status: "available" },
        { text: "Voice & Text Integration", status: "available" },
        { text: "Advanced AI Reasoning", status: "available" },
        { text: "Custom Training", status: "available" },
        { text: "Real-time Analytics", status: "available" },
        { text: "Seamless Integration", status: "available" },
        { text: "Cost: $0.02/query", status: "available" }
      ],
      colors: [[0, 255, 255], [0, 200, 255]],
      animationSpeed: 5.1,
      containerClassName: "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
    },
    {
      title: "Other AI Agents",
      icon: <Users className="w-8 h-8" />,
      comparison: "good",
      features: [
        { text: "Limited Response Time", status: "limited" },
        { text: "5-10 Languages", status: "limited" },
        { text: "Text Only", status: "limited" },
        { text: "Basic AI Logic", status: "limited" },
        { text: "Generic Training", status: "limited" },
        { text: "Basic Analytics", status: "limited" },
        { text: "Complex Integration", status: "limited" },
        { text: "Cost: $0.05-0.10/query", status: "limited" }
      ],
      colors: [[236, 72, 153], [232, 121, 249]],
      animationSpeed: 3,
      containerClassName: "bg-gradient-to-br from-pink-500/20 to-purple-500/20"
    },
    {
      title: "Human Agents",
      icon: <Users className="w-8 h-8" />,
      comparison: "basic",
      features: [
        { text: "Business Hours Only", status: "unavailable" },
        { text: "1-3 Languages", status: "unavailable" },
        { text: "Voice Only", status: "unavailable" },
        { text: "Human Reasoning", status: "available" },
        { text: "Manual Training", status: "unavailable" },
        { text: "Manual Reports", status: "unavailable" },
        { text: "Manual Setup", status: "unavailable" },
        { text: "Cost: $15-25/hour", status: "unavailable" }
      ],
      colors: [[125, 211, 252], [59, 130, 246]],
      animationSpeed: 3,
      containerClassName: "bg-gradient-to-br from-sky-500/20 to-blue-500/20"
    }
  ];

  return (
    <div className="py-20 flex flex-col lg:flex-row items-center justify-center bg-transparent w-full gap-8 mx-auto px-8">
      {comparisonData.map((item, index) => (
        <Card
          key={index}
          title={item.title}
          icon={item.icon}
          features={item.features}
          comparison={item.comparison}
        >
          <CanvasRevealEffect
            animationSpeed={item.animationSpeed}
            containerClassName={item.containerClassName}
            colors={item.colors}
            dotSize={2}
          />
        </Card>
      ))}
    </div>
  );
};

export { ComparisonCards };


