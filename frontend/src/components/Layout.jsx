import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-[#F5F5F5]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0B0B0F]/70 backdrop-blur-xl">
        <nav className="container-premium flex h-20 items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-[0.18em] text-[#F5F5F5]">
            MALEBANGKOK
          </Link>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] sm:gap-5 sm:text-sm">
            <Link to="/">Discovery</Link>
            {!user ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-[#C6A75E]/30 bg-[#141419] px-4 py-2 text-[#C6A75E] hover:border-[#C6A75E]"
              >
                Logout ({user.role})
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="pt-20">{children}</main>
    </div>
  );
}
