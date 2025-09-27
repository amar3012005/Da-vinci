"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap, Globe, TrendingUp, Users, DollarSign, Target, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// Image Carousel Component
const ImageCarousel = ({ item, timelineData, onRelatedClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  // Sample images for different categories (using Unsplash)
  const getImagesForCategory = (category) => {
    const imageCategories = {
      "Market Size": [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
      ],
      "Regional Growth": [
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop"
      ],
      "Adoption": [
        "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop"
      ],
      "Impact": [
        "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=300&fit=crop"
      ],
      "Investment": [
        "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop"
      ],
      "Returns": [
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=400&h=300&fit=crop"
      ]
    };
    return imageCategories[category] || imageCategories["Market Size"];
  };

  const images = getImagesForCategory(item.category);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, images.length]);

  const handleImageError = (index) => {
    setImageLoadErrors(prev => ({ ...prev, [index]: true }));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "completed":
        return "text-white bg-green-500/80 border-green-400";
      case "in-progress":
        return "text-white bg-blue-500/80 border-blue-400";
      case "pending":
        return "text-white bg-orange-500/80 border-orange-400";
      default:
        return "text-white bg-gray-500/80 border-gray-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute top-20 left-1/2 -translate-x-1/2 w-96"
    >
      <div className="bg-black/40 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Elegant connection line */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-gradient-to-b from-white/60 to-transparent"></div>
        
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between items-center mb-2">
            <Badge className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusStyles(item.status)}`}>
              {item.status === "completed" ? "COMPLETE" : 
               item.status === "in-progress" ? "IN PROGRESS" : "PENDING"}
            </Badge>
            <span className="text-xs font-mono text-white/60">{item.date}</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
          <p className="text-sm text-white/70">{item.content}</p>
        </div>

        {/* Image Carousel */}
        <div className="relative h-48 overflow-hidden group">
          {/* Main Image */}
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {imageLoadErrors[currentImageIndex] ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <p className="text-sm">No Image Available</p>
                </div>
              </div>
            ) : (
              <img
                src={images[currentImageIndex]}
                alt={`${item.category} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={() => handleImageError(currentImageIndex)}
              />
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </motion.div>

          {/* Navigation Controls */}
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={prevImage}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Play/Pause Button */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>

          {/* Image Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4">
          {/* Energy Level */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="flex items-center text-white/80">
                <Zap size={14} className="mr-2 text-yellow-400" />
                Energy Level
              </span>
              <span className="font-mono text-white">{item.energy}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.energy}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Related Items */}
          {item.relatedIds && item.relatedIds.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center mb-3">
                <Link size={14} className="text-white/70 mr-2" />
                <h4 className="text-sm font-medium text-white/80">Connected Nodes</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.relatedIds.map((relatedId) => {
                  const relatedItem = timelineData.find((i) => i.id === relatedId);
                  return (
                    <Button
                      key={relatedId}
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRelatedClick(relatedId);
                      }}
                    >
                      {relatedItem?.title}
                      <ArrowRight size={12} className="ml-1 opacity-60" />
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const RadialOrbitalTimeline = ({ timelineData }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [viewMode, setViewMode] = useState("orbital");
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState({});
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState(null);
  const containerRef = useRef(null);
  const orbitRef = useRef(null);
  const nodeRefs = useRef({});
  
  // Scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });
  
  const scale = useTransform(scrollYProgress, [0, 1, 1.3], [1.3, 1, 0]);
  const opacity = useTransform(scrollYProgress, [1, 1, 1], [1, 1, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  
  const isInView = useInView(containerRef, { once: true, amount: 0.9 });

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

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index, total, category) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    
    // Define orbital rings based on category
    const categoryRadii = {
      "Market Size": 180,
      "Regional Growth": 220,
      "Adoption": 260,
      "Impact": 300,
      "Investment": 340,
      "Returns": 380
    };
    
    const radius = categoryRadii[category] || 200;
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

  return (
    <motion.div
      className="w-full h-[800px] flex flex-col items-center justify-center relative overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
      style={{ scale, opacity }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Elegant background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent" />
        
        {/* Animated particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {/* Elegant grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center z-10">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Enhanced center orb with elegant animations */}
          <motion.div 
            className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-sm flex items-center justify-center z-10 shadow-2xl shadow-white/20"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {/* Elegant ripple effects */}
            <motion.div 
              className="absolute w-24 h-24 rounded-full border-2 border-white/60"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute w-32 h-32 rounded-full border-2 border-white/40"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            <motion.div 
              className="absolute w-40 h-40 rounded-full border-2 border-white/30"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.4, 0, 0.4]
              }}
              transition={{ 
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            {/* Core orb */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md shadow-lg shadow-white/20" />
          </motion.div>

          {/* Market Size Ring - 180px radius */}
          <motion.div 
            className="absolute w-[360px] h-[360px] rounded-full border-2 border-blue-400/60 shadow-lg shadow-blue-400/20"
            animate={{ 
              rotate: [0, 360],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Regional Growth Ring - 220px radius */}
          <motion.div 
            className="absolute w-[440px] h-[440px] rounded-full border-2 border-green-400/60 shadow-lg shadow-green-400/20"
            animate={{ 
              rotate: [360, 0],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{ 
              duration: 30,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Adoption Ring - 260px radius */}
          <motion.div 
            className="absolute w-[520px] h-[520px] rounded-full border-2 border-purple-400/60 shadow-lg shadow-purple-400/20"
            animate={{ 
              rotate: [0, 360],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ 
              duration: 35,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Impact Ring - 300px radius */}
          <motion.div 
            className="absolute w-[600px] h-[600px] rounded-full border-2 border-orange-400/60 shadow-lg shadow-orange-400/20"
            animate={{ 
              rotate: [360, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 40,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Investment Ring - 340px radius */}
          <motion.div 
            className="absolute w-[680px] h-[680px] rounded-full border-2 border-yellow-400/60 shadow-lg shadow-yellow-400/20"
            animate={{ 
              rotate: [0, 360],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 45,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Returns Ring - 380px radius */}
          <motion.div 
            className="absolute w-[760px] h-[760px] rounded-full border-2 border-red-400/60 shadow-lg shadow-red-400/20"
            animate={{ 
              rotate: [360, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 50,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length, item.category);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <motion.div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                {/* Enhanced energy aura */}
                <motion.div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.6 + 50}px`,
                    height: `${item.energy * 0.6 + 50}px`,
                    left: `-${(item.energy * 0.6 + 50 - 32) / 2}px`,
                    top: `-${(item.energy * 0.6 + 50 - 32) / 2}px`,
                  }}
                  animate={{
                    scale: isPulsing ? [1, 1.15, 1] : [1, 1.03, 1],
                    opacity: isPulsing ? [0.25, 0.5, 0.25] : [0.08, 0.15, 0.08]
                  }}
                  transition={{
                    duration: isPulsing ? 1 : 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Enhanced node with category-based styling */}
                <motion.div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm
                  ${
                    isExpanded
                      ? "bg-white/95 text-black shadow-xl shadow-white/40"
                      : isRelated
                      ? "bg-white/60 text-white shadow-lg shadow-white/30"
                      : getCategoryColor(item.category, "bg")
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-white"
                      : isRelated
                      ? "border-white/80"
                      : getCategoryColor(item.category, "border")
                  }
                  transition-all duration-500 transform
                  ${isExpanded ? "scale-150" : ""}
                `}
                  animate={{
                    rotate: isExpanded ? [0, 360] : 0,
                    scale: isExpanded ? 1.5 : 1
                  }}
                  transition={{
                    duration: isExpanded ? 2 : 0.3,
                    repeat: isExpanded ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <Icon size={16} />
                </motion.div>

                <motion.div
                  className={`
                  absolute top-12 whitespace-nowrap
                  text-xs font-light tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-white scale-125" : "text-white/70"}
                `}
                  animate={{
                    opacity: isExpanded ? 1 : 0.7,
                    scale: isExpanded ? 1.25 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {item.title}
                </motion.div>

                {isExpanded && (
                  <ImageCarousel 
                    item={item} 
                    timelineData={timelineData}
                    onRelatedClick={(relatedId) => {
                      toggleItem(relatedId);
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default RadialOrbitalTimeline;
