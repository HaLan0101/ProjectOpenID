// src/components/LoginButton.js
import React from 'react';
import { Link } from 'react-router-dom';

const LoginButton = () => {
  return (
    <Link to="http://localhost:3001/auth/google">
      <button>Se Connecter avec Google</button>
    </Link>
  );
};

export default LoginButton;
