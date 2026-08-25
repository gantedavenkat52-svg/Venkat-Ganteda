import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Droplet, 
  Bot, 
  User, 
  RotateCcw, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { DeviceLocation, SensorReading, WaterQualityAssessment } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface HydroAIAssistantProps {
  device: DeviceLocation;
  latestReading: SensorReading | null;
  assessment: WaterQualityAssessment | null;
}

const PRESET_QUESTIONS = [
  "What is the current water status?",
  "Why did I receive this alert?",
  "Which parameter changed the most today?",
  "Show me the water-quality trend this week.",
  "Has the water quality been deteriorating?",
  "What could cause this type of sensor pattern?",
  "Which sensor may need calibration?",
  "Summarize today's readings."
];

export const HydroAIAssistant: React.FC<HydroAIAssistantProps> = ({
  device,
  latestReading,
  assessment
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Hello! I am **HydroAI**, your smart water quality diagnostic assistant.
I am continuously analyzing real-time IoT sensor telemetry from **${device.name}**.

Ask me anything about current parameters, alert causes, historical trends, or calibration recommendations.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          deviceId: device.id,
          history: messages.slice(-6).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text
          }))
        })
      });

      const data = await res.json();
      const replyText = data.reply || 'HydroAI received telemetry, but could not complete the inference. Please try again.';

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Encountered a temporary network communication error. HydroAI is attempting automatic reconnection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reset. I am ready to answer questions regarding **${device.name}** water telemetry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="hydro-ai-assistant-view" className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[650px]">
      {/* Header */}
      <div className="bg-slate-950/90 p-4 px-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100">HydroAI Assistant</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live reasoning on {device.name} ({device.waterSourceType})
            </p>
          </div>
        </div>

        <button
          id="clear-ai-chat-btn"
          onClick={clearChat}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Reset conversation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Preset Questions Chips */}
      <div className="bg-slate-950/40 p-3 px-6 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Suggested:
        </span>
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            id={`preset-q-${idx}`}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-700 text-slate-300 border border-slate-700 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 font-sans text-sm">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-cyan-600 text-white'
                    : 'bg-indigo-950 border border-indigo-700/60 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-2xl rounded-2xl p-4 shadow-md ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none leading-relaxed'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                  {m.text}
                </div>
                <div className="text-[10px] text-slate-400 mt-2 text-right font-mono">
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 text-cyan-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></div>
              <span className="ml-1">HydroAI is analyzing multi-sensor telemetry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-slate-950 p-4 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            id="ai-assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask HydroAI anything about water parameters, alerts, or sensor diagnostics..."
            disabled={isLoading}
            className="w-full bg-slate-900 text-sm text-slate-100 placeholder-slate-500 pl-4 pr-12 py-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
          />
          <button
            id="send-ai-message-btn"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
