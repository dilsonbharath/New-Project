import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

const QUICK_ACTIONS = [
  'How to use this app?',
  'Analyze my progress',
  'Where do I lack consistency?',
  'Give me productivity tips',
];

const ChatBot = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hey! 👋 I'm your YOU vs YOU assistant. Ask me anything about the app, your habits, journal, expenses, or skills. I can analyze your progress and give personalized tips!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { type: 'user', text: msg }]);
    setLoading(true);

    try {
      const response = await chatService.sendMessage(msg);
      setMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: response.reply,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      const errorMsg =
        error.response?.status === 429
          ? 'Please wait a moment before sending another message.'
          : 'Sorry, something went wrong. Please try again.';
      setMessages(prev => [...prev, { type: 'bot', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (text) => {
    setInput(text);
    // Auto-send
    setMessages(prev => [...prev, { type: 'user', text }]);
    setLoading(true);
    chatService.sendMessage(text)
      .then(response => {
        setMessages(prev => [...prev, { type: 'bot', text: response.reply, sources: response.sources }]);
      })
      .catch(() => {
        setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, something went wrong. Please try again.' }]);
      })
      .finally(() => setLoading(false));
    setInput('');
  };

  // Format bot messages with markdown-like formatting
  const formatMessage = (text) => {
    if (!text) return '';
    // Bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    return formatted;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chat-fab"
        aria-label="Open chat assistant"
        id="chatbot-fab"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel" id="chatbot-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-800">YOU vs YOU Assistant</div>
                <div className="text-[11px] text-neutral-400">Powered by AI</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={msg.type === 'user' ? 'chat-msg-user' : 'chat-msg-bot'}>
                <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {msg.sources.includes('guide') && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full">📘 Guide</span>
                    )}
                    {msg.sources.includes('user_data') && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full">📊 Your Data</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-typing">
                <span></span><span></span><span></span>
              </div>
            )}

            {/* Quick actions (only show at start) */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action)}
                    className="chip text-xs"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="chat-input"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="chat-send"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
