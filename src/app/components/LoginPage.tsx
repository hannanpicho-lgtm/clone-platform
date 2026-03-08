import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCustomerService, setShowCustomerService] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('Hello support, I need help resetting my login password.');

  const handleLogin = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowCustomerService(true);
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <a
        href="#"
        className="text-blue-400 hover:text-blue-600 font-medium text-sm mt-2 block text-center"
        onClick={handleForgotPassword}
      >
        Forgot Your Password?
      </a>

      {showCustomerService && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCustomerService(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Customer Service Chat Box</h3>
            <p className="text-sm text-gray-600 mb-3">Password reset is handled by customer service chat.</p>
            <textarea
              value={forgotMessage}
              onChange={(e) => setForgotMessage(e.target.value)}
              className="w-full min-h-20 rounded border border-gray-300 px-3 py-2 text-sm mb-3"
              placeholder="Type your reset request..."
            />
            <div className="flex flex-col gap-2">
              <a href={`https://wa.me/1234567890?text=${encodeURIComponent(forgotMessage)}`} target="_blank" rel="noreferrer" className="bg-green-600 text-white text-center py-2 rounded font-semibold">Send to WhatsApp</a>
              <a href={`https://t.me/tanknewmedia_support?text=${encodeURIComponent(forgotMessage)}`} target="_blank" rel="noreferrer" className="bg-sky-600 text-white text-center py-2 rounded font-semibold">Send to Telegram</a>
            </div>
            <button className="mt-4 w-full bg-gray-100 py-2 rounded" onClick={() => setShowCustomerService(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;