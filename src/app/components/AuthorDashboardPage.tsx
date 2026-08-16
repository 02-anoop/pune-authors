import React, { useState, useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router';
import { Home, Check, AlertCircle, Upload, Download, Loader2, LogOut, User, Bell, Search, ShoppingCart, BookOpen, CalendarIcon, BarChart3, Package, TrendingUp, TrendingDown, X, MapPin, Menu, ChevronDown, ChevronUp, DollarSign, CheckCircle2, FileText, Image as ImageIcon, Star, Plus, Minus, Eye, Edit2, Mail, Phone, Clock, Trash2, MessageSquare, ExternalLink, Send, ChevronLeft, ChevronRight, RefreshCw, Users, Megaphone, Archive } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell , AreaChart, Area, LabelList, Legend, ScatterChart, Scatter, ZAxis, Label } from 'recharts';
import axios from 'axios';
// exceljs and file-saver are dynamically imported inside export handlers to reduce initial bundle size
import { toast } from 'sonner';
import { bookCategories } from '../data/categories';
import qrCode from './data/qr_code.jpeg';
import { LivePosDashboard } from './LivePosDashboard';
import fictionData from './data/fiction_catalogue.json';
import nonFictionData from './data/non_fiction_catalogue.json';
import { AuthorRegistrationPage } from './AuthorRegistrationPage';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { QueryThreadDisplay } from './QueryThreadDisplay';
import { AuthorDonationsTab } from './AuthorDonationsTab';
import { AuthorInvitationsView } from './AuthorInvitationsView';
import { checkIsPastEvent } from '../utils/eventUtils';
import BookPerformance from './BookPerformance';
export function AuthorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  const [extraDataState, setExtraDataState] = useState<any>({});
  const [hasNewQueries, setHasNewQueries] = useState(false);
  const [showReapply, setShowReapply] = useState(false);
  const [reapplyDone, setReapplyDone] = useState(false);
  const [reapplyForm, setReapplyForm] = useState({
    name: '',
    penName: '',
    phone: '',
    whatsapp: '',
    bio: '',
    transactionId: '',
    city: '',
    state: '',
    address: '',
    aadharNumber: '',
    qualification: '',
    age: '',
    experience: '',
    skills: '',
    hobbies: '',
    instagram: '',
    facebook: ''
  });
  const [isSubmittingReapply, setIsSubmittingReapply] = useState(false);
  const [buttonStates, setButtonStates] = useState<{ [key: string]: boolean }>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(() => localStorage.getItem('paa_dismissed_toast'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [fineReason, setFineReason] = useState("");

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);
  const [fineScreenshot, setFineScreenshot] = useState<File | null>(null);
  const [isSubmittingFine, setIsSubmittingFine] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const prevQueryAnsCountRef = useRef(0);
  const navigate = useNavigate();

  const unreadEventInvites = dashboardData?.eventInvites?.filter((inv: any) => inv.optInStatus === 'Pending') || [];
  const notifications = dashboardData?.notifications || [];
  const visibleNotifications = notifications.filter((n: any) => n.target !== 'SILENT_ALL');
  const hasUnread = unreadEventInvites.length > 0 || visibleNotifications.length > 0;


  const fetchQueriesAlert = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/queries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const answeredCount = res.data.filter((q: any) => q.status === 'Answered').length;
      if (prevQueryAnsCountRef.current > 0 && answeredCount > prevQueryAnsCountRef.current && !location.pathname.includes('/queries')) {
        setHasNewQueries(true);
      }
      prevQueryAnsCountRef.current = answeredCount;
    } catch (err) { }
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login?role=AUTHOR');
        return;
      }
      // Append timestamp to bust server-side cache on explicit refresh
      const cacheBust = forceRefresh ? `?t=${Date.now()}` : '';
      const dashRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/dashboard-data${cacheBust}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(dashRes.data);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.status === 404) {
        toast.error('Author profile not found. Please log in with your registered account.');
        navigate('/login');
      } else {
        toast.error('Failed to load dashboard data: ' + (err.response?.data?.error || err.message));
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayFine = async () => {
    if (!fineScreenshot) return toast.error('Please upload a screenshot of your payment');
    setIsSubmittingFine(true);
    try {
      const formData = new FormData();
      formData.append('paymentScreenshot', fineScreenshot);
      formData.append('reason', fineReason);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/fine/pay`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Payment submitted for review!');
      setFineScreenshot(null);
      await fetchDashboardData(true);
    } catch (err) {
      toast.error('Failed to submit payment');
    } finally {
      setIsSubmittingFine(false);
    }
  };


  // Auto-refresh mechanism disabled
  useEffect(() => {
    const fetchCurrentTabData = async () => {
      setIsRefreshing(true);
      try {
        await fetchDashboardData();
      } finally {
        setTimeout(() => setIsRefreshing(false), 800);
      }
    };

    // Refresh only when route/tab changes
    fetchCurrentTabData();
  }, [location.pathname]);


  useEffect(() => {
    if (dashboardData?.authorProfile) {
      if (dashboardData.authorProfile.extraData) {
        setExtraDataState(dashboardData.authorProfile.extraData);
      }
      setReapplyForm(prev => ({
        ...prev,
        name: dashboardData.authorProfile.name || '',
        phone: dashboardData.authorProfile.phone || '',
        whatsapp: dashboardData.authorProfile.whatsapp || '',
        bio: dashboardData.authorProfile.bio || '',
        penName: dashboardData.authorProfile.penName || '',
        city: dashboardData.authorProfile.city || '',
        state: dashboardData.authorProfile.state || '',
        address: dashboardData.authorProfile.address || '',
        aadharNumber: dashboardData.authorProfile.aadharNumber || '',
        qualification: dashboardData.authorProfile.qualification || '',
        institution: dashboardData.authorProfile.institution || '',
        subject: dashboardData.authorProfile.subject || '',
        age: dashboardData.authorProfile.age || '',
        experience: dashboardData.authorProfile.experience || '',
        skills: dashboardData.authorProfile.skills || '',
        hobbies: dashboardData.authorProfile.hobbies || '',
        instagram: dashboardData.authorProfile.instagram || '',
        facebook: dashboardData.authorProfile.facebook || '',
        linkedin: (() => {
          try {
            return JSON.parse(dashboardData.authorProfile.extraData || '{}').linkedin || '';
          } catch {
            return '';
          }
        })(),
        transactionId: dashboardData.authorProfile.transactionId || ''
      }));
    }
  }, [dashboardData]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDeleteProfile = async () => {
    if (window.confirm("Are you sure you want to delete your author profile? This action will archive your profile and your books, removing them from the catalogue. Your sales data will remain intact. This action cannot be undone.")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/account`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("Profile deleted successfully.");
        fetchDashboardData(true);
      } catch (err: any) {
        toast.error("Failed to delete profile: " + (err.response?.data?.error || err.message));
      }
    }
  };


  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen font-sans" style={{ background: '#f5f5f3' }}>
        <div className="author-topnav">
          <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-5 w-20 dash-skeleton rounded-lg"></div>)}
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 dash-skeleton rounded-2xl"></div>)}
          </div>
          <div className="h-72 dash-skeleton rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const { status, rejectionReason, name, email, phone, bio, photoUrl, transactionId, paymentScreenshot, extraData } = dashboardData.authorProfile;
  const dynamicFields = dashboardData.dynamicFields || [];

  const missingFields = dynamicFields.filter((f: any) => !extraDataState[f.name]);

  const handleSaveExtraData = async () => {
    setButtonStates(prev => ({ ...prev, saveExtra: true }));
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/profile/extra`, { extraData: extraDataState }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Information saved!');
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to save information');
    }
  };

  if (status === 'Approved' && missingFields.length > 0) {
    return (
      <div className="min-h-screen bg-paa-cream animate-fade-in-up font-sans flex items-center justify-center p-6">
        <div className="bg-white max-w-lg w-full p-8 rounded-3xl-2xl border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
          <h2 className="text-xl font-serif text-paa-navy mb-4 border-b pb-2">Action Required</h2>
          <p className="text-sm text-gray-600 mb-6">The administration requires some additional information to complete your profile setup. Please fill out the following fields to proceed to your dashboard.</p>
          <div className="space-y-4 mb-6">
            {missingFields.map((f: any) => (
              <div key={f.name}>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">{f.name}</label>
                {f.type === 'number' ? (
                  <input type="number" className="w-full border border-paa-navy/20 p-2 text-sm outline-none bg-gray-50 focus:border-paa-navy" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                ) : f.type === 'date' ? (
                  <input type="date" className="w-full border border-paa-navy/20 p-2 text-sm outline-none bg-gray-50 focus:border-paa-navy" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                ) : (
                  <input type="text" className="w-full border border-paa-navy/20 p-2 text-sm outline-none bg-gray-50 focus:border-paa-navy" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleSaveExtraData} disabled={buttonStates.saveExtra} className="w-full py-3 bg-paa-navy text-paa-cream text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors disabled:opacity-50 rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">{buttonStates.saveExtra ? 'Saving...' : 'Save & Continue'}</button>
        </div>
      </div>
    );
  }

  if (status === 'Archived' || dashboardData?.authorProfile?.isArchived) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
        <NavBar />
        <main className="flex-1 flex items-center justify-center p-6 py-20 animate-fade-in-up">
          <div className="bg-white max-w-lg w-full p-8 md:p-12 rounded-3xl-2xl shadow-premium border border-paa-navy/5 text-center relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-paa-gold/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-paa-navy/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative">
              <div className="flex justify-end gap-2 mb-6">
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs font-bold uppercase tracking-widest rounded-full transition-colors hover:bg-gray-100 px-3 py-1.5">
                  <LogOut size={14} /> Logout
                </button>
              </div>

              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                  <Archive className="w-10 h-10 text-gray-500" />
                </div>
              </div>

              <h1 className="text-3xl font-serif text-paa-navy mb-4">
                Account Deleted
              </h1>

              <div className="mx-auto max-w-sm">
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Your author profile has been deleted and archived. Your books are no longer visible in the catalogue. If you wish to rejoin the community, you can submit a request below which will be reviewed by the administration.
                </p>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to request to rejoin?")) {
                      try {
                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/rejoin`, {}, {
                          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        toast.success("Rejoin request sent successfully.");
                        fetchDashboardData(true);
                      } catch (err: any) {
                        toast.error("Failed to send rejoin request.");
                      }
                    }
                  }}
                  className="bg-paa-navy text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy shadow-premium hover:-translate-y-0.5 transition-all duration-300 w-full"
                >
                  Request to Rejoin
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'Pending' || status === 'Rejected') {
    if (showReapply) {
      return (
        <div className="flex flex-col min-h-screen">
          <NavBar />
          <AuthorRegistrationPage
            initialData={dashboardData?.authorProfile}
            isReapply={true}
            onReapplySuccess={() => {
              setReapplyDone(true);
              setShowReapply(false);
              fetchDashboardData(true);
            }}
          />
        </div>
      );
    }

    if (reapplyDone) {
      return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
          <NavBar />
          <main className="flex-1 flex items-center justify-center p-6 py-20">
            <div className="bg-white max-w-md w-full p-10 rounded-3xl shadow-premium border border-paa-navy/5 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-paa-navy mb-3">Reapplication Submitted!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">Your updated application is now under review by our editorial team. We will notify you by email once a decision has been made (within 5–7 working days).</p>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
        <NavBar />
        <main className="flex-1 flex items-center justify-center p-6 py-20 animate-fade-in-up">
          <div className="bg-white max-w-lg w-full p-8 md:p-12 rounded-3xl-2xl shadow-premium border border-paa-navy/5 text-center relative overflow-hidden">
            {/* Background flourish */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-paa-gold/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-paa-navy/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative">
              <div className="flex justify-end gap-2 mb-6">
                <button onClick={handleDeleteProfile} className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-bold uppercase tracking-widest rounded-full transition-colors hover:bg-red-50 px-3 py-1.5"><Trash2 size={14} /> Delete Profile</button>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs font-bold uppercase tracking-widest rounded-full transition-colors hover:bg-gray-100 px-3 py-1.5"><LogOut size={14} /> Logout</button>
              </div>

              <div className="mb-6 flex justify-center">
                {status === 'Pending' ? (
                  <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center border border-yellow-200">
                    <AlertCircle className="w-10 h-10 text-yellow-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border border-red-200">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-serif text-paa-navy mb-4">
                {status === 'Pending' ? 'Application Under Review' : 'Application Rejected'}
              </h1>

              <div className="mx-auto max-w-sm">
                {status === 'Pending' ? (
                  <p className="text-sm text-gray-600 leading-relaxed">Your author application has been submitted and is currently pending review by the admin team. You will be notified via email once approved. Check back here for updates.</p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">Unfortunately, your author application has been rejected.</p>
                    {rejectionReason && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-800 text-sm text-left mb-8 shadow-sm">
                        <strong className="uppercase tracking-widest text-[10px] block mb-1 opacity-80">Reason for Rejection</strong>
                        {rejectionReason}
                      </div>
                    )}
                    <button
                      onClick={() => setShowReapply(true)}
                      className="bg-paa-navy text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy shadow-premium hover:-translate-y-0.5 transition-all duration-300 w-full"
                    >
                      Edit & Reapply Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const fineDateStr = dashboardData?.authorProfile?.extraData?.fineDate;
  const fineAmount = dashboardData?.authorProfile?.extraData?.lateFines || 0;
  let isFineOverdue = false;
  if (fineDateStr && fineAmount > 0 && dashboardData?.authorProfile?.extraData?.fineStatus !== 'Pending Verification') {
    const diffDays = (new Date().getTime() - new Date(fineDateStr).getTime()) / (1000 * 3600 * 24);
    if (diffDays > 3) isFineOverdue = true;
  }

  let hasLateOrders = false;
  if (dashboardData?.authorOrders) {
    dashboardData.authorOrders.forEach((o: any) => {
      if ((o.status === 'Pending Verification' || o.status === 'Pending') && o.createdAt) {
        const hours = (new Date().getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600);
        if (hours > 24) hasLateOrders = true;
      } else if (o.status === 'Accepted' && o.createdAt) {
        const hours = (new Date().getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600);
        if (hours > 48) hasLateOrders = true;
      }
    });
  }

  return (
    <>
      {/* Late Delivery Fine Banner */}
      {(isFineOverdue || showFineModal) && fineAmount > 0 && (
        <div className="w-full bg-red-50 border-b-4 border-red-600 p-6 z-40 relative flex justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md max-w-3xl w-full border border-red-100 text-center relative overflow-hidden animate-fade-in-up">
            {!isFineOverdue && (
              <button onClick={() => setShowFineModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X size={16} />
              </button>
            )}
            {dashboardData?.authorProfile?.extraData?.fineStatus === 'Pending Verification' ? (
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-serif text-paa-navy">Payment Under Review</h2>
                </div>
                <p className="text-sm text-gray-600">You have submitted your payment of <strong className="text-green-600">₹{dashboardData.authorProfile.extraData.lateFines}</strong>. Your payment is currently under review by an administrator.</p>
                {isFineOverdue && <p className="text-sm text-red-500 font-semibold mt-2">Please ensure you manage your pending orders below.</p>}
              </>
            ) : (
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-serif text-paa-navy">Outstanding Late Fine</h2>
                  </div>
                  <p className="text-sm text-gray-600">You have an outstanding late delivery fine of <strong className="text-red-600">₹{dashboardData.authorProfile.extraData.lateFines}</strong>. {isFineOverdue ? 'Please pay it as soon as possible. Your dashboard access remains active so you can fulfill orders.' : 'Please pay it to avoid issues.'}</p>
                </div>
    
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 relative flex flex-col items-center justify-center h-full">
                    <img src={qrCode} alt="Payment QR" className="w-32 h-32 rounded-xl shadow-sm mb-3 border border-orange-300" />
                    <p className="text-xs font-bold text-orange-900 uppercase tracking-widest">Scan to pay ₹{dashboardData.authorProfile.extraData.lateFines}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="text-left">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-paa-navy mb-1 block">Upload Payment Screenshot *</label>
                      <input type="file" accept="image/*" className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-paa-navy bg-white" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFineScreenshot(e.target.files[0]);
                        } else {
                          setFineScreenshot(null);
                        }
                      }} />
                    </div>
        
                    <div className="text-left">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-paa-navy mb-1 block">Reason for Late Dispatch *</label>
                      <textarea className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-paa-navy bg-white min-h-[60px]" placeholder="Please explain why the order was dispatched late..." value={fineReason} onChange={(e) => setFineReason(e.target.value)} />
                    </div>
        
                    <button onClick={handlePayFine} disabled={isSubmittingFine || !fineScreenshot || !fineReason} className="w-full dash-btn dash-btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white border-none py-2 text-sm">
                      {isSubmittingFine ? 'Submitting...' : 'Submit Payment Screenshot'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}





      <div className="min-h-screen font-sans bg-paa-cream flex flex-col md:flex-row">

      {/* SIDEBAR — matches admin layout */}
      <aside className={`w-64 flex flex-col shrink-0 h-screen fixed md:sticky top-0 bg-paa-cream z-50 transform transition-transform duration-300 border-r border-paa-navy/5 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 md:p-6 h-20 flex items-center justify-between shrink-0 border-b border-paa-navy/5">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="PAA Logo" className="h-8 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <div className="hidden w-8 h-8 rounded-full bg-[#b44d28] flex items-center justify-center text-white text-sm font-bold">P</div>
            <span className="font-serif font-bold text-lg tracking-tight text-paa-navy ml-1">Author Portal</span>
          </div>

        </div>

        <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname === '/dashboard' ? 'active' : ''}`}><BarChart3 className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Overview</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/orders" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/orders') ? 'active' : ''}`}><ShoppingCart className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Web Orders</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/sales" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/sales') ? 'active' : ''}`}><TrendingUp className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Sales Report</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/inventory" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/inventory') ? 'active' : ''}`}><BookOpen className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Inventory & Distribution</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/events" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname === '/dashboard/events' ? 'active' : ''}`}><CalendarIcon className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Events Data</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/book-performance" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/book-performance') ? 'active' : ''}`}><TrendingUp className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Book Performance</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/payments" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/payments') ? 'active' : ''}`}><CheckCircle2 className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Payments History</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/invitations" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/invitations') ? 'active' : ''}`}><CalendarIcon className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Invitations</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/donations" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/donations') ? 'active' : ''}`}><MapPin className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Library Donations</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/reviews" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/reviews') ? 'active' : ''}`}><Star className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Reviews & Ratings</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/queries" className={`author-profile-nav-btn flex items-center gap-3 relative ${location.pathname.includes('/queries') ? 'active' : ''}`}><MessageSquare className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Queries & Issues</span>{hasNewQueries && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-sm"></span>}</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/gallery" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/gallery') ? 'active' : ''}`}><ImageIcon className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Event Gallery</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/documents" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/documents') ? 'active' : ''}`}><FileText className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Policy Documents</span></Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard/profile" className={`author-profile-nav-btn flex items-center gap-3 ${location.pathname.includes('/profile') ? 'active' : ''}`}><User className="w-4 h-4 shrink-0" /> <span className="flex-1 truncate">Profile Settings</span></Link>
        </nav>

        <div className="p-4 shrink-0 space-y-2">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-paa-navy/5 bg-white text-xs font-bold uppercase hover:bg-gray-50 text-gray-700 transition-colors rounded-full">
            <LogOut size={14} /> Logout
          </button>
          <button onClick={handleDeleteProfile} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-100 bg-red-50 text-xs font-bold uppercase hover:bg-red-100 text-red-600 transition-colors rounded-full">
            <Trash2 size={14} /> Delete Profile
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative" style={{ background: '#f5f5f3' }}>

        {/* Top Header — breadcrumb */}
        <header className="dash-header h-[68px] flex items-center justify-between px-6 md:px-8 shrink-0 relative z-50">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-paa-navy rounded-lg hover:bg-black/5 transition-colors mr-1">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <img src="/logo.webp" alt="PAA Logo" className="h-6 w-auto object-contain md:hidden mr-1" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <div className="hidden md:hidden w-6 h-6 rounded-full bg-[#b44d28] items-center justify-center text-white text-[10px] font-bold mr-1">P</div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-paa-gray-text">Author Portal</span>
              <span className="text-paa-navy/20">/</span>
              <span className="font-semibold text-paa-navy capitalize">{
                location.pathname === '/dashboard' ? 'Overview' :
                location.pathname.includes('/orders') ? 'Web Orders' :
                location.pathname.includes('/sales') ? 'Sales Report' :
                location.pathname.includes('/inventory') ? 'Inventory & Distribution' :
                location.pathname.includes('/events') ? 'Events Data' :
                location.pathname.includes('/invitations') ? 'Invitations' :
                location.pathname.includes('/donations') ? 'Library Donations' :
                location.pathname.includes('/reviews') ? 'Reviews & Ratings' :
                location.pathname.includes('/queries') ? 'Queries & Issues' :
                location.pathname.includes('/gallery') ? 'Event Gallery' :
                location.pathname.includes('/profile') ? 'Profile Settings' : 'Overview'
              }</span>
            </div>
          </div>
          <div className="flex items-center gap-2 relative shrink-0">
            <button onClick={() => { setShowNotifications(!showNotifications); }} className={`relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-black/8 text-paa-navy hover:bg-black/4 transition-colors ${hasUnread && dismissedToastId !== String(visibleNotifications[0]?.id || unreadEventInvites[0]?.id || 'toast') ? 'animate-pulse' : ''}`}>
              <Bell size={16} />
              {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            {hasUnread && !showNotifications && dismissedToastId !== String(visibleNotifications[0]?.id || unreadEventInvites[0]?.id || 'toast') && (
              <div className="animate-pulse" style={{ position: 'absolute', top: '100%', right: '100%', marginRight: 12, marginTop: -8, width: 280, background: '#1a1a2e', borderRadius: 12, padding: '12px 16px', color: '#fff', zIndex: 9999, display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setShowNotifications(true); const latestId = String(visibleNotifications[0]?.id || unreadEventInvites[0]?.id || 'toast'); setDismissedToastId(latestId); localStorage.setItem('paa_dismissed_toast', latestId); }}>
                  <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3b82f6', marginBottom: 2 }}>New Message</p>
                  <p style={{ fontSize: 12, color: '#f3f4f6', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{visibleNotifications[0]?.message?.replace(/\[LOW_STOCK:\d+\]\s*/g, '') || (unreadEventInvites.length > 0 ? `New Event: ${unreadEventInvites[0].event.name}` : 'You have unread notifications.')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); const latestId = String(visibleNotifications[0]?.id || unreadEventInvites[0]?.id || 'toast'); setDismissedToastId(latestId); localStorage.setItem('paa_dismissed_toast', latestId); }} style={{ color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                <div style={{ position: 'absolute', top: 12, right: -6, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '6px solid #1a1a2e' }}></div>
              </div>
            )}
            {showNotifications && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 12, width: 340, background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden', transformOrigin: 'top right', animation: 'scaleIn 0.2s ease-out' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1a2e' }}>Notifications</p>
                  <div className="flex gap-4 items-center">
                    <button onClick={() => { setShowNotifications(false); navigate('/dashboard/broadcasts'); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                      View All
                    </button>
                    <button onClick={() => setShowNotifications(false)} style={{ color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                  </div>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {hasUnread ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {unreadEventInvites.map((inv: any) => (
                        <button key={`inv-${inv.id}`} onClick={() => { setShowNotifications(false); navigate('/dashboard/events'); }} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', marginTop: 6, flexShrink: 0 }}></div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>New Event: {inv.event.name}</p>
                            <p style={{ fontSize: 12, color: '#6b6b80', lineHeight: 1.4 }}>You are invited to participate!</p>
                          </div>
                        </button>
                      ))}
                      {notifications.map((notif: any) => (
                        <div key={`notif-${notif.id}`} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: 6, flexShrink: 0 }}></div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{notif.message?.replace(/\[LOW_STOCK:\d+\]\s*/g, '')}</p>
                            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{new Date(notif.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6b6b80', fontSize: 12 }}>No new notifications.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Warning Banners */}
        {(() => {
          const notifyDateStr = dashboardData?.authorProfile?.extraData?.lateNotificationDate;
          const fineAmt = dashboardData?.authorProfile?.extraData?.lateFines || 0;
          if (fineAmt === 0 && notifyDateStr && hasLateOrders) {
            const diffDays = (new Date().getTime() - new Date(notifyDateStr).getTime()) / (1000 * 3600 * 24);
            if (diffDays >= 0 && diffDays <= 3) {
              const daysLeft = Math.max(0, 3 - Math.floor(diffDays));
              return (
                <div className="bg-[#b44d28] text-white px-6 py-2.5 flex items-center justify-center gap-2 shadow-sm relative z-[100] border-b border-[#963c1e]">
                  <AlertCircle size={14} className="text-white/90" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/90">
                    Action Required: You have unaccepted late orders. {daysLeft} day(s) remaining to dispatch before catalogue suspension.
                  </span>
                </div>
              );
            }
          } else if (fineAmt > 0 && dashboardData?.authorProfile?.extraData?.fineDate) {
            const diffDays = (new Date().getTime() - new Date(dashboardData.authorProfile.extraData.fineDate).getTime()) / (1000 * 3600 * 24);
            if (diffDays >= 0 && diffDays <= 3) {
              const daysLeft = Math.max(0, 3 - Math.floor(diffDays));
              const isPending = dashboardData?.authorProfile?.extraData?.fineStatus === 'Pending Verification';
              return (
                <div className="bg-[#1a1a2e] text-white px-6 py-2 flex items-center justify-between shadow-sm relative z-[100] border-b border-[#0f0f1c]">
                  <div className="flex items-center gap-2">
                    {isPending ? <CheckCircle2 size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-red-400" />}
                    <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isPending ? 'text-green-100' : 'text-red-100'}`}>
                      {isPending 
                        ? `Payment of ₹${fineAmt} is under review.` 
                        : `Urgent: Outstanding late fine of ₹${fineAmt}. ${daysLeft} day(s) remaining before account suspension.`
                      }
                    </span>
                  </div>
                  {!isPending && (
                    <button onClick={() => setShowFineModal(true)} className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shrink-0">
                      Pay Fine Now
                    </button>
                  )}
                </div>
              );
            }
          }
          return null;
        })()}

        {(() => {
          const activeDonations = dashboardData?.activeDonations || [];
          const donationRegistrations = dashboardData?.authorProfile?.donationRegistrations || [];
          const unregisteredDonations = activeDonations.filter((ad: any) => !donationRegistrations.find((dr: any) => dr.announcementId === ad.id));
          if (unregisteredDonations.length > 0) {
            return (
              <div className="bg-gradient-to-r from-indigo-900 to-paa-navy text-white px-6 py-3 flex flex-col md:flex-row items-center justify-between shadow-sm relative z-[99] border-b border-indigo-950 gap-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-indigo-300" />
                  <span className="text-sm font-semibold tracking-wide text-indigo-50">
                    You have been invited to participate in a new Airport Library Donation Campaign.
                  </span>
                </div>
                <button onClick={() => navigate('/dashboard/donations')} className="bg-white text-paa-navy px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-50 transition-colors shrink-0 shadow-sm">
                  Register Now
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Routes>
            <Route path="/" element={<OverviewTab data={dashboardData} onRefresh={() => fetchDashboardData(true)} buttonStates={buttonStates} setButtonStates={setButtonStates} />} />
            <Route path="/orders" element={<AuthorOrders orders={dashboardData.authorOrders} onRefresh={() => fetchDashboardData(true)} dashboardData={dashboardData} />} />
            <Route path="/sales" element={<AuthorSalesReport data={dashboardData} onRefresh={() => fetchDashboardData(true)} />} />
            <Route path="/forms/*" element={<FormsWrapper />} />
            <Route path="/inventory" element={<InventoryPage onRefresh={() => fetchDashboardData(true)} dashboardData={dashboardData} />} />
            <Route path="/events" element={<EventsDashboard initialView="events" registrations={dashboardData.authorProfile.eventRegistrations} dashboardData={dashboardData} />} />
            <Route path="/book-performance" element={<BookPerformance />} />
            <Route path="/payments" element={<EventsDashboard initialView="payments" registrations={dashboardData.authorProfile.eventRegistrations} dashboardData={dashboardData} />} />
            <Route path="/invitations" element={<AuthorInvitationsView />} />
            <Route path="/donations" element={<AuthorDonationsTab dashboardData={dashboardData} onRefresh={() => fetchDashboardData(true)} />} />
            <Route path="/reviews" element={<AuthorReviews books={dashboardData.authorProfile.books} orders={dashboardData.authorOrders || []} />} />
            <Route path="/gallery" element={<AuthorGallery dashboardData={dashboardData} />} />
            <Route path="/profile" element={<AuthorProfile data={dashboardData} onRefresh={() => fetchDashboardData(true)} buttonStates={buttonStates} setButtonStates={setButtonStates} />} />
            <Route path="/pos/:eventId" element={<LivePosDashboard />} />
            <Route path="/bundle-offers" element={<BundleOffersTab data={dashboardData} />} />
            <Route path="/queries" element={<AuthorQueries />} />
            <Route path="/broadcasts" element={<AuthorBroadcasts notifications={dashboardData.notifications || []} />} />
            <Route path="/documents" element={<AuthorDocuments notifications={dashboardData.notifications || []} />} />
          </Routes>
        </div>
      </main>
      </div>
    </>
  );
}

function AuthorBroadcasts({ notifications }: { notifications: any[] }) {
  const broadcasts = notifications.filter((n: any) => !n.documentUrl);
  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-serif text-paa-navy mb-6 flex items-center gap-2"><Megaphone className="w-6 h-6 text-indigo-500"/> All Broadcasted Messages</h2>
      {broadcasts.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-paa-navy/5 text-center shadow-premium">
          <p className="text-gray-500 italic text-sm">You don't have any broadcasted messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((n: any) => (
            <div key={n.id} className="bg-white p-5 border border-paa-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[15px] font-medium text-paa-navy leading-relaxed mb-4">{n.message?.replace(/\[LOW_STOCK:\d+\]\s*/g, '')}</p>
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
                <span className="font-bold uppercase tracking-widest text-paa-gold flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-gray-400"/> {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthorDocuments({ notifications }: { notifications: any[] }) {
  const documents = notifications.filter((n: any) => n.documentUrl);
  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-serif text-paa-navy mb-6 flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-500"/> Policy Documents</h2>
      {documents.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-paa-navy/5 text-center shadow-premium">
          <p className="text-gray-500 italic text-sm">You don't have any shared documents yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((n: any) => (
            <div key={n.id} className="bg-white p-5 border border-paa-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <p className="text-[15px] font-medium text-paa-navy leading-relaxed mb-3">{n.message || 'No description'}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="font-bold uppercase tracking-widest text-paa-gold flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-gray-400"/> {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${n.documentUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-indigo-100 transition-colors shrink-0 shadow-sm">
                <Download className="w-4 h-4" /> {n.documentName || 'Download Document'}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const languages = [
  "English", "Hindi", "Marathi", "Bengali", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam", "Punjabi", "Other"
];

function OverviewTab({ data, onRefresh, buttonStates, setButtonStates }: { data: any, onRefresh: () => void, buttonStates: any, setButtonStates: any }) {
  const [filter, setFilter] = useState('all');
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    subtitle: '',
    genre: '',
    subcategory: '',
    subSubcategory: '',
    synopsis: '',
    pages: '',
    mrp: '',
    stock: '',
    language: '',
    isbn: '',
    publisher: '',
    isSelfPublished: 'no',
    publicationDate: '',
    edition: '',
    format: '',
    printFormat: '',
    purpose: ''
  });
  const [cover, setCover] = useState<File | null>(null);
  const [backCover, setBackCover] = useState<File | null>(null);
  const [coverFileUrl, setCoverFileUrl] = useState<string | null>(null);
  const [backCoverFileUrl, setBackCoverFileUrl] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [reapplyForm, setReapplyForm] = useState({ name: '', phone: '', whatsapp: '', bio: '', penName: '', city: '', state: '', address: '', aadharNumber: '', qualification: '', institution: '', subject: '', age: '', experience: '', skills: '', hobbies: '', instagram: '', facebook: '', transactionId: '', extraData: {} });
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '', whatsapp: '', bio: '', penName: '', city: '', state: '', instagram: '', facebook: '', linkedin: '', address: '', pincode: '', aadharNumber: '', qualification: '', institution: '', subject: '', age: '', experience: '', skills: '', hobbies: '', whyJoining: '' });
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editCoverBookId, setEditCoverBookId] = useState<number | null>(null);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [dismissedActions, setDismissedActions] = useState<string[]>(() => {
    const saved = localStorage.getItem('paa_author_dismissed');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedGalleryEvent, setSelectedGalleryEvent] = useState<any>(null);
  const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
  const [galleryUploadCaption, setGalleryUploadCaption] = useState('');
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [showFineNotification, setShowFineNotification] = useState(true);
  const navigate = useNavigate();

  const authorProfile = data.authorProfile;
  const authorBooks = authorProfile.books;
  const authorOrders = data.authorOrders;

  const titlesData = authorBooks.map((b: any, index: number) => {
    const webSales = authorOrders.filter((o: any) => (o.bookId === b.id || o.bookTitle === b.title) && ['Pending Verification', 'Completed', 'Processing', 'Delivered', 'Dispatched', 'Accepted', 'Paid'].includes(o.status || o.orderStatus)).reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0);
    const eventSales = (data.listedBooks || []).filter((lb: any) => lb.bookId === b.id).reduce((acc: number, curr: any) => acc + (curr.soldStock || 0), 0);
    const totalSold = webSales + eventSales;
    return {
      sno: index + 1,
      id: b.id,
      title: b.title,
      date: new Date(b.createdAt).toLocaleDateString('en-GB'),
      mrp: `₹${b.mrp}`,
      overpriced: b.overpriced ? 'Yes' : 'No',
      pub: 'Self-Published',
      genre: b.genre,
      sold: { total: totalSold, web: webSales, events: eventSales },
      status: b.status,
      rejectionReason: b.rejectionReason,
      stock: b.stock
    };
  });

  const filteredTitles = filter === 'all' ? titlesData : titlesData.filter((t: any) => t.genre === filter);

  const chartData = titlesData.map((t: any) => ({
    name: t.title.length > 12 ? t.title.substring(0, 12) + '…' : t.title,
    fullTitle: t.title,
    sold: t.sold.total
  }));

  const webOrdersPieData = titlesData
    .filter((t: any) => t.sold.web > 0)
    .map((t: any) => ({
      name: t.title.length > 12 ? t.title.substring(0, 12) + '…' : t.title,
      fullTitle: t.title,
      value: t.sold.web
    }));

  const distributionActivityData = titlesData.map((t: any) => {
    const bk = authorBooks.find((b: any) => b.id === t.id) || {};
    return {
      name: t.title.length > 12 ? t.title.substring(0, 12) + '…' : t.title,
      fullTitle: t.title,
      'Web Sold': t.sold.web || 0,
      'Airport Qty': bk.airportQty || 0,
      'Book Fair Qty': bk.eventQty || 0
    };
  });

  const participationsData = [
    { name: 'Events Part.', count: data.eventInvites?.filter((inv: any) => inv.optInStatus === 'Registered' || inv.optInStatus === 'Approved').length || 0 },
    { name: 'Donation Drives', count: data.authorProfile?.donationRegistrations?.length || 0 },
    { name: 'Support Queries', count: data.queries?.length || 0 }
  ];

  const completedOrders = authorOrders.filter((o: any) => o.status === 'Completed' || o.status === 'Delivered' || o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
  const webSalesAmount = completedOrders.reduce((acc: number, curr: any) => acc + curr.amount, 0);
  
  let posSalesAmount = (data.posOrders || []).reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0);

  (data.eventInvites || []).forEach((ea: any) => {
    if (ea.optInStatus === 'Registered' || ea.optInStatus === 'Approved') {
      if (ea.manualTotalSold > 0 || ea.manualTotalRevenue > 0) {
        posSalesAmount += (ea.manualTotalRevenue || 0);
      } else {
        const eventBooks = (data.listedBooks || []).filter((lb: any) => lb.eventId === ea.eventId);
        eventBooks.forEach((eb: any) => {
          if (eb.soldStock > 0) {
            const price = eb.overrideMrp || authorBooks.find((b: any) => b.id === eb.bookId)?.mrp || 0;
            posSalesAmount += (eb.soldStock * price);
          }
        });
      }
    }
  });

  const grossSales = webSalesAmount + posSalesAmount;

  const lowStockCount = authorBooks.filter((b: any) => b.stock < 5).length;


  const successfulOrders = completedOrders.length;
  const avgOrderValue = completedOrders.length > 0 ? (webSalesAmount / completedOrders.length).toFixed(0) : '0';
  let totalDeliveryTime = 0;
  let deliveredCount = 0;
  authorOrders.forEach((o: any) => {
    if (o.status === 'Delivered' && o.dispatchedAt && o.deliveredAt) {
      const time = new Date(o.deliveredAt).getTime() - new Date(o.dispatchedAt).getTime();
      totalDeliveryTime += time;
      deliveredCount++;
    }
  });
  const avgDeliveryDays = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount / (1000 * 3600 * 24)).toFixed(1) : 0;

  const toApproveOrders = authorOrders.filter((o: any) => (o.status === 'Pending Verification' || o.status === 'Processing' || o.status === 'Pending') && !o.isBulk).length;
  const underDeliveryOrders = authorOrders.filter((o: any) => o.status === 'Dispatched').length;

  const donationRegistrations = data?.authorProfile?.donationRegistrations || [];
  const pendingRegistrations = donationRegistrations.filter((dr: any) => (dr.status === 'Pending' || dr.status === 'Registered') && dr.announcement?.visibility === 'Published').length;
  const approvedDonations = donationRegistrations.filter((dr: any) => dr.status === 'Approved').length;
  const uniqueLibraries = new Set(donationRegistrations.filter((dr: any) => dr.announcement?.libraryId).map((dr: any) => dr.announcement.libraryId)).size;
  const totalBooksDonated = donationRegistrations.reduce((acc: number, curr: any) => 
    acc + (curr.books || []).reduce((bAcc: number, book: any) => bAcc + book.quantityDonated, 0), 0);

  const totalEventFees = (data.eventInvites || []).filter((inv: any) => inv.optInStatus === 'Registered').reduce((acc: number, inv: any) => {
    const evt = inv.event;
    if (!evt) return acc;
    if (evt.feeType === 'Flat Fee' || evt.feeType === 'Per Author') {
      return acc + (evt.registrationFee || 0);
    } else if (evt.feeType === 'Per Title') {
      const titlesCount = (data.listedBooks || []).filter((lb: any) => lb.eventId === evt.id).length;
      return acc + ((evt.registrationFee || 0) * titlesCount);
    }
    return acc;
  }, 0);
  const totalFeesPaid = 3000 + totalEventFees;

  const actionItems: any[] = [];

  const documentNotifications = (data.notifications || []).filter((n: any) => n.documentUrl);
  const unreadDocsCount = documentNotifications.length;
  const maxDocId = documentNotifications.length > 0 ? Math.max(...documentNotifications.map((n: any) => n.id)) : 0;
  if (unreadDocsCount > 0 && !dismissedActions.includes(`act-docs-${maxDocId}`)) {
    actionItems.push({ id: `act-docs-${maxDocId}`, text: `Received ${unreadDocsCount} document(s) from admin, read them`, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/dashboard/documents' });
  }

  const broadcastNotifications = (data.notifications || []).filter((n: any) => !n.documentUrl && n.target !== 'SILENT_ALL');
  const unreadBroadcastsCount = broadcastNotifications.length;
  const maxBroadcastId = broadcastNotifications.length > 0 ? Math.max(...broadcastNotifications.map((n: any) => n.id)) : 0;
  if (unreadBroadcastsCount > 0 && !dismissedActions.includes(`act-broadcasts-${maxBroadcastId}`)) {
    actionItems.push({ id: `act-broadcasts-${maxBroadcastId}`, text: `You have ${unreadBroadcastsCount} new broadcast message(s). Read more`, icon: Megaphone, color: 'text-pink-600', bg: 'bg-pink-100', link: '/dashboard/broadcasts' });
  }

  const unapprovedOrdersList = authorOrders.filter((o: any) => (o.status === 'Pending Verification' || o.status === 'Processing' || o.status === 'Pending') && !o.isBulk);
  const unapprovedOrders = unapprovedOrdersList.length;
  const maxOrderId = unapprovedOrdersList.length > 0 ? Math.max(...unapprovedOrdersList.map((o: any) => o.id)) : 0;
  if (unapprovedOrders > 0 && !dismissedActions.includes(`act-orders-${maxOrderId}`)) {
    actionItems.push({ id: `act-orders-${maxOrderId}`, text: `Approve and fulfill ${unapprovedOrders} new web order${unapprovedOrders > 1 ? 's' : ''}`, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-[#eef2f6]', link: '/dashboard/orders' });
  }

  const unreadEventInvites = data.eventInvites?.filter((inv: any) => inv.optInStatus === 'Pending') || [];
  const maxInviteId = unreadEventInvites.length > 0 ? Math.max(...unreadEventInvites.map((inv: any) => inv.id)) : 0;
  if (unreadEventInvites.length > 0 && !dismissedActions.includes(`act-events-${maxInviteId}`)) {
    actionItems.push({ id: `act-events-${maxInviteId}`, text: `You have been invited to ${unreadEventInvites.length} new event${unreadEventInvites.length > 1 ? 's' : ''}. Register now!`, icon: CalendarIcon, color: 'text-purple-600', bg: 'bg-purple-100', link: '/dashboard/events' });
  }

  const pendingPaymentEvents = data.eventInvites?.filter((inv: any) => {
    const evt = inv.event;
    if (!evt) return false;
    return inv.optInStatus === 'Approved' && (evt.registrationFee > 0 || evt.charges > 0) && !inv.paymentScreenshot && inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Pending Verification' && evt.status !== 'Past' && evt.status !== 'Legacy Archive';
  }) || [];
  const pendingPaymentActivities = data.authorProfile?.eventRegistrations?.filter((reg: any) => {
    const act = reg.activity;
    if (!act) return false;
    return reg.status === 'Approved' && (act.registrationFee > 0 || act.charges > 0) && !reg.paymentScreenshot && reg.paymentStatus !== 'Paid' && reg.paymentStatus !== 'Pending Verification' && act.status !== 'Past' && act.status !== 'Legacy Archive';
  }) || [];
  const totalPendingPayments = pendingPaymentEvents.length + pendingPaymentActivities.length;
  const maxPaymentId = totalPendingPayments > 0 ? Math.max(
    ...pendingPaymentEvents.map((inv: any) => inv.id), 
    ...pendingPaymentActivities.map((reg: any) => reg.id), 
    0
  ) : 0;
  if (totalPendingPayments > 0 && !dismissedActions.includes(`act-payment-${maxPaymentId}`)) {
    actionItems.push({ id: `act-payment-${maxPaymentId}`, text: `You have ${totalPendingPayments} approved event(s) waiting for payment. Pay now to secure your slot!`, icon: DollarSign, color: 'text-yellow-700', bg: 'bg-yellow-200', link: '/dashboard/events' });
  }

  const rejectedPaymentEvents = data.eventInvites?.filter((inv: any) => inv.optInStatus === 'Approved' && inv.paymentStatus === 'Rejected' && !inv.paymentScreenshot && inv.event?.status !== 'Past' && inv.event?.status !== 'Legacy Archive') || [];
  const rejectedPaymentActivities = data.authorProfile?.eventRegistrations?.filter((reg: any) => reg.status === 'Approved' && reg.paymentStatus === 'Rejected' && !reg.paymentScreenshot && reg.activity?.status !== 'Past' && reg.activity?.status !== 'Legacy Archive') || [];
  const totalRejectedPayments = rejectedPaymentEvents.length + rejectedPaymentActivities.length;
  if (totalRejectedPayments > 0) {
    const maxRejPayId = Math.max(...rejectedPaymentEvents.map((inv: any) => inv.id), ...rejectedPaymentActivities.map((reg: any) => reg.id), 0);
    if (!dismissedActions.includes(`act-rejpay-${maxRejPayId}`)) {
      actionItems.push({ id: `act-rejpay-${maxRejPayId}`, text: `Payment rejected for ${totalRejectedPayments} event(s). Please remake payment.`, icon: DollarSign, color: 'text-red-700', bg: 'bg-red-200', link: '/dashboard/events' });
    }
  }

  const rejectedEvents = data.eventInvites?.filter((inv: any) => inv.optInStatus === 'Rejected' && inv.event?.status !== 'Past' && inv.event?.status !== 'Legacy Archive') || [];
  if (rejectedEvents.length > 0) {
    const maxRejId = Math.max(...rejectedEvents.map((inv: any) => inv.id), 0);
    if (!dismissedActions.includes(`act-rejev-${maxRejId}`)) {
      actionItems.push({ id: `act-rejev-${maxRejId}`, text: `Registration declined for ${rejectedEvents.length} event(s). You may reapply.`, icon: CalendarIcon, color: 'text-red-700', bg: 'bg-red-100', link: '/dashboard/events' });
    }
  }

  const newlyRegisteredEvents = data.eventInvites?.filter((inv: any) => inv.optInStatus === 'Registered' && inv.event?.status !== 'Past' && inv.event?.status !== 'Legacy Archive') || [];
  const newlyRegisteredActivities = data.authorProfile?.eventRegistrations?.filter((reg: any) => reg.status === 'Registered' && reg.activity?.status !== 'Past' && reg.activity?.status !== 'Legacy Archive') || [];
  const totalNewlyRegistered = newlyRegisteredEvents.length + newlyRegisteredActivities.length;
  if (totalNewlyRegistered > 0) {
    const maxRegId = Math.max(...newlyRegisteredEvents.map((inv: any) => inv.id), ...newlyRegisteredActivities.map((reg: any) => reg.id), 0);
    if (!dismissedActions.includes(`act-registered-${maxRegId}`)) {
      actionItems.push({ id: `act-registered-${maxRegId}`, text: `Success! You are fully registered for ${totalNewlyRegistered} event(s).`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', link: '/dashboard/events' });
    }
  }

  const lowStockAlerts = authorProfile.extraData?.lowStockAlerts || [];
  const activeAlerts = lowStockAlerts.filter((a: any) => !a.read && (Date.now() - a.timestamp < 24 * 60 * 60 * 1000));
  const maxLowStockTs = activeAlerts.length > 0 ? Math.max(...activeAlerts.map((a: any) => a.timestamp)) : 0;
  if (activeAlerts.length > 0 && !dismissedActions.includes(`act-lowstock-${maxLowStockTs}`)) {
    actionItems.push({ id: `act-lowstock-${maxLowStockTs}`, text: `Admin Notification: ${activeAlerts.length} of your books have critically low stock!`, icon: Package, color: 'text-red-600', bg: 'bg-red-100', link: '/dashboard/inventory' });
  }

  if (actionItems.length === 0) {
    actionItems.push({ id: 'act-none', text: 'All caught up! No pending actions.', icon: Check, color: 'text-gray-600', bg: 'bg-gray-100', link: '' });
  }

  const handleAddBook = async (e: React.FormEvent | null, addAnother: boolean = false) => {
    if (e) e.preventDefault();
    if (!newBook.pages || parseInt(newBook.pages) <= 0) {
      toast.error('Number of pages is mandatory and must be greater than 0.');
      return;
    }
    if (!newBook.printFormat) {
      toast.error('Print format is mandatory.');
      return;
    }
    if (!newBook.isbn) {
      toast.error('ISBN number is mandatory.');
      return;
    } else if (newBook.isbn.length !== 10 && newBook.isbn.length !== 13) {
      toast.error('ISBN must be exactly 10 or 13 digits.');
      return;
    }
    if (!newBook.mrp || parseFloat(newBook.mrp) <= 0) {
      toast.error('MRP is mandatory and must be greater than 0.');
      return;
    }
    if (!newBook.stock || parseInt(newBook.stock) < 0) {
      toast.error('Initial Stock is mandatory and must be 0 or greater.');
      return;
    }
    if (newBook.synopsis.split(/\s+/).filter(Boolean).length > 100) {
      toast.error('Synopsis cannot exceed 100 words.');
      return;
    }
    if (!newBook.purpose || !newBook.purpose.trim()) {
      toast.error('Purpose of writing is mandatory.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', newBook.title);
      formData.append('subtitle', newBook.subtitle);
      formData.append('genre', newBook.genre);
      let subGenre = newBook.subcategory;
      if (newBook.subSubcategory) subGenre += ' > ' + newBook.subSubcategory;
      if (subGenre) formData.append('subGenre', subGenre);
      formData.append('synopsis', newBook.synopsis);
      formData.append('mrp', newBook.mrp);
      formData.append('stock', newBook.stock);
      formData.append('language', newBook.language);
      formData.append('isbn', newBook.isbn);
      formData.append('publisher', newBook.publisher);
      formData.append('publicationDate', newBook.publicationDate);
      formData.append('printFormat', newBook.printFormat || '');
      formData.append('purpose', newBook.purpose || '');

      let maxFairPrice = 0;
      if (newBook.pages && newBook.printFormat) {
        const pages = parseInt(newBook.pages, 10);
        if (!isNaN(pages)) {
          if (newBook.printFormat === 'Black & White') { maxFairPrice = (pages * 0.50) + 250; }
          else if (newBook.printFormat === 'Colored') { maxFairPrice = (pages * 2.40) + 250; }
        }
      }
      formData.append('isOverpriced', (maxFairPrice > 0 && parseFloat(newBook.mrp) > maxFairPrice) ? 'true' : 'false');
      formData.append('edition', newBook.edition);
      formData.append('format', newBook.format);
      formData.append('pages', newBook.pages);
      if (cover) formData.append('cover', cover);
      if (backCover) formData.append('backCover', backCover);

      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/books`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Book added successfully! Pending admin approval.');
      onRefresh();

        if (addAnother) {
          setNewBook({
            title: '', subtitle: '', genre: '', subcategory: '', subSubcategory: '', synopsis: '', pages: '', mrp: '', stock: '', language: '', isbn: '', publisher: '', isSelfPublished: 'no', publicationDate: '', edition: '', format: '', printFormat: '', purpose: ''
          });
          setCover(null);
          setBackCover(null);
          setCoverFileUrl(null);
          setBackCoverFileUrl(null);
        } else {
        setShowAddBook(false);
      }
    } catch (err) {
      toast.error('Failed to add book');
    } finally {
      setButtonStates(prev => ({ ...prev, addBook: false }));
    }
  };

  const handleEditProfileOpen = () => {
    navigate('/dashboard/profile');
  };


  const handleUploadGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryEvent || !galleryUploadFile) return;
    try {
      setIsUploadingGallery(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', galleryUploadFile);
      formData.append('caption', galleryUploadCaption);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/gallery/${selectedGalleryEvent.id}/images`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        alert('Image uploaded successfully! It will appear in the gallery.');
        setGalleryUploadFile(null);
        setGalleryUploadCaption('');
        setSelectedGalleryEvent(null);
      } else {
        alert('Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!editProfileForm.name?.trim()) errors.push('Name is required');
    if (!editProfileForm.phone?.trim()) errors.push('Phone is required');
    if (editProfileForm.phone && !/^\d{10}$/.test(editProfileForm.phone.replace(/\D/g, ''))) errors.push('Phone must be 10 digits');
    if (editProfileForm.linkedin && !/^(https?:\/\/|www\.)/.test(editProfileForm.linkedin)) errors.push('Enter valid url starting with www.');
    const bioWordCount = editProfileForm.bio.split(/\s+/).filter(Boolean).length;
    if (bioWordCount < 100 || bioWordCount > 150) errors.push(`Bio must be 100-150 words (currently ${bioWordCount})`);
    // Validate qualifications
    try {
      const qArr = JSON.parse(editProfileForm.qualification || '[]');
      if (Array.isArray(qArr)) {
        qArr.forEach((q: any, i: number) => {
          if (!q.qualification?.trim()) errors.push(`Qualification ${i + 1}: Degree/Title is required`);
          if (!q.institution?.trim()) errors.push(`Qualification ${i + 1}: Institution is required`);
        });
      }
    } catch (e) { }
    if (errors.length > 0) {
      toast.error(`Please fix: ${errors.join(', ')}`);
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(editProfileForm).forEach(([key, val]) => {
        const valStr = val as string;
        if (key === 'age') formData.append('dob', valStr);
        else if (key === 'skills') formData.append('skills', JSON.stringify(valStr.split(',').map((s: any) => s.trim()).filter(Boolean)));
        else if (key === 'hobbies') formData.append('hobbies', JSON.stringify(valStr.split(',').map((s: any) => s.trim()).filter(Boolean)));
        else formData.append(key, valStr);
      });
      if (editPhoto) formData.append('photo', editPhoto);
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/profile/bio`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profile updated and submitted for admin review!');
      setShowEditProfile(false);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setButtonStates(prev => ({ ...prev, editProfile: false }));
    }
  };

  const handleUpdateCover = async (bookId: number) => {
    if (!newCoverFile) { toast.error('Please select a cover image'); return; }
    try {
      const formData = new FormData();
      formData.append('cover', newCoverFile);
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/books/${bookId}/cover`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Book cover updated!');
      setEditCoverBookId(null);
      setNewCoverFile(null);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update cover');
    } finally {
      setButtonStates(prev => ({ ...prev, updateCover: false }));
    }
  };

  const handleEditBookOpen = (bookId: number) => {
    const book = authorBooks.find((b: any) => b.id === bookId);
    if (!book) return;
    setEditingBook({
      id: book.id,
      title: book.title,
      subtitle: book.subtitle || '',
      genre: book.genre,
      subGenre: book.subGenre || '',
      mrp: book.mrp,
      stock: book.stock,
      synopsis: book.synopsis || '',
      pages: book.pages || '',
      language: book.language || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      publicationDate: book.publicationDate || '',
      edition: book.edition || '',
      format: book.format || '',
      printFormat: book.printFormat || '',
      purpose: book.purpose || ''
    });
  };

  const handleEditBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    if (!editingBook.title?.trim()) { toast.error('Book title is required.'); return; }
    if (!editingBook.genre?.trim()) { toast.error('Genre is required.'); return; }
    if (!editingBook.pages || parseInt(editingBook.pages) <= 0) {
      toast.error('Number of pages is mandatory and must be greater than 0.');
      return;
    }
    if (!editingBook.mrp || parseFloat(editingBook.mrp) <= 0) { toast.error('MRP is required.'); return; }
    if (!editingBook.language?.trim()) { toast.error('Language is required.'); return; }
    if (!editingBook.format?.trim()) { toast.error('Format is required.'); return; }
    if (!editingBook.printFormat) {
      toast.error('Print format is mandatory.');
      return;
    }
    if (!editingBook.isbn) {
      toast.error('ISBN number is mandatory.');
      return;
    }
    if (editingBook.synopsis.split(/\s+/).filter(Boolean).length > 100) {
      toast.error('Synopsis cannot exceed 100 words.');
      return;
    }
    setButtonStates(prev => ({ ...prev, updateBook: true }));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/books/${editingBook.id}`, {
        title: editingBook.title,
        genre: editingBook.genre,
        subGenre: editingBook.subGenre,
        subtitle: editingBook.subtitle,
        mrp: parseFloat(editingBook.mrp),
        stock: parseInt(editingBook.stock),
        synopsis: editingBook.synopsis,
        pages: editingBook.pages,
        language: editingBook.language,
        isbn: editingBook.isbn,
        publisher: editingBook.publisher,
        publicationDate: editingBook.publicationDate,
        edition: editingBook.edition,
        format: editingBook.format,
        printFormat: editingBook.printFormat,
        purpose: editingBook.purpose
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (newCoverFile) {
        const formData = new FormData();
        formData.append('cover', newCoverFile);
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/books/${editingBook.id}/cover`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success('Book updated and submitted for review!');
      setEditingBook(null);
      setNewCoverFile(null);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update book');
    } finally {
      setButtonStates(prev => ({ ...prev, updateBook: false }));
    }
  };



  const rejectedInvites = (data.eventInvites || []).filter((inv: any) => inv.optInStatus === 'Rejected' || inv.optInStatus === 'Declined');
  const availableEvents = data.availableEvents || [];
  const latestUpcomingEvent = availableEvents.length > 0 ? availableEvents[0] : null;
  const eventSubtext = latestUpcomingEvent
    ? (
      <>
        Don't miss out on <strong className="text-amber-300 font-bold text-[15px]">{latestUpcomingEvent.name}</strong> 
        <span className="opacity-80 ml-1">({new Date(latestUpcomingEvent.date || latestUpcomingEvent.startDate).toLocaleDateString('en-GB')})</span>.
      </>
    )
    : "No new upcoming events at the moment. Check back later!";

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
            {authorProfile.photoUrl ? (
              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${authorProfile.photoUrl}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-paa-gray-text mb-1">Author Portal &middot; Dashboard</p>
            <h1 className="text-3xl font-serif font-bold text-paa-navy tracking-tight mb-1">{authorProfile.name || 'My Dashboard'}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 font-medium">
              <span className="flex items-center gap-1.5"><Mail size={12} /> {authorProfile.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={12} /> {authorProfile.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleEditProfileOpen} className="dash-btn dash-btn-ghost">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginRight: 5 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            VIEW/EDIT PROFILE
          </button>
          <button onClick={() => navigate('/dashboard/bundle-offers')} className="dash-btn dash-btn-primary bg-indigo-600 hover:bg-indigo-700 !border-indigo-600">
            Bundle Offers
          </button>
        </div>
      </div>

      {/* ── CTA: Live POS Events ── */}
      {(() => {
         const isSpecialAuthor = data?.authorProfile?.email === 'arvindpuri1492@gmail.com';
         const livePosEvents = (data.eventInvites || [])
            .filter((inv: any) => {
               const evt = inv.event;
               if (!evt) return false;
               const isPast = evt.status === 'Past' || evt.status === 'Legacy Archive' || (evt.date && new Date(evt.date) < new Date());
               return ((evt.livePosEnabled && evt.status === 'Live') || (isSpecialAuthor && !isPast)) && (inv.optInStatus === 'Registered' || inv.optInStatus === 'Approved');
            })
            .map((inv: any) => inv.event);
            
         if (livePosEvents.length === 0) return null;
         
         return (
           <div className="mb-6 space-y-4 animate-fade-in-up">
             {livePosEvents.map((evt: any) => (
                <div key={evt.id} className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 border-2 border-emerald-400/30 shadow-[0_8px_30px_-4px_rgba(16,185,129,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"></div>
                   <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 transition-transform duration-700 group-hover:scale-110"></div>
                   
                   <div className="relative z-10 flex items-center gap-4 text-center sm:text-left">
                      <div className="hidden sm:flex h-10 w-10 relative items-center justify-center shrink-0 bg-white/20 rounded-full shadow-inner">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ccff00] opacity-60"></span>
                         <ShoppingCart className="w-5 h-5 text-[#ccff00]" />
                      </div>
                      <div className="flex flex-col items-center sm:items-start">
                         <span className="font-black text-lg tracking-wide text-white drop-shadow-sm flex items-center gap-2">
                            🚀 {evt.name} is Live!
                         </span>
                         <span className="text-emerald-100 text-sm font-bold uppercase tracking-widest opacity-90 mt-0.5 flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]"></span>
                            Fast Checkout Enabled
                         </span>
                      </div>
                   </div>
                   
                   <div className="relative z-10 w-full sm:w-auto mt-2 sm:mt-0">
                      <button 
                         onClick={(e) => { e.stopPropagation(); window.open('/dashboard/pos/' + evt.id, '_blank'); }} 
                         className="w-full sm:w-auto bg-[#ccff00] text-black hover:bg-[#b3e600] px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(204,255,0,0.4)] hover:shadow-[0_0_25px_rgba(204,255,0,0.7)] hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-[#ccff00]/50"
                      >
                         Launch POS
                      </button>
                   </div>
                </div>
             ))}
           </div>
         );
      })()}

      {/* ── CTA: Upcoming Event Registration ── */}
      <div className="mb-8 relative group cursor-pointer">
        <Link 
          to="/dashboard/events" 
          className="relative overflow-hidden w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white p-5 rounded-2xl shadow-[0_8px_30px_-4px_rgba(79,70,229,0.3)] transition-all duration-300 border border-indigo-400/30"
        >
          {/* Subtle background pattern/texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-4 w-4 relative items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)]"></span>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-[17px] tracking-wide text-white drop-shadow-sm flex items-center gap-2">
                📢 Upcoming Events
              </span>
              <span className="text-indigo-100 text-sm font-medium opacity-90 mt-0.5">
                {eventSubtext}
              </span>
            </div>
          </div>
          
          <div className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl backdrop-blur-sm transition-colors border border-white/10 shrink-0">
            <span className="text-sm font-bold uppercase tracking-wider">Register Now</span>
            <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* ── Rejection Notices ── */}
      {rejectedInvites.map((inv: any) => (
        <div key={inv.id} className="mb-8 relative group cursor-pointer">
          <Link 
            to="/dashboard/events" 
            className="relative overflow-hidden w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white p-5 rounded-2xl shadow-[0_8px_30px_-4px_rgba(220,38,38,0.3)] transition-all duration-300 border border-red-400/30"
          >
            {/* Subtle background pattern/texture */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"></div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 relative items-center justify-center shrink-0 bg-white/20 rounded-full shadow-inner">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-[17px] tracking-wide text-white drop-shadow-sm flex items-center gap-2">
                  Registration {inv.optInStatus === 'Declined' ? 'Declined' : 'Rejected'}: {inv.event?.name}
                </span>
                <span className="text-red-100 text-sm font-medium opacity-90 mt-0.5">
                  <span className="font-black uppercase tracking-wider text-[11px] opacity-75">Reason:</span> {inv.rejectionReason || 'No reason provided'}
                </span>
              </div>
            </div>
            
            <div className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl backdrop-blur-sm transition-colors border border-white/10 shrink-0">
              <span className="text-sm font-bold uppercase tracking-wider">Reapply Now</span>
              <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      ))}

      {/* ════ Pending Actions — Full Width Strip Above KPIs ════ */}
      <div className="bg-white rounded-2xl border border-paa-navy/5 shadow-sm px-6 py-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" aria-hidden="true" />
          <h3 className="text-base font-serif font-semibold text-paa-navy">Pending Actions</h3>
          {actionItems.length > 0 && actionItems[0].id !== 'act-none' && (
            <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5">{actionItems.length}</span>
          )}
        </div>
        {actionItems.length === 0 || actionItems[0].id === 'act-none' ? (
          <p className="text-sm text-paa-gray-text py-1">✓ All caught up — no pending actions.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => { if (item.link) navigate(item.link); }}
                  className={`group relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto ${item.bg} ${item.color.replace('text-', 'border-').replace('600', '200')}`}
                >
                  <Icon size={18} aria-hidden="true" className={item.color} />
                  <div className="leading-tight pr-2 flex-1 min-w-0">
                    <p className="text-sm font-bold text-wrap break-words">{item.text}</p>
                  </div>
                  <button
                    aria-label={`Dismiss ${item.text}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...dismissedActions, item.id];
                      setDismissedActions(next);
                      localStorage.setItem('paa_author_dismissed', JSON.stringify(next));
                    }}
                    className="ml-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div className="dash-kpi-card green">
          <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Event Participation</p>
          <h3 className="text-2xl font-bold text-paa-navy">{`${data?.authorProfile?.aggParticipatedEvents || 0}/${data?.authorProfile?.aggEligibleEvents || 0}`}</h3>
        </div>
        <div className="dash-kpi-card blue">
          <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Titles</p>
          <h3 className="text-2xl font-bold text-paa-navy">{authorBooks.length}</h3>
        </div>
        
        <div className="dash-kpi-card amber lg:col-span-2 flex flex-col justify-center">
          <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Sales</p>
          <div className="flex items-end gap-3 mb-2">
            <h3 className="text-2xl font-bold text-paa-navy leading-none">₹{grossSales.toFixed(0)}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <button onClick={() => navigate('/dashboard/orders')} className="text-[9px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 uppercase tracking-widest bg-blue-50/50 px-2.5 py-1 rounded-md transition-colors shadow-sm">
              Web Orders: ₹{webSalesAmount.toFixed(0)}
            </button>
            <button onClick={() => navigate('/dashboard/events')} className="text-[9px] font-bold text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-200 uppercase tracking-widest bg-amber-50/50 px-2.5 py-1 rounded-md transition-colors shadow-sm">
              Event/Fair Sales: ₹{posSalesAmount.toFixed(0)}
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/dashboard/payments')} className="dash-kpi-card red text-left cursor-pointer hover:shadow-md hover:border-red-200 transition-all relative group">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Fees Paid</p>
            <span className="text-red-400 bg-red-50 group-hover:bg-red-100 transition-colors p-1 rounded-full"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></span>
          </div>
          <h3 className="text-2xl font-bold text-paa-navy">₹{totalFeesPaid}</h3>
        </button>
      </div>


      {/* ── Library Donations KPI Cards ── */}
      {data?.activeDonations?.length > 0 || donationRegistrations.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-paa-navy">Library Donations Overview</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Pending Registrations', value: pendingRegistrations, colorClass: 'amber' },
              { label: 'Libraries Donated', value: uniqueLibraries, colorClass: 'teal' },
              { label: 'Books Donated', value: totalBooksDonated, colorClass: 'blue' },
            ].map((kpi, i) => (
              <div key={i} className={`dash-kpi-card ${kpi.colorClass}`}>
                <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-paa-navy">{kpi.value}</h3>
              </div>
            ))}
          </div>
        </div>
      ) : null}







      {/* ── Genre Filter Pills ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mr-1">Filter:</span>
        {['all', 'Fiction', 'Non-Fiction', 'Children', 'Poetry'].map(g => (
          <button key={g} onClick={() => setFilter(g)} className={`dash-pill ${filter === g ? 'active' : ''}`}>
            {g === 'all' ? 'All Genres' : g}
          </button>
        ))}
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditProfile && (
        <div className="dash-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowEditProfile(false)}>
          <div className="dash-modal !max-w-[95vw] !w-full">
            <div className="dash-modal-header">
              <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">Edit My Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text transition-colors">&#x2715;</button>
            </div>
            <div className="dash-modal-body">
              <h2 className="sr-only">Edit My Profile</h2>
              <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Full Name</label>
                    <input className="dash-input w-full" value={editProfileForm.name} onChange={e => setEditProfileForm({ ...editProfileForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Pen Name</label>
                    <input className="dash-input w-full" value={editProfileForm.penName} onChange={e => setEditProfileForm({ ...editProfileForm, penName: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Phone</label>
                    <input className="dash-input w-full" value={editProfileForm.phone} onChange={e => setEditProfileForm({ ...editProfileForm, phone: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">WhatsApp</label>
                    <input className="dash-input w-full" value={editProfileForm.whatsapp} onChange={e => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value.replace(/\D/g, '') })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Full Address</label>
                  <input className="dash-input w-full" value={editProfileForm.address} onChange={e => setEditProfileForm({ ...editProfileForm, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Pincode</label>
                  <input className="dash-input w-full" value={editProfileForm.pincode} onChange={e => setEditProfileForm({ ...editProfileForm, pincode: e.target.value.replace(/\D/g, '') })} maxLength={6} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">City</label>
                    <input className="dash-input w-full" value={editProfileForm.city} onChange={e => setEditProfileForm({ ...editProfileForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">State</label>
                    <input className="dash-input w-full" value={editProfileForm.state} onChange={e => setEditProfileForm({ ...editProfileForm, state: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Aadhar/Voter ID/DL</label>
                    <input className="dash-input w-full" value={editProfileForm.aadharNumber} onChange={e => setEditProfileForm({ ...editProfileForm, aadharNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Instagram</label>
                    <input className="dash-input w-full" value={editProfileForm.instagram} onChange={e => setEditProfileForm({ ...editProfileForm, instagram: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Facebook</label>
                    <input className="dash-input w-full" value={editProfileForm.facebook} onChange={e => setEditProfileForm({ ...editProfileForm, facebook: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">LinkedIn</label>
                    <input className="dash-input w-full" value={editProfileForm.linkedin} onChange={e => setEditProfileForm({ ...editProfileForm, linkedin: e.target.value })} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">Qualifications</label>
                  {(() => {
                    let qArr: any[] = [];
                    try { qArr = JSON.parse(editProfileForm.qualification || '[]'); } catch (e) { }
                    if (!Array.isArray(qArr)) qArr = [{ qualification: editProfileForm.qualification || '', institution: '', subject: '' }];
                    return (
                      <>
                        {qArr.map((q: any, i: number) => (
                          <div key={i} className="grid grid-cols-3 gap-2 mb-2 bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                            {qArr.length > 1 && (
                              <button type="button" onClick={() => {
                                const newQ = qArr.filter((_: any, idx: number) => idx !== i);
                                setEditProfileForm({ ...editProfileForm, qualification: JSON.stringify(newQ) });
                              }} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full border border-red-200 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">✕</button>
                            )}
                            <div>
                              <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Degree / Title</span>
                              <input type="text" className="dash-input w-full text-xs" value={q.qualification || ''} onChange={ev => {
                                const newQ = [...qArr]; newQ[i] = { ...newQ[i], qualification: ev.target.value };
                                setEditProfileForm({ ...editProfileForm, qualification: JSON.stringify(newQ) });
                              }} />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Institution</span>
                              <input type="text" className="dash-input w-full text-xs" value={q.institution || ''} onChange={ev => {
                                const newQ = [...qArr]; newQ[i] = { ...newQ[i], institution: ev.target.value };
                                setEditProfileForm({ ...editProfileForm, qualification: JSON.stringify(newQ) });
                              }} />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Subject</span>
                              <input type="text" className="dash-input w-full text-xs" value={q.subject || ''} onChange={ev => {
                                const newQ = [...qArr]; newQ[i] = { ...newQ[i], subject: ev.target.value };
                                setEditProfileForm({ ...editProfileForm, qualification: JSON.stringify(newQ) });
                              }} />
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const newQ = [...qArr, { qualification: '', institution: '', subject: '' }];
                          setEditProfileForm({ ...editProfileForm, qualification: JSON.stringify(newQ) });
                        }} className="text-[10px] font-bold text-paa-navy uppercase tracking-widest hover:text-paa-gold mt-1">+ Add Qualification</button>
                      </>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Date of Birth</label>
                    <input type="date" className="dash-input w-full" value={editProfileForm.age} onChange={e => setEditProfileForm({ ...editProfileForm, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Experience</label>
                    <input className="dash-input w-full" value={editProfileForm.experience} onChange={e => setEditProfileForm({ ...editProfileForm, experience: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Skills</label>
                    <input className="dash-input w-full" value={editProfileForm.skills} onChange={e => setEditProfileForm({ ...editProfileForm, skills: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Hobbies</label>
                    <input className="dash-input w-full" value={editProfileForm.hobbies} onChange={e => setEditProfileForm({ ...editProfileForm, hobbies: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Why did you join the group? (Published Authors)</label>
                  <textarea className="dash-input w-full resize-y" rows={2} value={editProfileForm.whyJoining} onChange={e => setEditProfileForm({ ...editProfileForm, whyJoining: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Author Bio (100-150 words)</label>
                  <textarea required className={`dash-input w-full ${(() => {
                    const c = editProfileForm.bio.split(/\s+/).filter(Boolean).length;
                    return (c > 0 && (c < 100 || c > 150)) ? '!border-red-500' : '';
                  })()}`} rows={5} value={editProfileForm.bio} onChange={e => setEditProfileForm({ ...editProfileForm, bio: e.target.value })} />
                  {(() => {
                    const count = editProfileForm.bio.split(/\s+/).filter(Boolean).length;
                    if (count > 0 && count < 100) return <div className="text-red-500 text-xs mt-1 font-medium">Bio must be at least 100 words.</div>;
                    if (count > 150) return <div className="text-red-500 text-xs mt-1 font-medium">Bio cannot exceed 150 words.</div>;
                    return null;
                  })()}
                  <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text mt-1 text-right">
                    {editProfileForm.bio.split(/\s+/).filter(Boolean).length} / 150 words (min 100)
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Update Profile Photo</label>
                  <input type="file" accept="image/*" className="border border-paa-navy/20 p-2 text-xs w-full rounded-lg" onChange={e => setEditPhoto(e.target.files?.[0] || null)} />
                </div>
                <div className="flex justify-end gap-2 mt-4 border-t pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setShowEditProfile(false)} className="dash-btn dash-btn-ghost">Cancel</button>
                  <button type="submit" disabled={buttonStates.editProfile} className="dash-btn dash-btn-primary disabled:opacity-50">{buttonStates.editProfile ? 'Saving...' : 'Save & Submit for Review'}</button>
                </div>
              </form>
</FocusTrap>
            </div>
          </div>
        </div>
      )}

      {editCoverBookId !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setEditCoverBookId(null)}>
          <div className="dash-modal" style={{ maxWidth: 400 }}>
            <div className="dash-modal-header">
              <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">Update Book Cover</h3>
              <button onClick={() => { setEditCoverBookId(null); setNewCoverFile(null); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text transition-colors">&#x2715;</button>
            </div>
            <div className="dash-modal-body flex flex-col gap-4">
              <label className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text">Select New Cover Image</label>
              <input type="file" accept="image/*" className="dash-input text-xs" onChange={e => setNewCoverFile(e.target.files?.[0] || null)} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setEditCoverBookId(null); setNewCoverFile(null); }} className="dash-btn dash-btn-ghost">Cancel</button>
                <button onClick={() => handleUpdateCover(editCoverBookId)} disabled={buttonStates.updateCover} className="dash-btn dash-btn-primary disabled:opacity-50">{buttonStates.updateCover ? 'Uploading...' : 'Upload Cover'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddBook && (
        <div className="absolute inset-0 z-50 bg-white p-6 md:p-8 overflow-y-auto animate-fade-in-up">
          <div className="flex justify-between items-center mb-6 border-b border-paa-navy/5 pb-4">
            <div>
              <h2 className="text-2xl font-serif text-paa-navy tracking-tight">Add New Title</h2>
              <p className="text-sm text-paa-gray-text mt-1">Register a new book to the platform.</p>
            </div>
            <button type="button" onClick={() => setShowAddBook(false)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-paa-gray-text hover:text-paa-navy transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleAddBook} className="flex flex-col gap-6 max-w-4xl">

            {/* Book Title & Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="dash-label">Book Title *</label>
                <input required className="dash-input w-full" placeholder="e.g. The Forgotten Horizon" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Subtitle</label>
                <input className="dash-input w-full" placeholder="e.g. A Journey Through Time" value={newBook.subtitle} onChange={e => setNewBook({ ...newBook, subtitle: e.target.value })} />
              </div>
            </div>

            {/* Category, Subcategory, Specific Genre */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="dash-label">Category *</label>
                <select required className="dash-input w-full" value={newBook.genre} onChange={e => setNewBook({ ...newBook, genre: e.target.value, subcategory: '', subSubcategory: '' })}>
                  <option value="">Select Category</option>
                  {Object.keys(bookCategories).sort((a, b) => a.localeCompare(b)).map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              {newBook.genre && Object.keys(bookCategories[newBook.genre as keyof typeof bookCategories] || {}).length > 0 && (
                <div>
                  <label className="dash-label">Subcategory</label>
                  <select className="dash-input w-full" value={newBook.subcategory} onChange={e => setNewBook({ ...newBook, subcategory: e.target.value, subSubcategory: '' })}>
                    <option value="">Select Subcategory</option>
                    {Object.keys(bookCategories[newBook.genre as keyof typeof bookCategories] || {}).sort((a, b) => a.localeCompare(b)).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
              )}
              {newBook.genre && newBook.subcategory && ((bookCategories[newBook.genre as keyof typeof bookCategories] as any)[newBook.subcategory] || []).length > 0 && (
                <div>
                  <label className="dash-label">Specific Genre</label>
                  <select className="dash-input w-full" value={newBook.subSubcategory} onChange={e => setNewBook({ ...newBook, subSubcategory: e.target.value })}>
                    <option value="">Select Specific Genre</option>
                    {[...((bookCategories[newBook.genre as keyof typeof bookCategories] as any)[newBook.subcategory] || [])].sort((a, b) => a.localeCompare(b)).map((ssc: string) => <option key={ssc} value={ssc}>{ssc}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div>
              <label className="dash-label">Synopsis (100 words) *</label>
              <textarea
                required
                placeholder="A compelling description of your book — what it's about, who it's for, and what makes it unique..."
                value={newBook.synopsis}
                onChange={(e) => setNewBook({ ...newBook, synopsis: e.target.value })}
                rows={5}
                className={`dash-input w-full resize-y ${newBook.synopsis.split(/\s+/).filter(Boolean).length > 100 ? '!border-red-500' : ''}`}
              />
              <div className="flex justify-between items-start mt-1">
                {newBook.synopsis.split(/\s+/).filter(Boolean).length > 100 ? <div className="text-red-500 text-xs font-medium">Synopsis cannot exceed 100 words.</div> : <div></div>}
                <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">
                  {newBook.synopsis.split(/\s+/).filter(Boolean).length} / 100 words
                </div>
              </div>
            </div>

            {/* Language, Publisher, Publication Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="dash-label">Language *</label>
                <select required value={newBook.language} onChange={(e) => setNewBook({ ...newBook, language: e.target.value })} className="dash-input w-full">
                  <option value="">Select Language</option>
                  {languages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="dash-label flex items-center justify-between">
                  Publisher Name *
                  <label className="flex items-center gap-1.5 text-xs font-normal cursor-pointer lowercase text-gray-500"><input type="checkbox" checked={newBook.isSelfPublished === 'yes'} onChange={(e) => { setNewBook({ ...newBook, isSelfPublished: e.target.checked ? 'yes' : 'no', publisher: e.target.checked ? 'Self Published' : '' }); }} className="w-3 h-3"/> I am Self Published</label>
                </label>
                <input required type="text" placeholder="e.g. Penguin" value={newBook.publisher} onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} className="dash-input w-full" disabled={newBook.isSelfPublished === 'yes'} />
              </div>
              <div>
                <label className="dash-label">Publication Date *</label>
                <input required type="date" max={new Date().toISOString().split('T')[0]} value={newBook.publicationDate} onChange={(e) => setNewBook({ ...newBook, publicationDate: e.target.value })} className="dash-input w-full" />
              </div>
            </div>

            {/* ISBN, Edition, Format */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="dash-label">ISBN Number *</label>
                <input required type="text" inputMode="numeric" placeholder="10 or 13 digit ISBN" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value.replace(/\D/g, '') })} maxLength={13} className="dash-input w-full" />
              </div>
              <div>
                <label className="dash-label">Edition</label>
                <input type="text" inputMode="numeric" placeholder="e.g. 1" value={newBook.edition} onChange={(e) => setNewBook({ ...newBook, edition: e.target.value.replace(/\D/g, '') })} className="dash-input w-full" />
              </div>
              <div>
                <label className="dash-label">Book Format *</label>
                <select required className="dash-input w-full" value={newBook.format} onChange={e => setNewBook({ ...newBook, format: e.target.value })}>
                  <option value="">Select Format</option>
                  <option value="Paperback">Paperback</option>
                  <option value="Hardcover">Hardcover</option>
                  <option value="Ebook">Ebook</option>
                </select>
              </div>
              <div>
                <label className="dash-label">Print Format *</label>
                <select required className="dash-input w-full" value={(newBook as any).printFormat || ''} onChange={e => setNewBook({ ...newBook, printFormat: e.target.value })}>
                  <option value="">Select Print Format</option>
                  <option value="Black & White">Black & White</option>
                  <option value="Colored">Colored</option>
                </select>
              </div>
            </div>

            {/* Purpose of Writing */}
            <div>
              <label className="dash-label">Write the purpose of writing the book *</label>
              <textarea required value={(newBook as any).purpose || ''} onChange={(e) => setNewBook({ ...newBook, purpose: e.target.value })} rows={3} className="dash-input w-full resize-y" placeholder="What inspired you to write?" />
            </div>

            {/* Pages, MRP, Initial Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="dash-label">Number of Pages *</label>
                <input required type="text" inputMode="numeric" placeholder="256" value={newBook.pages} onChange={(e) => setNewBook({ ...newBook, pages: e.target.value.replace(/\D/g, '') })} className="dash-input w-full" />
              </div>
              <div>
                <label className="dash-label">MRP (₹) *</label>
                <input required type="number" onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="299" value={newBook.mrp} onChange={(e) => setNewBook({ ...newBook, mrp: e.target.value })} className="dash-input w-full" />
              </div>
              <div>
                <label className="dash-label">Initial Stock *</label>
                <input required type="number" onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0" value={newBook.stock} onChange={(e) => setNewBook({ ...newBook, stock: e.target.value })} className="dash-input w-full" />
              </div>
            </div>

            {(() => {
               const pages = Number(newBook.pages);
               const mrp = Number(newBook.mrp);
               if (pages > 0 && newBook.printFormat && mrp > 0) {
                  const rate = newBook.printFormat === 'Colored' ? 2.40 : 0.50;
                  const maxPrice = (pages * rate) + 250;
                  if (mrp > maxPrice) {
                     return <div className="text-yellow-700 text-xs font-bold bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-2 mb-4">Warning: Your MRP (₹{mrp}) exceeds the recommended max price of ₹{maxPrice} based on your pages and format.</div>;
                  }
               }
               return null;
            })()}

            {/* Cover upload */}
            <div className="pt-2">
              <label className="dash-label">Book Cover Upload *</label>
              <div
                className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center"
                onClick={() => document.getElementById("cover-upload")?.click()}
              >
                {coverFileUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={coverFileUrl} alt="cover preview" className="h-24 object-contain rounded shadow-sm border border-paa-navy/10 bg-white" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Cover Uploaded</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-paa-navy/40 mb-3" />
                    <div className="text-sm font-medium text-paa-navy mb-1">Upload Book Cover</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">High resolution JPG or PNG, ideally 1600×2400px</div>
                  </>
                )}
              </div>
              <input
                required={!cover}
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCover(file);
                    setCoverFileUrl(URL.createObjectURL(file));
                  }
                }}
              />
            </div>

            {/* Back Cover upload */}
            <div className="pt-2">
              <label className="dash-label">Book Back Cover Upload *</label>
              <div
                className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center"
                onClick={() => document.getElementById("back-cover-upload")?.click()}
              >
                {backCoverFileUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={backCoverFileUrl} alt="back cover preview" className="h-24 object-contain rounded shadow-sm border border-paa-navy/10 bg-white" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Back Cover Uploaded</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-paa-navy/40 mb-3" />
                    <div className="text-sm font-medium text-paa-navy mb-1">Upload Book Back Cover</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">High resolution JPG or PNG, ideally 1600×2400px</div>
                  </>
                )}
              </div>
              <input
                required={!backCover}
                id="back-cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBackCover(file);
                    setBackCoverFileUrl(URL.createObjectURL(file));
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t mt-4">
              <button type="button" onClick={() => setShowAddBook(false)} className="dash-btn dash-btn-ghost">Cancel</button>
              <button type="button" onClick={(e) => { const f = e.currentTarget.closest('form'); if (f && f.checkValidity()) { handleAddBook(null, true); } else if (f) { f.reportValidity(); } }} className="dash-btn dash-btn-ghost">Save &amp; Add Another</button>
              <button type="submit" disabled={buttonStates.addBook} className="dash-btn dash-btn-primary disabled:opacity-50 px-8">{buttonStates.addBook ? 'Adding...' : 'Add Book'}</button>
            </div>
          </form>
</FocusTrap>
        </div>
      )}


      {/* ── Books Table ── */}
      <div className="dash-panel overflow-hidden mb-7">
        <div className="dash-panel-header">
          <h2 className="dash-panel-title">Your Titles</h2>
          <div className="flex items-center gap-4">
            <span className="dash-badge info">{filteredTitles.length} titles</span>
            <button onClick={() => setShowAddBook(true)} className="dash-btn dash-btn-primary py-1 px-3 text-xs">Add new Book</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="dash-table">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100"><tr>
              <th className="!text-[14px] !text-indigo-800 !bg-transparent">#</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Cover</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Title</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Status</th>
              <th className="!text-[14px] !text-indigo-800 !bg-transparent">Genre</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">MRP</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Current Stock</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Sold Details</th><th className="!text-[14px] !text-indigo-800 !bg-transparent">Listing Date</th><th className="text-center !text-[14px] !text-indigo-800 !bg-transparent">Actions</th>
            </tr></thead>
            <tbody>
              {filteredTitles.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-paa-gray-text italic text-sm">No titles for this filter.</td></tr>
              ) : filteredTitles.map((row: any, idx: number) => (
                <tr key={row.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} `}>
                  <td className="text-paa-gray-text text-xs text-center">{idx + 1}</td>
                  <td>{authorBooks.find((b: any) => b.id === row.id)?.coverUrl
                    ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${authorBooks.find((b: any) => b.id === row.id)?.coverUrl}${authorBooks.find((b: any) => b.id === row.id)?.updatedAt ? `?t=${new Date(authorBooks.find((b: any) => b.id === row.id).updatedAt).getTime()}` : ''}`} alt="cover" className="w-9 h-12 object-cover rounded-lg shadow-sm" />
                    : <div className="w-9 h-12 bg-gray-100 rounded-lg border flex items-center justify-center text-[9px] text-gray-400">No cover</div>}
                  </td>
                  <td className="font-semibold text-paa-navy">
                    {row.title}
                    {(() => {
                      const bk = authorBooks.find((b: any) => b.id === row.id);
                      const avgRating = bk?.reviews?.length ? (bk.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / bk.reviews.length) : null;
                      if (avgRating) {
                        const roundedRating = Math.round(avgRating);
                        return (
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={star <= roundedRating ? "text-amber-500 fill-amber-500" : "text-gray-300"}
                              />
                            ))}
                            <span className="text-[10px] text-amber-600 font-bold ml-1">
                              ({avgRating.toFixed(1)})
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td><span className={`dash-badge ${row.status === 'Approved' ? 'approved' : row.status === 'Rejected' ? 'rejected' : 'pending'}`}>{row.status}</span>
                    {row.status === 'Rejected' && row.rejectionReason && <div className="mt-1 text-[10px] text-red-600">{row.rejectionReason}</div>}
                  </td>
                  <td className="text-paa-gray-text text-xs">{row.genre}</td>
                  <td className="font-semibold">{row.mrp}</td>
                  <td><span className={`font-bold ${row.stock < 10 ? 'text-red-500' : 'text-paa-navy'}`}>{row.stock}</span>{row.stock < 10 && <div className="text-[9px] text-red-400 font-bold">LOW</div>}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-emerald-700 text-sm">{row.sold.total} Total</span>
                      <span className="text-[10px] text-paa-gray-text font-bold uppercase tracking-widest">{row.sold.events} Events | {row.sold.web} Web</span>
                    </div>
                  </td>
                  <td className="text-paa-gray-text text-xs whitespace-nowrap">{row.date}</td>
                  <td>
                    <div className="flex items-center justify-center">
                      <button onClick={() => navigate('/dashboard/profile', { state: { action: 'edit_book', bookId: row.id } })} className="p-2 text-paa-navy hover:text-paa-gold bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" title="Edit Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── Charts Grid (2x2 Grid) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in-up">
        
        {/* Chart 1: Books (Books Sold per Title) */}
        <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">Books Sold per Title</h3>
          </div>
          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99,102,241,0.03)' }} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                    formatter={(value: any, name: any, props: any) => [`${value} copies`, props.payload?.fullTitle || props.name]}
                  />
                  <Bar dataKey="sold" fill="url(#colorBooks)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Title Web Orders (Web Orders Distribution) */}
        <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">Title Web Orders Distribution</h3>
          </div>
          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {webOrdersPieData.length > 0 ? (
                  <PieChart>
                    <Pie 
                      data={webOrdersPieData} 
                      cx="50%" cy="50%" 
                      innerRadius={55} outerRadius={80} 
                      paddingAngle={3} dataKey="value"
                    >
                      {webOrdersPieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: any, props: any) => [`${value} web orders`, props.payload?.fullTitle || props.name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  </PieChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400 italic">No web orders yet.</div>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 3: Distribution Activity */}
        <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">Distribution Activity Breakdown</h3>
          </div>
          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                    formatter={(value: any, name: any, props: any) => [`${value} copies`, `${name} (${props.payload?.fullTitle || props.name})`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Web Sold" stackId="dist" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Airport Qty" stackId="dist" fill="#0284c7" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Book Fair Qty" stackId="dist" fill="#9333ea" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 4: Participations */}
        <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">Ecosystem Activity Participation</h3>
          </div>
          <div className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={participationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: '#C0A062', strokeWidth: 1, strokeDasharray: '3 3' }} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                  />
                  <Line type="linear" dataKey="count" name="Participations" stroke="#C0A062" strokeWidth={3} dot={{ r: 4, fill: "#fff", stroke: "#C0A062", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* ── Edit Book Modal (Reapply) ── */}
      {editingBook && (
        <div className="absolute inset-0 z-50 bg-white p-6 md:p-8 overflow-y-auto animate-fade-in-up">
          <div className="flex justify-between items-center mb-6 border-b border-paa-navy/5 pb-4">
            <div>
              <h2 className="text-2xl font-serif text-paa-navy tracking-tight">Edit Book Details & Reapply</h2>
              <p className="text-sm text-paa-gray-text mt-1">Update your book information below.</p>
            </div>
            <button type="button" onClick={() => setEditingBook(null)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-paa-gray-text hover:text-paa-navy transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleEditBookSubmit} className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <label className="dash-label mb-1">Update Book Cover (Optional)</label>
                  <p className="text-[10px] text-paa-gray-text">Upload a new image to replace the current cover.</p>
                </div>
                <input type="file" accept="image/*" className="dash-input bg-white w-64 text-xs" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewCoverFile(e.target.files[0]);
                  }
                }} />
              </div>
              <div>
                <label className="dash-label">Title</label>
                <input required type="text" className="dash-input" value={editingBook.title} onChange={e => setEditingBook({ ...editingBook, title: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Subtitle (Optional)</label>
                <input type="text" className="dash-input" value={editingBook.subtitle} onChange={e => setEditingBook({ ...editingBook, subtitle: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Genre</label>
                <select required className="dash-input" value={editingBook.genre} onChange={e => setEditingBook({ ...editingBook, genre: e.target.value })}>
                  <option value="">Select Genre</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Poetry">Poetry</option>
                  <option value="Children">Children</option>
                  <option value="Academic">Academic</option>
                </select>
              </div>
              <div>
                <label className="dash-label">Sub-Genre</label>
                <input type="text" className="dash-input" value={editingBook.subGenre} onChange={e => setEditingBook({ ...editingBook, subGenre: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Pages *</label>
                <input required type="number" className="dash-input" value={editingBook.pages} onChange={e => setEditingBook({ ...editingBook, pages: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">MRP (₹)</label>
                <input required type="number" className="dash-input" value={editingBook.mrp} onChange={e => setEditingBook({ ...editingBook, mrp: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Initial Stock</label>
                <input required type="number" className="dash-input" value={editingBook.stock} onChange={e => setEditingBook({ ...editingBook, stock: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Language *</label>
                <select required className="dash-input" value={editingBook.language} onChange={e => setEditingBook({ ...editingBook, language: e.target.value })}>
                  <option value="">Select Language</option>
                  <option value="ENG">ENG</option>
                  <option value="MAR">MAR</option>
                  <option value="HIN">HIN</option>
                </select>
              </div>
              <div>
                <label className="dash-label">ISBN *</label>
                <input required type="text" className="dash-input" value={editingBook.isbn} onChange={e => setEditingBook({ ...editingBook, isbn: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Publisher</label>
                <input type="text" className="dash-input" value={editingBook.publisher} onChange={e => setEditingBook({ ...editingBook, publisher: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Publication Date</label>
                <input type="date" className="dash-input" value={editingBook.publicationDate} onChange={e => setEditingBook({ ...editingBook, publicationDate: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Edition</label>
                <input type="text" className="dash-input" value={editingBook.edition} onChange={e => setEditingBook({ ...editingBook, edition: e.target.value })} />
              </div>
              <div>
                <label className="dash-label">Format *</label>
                <select required className="dash-input" value={editingBook.format} onChange={e => setEditingBook({ ...editingBook, format: e.target.value })}>
                  <option value="">Select Format</option>
                  <option value="Paperback">Paperback</option>
                  <option value="Hardcover">Hardcover</option>
                  <option value="Ebook">Ebook</option>
                </select>
              </div>
              <div>
                <label className="dash-label">Print Format *</label>
                <select required className="dash-input" value={editingBook.printFormat || ''} onChange={e => setEditingBook({ ...editingBook, printFormat: e.target.value })}>
                  <option value="">Select Format</option>
                  <option value="Black & White">Black & White (₹1/page)</option>
                  <option value="Colored">Colored (₹3/page)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="dash-label">Synopsis (Max 100 words) *</label>
              <textarea required className={`dash-input ${editingBook.synopsis.split(/\s+/).filter(Boolean).length > 100 ? '!border-red-500' : ''}`} rows={4} value={editingBook.synopsis} onChange={e => setEditingBook({ ...editingBook, synopsis: e.target.value })}></textarea>
              {editingBook.synopsis.split(/\s+/).filter(Boolean).length > 100 && (
                <div className="text-red-500 text-xs mt-1 font-medium">Synopsis cannot exceed 100 words.</div>
              )}
              <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text mt-1 text-right">
                {editingBook.synopsis.split(/\s+/).filter(Boolean).length} / 100 words
              </div>
            </div>
            {(() => {
              const pages = Number(editingBook.pages);
              const mrp = Number(editingBook.mrp);
              const isColored = editingBook.printFormat === 'Colored';
              const rate = isColored ? 2.40 : 0.50;
              const maxPrice = (pages * rate) + 250;
              if (pages > 0 && mrp > maxPrice) {
                return <div className="text-yellow-700 text-xs font-bold bg-yellow-50 p-2 rounded border border-yellow-200 mt-3">Warning: Your MRP (₹{mrp}) exceeds the recommended max price of ₹{maxPrice} based on your pages and format.</div>;
              }
              return null;
            })()}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <button type="button" onClick={() => setEditingBook(null)} className="dash-btn dash-btn-ghost">Cancel</button>
              <button type="submit" disabled={buttonStates.updateBook} className="dash-btn dash-btn-primary bg-paa-gold hover:bg-yellow-500 text-paa-navy px-8 disabled:opacity-50">
                {buttonStates.updateBook ? 'Submitting...' : 'Submit & Reapply'}
              </button>
            </div>
          </form>
</FocusTrap>
        </div>
      )}
    </div>
  );
}

function InventoryPage({ onRefresh, dashboardData }: { onRefresh: () => void, dashboardData: any }) {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = () => localStorage.getItem('token');

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [newStocks, setNewStocks] = useState<{ [key: number]: string }>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [showStockHistory, setShowStockHistory] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/author/inventory`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setInventory(res.data);
      // Keep selected book in sync after refresh
      if (selectedBook) {
        const updated = res.data.find((b: any) => b.id === selectedBook.id);
        if (updated) setSelectedBook(updated);
      }
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');
    
    // Add title row
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'AUTHOR INVENTORY EXPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } }; // Cyan
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add headers
    const headers = ['S.No', 'Title', 'Author', 'MRP', 'QTY Sold (Web)', 'QTY to Airport', 'QTY for Book Fair', 'Current Stock'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    inventory.forEach((b, i) => {
      const addedRow = sheet.addRow([
        i + 1,
        b.title,
        b.authorName,
        b.mrp || 0,
        b.webSold || 0,
        b.airportQty || 0,
        b.eventQty || 0,
        b.currentStock || 0
      ]);
      addedRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
        let colBgColor = 'FFFFFF';
        if (colNumber === 1 || colNumber === 2) colBgColor = 'FF8B8B'; // Red
        else if (colNumber === 3) colBgColor = 'FFD2A3'; // Orange
        else if (colNumber === 4 || colNumber === 5) colBgColor = 'D4D8DD'; // Gray
        else if (colNumber === 6) colBgColor = 'B3E5FC'; // Cyan
        else if (colNumber === 7) colBgColor = 'DDA0DD'; // Lavender
        else if (colNumber === 8) colBgColor = 'C8E6C9'; // Green
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        if (cell.value) {
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(maxLen + 2, 40);
    });

    // Apply borders
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Author_Inventory.xlsx');
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleUpdateStock = async (bookId: number) => {
    const addQty = parseInt(newStocks[bookId] || '0');
    if (!addQty || isNaN(addQty)) return toast.error('Please enter a non-zero value (+/- quantity)');
    setUpdatingId(bookId);
    try {
      const response = await axios.put(`${API}/api/author/books/${bookId}/stock`,
        { addQty },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (response.data?.pending) {
        toast.success(`Update of ${addQty > 0 ? '+' : ''}${addQty} copies submitted for admin approval`);
      } else {
        toast.success(addQty > 0 ? `Added ${addQty} copies to inventory` : `Removed ${Math.abs(addQty)} copies from inventory`);
      }
      setNewStocks(prev => ({ ...prev, [bookId]: '' }));
      await fetchInventory();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRowClick = (book: any) => {
    setSelectedBook(book);
    setSidebarVisible(true);
  };

  // Stat card totals
  const totalWebSold = inventory.reduce((s, b) => s + (b.webSold || 0), 0);
  const totalAirport = inventory.reduce((s, b) => s + (b.airportQty || 0), 0);
  const totalEvent = inventory.reduce((s, b) => s + (b.eventQty || 0), 0);
  const lowStockCount = inventory.filter(b => b.isLowStock).length;

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '1px solid rgba(26,26,46,0.05)', paddingBottom: 16 }}>
          <div>
            <div style={{ height: 28, width: 260, background: '#e5e7eb', borderRadius: 6, marginBottom: 8 }} className="dash-skeleton" />
            <div style={{ height: 14, width: 340, background: '#e5e7eb', borderRadius: 4 }} className="dash-skeleton" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 88, borderRadius: 12, background: '#e5e7eb' }} className="dash-skeleton" />)}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: '0 0 65%', height: 360, borderRadius: 12, background: '#e5e7eb' }} className="dash-skeleton" />
          <div style={{ flex: '0 0 35%', height: 360, borderRadius: 12, background: '#e5e7eb' }} className="dash-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '100%', boxSizing: 'border-box' }}>

      {/* Page Header */}
      <div className="flex justify-between items-start border-b border-black/5 pb-4">
        <div>
          <h2 className="text-[22px] font-serif font-bold text-paa-navy m-0 tracking-tight">
            Inventory &amp; Distribution
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-0">
            Track web orders, airport library donations, and book fair allocations.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={inventory.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 bg-white text-paa-navy border border-black/10 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${inventory.length === 0 ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}`}
          >
            Export Excel
          </button>
          <button
            onClick={fetchInventory}
            className="flex items-center gap-1.5 px-4 py-2 bg-paa-navy text-white border-none rounded-lg text-xs font-bold tracking-widest uppercase cursor-pointer hover:bg-[#0c1e30] transition-colors"
          >
            <Loader2 size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Titles', value: inventory.length, icon: <BookOpen size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'QTY Sold (Web)', value: totalWebSold, icon: <ShoppingCart size={18} />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'QTY to Airport', value: totalAirport, icon: <MapPin size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'QTY to Book Fairs', value: totalEvent, icon: <CalendarIcon size={18} />, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
              <p className="text-2xl font-black text-paa-navy leading-none m-0">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {inventory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Chart 1: Current Stock Split */}
          <div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Current Stock Split</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventory.map(b => ({ name: b.title.length > 14 ? b.title.substring(0, 14) + '…' : b.title, value: b.currentStock, fullTitle: b.title }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {inventory.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#ef4444','#22c55e','#f59e0b','#a855f7','#06b6d4','#eab308','#ec4899','#3b82f6','#84cc16','#f97316'][index % 10]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, _: any, props: any) => [`${value} copies`, props.payload?.fullTitle || props.name]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(26,26,46,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 border-t pt-3 max-h-[80px] overflow-y-auto">
              {inventory.map((b: any, i: number) => (
                <div key={b.id} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ['#ef4444','#22c55e','#f59e0b','#a855f7','#06b6d4','#eab308','#ec4899','#3b82f6','#84cc16','#f97316'][i % 10] }} />
                  <span className="text-gray-500 truncate max-w-[120px]" title={b.title}>{b.title}</span>
                  <span className="font-bold text-paa-navy ml-1">{b.currentStock}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Distribution Split */}
          <div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Distribution Channel Split</p>
              <div className="h-[200px]">
                {totalWebSold === 0 && totalAirport === 0 && totalEvent === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">
                    No distribution records yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Web Orders', value: totalWebSold },
                          { name: 'Airport Library', value: totalAirport },
                          { name: 'Book Fairs', value: totalEvent }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { name: 'Web Orders', color: '#16a34a' },
                          { name: 'Airport Library', color: '#06b6d4' },
                          { name: 'Book Fairs', color: '#ec4899' }
                        ].filter(item => (item.name === 'Web Orders' ? totalWebSold : item.name === 'Airport Library' ? totalAirport : totalEvent) > 0).map((item, index) => (
                          <Cell key={`cell-${index}`} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [`${value} copies`]}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(26,26,46,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-3 border-t pt-3">
              {[
                { name: 'Web Orders', value: totalWebSold, color: '#16a34a' },
                { name: 'Airport Library', value: totalAirport, color: '#06b6d4' },
                { name: 'Book Fairs', value: totalEvent, color: '#ec4899' }
              ].map(item => (
                <div key={item.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-500">{item.name}</span>
                  <span className="font-bold text-paa-navy ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800 m-0">
            <strong>{lowStockCount} title{lowStockCount > 1 ? 's' : ''}</strong> {lowStockCount > 1 ? 'are' : 'is'} running low (below 10 copies). Update stock immediately to avoid order disruptions.
          </p>
        </div>
      )}

      {/* Flex Layout for Table and Sidebar */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 0 }}>

        {/* LEFT — Main Table */}
        <div className="bg-white border border-black/5 rounded-[14px] shadow-sm overflow-hidden flex-1 min-w-0">
          <div className="overflow-x-auto">
            <table className="dash-table w-full text-left">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  {['S.No', 'Title', 'Author', 'MRP', 'Web Qty', 'Airport Qty', 'Fair Qty', 'Stock', 'Updated', 'Logs', 'Update'].map(h => (
                    <th key={h} className={`px-2 py-2 !text-[11px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent border-b border-paa-navy/5 whitespace-nowrap ${h === 'Title' || h === 'Author' ? 'text-left' : 'text-center'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400 text-sm italic">
                      No books in your inventory yet. Add books from your Overview tab.
                    </td>
                  </tr>
                ) : inventory.map((book, idx) => {
                  const isSelected = selectedBook?.id === book.id;
                  return (
                    <React.Fragment key={book.id}>
                      <tr
                        onClick={() => handleRowClick(book)}
                        className={`cursor-pointer transition-colors  border-b border-black/5 ${isSelected ? 'bg-blue-300 ring-2 ring-blue-500 ring-inset' : idx % 2 === 0 ? 'bg-white' : 'bg-white'}`}
                      >
                      {/* S.No */}
                      <td className="px-2 py-2 text-center text-sm font-bold text-gray-500">{idx + 1}</td>
                      {/* Title */}
                      <td className="px-2 py-2 max-w-[140px]">
                        <p className="font-bold text-paa-navy m-0 truncate" title={book.title}>{book.title}</p>
                        <p className="text-[9px] text-gray-400 m-0 uppercase tracking-widest mt-1 truncate">{book.genre}</p>
                      </td>
                      {/* Author */}
                      <td className="px-2 py-2 text-xs font-medium text-gray-700 whitespace-nowrap truncate max-w-[100px]">{book.authorName}</td>
                      {/* MRP */}
                      <td className="px-2 py-2 text-center text-sm font-bold text-paa-navy">₹{book.mrp}</td>
                      {/* QTY Web */}
                      <td className="px-2 py-2 text-center">
                        <span className="font-bold text-green-600 text-sm">{book.webSold}</span>
                      </td>
                      {/* QTY Airport */}
                      <td className="px-2 py-2 text-center">
                        <span className="font-bold text-sky-600 text-sm">{book.airportQty}</span>
                      </td>
                      {/* QTY Book Fair */}
                      <td className="px-2 py-2 text-center">
                        <span className="font-bold text-purple-600 text-sm">{book.eventQty}</span>
                      </td>
                      {/* Current Stock */}
                      <td className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-bold text-sm ${book.isLowStock ? 'text-red-600' : 'text-paa-navy'}`}>
                            {book.currentStock}
                          </span>
                          {book.isLowStock && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 animate-pulse flex items-center gap-1">
                              <AlertCircle size={10} /> LOW STOCK
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Last Updated */}
                      <td className="px-2 py-2 text-center text-gray-500 text-[10px]">
                        <span>
                          {book.lastActivity ? new Date(book.lastActivity).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </td>
                      {/* Logs Column */}
                      <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                        {book.stockHistory && book.stockHistory.length > 0 && (
                          <button
                            onClick={() => setActiveHistoryId(activeHistoryId === book.id ? null : book.id)}
                            className="flex items-center justify-center p-1.5 text-blue-500 hover:text-white border border-blue-200 bg-blue-50 hover:bg-blue-500/85 rounded-full transition-colors shadow-sm cursor-pointer mx-auto"
                            title="View Stock Logs"
                          >
                            <ChevronDown size={14} strokeWidth={3} className={`transform transition-transform duration-300 ${activeHistoryId === book.id ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </td>
                      {/* Update Stock */}
                      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`stock-input-${book.id}`}
                            type="number"
                            placeholder="+/- Qty"
                            title="Enter a positive number to add stock, or a negative number to remove stock"
                            value={newStocks[book.id] || ''}
                            onChange={e => setNewStocks(prev => ({ ...prev, [book.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleUpdateStock(book.id); }}
                            className="w-[50px] px-1 py-1 border border-black/10 rounded-md text-xs text-center outline-none bg-white text-paa-navy"
                          />
                          <button
                            id={`stock-update-btn-${book.id}`}
                            onClick={() => handleUpdateStock(book.id)}
                            disabled={!newStocks[book.id] || updatingId === book.id}
                            className={`px-1.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${newStocks[book.id] ? (parseInt(newStocks[book.id] || '0') < 0 ? 'bg-red-600 text-white' : 'bg-paa-navy text-white cursor-pointer') : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          >
                            {updatingId === book.id ? '...' : (parseInt(newStocks[book.id] || '0') < 0 ? 'Remove' : 'Add')}
                          </button>
                        </div>
                      </td>
                      </tr>
                      {activeHistoryId === book.id && (
                        <tr>
                          <td colSpan={11} className="p-0 border-b border-black/5">
                            <div className="bg-slate-50 p-6 shadow-inner">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-200 pb-2">Stock Changes Log</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(book.stockHistory || []).map((log: any) => (
                                  <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-sm">
                                    <div className="flex justify-between items-center text-slate-400 font-semibold mb-2">
                                      <span>{new Date(log.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                      <span className={`text-lg font-black ${log.changeQty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600">
                                      <span className="font-medium">Status: <span className={`font-bold ${log.status === 'Pending' ? 'text-amber-500' : log.status === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>{log.status || 'Approved'}</span></span>
                                      {log.status !== 'Pending' && <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Total: {log.currentStock}</span>}
                                    </div>
                                  </div>
                                ))}
                                {(!book.stockHistory || book.stockHistory.length === 0) && (
                                  <div className="text-slate-400 italic">No logs available for this book.</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — Distribution Breakdown Sidebar */}
        {selectedBook && (
          <div className="shrink-0 w-[320px] min-w-0 bg-white border border-paa-navy/5 rounded-xl shadow-sm overflow-hidden animate-fade-in-right">
            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-0.5">Distribution Breakdown</p>
                <p className="text-sm font-bold text-paa-navy m-0 truncate max-w-[220px]" title={selectedBook.title}>
                  {selectedBook.title}
                </p>
              </div>
              <button onClick={() => { setSelectedBook(null); setSidebarVisible(false); }} className="bg-transparent border-none cursor-pointer text-gray-400 p-1 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="p-5">
              {/* Book meta */}
              <div className="bg-indigo-50/30 rounded-xl p-3.5 mb-4 border border-indigo-100">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Current Stock', value: selectedBook.currentStock, color: selectedBook.isLowStock ? 'text-red-600' : 'text-green-600' },
                    { label: 'Web Sold', value: selectedBook.webSold, color: 'text-green-600' },
                    { label: 'Airport Donated', value: selectedBook.airportQty, color: 'text-blue-600' },
                    { label: 'Book Fairs', value: selectedBook.eventQty, color: 'text-purple-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                      <p className={`text-xl font-black m-0 leading-none ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {selectedBook.isLowStock && (
                  <div className="mt-2.5 border-t border-red-200/50 pt-2 flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-red-600 shrink-0" />
                    <p className="text-[11px] text-red-600 font-semibold m-0">Low stock — replenish immediately</p>
                  </div>
                )}
              </div>

              {/* Distribution items */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Location Detail</p>
              {selectedBook.distributionBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 italic m-0">No active distribution records for this title.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedBook.distributionBreakdown.map((item: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${item.type === 'airport' ? 'bg-blue-50/50 border-blue-100' : 'bg-purple-50/50 border-purple-100'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 ${item.type === 'airport' ? 'text-blue-600 bg-white' : 'text-purple-600 bg-purple-100'}`}>
                            {item.type === 'airport' ? '✈ Airport' : '📚 Book Fair'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-paa-navy m-0 truncate" title={item.label}>
                          {item.label}
                        </p>
                        {item.location && (
                          <p className="text-[10px] text-gray-400 mt-0.5 mb-0">{item.location}</p>
                        )}
                        {item.type === 'event' && item.sold !== undefined && (
                          <p className="text-[10px] text-gray-500 mt-0.5 mb-0">Sold: {item.sold} / Listed: {item.quantity}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className={`text-lg font-black leading-none ${item.type === 'airport' ? 'text-blue-600' : 'text-purple-600'}`}>
                          {item.quantity}
                        </span>
                        <p className="text-[9px] text-gray-400 mt-0.5 mb-0 uppercase">copies</p>
                      </div>
                    </div>
                  ))}

                  {/* Cumulative Total */}
                  <div className="border-t-2 border-gray-100 pt-2.5 mt-1 flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-paa-navy">Total Distributed</span>
                    <span className="text-xl font-black text-paa-navy">
                      {selectedBook.distributionBreakdown.reduce((s: number, i: any) => s + i.quantity, 0)}
                    </span>
                  </div>

                  {/* Collapsible Stock Update Logs */}
                  <div className="mt-4 border-t pt-4">
                    <button
                      onClick={() => setShowStockHistory(!showStockHistory)}
                      className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-paa-navy transition-colors outline-none cursor-pointer"
                    >
                      <span>Stock Update History ({selectedBook.stockHistory?.length || 0})</span>
                      <ChevronDown
                        size={14}
                        className={`transform transition-transform duration-300 ${showStockHistory ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {showStockHistory && (
                      <div className="mt-2.5 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {!selectedBook.stockHistory || selectedBook.stockHistory.length === 0 ? (
                          <p className="text-xs text-gray-400 italic m-0">No stock update history recorded yet.</p>
                        ) : (
                          selectedBook.stockHistory.map((log: any) => (
                            <div key={log.id} className="bg-gray-50 border border-gray-100 p-2.5 rounded-lg text-[11px]">
                              <div className="flex justify-between items-center mb-1 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                                <span>{new Date(log.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className={log.changeQty > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>Last Stock: <strong className="text-paa-navy">{log.lastStock}</strong></span>
                                <span>Current: <strong className="text-paa-navy">{log.currentStock}</strong></span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRegistration({ activities, books, onRefresh, registrations }: { activities: any[], books: any[], onRefresh: () => void, registrations: any[] }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAct, setSelectedAct] = useState<any>(null);
  const [selectedBooks, setSelectedBooks] = useState<{ id: number, qty: number }[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registeredIds = registrations.map(r => r.activityId);

  const handleParticipateClick = (act: any) => {
    if (registeredIds.includes(act.id)) return;
    if (act.status === 'CLOSED') return;
    setSelectedAct(act);
    setShowDialog(true);
  };

  const confirmParticipation = async () => {
    if (selectedBooks.length === 0) {
      toast.error('Please select at least one book');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('activityId', selectedAct.id);
      formData.append('booksIds', JSON.stringify(selectedBooks));
      formData.append('amount', selectedAct.charges);

      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/activities/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Registration submitted! Awaiting admin approval.');
      setShowDialog(false);
      setSelectedAct(null);
      setScreenshot(null);
      setSelectedBooks([]);
      onRefresh();
    } catch (err) {
      toast.error('Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBook = (id: number) => {
    setSelectedBooks(prev => {
      if (prev.find(b => b.id === id)) {
        return prev.filter(b => b.id !== id);
      } else {
        return [...prev, { id, qty: 1 }];
      }
    });
  };

  const updateBookQty = (id: number, qty: number) => {
    setSelectedBooks(prev => prev.map(b => b.id === id ? { ...b, qty } : b));
  };




  return (
    <div>
      <h1 className="text-4xl font-serif text-paa-navy mb-8">Activity Announcements</h1>
      <div className="bg-white border border-paa-navy/5 overflow-hidden relative">
        {showDialog && (
          <div className="fixed inset-0 bg-paa-navy/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full p-6 rounded-3xl-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-serif text-paa-navy mb-4 border-b pb-2">Register for {selectedAct?.name}</h3>

              <div className="mb-4">
                <p className="text-sm font-bold text-paa-navy mb-2">1. Select Books and Quantity for this event:</p>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border p-2 bg-gray-50">
                  {books.map(b => {
                    const selected = selectedBooks.find(sb => sb.id === b.id);
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input type="checkbox" checked={!!selected} onChange={() => toggleBook(b.id)} />
                          {b.title}
                        </label>
                        {selected && (
                          <input type="number" min="1" placeholder="Qty" value={selected.qty} onChange={(e) => updateBookQty(b.id, parseInt(e.target.value) || 1)} className="w-16 p-1 text-xs border" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-paa-navy mb-2">2. Payment (₹{selectedAct?.charges})</p>
                {selectedAct?.charges > 0 ? (
                  <div className="border border-paa-navy/20 p-4 bg-yellow-50 rounded text-center">
                    <p className="text-sm font-bold text-yellow-800">Payment will be requested upon approval.</p>
                    <p className="text-xs text-yellow-700 mt-2">You do not need to pay the ₹{selectedAct.charges} fee until the administrator approves your registration.</p>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 font-bold">This event is free.</p>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => setShowDialog(false)} className="text-sm font-bold text-gray-500 hover:text-paa-navy">Cancel</button>
                <button onClick={confirmParticipation} disabled={isSubmitting} className="bg-paa-gold text-paa-navy px-6 py-2 rounded-3xl-2xl text-sm font-bold disabled:opacity-50 rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="p-3 border-r border-indigo-100/20 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">S.No</th>
                <th className="p-3 border-r border-indigo-100/20 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">ACTIVITY</th>
                <th className="p-3 border-r border-indigo-100/20 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">TYPE</th>
                <th className="p-3 border-r border-indigo-100/20 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">DATE</th>
                <th className="p-3 border-r border-indigo-100/20 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">STATUS</th>
                <th className="p-3 border-r border-indigo-100/20 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">CITY</th>
                <th className="p-3 border-r border-indigo-100/20 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">CHARGES</th>
                <th className="p-3 border-r border-indigo-100/20 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? <tr><td colSpan={8} className="p-4 text-center">No activities available.</td></tr> : activities.map((row, index) => {
                const reg = registrations.find(r => r.activityId === row.id);
                const isParticipating = !!reg;
                const statusColor = row.type.includes('Event') ? 'bg-[#4a90e2]' : row.type.includes('Fair') ? 'bg-[#e74c3c]' : 'bg-[#43a047]';

                return (
                  <tr key={row.id} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'}  border-b border-paa-navy/5`}>
                    <td className="p-3 border-r border-paa-navy/5 text-center">{index + 1}</td>
                    <td className="p-3 border-r border-paa-navy/5 font-medium">{row.name}</td>
                    <td className="p-3 border-r border-paa-navy/5 text-xs">{row.type}</td>
                    <td className="p-3 border-r border-paa-navy/5">{row.date}</td>
                    <td className="p-3 border-r border-paa-navy/5 text-center">
                      <span className="font-bold text-xs">{row.status}</span>
                    </td>
                    <td className="p-3 border-r border-paa-navy/5">{row.city}</td>
                    <td className="p-3 border-r border-paa-navy/5 text-center">â‚¹{row.charges}</td>
                    <td className="p-3 border-r border-paa-navy/5 text-center">
                      {isParticipating ? (
                        <div className="flex flex-col items-center">
                          <span className="bg-green-100 text-green-800 text-[10px] px-2 py-1 rounded-full font-bold mb-1 flex items-center gap-1"><Check size={12} /> Registered</span>
                          <span className="text-[10px] text-gray-500">{reg.status}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleParticipateClick(row)}
                          disabled={row.status === 'CLOSED'}
                          className={`${row.status === 'CLOSED' ? 'bg-gray-300' : statusColor} text-white px-4 py-1.5 rounded-full text-xs font-bold shadow disabled:cursor-not-allowed transition-colors w-24`}
                        >
                          {row.status === 'CLOSED' ? 'CLOSED' : 'REGISTER'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Author Orders
function AuthorOrders({ orders, onRefresh, dashboardData }: { orders: any[], onRefresh: () => void, dashboardData: any }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [rejectItemId, setRejectItemId] = useState<number[] | null>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>(['Item out of stock']);
  const [otherRejectReason, setOtherRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [viewBuyerInfoOrder, setViewBuyerInfoOrder] = useState<any | null>(null);
  const [editingStatusOrderId, setEditingStatusOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalSalesAmount = dashboardData?.totalWebAndBulkSales !== undefined 
    ? dashboardData.totalWebAndBulkSales 
    : (orders || []).reduce((sum: number, o: any) => {
        const isCompleted = o.status === 'Completed' || o.status === 'Delivered' || 
                            o.orderStatus === 'Completed' || o.orderStatus === 'Delivered';
        return isCompleted ? sum + (o.amount || 0) : sum;
      }, 0);

  const webSalesAmount = dashboardData?.totalWebSales !== undefined
    ? dashboardData.totalWebSales
    : (orders || []).reduce((sum: number, o: any) => {
        const isCompleted = o.status === 'Completed' || o.status === 'Delivered' || 
                            o.orderStatus === 'Completed' || o.orderStatus === 'Delivered';
        return (isCompleted && !o.isBulk) ? sum + (o.amount || 0) : sum;
      }, 0);

  const bulkSalesAmount = dashboardData?.totalBulkSales !== undefined
    ? dashboardData.totalBulkSales
    : (orders || []).reduce((sum: number, o: any) => {
        const isCompleted = o.status === 'Completed' || o.status === 'Delivered' || 
                            o.orderStatus === 'Completed' || o.orderStatus === 'Delivered';
        return (isCompleted && o.isBulk) ? sum + (o.amount || 0) : sum;
      }, 0);

  const ORDER_REJECTION_REASONS = [
    'Item out of stock',
    'Inventory is damaged',
    'Customer address is unserviceable',
    'Pricing error',
    'Wrong edition requested'
  ];
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // â”€â”€â”€ Invoice generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const generateAndPrintInvoice = async (orderItemId: number) => {
    try {
      const token = localStorage.getItem('token');
      const { data: inv } = await axios.get(`${API}/api/order-items/${orderItemId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery Invoice ${inv.orderId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 36px; }

    /* --- HEADER --- */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a2e; padding-bottom: 18px; margin-bottom: 24px; }
    .brand h1 { font-size: 22px; font-weight: 800; color: #1a1a2e; letter-spacing: -.5px; }
    .brand p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .inv-meta { text-align: right; }
    .inv-meta .inv-id { font-size: 20px; font-weight: 800; color: #1a1a2e; }
    .inv-meta .inv-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; }
    .badge { display: inline-block; background: #22c55e; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 6px; }
    .badge.dispatched { background: #3b82f6; }

    /* --- SECTIONS --- */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .box { border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; }
    .box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid #f0f0f4; padding-bottom: 6px; }
    .box p { font-size: 13px; line-height: 1.7; color: #334155; }
    .box strong { color: #1a1a2e; }

    /* --- BOOK TABLE --- */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #1a1a2e; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; padding: 10px 14px; text-align: left; }
    tbody td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    tfoot td { padding: 12px 14px; font-weight: 700; font-size: 14px; border-top: 2px solid #1a1a2e; }
    .amount { text-align: right; font-weight: 700; color: #1a1a2e; }

    /* --- DELIVERY SLIP DIVIDER --- */
    .cut-line { border: none; border-top: 2px dashed #cbd5e1; margin: 32px 0; position: relative; }
    .cut-line::after { content: 'âœ‚ FOLD & PASTE ON DELIVERY BOX'; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; font-size: 10px; color: #94a3b8; letter-spacing: .06em; white-space: nowrap; }

    /* --- DELIVERY SLIP --- */
    .slip { border: 2.5px solid #1a1a2e; border-radius: 12px; padding: 22px 24px; }
    .slip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .slip-header .from { font-size: 11px; color: #64748b; }
    .slip-header .from strong { display: block; font-size: 15px; color: #1a1a2e; }
    .slip-to { }
    .slip-to h4 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 6px; }
    .slip-to .name { font-size: 18px; font-weight: 800; color: #1a1a2e; line-height: 1.2; }
    .slip-to .addr { font-size: 13px; color: #334155; margin-top: 4px; line-height: 1.6; }
    .slip-to .phone { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-top: 8px; }
    .slip-contents { margin-top: 16px; padding-top: 14px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .slip-book { font-size: 13px; color: #334155; }
    .slip-book strong { display: block; font-size: 15px; color: #1a1a2e; font-weight: 700; }
    .slip-order { text-align: right; font-size: 11px; color: #94a3b8; }
    .slip-order strong { display: block; font-size: 14px; color: #1a1a2e; }

    /* --- FOOTER --- */
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f0f0f4; padding-top: 16px; }

    @media print {
      body { background: #fff; }
      .page { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Print Button -->
    <div class="no-print" style="text-align:right;margin-bottom:20px">
      <button onclick="window.print()" style="background:#1a1a2e;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">ðŸ–¨ Print / Save as PDF</button>
    </div>

    <!-- INVOICE HEADER -->
    <div class="header">
      <div class="brand">
        <h1>Pune Authors' Association</h1>
        <p>puneauthors.com &nbsp;Â·&nbsp; Official Delivery Invoice</p>
      </div>
      <div class="inv-meta">
        <div class="inv-label">Invoice / Order ID</div>
        <div class="inv-id">${inv.orderId}</div>
        <div><span class="badge ${inv.status === 'Dispatched' ? 'dispatched' : ''}">${inv.status === 'Dispatched' ? 'Dispatched' : 'Approved'}</span></div>
      </div>
    </div>

    <!-- DATES -->
    <div style="display:flex;gap:12px;margin-bottom:20px;font-size:12px;color:#64748b">
      <span>ðŸ“… Order Date: <strong style="color:#1a1a2e">${new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
      ${inv.trackingNumber ? `<span>ðŸšš Tracking: <strong style="color:#1a1a2e">${inv.trackingNumber}</strong></span>` : ''}
    </div>

    <!-- TWO COLUMN: FROM / TO -->
    <div class="two-col">
      <div class="box">
        <h3>From (Author / Seller)</h3>
        <p>
          <strong>${inv.author.name}</strong><br>
          ${inv.author.email}<br>
          ${inv.author.phone ? inv.author.phone : ''}
          ${inv.author.whatsapp ? '<br>WhatsApp: ' + inv.author.whatsapp : ''}
        </p>
      </div>
      <div class="box">
        <h3>Bill To (Customer)</h3>
        <p>
          <strong>${inv.customer.name}</strong><br>
          ${inv.customer.email || ''}<br>
          ${inv.customer.phone || ''}
        </p>
      </div>
    </div>

    <!-- BOOK TABLE -->
    <table>
      <thead>
        <tr>
          <th>Book Title</th>
          <th>Genre</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${inv.book.title}</strong></td>
          <td>${inv.book.genre}</td>
          <td style="text-align:center">${inv.quantity}</td>
          <td style="text-align:right">â‚¹${parseFloat(inv.book.mrp).toFixed(2)}</td>
          <td class="amount">â‚¹${parseFloat(inv.total).toFixed(2)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;color:#64748b;font-size:12px">Subtotal</td>
          <td class="amount">â‚¹${parseFloat(inv.total).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align:right;color:#64748b;font-size:12px">Shipping</td>
          <td class="amount" style="font-size:12px;color:#22c55e">Included</td>
        </tr>
        <tr style="background:#f8fafc">
          <td colspan="4" style="text-align:right">Grand Total</td>
          <td class="amount" style="font-size:18px;color:#1a1a2e">â‚¹${parseFloat(inv.total).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${inv.transactionId ? `
    <div class="box" style="margin-bottom:24px">
      <h3>Payment Reference</h3>
      <p>Transaction ID: <strong>${inv.transactionId}</strong></p>
    </div>` : ''}

    <!-- DELIVERY ADDRESS -->
    <div class="box" style="margin-bottom:32px">
      <h3>Delivery Address</h3>
      <p>${inv.customer.address}</p>
    </div>

    <!-- â•â•â• CUT LINE â•â•â• -->
    <hr class="cut-line">

    <!-- DELIVERY SLIP -->
    <div class="slip">
      <div class="slip-header">
        <div class="from">
          <strong>${inv.author.name}</strong>
          Pune Authors' Association<br>
          ${inv.author.email} ${inv.author.phone ? 'Â· ' + inv.author.phone : ''}
        </div>
        <div style="text-align:right;font-size:11px;color:#94a3b8">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em">Order Reference</div>
          <div style="font-size:16px;font-weight:800;color:#1a1a2e">${inv.orderId}</div>
        </div>
      </div>
      <div class="slip-to">
        <h4>ðŸ“¬ Deliver To</h4>
        <div class="name">${inv.customer.name}</div>
        <div class="addr">${inv.customer.address}</div>
        <div class="phone">${inv.customer.phone || ''}</div>
      </div>
      <div class="slip-contents">
        <div class="slip-book">
          Contents:<br>
          <strong>${inv.book.title} Ã— ${inv.quantity}</strong>
        </div>
        <div class="slip-order">
          Amount Paid<br>
          <strong>â‚¹${parseFloat(inv.total).toFixed(2)}</strong>
        </div>
      </div>
    </div>

    <div class="footer">
      Pune Authors' Association &nbsp;Â·&nbsp; puneauthors.com &nbsp;Â·&nbsp;
      This document is system-generated and serves as proof of order.
    </div>
  </div>
</body>
</html>`;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        // Slight delay so styles render before auto-print
        setTimeout(() => win.print(), 800);
      } else {
        toast.error('Popup blocked. Please allow popups for this site.');
      }
    } catch (err) {
      toast.error('Could not load invoice data. Please try again.');
    }
  };

  const handleApprove = async (itemIds: number[]) => {
    setLoadingAction(String(itemIds[0]));
    try {
      const token = localStorage.getItem('token');
      await Promise.all(itemIds.map(id => axios.put(`${API}/api/order-items/${id}/author-approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })));
      toast.success('Order Approved — Stock reserved!');
      onRefresh();
    } catch (e) {
      toast.error('Failed to approve order');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectItemId) return;
    const reasons = [...rejectReasons];
    if (otherRejectReason.trim()) reasons.push(otherRejectReason.trim());
    if (reasons.length === 0) { alert('Please select or enter at least one reason.'); return; }

    const finalReason = reasons.join('; ');
    const itemIds = Array.isArray(rejectItemId) ? rejectItemId : [rejectItemId];
    setLoadingAction(String(itemIds[0]));
    try {
      const token = localStorage.getItem('token');
      await Promise.all(itemIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/order-items/${id}/author-reject`, { reason: finalReason }, {
        headers: { Authorization: `Bearer ${token}` }
      })));
      setRejectItemId(null);
      setRejectReasons(['Item out of stock']);
      setOtherRejectReason('');
      onRefresh();
    } catch (e) {
      toast.error('Failed to reject order');
    } finally {
      setLoadingAction(null);
    }
  };


  const handleStatusChange = async (itemIds: number[], newStatus: string) => {
    setLoadingAction(String(itemIds[0]));
    try {
      const token = localStorage.getItem('token');
      if (newStatus === 'Dispatched') {
        const trackingNumber = prompt("Enter tracking number for dispatch (optional):");
        await Promise.all(itemIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/order-items/${id}/dispatch`, { trackingNumber: trackingNumber || 'N/A' }, {
          headers: { Authorization: `Bearer ${token}` }
        })));
      } else {
        await Promise.all(itemIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/order-items/${id}/status`, { status: newStatus }, {
          headers: { Authorization: `Bearer ${token}` }
        })));
      }
      toast.success('Order status updated to ' + newStatus);
      onRefresh();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDispatch = async (id: number) => {
    const trackingNumber = prompt("Enter tracking number for dispatch (optional):");
    if (trackingNumber === null) return; // Cancelled

    setLoadingAction(String(id));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/order-items/${id}/dispatch`, { trackingNumber: trackingNumber || 'N/A' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order Dispatched');
      onRefresh();
    } catch (e) {
      toast.error('Failed to dispatch order');
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredOrders = (filterStatus === 'All'
    ? orders
    : filterStatus === 'Pending'
      ? orders.filter((o: any) => o.status === 'Pending Verification' || o.status === 'Pending' || o.status === 'Processing')
      : filterStatus === 'Delivered'
        ? orders.filter((o: any) => o.status === 'Completed' || o.status === 'Delivered')
        : orders.filter((o: any) => o.status === filterStatus)).filter((o: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q) ||
          String(o.orderId).includes(q) ||
          o.bookTitle?.toLowerCase().includes(q) ||
          o.title?.toLowerCase().includes(q);
      });

  const groupedOrdersObj: Record<string, any> = {};
  filteredOrders.forEach((o: any) => {
    if (!groupedOrdersObj[o.orderId]) {
      groupedOrdersObj[o.orderId] = {
        ...o,
        itemIds: [o.id],
        books: [{ title: o.bookTitle || o.title, quantity: o.quantity, amount: o.amount, trackingNumber: o.trackingNumber }],
        totalQuantity: o.quantity,
        totalAmount: o.amount,
      };
    } else {
      groupedOrdersObj[o.orderId].itemIds.push(o.id);
      groupedOrdersObj[o.orderId].books.push({ title: o.bookTitle || o.title, quantity: o.quantity, amount: o.amount, trackingNumber: o.trackingNumber });
      groupedOrdersObj[o.orderId].totalQuantity += o.quantity;
      groupedOrdersObj[o.orderId].totalAmount += o.amount;
    }
  });
  const groupedOrdersList = Object.values(groupedOrdersObj).sort((a: any, b: any) => {
     return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
  });

  if (viewBuyerInfoOrder !== null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-6 md:p-10 mb-12">
        <button onClick={() => setViewBuyerInfoOrder(null)} className="text-gray-400 hover:text-paa-navy mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors">
          <X size={18} /> Back to Web Orders
        </button>
        
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column: Details & Timeline */}
          <div className="flex-1">
            <h2 className="text-3xl font-serif text-paa-navy mb-2">Order Details</h2>
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-8 border-b border-paa-navy/10 pb-4">ORD-{viewBuyerInfoOrder.orderId}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer Name</p>
                <p className="font-bold text-paa-navy text-lg">{viewBuyerInfoOrder.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Number</p>
                <p className="font-bold text-[#4a90e2] text-lg">{viewBuyerInfoOrder.customerPhone || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Address</p>
                <p className="text-gray-700 leading-relaxed text-base">{viewBuyerInfoOrder.address}</p>
              </div>
            </div>

            <div className="border-t border-paa-navy/10 pt-8 mb-8">
              <p className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-6">Order Timeline</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Placed On</span>
                  <span className="font-bold text-paa-navy">{new Date(viewBuyerInfoOrder.createdAt || viewBuyerInfoOrder.date).toLocaleString('en-IN')}</span>
                </div>
                {viewBuyerInfoOrder.acceptedAt && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Accepted</span>
                    <span className="font-bold text-paa-navy">{new Date(viewBuyerInfoOrder.acceptedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {viewBuyerInfoOrder.dispatchedAt && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Dispatched</span>
                    <span className="font-bold text-paa-navy">{new Date(viewBuyerInfoOrder.dispatchedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {(viewBuyerInfoOrder.deliveredAt || viewBuyerInfoOrder.status === 'Completed' || viewBuyerInfoOrder.status === 'Delivered') && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Delivered</span>
                    <span className="font-bold text-green-600">{viewBuyerInfoOrder.deliveredAt ? new Date(viewBuyerInfoOrder.deliveredAt).toLocaleString('en-IN') : 'Delivered'}</span>
                  </div>
                )}
                {(viewBuyerInfoOrder.deliveredAt || viewBuyerInfoOrder.status === 'Completed' || viewBuyerInfoOrder.status === 'Delivered') && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-center font-bold text-green-600 bg-green-50 py-3 rounded-lg">
                    Took {Math.max(1, Math.ceil(((viewBuyerInfoOrder.deliveredAt ? new Date(viewBuyerInfoOrder.deliveredAt).getTime() : new Date().getTime()) - new Date(viewBuyerInfoOrder.createdAt || viewBuyerInfoOrder.date).getTime()) / (1000 * 3600 * 24)))} Days to Deliver
                  </div>
                )}
              </div>
            </div>
            
            {(viewBuyerInfoOrder.feedbackCondition || viewBuyerInfoOrder.feedbackRating) && (
              <div className="border-t border-paa-navy/10 pt-8">
                <p className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-4">Customer Feedback</p>
                <div className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Condition</span>
                    <span className={`font-bold ${viewBuyerInfoOrder.feedbackCondition === 'Damaged' ? 'text-red-600' : 'text-paa-navy'}`}>{viewBuyerInfoOrder.feedbackCondition}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Delivery Rating</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= (viewBuyerInfoOrder.feedbackRating || 0) ? "text-amber-500 fill-amber-500" : "text-gray-300"}
                        />
                      ))}
                    </div>
                  </div>
                  {viewBuyerInfoOrder.feedbackComments && (
                    <div className="text-sm italic text-gray-600 border-t border-gray-200 mt-4 pt-4">
                      "{viewBuyerInfoOrder.feedbackComments}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column: Bill/Breakdown */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="bg-paa-navy text-white px-6 py-4">
                <p className="text-sm font-bold uppercase tracking-widest">Order Bill</p>
              </div>
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  {viewBuyerInfoOrder.books.map((b: any, idx: number) => {
                    const allBooks = [
                      ...(fictionData.fiction_catalogue || []).flatMap((a: any) => a.books || []),
                      ...(nonFictionData.non_fiction_catalogue || []).flatMap((a: any) => a.books || [])
                    ];
                    const matchedBook = allBooks.find(item => item.title === b.title);
                    return (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex items-start gap-3 pr-4">
                          {matchedBook && matchedBook.cover_image_url ? (
                            <img src={matchedBook.cover_image_url} alt={b.title} className="w-12 h-16 object-cover rounded shadow-sm border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-12 h-16 bg-gray-100 rounded shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                              <BookOpen size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            {matchedBook ? (
                              <Link to={`/book/${matchedBook.id}`} className="text-gray-700 font-bold hover:text-[#4a90e2] transition-colors leading-tight mb-1" target="_blank">
                                {b.title}
                              </Link>
                            ) : (
                              <span className="text-gray-700 font-bold leading-tight mb-1">{b.title}</span>
                            )}
                            <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Qty: {b.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-paa-navy whitespace-nowrap mt-1">₹{b.amount}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-gray-200 pt-4 space-y-3 mb-6">
                  {viewBuyerInfoOrder.deliveryCharges !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Delivery Charges</span>
                      <span className="font-bold text-paa-navy">{viewBuyerInfoOrder.deliveryCharges === 0 ? 'FREE' : `₹${viewBuyerInfoOrder.deliveryCharges}`}</span>
                    </div>
                  )}
                  {viewBuyerInfoOrder.bundleDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span className="font-medium">Bundle Discount</span>
                      <span className="font-bold">-₹{viewBuyerInfoOrder.bundleDiscount}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-paa-navy/5 -mx-6 -mb-6 p-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-paa-navy font-bold uppercase tracking-widest">Total Paid</span>
                    <span className="text-2xl font-bold text-paa-navy">₹{viewBuyerInfoOrder.totalAmount || viewBuyerInfoOrder.orderAmount}</span>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-100 pb-2">Payment Info</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Transaction ID</span>
                      <span className="font-bold font-mono text-paa-navy">{viewBuyerInfoOrder.transactionId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Item Status</span>
                      <span className="font-bold text-paa-navy uppercase">{viewBuyerInfoOrder.status}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Payment Verification</span>
                      <span className={`font-bold ${(viewBuyerInfoOrder.paymentVerified || ['Approved', 'Processing', 'Dispatched', 'Delivered', 'Completed'].includes(viewBuyerInfoOrder.status)) ? 'text-green-600' : viewBuyerInfoOrder.paymentFailed ? 'text-red-600' : 'text-yellow-600'}`}>
                        {(viewBuyerInfoOrder.paymentVerified || ['Approved', 'Processing', 'Dispatched', 'Delivered', 'Completed'].includes(viewBuyerInfoOrder.status)) ? 'Verified' : viewBuyerInfoOrder.paymentFailed ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                    {viewBuyerInfoOrder.paymentScreenshot && (
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Receipt</span>
                        <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${viewBuyerInfoOrder.paymentScreenshot}`} target="_blank" rel="noreferrer" className="font-bold text-[#4a90e2] underline uppercase tracking-widest text-[10px]">View Image</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const uniqueAllOrders = Object.values(orders.reduce((acc: any, o: any) => {
    if (!acc[o.orderId]) acc[o.orderId] = o;
    return acc;
  }, {}));

  return (
    <div>

      {/* Reject Reason Modal */}
      {rejectItemId !== null && (
        <div className="fixed inset-0 bg-paa-navy/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-serif text-paa-navy mb-3">Reason for Rejection</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason to inform the customer.</p>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto bg-gray-50 p-3 border border-paa-navy/5">
              {ORDER_REJECTION_REASONS.map((reason) => (
                <label key={reason} className="flex items-start gap-3 cursor-pointer text-sm font-medium text-paa-navy hover:text-paa-gold">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-paa-navy"
                    checked={rejectReasons.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) setRejectReasons([...rejectReasons, reason]);
                      else setRejectReasons(rejectReasons.filter(r => r !== reason));
                    }}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">Other (specify):</label>
              <input
                type="text"
                value={otherRejectReason}
                onChange={(e) => setOtherRejectReason(e.target.value)}
                placeholder="Enter additional reason..."
                className="w-full border border-paa-navy/20 p-2 text-sm outline-none focus:border-paa-navy"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectItemId(null); setRejectReasons(['Item out of stock']); setOtherRejectReason(''); }} className="px-4 py-2 text-sm text-gray-500 hover:text-paa-navy transition-colors font-bold uppercase tracking-widest">Cancel</button>
              <button onClick={handleRejectSubmit} disabled={loadingAction !== null} className="dash-btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50">Reject Order</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-paa-navy/5 pb-4">
        <div>
          <h2 className="text-2xl font-serif text-paa-navy tracking-tight">My Web Orders</h2>
          <p className="text-sm text-paa-gray-text mt-1">Manage pending orders and track dispatched shipments.</p>
        </div>
        <button onClick={async () => {
          const ExcelJS = (await import('exceljs')).default;
          const { saveAs } = await import('file-saver');
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('Web Orders');
          
          // Add title row
          sheet.mergeCells('A1:J1');
          const titleCell = sheet.getCell('A1');
          titleCell.value = 'WEB ORDERS EXPORT';
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } }; // Cyan
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          // Add headers
          const headers = ['Order ID', 'Date', 'Book', 'Customer Name', 'Customer Email', 'Customer Phone', 'Address', 'Status', 'Quantity', 'Amount'];
          const headerRow = sheet.addRow(headers);
          headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          
          // Add data
          filteredOrders.forEach((o: any) => {
            const addedRow = sheet.addRow([
              o.orderId,
              o.date,
              o.title,
              o.customerName,
              o.customerEmail,
              o.customerPhone,
              o.address?.replace(/\n/g, ' '),
              o.status,
              o.quantity,
              o.total || o.amount
            ]);
            addedRow.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
              cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
              let colBgColor = 'FFFFFF';
              if (colNumber <= 2) colBgColor = 'FF8B8B'; // Red
              else if (colNumber <= 4) colBgColor = 'FFD2A3'; // Orange
              else if (colNumber <= 6) colBgColor = 'D4D8DD'; // Gray
              else if (colNumber <= 8) colBgColor = 'B3E5FC'; // Cyan
              else if (colNumber === 9) colBgColor = 'DDA0DD'; // Lavender
              else colBgColor = 'C8E6C9'; // Green
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
            });
          });
          
          // Auto-fit columns
          sheet.columns.forEach(column => {
            let maxLen = 10;
            column.eachCell({ includeEmpty: true }, cell => {
              if (cell.value) {
                const len = cell.value.toString().length;
                if (len > maxLen) maxLen = len;
              }
            });
            column.width = Math.min(maxLen + 2, 40);
          });

          // Apply borders
          sheet.eachRow((row) => {
            row.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            });
          });
          
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, 'author_orders_export.xlsx');
        }} className="flex items-center gap-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow transition-colors shrink-0">
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* ── Web Orders Layout (KPIs + Pie) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 mb-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-max">
          <div className="bg-[#FFFBEB] rounded-xl shadow-sm border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-300 transition-colors col-span-2 md:col-span-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-0.5">TOTAL SALES</p>
                <h3 className="text-xl font-bold text-gray-900">₹{totalSalesAmount.toLocaleString()}</h3>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] whitespace-nowrap">
                WEB ORDERS: ₹{webSalesAmount.toLocaleString()}
              </span>
              <span className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] whitespace-nowrap">
                BULK ORDERS: ₹{bulkSalesAmount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-4 flex items-center gap-4 hover:border-green-500/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Check size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">Successful Orders</p>
              <h3 className="text-xl font-bold text-paa-navy">{uniqueAllOrders.filter((o: any) => o.status === 'Completed' || o.status === 'Delivered' || o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-4 flex items-center gap-4 hover:border-yellow-500/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">To Be Approved</p>
              <h3 className="text-xl font-bold text-paa-navy">{uniqueAllOrders.filter((o: any) => ((o.status === 'Pending Verification' || o.status === 'Processing' || o.status === 'Pending') && !o.isBulk) || (o.isBulk && (o.orderStatus === 'Pending' || String(o.orderStatus).includes('PENDING')))).length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">To Be Dispatched</p>
              <h3 className="text-xl font-bold text-paa-navy">{uniqueAllOrders.filter((o: any) => o.status === 'Accepted' || o.orderStatus === 'Accepted').length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-4 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">Under Delivery</p>
              <h3 className="text-xl font-bold text-paa-navy">{uniqueAllOrders.filter((o: any) => o.status === 'Dispatched' || o.orderStatus === 'Dispatched').length}</h3>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-100">
              <TrendingDown size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-0.5">Late Fines</p>
              <h3 className="text-xl font-bold text-red-600">₹{dashboardData?.authorProfile?.extraData?.lateFines || 0}</h3>
            </div>
          </div>
        </div>

        {/* Orders by Status Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2 border-b pb-2">Orders by Status</p>
          <div className="h-[200px]">
            {(() => {
              const statusCounts: Record<string, number> = {};
              uniqueAllOrders.forEach((o: any) => {
                let st = o.isBulk ? (o.orderStatus || 'Pending') : (o.status || 'Pending');
                if (st === 'Completed') st = 'Delivered';
                if (st === 'Pending Verification' || st === 'Processing') st = 'Pending';
                if (String(st).includes('PENDING')) st = 'Pending';
                statusCounts[st] = (statusCounts[st] || 0) + 1;
              });
              const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
              const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#94a3b8'];

              return statusPieData.length > 0 ? (
                <div className="flex items-center h-full gap-2">
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="45%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-[45%] flex flex-col gap-2 justify-center overflow-y-auto max-h-full pr-1 hide-scrollbar">
                    {statusPieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                        <span className="truncate" title={entry.name}>{entry.name}</span>
                        <span className="ml-auto text-paa-navy">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-paa-gray-text text-sm italic">No data</div>
              );
            })()}
          </div>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          {['All', 'Pending', 'Accepted', 'Dispatched', 'Delivered', 'Rejected'].map(status => {
            const tabCount = status === 'All' 
              ? uniqueAllOrders.length
              : status === 'Pending'
                ? uniqueAllOrders.filter((o: any) => o.status === 'Pending Verification' || o.status === 'Pending' || o.status === 'Processing').length
                : status === 'Delivered'
                  ? uniqueAllOrders.filter((o: any) => o.status === 'Completed' || o.status === 'Delivered').length
                  : uniqueAllOrders.filter((o: any) => o.status === status).length;

            return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterStatus === status ? 'bg-paa-navy text-paa-cream shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {status} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === status ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{tabCount}</span>
            </button>
          )})}
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <input
            type="text"
            placeholder="Search Orders..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-paa-navy/10 rounded-full text-sm outline-none focus:border-paa-navy transition-colors"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div className="bg-white border border-paa-navy/5 rounded-xl shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="px-2 py-3 w-10 !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent text-center">S.No</th>
                <th className="px-2 py-3 !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Order Details</th>
                <th className="px-2 py-3 !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Buyer Information</th>
                <th className="px-2 py-3 !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Book Title</th>
                <th className="px-2 py-3 text-center !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Qty</th>
                <th className="px-2 py-3 text-center !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Amount</th>
                <th className="px-2 py-3 text-center !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Payment</th>
                <th className="px-2 py-3 text-center !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Status</th>
                <th className="px-2 py-3 text-center !text-[12px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupedOrdersList.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">No orders found.</td></tr> : groupedOrdersList.map((ord: any, idx: number) => {
                const orderDate = new Date(ord.createdAt || ord.date);
                const isSlaBreached = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60) > 24 && ['Pending Verification', 'Pending'].includes(ord.status);
                return (
                  <tr key={idx} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} `}>
                    <td className="px-2 py-3 text-xs font-bold text-paa-navy text-center">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-bold text-paa-navy tracking-wide text-xs">ORD-{ord.orderId}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">{ord.date}</p>
                      {isSlaBreached && <span className="text-[9px] font-bold text-white bg-red-600 px-2 py-0.5 rounded uppercase tracking-widest mt-1.5 inline-block animate-pulse">SLA Breached</span>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-paa-navy text-xs">{ord.customerName}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{ord.address}</p>
                        </div>
                      </div>
                      {ord.customerPhone && <p className="text-[9px] font-bold text-[#4a90e2] mt-1">{ord.customerPhone}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        {ord.books.map((b: any, i: number) => {
                          const bookData = dashboardData?.authorProfile?.books?.find((bk: any) => bk.id === b.bookId || bk.title === b.title);
                          const avgRating = bookData?.reviews?.length ? (bookData.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / bookData.reviews.length).toFixed(1) : null;
                          return (
                            <div key={i} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                              <p className="font-medium text-paa-navy text-xs">{b.title}</p>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Qty: {b.quantity} &nbsp;&middot;&nbsp; ₹{b.amount}</p>
                                {avgRating && (
                                  <div className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                    {avgRating} <Star size={8} className="fill-amber-500 text-amber-500" />
                                  </div>
                                )}
                              </div>
                              {b.trackingNumber && b.trackingNumber !== 'N/A' && (
                                <p className="text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50 px-2 py-1 rounded w-fit border border-indigo-100">
                                  Tracking: {b.trackingNumber}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {ord.order?.totalDiscount > 0 && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded inline-block w-max mt-1">Discount Applied</span>}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-paa-navy">{ord.totalQuantity}</td>
                    <td className="px-2 py-3 text-center font-bold text-paa-navy">₹{ord.totalAmount}</td>
                    <td className="px-2 py-3 text-center align-middle">
                      {ord.paymentScreenshot ? (
                        <div className="flex flex-col items-center gap-2">
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${ord.paymentScreenshot}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[9px] font-bold text-paa-navy bg-gray-50 border border-gray-200 hover:border-[#4a90e2] hover:text-[#4a90e2] px-2.5 py-1 rounded transition-colors tracking-widest uppercase"
                          >
                            <ExternalLink size={10} /> Receipt
                          </a>
                          {ord.paymentVerified && (
                            <span className="text-[9px] font-bold text-green-600 tracking-widest uppercase flex items-center gap-1"><Check size={12} className="text-green-500" /> Verified</span>
                          )}
                        </div>
                      ) : <span className="text-[9px] text-gray-400 italic">N/A</span>}
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex flex-col gap-2 items-center w-full max-w-[120px] mx-auto">
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-center justify-center gap-1 w-full">
                          {ord.isBulk ? (
                            <span className={`inline-flex items-center justify-center w-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full border ${
                              ord.orderStatus === 'Completed' || ord.orderStatus === 'Delivered' ? 'bg-[#43a047] text-white border-[#4cae4c]'
                              : ord.orderStatus === 'Dispatched' ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : ord.orderStatus === 'Accepted' || ord.orderStatus === 'Processing' ? 'bg-gray-50 text-paa-navy border-gray-200'
                              : ord.orderStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                            }`}>
                              {ord.orderStatus === 'Completed' ? 'Delivered' : (ord.orderStatus || 'Pending')}
                            </span>
                          ) : ord.status === 'Pending Verification' || ord.status === 'Pending' ? (
                            <span className="inline-flex items-center justify-center w-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
                              Pending
                            </span>
                          ) : (
                            <>
                              {editingStatusOrderId === String(ord.orderId) ? (
                                <select
                                  className={`text-[9px] py-1.5 px-2 uppercase font-bold w-full text-center rounded-full border shadow-sm outline-none cursor-pointer ${ord.status === 'Completed' ? 'bg-[#43a047] text-white border-[#4cae4c]'
                                      : ord.status === 'Dispatched' ? 'bg-white text-blue-800 border-blue-200'
                                        : ord.status === 'Accepted' ? 'bg-[#eef2f6] text-paa-navy border-[#8faadc]'
                                          : ord.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                    }`}
                                  value={ord.status === 'Completed' ? 'Delivered' : ord.status}
                                  disabled={loadingAction !== null}
                                  onChange={(e) => {
                                    handleStatusChange(ord.itemIds, e.target.value);
                                    setEditingStatusOrderId(null);
                                  }}
                                  onBlur={() => setEditingStatusOrderId(null)}
                                  autoFocus
                                >
                                  <option value="Accepted">Accepted</option>
                                  <option value="Dispatched">Dispatched</option>
                                </select>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (ord.status !== 'Rejected' && ord.status !== 'Completed' && ord.status !== 'Delivered') {
                                      setEditingStatusOrderId(String(ord.orderId));
                                    }
                                  }}
                                  disabled={ord.status === 'Rejected' || ord.status === 'Completed' || ord.status === 'Delivered'}
                                  className={`group flex items-center justify-between w-full px-3 py-1.5 rounded-full border transition-all ${
                                    ord.status === 'Completed' ? 'bg-[#43a047] text-white border-[#4cae4c] cursor-default'
                                    : ord.status === 'Dispatched' ? 'bg-blue-50 text-blue-800 border-blue-200  cursor-pointer'
                                    : ord.status === 'Accepted' ? 'bg-gray-50 text-paa-navy border-gray-200 hover:bg-gray-100 cursor-pointer'
                                    : ord.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 cursor-default'
                                    : 'bg-yellow-50 text-yellow-800 border-yellow-200 cursor-default'
                                  }`}
                                  title={ord.status !== 'Rejected' && ord.status !== 'Completed' && ord.status !== 'Delivered' ? 'Click to Edit Status' : ''}
                                >
                                  <span className="text-[9px] font-bold uppercase tracking-widest mx-auto">{ord.status}</span>
                                  {ord.status !== 'Rejected' && ord.status !== 'Completed' && ord.status !== 'Delivered' && (
                                    <Edit2 size={10} className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                                  )}
                                </button>
                              )}
                            </>
                          )}
                          {(ord.status === 'Dispatched' || ord.orderStatus === 'Dispatched' || ord.status === 'Delivered' || ord.status === 'Completed' || ord.orderStatus === 'Delivered' || ord.orderStatus === 'Completed') && ord.dispatchedAt && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase mt-0.5">
                              Disp: {new Date(ord.dispatchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {(ord.status === 'Delivered' || ord.status === 'Completed' || ord.orderStatus === 'Delivered' || ord.orderStatus === 'Completed') && ord.deliveredAt && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase mt-0.5">
                              Del: {new Date(ord.deliveredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        
                        {/* Rejection Reason Text */}
                        {ord.status === 'Rejected' && ord.rejectionReason && (
                          <div className="mt-0.5 text-[9px] text-red-600 truncate w-full text-center" title={ord.rejectionReason}>
                            Reason: {ord.rejectionReason}
                          </div>
                        )}
                        
                        {/* Delivery Feedback */}
                        {ord.feedbackRating && (
                          <div className="mt-1 flex flex-col items-center justify-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded w-full">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={10}
                                  className={star <= ord.feedbackRating ? "text-amber-500 fill-amber-500" : "text-gray-300"}
                                />
                              ))}
                            </div>
                            {ord.feedbackCondition && (
                              <span className={`text-[8px] font-bold uppercase tracking-widest ${ord.feedbackCondition === 'Damaged' ? 'text-red-600' : 'text-green-600'}`}>
                                {ord.feedbackCondition}
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex flex-col gap-2 items-center w-full max-w-[120px] mx-auto">
                        {/* Approve / Reject Actions */}
                        {(ord.status === 'Pending Verification' || ord.status === 'Pending') && !ord.isBulk && (
                          <div className="flex w-full gap-1.5">
                            <button
                              onClick={() => handleApprove(ord.itemIds)}
                              disabled={loadingAction !== null}
                              className="flex-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 rounded border border-green-700 shadow-sm"
                            >
                              {loadingAction === String(ord.itemIds[0]) ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectItemId(ord.itemIds); setRejectReasons(['Item out of stock']); setOtherRejectReason(''); }}
                              disabled={loadingAction !== null}
                              className="flex-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 rounded shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* View Button */}
                        <button
                          onClick={() => setViewBuyerInfoOrder(ord)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-paa-navy hover:bg-gray-50 text-gray-600 rounded transition-colors text-[9px] font-bold uppercase tracking-widest shadow-sm"
                        >
                          <Eye size={12} className="text-gray-400" /> View Details
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {loadingAction !== null && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-paa-navy">
          <div className="w-12 h-12 border-4 border-paa-navy border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-serif text-2xl font-medium">Processing Order...</p>
        </div>
      )}
    </div>
  );
}

function FormsWrapper() {
  const [forms, setForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('Literary Events');
  const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const fetchForms = async () => {
    try {
      const res = await axios.get(`${API}/api/author/forms`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setForms(res.data);
    } catch (err) { }
  };

  useEffect(() => { fetchForms(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const answers: any = {};
    for (let [key, value] of formData.entries()) {
      answers[key] = value;
    }
    try {
      await axios.post(`${API}/api/author/forms/${selectedForm.id}/submit`, { answers }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      alert("Form submitted successfully!");
      setSelectedForm(null);
      fetchForms();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error submitting form");
    }
  };

  const tabs = ['Literary Events', 'Book Fairs', 'Flybraries & Libraries', 'Book CafÃ©'];
  const filteredForms = forms.filter(f => f.type === activeTab);




  return (
    <div>
      <h1 className="text-4xl font-serif text-paa-navy mb-8">Registration Forms</h1>
      <p className="text-sm mb-4 text-gray-500">Available forms published by administration for you to complete.</p>

      {!selectedForm && (
        <div className="flex gap-4 mb-8 border-b border-paa-navy/5 pb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-paa-navy text-paa-cream' : 'text-paa-navy border border-paa-navy hover:bg-paa-navy/5'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {selectedForm ? (
        <div className="bg-white p-8 border border-paa-navy/5 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-paa-navy">{selectedForm.title}</h2>
            <button onClick={() => setSelectedForm(null)} className="text-sm font-bold uppercase tracking-widest text-paa-gray-text hover:text-paa-navy">Cancel</button>
          </div>
          <p className="text-sm text-gray-500 mb-8">{selectedForm.description}</p>
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleSubmit} className="space-y-6">
            {selectedForm.fields.map((field: any, i: number) => (
              <div key={i}>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">{field.name}</label>
                {field.type === 'textarea' ? (
                  <textarea name={field.name} required className="w-full p-3 border border-gray-300 rounded-3xl-2xl focus:border-paa-navy focus:outline-none" rows={4}></textarea>
                ) : field.type === 'select' ? (
                  <select name={field.name} required className="w-full p-3 border border-gray-300 rounded-3xl-2xl focus:border-paa-navy focus:outline-none bg-white">
                    <option value="">Select...</option>
                    {field.options?.map((opt: string, j: number) => <option key={j} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input type="text" name={field.name} required className="w-full p-3 border border-gray-300 rounded-3xl-2xl focus:border-paa-navy focus:outline-none" />
                )}
              </div>
            ))}
            <button type="submit" className="w-full bg-paa-navy text-paa-cream font-bold uppercase tracking-widest py-4 hover:bg-paa-gold transition-colors mt-8 rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
              Submit Form
            </button>
          </form>
</FocusTrap>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredForms.map((f: any) => (
            <div key={f.id} className="bg-white p-8 border border-paa-navy/5 flex flex-col items-start gap-4 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-paa-navy">{f.title}</h3>
              <p className="text-sm text-gray-500 flex-1">{f.description}</p>
              {f.submitted ? (
                <span className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest border border-green-200">
                  Submitted
                </span>
              ) : (
                <button
                  onClick={() => setSelectedForm(f)}
                  className="px-6 py-2 bg-paa-navy text-paa-cream text-xs font-bold uppercase tracking-widest hover:bg-paa-gold transition-colors"
                >
                  Fill Form
                </button>
              )}
            </div>
          ))}
          {filteredForms.length === 0 && (
            <div className="col-span-full p-12 text-center border border-dashed border-gray-300 text-gray-500">
              No {activeTab} forms currently available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, allowOutsideClick: true, onDeactivate: onClose }}>
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" className="bg-white rounded-3xl-2xl max-w-2xl w-full shadow-premium overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-bold text-paa-navy">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-500 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}

function EventsDashboard({ registrations, dashboardData, initialView = 'events' }: any) {
  const navigate = useNavigate();
  const [isOptInModalOpen, setIsOptInModalOpen] = useState(false);
  const [isSubmittingOptIn, setIsSubmittingOptIn] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<any>(null);
  const [showProposeEventModal, setShowProposeEventModal] = useState(false);
  const [proposeEventForm, setProposeEventForm] = useState({ name: '', location: '', date: '', duration: '', eventType: 'Book Fair', description: '' });
  const [isProposingEvent, setIsProposingEvent] = useState(false);
  const [optInBooks, setOptInBooks] = useState<any[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | number | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  const handleOpenOptIn = (evt: any) => {
    setSelectedInvite(evt);
    // Initialize all books as included with default stock capped by availableStock
    setOptInBooks(books.map((b: any) => ({ bookId: b.id.toString(), title: b.title, stock: Math.min(10, b.stock || 0), included: true, availableStock: b.stock || 0 })));
    setPaymentScreenshot(null);
    setTransactionId('');
    setIsOptInModalOpen(true);
  };

  const handleOptInSubmit = async (action: 'approve' | 'reject') => {
    try {
      setIsSubmittingOptIn(true);
      if (action === 'approve') {
        const fd = new FormData();
        const includedBooks = optInBooks.filter(b => b.included);
        fd.append('booksToLink', JSON.stringify(includedBooks));
        if (paymentScreenshot) {
          fd.append('paymentScreenshot', paymentScreenshot);
        }
        if (transactionId) {
          fd.append('transactionId', transactionId);
        }
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/events/${selectedInvite.id}/opt-in`, fd, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Successfully opted into event!');

        // ── Optimistic UI: the event may be in availableEvents OR invites ──
        // Remove it from availableEvents (it's no longer open to register)
        setAvailableEvents((prev: any[]) => prev.filter((e: any) => e.id !== selectedInvite.id));

        // Update invites: either flip existing record OR inject a synthetic one
        setInvites((prev: any[]) => {
          const exists = prev.some((inv: any) => (inv.eventId || inv.event?.id) === selectedInvite.id);
          if (exists) {
            return prev.map((inv: any) =>
              (inv.eventId || inv.event?.id) === selectedInvite.id
                ? { ...inv, optInStatus: 'Pending Approval' }
                : inv
            );
          }
          // Inject synthetic invite so the row appears with correct status
          return [...prev, {
            eventId: selectedInvite.id,
            optInStatus: 'Pending Approval',
            event: selectedInvite,
            manualTotalSold: null,
            manualTotalRevenue: null,
            paymentStatus: null,
            transactionId: transactionId || null,
            paymentProofUrl: null,
          }];
        });

        setExpandedEventId(null); // collapse the row
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/events/${selectedInvite.id}/opt-out`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Event invite declined.');
        // Optimistically update the invite status
        setInvites((prev: any[]) =>
          prev.map((inv: any) =>
            (inv.eventId || inv.event?.id) === selectedInvite.id
              ? { ...inv, optInStatus: 'Declined' }
              : inv
          )
        );
        setAvailableEvents((prev: any[]) => prev.filter((e: any) => e.id !== selectedInvite.id));
        setExpandedEventId(null);
      }
      setIsOptInModalOpen(false);
      // Background refresh — cache is already busted server-side so this returns fresh data
      fetchAuthorEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to process event invite');
    } finally {
      setIsSubmittingOptIn(false);
    }
  };
  const activeTab = initialView;
  const [bpSort, setBpSort] = useState('date_desc');
  const [bpSearch, setBpSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [sortOpen, setSortOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [listedBooks, setListedBooks] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('All');

  // Tab 2 State
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');

  // Tab 3 State
  const [t3EventFilter, setT3EventFilter] = useState('ALL');
  const [t3YearFilter, setT3YearFilter] = useState('ALL');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAuthorEvents();
  }, []);

  const fetchAuthorEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvites(res.data.eventInvites || []);
      setBooks(res.data.books || []);
      setListedBooks(res.data.listedBooks || []);
      setPastEvents(res.data.pastEvents || []);
      setAvailableEvents(res.data.availableEvents || []);
      if (res.data.books && res.data.books.length > 0) {
        setSelectedBookIds(res.data.books.map((b: any) => b.id.toString()));
      }
    } catch (err: any) {
      toast.error('Failed to load events: ' + (err.response?.data?.details || err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEventPayment = async (eventId: number | string, file: File, isEventAuthor: boolean, transactionId?: string) => {
    try {
      const fd = new FormData();
      fd.append('paymentScreenshot', file);
      if (transactionId) {
        fd.append('transactionId', transactionId);
      }
      
      const parsedId = typeof eventId === 'string' && eventId.startsWith('act_') ? eventId.replace('act_', '') : eventId;
      const url = isEventAuthor
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/events/${parsedId}/pay`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/activities/${parsedId}/pay`;
      
      await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Payment submitted successfully!');
      fetchAuthorEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit payment');
    }
  };

  // Combine invites and past events for the events list
  const allEvents = [
    ...(registrations || []).map((r: any) => ({
      id: 'act_' + r.activityId,
      name: r.activity?.name || 'Unknown Event',
      startDate: r.activity?.date,
      location: r.activity?.city,
      type: r.activity?.type || 'Activity',
      registration: r.status,
      paymentStatus: r.paymentStatus || (r.amount > 0 ? 'Paid' : 'Unpaid'),
      amountPaid: r.amount || 0,
      paymentProofUrl: r.paymentScreenshot,
      transactionId: r.transactionId,
      isActivity: true
    })),
    ...invites.filter((inv: any) => !inv.optInStatus?.includes('-Draft')).map((inv: any) => {
      const eventBooks = listedBooks.filter((lb: any) => lb.eventId === (inv.eventId || inv.event?.id));
      const hasGranular = eventBooks.some((lb: any) => (lb.soldStock > 0 || lb.returnedStock > 0));
      let calcPaid = 0;
      if (inv.optInStatus === 'Registered' || inv.optInStatus === 'Approved' || inv.optInStatus === 'Pending Approval') {
         if (inv.event?.feeType === 'Per Title') {
             calcPaid = (inv.event?.registrationFee || 0) * eventBooks.length;
         } else {
             calcPaid = (inv.event?.registrationFee || 0);
         }
      }
      return {
        ...inv.event,
        amountPaid: calcPaid,
        registration: inv.optInStatus,
        paymentStatus: inv.paymentStatus,
        transactionId: inv.transactionId,
        paymentProofUrl: inv.paymentScreenshot || inv.paymentProofUrl || inv.paymentScreenshotUrl || inv.paymentProof,
        manualTotalSold: inv.manualTotalSold,
        manualTotalRevenue: inv.manualTotalRevenue,
        isPast: inv.event?.status === 'Past' || inv.event?.status === 'Legacy Archive' || (inv.event?.date && new Date(inv.event.date) < new Date()),
        isInvite: true,
        isDataUpdated: inv.manualTotalSold !== null || hasGranular || inv.event?.broadcastStatus === 'Published',
        aggSold: inv.event?.aggSold || 0,
        aggRevenue: inv.event?.aggRevenue || 0,
        aggAuthors: inv.event?.aggAuthors || 0
      };
    }),
    ...availableEvents.map((evt: any) => ({
      ...evt,
      registration: 'Pending',
      paymentStatus: '-',
      isPast: evt.status === 'Past' || (evt.date && new Date(evt.date) < new Date()),
      isInvite: true
    })),
    ...pastEvents.filter((pe: any) => pe.broadcastStatus === 'Published' && !invites.some((inv: any) => inv.eventId === pe.id && !inv.optInStatus?.includes('-Draft'))).map((evt: any) => ({
      ...evt,
      registration: 'Not Participated',
      paymentStatus: '-',
      manualTotalSold: evt.aggSold || 0,
      manualTotalRevenue: evt.aggRevenue || 0,
      aggAuthors: evt.aggAuthors || 0,
      isPast: true,
      isInvite: false,
      isDataUpdated: true
    }))
  ].filter((evt: any) => {
     if (evt.status === 'Legacy Archive' && evt.broadcastStatus !== 'Published') {
         return false;
     }
     return true;
  });

  const getEventBooks = (eventId: number) => listedBooks.filter((lb: any) => lb.eventId === eventId);
  const getPastEventBooks = (eventId: number) => {
    const pe = pastEvents.find(p => p.eventId === eventId);
    return pe?.books || [];
  };

  const handleOpenRegistrationForm = (evt: any, isReapply: boolean = false) => {
    setSelectedInvite(evt);
    setExpandedEventId(evt.id);

    if (isReapply) {
        const previousEventBooks = getEventBooks(evt.id);
        const hasPreviousBooks = previousEventBooks && previousEventBooks.length > 0;
        
        setOptInBooks(books.map((b: any) => {
            if (hasPreviousBooks) {
                const prevBook = previousEventBooks.find((pb: any) => pb.bookId === b.id);
                if (prevBook) {
                    return {
                        bookId: b.id.toString(),
                        title: b.title,
                        stock: Math.max(1, prevBook.listedStock || Math.min(10, b.stock || 0)),
                        included: true,
                        availableStock: b.stock || 0
                    };
                } else {
                    return {
                        bookId: b.id.toString(),
                        title: b.title,
                        stock: 0,
                        included: false,
                        availableStock: b.stock || 0
                    };
                }
            }
            return {
                bookId: b.id.toString(),
                title: b.title,
                stock: Math.min(10, b.stock || 0),
                included: true,
                availableStock: b.stock || 0
            };
        }));
        setPaymentScreenshot(null);
        setTransactionId(evt.transactionId || '');
    } else {
        setOptInBooks(books.map((b: any) => ({ bookId: b.id.toString(), title: b.title, stock: Math.min(10, b.stock || 0), included: true, availableStock: b.stock || 0 })));
        setPaymentScreenshot(null);
        setTransactionId('');
    }
  };

  const validParticipations = allEvents.filter((evt: any) => {
    if (evt.registration === 'Registered' || evt.registration === 'Approved' || evt.registration === 'Pending Approval') return true;
    if (evt.status === 'Legacy Archive') return false;
    if (evt.isPast) {
      if (evt.isDataUpdated && (evt.isInvite ? getEventBooks(evt.id).length > 0 : getPastEventBooks(evt.id).length > 0)) return true;
    }
    return false;
  });

  const handleProposeEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    setIsProposingEvent(true);
    try {
      const formFd = new FormData(target);
      const fd = new FormData();
      if (formFd.get('name')) fd.append('name', formFd.get('name') as string);
      if (formFd.get('date')) fd.append('date', formFd.get('date') as string);
      if (formFd.get('location')) fd.append('location', formFd.get('location') as string);
      
      const days = formFd.get('durationDays') as string;
      const hours = formFd.get('durationHours') as string;
      let durationStr = [];
      if (days && parseInt(days) > 0) durationStr.push(`${days} Days`);
      if (hours && parseInt(hours) > 0) durationStr.push(`${hours} Hours`);
      fd.append('duration', durationStr.length > 0 ? durationStr.join(', ') : '');

      if (formFd.get('startTime')) fd.append('startTime', formFd.get('startTime') as string);
      if (formFd.get('endTime')) fd.append('endTime', formFd.get('endTime') as string);
      
      const evtType = formFd.get('eventType') as string;
      if (evtType) fd.append('eventType', evtType === 'Other' ? (formFd.get('otherEventType') as string || 'Other') : evtType);
      
      if (formFd.get('registrationFee')) fd.append('registrationFee', formFd.get('registrationFee') as string);
      if (formFd.get('feeType')) fd.append('feeType', formFd.get('feeType') as string);
      if (formFd.get('description')) fd.append('description', formFd.get('description') as string);
      
      const bannerFile = formFd.get('banner');
      if (bannerFile && (bannerFile as File).size > 0) {
        fd.append('banner', bannerFile);
      }

      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/propose-event`, fd, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Event proposed successfully! It is now pending admin approval.');
      setShowProposeEventModal(false);
      fetchAuthorEvents();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to propose event');
    } finally {
      setIsProposingEvent(false);
    }
  };

  const filteredEvents = allEvents.filter((evt: any) => {
    const isLegacy = evt.status === 'Legacy Archive';
    
    if (eventFilter === 'UPCOMING' && (evt.isPast || isLegacy)) return false;
    if (eventFilter === 'PAST' && (!evt.isPast || isLegacy)) return false;
    if (eventFilter === 'LEGACY ARCHIVE' && !isLegacy) return false;
    if (eventFilter === 'PARTICIPATED' && (evt.registration !== 'Registered' && evt.registration !== 'Approved')) return false;
    if (eventFilter === 'TODAY' && (isLegacy || new Date(evt.startDate || evt.date).toDateString() !== new Date().toDateString())) return false;
    
    if (bpSearch) {
        return (evt.name || '').toLowerCase().includes(bpSearch.toLowerCase()) ||
               (evt.location || '').toLowerCase().includes(bpSearch.toLowerCase());
    }
    return true;
  }).sort((a: any, b: any) => {
    const getRev = (evt: any) => {
        if (evt.status === 'Legacy Archive') return evt.aggRevenue || 0;
        if (evt.manualTotalRevenue != null) return evt.manualTotalRevenue;
        let r = 0;
        (evt.isInvite ? getEventBooks(evt.id) : (evt.books || [])).forEach((bk: any) => r += (bk.soldStock || 0) * (bk.mrp || bk.book?.mrp || 0));
        return r;
    };
    const getSold = (evt: any) => {
        if (evt.status === 'Legacy Archive') return evt.aggSold || 0;
        if (evt.manualTotalSold != null) return evt.manualTotalSold;
        let s = 0;
        (evt.isInvite ? getEventBooks(evt.id) : (evt.books || [])).forEach((bk: any) => s += (bk.soldStock || 0));
        return s;
    };
    
    if (bpSort === 'revenue_desc') return getRev(b) - getRev(a);
    if (bpSort === 'revenue_asc') return getRev(a) - getRev(b);
    if (bpSort === 'sold_desc') return getSold(b) - getSold(a);
    if (bpSort === 'participation_desc') return (b.participationPercentage ?? -1) - (a.participationPercentage ?? -1);
    if (bpSort === 'date_desc') return new Date(b.date || b.startDate).getTime() - new Date(a.date || a.startDate).getTime();
    if (bpSort === 'date_asc') return new Date(a.date || a.startDate).getTime() - new Date(b.date || b.startDate).getTime();
    return 0;
  });

  const handleExportEventsExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Event Ecosystem');

      sheet.columns = [
        { key: 'name', width: 35 },
        { key: 'date', width: 15 },
        { key: 'location', width: 25 },
        { key: 'type', width: 15 },
        { key: 'status', width: 15 },
        { key: 'participation', width: 20 },
        { key: 'payment', width: 15 },
        { key: 'amountPaid', width: 15 },
        { key: 'sold', width: 15 },
        { key: 'revenue', width: 15 },
      ];

      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'AUTHOR EVENT ECOSYSTEM REPORT';
      titleCell.font = { bold: true, size: 12 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
      titleCell.border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' }, bottom: { style: 'medium' } };

      const headerRow = sheet.addRow({
        name: 'Event Name',
        date: 'Date',
        location: 'Location',
        type: 'Type',
        status: 'Status',
        participation: 'Participation',
        payment: 'Payment Status',
        amountPaid: 'Amount Paid (₹)',
        sold: 'Copies Sold',
        revenue: 'Revenue (₹)'
      });

      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      filteredEvents.forEach((evt: any) => {
        const getRev = (evt: any) => {
          if (evt.status === 'Legacy Archive') return evt.aggRevenue || 0;
          if (evt.manualTotalRevenue != null) return evt.manualTotalRevenue;
          let r = 0;
          (evt.isInvite ? getEventBooks(evt.id) : (evt.books || [])).forEach((bk: any) => r += (bk.soldStock || 0) * (bk.mrp || bk.book?.mrp || 0));
          return r;
        };
        const getSold = (evt: any) => {
          if (evt.status === 'Legacy Archive') return evt.aggSold || 0;
          if (evt.manualTotalSold != null) return evt.manualTotalSold;
          let s = 0;
          (evt.isInvite ? getEventBooks(evt.id) : (evt.books || [])).forEach((bk: any) => s += (bk.soldStock || 0));
          return s;
        };

        const typeStr = evt.type || evt.eventType || 'Event';
        const statusStr = evt.status || (evt.isPast ? 'Past' : 'Upcoming');
        const partStr = evt.registration || 'N/A';
        const payStr = evt.paymentStatus || '-';

        const addedRow = sheet.addRow({
          name: evt.name || evt.title || 'Unknown',
          date: new Date(evt.startDate || evt.date).toLocaleDateString(),
          location: evt.location || evt.venue || 'N/A',
          type: typeStr,
          status: statusStr,
          participation: partStr,
          payment: payStr,
          amountPaid: evt.amountPaid || 0,
          sold: getSold(evt),
          revenue: getRev(evt),
        });
        
        addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          let colBgColor = 'FFFFFF';
          if (colNumber <= 2) colBgColor = 'FF8B8B'; // Red
          else if (colNumber <= 4) colBgColor = 'FFD2A3'; // Orange
          else if (colNumber <= 6) colBgColor = 'D4D8DD'; // Gray
          else if (colNumber <= 8) colBgColor = 'B3E5FC'; // Cyan
          else if (colNumber === 9) colBgColor = 'DDA0DD'; // Lavender
          else colBgColor = 'C8E6C9'; // Green
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
        });

        // Coloring Payment Status
        let payColor = 'FFFFFFFF';
        if (payStr.toUpperCase() === 'PAID' || payStr.toUpperCase() === 'CONFIRMED') payColor = 'FF86EFAC'; // Light Green
        else if (payStr.toUpperCase() === 'UNPAID') payColor = 'FFFCA5A5'; // Light Red
        else if (payStr.toUpperCase() === 'PENDING') payColor = 'FFFEF08A'; // Yellow
        addedRow.getCell('payment').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: payColor } };

        // Coloring Metrics (Sky Blue)
        addedRow.getCell('amountPaid').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } };
        addedRow.getCell('sold').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } };
        addedRow.getCell('revenue').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } };

        // Align numbers
        addedRow.getCell('amountPaid').alignment = { horizontal: 'center' };
        addedRow.getCell('sold').alignment = { horizontal: 'center' };
        addedRow.getCell('revenue').alignment = { horizontal: 'center' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Author_Event_Ecosystem_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Events data');
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(n => <div key={n} className="h-24 bg-gray-100 animate-pulse rounded-xl"></div>)}
      </div>
      <div className="h-64 bg-gray-100 animate-pulse rounded-xl"></div>
      <div className="space-y-4">
        {[1,2,3].map(n => <div key={n} className="h-16 bg-gray-100 animate-pulse rounded-xl"></div>)}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl events-ecosystem">


      {activeTab === 'events' && (
        <div className="space-y-6">
          {(() => {
             const isSpecialAuthor = dashboardData?.authorProfile?.email === 'arvindpuri1492@gmail.com';
             const livePosEvents = allEvents.filter((evt: any) => ((evt.livePosEnabled && evt.status === 'Live') || (isSpecialAuthor && !evt.isPast)) && (evt.registration === 'Registered' || evt.registration === 'Approved'));
             if (livePosEvents.length === 0) return null;
             return (
               <div className="mb-8 animate-fade-in-up space-y-4">
                 {livePosEvents.map((evt: any) => (
                    <div key={evt.id} className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 md:p-8 border-2 border-indigo-400/30 shadow-premium flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
                       <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl -ml-20 -mb-20 transition-transform duration-700 group-hover:scale-110"></div>
                       
                       <div className="relative z-10 flex-1 w-full text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                             <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Active Now</span>
                          </div>
                          <h3 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight mb-2 drop-shadow-md">{evt.name}</h3>
                          <p className="text-blue-100/80 text-xs font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-3 mt-3">
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {evt.location || evt.venue || 'TBA'}</span>
                              <span className="text-blue-500">&bull;</span>
                              <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5"/> {new Date(evt.startDate || evt.date).toLocaleDateString()}</span>
                          </p>
                       </div>
                       
                       <div className="relative z-10 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                          <button 
                             onClick={(e) => { e.stopPropagation(); window.open('/dashboard/pos/' + evt.id, '_blank'); }} 
                             className="w-full md:w-auto bg-[#ccff00] text-black hover:bg-[#b3e600] px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(204,255,0,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3"
                          >
                             <ShoppingCart className="w-5 h-5" />
                             Launch POS
                          </button>
                       </div>
                    </div>
                 ))}
               </div>
             );
          })()}
          {(() => {
             const pendingActionEvents = allEvents.filter((evt: any) => evt.registration === 'Pending' && !evt.isPast);
             if (pendingActionEvents.length === 0) return null;
             return (
               <div className="mb-8 animate-fade-in-up">
                 <div className="flex items-center gap-3 mb-5">
                   <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-200 shadow-sm shrink-0">
                     <AlertCircle className="w-5 h-5 text-red-600" />
                   </div>
                   <div>
                     <h3 className="text-lg font-serif font-black text-paa-navy leading-tight">Pending Event Invitations</h3>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Requires your immediate action</p>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                   {pendingActionEvents.map((evt: any) => (
                     <div key={evt.id} className="bg-white rounded-2xl p-6 border border-paa-navy/10 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-orange-400"></div>

                       {evt.bannerUrl && (
                         <div className="w-full h-32 relative mb-0 rounded-xl overflow-hidden shadow-inner border border-black/10 z-10">
                           <img src={evt.bannerUrl.startsWith('http') ? evt.bannerUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${evt.bannerUrl}`} alt="Banner" className="w-full h-full object-cover" style={{ objectPosition: 'center 20%' }} />
                         </div>
                       )}

                       <div className="flex justify-between items-start gap-4 relative z-10">
                         <div className="flex-1">
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#ccff00] text-[9px] font-black uppercase tracking-widest rounded-md mb-3 shadow-md">
                             <span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]"></span> Action Needed
                           </span>
                           <h4 className="font-serif font-black text-gray-900 text-2xl leading-tight mb-1.5 drop-shadow-sm">{evt.name}</h4>
                           <p className="text-[11px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-gray-600"/> {new Date(evt.startDate || evt.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                       
                       <div className="bg-black/5 rounded-xl p-3 border border-black/10 relative z-10">
                         <p className="text-xs font-black text-gray-800 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-600"/> {evt.location || evt.venue || 'TBA'}</p>
                       </div>
                       
                       <div className="mt-auto pt-2 flex justify-between items-center relative z-10">
                         <div>
                           <div className="text-[9px] font-bold text-gray-700 uppercase tracking-widest mb-0.5">Registration Fee</div>
                           <div className="text-sm font-black text-gray-900 drop-shadow-sm">{evt.registrationFee ? `₹${evt.registrationFee}${evt.feeType === 'Per Title' ? '/title' : ''}` : 'Free'}</div>
                         </div>
                         <button 
                           onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedInvite(evt);
                              setOptInBooks(books.map((b: any) => ({ bookId: b.id.toString(), title: b.title, stock: Math.min(10, b.stock || 0), included: true, availableStock: b.stock || 0 })));
                              setPaymentScreenshot(null);
                              setExpandedEventId(evt.id);
                              setTimeout(() => {
                                 document.getElementById('event-row-' + evt.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                           }} 
                           className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-1.5 border-2 border-transparent hover:border-red-400"
                         >
                           Register Now <ChevronRight className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             );
          })()}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-emerald-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
              <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-200" /> Event Participation</div>
              <div className="text-3xl font-black text-white tracking-tight">
                {dashboardData?.authorProfile?.aggEligibleEvents && dashboardData?.authorProfile?.aggEligibleEvents > 0 
                  ? `${Math.round((dashboardData.authorProfile.aggParticipatedEvents / dashboardData.authorProfile.aggEligibleEvents) * 100)}%` 
                  : 'N/A'}
              </div>
              <div className="text-xs text-emerald-50 mt-2 font-medium opacity-90">
                {dashboardData?.authorProfile?.aggParticipatedEvents || 0} / {dashboardData?.authorProfile?.aggEligibleEvents || 0} Events
              </div>
            </div>
            
            <div className="bg-cyan-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
              <div className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-cyan-200" /> Total Events</div>
              <div className="text-3xl font-black text-white tracking-tight">{validParticipations.length}</div>
              <div className="text-xs text-cyan-50 mt-2 font-medium opacity-90">Fairs: {validParticipations.filter((evt: any) => (evt.type || evt.eventType) === 'Book Fair').length} • Events: {validParticipations.filter((evt: any) => (evt.type || evt.eventType) !== 'Book Fair').length}</div>
            </div>
            
            <div className="bg-pink-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
              <div className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-pink-200" /> Total Books Sold</div>
              <div className="text-3xl font-black text-white tracking-tight">
                 {validParticipations.reduce((acc: number, evt: any) => {
                    let sold = 0;
                    if (evt.manualTotalSold !== null && evt.manualTotalSold !== undefined) {
                       sold = evt.manualTotalSold;
                    } else if (evt.isInvite) {
                       getEventBooks(evt.id).forEach((b: any) => sold += (b.soldStock || 0));
                    } else if (evt.isPast && evt.isDataUpdated) {
                       evt.books?.forEach((b: any) => sold += (b.soldStock || 0));
                    }
                    return acc + sold;
                 }, 0)}
              </div>
            </div>
            
            <div className="bg-purple-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
              <div className="text-[10px] font-bold text-purple-100 uppercase tracking-widest mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-purple-200" /> Total Revenue</div>
              <div className="text-3xl font-black text-white tracking-tight">
                 ₹{validParticipations.reduce((acc: number, evt: any) => {
                    let rev = 0;
                    if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                       rev = evt.manualTotalRevenue;
                    } else if (evt.isInvite) {
                       getEventBooks(evt.id).forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                    } else if (evt.isPast && evt.isDataUpdated) {
                       evt.books?.forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                    }
                    return acc + rev;
                 }, 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-rose-500/85 p-6 rounded-2xl border-none shadow-premium flex flex-col justify-center cursor-pointer hover:shadow-md transition-all group text-white" onClick={() => navigate('/dashboard/payments')}>
              <div className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mb-3 flex items-center gap-2 group-hover:text-white transition-colors"><CheckCircle2 className="w-4 h-4 text-rose-200" /> Total Payments Done</div>
              <div className="text-3xl font-black text-white tracking-tight">₹{validParticipations.reduce((sum: number, evt: any) => sum + (evt.amountPaid || 0), 0).toLocaleString()}</div>
              <div className="text-xs text-rose-50 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to view details &rarr;</div>
            </div>
            
            <div className="bg-blue-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
              <div className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-200" /> Event Profitability</div>
              <div className="text-3xl font-black text-white tracking-tight">
                 {(() => {
                    const totalRev = validParticipations.reduce((acc: number, evt: any) => {
                       let rev = 0;
                       if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                          rev = evt.manualTotalRevenue;
                       } else if (evt.isInvite) {
                          getEventBooks(evt.id).forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                       } else if (evt.isPast && evt.isDataUpdated) {
                          evt.books?.forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                       }
                       return acc + rev;
                    }, 0);
                    const totalPaid = validParticipations.reduce((sum: number, evt: any) => sum + (evt.amountPaid || 0), 0);
                    const net = totalRev - totalPaid;
                    return <span className={net >= 0 ? "text-white" : "text-red-100"}>{net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString()}</span>;
                 })()}
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-2xl border border-paa-navy/5 shadow-premium mt-6 mb-8">
            <h4 className="text-base font-bold text-paa-navy mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Event Profitability (Net Gain/Loss)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                   const profitData = validParticipations
                     .filter((evt: any) => evt.isPast && evt.name !== 'Unknown Event')
                     .map((evt: any) => {
                      let rev = 0;
                      if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                          rev = evt.manualTotalRevenue;
                      } else if (evt.isInvite) {
                          getEventBooks(evt.id).forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                      } else if (evt.isPast && evt.isDataUpdated) {
                          evt.books?.forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                      }
                      const cost = evt.amountPaid || 0;
                      return { name: evt.name || evt.title || 'Unknown', profit: rev - cost };
                   });
                   
                   if (profitData.length === 0) return <div className="flex items-center justify-center h-full text-sm text-gray-400 italic">No profitability data available.</div>;
                   
                   return (
                     <LineChart data={profitData} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} angle={-90} textAnchor="end" dy={10} interval={0} height={100} tickFormatter={(v) => v.length > 25 ? v.substring(0, 25) + '...' : v} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                       <Tooltip cursor={{ fill: '#F3F4F6' }} formatter={(value: number) => `₹${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                       <Line type="linear" dataKey="profit" name="Net Profit/Loss" stroke="#059669" strokeWidth={3} dot={(props: any) => { const { cx, cy, index } = props; return <circle cx={cx} cy={cy} r={4} fill="#059669" stroke="#fff" strokeWidth={2} key={`dot-${index}`} />; }} activeDot={{ r: 6 }}>
                         <LabelList dataKey="profit" position="top" content={(props: any) => {
                           const { x, y, value, index } = props;
                           const prev = profitData[index - 1]?.profit;
                           const next = profitData[index + 1]?.profit;
                           
                           let yPos = y - 12;
                           
                           if (prev !== undefined && next !== undefined && value <= prev && value <= next) {
                             yPos = y + 20;
                           } else if (prev !== undefined && value < prev && next === undefined) {
                             yPos = y + 20;
                           }

                           return (
                             <g>
                               <text x={x} y={yPos} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                               <text x={x} y={yPos} fill="#059669" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                             </g>
                           );
                         }} />
                       </Line>
                     </LineChart>
                   );
                })()}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-4">
             {/* Row 1: Toggle Buttons Only */}
             <div className="flex flex-nowrap gap-1 p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit max-w-full overflow-hidden shrink-0">
                 {['ALL', 'TODAY', 'PARTICIPATED', 'UPCOMING', 'PAST', 'LEGACY ARCHIVE'].map((f) => {
                   const count = allEvents.filter((evt: any) => {
                     const isLegacy = evt.status === 'Legacy Archive';
                     if (f === 'UPCOMING' && (evt.isPast || isLegacy)) return false;
                     if (f === 'PAST' && (!evt.isPast || isLegacy)) return false;
                     if (f === 'LEGACY ARCHIVE' && !isLegacy) return false;
                     if (f === 'PARTICIPATED' && (evt.registration !== 'Registered' && evt.registration !== 'Approved')) return false;
                     if (f === 'TODAY' && (isLegacy || new Date(evt.startDate || evt.date).toDateString() !== new Date().toDateString())) return false;
                     return true;
                   }).length;
                   return (
                   <button key={f} onClick={() => setEventFilter(f)} className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap ${eventFilter === f ? 'bg-paa-navy text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                     {f === 'ALL' ? 'All' : (f === 'PARTICIPATED' ? 'Participated' : (f === 'UPCOMING' ? 'Upcoming/Live' : (f === 'PAST' ? 'Past' : (f === 'LEGACY ARCHIVE' ? 'Legacy Archive' : (f === 'TODAY' ? 'Today' : '')))))}
                     <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${eventFilter === f ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
                   </button>
                 )})}
             </div>

             {/* Row 2: Actions & Search */}
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                   <button onClick={() => setShowProposeEventModal(true)} className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-sm h-[38px] whitespace-nowrap shrink-0">
                      + Propose
                   </button>
                   <button onClick={handleExportEventsExcel} className="px-5 py-2 bg-green-50 text-green-700 border border-green-200 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-green-100 transition-all shadow-sm h-[38px] whitespace-nowrap flex items-center gap-2 shrink-0">
                     <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export Excel</span><span className="sm:hidden">Export</span>
                   </button>
                </div>
                
                <div className="flex flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                   <div className="relative w-full sm:w-64 min-w-[150px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="text" placeholder="Search events..." value={bpSearch} onChange={e => setBpSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm h-[38px]" />
                   </div>
                 {/* ── Premium Sort Dropdown ── */}
                 {(() => {
                   const sortOptions = [
                     { value: 'date_desc',          label: 'Newest First',        icon: '↓' },
                     { value: 'date_asc',           label: 'Oldest First',        icon: '↑' },
                     { value: 'revenue_desc',       label: 'Highest Revenue',     icon: '₹' },
                     { value: 'revenue_asc',        label: 'Lowest Revenue',      icon: '₹' },
                     { value: 'sold_desc',          label: 'Most Copies Sold',    icon: '📦' },
                     { value: 'participation_desc', label: 'Top Participation %', icon: '%' },
                   ];
                   const selectedOption = sortOptions.find(o => o.value === bpSort) || sortOptions[0];
                   return (
                     <div className="relative" id="events-sort-dropdown">
                       <button
                         onClick={() => setSortOpen(v => !v)}
                         className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 shadow-sm h-[38px] hover:border-indigo-300 hover:shadow-md transition-all duration-200 min-w-[200px] justify-between"
                       >
                         <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] hidden sm:block">Sort</span>
                           <span className="w-px h-3.5 bg-gray-200 hidden sm:block"></span>
                           <span className="text-xs font-bold text-paa-navy">{selectedOption.label}</span>
                         </div>
                         <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                         </svg>
                       </button>
                       {sortOpen && (
                         <>
                           <div className="fixed inset-0 z-[49]" onClick={() => setSortOpen(false)} />
                           <div className="absolute right-0 top-[calc(100%+6px)] z-50 bg-white border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden min-w-[215px] animate-fade-in-up">
                             <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Sort Events By</span>
                             </div>
                             <div className="py-1.5">
                               {sortOptions.map((opt) => (
                                 <button
                                   key={opt.value}
                                   onClick={() => { setBpSort(opt.value); setSortOpen(false); }}
                                   className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 group/item ${
                                     bpSort === opt.value
                                       ? 'bg-indigo-50 text-indigo-700'
                                       : 'text-gray-700 hover:bg-gray-50'
                                   }`}
                                 >
                                   <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                                     bpSort === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover/item:bg-gray-200'
                                   }`}>{opt.icon}</span>
                                   <span className="text-[12px] font-semibold flex-1">{opt.label}</span>
                                   {bpSort === opt.value && (
                                     <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                     </svg>
                                   )}
                                 </button>
                               ))}
                             </div>
                           </div>
                         </>
                       )}
                     </div>
                   );
                 })()}
              </div>
           </div>
        </div>
          

          

          <div className="bg-white rounded-xl shadow-premium border border-paa-navy/5 overflow-x-auto mb-8">
            <table className="w-full text-left border-collapse">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="px-2 py-3 w-12 text-center !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">S.No</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Event Name</th>
                  <th className="px-2 py-3 w-24 !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Date</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Format</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Category</th>
                  <th className="px-2 py-3 text-center !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Part. %</th>
                  <th className="px-2 py-3 text-right !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Books Sold</th>
                  <th className="px-2 py-3 text-right !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Revenue</th>
                  {eventFilter === 'LEGACY ARCHIVE' ? (
                    <th className="px-2 py-3 text-center !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Authors</th>
                  ) : (
                    <>
                      <th className="px-2 py-3 text-right !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Fee / Invest</th>
                      <th className="px-2 py-3 text-right !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Profit</th>
                    </>
                  )}
                  <th className="px-2 py-3 text-center !text-[11px] font-bold uppercase tracking-wider !text-cyan-700 !bg-transparent">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-sm text-paa-gray-text italic">No events found.</td></tr>}
                {filteredEvents.map((evt: any, i: number) => {
                  let sold = 0;
                  let rev = 0;
                  if (evt.status === 'Legacy Archive') {
                    sold = evt.aggSold || 0;
                    rev = evt.aggRevenue || 0;
                  } else if (evt.manualTotalSold !== null && evt.manualTotalSold !== undefined) {
                    sold = evt.manualTotalSold;
                    rev = evt.manualTotalRevenue || 0;
                  } else if (evt.isInvite) {
                    const evtBooks = getEventBooks(evt.id);
                    evtBooks.forEach((b: any) => {
                      sold += (b.soldStock || 0);
                      rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0);
                    });
                  } else if (evt.isPast && evt.isDataUpdated) {
                    evt.books?.forEach((b: any) => {
                      sold += (b.soldStock || 0);
                      rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0);
                    });
                  }

                  const catRowColorAuthor = i % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]';
                  return (
                    <React.Fragment key={i}>
                    <tr 
                      id={`event-row-${evt.id}`}
                      className={`cursor-pointer ${catRowColorAuthor} ${expandedEventId === evt.id ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      onClick={() => { 
                         if (expandedEventId === evt.id) {
                            setExpandedEventId(null);
                         } else {
                            const isReapply = evt.registration === 'Rejected' || evt.registration === 'Declined';
                            if (isReapply || (evt.isInvite && evt.registration === 'Pending' && !evt.isPast)) {
                               handleOpenRegistrationForm(evt, isReapply);
                            } else {
                               setExpandedEventId(evt.id);
                            }
                         }
                      }}
                    >
                      <td className="pl-6 pr-2 py-3 text-center align-middle">
                         <div className="flex items-center justify-center gap-2">
                           <span className="font-bold text-xs text-paa-navy">{i + 1}</span>
                           <button className="text-gray-400 transition-colors pointer-events-none">
                              {expandedEventId === evt.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                           </button>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="text-sm font-semibold text-paa-navy">{evt.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-paa-gray-text">{new Date(evt.startDate || evt.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                         <div className="flex flex-col items-start gap-1">
                             <div className="flex gap-1 mb-1 flex-wrap">
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm text-white ${evt.status === 'Legacy Archive' ? 'bg-slate-500' : (evt.isPast ? 'bg-purple-500/85' : 'bg-cyan-500/85')}`}>
                                   {evt.status === 'Legacy Archive' ? 'Legacy Archive' : (evt.type || (evt.isPast ? 'Past Event' : 'Upcoming/Live'))}
                                 </span>
                             </div>
                             {evt.eventType ? (
                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                                 evt.eventType === 'Meet the Authors' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                                 evt.eventType === 'Stall' ? 'bg-pink-200 text-pink-900 border border-pink-300' :
                                 'bg-gray-200 text-gray-700 border border-gray-300'
                               }`}>{evt.eventType}</span>
                             ) : <span className="text-gray-400 text-xs">-</span>}
                             {(evt.status === 'Legacy Archive' || evt.registration === 'Not Participated') && evt.aggAuthors > 0 && (
                               <div className="text-[11px] text-slate-700 font-bold font-mono mt-1.5 tracking-tight">{evt.aggAuthors} Authors</div>
                             )}
                         </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                         {evt.category ? (
                           <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                             evt.category === 'Housing Society' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                             evt.category === 'Corporate Office' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                             evt.category === 'Book Fair' ? 'bg-pink-200 text-pink-900 border border-pink-300' :
                             evt.category === 'College' ? 'bg-blue-200 text-blue-900 border border-blue-300' :
                             evt.category === 'University' ? 'bg-green-200 text-green-900 border border-green-300' :
                             'bg-gray-200 text-gray-700 border border-gray-300'
                           }`}>{evt.category}</span>
                         ) : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-center">{evt.participationPercentage !== undefined ? `${evt.participationPercentage}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-paa-navy text-right">
                        {sold > 0 || (evt.manualTotalSold !== null && evt.manualTotalSold !== undefined) ? sold : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-700 text-right">
                        {rev > 0 || (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) ? `₹${rev}` : '-'}
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">{evt.status === 'Legacy Archive' ? 'Total Event' : (evt.isPast ? 'Your Rev' : '-')}</div>
                      </td>
                      {eventFilter === 'LEGACY ARCHIVE' ? (
                        <td className="px-4 py-3 text-sm font-bold text-paa-navy text-center">
                           {evt.aggAuthors || '-'}
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-bold text-orange-700 text-right">
                             {evt.amountPaid ? `₹${evt.amountPaid}` : (evt.isPast ? '-' : (evt.registrationFee ? `₹${evt.registrationFee}` : '-'))}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-right">
                             {(() => {
                                 let gain = 0;
                                 if (evt.status === 'Legacy Archive') return <span className="text-gray-400 font-bold">NA</span>;
                                 if (evt.isPast) {
                                     let eventRev = 0;
                                     if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                                         eventRev = evt.manualTotalRevenue;
                                     } else {
                                         (evt.isInvite ? getEventBooks(evt.id) : (evt.books || [])).forEach((b: any) => eventRev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                                     }
                                     gain = eventRev - (evt.amountPaid || 0);
                                     return <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-sm inline-block ${gain >= 0 ? 'bg-white text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>{gain >= 0 ? '+' : '-'}₹{Math.abs(gain).toLocaleString()}</span>;
                                 }
                                 return <span className="text-gray-400">-</span>;
                             })()}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center">
                          {(() => {
                              let statusText = evt.registration;
                              let statusColors = 'bg-gray-100 text-gray-700';
                              
                              if (evt.registration === 'Approved' && evt.paymentStatus === 'Rejected' && !evt.paymentProofUrl && !evt.isPast) {
                                  statusText = 'REMAKE PAYMENT';
                                  statusColors = 'bg-red-500 text-white border-red-600 shadow-sm animate-pulse';
                              } else if (evt.registration === 'Approved' && (evt.registrationFee > 0 || evt.charges > 0) && evt.paymentStatus !== 'Paid' && evt.paymentStatus !== 'Pending Verification' && !evt.paymentProofUrl && !evt.isPast) {
                                  statusText = 'MAKE PAYMENT';
                                  statusColors = 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm animate-pulse';
                              } else if (evt.registration === 'Approved' && (evt.paymentProofUrl || evt.paymentStatus === 'Pending Verification')) {
                                  statusText = 'VERIFYING PAYMENT';
                                  statusColors = 'bg-blue-500 text-white border-blue-600 shadow-sm';
                              } else if (evt.registration === 'Registered' || evt.registration === 'Approved') {
                                  statusText = evt.isPast ? 'Participated' : 'Registered';
                                  statusColors = 'bg-emerald-500/85 text-white border-emerald-600 shadow-sm';
                              } else if (evt.registration === 'Rejected' || evt.registration === 'Declined') {
                                  statusText = evt.registration === 'Declined' ? 'Declined' : 'Rejected';
                                  statusColors = 'bg-red-500 text-white border-red-600 shadow-sm';
                              } else if (evt.registration === 'Pending Approval') {
                                  statusText = 'Pending Admin Approval';
                                  statusColors = 'bg-yellow-500 text-white border-yellow-600 shadow-sm';
                              } else if (!evt.registration || evt.registration === 'Unpublished' || evt.registration === 'Pending') {
                                  if (evt.isPast || evt.status === 'Legacy Archive' || evt.status === 'Past') {
                                      statusText = 'Not Participated';
                                      statusColors = 'bg-gray-500 text-white border-gray-600 shadow-sm';
                                  } else {
                                      return (
                                         <div className="flex flex-col items-center gap-2">
                                           <button 
                                              onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleOpenRegistrationForm(evt, false);
                                              }} 
                                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1"
                                           >
                                             REGISTER NOW <ChevronRight className="w-3 h-3" />
                                           </button>
                                         </div>
                                      );
                                  }
                              } else {
                                  // Fallback for any unhandled statuses on past events
                                  if (evt.isPast || evt.status === 'Legacy Archive' || evt.status === 'Past') {
                                      statusText = 'Not Participated';
                                      statusColors = 'bg-gray-500 text-white border-gray-600 shadow-sm';
                                  }
                              }
                              
                              return (
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusColors}`}>
                                    {statusText}
                                  </span>
                                  {((evt.livePosEnabled && evt.status === 'Live') || dashboardData?.authorProfile?.email === 'arvindpuri1492@gmail.com') && (evt.registration === 'Registered' || evt.registration === 'Approved') && (
                                    <button onClick={(e) => { e.stopPropagation(); window.open('/dashboard/pos/' + evt.id, '_blank'); }} className="mt-1.5 w-full max-w-[110px] flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap" title="Launch Point of Sale System">
                                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> LAUNCH POS
                                    </button>
                                  )}
                                  {(evt.registration === 'Rejected' || evt.registration === 'Declined') && (
                                    <>
                                      {evt.rejectionReason && (
                                        <div className="text-[9px] text-red-600 font-bold max-w-[120px] text-center leading-tight">
                                          {evt.rejectionReason}
                                        </div>
                                      )}
                                      <button 
                                         onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenRegistrationForm(evt, true);
                                         }}
                                         className="mt-1 flex items-center justify-center gap-1 text-[10px] font-black bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded shadow-sm transition-colors border border-red-100"
                                      >
                                         <RefreshCw className="w-3 h-3" /> REAPPLY
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                          })()}
                      </td>
                    </tr>
                    {expandedEventId === evt.id && (
                       <tr className="bg-[#f8fafc] border-b border-gray-100 shadow-inner">
                          <td colSpan={11} className="p-0">
                             <div className="flex flex-col xl:flex-row gap-8 px-8 py-6 border-l-4 border-indigo-400 ml-6 my-4 bg-white rounded-r-xl shadow-sm mr-6">
                                <div className="flex-1 min-w-[300px] flex flex-col gap-5">
                                   <div className="flex gap-6">
                                      {evt.bannerUrl && (
                                        <div className="w-40 shrink-0">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Event Banner</p>
                                            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-video relative group">
                                              <img src={evt.bannerUrl.startsWith('http') ? evt.bannerUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${evt.bannerUrl}`} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                        </div>
                                      )}
                                      <div className="flex flex-col gap-4">
                                         <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</p>
                                            <p className="text-sm text-paa-navy font-semibold">{evt.location || evt.venue || 'TBA'}</p>
                                         </div>
                                         <div className="flex gap-6">
                                            <div>
                                               <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Date & Timings</p>
                                               <p className="text-sm text-paa-navy font-semibold">{new Date(evt.startDate || evt.date).toLocaleDateString()} • {(evt.startTime && evt.endTime) ? `${evt.startTime}-${evt.endTime}` : 'TBA'}</p>
                                               {((evt.livePosEnabled) || dashboardData?.authorProfile?.email === 'arvindpuri1492@gmail.com') && (evt.registration === 'Registered' || evt.registration === 'Approved' || evt.registration === 'Participated') && (
                                                   <div className="mt-5">
                                                      <button onClick={(e) => { e.stopPropagation(); window.open('/dashboard/pos/' + evt.id + '?summary=true', '_blank'); }} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-max flex items-center gap-2 border border-indigo-500">
                                                         Day-Wise Sales Report
                                                      </button>
                                                   </div>
                                                )}
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                                   </div>
                                </div>
                                <div className="w-px bg-gray-100 hidden xl:block"></div>
                                {((evt.isInvite && evt.registration === 'Pending' && !evt.isPast) || evt.registration === 'Rejected' || evt.registration === 'Declined') ? (
                                    <div className="flex-1 min-w-[300px] flex flex-col animate-fade-in-up">
                                        <h4 className="font-bold text-sm text-gray-700 mb-2 border-b pb-2 flex items-center gap-2">
                                          <BookOpen className="w-4 h-4"/> 
                                          {evt.registration === 'Pending' ? 'Opt-In: Select Books' : 'Reapply: Update Your Books'}
                                        </h4>
                                        
                                        {(evt.registration === 'Rejected' || evt.registration === 'Declined') && (
                                            <div className="text-red-600 font-bold text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                                              <AlertCircle className="w-4 h-4" /> REASON: {evt.rejectionReason || 'Declined by administrator.'}
                                            </div>
                                        )}
                                        
                                        <p className="text-[11px] text-gray-500 mb-3 italic bg-gray-50 p-2 rounded border border-gray-100">Check the box to include a book, and input the exact stock you want to list for this event.</p>
                                        <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 mb-4 pr-2">
                                            {optInBooks.length === 0 && (
                                                <div className="text-center p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 text-xs font-medium">
                                                    You do not have any approved books in your catalogue. Only approved books can be submitted for an event.
                                                </div>
                                            )}
                                            {optInBooks.map((b, idx) => (
                                              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200">
                                                <input type="checkbox" checked={b.included} onChange={e => { const newB = [...optInBooks]; newB[idx].included = e.target.checked; setOptInBooks(newB); }} className="text-paa-navy focus:ring-paa-navy rounded" />
                                                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{b.title}</span>
                                                <input type="number" disabled={!b.included} value={b.stock} onChange={e => { 
                                                    const val = parseInt(e.target.value) || 0;
                                                    if (val > b.availableStock) {
                                                        toast.error(`Stock Exceeded! You only have ${b.availableStock} in inventory. Update total stock in Profile tab first.`);
                                                        return;
                                                    }
                                                    const newB = [...optInBooks]; newB[idx].stock = val; setOptInBooks(newB); 
                                                }} className="w-16 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400" min="0" />
                                              </div>
                                            ))}
                                        </div>
                                        {evt.registrationFee > 0 && (() => {
                                          const selectedBooksCount = optInBooks.filter((b: any) => b.included).length;
                                          const totalFee = evt.feeType === 'Per Title' ? evt.registrationFee * selectedBooksCount : evt.registrationFee;
                                          return (
                                          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                              <div className="font-bold">Total Registration Fee:</div>
                                              <div className="text-xl font-black text-paa-navy">₹{totalFee}</div>
                                            </div>
                                            {evt.feeType === 'Per Title' && <div className="text-xs text-yellow-700 mb-3">(₹{evt.registrationFee} per title × {selectedBooksCount} selected)</div>}
                                            
                                            {totalFee > 0 && (
                                              <div className="mt-2 text-xs font-bold text-yellow-900 bg-yellow-100 p-2 rounded">
                                                Payment will be requested upon approval. You do not need to pay now.
                                              </div>
                                            )}
                                          </div>
                                          );
                                        })()}
                                        <div className="flex gap-2 shrink-0 mt-auto">
                                            <button disabled={isSubmittingOptIn} onClick={() => handleOptInSubmit('reject')} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">Cancel</button>
                                            <button disabled={isSubmittingOptIn} onClick={() => handleOptInSubmit('approve')} className="flex-1 px-4 py-2 bg-paa-navy text-paa-cream rounded-lg text-sm font-bold hover:bg-paa-gold hover:text-paa-navy transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-wait">
                                              {isSubmittingOptIn ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Submitting...</> : 'Submit Opt-In'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                <div className="flex-1 min-w-[300px] flex flex-col animate-fade-in-up">
                                   {evt.registration === 'Approved' && (evt.registrationFee > 0 || evt.charges > 0) && evt.paymentStatus !== 'Paid' && evt.paymentStatus !== 'Pending Verification' && !evt.paymentProofUrl && !evt.isPast && (
                                     <div className={`mb-4 p-4 rounded text-sm shadow-sm ${evt.paymentStatus === 'Rejected' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                                       <h5 className="font-bold mb-2">{evt.paymentStatus === 'Rejected' ? 'Payment Rejected - Remake Payment' : 'Registration Approved - Pending Payment'}</h5>
                                       <p className="text-xs mb-3">{evt.paymentStatus === 'Rejected' ? 'Your previous payment was rejected. Please re-check the amount or transaction ID and remake the payment.' : `Please pay the fee of ₹${evt.registrationFee || evt.charges} to confirm participation.`}</p>
                                       <div className="flex flex-col sm:flex-row gap-4 border-t border-yellow-200 pt-3">
                                          <div>
                                             <div className="text-[10px] font-bold mb-2 uppercase tracking-widest text-yellow-900">Scan to Pay</div>
                                             <img src={qrCode} alt="Payment QR" className="w-20 h-20 object-contain bg-white p-1 border border-yellow-300 rounded shadow-sm" />
                                          </div>
                                          <div className="flex-1 flex flex-col justify-center gap-2">
                                            <input type="file" accept="image/*" id={`pay-proof-${evt.id}`} className="text-xs bg-white p-1 rounded border border-yellow-300 w-full" />
                                            <input type="text" id={`pay-txn-${evt.id}`} placeholder="Transaction ID / UTR" className="text-xs bg-white p-1.5 rounded border border-yellow-300 w-full placeholder-gray-400" />
                                            <button 
                                              onClick={(e) => {
                                                const fileInput = document.getElementById(`pay-proof-${evt.id}`) as HTMLInputElement;
                                                const txnInput = document.getElementById(`pay-txn-${evt.id}`) as HTMLInputElement;
                                                const file = fileInput?.files?.[0];
                                                const txn = txnInput?.value?.trim();
                                                if (!file) {
                                                  toast.error('Please upload payment screenshot');
                                                  return;
                                                }
                                                if (!txn) {
                                                  toast.error('Please enter the Transaction ID / UTR');
                                                  return;
                                                }
                                                handleSubmitEventPayment(evt.id, file, evt.isActivity !== true, txn);
                                              }}
                                              className="bg-paa-navy text-white text-xs font-bold py-1.5 rounded hover:bg-paa-gold hover:text-paa-navy transition-colors"
                                            >Submit Payment</button>
                                          </div>
                                       </div>
                                     </div>
                                   )}
                                   {evt.registration === 'Approved' && (evt.paymentStatus === 'Pending Verification' || evt.paymentProofUrl) && (
                                     <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 shadow-sm flex items-center gap-2">
                                       <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                       <span className="font-bold">Payment Under Verification</span>
                                       <span className="text-xs ml-auto">Your payment is being reviewed by the admin.</span>
                                     </div>
                                   )}
                                   <h4 className="font-bold text-sm text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                                      {evt.isPast ? <><Package className="w-4 h-4" /> Sales Breakdown</> : <><BookOpen className="w-4 h-4" /> Book Inventory</>}
                                   </h4>
                                   <div className="flex-1 overflow-y-auto max-h-[250px] pr-1 space-y-2">
                                      {(() => {
                                         const currentBooks = evt.isInvite ? getEventBooks(evt.id) : (evt.isPast ? getPastEventBooks(evt.id) : []);
                                         
                                         if (evt.status === 'Legacy Archive' && currentBooks.length === 0) {
                                             return (
                                                <div className="p-3">
                                                   <p className="text-xs text-gray-500 font-medium italic">Legacy aggregate data (no granular details available).</p>
                                                </div>
                                             );
                                         }
                                         if (evt.isPast && !evt.isDataUpdated && currentBooks.length === 0) {
                                            return (
                                               <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                  <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                                  <p className="text-xs text-gray-500 font-medium">Data Pending. Sales records have not been published yet.</p>
                                               </div>
                                            );
                                         }
                                         if (currentBooks.length === 0) {
                                            if (evt.manualTotalSold !== null && evt.manualTotalSold !== undefined) {
                                               return (
                                                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                     <p className="text-sm font-bold text-paa-navy mb-1">Overall Sales Summary</p>
                                                     <p className="text-xs text-gray-600 font-bold mb-2">Total Books Sold: {evt.manualTotalSold} &nbsp;|&nbsp; Total Revenue: <span className="text-emerald-600">₹{evt.manualTotalRevenue || 0}</span></p>
                                                     <p className="text-[10px] text-gray-400 italic">Granular book-by-book breakdown is not available for this event.</p>
                                                  </div>
                                               );
                                            }
                                            return <p className="text-sm text-gray-500 italic">No inventory recorded.</p>;
                                         }
                                         return currentBooks.map((b: any, j: number) => {
                                            const bDetails = books.find(book => book.id === b.bookId);
                                            return (
                                              <React.Fragment key={j}>
                                               <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                                  <span className="font-semibold text-gray-800 line-clamp-1 flex-1 pr-2">{b.title || bDetails?.title || 'Unknown'}</span>
                                                  {evt.isPast ? (
                                                     <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                                                        <div className="flex flex-col items-center"><span className="text-gray-400 font-bold">SENT</span><span className="text-gray-600">{b.listedStock || b.sent || 0}</span></div>
                                                        <div className="flex flex-col items-center"><span className="text-paa-navy font-bold">SOLD</span><span className="text-paa-navy text-xs font-black">{b.soldStock || b.sold || 0}</span></div>
                                                        <div className="flex flex-col items-end"><span className="text-emerald-600 font-bold">REV</span><span className="text-emerald-600 font-bold bg-white px-1 rounded">₹{(b.soldStock || b.sold || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || bDetails?.mrp || 0)}</span></div>
                                                     </div>
                                                  ) : (
                                                     <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                                                        <span className="text-gray-500" title="Listed">Listed: {b.listedStock}</span>
                                                        <span className="text-indigo-600 font-bold" title="Sold">Sold: {b.soldStock || 0}</span>
                                                     </div>
                                                  )}
                                               </div>
                                              </React.Fragment>
                                            )
                                         });
                                      })()}
                                   </div>
                                </div>
                                )}
                             </div>
                          </td>
                       </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {showProposeEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold font-serif text-paa-navy">Propose New Event</h3>
              <button onClick={() => setShowProposeEventModal(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white rounded-full shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleProposeEvent}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="dash-label">Event Name</label><input required name="name" type="text" className="dash-input" placeholder="e.g., Spring Book Fair" /></div>
                  <div className="md:col-span-2"><label className="dash-label">Event Banner (Optional)</label><input name="banner" type="file" accept="image/*" className="dash-input" /></div>
                </div>

                <div><label className="dash-label">Event Description</label><textarea name="description" rows={3} className="dash-input resize-y" placeholder="Short details about the event..."></textarea></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="dash-label">Event Type</label>
                    <select name="eventType" className="dash-input" onChange={(e) => {
                      const el = document.getElementById('authorOtherEventTypeInput');
                      if (el) el.style.display = e.target.value === 'Other' ? 'block' : 'none';
                    }}>
                      <option value="Book Fair">Book Fair</option>
                      <option value="Literary Event">Literary Event</option>
                      <option value="Other">Other</option>
                    </select>
                    <input id="authorOtherEventTypeInput" name="otherEventType" type="text" className="dash-input mt-2" placeholder="Specify event type" style={{ display: 'none' }} />
                  </div>
                  <div><label className="dash-label">Location (Venue)</label><input name="location" type="text" className="dash-input" placeholder="e.g., Phoenix Mall, Pune" /></div>
                  <div>
                    <label className="dash-label">Date</label>
                    <input name="date" type="date" className="dash-input" />
                  </div>
                  <div>
                    <label className="dash-label">Duration</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input name="durationDays" type="number" min="0" className="dash-input" placeholder="Days" />
                      </div>
                      <div className="flex-1">
                        <input name="durationHours" type="number" min="0" className="dash-input" placeholder="Hours" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="dash-label">From Timing</label><input name="startTime" type="time" className="dash-input" /></div>
                  <div><label className="dash-label">To Timing</label><input name="endTime" type="time" className="dash-input" /></div>
                  <div><label className="dash-label">Registration Fee (₹)</label><input name="registrationFee" type="number" placeholder="Optional" className="dash-input" /></div>
                  <div>
                    <label className="dash-label">Fee Type</label>
                    <select name="feeType" className="dash-input">
                      <option value="Per Author">Per Author</option>
                      <option value="Per Title">Per Title</option>
                      <option value="Flat Fee">Flat Fee</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setShowProposeEventModal(false)} className="dash-btn dash-btn-ghost">Cancel</button>
                <button type="submit" disabled={isProposingEvent} className="dash-btn dash-btn-primary min-w-[120px]">
                  {isProposingEvent ? 'Proposing...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
</FocusTrap>
          </div>
        </div>
      )}

            {activeTab === 'performance' && (() => {
                 let totalSent = 0;
                 let totalSold = 0;
                 let totalReturned = 0;
                 let totalRev = 0;
                 let bestEvent = { name: '-', rev: 0 };
                 let eventsWithSales = 0;
                 let eventStats: any[] = [];
                 let bookStats: Record<string, { sold: number, rev: number, title: string, sent: number, events: any[] }> = {};
                 
                 validParticipations.forEach(evt => {
                     let evtSent = 0;
                     let evtSold = 0;
                     let evtReturned = 0;
                     let evtRev = 0;
                     
                     let evtBooks: any[] = [];
                     if (evt.isInvite) evtBooks = getEventBooks(evt.id);
                     else if (evt.isPast && evt.isDataUpdated) evtBooks = evt.books || [];
                     
                     evtBooks.forEach((b: any) => {
                         const bId = b.bookId?.toString() || b.id?.toString();
                         if (selectedBookIds.length === 0 || selectedBookIds.includes(bId)) {
                             const listed = (b.listedStock || b.sent || 0);
                             const sold = (b.soldStock || b.sold || 0);
                             const returned = (b.returnedStock || b.returned || 0);
                             const rev = sold * (b.overrideMrp || b.mrp || b.book?.mrp || 0);
                             
                             evtSent += listed;
                             evtSold += sold;
                             evtReturned += returned;
                             evtRev += rev;
                             
                             if (bId && bId !== 'undefined') {
                                 if (!bookStats[bId]) {
                                     const bDetails = books.find(book => book.id.toString() === bId);
                                     bookStats[bId] = { sold: 0, rev: 0, sent: 0, title: b.title || bDetails?.title || 'Unknown', events: [] };
                                 }
                                 bookStats[bId].sold += sold;
                                 bookStats[bId].sent += listed;
                                 bookStats[bId].rev += rev;
                                 if (listed > 0 || sold > 0) {
                                     bookStats[bId].events.push({
                                         name: evt.name || 'Unknown Event',
                                         date: evt.date || evt.startDate,
                                         sent: listed,
                                         sold: sold,
                                         rev: rev
                                     });
                                 }
                             }
                         }
                     });
                     
                     totalSent += evtSent;
                     totalSold += evtSold;
                     totalReturned += evtReturned;
                     totalRev += evtRev;
                     
                     if (evtRev > 0) {
                         eventsWithSales++;
                         eventStats.push({ name: evt.name, rev: evtRev, date: evt.date || evt.startDate, sold: evtSold });
                     }
                 });
                 
                 const sellThroughNum = totalSent > 0 ? ((totalSold / totalSent) * 100) : 0;
                 const sellThrough = sellThroughNum.toFixed(1);
                 const returnRate = totalSent > 0 ? Math.max(0, 100 - sellThroughNum).toFixed(1) : 0;
                 
                 const avgRev = validParticipations.length > 0 ? Math.round(totalRev / validParticipations.length) : 0;
                 
                 let fastestMover = { title: '-', rate: 0 };
                 
                 const sortedEvents = eventStats.sort((a, b) => b.rev - a.rev);
                 bestEvent = sortedEvents[0] || { name: '-', rev: 0 };
                 const secondBestEvent = sortedEvents[1];
                 
                 const sortedBooks = Object.values(bookStats).sort((a, b) => b.rev - a.rev);
                 let bestBook = sortedBooks[0] || { title: '-', rev: 0, sold: 0 };
                 const secondBestBook = sortedBooks[1];
                 
                 Object.values(bookStats).forEach(bs => {
                     if (bs.sent > 0) {
                         const rate = (bs.sold / bs.sent) * 100;
                         if (rate >= fastestMover.rate && bs.sold > 0) {
                             if (rate > fastestMover.rate || bs.sold > (fastestMover.rate > 0 ? 0 : -1)) {
                                 fastestMover = { title: bs.title, rate };
                             }
                         }
                     }
                 });

                return (
        <div className="space-y-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <div className="p-6 bg-white rounded-2xl border border-paa-navy/5 shadow-premium">
            <div className="mb-0">
              <label className="text-xs font-bold text-paa-navy uppercase tracking-widest block mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Analyze Specific Books:</label>
              <div className="flex flex-wrap gap-3">
                {books.map((b: any) => {
                  const isSelected = selectedBookIds.length === 0 || selectedBookIds.includes(b.id.toString());
                  return (
                  <button
                    key={b.id}
                    onClick={() => {
                        if (selectedBookIds.includes(b.id.toString())) {
                            setSelectedBookIds(selectedBookIds.filter(id => id !== b.id.toString()));
                        } else {
                            setSelectedBookIds([...selectedBookIds, b.id.toString()]);
                        }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-400' : 'bg-gray-100 border-gray-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    {b.title}
                  </button>
                )})}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-6 items-stretch">
            <div className="flex flex-col gap-6 lg:col-span-1 h-full">
                       <div className="bg-emerald-500/85 p-6 rounded-2xl border-none shadow-premium flex flex-col justify-center text-white flex-1">
                          <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-200" /> Sell-Through Rate</div>
                          <div className="text-4xl font-black text-white tracking-tight">{sellThrough}%</div>
                          <div className="text-sm text-emerald-50 font-medium mt-2">Returns: {returnRate}%</div>
                       </div>
                       <div className="bg-purple-500/85 p-6 rounded-2xl border-none shadow-premium flex flex-col justify-center text-white flex-1">
                          <div className="text-xs font-bold text-purple-100 uppercase tracking-widest mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-200" /> Best Book</div>
                          <div className="text-2xl font-black text-white tracking-tight leading-tight line-clamp-2" title={bestBook.title}>{bestBook.title}</div>
                          <div className="text-sm text-purple-50 font-medium mt-2">₹{bestBook.rev.toLocaleString()} • {bestBook.sold} Sold</div>
                       </div>
                       <div className="bg-blue-500/85 p-6 rounded-2xl border-none shadow-premium flex flex-col justify-center text-white flex-1">
                          <div className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-200" /> Fastest Mover</div>
                          <div className="text-2xl font-black text-white tracking-tight leading-tight line-clamp-2" title={fastestMover.title}>{fastestMover.title}</div>
                          <div className="text-sm text-blue-50 font-medium mt-2">{fastestMover.rate > 0 ? fastestMover.rate.toFixed(1) : 0}% Sold</div>
                       </div>
            </div>

            <div className="lg:col-span-2 bg-white border border-paa-navy/5 rounded-2xl p-6 shadow-premium h-full flex flex-col">
              <h4 className="text-base font-bold text-paa-navy mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Book Sales Performance Over Time</h4>
              <div className="w-full overflow-x-auto pb-2 flex-1">
                <div className="h-full min-h-[300px]" style={{ minWidth: `${Math.max(100, validParticipations.filter(e => e.isPast).length * 150)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                {(() => {
                    const uniqueBooks = new Set<string>();
                    const validEvents = validParticipations.filter((evt: any) => evt.isPast && evt.name !== 'Unknown Event');
                    const chartData = validEvents.map((evt: any) => {
                      let evtData: any = { name: evt.name.length > 15 ? evt.name.substring(0, 15) + '...' : evt.name };
                      let evtBooks: any[] = [];
                      if (evt.isInvite) evtBooks = getEventBooks(evt.id);
                      else if (evt.isPast && evt.isDataUpdated) evtBooks = evt.books || [];
                      evtBooks.forEach((b: any) => {
                        if (selectedBookIds.length === 0 || selectedBookIds.includes(b.bookId?.toString() || b.id?.toString())) {
                          const bTitle = b.title || b.book?.title || 'Unknown Book';
                          uniqueBooks.add(bTitle);
                          evtData[bTitle] = (evtData[bTitle] || 0) + (b.soldStock || b.sold || 0);
                        }
                      });
                      return evtData;
                    });
                    
                    if (chartData.length === 0) return <div className="flex items-center justify-center h-full text-sm text-gray-400 italic font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">No historical sales data available to chart.</div>;
                    
                    const bookTitles = Array.from(uniqueBooks);
                    const colors = ['#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#eab308'];
                    
                    return (
                        <LineChart data={chartData} margin={{ top: 25, right: 20, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} angle={-45} textAnchor="end" dy={15} interval={0} height={80} tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + '...' : v} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontSize: '13px', fontWeight: 600, padding: '12px 16px' }} />
                          {bookTitles.map((title, idx) => {
                            const color = colors[idx % colors.length];
                            return (
                              <Line key={idx} type="monotone" dataKey={title} name={title} stroke={color} strokeWidth={4} dot={(props: any) => { const { cx, cy, index, payload } = props; if (payload[title] === undefined || payload[title] === 0) return null; return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2.5} key={`dot-${title}-${index}`} />; }} activeDot={{ r: 7, strokeWidth: 0 }}>
                                <LabelList dataKey={title} position="top" content={(props: any) => {
                                  const { x, y, value } = props;
                                  if (!value) return null;
                                  return (
                                    <g>
                                      <text x={x} y={y - 12} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" fontSize="11px" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">{value}</text>
                                      <text x={x} y={y - 12} fill={color} fontSize="11px" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">{value}</text>
                                    </g>
                                  );
                                }} />
                              </Line>
                            );
                          })}
                        </LineChart>
                    );
                })()}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

          <div className="flex justify-between items-end mb-4">
            <h4 className="font-bold text-paa-navy text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /> Book Performance Breakdown</h4>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sort By:</span>
                <select className="border border-gray-200 rounded-lg text-sm font-bold text-paa-navy p-2 outline-none cursor-pointer bg-white" value={bpSort} onChange={e => setBpSort(e.target.value)}>
                    <option value="revenue_desc">Highest Revenue</option>
                    <option value="revenue_asc">Lowest Revenue</option>
                    <option value="sold_desc">Most Copies Sold</option>
                    <option value="rate_desc">Highest Sell-Through</option>
                </select>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-premium border border-paa-navy/5 overflow-hidden mb-8">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="px-6 py-4 w-1/3 !text-[14px] font-bold uppercase tracking-widest !text-cyan-700 !bg-transparent">Book Title</th>
                  <th className="px-4 py-4 text-right !text-[14px] font-bold uppercase tracking-widest !text-cyan-700 !bg-transparent">Copies Sent</th>
                  <th className="px-4 py-4 text-right !text-[14px] font-bold uppercase tracking-widest !text-cyan-700 !bg-transparent">Copies Sold</th>
                  <th className="px-4 py-4 text-right !text-[14px] font-bold uppercase tracking-widest !text-cyan-700 !bg-transparent">Sell-Through Rate</th>
                  <th className="px-4 py-4 text-right !text-[14px] font-bold uppercase tracking-widest !text-cyan-700 !bg-transparent">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.keys(bookStats).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-paa-gray-text italic">No books found.</td></tr>}
                {(() => {
                   const statsArray = Object.values(bookStats).map(bs => ({
                       ...bs,
                       rate: bs.sent > 0 ? (bs.sold / bs.sent) * 100 : 0
                   }));
                   
                   statsArray.sort((a, b) => {
                       if (bpSort === 'revenue_desc') return b.rev - a.rev;
                       if (bpSort === 'revenue_asc') return a.rev - b.rev;
                       if (bpSort === 'sold_desc') return b.sold - a.sold || b.rev - a.rev;
                       if (bpSort === 'rate_desc') return b.rate - a.rate || b.rev - a.rev;
                       return b.rev - a.rev;
                   });
                   
                   return statsArray.map((bs: any, i: number) => {
                  const isExpanded = expandedBookId === bs.title;
                  return (
                    <React.Fragment key={i}>
                      <tr onClick={() => setExpandedBookId(isExpanded ? null : bs.title)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 text-sm font-semibold text-paa-navy whitespace-normal flex items-center gap-2">
                           <div className={`transform transition-transform text-gray-400 group-hover:text-paa-navy ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                           {bs.title}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-700 text-right">{bs.sent > 0 ? bs.sent : '-'}</td>
                        <td className="px-4 py-4 text-sm font-bold text-paa-navy text-right">{bs.sold > 0 ? bs.sold : '-'}</td>
                        <td className="px-4 py-4 text-sm font-bold text-indigo-600 text-right">{bs.rate > 0 ? `${bs.rate.toFixed(1)}%` : '-'}</td>
                        <td className="px-4 py-4 text-sm font-black text-emerald-700 text-right">{bs.rev > 0 ? `₹${bs.rev.toLocaleString()}` : '-'}</td>
                      </tr>
                      {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 bg-gray-50 border-b border-gray-200">
                                <div className="p-4 pl-12">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <BookOpen className="w-3 h-3" /> Event Breakdown for {bs.title}
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                                            <tr>
                                                <th className="pb-2 w-1/2 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Event Name</th>
                                                <th className="pb-2 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Date</th>
                                                <th className="pb-2 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Sent</th>
                                                <th className="pb-2 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Sold</th>
                                                <th className="pb-2 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {bs.events?.length > 0 ? bs.events.map((ev: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                    <td className="py-3 text-xs font-semibold text-paa-navy">{ev.name}</td>
                                                    <td className="py-3 text-[10px] text-gray-500 text-right">{new Date(ev.date).toLocaleDateString()}</td>
                                                    <td className="py-3 text-xs font-bold text-gray-700 text-right">{ev.sent > 0 ? ev.sent : '-'}</td>
                                                    <td className="py-3 text-xs font-bold text-paa-navy text-right">{ev.sold > 0 ? ev.sold : '-'}</td>
                                                    <td className="py-3 text-xs font-black text-emerald-700 text-right">{ev.rev > 0 ? `₹${ev.rev.toLocaleString()}` : '-'}</td>
                                                </tr>
                                            )) : <tr><td colSpan={5} className="py-4 text-center text-xs text-gray-400 italic">No events recorded.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                          </tr>
                      )}
                    </React.Fragment>
                  );
                })})()}
              </tbody>
            </table>
          </div>

        </div>
        );
      })()}

      {activeTab === 'payments' && (() => {
        const allPayments: any[] = [];
        
        // 1. Author Registration Payment
        if (dashboardData?.authorProfile?.transactionId) {
            allPayments.push({
                type: 'Author Registration',
                name: 'Platform Onboarding Fee',
                date: dashboardData?.authorProfile?.createdAt || new Date(),
                transactionId: dashboardData.authorProfile.transactionId,
                amount: `₹${dashboardData.authorProfile.amountPaid || dashboardData.authorProfile.extraData?.registrationFee || dashboardData.authorProfile.extraData?.amountPaid || 1000}`,
                screenshotUrl: dashboardData.authorProfile.paymentScreenshot
            });
        }
        
        // 2. Event Registrations
        validParticipations.filter((e: any) => e.amountPaid > 0).forEach((evt: any) => {
            const isFair = (evt.type || evt.eventType) === 'Book Fair';
            allPayments.push({
                type: isFair ? 'Book Fair Fee' : 'Literary Event Fee',
                name: evt.name,
                date: evt.startDate || evt.date || new Date(),
                transactionId: evt.transactionId,
                amount: `₹${evt.amountPaid?.toLocaleString()}`,
                screenshotUrl: evt.paymentProofUrl || evt.paymentScreenshotUrl
            });
        });
        
        // 3. Late Fines History 
        if (dashboardData?.authorProfile?.extraData?.finePayments && Array.isArray(dashboardData.authorProfile.extraData.finePayments)) {
            dashboardData.authorProfile.extraData.finePayments.forEach((fine: any) => {
                allPayments.push({
                    type: 'Late Fine',
                    name: 'Inventory/Return Fine',
                    date: fine.date || new Date(),
                    transactionId: fine.transactionId || 'N/A',
                    amount: `₹${fine.amount?.toLocaleString() || 'Fine'}`,
                    screenshotUrl: fine.screenshotUrl
                });
            });
        }

        // 4. Donation Drive Fees
        if (dashboardData?.authorProfile?.donationRegistrations) {
            dashboardData.authorProfile.donationRegistrations.filter((d: any) => d.feePaid > 0).forEach((d: any) => {
                allPayments.push({
                    type: 'Donation Drive Fee',
                    name: d.announcement?.title || 'Book Donation Drive',
                    date: d.createdAt || new Date(),
                    transactionId: d.transactionId,
                    amount: `₹${d.feePaid?.toLocaleString()}`,
                    screenshotUrl: d.paymentScreenshot
                });
            });
        }
        
        const getSortTime = (d: any) => {
            if (!d) return 0;
            const ds = String(d);
            let dt = new Date(ds);
            if (isNaN(dt.getTime()) && ds.includes('-')) {
                const parts = ds.split('-');
                if (parts.length === 3 && parts[0].length === 2) {
                    dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            return isNaN(dt.getTime()) ? 0 : dt.getTime();
        };
        allPayments.sort((a, b) => getSortTime(b.date) - getSortTime(a.date));

        const parseAmt = (a: any) => {
            if (typeof a === 'number') return a;
            if (typeof a === 'string') return parseInt(a.replace(/[^0-9]/g, '')) || 0;
            return 0;
        };
        const totalPaid = allPayments.reduce((sum, p) => sum + parseAmt(p.amount), 0);
        const bookFairFees = allPayments.filter(p => p.type === 'Book Fair Fee').reduce((sum, p) => sum + parseAmt(p.amount), 0);
        const litEventFees = allPayments.filter(p => p.type === 'Literary Event Fee').reduce((sum, p) => sum + parseAmt(p.amount), 0);
        const lateFines = allPayments.filter(p => p.type === 'Late Fine').reduce((sum, p) => sum + parseAmt(p.amount), 0);
        const otherFees = allPayments.filter(p => p.type === 'Author Registration' || p.type === 'Donation Drive Fee').reduce((sum, p) => sum + parseAmt(p.amount), 0);

        return (
          <div className="space-y-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-6">
                <div className="bg-rose-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
                    <div className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-200" /> Total Paid</div>
                    <div className="text-3xl font-black text-white tracking-tight">₹{totalPaid.toLocaleString()}</div>
                    <div className="text-xs text-rose-50 mt-2 font-medium opacity-90">All recorded payments</div>
                </div>

                <div className="bg-blue-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
                    <div className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-blue-200" /> Book Fair Fees</div>
                    <div className="text-3xl font-black text-white tracking-tight">₹{bookFairFees.toLocaleString()}</div>
                    <div className="text-xs text-blue-50 mt-2 font-medium opacity-90">{allPayments.filter(p => p.type === 'Book Fair Fee').length} Fairs Participated</div>
                </div>

                <div className="bg-cyan-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
                    <div className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-cyan-200" /> Lit Event Fees</div>
                    <div className="text-3xl font-black text-white tracking-tight">₹{litEventFees.toLocaleString()}</div>
                    <div className="text-xs text-cyan-50 mt-2 font-medium opacity-90">{allPayments.filter(p => p.type === 'Literary Event Fee').length} Events Participated</div>
                </div>

                <div className="bg-pink-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
                    <div className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pink-200" /> Late Fines</div>
                    <div className="text-3xl font-black text-white tracking-tight">₹{lateFines.toLocaleString()}</div>
                    <div className="text-xs text-pink-50 mt-2 font-medium opacity-90">{allPayments.filter(p => p.type === 'Late Fine').length} Penalties Paid</div>
                </div>

                <div className="bg-purple-500/85 p-6 rounded-2xl border-none shadow-sm flex flex-col justify-center text-white">
                    <div className="text-[10px] font-bold text-purple-100 uppercase tracking-widest mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-200" /> Onboarding & Donations</div>
                    <div className="text-3xl font-black text-white tracking-tight">₹{otherFees.toLocaleString()}</div>
                    <div className="text-xs text-purple-50 mt-2 font-medium opacity-90">Miscellaneous Fees</div>
                </div>
            </div>
            <div className="dash-panel overflow-hidden mb-7">
               <div className="dash-panel-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="dash-panel-title">Complete Payment History</h2>
                     <p className="text-xs text-gray-500 font-medium mt-1">All your transactions across the platform</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2 flex-nowrap overflow-x-auto hide-scrollbar pb-2 w-full max-w-full lg:w-auto lg:pb-0">
                    {[
                        { id: 'All', label: 'All' },
                        { id: 'Book Fair Fee', label: 'Book Fair' },
                        { id: 'Literary Event Fee', label: 'Literary Event' },
                        { id: 'Late Fine', label: 'Late Fine' },
                        { id: 'Donation Drive Fee', label: 'Donation Drive' },
                        { id: 'Author Registration', label: 'Platform Onboarding' }
                    ].map(type => {
                        const count = type.id === 'All' ? allPayments.length : allPayments.filter(p => p.type === type.id).length;
                        return (
                        <button
                          key={type.id}
                          onClick={() => setPaymentTypeFilter(type.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${paymentTypeFilter === type.id ? 'bg-paa-navy text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                        >
                          {type.label}
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${paymentTypeFilter === type.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                        </button>
                    )})}
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="dash-table w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                        <tr>
                          <th className="px-4 py-4 w-12 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest text-center">S.No</th>
                          <th className="px-6 py-4 w-1/4 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Transaction Detail</th>
                          <th className="px-4 py-4 w-48 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Date</th>
                          <th className="px-4 py-4 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Transaction ID</th>
                          <th className="px-4 py-4 text-right !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Amount Paid</th>
                          <th className="px-4 py-4 text-center !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Receipt / Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allPayments.filter(p => paymentTypeFilter === 'All' || p.type === paymentTypeFilter).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-16 text-center">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                  <FileText className="w-10 h-10 mb-3 opacity-30" />
                                  <p className="text-sm font-medium">No payment records found for the selected filter.</p>
                                </div>
                              </td>
                            </tr>
                        ) : (
                            allPayments.filter(p => paymentTypeFilter === 'All' || p.type === paymentTypeFilter).map((payment, idx) => {
                                const getTypeColor = (type: string) => {
                                    switch (type) {
                                        case 'Late Fine': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
                                        case 'Book Fair Fee': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500/85' };
                                        case 'Literary Event Fee': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500/85' };
                                        case 'Donation Drive Fee': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500/85' };
                                        case 'Author Registration': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500/85' };
                                        default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
                                    }
                                };
                                const colors = getTypeColor(payment.type);

                                return (
                                <tr key={idx} className={`transition-colors  ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'}`}>
                                    <td className="px-4 py-4 text-center font-bold text-gray-500 text-xs">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${colors.dot} shadow-sm`}></div>
                                            <div>
                                                <div className="text-sm font-bold text-paa-navy">{payment.name}</div>
                                                <div className={`text-[10px] font-bold tracking-wider uppercase inline-block px-2 py-0.5 mt-1 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>{payment.type}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-semibold text-gray-700">{new Date(payment.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {payment.transactionId && payment.transactionId !== 'N/A' ? (
                                            <span className="bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-sm inline-block">
                                                {payment.transactionId}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic text-xs font-medium">-</span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-4 text-sm font-black text-right ${colors.text}`}>
                                        {payment.amount}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {payment.screenshotUrl ? (
                                            <a href={payment.screenshotUrl.startsWith('http') ? payment.screenshotUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${payment.screenshotUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-xs font-bold shadow-sm group">
                                                <ImageIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" /> View Proof
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">No Image</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                        )}
                      </tbody>
                   </table>
               </div>
            </div>
          </div>
        );
      })()}
      
      <Modal isOpen={isOptInModalOpen} onClose={() => setIsOptInModalOpen(false)} title={`Review Invite: ${selectedInvite?.name}`}>
    {selectedInvite && (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-1">Event Invitation</h3>
          <p className="text-sm text-blue-800 mb-3">You have been invited to participate in this event. Please select the books you want to bring.</p>
          <details className="bg-white rounded-lg p-3 text-sm text-gray-700 border border-blue-200 cursor-pointer shadow-sm mb-4">
            <summary className="font-bold text-paa-navy focus:outline-none">View Event Details ▼</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-semibold">Date:</span> {new Date(selectedInvite.startDate || selectedInvite.date).toLocaleDateString()}</div>
              <div><span className="font-semibold">Location:</span> {selectedInvite.location || selectedInvite.venue || 'TBA'}</div>
              <div><span className="font-semibold">Duration:</span> {selectedInvite.durationDays ? `${selectedInvite.durationDays} Days` : 'N/A'}</div>
              <div><span className="font-semibold">Type:</span> {selectedInvite.type || 'N/A'}</div>
              {selectedInvite.description && <div className="col-span-2"><span className="font-semibold">Description:</span> {selectedInvite.description}</div>}
            </div>
          </details>
          {selectedInvite.registrationFee > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 font-medium">
              Registration Fee: ₹{selectedInvite.registrationFee}
              <div className="mt-2 text-xs">
                Payment will be requested upon approval. You do not need to pay now.
              </div>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Select Books for Event</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {optInBooks.map((b, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${b.included ? 'border-paa-navy bg-paa-navy/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newBooks = [...optInBooks];
                      newBooks[idx].included = !newBooks[idx].included;
                      setOptInBooks(newBooks);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${b.included ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                  >
                    {b.included ? '-' : '+'}
                  </button>
                  <div>
                    <div className={`font-semibold ${b.included ? 'text-paa-navy' : 'text-gray-400 line-through'}`}>{b.title}</div>
                    {b.included && <div className="text-xs text-gray-500">Status: Selected</div>}
                  </div>
                </div>
                {b.included && (
                  <div className="flex flex-col items-end">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Stock</label>
                    <input
                      type="number"
                      min="1"
                      value={b.stock}
                      onChange={(e) => {
                        const newBooks = [...optInBooks];
                        newBooks[idx].stock = parseInt(e.target.value) || 0;
                        setOptInBooks(newBooks);
                      }}
                      className="w-20 border border-gray-300 rounded p-1 text-center font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
            {optInBooks.length === 0 && <p className="text-sm text-gray-500 italic">No approved books found in your catalog.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button onClick={() => handleOptInSubmit('reject')} className="px-6 py-2 rounded-lg font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors border border-red-200">Decline Invite</button>
          <button onClick={() => handleOptInSubmit('approve')} className="px-6 py-2 rounded-lg font-bold text-white bg-paa-navy hover:brightness-110 transition-all shadow-md">Accept & Register</button>
        </div>
      </div>
    )}
  </Modal>
    </div>
  );
}

function AuthorSalesReport({ data, onRefresh }: { data: any, onRefresh: () => void }) {
  const authorProfile = data?.authorProfile || {};  const [filterType, setFilterType] = useState('lifetime'); // today, weekly, monthly, this_month, ytd, select_month, lifetime, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonthValue, setSelectedMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const [tableChannelFilter, setTableChannelFilter] = useState('All');

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  useEffect(() => {
    if (filterType === 'custom') return;
    const today = new Date();
    let end = new Date(today);
    let start = new Date(today);

    if (filterType === 'today') {
      start.setHours(0,0,0,0);
    } else if (filterType === 'weekly') {
      start.setDate(today.getDate() - 7);
    } else if (filterType === 'monthly') {
      start.setDate(today.getDate() - 30);
    } else if (filterType === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filterType === 'ytd') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (filterType === 'select_month') {
      if (selectedMonthValue) {
        const [yyyy, mm] = selectedMonthValue.split('-');
        start = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        end = new Date(parseInt(yyyy), parseInt(mm), 0);
      } else {
        return;
      }
    } else if (filterType === 'lifetime') {
      start = new Date('2000-01-01');
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [filterType, selectedMonthValue]);

  const startLimit = startDate ? new Date(startDate) : new Date('2000-01-01');
  startLimit.setHours(0, 0, 0, 0);
  const endLimit = endDate ? new Date(endDate) : new Date();
  endLimit.setHours(23, 59, 59, 999);

  const webOrders = (data.authorOrders || []).filter((o: any) => {
    const orderDate = new Date(o.createdAt || o.date);
    const isCountedAsSale = o.paymentVerified || o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Dispatched';
    return isCountedAsSale && orderDate >= startLimit && orderDate <= endLimit;
  });

  const posOrders = (data.posOrders || []).filter((o: any) => {
    const orderDate = new Date(o.createdAt);
    return o.paymentStatus === 'CONFIRMED' && orderDate >= startLimit && orderDate <= endLimit;
  });

  let totalRevenue = 0;
  let totalBooksSold = 0;
  
  const chartDataMap: Record<string, { date: string, revenue: number, books: number }> = {};
  const channelDataMap = { Web: 0, Events: 0, 'Book Fairs': 0 };
  const tableData: any[] = [];
  
  const kpiSplits = {
    web: { revenue: 0, books: 0, orders: webOrders.length },
    events: { revenue: 0, books: 0, orders: 0 },
    bookFairs: { revenue: 0, books: 0, orders: 0 }
  };

  const processItem = (date: Date, channel: string, eventName: string, title: string, qty: number, price: number, orderId: string, status: string, details: any, rawPosOrderId?: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const rev = qty * price;
    
    totalRevenue += rev;
    totalBooksSold += qty;

    if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { date: dateStr, revenue: 0, books: 0 };
    chartDataMap[dateStr].revenue += rev;
    chartDataMap[dateStr].books += qty;

    tableData.push({
      date: dateStr,
      orderId,
      channel,
      event: eventName,
      title,
      qty,
      revenue: rev,
      status,
      customer: details.customer,
      items: details.items,
      rawPosOrderId
    });
  };

  webOrders.forEach((o: any) => {
    const qty = o.quantity || 1;
    const rev = o.amount || 0;
    const price = qty > 0 ? rev / qty : 0;
    
    processItem(
      new Date(o.createdAt || o.date),
      'Web Orders',
      '-',
      o.bookTitle || o.title || 'Unknown Title',
      qty,
      price,
      `WEB-${o.orderId}`,
      o.status || 'Paid',
      {
        customer: o.customerName || 'N/A',
        items: `${o.bookTitle || o.title || 'Unknown'} (x${qty})`
      }
    );
    
    channelDataMap.Web += rev;
    kpiSplits.web.revenue += rev;
    kpiSplits.web.books += qty;
  });

  posOrders.forEach((po: any) => {
    const isBookFair = po.event?.eventType === 'Book Fair' || po.event?.name?.toLowerCase().includes('fair');
    const channelName = isBookFair ? 'Book Fairs' : 'Events';
    const kpiKey = isBookFair ? 'bookFairs' : 'events';
    kpiSplits[kpiKey].orders += 1;
    
    po.items.forEach((i: any) => {
      const qty = i.quantity || 0;
      const price = i.price || 0;
      const rev = qty * price;
      
      processItem(
        new Date(po.createdAt),
        channelName,
        po.event?.name || 'POS Order',
        i.book?.title || 'Unknown Title',
        qty,
        price,
        `POS-${po.id}`,
        po.paymentMethod || 'Paid',
        {
          customer: 'Walk-in',
          items: `${i.book?.title || 'Unknown'} (x${qty})`
        },
        po.id
      );
      
      channelDataMap[channelName] += rev;
      kpiSplits[kpiKey].revenue += rev;
      kpiSplits[kpiKey].books += qty;
    });
  });

  (data.eventInvites || []).forEach((ea: any) => {
    if (ea.optInStatus === 'Registered' || ea.optInStatus === 'Approved') {
      // Check if this event already has POS orders
      const hasPosData = posOrders.some((po: any) => po.eventId === ea.eventId);
      if (!hasPosData) {
        let qty = 0;
        let rev = 0;
        let booksList: any[] = [];
        
        if (ea.manualTotalSold > 0 || ea.manualTotalRevenue > 0) {
            qty = ea.manualTotalSold || 0;
            rev = ea.manualTotalRevenue || 0;
            booksList.push({ title: 'Manual Aggregation', qty, rev });
        } else {
            const eventBooks = (data.listedBooks || []).filter((lb: any) => lb.eventId === ea.eventId);
            eventBooks.forEach((eb: any) => {
                if (eb.soldStock > 0) {
                    const price = eb.overrideMrp || eb.book?.mrp || 0;
                    const bookRev = eb.soldStock * price;
                    qty += eb.soldStock;
                    rev += bookRev;
                    booksList.push({ title: eb.book?.title || 'Unknown Book', qty: eb.soldStock, rev: bookRev, price });
                }
            });
        }

        if (qty > 0 || rev > 0) {
            const isBookFair = ea.event?.eventType === 'Book Fair' || ea.event?.name?.toLowerCase().includes('fair');
            const channelName = isBookFair ? 'Book Fairs' : 'Events';
            const kpiKey = isBookFair ? 'bookFairs' : 'events';
            const date = new Date(ea.event?.date || ea.event?.startDate || ea.createdAt || new Date());

            if (date >= startLimit && date <= endLimit) {
                booksList.forEach((bk, i) => {
                    const price = bk.qty > 0 ? bk.rev / bk.qty : 0;
                    processItem(
                        date,
                        channelName,
                        ea.event?.name || 'Manual Aggregation',
                        bk.title,
                        bk.qty,
                        price,
                        `MANUAL-${ea.eventId}-${i}`,
                        'Aggregated',
                        { customer: 'Multiple', items: `${bk.title} (x${bk.qty})` }
                    );
                });
                
                channelDataMap[channelName as keyof typeof channelDataMap] += rev;
                kpiSplits[kpiKey].revenue += rev;
                kpiSplits[kpiKey].books += qty;
            }
        }
      }
    }
  });

  const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

  const totalEventFees = (data.eventInvites || []).filter((inv: any) => {
    if (inv.optInStatus !== 'Registered' && inv.optInStatus !== 'Approved') return false;
    const evtDate = new Date(inv.event?.date || inv.event?.startDate || inv.createdAt || new Date());
    return evtDate >= startLimit && evtDate <= endLimit;
  }).reduce((acc: number, inv: any) => {
    const evt = inv.event;
    if (!evt) return acc;
    if (inv.amountPaid !== null && inv.amountPaid !== undefined) {
      return acc + inv.amountPaid;
    }
    if (evt.feeType === 'Flat Fee' || evt.feeType === 'Per Author') {
      return acc + (evt.registrationFee || 0);
    } else if (evt.feeType === 'Per Title') {
      const titlesCount = (data.listedBooks || []).filter((lb: any) => lb.eventId === evt.id).length;
      return acc + ((evt.registrationFee || 0) * titlesCount);
    }
    return acc;
  }, 0);
  
  const joinDate = new Date(data.authorProfile?.groupJoiningDate || data.authorProfile?.createdAt || new Date());
  const platformFeePaid = (joinDate >= startLimit && joinDate <= endLimit) ? 3000 : 0;
  const totalFeesPaid = platformFeePaid + totalEventFees;

  const exportCSV = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    
    // Add title row
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `SALES TRANSACTIONS EXPORT (${startDate} to ${endDate})`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } }; // Navy Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add headers
    const headers = ['Transaction Date', 'Order Type', 'Order ID', 'Customer Name', 'Books Included', 'Total Quantity', 'Total Amount', 'Status/Payment Method'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } }; // Gold
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    tableData.forEach(tx => {
      const addedRow = sheet.addRow([
        tx.date,
        tx.channel,
        tx.orderId,
        tx.customer,
        tx.items,
        tx.qty,
        tx.revenue,
        tx.status
      ]);
      addedRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
        let colBgColor = 'FFFFFF';
        if (colNumber <= 2) colBgColor = 'FF8B8B'; // Red
        else if (colNumber <= 4) colBgColor = 'FFD2A3'; // Orange
        else if (colNumber <= 6) colBgColor = 'D4D8DD'; // Gray
        else if (colNumber === 7) colBgColor = 'B3E5FC'; // Cyan
        else if (colNumber === 8) colBgColor = 'DDA0DD'; // Lavender
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        if (cell.value) {
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(maxLen + 2, 40);
    });

    // Apply borders
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `detailed_sales_report_${filterType}_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="animate-fade-in-up pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-serif text-paa-navy font-bold tracking-tight mb-2">Sales Intelligence</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Real-time revenue tracking across all channels</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-paa-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full sm:w-auto cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (Last 30 Days)</option>
            <option value="this_month">This Month</option>
            <option value="ytd">Year to Date (YTD)</option>
            <option value="select_month">Specific Month</option>
            <option value="lifetime">Lifetime (All Time)</option>
            <option value="custom">Custom Date Range</option>
          </select>
          
          {filterType === 'select_month' && (
            <div className="flex items-center gap-2 animate-fade-in w-full sm:w-auto">
              <input 
                type="month" 
                value={selectedMonthValue}
                onChange={(e) => setSelectedMonthValue(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500 transition-all cursor-pointer w-full sm:w-auto"
              />
            </div>
          )}
          
          {filterType === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in w-full sm:w-auto">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
              <span className="text-gray-400 font-medium text-sm">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button onClick={exportCSV} className="dash-btn-primary flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all w-full sm:w-auto cursor-pointer">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1: Total Revenue */}
        <div className="dash-kpi-card emerald flex flex-col justify-between p-5 bg-white border border-paa-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div>
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1 relative z-10">Total Revenue</p>
            <h3 className="text-3xl font-black text-paa-navy tracking-tight relative z-10">₹{totalRevenue.toLocaleString('en-IN')}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-emerald-800 relative z-10">
            <span>Web: ₹{kpiSplits.web.revenue.toLocaleString('en-IN')}</span>
            <span>Events: ₹{kpiSplits.events.revenue.toLocaleString('en-IN')}</span>
            <span>Fairs: ₹{kpiSplits.bookFairs.revenue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: Books Sold */}
        <div className="dash-kpi-card blue flex flex-col justify-between p-5 bg-white border border-paa-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div>
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1 relative z-10">Total Books Sold</p>
            <h3 className="text-3xl font-black text-paa-navy tracking-tight relative z-10">{totalBooksSold} <span className="text-xs font-medium text-gray-400 lowercase tracking-normal">units</span></h3>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-800 relative z-10">
            <span>Web: {kpiSplits.web.books}</span>
            <span>Events: {kpiSplits.events.books}</span>
            <span>Fairs: {kpiSplits.bookFairs.books}</span>
          </div>
        </div>

        {/* Card 3: Net Earnings */}
        <div className="dash-kpi-card amber flex flex-col justify-between p-5 bg-white border border-paa-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div>
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1 relative z-10">Net Earnings</p>
            <h3 className={`text-3xl font-black tracking-tight relative z-10 ${(totalRevenue - totalFeesPaid) < 0 ? 'text-red-600' : 'text-paa-navy'}`}>
              ₹{(totalRevenue - totalFeesPaid).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-amber-800 relative z-10">
            <span>Gross: ₹{totalRevenue.toLocaleString('en-IN')}</span>
            <span>Fees: -₹{totalFeesPaid.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* AreaChart: Revenue Trajectory */}
        <div className="lg:col-span-2 border border-paa-navy/5 p-5 md:p-6 rounded-2xl bg-white shadow-sm flex flex-col justify-between">
          <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-6">Revenue Trajectory</h4>
          <div className="h-[250px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReportRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={20} />
                  <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} width={60} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="linear" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorReportRev)" dot={(props: any) => { const { cx, cy, index } = props; const total = chartData.length; if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) { return <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#4f46e5" strokeWidth={2} key={`dot-${index}`} />; } return null; }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="revenue" position="top" content={(props: any) => {
                      const { x, y, value, index } = props;
                      const total = chartData.length;
                      if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) {
                        let anchor: "inherit" | "end" | "start" | "middle" = "middle";
                        let xOffset = x;
                        if (index === 0) {
                            anchor = "start";
                            xOffset = x; // Starts from dot center and extends right
                        } else if (index === total - 1) {
                            anchor = "end";
                            xOffset = x;
                        }
                        return <text x={xOffset} y={y - 10} fill="#4f46e5" fontSize="10px" fontWeight="bold" textAnchor={anchor}>₹{value}</text>;
                      }
                      return null;
                    }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">No sales data for this period.</div>
            )}
          </div>
        </div>

        {/* PieChart: Sales by Channel */}
        <div className="border border-paa-navy/5 p-5 md:p-6 rounded-2xl bg-white shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-2">Sales by Channel</h4>
            <p className="text-[10px] text-gray-400 mb-6 font-medium">Split of total revenue earned per channel</p>
          </div>
          <div className="h-[200px] w-full">
            {totalRevenue === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">No channel data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Web Orders', value: channelDataMap.Web },
                      { name: 'Events', value: channelDataMap.Events },
                      { name: 'Book Fairs', value: channelDataMap['Book Fairs'] }
                    ].filter(item => item.value > 0)}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value"
                  >
                    {[
                      { name: 'Web Orders', color: '#3b82f6' },
                      { name: 'Events', color: '#f59e0b' },
                      { name: 'Book Fairs', color: '#10b981' }
                    ].filter(c => channelDataMap[c.name === 'Web Orders' ? 'Web' : c.name === 'Events' ? 'Events' : 'Book Fairs'] > 0).map((c, index) => (
                      <Cell key={`cell-${index}`} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500/85"></div><span className="text-[10px] text-gray-500 font-bold uppercase">Web</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div><span className="text-[10px] text-gray-500 font-bold uppercase">Events</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[10px] text-gray-500 font-bold uppercase">Fairs</span></div>
          </div>
        </div>
      </div>



      {/* Row 3: Granular Data Table */}
      <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden relative min-h-[200px]">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
          <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest">Raw Sales Data</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {['All', 'Web Orders', 'Events', 'Book Fairs'].map(ch => (
              <button
                key={ch}
                onClick={() => setTableChannelFilter(ch)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${tableChannelFilter === ch ? 'bg-paa-navy text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
              >
                {ch}
              </button>
            ))}
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm ml-2 md:ml-4">
              {(tableData.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter)).length} Records
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="dash-table w-full min-w-[700px] text-left table-fixed">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="w-[12%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Date</th>
                <th className="w-[15%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Order ID</th>
                <th className="w-[12%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Channel</th>
                <th className="w-[20%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Event / Source</th>
                <th className="w-[20%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Book Title</th>
                <th className="w-[8%] px-5 py-3 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Qty</th>
                <th className="w-[10%] px-5 py-3 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Rev (₹)</th>
                <th className="w-[8%] px-5 py-3 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {(tableData.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter)).length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400 font-medium italic">No sales recorded in this period for the selected filter.</td></tr>
              )}
              {(tableData.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter)).map((row: any, idx: number) => (
                <tr key={idx} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} `}>
                  <td className="px-5 py-3 text-xs font-semibold text-paa-navy truncate">{row.date}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 font-mono truncate">{row.orderId}</td>
                  <td className="px-5 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${row.channel === 'Web Orders' ? 'bg-blue-50 text-blue-700 border border-blue-100' : row.channel === 'Events' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                      {row.channel === 'Web Orders' ? 'Web' : row.channel === 'Events' ? 'Events' : 'Fairs'}
                    </span>
                  </td>
                  <td className="px-5 py-3 pr-2 text-xs text-gray-600 truncate font-semibold" title={row.event}>{row.event}</td>
                  <td className="px-5 py-3 pr-2 text-xs text-paa-navy truncate" title={row.title}>{row.title}</td>
                  <td className="px-5 py-3 text-xs font-bold text-paa-navy text-right">{row.qty}</td>
                  <td className="px-5 py-3 text-xs font-black text-indigo-600 text-right">₹{row.revenue.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-center">
                    {row.rawPosOrderId && (
                      <button 
                        onClick={async () => {
                          if(window.confirm('Are you sure you want to delete this POS order? The inventory will be restored automatically.')) {
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/pos/orders/${row.rawPosOrderId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                              if (!res.ok) throw new Error('Failed to delete');
                              onRefresh();
                            } catch(err) {
                              console.error(err);
                              alert('Error deleting POS order');
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors"
                        title="Delete POS Order"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export function AuthorProfile({ data, onRefresh, buttonStates, setButtonStates }: { data: any, onRefresh: () => void, buttonStates: any, setButtonStates: any }) {
  const authorProfile = data.authorProfile;
  const authorOrders = data.authorOrders || [];
  const location = useLocation();
  const { action: targetAction, bookId: targetBookId } = location.state || {};

  const [editProfileForm, setEditProfileForm] = useState({
    name: authorProfile.name || '',
    penName: authorProfile.penName || '',
    city: authorProfile.city || '',
    state: authorProfile.state || '',
    instagram: authorProfile.instagram || '',
    facebook: authorProfile.facebook || '',
    address: authorProfile.address || '',
    aadharNumber: authorProfile.aadharNumber || '',
    qualification: authorProfile.qualification || '',
    age: authorProfile.age || '',
    experience: authorProfile.experience || '',
    skills: authorProfile.skills || '',
    hobbies: authorProfile.hobbies || '',
    whyJoining: authorProfile.whyJoining || '',
    bio: authorProfile.bio || '',
    phone: authorProfile.phone || '',
    whatsapp: authorProfile.whatsapp || ''
  });
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [selectedGalleryEvent, setSelectedGalleryEvent] = useState<any>(null);
  const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
  const [galleryUploadCaption, setGalleryUploadCaption] = useState('');
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);


  const handleUploadGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryEvent || !galleryUploadFile) return;
    try {
      setIsUploadingGallery(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', galleryUploadFile);
      formData.append('caption', galleryUploadCaption);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/gallery/${selectedGalleryEvent.id}/images`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        alert('Image uploaded successfully! It will appear in the gallery.');
        setGalleryUploadFile(null);
        setGalleryUploadCaption('');
        setSelectedGalleryEvent(null);
      } else {
        alert('Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingGallery(false);
    }
  };

  return (
    <>
      <div className="animate-fade-in-up">
        <div className="flex justify-between items-center mb-6 border-b border-paa-navy/5 pb-4">
          <div>
            <h2 className="text-2xl font-serif text-paa-navy tracking-tight">Edit My Profile</h2>
            <p className="text-sm text-paa-gray-text mt-1">Keep your author bio, books, and details up to date.</p>
          </div>
        </div>

        {(() => {
          let hasPending = authorProfile.status === 'Edited';
          if (!hasPending && authorProfile.extraData) {
            try {
              const ed = typeof authorProfile.extraData === 'string' ? JSON.parse(authorProfile.extraData) : authorProfile.extraData;
              if (ed.hasPendingEdits) hasPending = true;
            } catch (e) { }
          }

          if (hasPending) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-paa-navy/5 p-12 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100">
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-serif text-paa-navy font-medium mb-3">Edits Pending Approval</h3>
                <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
                  You have already submitted profile updates that are currently under review by our editorial team.
                  You will be able to edit your profile again once these changes are approved.
                </p>
              </div>
            );
          }

          return (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <AuthorRegistrationPage
                initialData={authorProfile}
                isAuthorEdit={true}
                hideNavbar={true}
                targetAction={targetAction}
                targetBookId={targetBookId}
                onReapplySuccess={() => {
                  onRefresh();
                }}
              />
            </div>
          );
        })()}
      </div>

    </>
  );
}

function BundleOffersTab({ data }: { data: any }) {
  const authorProfile = data?.authorProfile || {};

  const initialRules = authorProfile?.extraData?.bundleRules || [];
  if (initialRules.length === 0 && authorProfile?.extraData?.bundleRule) {
    initialRules.push({
      id: 1,
      buyCount: authorProfile.extraData.bundleRule.buyCount,
      discount: authorProfile.extraData.bundleRule.discount,
      enabled: authorProfile.extraData.bundleRule.enabled
    });
  }

  const [bundleRules, setBundleRules] = useState<any[]>(initialRules.length > 0 ? initialRules : [
    { id: Date.now(), buyCount: 3, discount: 50, enabled: false }
  ]);
  const [bundleSaving, setBundleSaving] = useState(false);

  const handleSaveBundle = async () => {
    setBundleSaving(true);
    try {
      const extraData = authorProfile?.extraData || {};
      extraData.bundleRules = bundleRules;
      if (bundleRules.length > 0) {
        extraData.bundleRule = bundleRules[0];
      }
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/profile/extra`, { extraData }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Bundle Offers updated successfully!');
    } catch (err) {
      toast.error('Failed to update Bundle Offers');
    } finally {
      setBundleSaving(false);
    }
  };

  const addRule = () => {
    setBundleRules([...bundleRules, { id: Date.now(), buyCount: 2, discount: 20, enabled: true }]);
  };

  const removeRule = (id: number) => {
    setBundleRules(bundleRules.filter(r => r.id !== id));
  };

  const updateRule = (id: number, field: string, value: any) => {
    setBundleRules(bundleRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-paa-navy/5 shadow-sm">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-serif font-bold text-paa-navy tracking-tight">Dynamic Bundle Offers</h2>
          <p className="text-sm text-gray-500 mt-1">Configure automated discount rules for customers buying multiple books.</p>
        </div>
        <button onClick={addRule} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full  transition-colors uppercase tracking-widest flex items-center gap-1">
          <Plus size={14} /> Add Offer
        </button>
      </div>

      <div className="space-y-4">
        {bundleRules.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">No active bundle offers. Click "Add Offer" to create one.</div>
        ) : bundleRules.map((rule, idx) => (
          <div key={rule.id} className="relative bg-white border border-gray-200 rounded-xl p-5 hover:border-paa-navy/20 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`bundleEnabled-${rule.id}`}
                  checked={rule.enabled}
                  onChange={e => updateRule(rule.id, 'enabled', e.target.checked)}
                  className="w-5 h-5 accent-paa-navy cursor-pointer"
                />
                <label htmlFor={`bundleEnabled-${rule.id}`} className={`text-sm font-bold ${rule.enabled ? 'text-paa-navy' : 'text-gray-400'} cursor-pointer`}>
                  {rule.enabled ? 'Active Offer' : 'Offer Disabled'}
                </label>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Buy Qty</label>
                  <input
                    type="number" min="2"
                    className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:border-paa-navy"
                    value={rule.buyCount}
                    onChange={e => updateRule(rule.id, 'buyCount', Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Discount (₹)</label>
                  <input
                    type="number" min="0"
                    className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:border-paa-navy"
                    value={rule.discount}
                    onChange={e => updateRule(rule.id, 'discount', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-500 bg-blue-50 px-3 py-1.5 rounded-full text-blue-800 font-medium">
                <strong>Preview:</strong> "Buy {rule.buyCount}+ books by this author, get ₹{rule.discount} off!"
              </p>
              <button onClick={() => removeRule(rule.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors" title="Remove Offer">
                <Minus size={16} />
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <button
            onClick={handleSaveBundle}
            disabled={bundleSaving}
            className="dash-btn dash-btn-primary min-w-[200px]"
          >
            {bundleSaving ? 'Saving...' : 'Save Bundle Offers'}
          </button>
        </div>
      </div>
    </div>
  );
}




class GalleryErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null };
  constructor(props: any) {
    super(props);
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Gallery Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-xl font-bold text-red-700 mb-2">Gallery Component Crashed</h2>
          <p className="text-red-600 font-mono text-sm whitespace-pre-wrap">{this.state.error?.toString()}</p>
          {/* @ts-ignore */}
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Try Again</button>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

function AuthorGallery({ dashboardData }: { dashboardData: any }) {
  return (
    <GalleryErrorBoundary>
      <AuthorGalleryInner dashboardData={dashboardData} />
    </GalleryErrorBoundary>
  );
}

function AuthorGalleryInner({ dashboardData }: { dashboardData: any }) {
  const [galleries, setGalleries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedGalleryEvent, setSelectedGalleryEvent] = React.useState<any>(null);
  const [galleryUploadFiles, setGalleryUploadFiles] = React.useState<File[]>([]);
  const [galleryUploadCaption, setGalleryUploadCaption] = React.useState('');
  const [isUploadingGallery, setIsUploadingGallery] = React.useState(false);

  // Lightbox
  const [lightboxImages, setLightboxImages] = React.useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const openLightbox = (images: any[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    document.body.style.overflow = 'auto';
  };

  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % lightboxImages.length);
    }
  };

  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length);
    }
  };
  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const [filterDate, setFilterDate] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date_desc');

  React.useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/gallery/events`);
      const now = new Date();
      setGalleries(res.data.filter((e: any) => new Date(e.date) <= now));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryEvent || galleryUploadFiles.length === 0) return;
    try {
      setIsUploadingGallery(true);
      const token = localStorage.getItem('token');

      const promises = galleryUploadFiles.map(file => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('caption', galleryUploadCaption);
        return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/gallery/${selectedGalleryEvent.id}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      });

      const responses = await Promise.all(promises);
      const newImages: any[] = [];
      for (const r of responses) {
        if (r.ok) {
          try { newImages.push(await r.json()); } catch (_) {}
        }
      }

      if (newImages.length > 0) {
        toast.success(`${newImages.length} image(s) uploaded successfully!`);
      } else {
        toast.error('Failed to upload images.');
      }
      setGalleryUploadFiles([]);
      setGalleryUploadCaption('');
      
      // Re-fetch galleries and update selectedGalleryEvent from fresh data
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/gallery/events`);
        const now = new Date();
        const filteredData = res.data.filter((e: any) => new Date(e.date) <= now);
        setGalleries(filteredData);
        const updatedEvent = filteredData.find((ge: any) => ge.id === selectedGalleryEvent.id);
        if (updatedEvent) {
          setSelectedGalleryEvent(updatedEvent);
        }
      } catch (_) {
        fetchGalleries();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image.');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-paa-navy" /></div>;

  const filteredGalleries = galleries.filter(ge => {
    const matchSearch = (ge.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                        (ge.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                        (ge.city?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchType = filterType ? ge.type === filterType : true;
    const matchDate = filterDate ? new Date(ge.date).toISOString().startsWith(filterDate) : true;
    const isPastEvent =
      ge.type === 'Airport Library' ||
      checkIsPastEvent(ge.date, ge.duration || '1 Day');
    return matchSearch && matchType && matchDate && isPastEvent;
  }).sort((a: any, b: any) => {
    if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'name_asc') return (a.event?.name || a.type || '').localeCompare(b.event?.name || b.type || '');
    if (sortBy === 'name_desc') return (b.event?.name || b.type || '').localeCompare(a.event?.name || a.type || '');
    return 0;
  });

  const authorNameString = `(Uploaded by ${dashboardData?.authorProfile?.name || ''})`;

  if (selectedGalleryEvent) {
    return (
        <div className="dash-panel animate-fade-in-up">
          <div className="dash-panel-header flex justify-between items-center">
            <div>
              <h3 className="dash-panel-title">{(selectedGalleryEvent.event?.name || selectedGalleryEvent.type) + ' @ ' + selectedGalleryEvent.location}</h3>
              <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-bold text-[10px]">Gallery Management</p>
            </div>
            <button onClick={() => { setSelectedGalleryEvent(null); setGalleryUploadFiles([]); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
              &larr; Back to Events
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-50/30">
            {/* Upload Section */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm h-fit">
              <h4 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4 border-b border-gray-100 pb-2">Upload New Photos</h4>
              <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleUploadGalleryImage} className="flex flex-col gap-4">
                <div>
                  <label className="dash-label">Photos (Select Multiple) *</label>
                  <input type="file" multiple accept="image/*" className="dash-input text-xs w-full" onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                          const selected = Array.from(e.target.files);
                          setGalleryUploadFiles(prev => [...prev, ...selected]);
                      }
                  }} />
                </div>
                {galleryUploadFiles.length > 0 && (
                   <div className="flex gap-2 overflow-x-auto py-2 px-1">
                      {galleryUploadFiles.map((file, i) => (
                         <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 group shadow-sm">
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                            <button type="button" onClick={() => setGalleryUploadFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                               <X size={12} />
                            </button>
                         </div>
                      ))}
                   </div>
                )}
                <div>
                  <label className="dash-label">Caption (Optional)</label>
                  <input className="dash-input w-full" placeholder="e.g., Book signing moment..." value={galleryUploadCaption} onChange={e => setGalleryUploadCaption(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setGalleryUploadFiles([])} className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Clear</button>
                  <button type="submit" disabled={isUploadingGallery} className="dash-btn dash-btn-primary disabled:opacity-50">{isUploadingGallery ? 'Uploading...' : 'Upload Image'}</button>
                </div>
              </form>
</FocusTrap>
            </div>

            {/* Event Images Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
              <h4 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4 border-b border-gray-100 pb-2">
                Event Photos ({(selectedGalleryEvent.images?.filter((img: any) => img.status === 'Approved' || String(img.caption || '').includes(authorNameString)) || []).length})
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                 {(selectedGalleryEvent.images?.filter((img: any) => img.status === 'Approved' || String(img.caption || '').includes(authorNameString)) || []).map((img: any) => (
                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 border border-gray-200 shadow-sm cursor-pointer" onClick={() => openLightbox(selectedGalleryEvent.images?.filter((i: any) => i.status === 'Approved' || String(i.caption || '').includes(authorNameString)) || [], selectedGalleryEvent.images?.filter((i: any) => i.status === 'Approved' || String(i.caption || '').includes(authorNameString)).findIndex((i: any) => i.id === img.id))}>
                       <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${img.url || ''}`} className="w-full h-full object-cover" alt="Gallery photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                       
                       <div className="absolute top-2 left-2 z-10">
                         <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-sm shadow-md ${img.status === 'Approved' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                           {img.status || 'Pending'}
                         </span>
                       </div>

                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                          <div className="flex justify-end items-start">
                             {String(img.caption || '').includes(authorNameString) && (
                               <button onClick={async (e) => {
                                 e.stopPropagation();
                                 if(window.confirm('Delete this photo completely?')) {
                                    try {
                                      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/gallery/images/${img.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                      toast.success('Photo deleted.');
                                      setSelectedGalleryEvent({...selectedGalleryEvent, images: selectedGalleryEvent.images.filter((i: any) => i.id !== img.id)});
                                    } catch (err) { toast.error('Failed to delete photo.'); }
                                 }
                               }} className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm" title="Delete Photo">
                                 <Trash2 size={12} />
                               </button>
                             )}
                          </div>
                          
                          <div className="mt-auto pb-1 px-1">
                             {String(img.caption || '').replace(/\(Uploaded by .*?\)/, '').trim() && (
                               <p className="text-white text-xs line-clamp-2 font-medium leading-tight drop-shadow-md mb-1">
                                 {String(img.caption || '').replace(/\(Uploaded by .*?\)/, '').trim()}
                               </p>
                             )}
                             {String(img.caption || '').match(/\(Uploaded by (.*?)\)/) && (
                               <p className="text-paa-gold text-[9px] uppercase tracking-widest font-bold">
                                 By: {String(img.caption || '').match(/\(Uploaded by (.*?)\)/)?.[1]}
                               </p>
                             )}
                          </div>
                       </div>
                    </div>
                 ))}
                 {(!selectedGalleryEvent.images || selectedGalleryEvent.images.filter((img: any) => img.status === 'Approved' || String(img.caption || '').includes(authorNameString)).length === 0) && (
                    <div className="col-span-full py-16 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                       <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                       You haven't uploaded any photos for this event yet.
                    </div>
                 )}
              </div>
            </div>
          </div>
          
          {lightboxIndex !== null && (
            <div 
              className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={closeLightbox}
            >
              <button 
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
                onClick={closeLightbox}
              >
                <X size={32} />
              </button>
              
              <div className="relative max-w-5xl w-full h-full max-h-[85vh] flex items-center justify-center flex-col gap-4">
                <button 
                  className="absolute left-0 md:-left-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 transition-colors hover:scale-110 active:scale-95 z-50"
                  onClick={showPrev}
                >
                  <ChevronLeft size={48} />
                </button>
                
                <img 
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${lightboxImages[lightboxIndex].url}`}
                  alt={lightboxImages[lightboxIndex].caption || 'Event photo'}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
                
                {lightboxImages[lightboxIndex].caption && (
                   <div className="flex flex-col items-center mt-4">
                     {String(lightboxImages[lightboxIndex].caption || '').replace(/\(Uploaded by .*?\)/, '').trim() && (
                       <p className="text-white/90 text-sm md:text-base font-medium bg-black/60 px-6 py-2.5 rounded-full max-w-2xl text-center" onClick={(e) => e.stopPropagation()}>
                         {String(lightboxImages[lightboxIndex].caption || '').replace(/\(Uploaded by .*?\)/, '').trim()}
                       </p>
                     )}
                     {String(lightboxImages[lightboxIndex].caption || '').match(/\(Uploaded by (.*?)\)/) && (
                       <div className="flex items-center gap-2 mt-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5" onClick={(e) => e.stopPropagation()}>
                         <div className="w-5 h-5 rounded-full bg-paa-gold/20 flex items-center justify-center">
                           <User size={12} className="text-paa-gold" />
                         </div>
                         <span className="text-white/80 text-xs font-bold tracking-wider uppercase">{String(lightboxImages[lightboxIndex].caption || '').match(/\(Uploaded by (.*?)\)/)?.[1]}</span>
                       </div>
                     )}
                   </div>
                )}
    
                <button 
                  className="absolute right-0 md:-right-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 transition-colors hover:scale-110 active:scale-95 z-50"
                  onClick={showNext}
                >
                  <ChevronRight size={48} />
                </button>
              </div>
            </div>
          )}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dash-panel">
        <div className="dash-panel-header">
          <h2 className="dash-panel-title">Event Galleries</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-6">Select an event below to upload your photos. They will be shared in the public gallery instantly!</p>

          <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-paa-navy/5 shadow-sm">
            <div className="flex-[3] min-w-[300px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search by event, location, or city..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="dash-input w-full h-full min-w-[280px]" style={{ paddingLeft: '2.5rem' }} />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="dash-input md:w-48">
              <option value="">All Types</option>
              {Array.from(new Set(galleries.map(g => g.type))).filter(Boolean).map((t: any) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="dash-input md:w-40" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="dash-input md:w-48">
              <option value="date_desc">Latest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGalleries.map(ge => (
              <div key={ge.id} className="group relative bg-white border border-paa-navy/10 rounded-xl overflow-hidden shadow-sm hover:shadow-premium transition-all duration-500 ease-out flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-paa-navy/5 shrink-0">
                  {ge.images && ge.images.length > 0 ? (
                     <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${ge.images[0].url}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" alt="Event cover" />
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-paa-navy/40 group-hover:scale-105 transition-transform duration-700 ease-in-out bg-gradient-to-br from-paa-cream to-gray-200">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest text-paa-navy/60">No Photos Yet</span>
                     </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-paa-navy/90 via-paa-navy/40 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-serif font-bold text-white text-xl leading-tight line-clamp-1">{ge.event?.name || ge.type}</h3>
                    <p className="text-[10px] font-bold tracking-widest text-paa-gold uppercase mt-1 flex items-center gap-1.5">
                       <CalendarIcon size={12} /> {new Date(ge.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1 bg-white">
                  <div className="flex items-center justify-between mb-4">
                     <div>
                       <p className="text-sm font-bold text-paa-navy">{ge.location}</p>
                       <p className="text-xs text-gray-500 line-clamp-1">{ge.description || 'No description available'}</p>
                     </div>
                     <div className="text-right">
                       <span className="text-xl font-black text-paa-navy leading-none">{ge.images?.filter((i: any) => i.status === 'Approved').length || 0}</span>
                       <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Approved</p>
                     </div>
                  </div>

                  {ge.images && ge.images.length > 0 ? (
                    <div className="flex -space-x-2 overflow-hidden mb-5">
                      {ge.images.filter((img: any) => img.status === 'Approved').slice(0, 5).map((img: any, idx: number) => (
                        <div key={img.id} className="relative z-10 inline-block h-10 w-10 rounded-full ring-2 ring-white overflow-hidden bg-gray-100" style={{ zIndex: 10 - idx }}>
                          <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${img.url}`} className="w-full h-full object-cover" alt="Preview" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      ))}
                      {ge.images.filter((img: any) => img.status === 'Approved').length > 5 && (
                        <div className="relative z-0 flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white bg-gray-50 border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500">+{ge.images.filter((img: any) => img.status === 'Approved').length - 5}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 mb-5 flex items-center">
                       <p className="text-xs text-gray-400 font-medium italic">Be the first to upload photos!</p>
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    <button onClick={() => setSelectedGalleryEvent(ge)} className="flex-1 dash-btn flex justify-center items-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm rounded-xl text-sm font-semibold">
                       <ImageIcon className="w-4 h-4" /> View Gallery
                    </button>
                    <button onClick={() => setSelectedGalleryEvent(ge)} className="flex-1 dash-btn flex justify-center items-center gap-2 py-2.5 bg-paa-navy text-white hover:bg-paa-gold hover:text-paa-navy transition-colors shadow-sm rounded-xl text-sm font-semibold">
                       <Upload className="w-4 h-4" /> Upload
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredGalleries.length === 0 && (
            <div className="py-20 text-center bg-gray-50 rounded-3xl-2xl border border-gray-100 shadow-inner mt-4">
               <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
               <p className="text-paa-navy font-serif text-xl">No active galleries found.</p>
               <p className="text-gray-500 text-sm mt-2">Adjust your filters to discover events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




function AuthorReviews({ books, orders }: { books: any[], orders: any[] }) {
  const [view, setView] = useState<'book' | 'delivery'>('book');
  const booksWithReviews = books.filter(b => b.reviews && b.reviews.length > 0);
  const deliveryReviews = orders.filter(o => o.feedbackRating != null);

  if (booksWithReviews.length === 0 && deliveryReviews.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl-2xl border border-gray-100 border-dashed">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-serif text-paa-navy">No reviews yet</h3>
        <p className="text-gray-500 text-sm mt-1">Your books haven't received any customer reviews or delivery feedback yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="mb-2">
        <h2 className="text-2xl font-serif text-paa-navy tracking-tight">Customer Reviews & Ratings</h2>
        <p className="text-sm text-gray-500 mt-1">See what readers are saying about your published works and delivery experience.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('book')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${view === 'book' ? 'bg-paa-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Book Reviews ({booksWithReviews.reduce((acc, b) => acc + b.reviews.length, 0)})
        </button>
        <button onClick={() => setView('delivery')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${view === 'delivery' ? 'bg-paa-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Delivery Feedback ({deliveryReviews.length})
        </button>
      </div>

      {view === 'book' ? (
        booksWithReviews.length > 0 ? (
          booksWithReviews.map(book => {
            const avgRating = book.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / book.reviews.length;
            return (
              <div key={book.id} className="bg-white rounded-3xl-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-paa-navy text-lg">{book.title}</h3>
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl shadow-sm border border-gray-100">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-paa-navy">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({book.reviews.length} reviews)</span>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {book.reviews.map((r: any) => (
                    <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-paa-navy">{r.reviewerName}</div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-paa-gray-text uppercase">Overall</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-3 h-3 ${star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          {r.writingStyleRating && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-paa-gray-text uppercase">Writing</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className={`w-2.5 h-2.5 ${star <= r.writingStyleRating ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                          )}
                          {r.contentQualityRating && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-paa-gray-text uppercase">Content</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className={`w-2.5 h-2.5 ${star <= r.contentQualityRating ? 'text-green-500 fill-green-500' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {r.enjoyedMost && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block">Enjoyed Most:</span>
                          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.enjoyedMost}</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 italic">"{r.comment || 'No comment provided'}"</p>
                      <div className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100">No book reviews found.</div>
        )
      ) : (
        deliveryReviews.length > 0 ? (
          <div className="bg-white rounded-3xl-2xl border border-gray-100 shadow-sm overflow-hidden p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveryReviews.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-sm text-paa-navy">{r.bookTitle}</div>
                    <div className="text-xs text-gray-500">Order #PAA-{String(r.orderId).padStart(4, '0')}</div>
                  </div>
                  <div className={`flex px-2 py-1 rounded-lg w-fit items-center gap-1 ${r.feedbackRating <= 3 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span className="font-bold text-sm">{r.feedbackRating}</span>
                    <Star className={`w-3 h-3 ${r.feedbackRating <= 3 ? 'fill-red-500 text-red-500' : 'fill-amber-500 text-amber-500'}`} />
                  </div>
                </div>
                <div className="mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${r.feedbackCondition === 'Damaged' || r.feedbackCondition === 'Average' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {r.feedbackCondition}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic mt-2">"{r.feedbackComments || 'No comment provided'}"</p>
                <div className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">{new Date(r.date).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100">No delivery feedback found.</div>
        )
      )}
    </div>
  );
}

function AuthorQueries() {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'All' | 'Pending' | 'Answered' | 'Resolved'>('All');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [key: string]: boolean }>({});
  const [expandedQueryId, setExpandedQueryId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/queries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter out any contact form / system messages if they exist
      const mappedQueries = res.data
        .filter((q: any) => !q.subject?.startsWith('Contact Form'))
        .map((q: any) => ({
          ...q,
          itemType: 'Query'
        }));
      setQueries(mappedQueries);
    } catch (err) {
      toast.error('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  const countWords = (text: string) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleReply = async (id: number) => {
    if (!replyText[id]?.trim()) return;
    const wordCount = countWords(replyText[id]);
    if (wordCount > 100) {
      toast.error(`Reply message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsReplying({ ...isReplying, [id]: true });
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/author/queries/${id}/reply`, { reply: replyText[id] }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Reply sent!');
      setReplyText({ ...replyText, [id]: '' });
      fetchQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setIsReplying({ ...isReplying, [id]: false });
    }
  };

  const filteredQueries = queries.filter(q => {
    const matchesFilter = filterType === 'All' || 
                          (filterType === 'Pending' && q.status === 'Pending') ||
                          (filterType === 'Answered' && q.status === 'Answered') ||
                          (filterType === 'Resolved' && q.status === 'Resolved');
    
    if (!matchesFilter) return false;
    
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      return (q.subject?.toLowerCase().includes(lowerQ) || 
              q.author?.name?.toLowerCase().includes(lowerQ) || 
              q.user?.name?.toLowerCase().includes(lowerQ) ||
              q.author?.email?.toLowerCase().includes(lowerQ) ||
              q.user?.email?.toLowerCase().includes(lowerQ));
    }
    
    return true;
  });

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-paa-navy" /></div>;

  return (
    <div className="dash-panel overflow-hidden mb-7 w-full animate-fade-in-up min-h-[calc(100vh-250px)]">
       <div className="dash-panel-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200 shrink-0">
             <MessageSquare className="w-5 h-5" />
           </div>
           <div>
             <h2 className="dash-panel-title">Queries & Issues</h2>
             <p className="text-xs text-gray-500 font-medium mt-1">Manage and view queries reported by your buyers</p>
           </div>
         </div>
         <button onClick={() => fetchQueries()} className="p-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-full text-paa-navy transition-colors shadow-premium hover:shadow-md active:scale-95 shrink-0">
           <RefreshCw size={18} />
         </button>
       </div>

       <div className="flex flex-col gap-4 mb-4 px-6">
           <div className="flex flex-nowrap gap-1 p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit max-w-full overflow-hidden shrink-0">
            {[
              { id: 'All', label: 'All', count: queries.length },
              { id: 'Pending', label: 'New Tickets', count: queries.filter(q => q.status === 'Pending').length },
              { id: 'Answered', label: 'Opened Tickets', count: queries.filter(q => q.status === 'Answered').length },
              { id: 'Resolved', label: 'Closed Tickets', count: queries.filter(q => q.status === 'Resolved').length }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap ${filterType === t.id ? 'bg-paa-navy text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filterType === t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
              </button>
            ))}
           </div>
           
           <div className="flex justify-end w-full">
              <div className="relative w-full sm:w-64 min-w-[150px]">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                 <input type="text" placeholder="Search queries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm h-[38px]" />
              </div>
           </div>
       </div>

       <div className="overflow-x-auto">
           <table className="dash-table w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="px-4 py-4 w-12 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest text-center">Ticket #</th>
                  <th className="px-6 py-4 w-1/4 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Subject</th>
                  <th className="px-4 py-4 !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">From</th>
                  <th className="px-4 py-4 text-center !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-right !text-[14px] !text-indigo-800 !bg-transparent uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQueries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                          <p className="text-sm font-medium">No queries or issues found.</p>
                        </div>
                      </td>
                    </tr>
                ) : filteredQueries.map((q, idx) => (
                    <React.Fragment key={q.id}>
                        <tr className={`transition-colors  ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'}`}>
                            <td className="px-4 py-4 text-center font-bold text-gray-500 text-xs">
                                TKT-{q.id.toString().padStart(4, '0')}
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-paa-navy whitespace-normal max-w-xs line-clamp-2">{q.subject}</div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="text-sm font-semibold text-gray-700">{q.author?.name || q.user?.name || 'Unknown'}</div>
                                <div className="text-[10px] text-gray-500">{q.author?.email || q.user?.email || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-4 text-center">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${q.status === 'Resolved' ? 'bg-green-100 text-green-800' : q.status === 'Pending' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {q.status === 'Resolved' ? 'Closed' : q.status === 'Pending' ? 'New' : 'Opened'}
                                </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                                <button onClick={() => setExpandedQueryId(expandedQueryId === q.id ? null : q.id)} className="px-3 py-1 bg-white border border-gray-200 text-xs font-bold text-paa-navy rounded hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-1">
                                    {expandedQueryId === q.id ? 'Close' : 'View Thread'} <ChevronDown size={14} className={`transform transition-transform duration-300 ${expandedQueryId === q.id ? 'rotate-180' : ''}`} />
                                </button>
                            </td>
                        </tr>
                        {expandedQueryId === q.id && (
                            <tr>
                                <td colSpan={5} className="p-0 border-b border-gray-200 bg-gray-50">
                                  <div className="p-4 flex flex-col gap-4">
                                    <div className="flex-1 max-w-4xl mx-auto w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                                      <QueryThreadDisplay query={q} currentUserType="Author" />
                                    </div>
                                    
                                    {q.status !== 'Resolved' && (
                                      <div className="shrink-0 pt-4 border-t border-gray-100 max-w-4xl mx-auto w-full">
                                        <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 px-4 py-2 shadow-sm focus-within:border-paa-navy focus-within:ring-1 focus-within:ring-paa-navy/20 transition-all">
                                          <input
                                            type="text"
                                            placeholder="Type reply..."
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400"
                                            value={replyText[q.id] || ''}
                                            onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && replyText[q.id]?.trim() && !isReplying[q.id]) {
                                                handleReply(q.id);
                                              }
                                            }}
                                          />
                                          <button
                                            onClick={() => handleReply(q.id)}
                                            disabled={isReplying[q.id] || !replyText[q.id]?.trim()}
                                            className="p-2 bg-paa-navy text-white rounded-full hover:bg-paa-gold transition-colors disabled:opacity-50 disabled:hover:bg-paa-navy flex shrink-0 items-center justify-center"
                                            title="Send Reply"
                                          >
                                            <Send size={16} className={isReplying[q.id] ? "opacity-50" : ""} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
              </tbody>
           </table>
       </div>
    </div>
  );
}
