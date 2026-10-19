import { useState } from "react";
import { useAuth } from "../useAuth";

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">R</div>
        <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">{isRegister ? "Start building better money habits." : "Sign in to see where your money goes."}</p>
        <form onSubmit={submit} className="auth-form">
          {isRegister && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" /></label>}
          <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required placeholder="At least 8 characters" /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? "Please wait..." : isRegister ? "Create account" : "Sign in"}</button>
        </form>
        <p className="switch-auth">{isRegister ? "Already have an account?" : "New to Retain?"} <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "Sign in" : "Create an account"}</button></p>
      </section>
      <aside className="auth-art">
        <div className="art-orb orb-one" /><div className="art-orb orb-two" />
        <span className="art-label">A LITTLE MORE CLARITY.</span>
        <h2>Make your money<br />work for <em>you.</em></h2>
        <p>Track your spending. Set your goals. Feel more in control.</p>
        <div className="art-mini-card"><span>Monthly spending</span><strong>Know your numbers.</strong><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
      </aside>
    </main>
  );
}
