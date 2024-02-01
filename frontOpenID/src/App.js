import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginButton from './components/LoginButton';
import SuccessPage from './components/SuccessPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginButton />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </Router>
  );
};

export default App;
