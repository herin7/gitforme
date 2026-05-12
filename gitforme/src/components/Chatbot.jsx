import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useParams } from "react-router-dom";

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const MinimizeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const BotAvatar = () => (
  <div className="w-10 h-10 flex-shrink-0 bg-black rounded-full flex items-center justify-center border-2 border-gray-700 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="2" fill="#F9C79A" />
      <path d="M6 11H18V13H6V11Z" fill="black" />
      <path d="M7 11V10C7 9.44772 7.44772 9 8 9H10V11H7Z" fill="black" />
      <path d="M17 11V10C17 9.44772 16.5523 9 16 9H14V11H17Z" fill="black" />
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="4"
        stroke="#F9C79A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="3" r="1" fill="#F9C79A" />
    </svg>
  </div>
);

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// --- Supported model platforms ---
const MODEL_PLATFORMS = [
  { id: "azure", label: "Azure OpenAI", hint: "Uses Azure OpenAI endpoint" },
  { id: "openai", label: "OpenAI", hint: "Uses OpenAI API directly" },
  { id: "gemini", label: "Google Gemini", hint: "Coming soon", disabled: true },
  { id: "anthropic", label: "Anthropic", hint: "Coming soon", disabled: true },
];

const useChat = () => {
  const { username, reponame } = useParams();
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am GitBro. Ask me to summarize the repo, list dependencies, or explain a specific file.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState("");
  const messagesEndRef = useRef(null);

  // Simplified credentials — only API Key + Model Platform
  const [apiKey, setApiKey] = useState("");
  const [modelPlatform, setModelPlatform] = useState("azure");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !username || !reponame || isStreaming) return;

    const userMessage = { sender: "user", text: messageText };
    setMessages((prev) => [...prev, userMessage, { sender: "bot", text: "" }]);
    setInput("");
    setIsStreaming(true);
    setStatus("Thinking...");

    try {
      // Build request body
      const requestBody = {
        query: messageText,
        repoId: `${username}/${reponame}`,
      };

      // Only include API key if provided — backend falls back to its own env vars
      if (apiKey.trim()) {
        requestBody.apiKey = apiKey.trim();
        // For Azure platform, the endpoint & deployment use server-side defaults
        // For OpenAI platform, the backend can route accordingly (future)
        requestBody.modelPlatform = modelPlatform;
      }

      const response = await fetch("https://gitforme-bot.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botText = "";
      setStatus("Generating response...");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\n\n").forEach((line) => {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.token) {
                botText += json.token;
                setMessages((prev) => {
                  const lastMsg = { ...prev[prev.length - 1], text: botText };
                  return [...prev.slice(0, -1), lastMsg];
                });
              }
            } catch (e) {
              console.error("JSON Parse Error:", e);
            }
          }
        });
      }
    } catch (error) {
      setMessages((prev) => {
        const errorMsg = {
          ...prev[prev.length - 1],
          text: `Sorry, an error occurred: ${error.message}`,
        };
        return [...prev.slice(0, -1), errorMsg];
      });
    } finally {
      setIsStreaming(false);
      setStatus("");
    }
  };

  return {
    messages,
    input,
    setInput,
    handleSendMessage,
    isStreaming,
    status,
    messagesEndRef,
    apiKey,
    setApiKey,
    modelPlatform,
    setModelPlatform,
  };
};

// --- Settings Panel (collapsible, triggered from header) ---
const SettingsPanel = ({
  isOpen,
  apiKey,
  setApiKey,
  modelPlatform,
  setModelPlatform,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden border-b-2 border-black"
        >
          <div className="p-4 bg-[#FEF9F2] space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SettingsIcon />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Model Configuration
              </span>
            </div>

            {/* Model Platform Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Model Platform
              </label>
              <div className="relative">
                <select
                  value={modelPlatform}
                  onChange={(e) => setModelPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                >
                  {MODEL_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.disabled}>
                      {p.label} {p.disabled ? "(Coming Soon)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDownIcon />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {MODEL_PLATFORMS.find((p) => p.id === modelPlatform)?.hint}
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                API Key
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors text-sm"
                  title={showApiKey ? "Hide API Key" : "Show API Key"}
                >
                  {showApiKey ? "\uD83D\uDE48" : "\uD83D\uDC41\uFE0F"}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Leave empty to use the default server-side key.
              </p>
            </div>

            {/* Connection indicator */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  apiKey.trim() ? "bg-green-500" : "bg-amber-400"
                }`}
              />
              <span className="text-[11px] text-gray-500">
                {apiKey.trim()
                  ? "Using your API key"
                  : "Using default server key"}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ChatHeader = ({ onClose, onMinimize, onToggleSettings, isSettingsOpen }) => (
  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#FEF9F2] flex-shrink-0">
    <div className="flex items-center gap-3">
      <BotAvatar />
      <div>
        <h3 className="font-bold text-lg tracking-tight leading-tight">GitBro</h3>
        <span className="text-[11px] text-gray-400 leading-tight">AI Repo Analyst</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleSettings}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          isSettingsOpen
            ? "bg-amber-200 text-black border border-black"
            : "text-gray-400 hover:text-black hover:bg-gray-100"
        }`}
        title="Model Settings"
      >
        <SettingsIcon />
      </button>
      <button
        onClick={onMinimize}
        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all duration-200"
        title="Minimize"
      >
        <MinimizeIcon />
      </button>
      <button
        onClick={onClose}
        className="p-1.5 font-bold text-lg text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all duration-200 leading-none"
        title="Close"
      >
        ✕
      </button>
    </div>
  </div>
);

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-4 bg-[#2d2a2e] rounded-lg border border-black/20 text-sm overflow-hidden not-prose">
      <div className="px-4 py-2 bg-black/20 text-white/50 text-xs flex justify-between items-center">
        <span>{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs hover:text-white transition-colors disabled:opacity-50"
          disabled={copied}
        >
          {copied ? (
            "Copied!"
          ) : (
            <>
              <CopyIcon /> Copy code
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={atomDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const BotResponse = ({ text, isStreaming, isLastMessage }) => {
  const components = {
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, "")}
        />
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  const displayText = text + (isStreaming && isLastMessage ? "\u258D" : "");

  return (
    <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-gray-800 prose-a:text-amber-700 prose-a:font-semibold hover:prose-a:text-amber-900 prose-strong:text-black prose-ul:my-2 prose-ol:my-2 prose-li:marker:text-gray-500 prose-blockquote:border-l-4 prose-blockquote:border-amber-400 prose-blockquote:pl-4 prose-blockquote:text-gray-600 prose-code:bg-amber-100 prose-code:text-amber-900 prose-code:font-mono prose-code:px-1.5 prose-code:py-1 prose-code:rounded-md prose-table:border prose-th:p-2 prose-td:p-2 prose-th:bg-gray-100">
      <ReactMarkdown components={components}>{displayText}</ReactMarkdown>
    </article>
  );
};

const MessageBubble = ({ msg, isStreaming, isLastMessage }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.3 }}
    className={`w-full flex mb-4 ${
      msg.sender === "user" ? "justify-end" : "justify-start items-end gap-2"
    }`}
  >
    {msg.sender === "bot" && <BotAvatar />}
    <div
      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
        msg.sender === "user"
          ? "bg-[#F9C79A] text-black rounded-br-none"
          : "bg-white border-2 border-black rounded-bl-none"
      }`}
    >
      {msg.sender === "bot" ? (
        <BotResponse
          text={msg.text}
          isStreaming={isStreaming}
          isLastMessage={isLastMessage}
        />
      ) : (
        msg.text
      )}
    </div>
  </motion.div>
);

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-end gap-2 mb-4"
  >
    <BotAvatar />
    <div className="flex items-center gap-1.5 px-4 py-4 bg-white border-2 border-black rounded-2xl rounded-bl-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
      {[0, 0.2, 0.4].map((d, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d,
          }}
        />
      ))}
    </div>
  </motion.div>
);

const MessageList = ({ messages, isStreaming, messagesEndRef }) => (
  <div className="flex-1 p-4 overflow-y-auto bg-amber-50">
    {messages.map((msg, index) => (
      <MessageBubble
        key={index}
        msg={msg}
        isStreaming={isStreaming}
        isLastMessage={index === messages.length - 1}
      />
    ))}
    {isStreaming &&
      messages[messages.length - 1]?.sender === "bot" &&
      !messages[messages.length - 1]?.text && <TypingIndicator />}
    <div ref={messagesEndRef} />
  </div>
);

const ChatInput = ({ input, setInput, onSendMessage, isStreaming, status }) => {
  const suggestedPrompts = [
    "Summarize this repo",
    "List the main dependencies",
    "What are the key files?",
  ];

  return (
    <div className="p-4 border-t-2 border-black flex flex-col gap-3 bg-[#FEF9F2] flex-shrink-0">
      {/* Chat Input Box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && onSendMessage(input)
          }
          placeholder="Ask a question..."
          className="flex-1 px-4 py-2.5 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-sm"
          disabled={isStreaming}
        />
        <button
          onClick={() => onSendMessage(input)}
          className="bg-[#F9C79A] text-black font-bold w-12 h-12 flex items-center justify-center border-2 border-black rounded-xl hover:bg-amber-400 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-px active:translate-x-px active:shadow-none"
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      {/* Status / Suggested Prompts */}
      {status ? (
        <p className="text-xs text-gray-500 text-center animate-pulse">
          {status}
        </p>
      ) : (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSendMessage(prompt)}
              className="px-3 py-1.5 bg-white border border-black/20 text-xs rounded-full hover:bg-amber-100 hover:border-black transition-all duration-200 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatbotPanel = ({ onClose }) => {
  const chatLogic = useChat();
  const [width, setWidth] = useState(420);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 430);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 380 && newWidth < window.innerWidth * 0.8)
        setWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 430);
      if (window.innerWidth <= 430) setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "";
  }, []);

  const handleMinimize = () => setIsMinimized(true);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full bg-[#FEF9F2] border-l-2 border-black shadow-[-8px_0_0_rgba(0,0,0,1)] flex flex-col z-40"
      variants={{
        open: { x: 0, width: width },
        closed: { x: "100%", width: width },
      }}
      initial="closed"
      animate={isMinimized ? "closed" : "open"}
      exit="closed"
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      onAnimationComplete={() => isMinimized && onClose()}
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-[-4px] w-2 h-full cursor-col-resize z-50"
      />
      <ChatHeader
        onClose={onClose}
        onMinimize={handleMinimize}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
      />
      <SettingsPanel
        isOpen={isSettingsOpen}
        apiKey={chatLogic.apiKey}
        setApiKey={chatLogic.setApiKey}
        modelPlatform={chatLogic.modelPlatform}
        setModelPlatform={chatLogic.setModelPlatform}
      />
      <MessageList {...chatLogic} />
      <ChatInput {...chatLogic} onSendMessage={chatLogic.handleSendMessage} />
    </motion.div>
  );
};

export default ChatbotPanel;
