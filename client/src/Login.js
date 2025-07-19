import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('Logging in...');
    try {
      const res = await fetch('http://localhost:8091/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        onLogin(data.username);
      } else {
        setMsg(data.error || 'Login gagal');
      }
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #e1d5fa 0%, #b8c6ec 100%)",
        overflow: "hidden"
      }}
    >
      <div className="col-md-4 col-10 shadow p-4 rounded bg-white">
        <h3 className="mb-4 text-center">Login Admin</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary w-100" type="submit">
            Login
          </button>
        </form>
        {msg && (
          <div className="alert alert-danger mt-3 text-center" role="alert">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
