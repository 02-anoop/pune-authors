import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import axios from "axios";
import { ArrowRight, Eye, EyeOff, ShoppingCart } from "lucide-react";
import FocusTrap from 'focus-trap-react';
import { toast } from "sonner";

export function AuthPage({ type }: { type: "login" | "signup" }) {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as "CUSTOMER" | "AUTHOR" | "ADMIN") || "CUSTOMER";
  const [roleSelection, setRoleSelection] = useState<"CUSTOMER" | "AUTHOR" | "ADMIN">(initialRole);
  const redirectParam = searchParams.get("redirect");
  const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const role = searchParams.get("role") as "CUSTOMER" | "AUTHOR" | "ADMIN";
    if (role) setRoleSelection(role);
    setOtpStep(false);
    setForgotPasswordStep(false);
    setSignupError("");
  }, [searchParams, type]);

  useEffect(() => {
    if (type === "login" && redirectParam === "/checkout") {
      toast.custom((t) => (
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 w-full max-w-sm border border-indigo-500 animate-in slide-in-from-top-2">
          <div className="bg-white/20 p-2 rounded-full shrink-0">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Authentication Required</h4>
            <p className="text-xs text-indigo-100 mt-0.5">Please login to place your order</p>
          </div>
        </div>
      ), { duration: 4000, id: 'checkout-login-toast' });
    }
  }, [type, redirectParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSignupError("");

    try {
      if (forgotPasswordStep) {
        if (otpStep) {
          if (password !== confirmPassword) {
            setSignupError("Passwords do not match.");
            setLoading(false);
            return;
          }
          await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/reset-password`, { email, otp, password });
          alert("Password reset successfully. Please log in.");
          window.location.href = `/login?role=${roleSelection}${redirectQuery}`;
        } else {
          await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/forgot-password`, { email });
          setOtpStep(true);
        }
        setLoading(false);
        return;
      }

      if (type === "signup" && roleSelection === "AUTHOR") {
        if (!otpStep) {
          if (password !== confirmPassword) {
            setSignupError("Passwords do not match.");
            setLoading(false);
            return;
          }
          await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/send-otp`, { email });
          setOtpStep(true);
        } else {
          const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/verify-otp`, { email, otp, password });
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("userRole", res.data.role);
          navigate("/register");
        }
        setLoading(false);
        return;
      }

      if (type === "signup") {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/register`, { name, email, phone, address, password, role: roleSelection });
        alert("Registration successful! Please login.");
        const redirectParam = searchParams.get("redirect");
        const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : "";
        navigate(`/login?role=${roleSelection}${redirectQuery}`);
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/login`, { email, password });
        
        if (res.data.role !== roleSelection) {
          alert(`Error: Invalid credentials for ${roleSelection} login. This account belongs to a ${res.data.role}.`);
          setLoading(false);
          return;
        }

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userRole", res.data.role);
        
        if (res.data.role === "ADMIN") navigate("/operations");
        else if (res.data.role === "AUTHOR") {
          if (res.data.hasCompletedRegistration === false) {
             navigate("/register");
          } else {
             navigate("/dashboard");
          }
        } else {
           const redirectParam = searchParams.get("redirect");
           navigate(redirectParam ? redirectParam : "/profile");
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred";
      if (type === "signup" && errorMsg === 'Email already exists') {
        setSignupError("An account with this email already exists.");
      } else {
        setSignupError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.8rem 0",
    border: "none",
    borderBottom: "1px solid #eaeaea",
    background: "transparent",
    fontSize: 13,
    fontFamily: "var(--font-body)",
    color: "#111",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans text-paa-navy">
      {/* LEFT SIDE (Image / Branding) - Hidden on small screens */}
      <div className="hidden lg:flex flex-1 bg-paa-navy text-white flex-col justify-between p-16 pt-52 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-paa-gold/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-[10px] font-bold tracking-widest uppercase text-paa-gold mb-8">
            Pune Authors' Association
          </div>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-medium text-white leading-[1.1] tracking-tight max-w-lg mb-6">
            {type === "login" ? "Welcome back to the collective." : "Join our literary community."}
          </h1>
          <p className="text-sm text-white/70 max-w-md leading-relaxed font-normal">
            {type === "login" 
              ? "Sign in to your account to manage your profile, books, and event registrations." 
              : "Create an account to explore local literature or join as a published author."}
          </p>
        </div>
        
        <div className="relative z-10 border-t border-white/10 pt-8 mt-12">
          <p className="text-[10px] text-white/50 tracking-widest uppercase font-bold">
            A literary collective since 2015.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE (Form) */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-[420px] mt-32">
          {/* Role Tabs */}
          <div className="flex gap-6 border-b border-paa-navy/10 mb-10">
            <button 
              type="button" 
              onClick={() => {
                setRoleSelection("CUSTOMER");
                setOtpStep(false);
                setForgotPasswordStep(false);
                setSignupError("");
              }}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 mb-[-1px] ${roleSelection === "CUSTOMER" ? "text-paa-navy border-b-2 border-paa-navy" : "text-gray-400 border-b-2 border-transparent hover:text-paa-navy/70"}`}
            >
              Reader
            </button>
            <button 
              type="button" 
              onClick={() => {
                setRoleSelection("AUTHOR");
                setOtpStep(false);
                setForgotPasswordStep(false);
                setSignupError("");
              }}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 mb-[-1px] ${roleSelection === "AUTHOR" ? "text-paa-navy border-b-2 border-paa-navy" : "text-gray-400 border-b-2 border-transparent hover:text-paa-navy/70"}`}
            >
              Author
            </button>
            {type === "login" && (
              <button 
                type="button" 
                onClick={() => {
                  setRoleSelection("ADMIN");
                  setOtpStep(false);
                  setForgotPasswordStep(false);
                  setSignupError("");
                }}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 mb-[-1px] ${roleSelection === "ADMIN" ? "text-paa-navy border-b-2 border-paa-navy" : "text-gray-400 border-b-2 border-transparent hover:text-paa-navy/70"}`}
              >
                Admin
              </button>
            )}
          </div>

          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {type === "signup" && roleSelection === "AUTHOR" ? (
              <div className="py-4">
                <div className="bg-paa-gold/10 border border-paa-gold/20 rounded-2xl p-6 mb-8">
                  <p className="text-sm text-paa-navy leading-relaxed font-normal">
                    Authors must verify their email before beginning the application process. Your progress will be saved automatically.
                  </p>
                </div>
                
                {otpStep ? (
                  <>
                    <div className="mb-4 text-sm font-medium text-emerald-600">OTP sent to {email}. Please enter it below.</div>
                    <div className="mb-4">
                      <input required type="text" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                    <div className="relative mb-4">
                      <input required type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 bottom-3 flex items-center justify-center text-gray-400 hover:text-paa-navy transition-colors">
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                    <div className="mb-4">
                      <input required type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                  </>
                )}

                {signupError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-medium mb-4 flex flex-col items-start gap-2">
                    <div>{signupError}</div>
                    {signupError === "An account with this email already exists." && (
                      <button 
                        type="button" 
                        onClick={() => navigate(`/login?role=${roleSelection}${redirectQuery}`)} 
                        className="bg-white border border-red-200 px-3 py-1.5 rounded-md text-red-700 hover:bg-red-100 transition-colors shadow-sm font-bold"
                      >
                        Go to Log In
                      </button>
                    )}
                  </div>
                )}
                
                <button type="submit" disabled={loading} className="dash-btn dash-btn-primary w-full flex justify-between items-center px-6 py-4 rounded-full text-xs">
                  {loading ? "Processing..." : otpStep ? "Verify & Continue" : "Verify Email"} <ArrowRight size={14} />
                </button>
              </div>
            ) : forgotPasswordStep ? (
              <div className="py-4">
                <div className="mb-8">
                  <h3 className="text-xl font-serif text-paa-navy mb-2">Reset Password</h3>
                  <p className="text-sm text-paa-gray-text">Enter your email to receive an OTP to reset your password.</p>
                </div>
                {otpStep ? (
                  <>
                    <div className="mb-4 text-sm font-medium text-emerald-600">OTP sent to {email}.</div>
                    <div className="mb-4">
                      <input required type="text" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                    <div className="relative mb-4">
                      <input required type={showPassword ? "text" : "password"} placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 bottom-3 flex items-center justify-center text-gray-400 hover:text-paa-navy transition-colors">
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                    <div className="mb-4">
                      <input required type={showPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                  </>
                ) : (
                  <div className="mb-4">
                    <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                  </div>
                )}
                {signupError && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-medium mb-4">{signupError}</div>}
                
                <button type="submit" disabled={loading} className="dash-btn dash-btn-primary w-full py-3.5 rounded-full">
                  {loading ? "Processing..." : otpStep ? "Reset Password" : "Send OTP"}
                </button>
                <button type="button" onClick={() => { setForgotPasswordStep(false); setOtpStep(false); setSignupError(""); }} className="w-full text-xs text-gray-500 hover:text-paa-navy font-medium mt-4">
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {type === "signup" && (
                  <>
                    <div>
                      <input required type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                    <div>
                      <input required type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                    <div>
                      <input required type="text" placeholder="City / Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                    </div>
                  </>
                )}

                <div>
                  <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400" />
                </div>

                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pb-3 border-b border-paa-navy/10 bg-transparent text-sm text-paa-navy outline-none focus:border-paa-navy transition-colors placeholder:text-gray-400 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 bottom-3 flex items-center justify-center text-gray-400 hover:text-paa-navy transition-colors">
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                
                {type === "login" && (
                  <div className="flex justify-end -mt-2">
                    <button type="button" onClick={() => { setForgotPasswordStep(true); setOtpStep(false); setSignupError(""); }} className="text-xs font-medium text-gray-500 hover:text-paa-navy">Forgot Password?</button>
                  </div>
                )}

                {signupError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-medium mb-4 flex flex-col items-start gap-2">
                    <div>{signupError}</div>
                    {signupError === "An account with this email already exists." && (
                      <button 
                        type="button" 
                        onClick={() => navigate(`/login?role=${roleSelection}${redirectQuery}`)} 
                        className="bg-white border border-red-200 px-3 py-1.5 rounded-md text-red-700 hover:bg-red-100 transition-colors shadow-sm font-bold"
                      >
                        Go to Log In
                      </button>
                    )}
                  </div>
                )}

                <button
                  disabled={loading}
                  type="submit"
                  className={`dash-btn dash-btn-primary w-full flex justify-center items-center py-3.5 rounded-full mt-4 transition-all ${loading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
                >
                  {loading ? <span className="animate-pulse">Authenticating...</span> : type === "login" ? "Sign In" : "Create Account"}
                </button>
              </>
            )}
          </form>
</FocusTrap>

          <div className="mt-12 text-xs text-gray-500 border-t border-paa-navy/10 pt-8 flex items-center justify-center gap-1.5 font-medium">
            {type === "login" ? (
              <>Don't have an account? <Link to={`/signup?role=${roleSelection}${redirectQuery}`} className="text-paa-navy font-bold border-b border-paa-navy pb-0.5 hover:text-paa-gold hover:border-paa-gold transition-colors">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to={`/login?role=${roleSelection}${redirectQuery}`} className="text-paa-navy font-bold border-b border-paa-navy pb-0.5 hover:text-paa-gold hover:border-paa-gold transition-colors">Sign in</Link></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
