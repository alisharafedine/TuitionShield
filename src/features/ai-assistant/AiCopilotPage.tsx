import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  CreditCard,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { localDb } from '../../lib/storage/mock-db';
import { sendChatMessage } from './ai-service';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { AIMessage, PaymentProposal } from '../../types';

// Configure marked for clean rendering
marked.setOptions({ breaks: true, gfm: true });

/** Renders AI markdown content as proper HTML */
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const html = marked(content) as string;
  return (
    <div
      className="prose prose-sm max-w-none
        prose-headings:text-slate-900 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-h3:text-sm prose-h4:text-xs
        prose-p:my-1 prose-p:leading-relaxed prose-p:text-slate-800
        prose-strong:text-slate-900 prose-strong:font-semibold
        prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5 prose-li:text-slate-800
        prose-ol:my-1 prose-ol:pl-4
        prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:rounded-r-lg prose-blockquote:px-3 prose-blockquote:py-1 prose-blockquote:text-slate-700 prose-blockquote:not-italic prose-blockquote:my-2
        prose-table:text-xs prose-th:bg-slate-100 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
        prose-code:bg-slate-100 prose-code:text-blue-700 prose-code:rounded prose-code:px-1 prose-code:text-xs prose-code:font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const AiCopilotPage: React.FC = () => {
  const navigate = useNavigate();
  const { info, success } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>(localDb.getState().messages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolStatus, setCurrentToolStatus] = useState<string | null>(null);
  const [latestProposal, setLatestProposal] = useState<PaymentProposal | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, currentToolStatus]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Add user message to UI & storage
    localDb.addMessage({
      role: 'user',
      content: text,
    });

    setMessages([...localDb.getState().messages]);
    setInputText('');
    setIsLoading(true);
    setCurrentToolStatus('Consulting approved financial tools...');

    try {
      const response = await sendChatMessage(text);
      setMessages([...localDb.getState().messages]);
      if (response.proposalCreated) {
        setLatestProposal(response.proposalCreated);
        success('Proposal Prepared', 'AI generated proposal awaiting your approval in the Payments tab.');
      }
    } catch (err: any) {
      localDb.addMessage({
        role: 'assistant',
        content: `⚠️ An error occurred while executing the financial tool: ${err.message || 'Unknown error'}. Please try again.`,
      });
      setMessages([...localDb.getState().messages]);
    } finally {
      setIsLoading(false);
      setCurrentToolStatus(null);
    }
  };

  const handleClearHistory = () => {
    localDb.clearMessages();
    setMessages([...localDb.getState().messages]);
    setLatestProposal(null);
    info('Conversation Reset', 'Chat cleared to initial welcoming state.');
  };

  const suggestedQuestions = [
    'Will I have enough money to pay tuition?',
    'When could my balance become negative?',
    'What if my rent increases by 15%?',
    'Prepare a sandbox tuition payment for my review',
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Copilot Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">DeepSeek AI Financial Copilot</h3>
              <Badge status="info">Controlled Tool Calling</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic financial task assistant • No hallucinated arithmetic
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleClearHistory} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
          New Chat
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-blue-600 shadow-sm'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Tool Activity Badge */}
                {m.toolActivity && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-mono shadow-sm">
                    <Terminal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tool: <strong>{m.toolActivity.name}</strong></span>
                    <span className="text-emerald-600 font-medium">✓ {m.toolActivity.status}</span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/90 rounded-tl-none overflow-hidden'
                  }`}
                >
                  {isUser ? m.content : <MarkdownMessage content={m.content} />}
                </div>

                {/* Timestamp */}
                <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <span className="animate-spin w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span>{currentToolStatus || 'AI Agent reasoning...'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Validating tool schemas against financial engine boundaries...
              </div>
            </div>
          </div>
        )}

        {/* Action Card if proposal was created */}
        {latestProposal && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 max-w-xl mx-auto shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-emerald-600 border border-emerald-200 shadow-sm">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Payment Proposal Prepared</div>
                <div className="text-slate-500 text-[11px]">
                  ID: <code className="text-emerald-700 font-semibold">{latestProposal.id}</code> ({latestProposal.recipient_label})
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/payments')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Review Proposal
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Questions */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-xs text-slate-400 shrink-0 font-medium">Suggested:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/90 shrink-0 text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3.5 bg-white border-t border-slate-200 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a financial question (e.g. 'Can I afford tuition?' or 'What if rent rises by 15%?')..."
          disabled={isLoading}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputText.trim() || isLoading}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
