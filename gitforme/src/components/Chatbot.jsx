import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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

  // 🔑 Azure Credentials
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [apiVersion, setApiVersion] = useState("2023-05-15");

  const [showApiKey, setShowApiKey] = useState(false);

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

      // ✅ Only include Azure creds if all 3 are present
      if (azureEndpoint && apiKey && deployment) {
        requestBody.azureEndpoint = azureEndpoint;
        requestBody.apiKey = apiKey;
        requestBody.deployment = deployment;
        requestBody.apiVersion = apiVersion;
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
    // expose credentials to UI
    azureEndpoint,
    setAzureEndpoint,
    apiKey,
    setApiKey,
    deployment,
    setDeployment,
    apiVersion,
    setApiVersion,
  };
};

const ChatHeader = ({ onClose, onMinimize }) => (
  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#FEF9F2] flex-shrink-0">
    <div className="flex items-center gap-3">
      <BotAvatar />
      <h3 className="font-bold text-lg tracking-tight">GitBro</h3>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={onMinimize}
        className="text-black hover:opacity-70 transition-opacity"
        title="Minimize"
      >
        <MinimizeIcon />
      </button>
      <button
        onClick={onClose}
        className="font-bold text-xl text-black hover:opacity-70 transition-opacity"
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

  const displayText = text + (isStreaming && isLastMessage ? "▍" : "");

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

const ChatInput = ({
  input,
  setInput,
  onSendMessage,
  isStreaming,
  status,
  azureEndpoint,
  setAzureEndpoint,
  apiKey,
  setApiKey,
  deployment,
  setDeployment,
  apiVersion,
  setApiVersion,
}) => {
  const suggestedPrompts = [
    "Summarize this repo",
    "List the main dependencies",
    "What are the key files?",
  ];
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEndpoint, setShowEndpoint] = useState(false);

  //  Validation logic
  const hasAnyCred = azureEndpoint || apiKey || deployment;
  const allCredsFilled = azureEndpoint && apiKey && deployment;
  const showWarning = hasAnyCred && !allCredsFilled;

  return (
    <div className="p-4 border-t-2 border-black flex flex-col gap-3 bg-[#FEF9F2] flex-shrink-0">
      {/*  Credential Inputs */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative">
          <input
            type={showEndpoint ? "text" : "password"}
            placeholder="Azure Endpoint"
            value={azureEndpoint}
            onChange={(e) => setAzureEndpoint(e.target.value)}
            className="px-2 py-1 border rounded text-xs pr-8 w-full"
          />
          <button
            type="button"
            onClick={() => setShowEndpoint(!showEndpoint)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black text-xs"
          >
            {showEndpoint ? "🙈" : "👁️"}
          </button>
        </div>

        {/* API Key */}
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="px-2 py-1 border rounded text-xs pr-8 w-full"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black text-xs"
          >
            {showApiKey ? "🙈" : "👁️"}
          </button>
        </div>

        <input
          type="text"
          placeholder="Deployment Name"
          value={deployment}
          onChange={(e) => setDeployment(e.target.value)}
          className="px-2 py-1 border rounded text-xs"
        />
        <input
          type="text"
          placeholder="API Version"
          value={apiVersion}
          onChange={(e) => setApiVersion(e.target.value)}
          className="px-2 py-1 border rounded text-xs"
        />
      </div>

      {/* Warning if inputs are inconsistent */}
      {showWarning && (
        <p className="text-xs text-red-600 font-medium">
          ⚠️ Please fill <strong>all</strong> Azure fields (Endpoint, API Key,
          Deployment) or leave them empty.
        </p>
      )}

      {/* Chat Box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && !showWarning && onSendMessage(input)
          }
          placeholder="Ask a question..."
          className="flex-1 px-4 py-2 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          disabled={isStreaming}
        />
        <button
          onClick={() => onSendMessage(input)}
          className="bg-[#F9C79A] text-black font-bold w-12 h-12 flex items-center justify-center border-2 border-black rounded-xl hover:bg-amber-400 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-px active:translate-x-px active:shadow-none"
          disabled={isStreaming || !input.trim() || showWarning} // disable if creds incomplete
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
              onClick={() => !showWarning && onSendMessage(prompt)}
              className="px-2 py-1 bg-white border border-black/20 text-xs rounded-full hover:bg-amber-100 hover:border-black transition-colors disabled:opacity-50"
              disabled={showWarning}
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
      <ChatHeader onClose={onClose} onMinimize={handleMinimize} />
      <MessageList {...chatLogic} />
      <ChatInput {...chatLogic} onSendMessage={chatLogic.handleSendMessage} />
    </motion.div>
  );
};

export default ChatbotPanel;
