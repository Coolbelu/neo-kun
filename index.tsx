import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from '@google/genai';

// ---------- lightweight theme provider for Vite (replace next-themes) ----------

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextShape {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextShape | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: Theme;
}> = ({ children, defaultTheme = 'system' }) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // initial theme + system listener
  useEffect(() => {
    const saved = window.localStorage.getItem('site-theme') as Theme | null;
    if (saved) {
      setThemeState(saved);
    } else if (defaultTheme === 'system') {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }

    const onPrefChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    };

    const mq =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', onPrefChange);

    return () => mq?.removeEventListener?.('change', onPrefChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep document + localStorage in sync
  useEffect(() => {
    const effective =
      theme === 'system'
        ? window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.classList.toggle('dark', effective === 'dark');
    try {
      window.localStorage.setItem('site-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

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
}

// --- Helper Components ---

// Grain Overlay for Texture
const GrainOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.07] z-[1] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
);

// Magnetic Button Effect
const Magnetic: React.FC<{
  children: React.ReactElement<{ className?: string }>;
}> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const {
      height,
      width,
      left,
      top,
    } = ref.current?.getBoundingClientRect() || {
      height: 0,
      width: 0,
      left: 0,
      top: 0,
    };
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
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {React.cloneElement(children, {
        className: `${
          children.props.className || ''
        } transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)`,
      })}
    </div>
  );
};

// Spotlight Card Effect (Glowing Border on Hover)
const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
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
      className={`relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 ${className}`}
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

const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delay = 0,
}) => {
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
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out-expo transform ${
        isVisible
          ? 'opacity-100 translate-y-0 filter-none'
          : 'opacity-0 translate-y-12 blur-sm'
      }`}
    >
      {children}
    </div>
  );
};

const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  tiltDegree = 3,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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
        transform:
          isHovering && !isMobile
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

    let mouseX = 0,
      mouseY = 0;
    let followerX = 0,
      followerY = 0;

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
      <div
        ref={cursorRef}
        className="fixed w-3 h-3 bg-pink-500 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block will-change-transform"
        aria-hidden="true"
      />
      <div
        ref={followerRef}
        className="fixed w-8 h-8 border border-pink-500/50 rounded-full pointer-events-none z-[9998] transition-opacity duration-300 hidden md:block will-change-transform"
        aria-hidden="true"
      />
    </>
  );
};

// --- Main Content Components ---

const NavBar: React.FC<{ darkMode: boolean; toggleTheme: () => void }> = ({
  darkMode,
  toggleTheme,
}) => {
  const [time, setTime] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      const timeString = new Intl.DateTimeFormat('en-US', options).format(now);
      setTime(timeString);

      const hour = parseInt(timeString.split(':')[0], 10);
      if ((hour >= 9 && hour <= 23) || (hour >= 0 && hour < 2)) {
        setIsBuilding(true);
      } else {
        setIsBuilding(false);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-auto max-w-2xl"
      aria-label="Main Navigation"
    >
      <div className="glass-panel px-5 py-3 rounded-full flex items-center justify-between gap-6 border border-white/20 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-md bg-white/70 dark:bg-black/50">
        <div
          className="flex items-center gap-3"
          role="status"
          aria-label={`Status: ${isBuilding ? 'Building' : 'Recharging'}`}
        >
          <div className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isBuilding ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isBuilding ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold tracking-widest text-slate-600 dark:text-slate-300">
              {isBuilding ? 'BUILDING' : 'RECHARGING'}
            </span>
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
              IST {time}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Magnetic>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
              aria-label={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
              type="button"
            >
              {darkMode ? (
                <svg
                  className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:-rotate-12 transition-transform duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  />
                </svg>
              )}
            </button>
          </Magnetic>
        </div>
      </div>
    </nav>
  );
};

// --- Hero, Process, ResearchFocus, Experience, ProjectShowcase, Toolbox,
//     Library, Education, MailTo, AI chat, and Resume components ---
// (all exactly as you pasted, no changes needed other than imports/theme)
// ---------------
// To keep this message from being 10 km long, I won’t re-collapse them again here,
// but the version you pasted AFTER my last edit is fine – just keep it
// directly under the NavBar component above, unchanged.
// ---------------

// ... paste all the rest of your components here (Hero, Process, ResearchFocus,
// Experience, ProjectShowcase, Toolbox, Library, Education, MailTo, KUNAL_PROFILE,
// NEO_KUN_SYSTEM_PROMPT, CHAT_CONFIG, NeoKunChat) exactly as in your last message ...

// --- App Root ---

const Resume: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const darkMode = theme === 'dark';

  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translate3d(0, -${y * 0.05}px, 0)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => setTheme(darkMode ? 'light' : 'dark');

  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-pink-500/30">
      <GrainOverlay />
      <CustomCursor />

      <div
        ref={bgRef}
        className="fixed inset-0 pointer-events-none z-0 will-change-transform"
      />

      <NavBar darkMode={darkMode} toggleTheme={toggleTheme} />

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

      <footer className="py-12 text-center text-slate-400 dark:text-slate-600 text-xs font-mono relative z-10">
        <p className="opacity-70">
          © {new Date().getFullYear()} Kunal Sharma. All systems nominal.
        </p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider defaultTheme="system">
    <Resume />
  </ThemeProvider>,
)
