import React, { useEffect, useState, useRef } from 'react';
import { Loader2, MoreHorizontal, ArrowLeft, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<boolean | void>;
    };
  }
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type UIState = 'IDLE' | 'GENERATING' | 'DONE';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';

const ScrambleParagraph = ({ text, isSearching }: { text: string, isSearching: boolean, key?: any }) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSearching) {
      interval = setInterval(() => {
        setDisplayText(prev => {
          let scrambled = '';
          const chars = prev.length > 0 ? prev : text;
          for (let i = 0; i < chars.length; i++) {
             if (chars[i] === ' ') scrambled += ' ';
             else scrambled += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          }
          return scrambled;
        });
      }, 50);
    } else {
      let frame = 0;
      const step = Math.max(1, Math.floor(text.length / 20));
      interval = setInterval(() => {
        setDisplayText(() => {
          let next = '';
          for (let i = 0; i < text.length; i++) {
            if (i < frame) {
              next += text[i];
            } else {
              next += text[i] === ' ' ? ' ' : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            }
          }
          return next;
        });
        frame += step;
        if (frame > text.length) {
          clearInterval(interval);
          setDisplayText(text);
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isSearching, text]);

  return <p className="text-justify mb-8">{displayText}</p>;
};

const PixelArtLoader = () => {
  const COLS = 7;
  const ROWS = 9;
  
  const [pixels, setPixels] = useState(() => Array.from({length: ROWS * COLS}, (_, i) => ({
    r: Math.floor(i / COLS),
    c: i % COLS,
    active: false,
    color: '#000',
    char: ''
  })));

  useEffect(() => {
    const update = () => {
      setPixels(prev => prev.map(p => {
        const dx = p.c - COLS / 2;
        const dy = p.r - ROWS / 2;
        // make an irregular shape
        const isActive = Math.random() > 0.1 && (dx*dx*1.8 + dy*dy < 14);
        if (isActive) {
          const isWhite = Math.random() < 0.25 && p.c <= COLS / 2; // mostly white on the left side
          const shades = ['#4a4a4a', '#5c5c5c', '#6d6d6d', '#7e7e7e', '#8f8f8f', '#a1a1a1'];
          return {
            ...p,
            active: true,
            color: isWhite ? '#ffffff' : shades[Math.floor(Math.random() * shades.length)],
            char: isWhite ? Math.floor(Math.random() * 10).toString() : ''
          };
        } else {
          return { ...p, active: false };
        }
      }));
    };
    
    update();
    const interval = setInterval(update, 150); // flickering effect
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex pointer-events-none"
    >
      <div 
        className="grid gap-[1px]" 
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, width: '70px', height: '90px' }}
      >
        {pixels.map((p, i) => (
          <div 
            key={i} 
            className="flex items-center justify-center text-[10px] font-mono leading-none font-bold overflow-hidden"
            style={{
              backgroundColor: p.active ? p.color : 'transparent',
              color: p.color === '#ffffff' ? '#000000' : 'transparent',
            }}
          >
            {p.char}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [rects, setRects] = useState<Rect[]>([]);
  const [uiState, setUiState] = useState<UIState>('IDLE');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const autoTypeActive = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [articleParagraphs, setArticleParagraphs] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasLinkedKey, setHasLinkedKey] = useState(false);

  const handleEnterClick = async () => {
    if (!hasLinkedKey) {
      if (window.aistudio && window.aistudio.openSelectKey) {
        const success = await window.aistudio.openSelectKey();
        if (success !== false) {
          setHasLinkedKey(true);
          setShowWelcome(false);
        }
        return;
      } else {
        console.warn("AI Studio native context not found.");
      }
    }
    setShowWelcome(false);
  };

  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  const rectsRef = useRef(rects);
  rectsRef.current = rects;

  const isMouseDownRef = useRef(isMouseDown);
  isMouseDownRef.current = isMouseDown;

  const selectionTextRef = useRef(selectionText);
  selectionTextRef.current = selectionText;

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showWelcome) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        textAreaRef.current?.focus();
        setHeaderText((prev) => {
          autoTypeActive.current = false;
          setIsTyping(false);
          return prev.slice(0, -1);
        });
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        textAreaRef.current?.focus();
        setHeaderText((prev) => {
          autoTypeActive.current = false;
          setIsTyping(false);
          return prev + e.key;
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showWelcome]);

  useEffect(() => {
    if (showWelcome) return;

    let timeout: NodeJS.Timeout;
    const textToType = 'Type something here';
    let currentIndex = 0;

    const typeNextChar = () => {
      if (!autoTypeActive.current) {
        setIsTyping(false);
        return;
      }
      if (currentIndex < textToType.length) {
        setHeaderText(textToType.substring(0, currentIndex + 1));
        currentIndex++;
        const delay = Math.random() * 120 + 30; // irregular delay
        timeout = setTimeout(typeNextChar, delay);
      } else {
        setIsTyping(false);
      }
    };

    timeout = setTimeout(typeNextChar, 500);
    return () => clearTimeout(timeout);
  }, [showWelcome]);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Don't clear selection UI while generating
      if (uiStateRef.current === 'GENERATING') {
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setRects([]);
        setSelectionText('');
        if (uiStateRef.current !== 'IDLE') {
          setUiState('IDLE');
          setImageUrl(null);
          setExplanation(null);
        }
        return;
      }

      const range = selection.getRangeAt(0);
      const domRects = Array.from(range.getClientRects());
      setRects(domRects.map((r) => ({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })));
      setSelectionText(selection.toString());
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsMouseDown(true);
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (rects.length > 0 && selectionText.trim().length > 0) {
      // Debounce the trigger by 400ms to allow drag selection to finish or pause
      const timeoutId = setTimeout(() => {
        if (uiStateRef.current === 'IDLE') {
          setUiState('GENERATING');
          
          fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: selectionText })
          })
          .then(r => r.json())
          .then(data => {
            if (data.imageUrl && uiStateRef.current === 'GENERATING') {
              setImageUrl(data.imageUrl);
              setExplanation(data.explanation || null);
              setUiState('DONE');
            } else if (data.error && uiStateRef.current === 'GENERATING') {
               setUiState('IDLE');
               console.error(data.error);
            }
          })
          .catch(err => {
            console.error(err);
            if (uiStateRef.current === 'GENERATING') {
               setUiState('IDLE');
            }
          });
        }
      }, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [rects, selectionText]);

  const showTooltip = uiState === 'GENERATING' || uiState === 'DONE';

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    
    if (articleParagraphs.length === 0) {
      setArticleParagraphs([
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras cursus quam vel diam egestas, non elementum turpis finibus. Sed feugiat, justo accumsan feugiat sagittis, enim ex hendrerit turpis, auctor finibus eros odio ut purus. Sed sit amet mi tristique, fermentum elit id, mollis neque.",
        "Curabitur facilisis varius enim ac dictum. Pellentesque suscipit tortor ac ex interdum, et interdum eros vulputate. Quisque tristique magna eu congue eleifend.",
        "Integer laoreet congue elit, vel dignissim lorem feugiat non. Cras pellentesque lectus a iaculis porta. Nunc sit amet lorem auctor, mattis risus ac, mollis turpis."
      ]);
    }

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.title && data.paragraphs) {
        // We do not overwrite the header text anymore
        setArticleParagraphs(data.paragraphs);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`w-full min-h-screen ${showTooltip && uiState === 'GENERATING' ? 'cursor-none' : ''}`}>
      <div className={`w-full max-w-[600px] mx-auto px-8 sm:px-16 min-h-screen pt-10 pb-24 font-sans leading-relaxed text-lg relative bg-[#FAE125] flex flex-col transition-colors duration-300 ${showTooltip ? 'text-[var(--color-primary-text)] sm:text-[rgba(51,51,51,0.3)]' : 'text-[var(--color-primary-text)]'}`}>
        {showWelcome ? (
          <div className="flex-1 flex flex-col justify-center gap-[12px]">
            <h1 className="text-4xl font-semibold tracking-tight">
              Welcome to <span className="block sm:inline">peek-a-word</span>
            </h1>
            <p className="text-xl leading-relaxed font-medium">
              Enjoy the interactive reading experience where you can highlight any word to get an instant definition with contextual images.
            </p>
            <button 
              onClick={handleEnterClick}
              className="w-full h-[56px] border-[2.5px] border-black bg-[#FAE125] text-black font-semibold text-lg hover:bg-[#f5db18] transition-colors"
            >
              Enter
            </button>
          </div>
        ) : (
          <>
            <div className="mb-12 flex items-center h-[56px] gap-3">
              <button
                onClick={() => setShowWelcome(true)}
                className="h-full aspect-square flex items-center justify-center border-[2.5px] border-black bg-[#FAE125] shrink-0"
              >
                <ArrowLeft className="w-6 h-6 text-black" />
              </button>
              
              <div className="flex-1 h-full border-[2.5px] border-black bg-[#FAE125] flex items-center px-4">
                <input
                  ref={inputRef}
                  autoFocus
                  value={headerText}
                  onChange={(e) => {
                    autoTypeActive.current = false;
                    setIsTyping(false);
                    setHeaderText(e.target.value);
                  }}
                  onFocus={() => {
                    autoTypeActive.current = false;
                    setIsTyping(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch(headerText);
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Type something here"
                  className="w-full bg-transparent focus:outline-none text-xl font-medium text-[var(--color-primary-text)] placeholder-[rgba(51,51,51,0.5)]"
                  spellCheck={false}
                />
              </div>

              <button
                onClick={() => {
                  if (articleParagraphs.length > 0) {
                    setHeaderText('');
                    setArticleParagraphs([]);
                    inputRef.current?.focus();
                  } else {
                    handleSearch(headerText);
                  }
                }}
                className="h-full aspect-square flex items-center justify-center border-[2.5px] border-black bg-[#FAE125] shrink-0"
              >
                {articleParagraphs.length > 0 ? (
                  <X className="w-6 h-6 text-black" />
                ) : (
                  <Search className="w-6 h-6 text-black" />
                )}
              </button>
            </div>
            {articleParagraphs.map((p, i) => (
              <ScrambleParagraph key={i} text={p} isSearching={isSearching} />
            ))}
          </>
        )}
      </div>

      <AnimatePresence>
        {showTooltip && (
          <>
            {/* Desktop Tooltip */}
            <div
              className="fixed hidden sm:flex pointer-events-none z-40 items-start gap-3 transition-transform duration-[50ms]"
              style={{
                left: mousePos.x,
                top: mousePos.y,
                transform: `translate(16px, 16px)`
              }}
            >
              {uiState === 'GENERATING' && (
                <>
                  <PixelArtLoader />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, type: 'spring', bounce: 0.4 }}
                    className="overflow-hidden pointer-events-none flex flex-col w-[304px] bg-black rounded-2xl rounded-tl-none p-5"
                  >
                    <div className="pb-5 shrink-0 flex flex-col gap-2.5">
                      <div className="h-4 bg-gray-300 rounded-xl w-full animate-pulse flex-shrink-0"></div>
                      <div className="h-4 bg-gray-300 rounded-xl w-11/12 animate-pulse flex-shrink-0"></div>
                      <div className="h-4 bg-gray-300 rounded-xl w-4/5 animate-pulse flex-shrink-0"></div>
                    </div>
                    <div className="w-full h-48 sm:h-56 shrink-0 bg-gray-400 rounded-xl animate-pulse"></div>
                  </motion.div>
                </>
              )}
              {uiState === 'DONE' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, type: 'spring', bounce: 0.4 }}
                  className="overflow-hidden pointer-events-none flex flex-col w-[320px] bg-black rounded-2xl rounded-tl-none p-5"
                >
                  {explanation && (
                    <div className="pb-5 shrink-0">
                      <p className="text-sm text-white leading-relaxed font-medium">
                        {explanation}
                      </p>
                    </div>
                  )}
                  {imageUrl && (
                    <div className="w-full h-48 sm:h-56 shrink-0 bg-gray-900 flex items-center justify-center overflow-hidden rounded-xl">
                      <img src={imageUrl} alt="Generated visual context" className="w-full h-full object-cover" />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Mobile Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 flex sm:hidden flex-col bg-white rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pointer-events-auto"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
              {uiState === 'GENERATING' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="h-4 bg-gray-200 rounded-xl w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-xl w-11/12 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-xl w-4/5 animate-pulse"></div>
                  </div>
                  <div className="w-full h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                </div>
              )}
              {uiState === 'DONE' && (
                <div className="flex flex-col gap-4">
                  {explanation && (
                    <div className="text-base text-gray-800 leading-relaxed font-medium mb-2">
                      {explanation}
                    </div>
                  )}
                  {imageUrl && (
                    <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden rounded-xl">
                      <img src={imageUrl} alt="Generated visual context" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
