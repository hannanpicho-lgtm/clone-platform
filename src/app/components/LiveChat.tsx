import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Send, MessageCircle, Clock } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessage?: ChatMessage;
  messageCount: number;
}

interface LiveChatProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

const AUTO_REPLIES = [
  "Thank you for your message. Our support team will respond soon!",
  "Got it! We're looking into this for you.",
  "We appreciate the details. Our team is reviewing your request.",
  "Thanks for reaching out. We'll help you out shortly!",
  "Your message has been received. We'll get back to you soon.",
];

export function LiveChat({ accessToken }: LiveChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !selectedConversation) {
          setSelectedConversation(data.conversations[0]);
          fetchMessages(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      // Demo mode - create a default conversation
      const demoConv: Conversation = {
        id: 'conv_demo_1',
        title: 'Support Team',
        createdAt: new Date().toISOString(),
        messageCount: 0,
      };
      setConversations([demoConv]);
      setSelectedConversation(demoConv);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/make-server-44a642d3/chat/messages?conversationId=${convId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [accessToken]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/chat/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: newMessage,
        }),
      });
      const data = await response.json();
      if (data.message) {
        setMessages([...messages, data.message]);
        setNewMessage('');

        // Auto-reply after 2 seconds
        setTimeout(() => {
          const autoReply: ChatMessage = {
            id: `msg_auto_${Date.now()}`,
            userId: 'support_bot',
            userName: 'Support Team',
            message: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
            createdAt: new Date().toISOString(),
            read: false,
          };
          setMessages((prev) => [...prev, autoReply]);
        }, 2000);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Live Chat Support</h2>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1 p-4 bg-white border-gray-200 h-96 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Conversations</h3>
          {conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    fetchMessages(conv.id);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{conv.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations</p>
            </div>
          )}
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 p-6 bg-white border-gray-200 flex flex-col h-96">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900">{selectedConversation.title}</h3>
                <p className="text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Business Hours: 9 AM - 6 PM UTC
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.userId === 'support_bot' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.userId === 'support_bot'
                            ? 'bg-gray-200 text-gray-900'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        <p className="font-semibold text-xs mb-1">{msg.userName}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 pt-4 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3">💬 Live Chat Available</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✓ Real-time support during business hours</li>
          <li>✓ Average response time: 2-5 minutes</li>
          <li>✓ Chat history is automatically saved</li>
          <li>✓ You can also contact us via support tickets or email</li>
        </ul>
      </Card>
    </div>
  );
}
