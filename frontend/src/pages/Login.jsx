import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      login(response.data.token, response.data.user);
      navigate("/booking-flow");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-bold text-white">Login</h1>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-300">
        No account? <Link to="/register">Register here</Link>
      </p>
    </section>
  );
}
