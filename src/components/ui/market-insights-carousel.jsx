import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Zap, Globe, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./badge";

const MarketInsightsCarousel = ({ timelineData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const intervalRef = useRef(null);

  // Image categories mapping
  const getImagesForCategory = (category) => {
    const imageCategories = {
      "Market Size": [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=500&fit=crop"
      ],
      "Regional Growth": [
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=500&fit=crop"
      ],
      "Adoption": [
        "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop"
      ],
      "Impact": [
        "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=500&fit=crop"
      ],
      "Investment": [
        "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop"
      ],
      "Returns": [
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=800&h=500&fit=crop"
      ]
    };
    return imageCategories[category] || imageCategories["Market Size"];
  };

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % timelineData.length);
      }, 5000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, timelineData.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % timelineData.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + timelineData.length) % timelineData.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const handleImageError = (index) => {
    setImageLoadErrors(prev => ({ ...prev, [index]: true }));
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

  const currentItem = timelineData[currentIndex];
  const currentImages = getImagesForCategory(currentItem?.category);

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Main Carousel Container */}
      <div className="relative h-[600px] rounded-3xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {imageLoadErrors[currentIndex] ? (
                <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                  <div className="text-center text-white/60">
                    <currentItem.icon size={64} className="mx-auto mb-4 text-white/40" />
                    <p className="text-lg">Visual Data Representation</p>
                  </div>
                </div>
              ) : (
                <img
                  src={currentImages[0]}
                  alt={currentItem?.title}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(currentIndex)}
                />
              )}
              
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center">
              <div className="container mx-auto px-8 lg:px-16">
                <div className="max-w-3xl">
                  {/* Status Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4"
                  >
                    <Badge className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusStyles(currentItem?.status)}`}>
                      {currentItem?.status === "completed" ? "COMPLETE" : 
                       currentItem?.status === "in-progress" ? "IN PROGRESS" : "PENDING"}
                    </Badge>
                  </motion.div>

                  {/* Category & Date */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-4 mb-4"
                  >
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80 border border-white/20">
                      {currentItem?.category}
                    </span>
                    <span className="text-sm font-mono text-white/60">{currentItem?.date}</span>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight"
                  >
                    {currentItem?.title}
                  </motion.h2>

                  {/* Content */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl text-white/80 mb-8 leading-relaxed"
                  >
                    {currentItem?.content}
                  </motion.p>

                  {/* Energy Level */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-6"
                  >
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="flex items-center text-white/80">
                        <Zap size={16} className="mr-2 text-yellow-400" />
                        Market Energy Level
                      </span>
                      <span className="font-mono text-white text-lg">{currentItem?.energy}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                      <motion.div
                        className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${currentItem?.energy}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 }}
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <button
            onClick={prevSlide}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-300 border border-white/20 hover:border-white/40 group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        <div className="absolute inset-y-0 right-4 flex items-center">
          <button
            onClick={nextSlide}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-300 border border-white/20 hover:border-white/40 group"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Play/Pause Control */}
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-300 border border-white/20 hover:border-white/40"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center mt-8 space-x-3">
        {timelineData.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative w-16 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-gradient-to-r from-blue-400 to-purple-500 scale-110'
                : 'bg-white/20 hover:bg-white/40'
            }`}
          >
            {index === currentIndex && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                layoutId="activeIndicator"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Mini Navigation Cards */}
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {timelineData.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => goToSlide(index)}
            className={`p-4 rounded-xl border transition-all duration-300 group ${
              index === currentIndex
                ? 'bg-white/10 border-white/30 backdrop-blur-sm'
                : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center">
              <item.icon 
                size={24} 
                className={`mx-auto mb-2 transition-colors ${
                  index === currentIndex ? 'text-blue-400' : 'text-white/60 group-hover:text-white/80'
                }`}
              />
              <h3 className={`text-sm font-medium mb-1 transition-colors ${
                index === currentIndex ? 'text-white' : 'text-white/70 group-hover:text-white/90'
              }`}>
                {item.title}
              </h3>
              <p className="text-xs text-white/50">{item.category}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MarketInsightsCarousel;