import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { FiLogIn } from "react-icons/fi";
import { ImSpinner2 } from "react-icons/im";
import { getSafePath } from "../../utils/perm";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rememberFlag = localStorage.getItem("remember");
    const token = localStorage.getItem("token");
    if (token && !rememberFlag) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("perms");
    }
    setTimeout(() => setMounted(true), 40);
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const email = form.email.trim().toLowerCase();
    const password = String(form.password || "");
    if (!email || !password) return setErr("Email and password are required");

    try {
      setLoading(true);

      const { data } = await api.post("/auth/login", { email, password, remember });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userid", data.user.id);
      localStorage.setItem("perms", JSON.stringify(data.permissions || []));
      remember ? localStorage.setItem("remember", "1") : localStorage.removeItem("remember");

      navigate(getSafePath(), { replace: true });
    } catch (error) {
      setErr(error?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .animated-border {
          position: relative;
          border-radius: 24px;
          padding: 3px;
          background: linear-gradient(120deg,#10b981,#3b82f6,#8b5cf6,#ec4899,#f59e0b,#10b981);
          background-size: 250% 250%;
          animation: borderGlow 4s linear infinite;
        }
        .animated-border-inner {
          background: #ffffff;
          border-radius: 21px;
          width: 100%;
        }
        @keyframes borderGlow { 0%{background-position:0 50%} 50%{background-position:100% 50%} 100%{background-position:0 50%}}

        .underline-input {
          width: 100%;
          padding: 8px 4px;
          font-size: 14px;
          outline: none;
          border: none;
          border-bottom: 2px solid #e5e7eb;
          background: transparent;
          transition: all 0.3s ease;
        }
        @media (min-width: 640px) {
          .underline-input {
            padding: 12px 4px;
            font-size: 15px;
          }
        }
        .underline-input:focus {
          border-bottom-color: #059669;
        }
        .underline-focus-line {
          position: relative;
          display: block;
          width: 100%;
        }
        .underline-focus-line::after {
          content:"";
          position:absolute;
          left:50%; bottom:0;
          width:0%; height:2px;
          background:#059669;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(-50%);
        }
        .underline-input:focus + .underline-focus-line::after {
          width:100%;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .premium-shadow {
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12), 0 8px 16px -6px rgba(0, 0, 0, 0.08);
        }
      `}</style>

      <div className="min-h-screen w-full bg-[#f9fafb] flex items-center justify-center p-3 sm:p-4">
        <div className={`animated-border premium-shadow w-full max-w-[420px] transition-all duration-700 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}>
          <div className="animated-border-inner">
            <div className="px-4 py-5 sm:px-8 sm:py-10 md:px-12">
              <div className="flex justify-center mb-2 sm:mb-3">
                <img
                  src="/zingbitelogo.png"
                  alt="logo"
                  className="h-24 sm:h-28 object-contain transition-transform hover:scale-105 duration-300"
                />
              </div>

              <div className="text-center space-y-0.5 mb-4 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Please enter your details to sign in</p>
              </div>

              {err && (
                <div className="mb-6 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center animate-shake">
                  <span className="mr-2">⚠️</span> {err}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-7">
                <div className="group">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 mb-1 block group-focus-within:text-emerald-600 transition-colors">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="name@example.com"
                    className="underline-input"
                  />
                  <span className="underline-focus-line"></span>
                </div>

                <div className="group relative">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 mb-1 block group-focus-within:text-emerald-600 transition-colors">
                    Password
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                    className="underline-input"
                  />
                  <span className="underline-focus-line"></span>

                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-0 bottom-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors px-2 py-1"
                  >
                    {showPwd ? "HIDE" : "SHOW"}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 sm:pt-2">
                  <label className="flex items-center group cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-200 transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:border-emerald-400"
                      />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-1 sm:mt-2"
                >
                  {loading ? (
                    <><ImSpinner2 className="animate-spin mr-2 text-xl" /> Authenticating...</>
                  ) : (
                    <><FiLogIn className="mr-2 text-lg" /> Sign In</>
                  )}
                </button>
              </form>

              <div className="mt-4 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 font-medium">
                  Forgot your password? <button className="text-emerald-600 font-bold hover:underline">Contact Support</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
