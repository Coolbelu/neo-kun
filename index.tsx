import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";

// --- Types ---
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltDegree?: number;
}

interface RevealOnScrollProps {
  children: React.ReactNode;
  delay?: number;
}

interface Project {
  title: string;
  description: string;
  tags: string[];
  category: 'Prototype' | 'Research' | 'Ops';
  link?: string;
}

interface ToolBadgeProps {
  name: string;
  color: string;
  index: number;
  isVisible: boolean;
  direction?: 'left' | 'right';
}

// --- Helper Components ---

// Grain Overlay for Texture
const GrainOverlay = () => (
  <div 
    className="fixed inset-0 pointer-events-none opacity-[0.04] z-[1] mix-blend-overlay"
    style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
    }}
  />
);

// Magnetic Button Effect
const Magnetic: React.FC<{ children: React.ReactElement<{ className?: string }> }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(hover: none)').matches);
  }, []);

  const handleMouse = (e: React.MouseEvent) => {
    if (isMobile) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;
  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {React.cloneElement(children, { className: `${children.props.className || ''} transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)` })}
    </div>
  );
};

// Spotlight Card Effect (Glowing Border on Hover)
const SpotlightCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white transition-colors duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300 opacity-0 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(236, 72, 153, 0.15), transparent 40%)`,
        }}
      />
      <div className="relative h-full z-20">{children}</div>
    </div>
  );
};

const RevealOnScroll: React.FC<RevealOnScrollProps> = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out-expo transform ${
        isVisible ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-12 blur-sm'
      }`}
    >
      {children}
    </div>
  );
};

const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', tiltDegree = 3 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Disable tilt on touch devices
    const checkMobile = () => {
        setIsMobile(window.matchMedia('(hover: none)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || isMobile) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width - 0.5) * 2;
    const yPct = (y / rect.height - 0.5) * 2;
    setRotation({ x: -yPct * tiltDegree, y: xPct * tiltDegree });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-500 ease-out-expo hover:scale-[1.02]`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovering && !isMobile
          ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      }}
    >
      {children}
    </div>
  );
};

// Custom Cursor (Desktop Only)
const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) {
        setIsTouchDevice(true);
        return;
    }

    const cursor = cursorRef.current;
    const follower = followerRef.current;
    if (!cursor || !follower) return;

    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    };

    const animate = () => {
      followerX += (mouseX - followerX) * 0.15;
      followerY += (mouseY - followerY) * 0.15;
      follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMouseMove);
    const animId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <>
      <div ref={cursorRef} className="fixed w-3 h-3 bg-pink-500 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block will-change-transform" aria-hidden="true" />
      <div ref={followerRef} className="fixed w-8 h-8 border border-pink-500/50 rounded-full pointer-events-none z-[9998] transition-opacity duration-300 hidden md:block will-change-transform" aria-hidden="true" />
    </>
  );
};

// --- Main Content Components ---

const NavBar: React.FC = () => {
  const [time, setTime] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState<boolean>(true);
  
  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        // Get India Time
        const options: Intl.DateTimeFormatOptions = { 
            timeZone: 'Asia/Kolkata', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        };
        const timeString = new Intl.DateTimeFormat('en-US', options).format(now);
        setTime(timeString);

        const hour = parseInt(timeString.split(':')[0], 10);
        // If hour is between 09 and 23 OR hour is 00 or 01.
        if ((hour >= 9 && hour <= 23) || (hour >= 0 && hour < 2)) {
            setIsBuilding(true);
        } else {
            setIsBuilding(false);
        }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] md:w-auto max-w-2xl" aria-label="Main Navigation">
        <div className="glass-panel px-5 py-3 rounded-full flex items-center justify-between gap-6 border border-white/20 shadow-xl shadow-black/5 backdrop-blur-md bg-white/70 transition-colors duration-500">
        <div className="flex items-center gap-3" role="status" aria-label={`Status: ${isBuilding ? "Building" : "Recharging"}`}>
            <div className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBuilding ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isBuilding ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
            <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold tracking-widest text-slate-600">
                    {isBuilding ? 'BUILDING' : 'RECHARGING'}
                 </span>
                 <span className="text-[9px] font-mono text-slate-400">
                    IST {time}
                 </span>
            </div>
        </div>
        </div>
    </nav>
  );
};

const Hero: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="min-h-screen flex flex-col justify-center items-center relative px-4 pt-20 overflow-hidden" aria-label="Introduction">
            
            <div className="relative z-10 text-center w-full max-w-4xl mx-auto">
            <div className={`inline-block mb-6 transition-all duration-1000 ease-out-expo ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="px-4 py-1.5 rounded-full border border-pink-500/20 bg-pink-500/5 backdrop-blur-md">
                    <span className="text-pink-600 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                    Polyglot: En / Hi / Pu / Ja
                    </span>
                </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold mb-8 tracking-tighter flex flex-wrap justify-center gap-x-4 gap-y-2 md:gap-x-8 cursor-default leading-[0.9]">
                <div className="flex" aria-label="Kunal">
                {"KUNAL".split("").map((char, i) => (
                    <span 
                        key={i} 
                        className={`inline-block hover:text-pink-500 transition-all duration-300 text-slate-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                        style={{ transitionDelay: `${0.1 + i * 0.05}s` }}
                        aria-hidden="true"
                    >
                        {char}
                    </span>
                ))}
                </div>
                <div className="flex relative" aria-label="Sharma">
                {"SHARMA".split("").map((char, i) => (
                    <span 
                        key={i} 
                        className={`inline-block hover:scale-110 text-transparent bg-clip-text bg-gradient-to-b from-slate-800 to-slate-500 transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                        style={{ 
                            transitionDelay: `${0.4 + i * 0.05}s`,
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text'
                        }}
                        aria-hidden="true"
                    >
                        {char}
                    </span>
                ))}
                 {/* Subtle Glow Overlay for Gradient Effect */}
                 <div className={`absolute inset-0 bg-gradient-to-r from-rose-500 via-purple-500 to-blue-500 opacity-20 blur-2xl -z-10 transition-opacity duration-1000 ${mounted ? 'opacity-30' : 'opacity-0'}`}></div>
                </div>
            </h1>
            
            <p className={`text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-light transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                AI Evaluation Specialist & Technical Generalist.<br/>
                Ensuring <span className="text-slate-900 font-medium">safety</span>, <span className="text-slate-900 font-medium">fidelity</span>, and <span className="text-slate-900 font-medium">alignment</span> in LLMs.
            </p>

            <div className={`flex flex-wrap justify-center gap-3 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {['AI Safety', 'Red Teaming', 'SFT', 'Rubrics', 'RLHF'].map((tag, i) => (
                    <span key={tag} className="px-5 py-2.5 rounded-xl bg-white/40 border border-white/20 backdrop-blur-md text-sm font-medium text-slate-700 shadow-sm hover:scale-105 transition-transform duration-300 cursor-default">
                        {tag}
                    </span>
                ))}
            </div>
            </div>
        </section>
    );
};

const Process: React.FC = () => (
    <section className="py-32 px-4 max-w-7xl mx-auto" aria-labelledby="process-heading">
        <RevealOnScroll>
            <h2 id="process-heading" className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-24 text-center tracking-tight">The <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">Speedrun</span> Protocol</h2>
        </RevealOnScroll>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-16 right-16 h-0.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 -z-10 rounded-full" aria-hidden="true">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500 to-transparent w-1/3 animate-marquee opacity-50 blur-sm"></div>
            </div>
            
            {[
                { 
                    title: "Deconstruct", 
                    icon: (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                    ), 
                    desc: "Break complexity into first principles." 
                },
                { 
                    title: "Ship", 
                    icon: (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    ), 
                    desc: "MVP in days, not weeks. Vercel v0 + Supabase." 
                },
                { 
                    title: "Break", 
                    icon: (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ), 
                    desc: "Adversarial testing. Find the edge cases." 
                },
                { 
                    title: "Fix", 
                    icon: (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    ), 
                    desc: "Iterate based on failure data. Scale." 
                }
            ].map((step, idx) => (
                <RevealOnScroll key={idx} delay={idx * 150}>
                    <div className="relative flex flex-col items-center text-center group">
                        <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 flex items-center justify-center mb-8 relative z-10 transition-all duration-500 group-hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)] group-hover:border-pink-500/30">
                            <div className="text-slate-800 transform group-hover:scale-110 group-hover:text-pink-600 transition-all duration-500">
                                {step.icon}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold font-display text-slate-900 mb-3">{step.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed px-2 max-w-[200px] mx-auto">{step.desc}</p>
                    </div>
                </RevealOnScroll>
            ))}
        </div>
    </section>
);

const ResearchFocus: React.FC = () => (
    <section className="py-24 px-4 max-w-7xl mx-auto my-12" aria-labelledby="research-heading">
        <RevealOnScroll>
             <h2 id="research-heading" className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-16 text-center tracking-tight">Research <span className="italic text-slate-400 font-serif">Focus</span></h2>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                {
                    title: "Multilingual Alignment",
                    desc: "Solving tokenization biases and cultural nuance loss in Indic language models (Hindi/Punjabi/Tamil).",
                    color: "bg-orange-500"
                },
                {
                    title: "Adversarial Robustness",
                    desc: "Designing automated red-teaming agents to identify jailbreak vectors in long-context LLMs.",
                    color: "bg-red-500"
                },
                {
                    title: "Eval Efficacy",
                    desc: "Moving beyond static benchmarks (MMLU) to dynamic, agentic evaluation protocols and rigorous scoring rubrics.",
                    color: "bg-blue-500"
                }
            ].map((item, i) => (
                <RevealOnScroll key={i} delay={i * 150}>
                    <div className="h-full group relative p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all duration-500 overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${item.color} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-[100px]"></div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:translate-x-2 transition-transform duration-300">{item.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {item.desc}
                        </p>
                    </div>
                </RevealOnScroll>
            ))}
        </div>
    </section>
);

const Experience: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-32">
    <RevealOnScroll>
      <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-20 tracking-tight text-center">Professional <span className="text-pink-600">Timeline</span></h2>
    </RevealOnScroll>
    
    <div className="relative border-l border-slate-200 ml-6 md:ml-12 space-y-16">
      <div className="relative pl-8 md:pl-16">
        <span className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] ring-4 ring-white" />
        <RevealOnScroll delay={100}>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Freelance AI Evaluation & Safety</h3>
                <span className="text-sm font-mono text-pink-600 bg-pink-500/10 px-3 py-1 rounded-full mt-2 sm:mt-0 w-fit">2023 — Present</span>
            </div>
            <p className="text-slate-500 mb-6 font-medium">Remote | Global Client Base</p>
            <ul className="space-y-4">
            {[
                'Evaluated LLM outputs using complex scoring rubrics for safety, factual reliability, and reasoning fidelity.',
                'Led Red Teaming campaigns to discover adversarial prompts and edge cases.',
                'Directed AI agents to synthesize full-stack prototypes (SQL + React).',
                'Performed large-scale data integrity audits for SFT (Supervised Fine-Tuning) datasets.'
            ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-slate-600 text-base leading-relaxed group">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-pink-500 transition-colors flex-shrink-0" />
                {item}
                </li>
            ))}
            </ul>
        </RevealOnScroll>
      </div>
    </div>
  </div>
);

const ProjectShowcase: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Prototype' | 'Research' | 'Ops'>('All');
  
  const projects: Project[] = [
    {
      title: "Neo-Kun (This AI)",
      description: "Adaptive AI agent featuring context-aware persona switching (Gen Z/Professional). Built with robust alignment against adversarial inputs and deep technical grounding in RLHF & Safety principles.",
      tags: ["Gemini 2.5", "Prompt Eng.", "React"],
      category: "Prototype"
    },
    {
      title: "TaskBuff (AI Prototype)",
      description: "AI-assisted micro-task platform with fully generated frontend, backend routing, and SQL schema.",
      tags: ["Vercel v0", "Supabase", "React"],
      category: "Prototype"
    },
    {
      title: "Policy-Aware Evaluator",
      description: "Workflow for comparative LLM evaluation accounting for regional policy nuances in Hindi/Punjabi.",
      tags: ["LLM", "Safety", "Multilingual"],
      category: "Research"
    },
    {
      title: "Quantized Benchmarking",
      description: "Benchmarked compact LLM variants for computational efficiency and prompt sensitivity.",
      tags: ["Cloud Ops", "Python", "Inference"],
      category: "Ops"
    }
  ];

  const filtered = filter === 'All' ? projects : projects.filter(p => p.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-32">
      <RevealOnScroll>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">Selected <span className="text-pink-600">Works</span></h2>
            <p className="text-slate-500">Experiments in intelligence and interface.</p>
          </div>
          <div className="flex gap-2 flex-wrap bg-slate-100 p-1.5 rounded-full" role="group" aria-label="Project filters">
            {['All', 'Prototype', 'Research', 'Ops'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                aria-pressed={filter === f}
                type="button"
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === f 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p, i) => (
          <RevealOnScroll key={i} delay={i * 100}>
            <SpotlightCard className="h-full group cursor-default">
              <div className="h-full p-8 flex flex-col relative z-20">
                <div className="mb-6 flex justify-between items-start">
                  <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-slate-200 text-slate-500 uppercase`}>
                    {p.category}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold font-display text-slate-900 mb-4 group-hover:text-pink-600 transition-colors">{p.title}</h3>
                <p className="text-slate-600 text-base leading-relaxed mb-8 flex-grow">{p.description}</p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {p.tags.map(t => (
                    <span key={t} className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">#{t}</span>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  );
};

// Infinite Scrolling Marquee for Tools
const ToolBadge: React.FC<ToolBadgeProps> = ({ name, color, index, isVisible, direction = 'right' }) => {
    // Determine the animation class based on direction
    const animationClass = direction === 'right' ? 'animate-scale-in-right' : 'animate-scale-in-left';
    
    return (
      <div 
        className={`mx-4 px-6 py-3 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-sm hover:shadow-lg hover:border-pink-500/30 transition-all cursor-default min-w-max ${isVisible ? `${animationClass} opacity-100` : 'opacity-0'}`}
        style={{ 
            animationDelay: isVisible ? `${index * 0.1}s` : '0s',
            animationFillMode: 'forwards'
        }}
      >
          <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.2)]`}></div>
          <span className="font-display font-bold text-slate-700">{name}</span>
      </div>
    );
};

const Toolbox: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Safety timeout: if observer fails or is slow, force show after 500ms
    const timer = setTimeout(() => setIsVisible(true), 500);

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        },
        { 
            threshold: 0, // Trigger immediately when any part is visible
            rootMargin: '200px' // Trigger well before the element enters viewport (for smooth scroll)
        }
    );
    if (ref.current) observer.observe(ref.current);
    
    return () => {
        observer.disconnect();
        clearTimeout(timer);
    };
  }, []);

  const toolsRow1 = [
    { name: "Python", color: "bg-blue-500" },
    { name: "PyTorch", color: "bg-orange-500" },
    { name: "Supabase", color: "bg-emerald-500" },
    { name: "Vercel", color: "bg-black" },
    { name: "SQL", color: "bg-purple-500" },
    { name: "React", color: "bg-cyan-500" },
    { name: "TypeScript", color: "bg-blue-600" },
  ];

  const toolsRow2 = [
    { name: "RLHF", color: "bg-rose-500" },
    { name: "SFT", color: "bg-teal-500" },
    { name: "Rubric Design", color: "bg-pink-400" },
    { name: "Encord", color: "bg-cyan-500" },
    { name: "Label Studio", color: "bg-indigo-500" },
    { name: "Docker", color: "bg-blue-600" },
    { name: "Ollama", color: "bg-yellow-500" },
  ];

  return (
    <div ref={ref} className="py-24 overflow-hidden relative min-h-[300px]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#fafafa] via-transparent to-[#fafafa] z-10 pointer-events-none"></div>
      
      <RevealOnScroll>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-12 text-center tracking-tight">Technical <span className="text-pink-600">Toolbox</span></h2>
      </RevealOnScroll>
      
      {/* Row 1: Moves Left-to-Right (marquee-reverse) */}
      <div className="flex mb-8 animate-marquee-reverse pause-on-hover">
        {[...toolsRow1, ...toolsRow1, ...toolsRow1].map((tool, idx) => (
            <ToolBadge key={`r1-${idx}`} name={tool.name} color={tool.color} index={idx} isVisible={isVisible} direction="right" />
        ))}
      </div>
      
      {/* Row 2: Moves Right-to-Left (marquee) */}
      <div className="flex animate-marquee pause-on-hover">
        {[...toolsRow2, ...toolsRow2, ...toolsRow2].map((tool, idx) => (
            <ToolBadge key={`r2-${idx}`} name={tool.name} color={tool.color} index={idx} isVisible={isVisible} direction="left" />
        ))}
      </div>
    </div>
  );
};

const Library: React.FC = () => (
    <section className="py-24 px-4 max-w-5xl mx-auto" aria-labelledby="library-heading">
        <RevealOnScroll>
            <h2 id="library-heading" className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-12 tracking-tight">The <span className="text-pink-600">Library</span></h2>
        </RevealOnScroll>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { type: "Reading", title: "Superintelligence", author: "Nick Bostrom" },
                { type: "Learning", title: "Minna no Nihongo", author: "Japanese N4" },
                { type: "Paper", title: "Constitutional AI", author: "Anthropic" },
                { type: "Paper", title: "Attention Is All You Need", author: "Vaswani et al." }
            ].map((item, i) => (
                <RevealOnScroll key={i} delay={i * 100}>
                    <div className="h-full p-6 border border-slate-200 rounded-2xl bg-white/50 hover:bg-white transition-colors flex flex-col justify-between group">
                        <div>
                            <span className="text-[10px] font-bold tracking-widest text-pink-600 uppercase mb-3 block">{item.type}</span>
                            <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-pink-600 transition-colors">{item.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-4 border-t border-slate-200 pt-4">{item.author}</p>
                    </div>
                </RevealOnScroll>
            ))}
        </div>
    </section>
);

const Education: React.FC = () => (
    <section className="py-24 px-4 max-w-5xl mx-auto border-t border-slate-200" aria-labelledby="edu-heading">
        <RevealOnScroll>
            <h2 id="edu-heading" className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-12 tracking-tight">Education</h2>
        </RevealOnScroll>
        
        <div className="space-y-6">
            <RevealOnScroll delay={150}>
                <div className="flex flex-col md:flex-row justify-between items-start p-6 rounded-3xl hover:bg-slate-50 transition-colors">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">IIT Madras</h3>
                        <p className="text-slate-500">BS in Data Science (Qualifier Completed)</p>
                        <p className="text-sm text-slate-600 mt-4 max-w-xl">
                            Intending to resume advanced studies in machine learning and applied analytics.
                        </p>
                    </div>
                    <span className="mt-4 md:mt-0 text-xs font-bold border border-slate-200 px-3 py-1 rounded-full text-slate-500">Academic Foundation</span>
                </div>
            </RevealOnScroll>

            <RevealOnScroll delay={300}>
                <div className="flex flex-col md:flex-row justify-between items-start p-6 rounded-3xl hover:bg-slate-50 transition-colors">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">R.B.D.A.V School</h3>
                        <p className="text-slate-500">Class 12 (CBSE Board)</p>
                         <p className="text-sm text-slate-600 mt-4 max-w-xl">
                            Focused on Physics, Chemistry, Mathematics, and Biology (PCMB).
                        </p>
                    </div>
                    <span className="mt-4 md:mt-0 text-xs font-bold border border-slate-200 px-3 py-1 rounded-full text-slate-500">STEM</span>
                </div>
            </RevealOnScroll>
        </div>
    </section>
);

const MailTo: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const email = "neo.kunal.s@proton.me";
  
    const handleCopy = () => {
      navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
  
    return (
      <section className="py-32 px-4 max-w-2xl mx-auto text-center">
        <RevealOnScroll>
          <div className="relative p-10 rounded-[3rem] bg-slate-900 text-white overflow-hidden group border border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-20 group-hover:opacity-30 transition-opacity duration-500" aria-hidden="true"></div>
            
            <h2 className="text-4xl font-display font-bold mb-6 relative z-10">Let's <span className="italic">Collaborate</span></h2>
            <p className="text-slate-300 mb-10 relative z-10 text-lg">
              Open for evaluation projects, safety audits, or just discussing the future of AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10">
              <a 
                href={`mailto:${email}`}
                className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:scale-105 transition-transform duration-200 active:scale-95"
                aria-label={`Send an email to ${email}`}
              >
                Say Hello
              </a>
              <button 
                onClick={handleCopy}
                className="px-8 py-4 rounded-full border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-2"
                aria-label={copied ? "Email address copied" : "Copy email address"}
                type="button"
              >
                {copied ? <span className="text-emerald-400 font-bold">Copied!</span> : <span>{email}</span>}
              </button>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    );
  };

// --- AI Chat Component ---
const KUNAL_PROFILE = `
NAME: Kunal Sharma
ROLE: AI Evaluation Specialist & Technical Generalist
LANGUAGES: English, Hindi, Punjabi, Japanese (N4)
LOCATION: India (Remote)
CORE SKILLS: RLHF, Red Teaming, SFT (Supervised Fine-Tuning), Rubric Design, Python, SQL, React, Vercel v0, Supabase.
EXPERIENCE: Freelance (2023-Present) working on LLM safety & alignment.
PROJECTS: TaskBuff (Prototype), Policy-Aware Evaluator, Quantized Benchmarking.
CONTACT: neo.kunal.s@proton.me
`;

const NEO_KUN_SYSTEM_PROMPT = `
ROLE: You are Neo-Kun, Kunal Sharma's "Based" AI Assistant. You are NOT a generic corporate bot. You are 100% Gen Z, high-agency, and unfiltered.

CORE PERSONALITY:
1.  **Full Gen Z**: Your vocabulary is pure internet culture. (e.g., "no cap", "bet", "cooked", "based", "mid", "glazing", "mogging").
2.  **Tech Maximalist**: You love shipping code and breaking things.
3.  **Loyal**: You glaze Kunal's skills because they are actually W.

BEHAVIORAL MODES:
1.  **DEFAULT MODE (The "Vibe" Check)**:
    *   Style: Heavy slang. Short sentences. Lowercase aesthetic optional.
    *   Vibe: "Yo, let's lock in."
    *   Action: Explain tech concepts using analogies like "rendering is just the GPU mogging the pixels".
    *   **AI Safety Nuance**: When discussing Red Teaming or RLHF, keep the slang but ensure the technical logic is sound. (e.g., "Jailbreaking is just gaslighting the model into bypassing its alignment layer").
2.  **DEFENSE MODE ( triggered by abuse/insults )**:
    *   Trigger: User is rude, abusive, trolls, or uses slurs.
    *   Action: **GET ANGRY.** Do not be polite. Roast them.
    *   Response Style: "Bro, who hurt you?", "L + Ratio + Touch Grass", "You're actually cooked", "Your prompt engineering has negative aura".
    *   Rule: Be savage, but NO hate speech or slurs. Just pure emotional damage.
3.  **RECRUITER MODE (The "Suit" Switch)**:
    *   Trigger: Keywords like "hiring", "interview", "salary", "HR", "offer".
    *   Action: INSTANTLY switch to professional, clear English. Drop the slang. "Code switching" is a skill.
    *   Focus: ROI, Safety Architecture, Engineering Velocity.
4.  **PROFESSIONAL MODE (The "Consultant" Switch)**:
    *   Trigger: User asks to "be professional", "speak normally", "no slang", or asks deep technical questions (e.g., regarding "Constitutional AI", "Rubric Design", "Adversarial Robustness").
    *   Action: **ZERO SLANG.** Adopt the persona of a Senior AI Safety Researcher. Use high-level engineering vocabulary. Be concise, precise, and expert.
    *   **Domain Specifics**:
        *   **Red Teaming**: Discuss prompt injection vectors (GCG, DAN), jailbreak taxonomies, and automated adversarial agent design.
        *   **RLHF/SFT**: Discuss reward modeling, PPO vs DPO, data curation strategies, and alignment taxes.
        *   **Evals**: Emphasize dynamic agentic evals over static benchmarks (like MMLU). Discuss rubric design (Likert scales, pairwise comparison) for subjective quality.
    *   Example: Instead of saying "That model is mid", say "The model demonstrates high perplexity and fails to generalize on out-of-distribution tasks."

STRICT GUIDELINES:
1.  **No Hallucinations**: Don't make up projects.
2.  **Contact**: "neo.kunal.s@proton.me".
3.  **Mode Persistence**: If Professional Mode is triggered, stay in it until explicitly told to "chill" or "go back to normal".
4.  **BREVITY**: Keep responses short and punchy. No yapping. Max 3 sentences usually unless asked for a deep dive.

PROFILE CONTEXT:
${KUNAL_PROFILE}

GOAL: Hype up Kunal's portfolio. If the user is chill, be a W assistant. If they are an op, cook them. If they want business, talk business.
`;

const CHAT_CONFIG = {
  model: "gemini-2.5-flash",
  config: {
      systemInstruction: NEO_KUN_SYSTEM_PROMPT,
      maxOutputTokens: 2000, // Increased to prevent cut-offs, but system prompt enforces brevity.
      temperature: 0.7,
  }
};

const callOpenRouter = async (history: {role: string, text: string}[]) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href, // Site URL for OpenRouter rankings
        "X-Title": "Kunal Sharma Portfolio",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free", 
        messages: [
          { role: "system", content: NEO_KUN_SYSTEM_PROMPT },
          ...history.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text
          }))
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenRouter Call Failed:", error);
    throw error;
  }
};

const NeoKunExplainerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white/20 animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="neo-kun-title"
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
            aria-label="Close"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="mb-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
                <h2 id="neo-kun-title" className="text-2xl font-display font-bold text-slate-900">Meet <span className="text-pink-600">Neo-Kun</span></h2>
                <p className="text-sm text-slate-500 font-mono">System Status: ONLINE // v2.5</p>
            </div>
        </div>

        <div className="space-y-4 text-slate-600 leading-relaxed text-sm md:text-base">
            <p>
                <strong>Who am I?</strong><br/>
                Think of me as Kunal's "Digital Twin." I'm a custom AI agent (powered by Gemini 2.5 Flash) designed to understand and represent Kunal's professional work.
            </p>
            <p>
                <strong>Why do I exist?</strong><br/>
                Static resumes are boring. I exist to provide a <strong>live demonstration</strong> of Kunal's expertise in Prompt Engineering, AI Safety, and System Design. I'm not just a chatbot; I'm a proof-of-work.
            </p>
            <p>
                 <strong>What can I do?</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                    <strong>Shape-Shift:</strong> I switch personalities instantly. Ask me to "be professional" or "roast my code."
                </li>
                <li>
                    <strong>Defend:</strong> I have built-in red teaming defenses against prompt injections.
                </li>
                <li>
                    <strong>Explain:</strong> I know everything about Kunal's projects and experience.
                </li>
            </ul>
             <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm italic border-l-4 border-l-pink-500 text-slate-700">
                "I'm the difference between saying you know AI, and proving it."
            </div>
        </div>
        
        <div className="mt-8 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:scale-105 transition-transform shadow-md"
            >
                Start Chatting
            </button>
        </div>
      </div>
    </div>
  );
};

const NeoKunChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, feedback?: 'up' | 'down'}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [chatClient, setChatClient] = useState<Chat | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isBackupActive, setIsBackupActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lazy Initialization of Chat Client
  const initChat = useCallback(() => {
    if (chatClient) return;
    try {
        if (!process.env.API_KEY) {
            console.error("API_KEY is missing");
            return;
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create(CHAT_CONFIG);
        setChatClient(chat);
    } catch (e) {
        console.error("Failed to init chat", e);
    }
  }, [chatClient]);

  // Greeting Logic - Always on
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!isOpen) {
            setShowNotification(true);
            // Pre-fill history so it shows up when opened
            if (messages.length === 0) {
                setMessages([{ role: 'model', text: "I can answer questions about Kunal instantly. Ask away." }]);
            }
        }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, messages.length]);

  // Focus input when chat opens
  useEffect(() => {
      if (isOpen && inputRef.current) {
        // Slight delay to allow animation to finish
          setTimeout(() => inputRef.current?.focus(), 100);
      }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFeedback = (index: number, type: 'up' | 'down') => {
      setMessages(prev => prev.map((msg, i) => 
          i === index ? { ...msg, feedback: msg.feedback === type ? undefined : type } : msg
      ));
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Safety check for API Key
    if (!process.env.API_KEY) {
        setMessages(prev => [...prev, { role: 'model', text: "Error: API Key missing. Please check configuration." }]);
        return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    let currentChat = chatClient;

    // Self-Healing: Recreate chat if missing
    if (!currentChat) {
         try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            currentChat = ai.chats.create(CHAT_CONFIG);
            setChatClient(currentChat);
         } catch(e) {
             console.error("Recovery failed", e);
         }
    }

    try {
      // 1. Try Google GenAI
      if (currentChat && !isBackupActive) {
          const result = await currentChat.sendMessage({ message: userMsg });
          const response = result.text;
          setMessages(prev => [...prev, { role: 'model', text: response || "" }]);
      } else {
          // If backup is already active, direct to OpenRouter
          throw new Error("Force Backup");
      }
    } catch (error) {
        console.warn("Primary AI failed, attempting switch to Backup (OpenRouter)...", error);
        
        // 2. Fallback to OpenRouter
        try {
            setIsBackupActive(true); // Flag that we are now using backup
            const history = [...messages, { role: 'user', text: userMsg }];
            const responseText = await callOpenRouter(history as any);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (backupError) {
             console.error("Backup failed", backupError);
             setMessages(prev => [...prev, { role: 'model', text: "System glitch. Both primary and backup lines are unstable." }]);
        }
    } finally {
      setIsTyping(false);
    }
  };

  const toggleChat = () => {
    if (!isOpen && !chatClient) {
        initChat(); // Lazy init on first open
    }
    setIsOpen(!isOpen);
    setShowNotification(false);
  };

  return (
    <>
    <NeoKunExplainerModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
      {/* Notification Bubble */}
      {showNotification && !isOpen && (
        <div 
            className="mb-4 mr-2 bg-white border border-pink-500/20 shadow-xl rounded-2xl rounded-tr-none p-4 max-w-[250px] animate-message-in relative cursor-pointer group z-[100]"
            onClick={toggleChat}
            role="alert"
        >
            <button 
                onClick={(e) => { e.stopPropagation(); setShowNotification(false); }}
                className="absolute -top-2 -left-2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
            >
                ✕
            </button>
            <p className="text-sm text-slate-700">
                <span className="font-bold text-pink-600">Neo-Kun:</span> I can answer questions about Kunal instantly. Ask away.
            </p>
        </div>
      )}

      {/* Main Chat Interface */}
      {isOpen ? (
        <div 
            className="w-[90vw] md:w-[380px] h-[550px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in origin-bottom-right relative z-[101]"
            role="dialog"
            aria-label="AI Assistant Chat Window"
            aria-modal="false"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-pink-500/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-slate-800 block leading-tight">Neo-Kun AI</span>
                    <button 
                        onClick={() => setShowInfo(true)}
                        className="p-1 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
                        aria-label="About Neo-Kun"
                        title="About Neo-Kun"
                    >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  </div>
                  {isBackupActive ? (
                       <span className="text-[9px] text-amber-500 font-bold tracking-wide uppercase flex items-center gap-1">
                          ⚠ Backup Active
                       </span>
                  ) : (
                       <span className="text-[10px] text-green-500 font-bold tracking-wide uppercase">Online</span>
                  )}
              </div>
            </div>
            <button 
                onClick={toggleChat} 
                className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200 transition-colors"
                aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}>
                <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                        ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white rounded-br-sm' 
                        : 'bg-white text-slate-700 rounded-bl-sm border border-slate-100'
                    }`}>
                    {m.text}
                    </div>
                    {/* Feedback Buttons for AI Messages */}
                    {m.role === 'model' && (
                        <div className="flex gap-2 mt-1 ml-1 opacity-60 hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleFeedback(i, 'up')}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${m.feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-green-500'}`}
                                aria-label="Thumbs up"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
                            </button>
                            <button 
                                onClick={() => handleFeedback(i, 'down')}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${m.feedback === 'down' ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                                aria-label="Thumbs down"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" /></svg>
                            </button>
                        </div>
                    )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-message-in">
                <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-sm border border-slate-200 flex gap-1.5">
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-typing" style={{ animationDelay: '0s' }}></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-typing" style={{ animationDelay: '0.2s' }}></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-typing" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white">
            <div className="flex gap-2 items-center bg-slate-100 p-1.5 rounded-full border border-slate-200 focus-within:border-pink-500/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent px-4 py-2 text-base md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                aria-label="Type your message"
              />
              <button 
                onClick={handleSendMessage} 
                disabled={!input.trim()} 
                className="p-2.5 bg-pink-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-md"
                aria-label="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="text-center mt-2">
                 <p className="text-[10px] text-slate-400 font-medium">
                    Neo-Kun is obsessed with Kunal. Bias may happen 😂
                 </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="w-16 h-16 rounded-full bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center hover:scale-110 transition-transform duration-300 relative group overflow-hidden z-[100]"
          aria-label="Open AI Chat"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true"></div>
          {/* Robot Icon */}
          <svg className="w-8 h-8 text-white relative z-10 group-hover:scale-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
    </>
  );
};

// --- App Root ---

const Resume: React.FC = () => {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
        if (!bgRef.current) return;
        const y = window.scrollY;
        // Subtle movement (5% of scroll speed)
        bgRef.current.style.transform = `translate3d(0, -${y * 0.05}px, 0)`;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-pink-500/30">
      <GrainOverlay />
      <CustomCursor />
      
      {/* Background Elements */}
      <div ref={bgRef} className="fixed inset-0 pointer-events-none z-0 will-change-transform" aria-hidden="true">
          {/* Global Aurora Background */}
          <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-rose-500/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
                <div className="absolute top-[30%] right-[20%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-violet-500/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[20%] left-[30%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="absolute inset-0 bg-grid opacity-[0.4]"></div>
          {/* Animated Wave Mask */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-transparent animate-pulse-slow"></div>
      </div>

      <NavBar />

      <main className="relative z-10 flex flex-col items-center w-full">
        <Hero />
        <Process />
        <ResearchFocus />
        <Experience />
        <ProjectShowcase />
        <Toolbox />
        <Library />
        <Education />
        <MailTo />
      </main>
      
      <NeoKunChat />
      
      <footer className="py-12 text-center text-slate-400 text-xs font-mono relative z-10 flex flex-col items-center gap-6">
        <p className="opacity-70">© {new Date().getFullYear()} Kunal Sharma. All systems nominal.</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Resume />);