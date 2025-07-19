import React, { useState } from 'react';
import Login from './Login';
import MainMenu from './MainMenu'; // pastikan file ini udah ada

function App() {
  // Cek user login dari localStorage (token)
  const [user, setUser] = useState(localStorage.getItem('token') ? 'admin' : null);

  // Handler logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Kalau belum login, munculkan halaman Login
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Kalau sudah login, masukin MainMenu
  return (
    <MainMenu onLogout={handleLogout} />
  );
}

export default App;
