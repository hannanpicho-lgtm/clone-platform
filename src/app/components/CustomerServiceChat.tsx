import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from './ui/button';
import { projectId } from '/utils/supabase/info';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: string;
}

interface CustomerServiceChatProps {
  onClose: () => void;
  accessToken: string;
  userName: string;
  accountFrozen?: boolean;
  freezeAmount?: number;
}

export function CustomerServiceChat({ onClose, accessToken, userName, accountFrozen, freezeAmount }: CustomerServiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const isRefreshingRef = useRef(false);
  const [contactLinks, setContactLinks] = useState<{ whatsapp: string; telegram: string; whatsapp2: string; telegram2: string }>({
    whatsapp: 'https://wa.me/1234567890',
    telegram: 'https://t.me/tanknewmedia_support',
    whatsapp2: '',
    telegram2: '',
  });

  const baseUrl = useMemo(() => `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3`, []);

  const mapTicketToMessages = (ticket: any): Message[] => {
    const mapped: Message[] = [];
    if (ticket?.message) {
      mapped.push({
        id: `${ticket.id}-initial`,
        text: String(ticket.message),
        sender: 'user',
        timestamp: new Date(ticket.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const replies = Array.isArray(ticket?.replies) ? ticket.replies : [];
    replies.forEach((reply: any, index: number) => {
      mapped.push({
        id: String(reply?.id || `${ticket.id}-reply-${index}`),
        text: String(reply?.message || ''),
        sender: reply?.role === 'admin' ? 'admin' : 'user',
        timestamp: new Date(reply?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    if (mapped.length === 0) {
      mapped.push({
        id: 'welcome-message',
        text: accountFrozen
          ? `Hello ${userName}, I can see your account is frozen. Send your top-up receipt and we will assist with reset/unfreeze.`
          : `Hello ${userName}! Welcome to Tanknewmedia Customer Service. How can I help you today?`,
        sender: 'admin',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    return mapped;
  };

  const loadContactLinks = async () => {
    try {
      const linksResponse = await fetch(`${baseUrl}/contact-links`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (linksResponse.ok) {
        const linksData = await linksResponse.json().catch(() => ({}));
        if (linksData?.config) {
          setContactLinks({
            whatsapp: String(linksData.config.whatsapp || 'https://wa.me/1234567890'),
            telegram: String(linksData.config.telegram || 'https://t.me/tanknewmedia_support'),
            whatsapp2: String(linksData.config.whatsapp2 || ''),
            telegram2: String(linksData.config.telegram2 || ''),
          });
        }
      }
    } catch {
    }
  };

  const loadTicketState = async (silent = false) => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const resolvedBase = baseUrl;

      const ticketsResponse = await fetch(`${resolvedBase}/support-tickets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!ticketsResponse.ok) {
        throw new Error('Support service unavailable');
      }

      const ticketsData = await ticketsResponse.json().catch(() => ({}));
      const tickets = Array.isArray(ticketsData?.tickets) ? ticketsData.tickets : [];
      const activeTicket = tickets.find((ticket: any) => ticket?.status !== 'resolved') || tickets[0] || null;

      if (activeTicket?.id) {
        setActiveTicketId(String(activeTicket.id));
        setMessages(mapTicketToMessages(activeTicket));
      } else {
        setActiveTicketId(null);
        setMessages(mapTicketToMessages(null));
      }
    } catch {
      setMessages(mapTicketToMessages(null));
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    loadContactLinks();
    loadTicketState(false);
    const interval = setInterval(() => {
      loadTicketState(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isSending) return;

    const send = async () => {
      try {
        setIsSending(true);
        const resolvedBase = baseUrl;
        const draft = inputMessage.trim();

        if (!activeTicketId) {
          const createResponse = await fetch(`${resolvedBase}/support-tickets`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: accountFrozen ? 'Account reset/unfreeze request' : 'Customer service request',
              category: accountFrozen ? 'withdrawal' : 'general',
              priority: accountFrozen ? 'high' : 'normal',
              message: draft,
            }),
          });

          const createData = await createResponse.json().catch(() => ({}));
          if (!createResponse.ok || !createData?.ticket?.id) {
            throw new Error(createData?.error || 'Unable to create support ticket');
          }

          setActiveTicketId(String(createData.ticket.id));
          setMessages(mapTicketToMessages(createData.ticket));
        } else {
          const replyResponse = await fetch(`${resolvedBase}/support-tickets/${activeTicketId}/reply`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: draft }),
          });

          const replyData = await replyResponse.json().catch(() => ({}));
          if (!replyResponse.ok || !replyData?.ticket) {
            throw new Error(replyData?.error || 'Unable to send message');
          }

          setMessages(mapTicketToMessages(replyData.ticket));
        }

        setInputMessage('');
      } catch {
        setMessages((prev) => ([
          ...prev,
          {
            id: `local-${Date.now()}`,
            text: 'Message failed to send. Please try again in a moment.',
            sender: 'admin',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]));
      } finally {
        setIsSending(false);
      }
    };

    send();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="bg-white w-full sm:max-w-md sm:rounded-t-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ height: '90vh', maxHeight: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">Customer Service</h3>
              <p className="text-xs opacity-90">Online • Typically replies instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Account Status Banner (if frozen) */}
        {accountFrozen && (
          <div className="bg-red-50 border-b-2 border-red-200 px-4 py-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">Account Frozen</p>
                <p className="text-xs text-red-700">Top-up required: ${(freezeAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {isLoading && messages.length === 0 && (
            <div className="text-xs text-gray-500">Loading customer service thread...</div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> All chats are monitored by admin. Messages sent here will be reviewed and responded to by our support team.
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {contactLinks.whatsapp.trim() && (
                <a
                  href={contactLinks.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                >
                  WhatsApp 1
                </a>
              )}
              {contactLinks.whatsapp2.trim() && (
                <a
                  href={contactLinks.whatsapp2}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                >
                  WhatsApp 2
                </a>
              )}
              {contactLinks.telegram.trim() && (
                <a
                  href={contactLinks.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Telegram 1
                </a>
              )}
              {contactLinks.telegram2.trim() && (
                <a
                  href={contactLinks.telegram2}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Telegram 2
                </a>
              )}
              {!contactLinks.whatsapp.trim() && !contactLinks.whatsapp2.trim() && !contactLinks.telegram.trim() && !contactLinks.telegram2.trim() && (
                <span className="text-xs text-blue-700">Support links are currently unavailable.</span>
              )}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 h-12 w-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💬 Customer Service is available 24/7
          </p>
        </div>
      </div>
    </div>
  );
}
