import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, login, signup, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Studio Flow Auth Test</h1>

      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={() => signup(email, password)}>Sign Up</button>
          <button onClick={() => login(email, password)}>Log In</button>
        </>
      )}
    </div>
  );
}
