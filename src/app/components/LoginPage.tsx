import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCustomerService, setShowCustomerService] = useState(false);

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
    // Redirect to customer service page/modal
    if (typeof setShowCustomerService === 'function') {
      setShowCustomerService(true);
    } else {
      window.location.href = '/customer-service';
    }
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
    </div>
  );
};

export default Login;