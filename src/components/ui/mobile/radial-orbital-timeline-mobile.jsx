"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap, Globe, TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const RadialOrbitalTimelineMobile = ({ timelineData }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [viewMode, setViewMode] = useState("orbital");
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState({});
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const orbitRef = useRef(null);
  const nodeRefs = useRef({});
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });
  
  const scale = useTransform(scrollYProgress, [0, 1, 1.3], [1.2, 1, 0.8]);
  const opacity = useTransform(scrollYProgress, [1, 1, 1], [1, 1, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 180]);
  
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  const handleContainerClick = (e) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !newState[id];
      return newState;
    });

    setActiveNodeId(expandedItems[id] ? null : id);
    setAutoRotate(!expandedItems[id]);
  };

  const handleNodeClick = (e, itemId) => {
    e.stopPropagation();
    toggleItem(itemId);
    
    // Add pulse effect
    setPulseEffect((prev) => ({
      ...prev,
      [itemId]: true
    }));
    
    setTimeout(() => {
      setPulseEffect((prev) => ({
        ...prev,
        [itemId]: false
      }));
    }, 600);
  };

  const calculateNodePosition = (index, total, category) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    
    // Mobile-optimized orbital rings - smaller radii
    const categoryRadii = {
      "Market Size": 120,
      "Regional Growth": 140,
      "Adoption": 160,
      "Impact": 180,
      "Investment": 200,
      "Returns": 220
    };
    
    const radius = categoryRadii[category] || 150;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.8,
      Math.min(1, 0.8 + 0.2 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId) => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId) => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white";
      case "in-progress":
        return "text-black bg-white border-black";
      case "pending":
        return "text-white bg-black/40 border-white/50";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  const getCategoryColor = (category, type) => {
    const colors = {
      "Market Size": {
        bg: "bg-blue-500/60 text-white shadow-md shadow-blue-500/20",
        border: "border-blue-400/80"
      },
      "Regional Growth": {
        bg: "bg-green-500/60 text-white shadow-md shadow-green-500/20",
        border: "border-green-400/80"
      },
      "Adoption": {
        bg: "bg-purple-500/60 text-white shadow-md shadow-purple-500/20",
        border: "border-purple-400/80"
      },
      "Impact": {
        bg: "bg-orange-500/60 text-white shadow-md shadow-orange-500/20",
        border: "border-orange-400/80"
      },
      "Investment": {
        bg: "bg-yellow-500/60 text-white shadow-md shadow-yellow-500/20",
        border: "border-yellow-400/80"
      },
      "Returns": {
        bg: "bg-red-500/60 text-white shadow-md shadow-red-500/20",
        border: "border-red-400/80"
      }
    };
    
    return colors[category]?.[type] || "bg-white/40 text-white border-white/60";
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.5) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [autoRotate]);

  // Center the orbit on mobile
  useEffect(() => {
    if (isMobile) {
      setCenterOffset({ x: 0, y: 0 });
    }
  }, [isMobile]);

  return (
            <motion.div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
      style={{ scale, opacity }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Mobile-optimized background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
        
        {/* Concentric circles for depth */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {[100, 150, 200, 250].map((radius, index) => (
            <div
              key={index}
              className="absolute border border-white/10 rounded-full"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: -radius,
                top: -radius,
                animationDelay: `${index * 0.5}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Central hub */}
              <motion.div
        ref={orbitRef}
        className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-white/20 to-white/10 
                   backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center
                   shadow-lg shadow-white/10"
        animate={{ rotate: autoRotate ? 360 : 0 }}
        transition={{ duration: 20, repeat: autoRotate ? Infinity : 0, ease: "linear" }}
      >
        <div className="w-2 h-2 bg-white rounded-full" />
      </motion.div>

      {/* Orbital nodes */}
      {timelineData.map((item, index) => {
        const position = calculateNodePosition(index, timelineData.length, item.category);
                    const isExpanded = expandedItems[item.id];
        const isRelated = isRelatedToActive(item.id);
        const isPulsing = pulseEffect[item.id];
        const isActive = activeNodeId === item.id;
                    
                    return (
                      <motion.div
                        key={item.id}
            ref={(el) => (nodeRefs.current[item.id] = el)}
            className="absolute cursor-pointer select-none"
            style={{
              left: `calc(50% + ${position.x}px)`,
              top: `calc(50% + ${position.y}px)`,
              zIndex: position.zIndex,
              opacity: position.opacity
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: isExpanded ? 1.2 : 1,
              opacity: position.opacity,
              rotate: isExpanded ? 360 : 0
            }}
            transition={{ 
              duration: 0.6, 
              delay: index * 0.1,
              ease: "easeOut"
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => handleNodeClick(e, item.id)}
          >
            {/* Node container */}
            <div className="relative">
              {/* Connection lines to related items */}
              {isActive && getRelatedItems(item.id).map((relatedId) => {
                const relatedItem = timelineData.find(item => item.id === relatedId);
                if (!relatedItem) return null;
                
                const relatedPosition = calculateNodePosition(
                  timelineData.indexOf(relatedItem), 
                  timelineData.length, 
                  relatedItem.category
                );
                
                return (
                              <motion.div
                    key={relatedId}
                    className="absolute w-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    style={{
                      height: Math.sqrt(
                        Math.pow(relatedPosition.x - position.x, 2) + 
                        Math.pow(relatedPosition.y - position.y, 2)
                      ),
                      left: '50%',
                      top: '50%',
                      transformOrigin: 'top center',
                      transform: `rotate(${Math.atan2(
                        relatedPosition.y - position.y, 
                        relatedPosition.x - position.x
                      ) * 180 / Math.PI}deg) translateX(-50%)`
                    }}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                                          );
                                        })}

              {/* Main node */}
              <motion.div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 ${getCategoryColor(item.category, 'bg')} 
                           ${getCategoryColor(item.category, 'border')} border-2 rounded-xl 
                           flex items-center justify-center backdrop-blur-sm transition-all duration-300
                           ${isPulsing ? 'animate-pulse' : ''}
                           ${isRelated ? 'ring-2 ring-white/50' : ''}
                           ${isActive ? 'ring-4 ring-white/80 shadow-lg shadow-white/20' : ''}`}
                animate={{
                  scale: isExpanded ? 1.2 : 1,
                  rotate: isExpanded ? 360 : 0
                }}
                transition={{ duration: 0.6 }}
              >
                {/* Icon */}
                <div className="text-white">
                  {React.createElement(item.icon, { 
                    className: "w-5 h-5 sm:w-6 sm:h-6" 
                  })}
                </div>

                {/* Status indicator */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white
                                ${getStatusStyles(item.status).split(' ')[1]}`} />
              </motion.div>

              {/* Node label */}
            <motion.div
                className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <div className={`px-2 py-1 text-xs sm:text-sm font-medium rounded-md backdrop-blur-sm
                                ${getCategoryColor(item.category, 'bg')} ${getCategoryColor(item.category, 'border')} border`}>
                  {item.title}
                </div>
              </motion.div>

              {/* Expanded content card */}
              {isExpanded && (
                    <motion.div
                  className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 z-50"
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="w-64 sm:w-80 bg-black/90 backdrop-blur-xl border-white/20 shadow-2xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${getCategoryColor(item.category, 'bg')} rounded-lg flex items-center justify-center`}>
                          {React.createElement(item.icon, { className: "w-4 h-4 text-white" })}
                              </div>
                              <div>
                          <CardTitle className="text-white text-sm sm:text-base">{item.title}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                              <CardContent className="pt-0">
                      <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-4">
                        {item.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-xs">{item.date}</span>
                                          <Button
                          size="sm" 
                                            variant="outline"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.id);
                          }}
                        >
                          Close
                                          </Button>
                                  </div>
                              </CardContent>
                  </Card>
                            </motion.div>
                          )}
            </div>
                    </motion.div>
                  );
                })}

      {/* Mobile controls */}
      {isMobile && (
      <motion.div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRotate(!autoRotate)}
            className="text-xs bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-white/10"
          >
            {autoRotate ? 'Pause' : 'Play'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'orbital' ? 'list' : 'orbital')}
            className="text-xs bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-white/10"
          >
            {viewMode === 'orbital' ? 'List' : 'Orbit'}
        </Button>
      </motion.div>
      )}
    </motion.div>
  );
};

export default RadialOrbitalTimelineMobile;