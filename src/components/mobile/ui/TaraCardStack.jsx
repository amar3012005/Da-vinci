"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, TrendingUp, Sparkles, ChevronRight } from "lucide-react"

// TARA Agent Cards Data
const cardData = {
    1: {
        title: "TARA_x1",
        subtitle: "Customer Service Agent",
        description: "24/7 multilingual support with context-aware conversations",
        icon: MessageCircle,
        gradient: "from-blue-500 to-cyan-500",
        bgImage: "/canyon-bg.png"
    },
    2: {
        title: "TARA_v1",
        subtitle: "Sales Agent",
        description: "Intelligent lead qualification and conversion optimization",
        icon: TrendingUp,
        gradient: "from-purple-500 to-pink-500",
        bgImage: "/canyon-bg.png"
    },
    3: {
        title: "M M A R",
        subtitle: "Core Architecture",
        description: "Modular Multi-Agentic RAG for contextual intelligence",
        icon: Sparkles,
        gradient: "from-pink-500 to-orange-500",
        bgImage: "/canyon-bg.png"
    },
}

const initialCards = [
    { id: 1, contentType: 1 },
    { id: 2, contentType: 2 },
    { id: 3, contentType: 3 },
]

const positionStyles = [
    { scale: 1, y: 8 },
    { scale: 0.95, y: -12 },
    { scale: 0.9, y: -32 },
]

const exitAnimation = {
    y: 280,
    scale: 1,
    zIndex: 10,
}

const enterAnimation = {
    y: -12,
    scale: 0.9,
}

function TaraCardContent({ contentType }) {
    const data = cardData[contentType]
    const Icon = data.icon

    return (
        <div className="flex h-full w-full flex-col">
            {/* Card Header with Gradient */}
            <div
                className={`relative h-28 w-full overflow-hidden rounded-t-lg bg-gradient-to-br ${data.gradient}`}
                style={{
                    backgroundImage: `url(${data.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: 'overlay'
                }}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${data.gradient} opacity-80`} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <Icon className="w-7 h-7 text-white" />
                    </div>
                </div>
            </div>

            {/* Card Content */}
            <div className="flex flex-1 flex-col justify-between p-4 bg-[#0d0d0d]">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-base">{data.title}</span>
                        <span className="text-white/40 text-[10px] font-mono">●</span>
                        <span className="text-white/50 text-xs">{data.subtitle}</span>
                    </div>
                    <p className="text-white/40 text-xs leading-relaxed">
                        {data.description}
                    </p>
                </div>

                <button className="mt-3 flex items-center gap-1 text-xs font-medium text-pink-400 hover:text-pink-300 transition-colors">
                    Learn more
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

function AnimatedCard({ card, index, isAnimating }) {
    const { scale, y } = positionStyles[index] ?? positionStyles[2]
    const zIndex = index === 0 && isAnimating ? 10 : 3 - index

    const exitAnim = index === 0 ? exitAnimation : undefined
    const initialAnim = index === 2 ? enterAnimation : undefined

    return (
        <motion.div
            key={card.id}
            initial={initialAnim}
            animate={{ y, scale }}
            exit={exitAnim}
            transition={{
                type: "spring",
                duration: 1,
                bounce: 0,
            }}
            style={{
                zIndex,
                left: "50%",
                x: "-50%",
                bottom: 0,
            }}
            className="absolute flex h-[220px] w-[280px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50 will-change-transform"
        >
            <TaraCardContent contentType={card.contentType} />
        </motion.div>
    )
}

export default function TaraCardStack() {
    const [cards, setCards] = useState(initialCards)
    const [isAnimating, setIsAnimating] = useState(false)
    const [nextId, setNextId] = useState(4)

    const handleAnimate = () => {
        setIsAnimating(true)

        const nextContentType = ((cards[2].contentType % 3) + 1)

        setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }])
        setNextId((prev) => prev + 1)
        setIsAnimating(false)
    }

    return (
        <div className="flex w-full flex-col items-center justify-center">
            <div className="relative h-[300px] w-full overflow-hidden">
                <AnimatePresence initial={false}>
                    {cards.slice(0, 3).map((card, index) => (
                        <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
                    ))}
                </AnimatePresence>
            </div>

            <div className="relative z-10 -mt-2 flex w-full items-center justify-center">
                <motion.button
                    onClick={handleAnimate}
                    className="flex h-9 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Sparkles className="w-3 h-3" />
                    Explore Agents
                </motion.button>
            </div>
        </div>
    )
}
