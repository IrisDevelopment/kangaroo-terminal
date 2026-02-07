"use client";
import { API_URL, apiFetch } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Terminal, ChevronDown, ChevronRight, CheckCircle2, Globe, MousePointer, StopCircle, Square, Layout, ListTodo, Search, AlertCircle, ArrowUpRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/context/SidebarContext";

export default function AiPage() {
  const { setCollapsed } = useSidebar();
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Kangaroo Neural Link online. I have root access to market data and a web browser. How can I assist?", thoughts: [] }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [todoList, setTodoList] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  
  const [browserState, setBrowserState] = useState({
      url: "about:blank",
      title: "New Tab",
      status: "Idle",
      lastAction: "",
      screenshot: "" 
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setLoading(false);
          setIsBrowsing(false); // force hide browser on stop
          setMessages(prev => {
              const last = prev[prev.length - 1];
              if (!last.content && last.thoughts.length === 0) {
                  return [...prev.slice(0, -1), { role: "assistant", content: "🛑 Process terminated by user.", thoughts: [] }];
              }
              return prev;
          });
      }
  };

  const parseBrowserLogs = (log: string) => {
    // capture browser state (navigation)
    if (log.includes("navigate: url:")) {
        const urlMatch = log.match(/navigate: url: (https?:\/\/[^\s,]+)/);
        if (urlMatch) setBrowserState(prev => ({ ...prev, url: urlMatch[1], status: "Navigating..." }));
    }
    else if (log.includes("search: query:")) {
        const searchMatch = log.match(/search: query: (.*?),/);
        if (searchMatch) setBrowserState(prev => ({ ...prev, url: `search://duckduckgo?q=${encodeURIComponent(searchMatch[1])}`, title: searchMatch[1], status: "Searching..." }));
    }
    
    // update status 
    setBrowserState(prev => ({ ...prev, lastAction: log.replace(/^BROWSER: /, "").substring(0, 80) }));
  };

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    
    // collapse sidebar for better view upon start
    setCollapsed(true);

    // reset intelligence panel
    setTodoList([]);
    setIsBrowsing(false);
    setBrowserState({ url: "about:blank", title: "New Tab", status: "Starting Agent...", lastAction: "", screenshot: "" });

    const newHistory = [...messages, { role: "user", content: userMsg }];
    setMessages([...newHistory, { role: "assistant", content: "", thoughts: ["Initializing Agent..."] }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        const response = await apiFetch(`${API_URL}/ai/agent-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMsg, history: newHistory }),
            signal: controller.signal
        });

        if (!response.body) throw new Error("No stream");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let done = false;
        let finalContent = "";
        let buffer = "";

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });
            
            buffer += chunkValue;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    
                    // ui control events
                    if (json.type === "browser_visibility") {
                        setIsBrowsing(json.visible);
                    }
                    
                    // chat & thoughts
                    else if (json.type === "thought" || json.type === "action" || json.type === "browser_action") {
                        let text = json.content;
                        if (json.type === "browser_action") {
                            text = `BROWSER: ${text}`;
                            parseBrowserLogs(text); 
                        }
                        
                        setMessages(prev => {
                            const history = prev.slice(0, -1);
                            const last = prev[prev.length - 1];
                            const cleanThoughts = last.thoughts[0] === "Initializing Agent..." ? [] : last.thoughts;
                            return [...history, { ...last, thoughts: [...cleanThoughts, text] }];
                        });
                    } 
                    
                    // data sync
                    else if (json.type === "browser_screenshot") {
                        setBrowserState(prev => ({ ...prev, screenshot: `data:image/jpeg;base64,${json.content}` }));
                    }
                    else if (json.type === "file_update" && json.filename === "todo.md") {
                         const rawMarkdown = json.content;
                         if (rawMarkdown) {
                            const lines = rawMarkdown.replace(/\\n/g, "\n").split("\n");
                            const newTodos: any[] = [];
                            lines.forEach((line: string, idx: number) => {
                                const cleanLine = line.trim();
                                if (cleanLine.startsWith("- [ ]") || cleanLine.startsWith("- [x]")) {
                                    newTodos.push({
                                        id: `task-${idx}`,
                                        text: cleanLine.substring(5).trim(),
                                        done: cleanLine.startsWith("- [x]")
                                    });
                                }
                            });
                            if (newTodos.length > 0) setTodoList(newTodos);
                         }
                    }
                    
                    // final answer
                    else if (json.type === "final") {
                        finalContent += json.content;
                        setMessages(prev => {
                            const history = prev.slice(0, -1);
                            const last = prev[prev.length - 1];
                            return [...history, { ...last, content: finalContent }];
                        });
                    }
                } catch (e) {
                     // ignore partial json
                }
            }
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), { ...last, content: last.content + "\n\n⚠️ Connection interrupted." }];
            });
        }
    } finally {
        setLoading(false);
        abortControllerRef.current = null;
        setBrowserState(prev => ({ ...prev, status: "Idle", lastAction: "Task Completed" }));
    }
  };

  return (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)] flex flex-col relative z-0">

      <div className="flex flex-1 gap-6 overflow-hidden relative">
        
        {/* left: main chat interface */}
        <div className="flex-1 min-w-0 luxury-card rounded-2xl flex flex-col overflow-hidden relative border border-white/5 bg-background/80 backdrop-blur-md shadow-2xl">
            
            {/* messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32" ref={scrollRef}>
                <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`flex gap-5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {m.role === "assistant" && (
                                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-surface to-[#0A0806] border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                    <div 
                                        className="w-6 h-6 bg-linear-to-b from-white to-gray-400"
                                        style={{
                                            maskImage: "url('/assets/kangaroo-chat-icon.png')",
                                            maskSize: "contain",
                                            maskRepeat: "no-repeat",
                                            maskPosition: "center",
                                            WebkitMaskImage: "url('/assets/kangaroo-chat-icon.png')",
                                            WebkitMaskSize: "contain",
                                            WebkitMaskRepeat: "no-repeat",
                                            WebkitMaskPosition: "center"
                                        }}
                                    />
                                </div>
                            )}

                            <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                                
                                {/* thought process (the live list) */}
                                {m.thoughts && m.thoughts.length > 0 && (
                                    <ThoughtProcess thoughts={m.thoughts} finished={!loading || i !== messages.length - 1} />
                                )}

                                {/* message bubble */}
                                {m.content && (
                                    <div className={`rounded-2xl p-6 text-[15px] leading-relaxed shadow-xl backdrop-blur-sm ${
                                        m.role === "user" 
                                        ? "bg-linear-to-br from-white/10 to-white/5 text-white rounded-tr-sm border border-white/10" 
                                        : "bg-linear-to-br from-surface to-[#15100d] text-gray-200 rounded-tl-sm border border-white/5 w-full ring-1 ring-black/50"
                                    }`}>
                                        <div 
                                            className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-primary prose-a:text-blue-400 prose-ul:my-2 prose-img:rounded-xl prose-img:border prose-img:border-white/10"
                                            dangerouslySetInnerHTML={{ 
                                                __html: m.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                                            }} 
                                        />
                                    </div>
                                )}
                            </div>

                            {m.role === "user" && (
                                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                                    <User size={18} className="text-white" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* input area */}
            <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
                <motion.div 
                      initial={{ width: "90%" }}
                      animate={{ width: isFocused || input.length > 0 ? "95%" : "90%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="pointer-events-auto rounded-full shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                >
                    <form onSubmit={handleSend} className="relative flex items-center gap-2 bg-surface border border-white/10 rounded-full p-2 ring-1 ring-white/5 transition-colors focus-within:border-white/20 focus-within:ring-white/5 backdrop-blur-xl shadow-[inset_0_2px_15px_rgba(0,0,0,0.6)]">
                        <div className="pl-4 text-gray-500 group-focus-within:text-white/50 transition-colors">
                            <Terminal size={18} />
                        </div>
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={loading ? "Agent is working..." : "Instruct the Neural Agent..."}
                            disabled={loading}
                            className="flex-1 bg-transparent border-none py-3 px-2 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-sm"
                        />
                        
                        {loading ? (
                            <button 
                                type="button"
                                onClick={handleStop}
                                className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-all hover:scale-105 active:scale-95"
                                title="Stop Generation"
                            >
                                <Square size={16} fill="currentColor" className="animate-pulse" />
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                className="p-3 bg-white text-black rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                            >
                                <Send size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </form>
                </motion.div>
            </div>
        </div>

        {/* right: intelligence panel (conditional) */}
        <AnimatePresence>
            {isBrowsing && (
                <motion.div 
                    initial={{ opacity: 0, width: 0, x: 20 }}
                    animate={{ opacity: 1, width: "50%", x: 0 }}
                    exit={{ opacity: 0, width: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="hidden lg:flex flex-col gap-4 overflow-hidden shrink-0 border-l border-white/5 p-6 h-full relative"
                >
                    {/* browser feed card */}
                    <div className="luxury-card flex flex-col border border-white/5 bg-background overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/5 flex-1">
                        
                        {/* browser toolbar */}
                        <div className="bg-surface p-3 border-b border-white/5 flex items-center justify-between gap-3">
                             <div className="flex items-center gap-3 flex-1 min-w-0">
                                 <div className="flex gap-1.5 shrink-0">
                                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                     <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                 </div>
                                 <div className="flex-1 bg-black/40 rounded-lg flex items-center px-3 py-1.5 gap-2 text-[11px] text-gray-400 font-mono border border-white/5 truncate transition-colors hover:border-white/10 hover:bg-black/60">
                                     <Globe size={12} className="text-primary/70 shrink-0" />
                                     <span className="truncate">{browserState.url || "about:blank"}</span>
                                 </div>
                             </div>
                        </div>
                        
                        {/* browser viewport */}
                        <div className="relative bg-[#050505] flex items-center justify-center overflow-hidden group/browser flex-1 w-full h-full min-h-0">
                             {/* visual feed */}
                             {browserState.screenshot ? (
                                <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
                                    {/* ambience background inspired by yt ambient view */}
                                    <div 
                                        className="absolute inset-0 w-full h-full opacity-40 blur-3xl scale-125 saturate-200"
                                        style={{ backgroundImage: `url(${browserState.screenshot})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    ></div>
                                    
                                    {/* main image */}
                                    <div className="relative z-10 w-full h-full p-4 flex items-center justify-center">
                                        <img 
                                            src={browserState.screenshot} 
                                            alt="Live Browser Feed" 
                                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm ring-1 ring-white/10" 
                                        />
                                    </div>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center gap-4 text-center p-8 z-10 relative">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
                                        <Globe size={40} className="text-primary relative z-10 animate-bounce-slow" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-400 font-medium">{browserState.status}</p>
                                        <p className="text-xs text-gray-600 font-mono max-w-50 truncate mx-auto">{browserState.title}</p>
                                    </div>
                                </div>
                             )}

                             {/* status overlay */}
                             <div className="absolute bottom-4 left-4 right-4 z-20 group-hover/browser:opacity-0 transition-opacity duration-300">
                                <div className="bg-surface/90 backdrop-blur-md border border-white/10 p-3 rounded-xl text-xs font-mono text-gray-300 shadow-lg flex items-start gap-2 max-w-2xl mx-auto">
                                     <span className="text-primary mt-0.5">❯</span>
                                     <span className="break-all line-clamp-2">{browserState.lastAction || "Waiting for signal..."}</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* todo list panel (conditional) */}
                    {todoList.length > 0 && (
                        <div className="flex-1 luxury-card flex flex-col border border-white/5 bg-background overflow-hidden min-h-0 rounded-2xl shadow-xl">
                            <div className="p-4 border-b border-white/5 bg-surface/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ListTodo size={16} className="text-primary" />
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mission Plan</h3>
                                </div>
                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500 border border-white/5">
                                    {todoList.filter(t => t.done).length}/{todoList.length}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                                {todoList.map((todo) => (
                                    <motion.div 
                                        key={todo.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`p-3 rounded-lg border text-xs flex items-start gap-3 transition-all duration-300 group ${
                                            todo.done 
                                            ? "bg-green-500/5 border-green-500/20 text-gray-500" 
                                            : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:border-primary/20"
                                        }`}
                                    >
                                        <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                            todo.done 
                                            ? "bg-green-500 text-black border-green-500" 
                                            : "border-white/20 group-hover:border-primary/50"
                                        }`}>
                                            {todo.done && <CheckCircle2 size={10} />}
                                        </div>
                                        <span className={`${todo.done ? "line-through opacity-60" : ""} leading-relaxed`}>{todo.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// visual components

const LiveTimer = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setSeconds(s => s + 0.1), 100);
        return () => clearInterval(interval);
    }, []);
    return (
        <span className="font-mono text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 min-w-12 text-center">
            {seconds.toFixed(1)}s
        </span>
    );
};

const ThoughtProcess = ({ thoughts, finished }: { thoughts: string[], finished: boolean }) => {
    const [isOpen, setIsOpen] = useState(!finished);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (finished) {
            const timer = setTimeout(() => setIsOpen(false), 5000); 
            return () => clearTimeout(timer);
        } else {
            setIsOpen(true);
        }
    }, [finished]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [thoughts]);

    return (
        <div className="w-full mb-4 min-w-75">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-primary transition-colors uppercase tracking-wide mb-2 group w-full px-1"
            >
                <div className={`p-1.5 rounded-full border transition-all duration-500 ${finished ? "bg-green-500/10 border-green-500/50 text-green-500" : "bg-primary/10 border-primary/50 text-primary animate-pulse-subtle shadow-[0_0_10px_rgba(198,142,86,0.3)]"}`}>
                    {finished ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                </div>
                
                <span className="flex-1 text-left flex items-center gap-3">
                    {finished ? "Reasoning Complete" : "Neural Agent Active"}
                    {!finished && <LiveTimer />}
                </span>

                <div className="h-px w-12 bg-white/5 group-hover:bg-primary/20 transition-colors"></div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div 
                            ref={scrollRef}
                            className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-4 max-h-75 overflow-y-auto custom-scrollbar font-mono text-[11px] flex flex-col gap-2 shadow-inner ring-1 ring-white/5"
                        >
                            {thoughts.map((t, i) => {
                                const isBrowser = t.includes("BROWSER:");
                                const isAction = t.includes("Action:");
                                const isError = t.includes("Error");
                                const cleanText = t.replace("BROWSER:", "").replace("THOUGHT:", "").trim();

                                return (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                        transition={{ duration: 0.3 }}
                                        className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                                            isBrowser ? "bg-blue-900/10 text-blue-200 border-blue-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]" : 
                                            isError ? "bg-red-900/10 text-red-300 border-red-500/20" :
                                            "text-gray-400 border-transparent hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0 opacity-70">
                                            {isBrowser ? <Globe size={12} className="text-blue-400" /> : 
                                             isAction ? <MousePointer size={12} className="text-primary" /> : 
                                             <Terminal size={12} />}
                                        </div>
                                        <span className="break-all leading-relaxed">{cleanText}</span>
                                    </motion.div>
                                );
                            })}
                            {!finished && (
                                <div className="flex items-center gap-2 text-primary/40 pl-2 pt-1">
                                    <span className="animate-pulse">_</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
