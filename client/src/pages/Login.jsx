import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faFutbol,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user)
    return (
      <Navigate
        to={user.role === "CUSTOMER" ? "/player/dashboard" : "/staff/dashboard"}
        replace
      />
    );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(form);
      navigate(
        u.role === "CUSTOMER" ? "/player/dashboard" : "/staff/dashboard",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-5">
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full border-[32px] border-volt/5" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rotate-12 border-[40px] border-white/[.025]" />
      <div className="panel panel-cut z-10 grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-volt/20 via-arena-900 to-arena-950 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-[-80px] top-16 h-72 w-72 rotate-45 border-[35px] border-volt/10" />
          <div>
            <div className="eyebrow">{new Date().getFullYear()}</div>
            <h1 className="mt-3 text-6xl font-black uppercase leading-[.9]">
              MATCH
              <br />
              <span className="text-volt">PLAY</span>
              <br />
              ENJOY
            </h1>
            <p className="mt-6 max-w-md text-white/55">
              A secure football-club operations platform for matches, accounts,
              rankings and customer self-service.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-white/50">
            <FontAwesomeIcon icon={faShieldHalved} className="text-volt" />{" "}
            An all-in-one Management System
          </div>
        </div>
        <form onSubmit={submit} className="p-7 md:p-10 lg:p-12">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-volt text-xl text-arena-950">
                <FontAwesomeIcon icon={faFutbol} />
              </div>
              <div>
                <div className="text-2xl font-black italic">
                  BH <span className="text-volt">ENTERTAINMENT</span>
                </div>
                <div className="text-xs uppercase tracking-[.2em] text-white/30">
                  Sign in to continue
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="label">Username</label>
          <input
            className="field mb-5"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            required
          />
          <label className="label">Password</label>
          <input
            type="password"
            className="field mb-7"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            required
          />
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Signing in…" : "Log In"}{" "}
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
         
        </form>
      </div>
    </div>
  );
}
