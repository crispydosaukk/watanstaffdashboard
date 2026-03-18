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
        .animated-border { position: relative; border-radius: 20px; }
        .animated-border::before {
          content:""; position:absolute; inset:-6px; border-radius:inherit;
          background:linear-gradient(120deg,#4ade80,#22d3ee,#818cf8,#f472b6,#facc15,#4ade80);
          background-size:250% 250%; animation:borderGlow 4s ease infinite;
          filter:blur(18px); opacity:0.55; z-index:-1;
        }
        @keyframes borderGlow { 0%{background-position:0 50%} 50%{background-position:150% 50%} 100%{background-position:0 50%}}
        @keyframes floatUpDown {0%{transform:translateY(0)}50%{transform:translateY(-14px)}100%{transform:translateY(0)}}

        .underline-input {
          width: 100%;
          padding: 10px 2px;
          font-size: 14px;
          outline: none;
          border: none;
          border-bottom: 2px solid #d1d5db;
          transition: border-color .3s ease;
        }
        .underline-input:focus {
          border-bottom-color: #059669;
        }
        .underline-focus-line {
          position: relative;
        }
        .underline-focus-line::after {
          content:"";
          position:absolute;
          left:0; bottom:0;
          width:0%; height:2px;
          background:#059669;
          transition:width .35s ease;
        }
        .underline-input:focus + .underline-focus-line::after {
          width:100%;
        }
      `}</style>

      <div className="min-h-screen w-full bg-white flex items-center justify-center px-3 py-6">
        <div className={`animated-border shadow-xl w-full max-w-5xl rounded-xl transition-all flex flex-col md:flex-row ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}>

          {/* LEFT (Hidden on small screens) */}
          <div className="hidden md:flex flex-col justify-center items-center w-1/2 px-6 py-10 bg-gradient-to-br from-[#e9faff] via-[#dff3ff] to-[#cfeaff] text-center">
            <h2 className="leading-tight font-extrabold">
              <span className="block text-lg text-emerald-700">Welcome to</span>
              <span className="block text-2xl text-emerald-600">ZingBite Admin</span>
            </h2>
            <img src="/login-side.png" className="w-72 mt-8 ml-8" style={{ animation:"floatUpDown 4s ease-in-out infinite" }} draggable="false" />
          </div>

          {/* RIGHT */}
          <div className="flex-1 px-6 sm:px-10 py-10 bg-white">
            <div className="flex justify-center">
              <img src="/zingbitelogo.png" alt="logo" className="h-14 object-contain" />
            </div>
            
            <h2 className="text-center mt-6 font-extrabold">
              <span className="block text-lg text-emerald-700">Login to start your session</span>
            </h2>

            {err && (
              <div className="mt-5 bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{err}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">

              <div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="Email address"
                  className="underline-input"
                />
                <span className="underline-focus-line"></span>
              </div>

              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Password"
                  className="underline-input"
                />
                <span className="underline-focus-line"></span>

                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500"
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="h-4 w-4"/>
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-md text-sm"
                >
                  {loading ? <><ImSpinner2 className="animate-spin mr-2" /> Logging in…</> : <><FiLogIn className="mr-2" /> Login</>}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">Forgot password? Contact admin</p>
          </div>
        </div>
      </div>
    </>
  );
}
