import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SciFiTeamSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTeam, setActiveTeam] = useState('project-head');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setIsLoaded(true);
    setCurrentSlide(0);
  }, [activeTeam]);

  const teamMembers = {
    'project-head': [
      {
        name: 'Bhuvan Narula',
        role: 'Project Head',
        specialization: 'Project Management & Strategy',
        id: 'PH-001'
      }
    ],
    'team-heads': [
      {
        name: 'Sukhvansh Jain',
        role: 'Software Head',
        specialization: 'Systems Integration',
        id: 'TH-001'
      },
      {
        name: 'xxxxxx',
        role: 'Electronics Head',
        specialization: 'Circuit Design',
        id: 'TH-002'
      },
      {
        name: 'xxxxxx',
        role: 'Mechanical Head',
        specialization: 'AI & Automation',
        id: 'TH-003'
      }
    ],
    'core': [
      {
        name: 'AAAAA',
        role: 'Mechanical Team',
        specialization: 'CAD Design',
        id: 'CR-001'
      },
      {
        name: 'BBBBB',
        role: 'Electronics Team',
        specialization: 'Embedded Systems',
        id: 'CR-002'
      },
      {
        name: 'CCCCC',
        role: 'Software Team',
        specialization: 'Computer Vision',
        id: 'CR-003'
      },
      {
        name: 'DDDDD',
        role: 'Systems Team',
        specialization: 'Integration Testing',
        id: 'CR-004'
      },
      {
        name: 'EEEEE',
        role: 'Mechanical Team',
        specialization: 'Prototyping',
        id: 'CR-005'
      },
      {
        name: 'FFFFF',
        role: 'Mechanical Team',
        specialization: 'Prototyping',
        id: 'CR-005'
      }
    ]
  };

  const CARDS_PER_SLIDE = 3;

  const MemberCard = ({ member }) => (
    <div className="relative border border-white/20 p-4 transition-all duration-300 hover:border-white/30 w-full">
      {/* Card decorative elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/90" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/90" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/90" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/90" />

      {/* Image Container */}
      <div className="relative aspect-square mb-4 overflow-hidden group-hover:scale-105 transition-transform duration-300">
        <img
          src="/api/placeholder/400/400"
          alt={member.name}
          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
        />
        {/* Corner markers */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/50" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/50" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/50" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/50" />
      </div>

      {/* Member Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/50 font-mono text-sm">{member.id}</span>
          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" />
        </div>
        
        <h3 className="text-lg font-mono text-white">{member.name}</h3>
        
        <div className="space-y-2">
          <p className="text-white/70 font-mono text-sm">&gt; {member.role}</p>
          <p className="text-white/50 font-mono text-xs pl-4 border-l border-white/30">
            {member.specialization}
          </p>
        </div>
      </div>
    </div>
  );

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => {
      const totalSlides = Math.ceil(teamMembers[activeTeam].length / CARDS_PER_SLIDE);
      return prev === 0 ? totalSlides - 1 : prev - 1;
    });
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => {
      const totalSlides = Math.ceil(teamMembers[activeTeam].length / CARDS_PER_SLIDE);
      return prev === totalSlides - 1 ? 0 : prev + 1;
    });
  };

  const renderTeamMembers = () => {
    if (activeTeam === 'project-head') {
      return (
        <div className="max-w-md mx-auto">
          <MemberCard member={teamMembers[activeTeam][0]} />
        </div>
      );
    }

    const members = teamMembers[activeTeam];
    const totalSlides = Math.ceil(members.length / CARDS_PER_SLIDE);
    const slides = Array.from({ length: totalSlides }, (_, slideIndex) => {
      const startIndex = slideIndex * CARDS_PER_SLIDE;
      const slideMembers = members.slice(startIndex, startIndex + CARDS_PER_SLIDE);
      
      return (
        <div key={slideIndex} className="min-w-full">
          <div className="grid grid-cols-3 gap-4">
            {slideMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
            {/* Add placeholder cards if needed */}
            {slideMembers.length < CARDS_PER_SLIDE && 
              Array.from({ length: CARDS_PER_SLIDE - slideMembers.length }).map((_, i) => (
                <div key={`placeholder-${i}`} className="opacity-0" />
              ))
            }
          </div>
        </div>
      );
    });

    return (
      <div className="relative">
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides}
          </div>
        </div>

        {totalSlides > 1 && (
          <>
            <button 
              onClick={handlePrevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={handleNextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight size={24} />
            </button>

            <div className="flex justify-center space-x-2 mt-6">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentSlide === index 
                      ? 'bg-white' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-black relative p-8 max-w-7xl mx-auto my-8 overflow-hidden pt-55"> {/* Add top padding to pull it down */}
      {/* Grid background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      {/* Data stream lines */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse delay-500" />
      </div>

      <div className="relative bg-black/90 rounded-2xl p-8 border border-white/10">
        {/* Decorative elements */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Header */}
        <div className={`flex items-center space-x-4 mb-12 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <h2 className="text-3xl font-mono font-bold text-white relative">
            <span className="opacity-100">TEAM</span>{' '}
            <span className="relative">
              MEMBERS
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h2>
        </div>

        {/* Team Navigation */}
        <div className="flex space-x-4 mb-8">
          {[
            { id: 'project-head', label: '01_PROJECT_HEAD' },
            { id: 'team-heads', label: '02_TEAM_HEADS' },
            { id: 'core', label: '03_CORE' }
          ].map((team) => (
            <button 
              key={team.id}
              className={`px-6 py-2 rounded-none transition-all duration-300 border ${
                activeTeam === team.id 
                  ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                  : 'bg-black border-white/30 text-white/70 hover:bg-white/10'
              }`}
              onClick={() => setActiveTeam(team.id)}
            >
              <span className="font-mono">{team.label}</span>
            </button>
          ))}
        </div>

        {/* Member Display */}
        {renderTeamMembers()}

        {/* Status indicators */}
        <div className="flex justify-end mt-8 space-x-4">
          <span className="text-white/50 font-mono text-sm flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            {activeTeam === 'project-head' 
              ? 'PROJECT_HEAD_ACTIVE'
              : `GROUP ${currentSlide + 1}/${Math.ceil(teamMembers[activeTeam].length / CARDS_PER_SLIDE)}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SciFiTeamSection;