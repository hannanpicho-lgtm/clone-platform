import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from './ui/button';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: string;
}

interface CustomerServiceChatProps {
  onClose: () => void;
  userName: string;
  accountFrozen?: boolean;
  freezeAmount?: number;
}

export function CustomerServiceChat({ onClose, userName, accountFrozen, freezeAmount }: CustomerServiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: accountFrozen 
        ? `Hello ${userName}, I see your account is frozen with a balance of -$${Math.abs(freezeAmount || 0).toFixed(2)}. How can I assist you with unfreezing your account?`
        : `Hello ${userName}! Welcome to Tanknewmedia Customer Service. How can I help you today?`,
      sender: 'admin',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate admin response
    setTimeout(() => {
      const adminMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for your message. An admin will review your case and respond shortly. Please wait while we process your request.',
        sender: 'admin',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, adminMessage]);
    }, 1500);
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
              disabled={!inputMessage.trim()}
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
