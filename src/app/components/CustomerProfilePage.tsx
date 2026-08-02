import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import axios from "axios";
import { User, LogOut, Package, ArrowRight, MessageSquare, Mail, Phone, Check, BookOpen, Send, Star } from "lucide-react";
import fictionData from "./data/fiction_catalogue.json";
import nonFictionData from "./data/non_fiction_catalogue.json";
import { OrderFulfillmentTimeline } from "./OrderFulfillmentTimeline";
import { QueryThreadDisplay } from "./QueryThreadDisplay";
import FocusTrap from 'focus-trap-react';

export function CustomerProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false);
  const prevOrdersRef = React.useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddressObj, setEditAddressObj] = useState({ houseNo: "", street: "", city: "", state: "", pincode: "" });
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const selectedOrderRef = React.useRef(selectedOrder);
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [queryAuthor, setQueryAuthor] = useState<any>(null);
  const [queryAuthorId, setQueryAuthorId] = useState<number | null>(null);
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  const [feedbackModalOpen, setFeedbackModalOpen] = useState<{ itemId: number, title: string } | null>(null);
  const [feedbackCondition, setFeedbackCondition] = useState("Excellent");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [expandedQueriesOrder, setExpandedQueriesOrder] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchProfile = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data.user.role !== "CUSTOMER") {
          navigate(res.data.user.role === "ADMIN" ? "/operations" : "/dashboard");
          return;
        }
        setUserData(res.data.user);
        setEditName(res.data.user.name);
        
        // Try to parse existing address if it follows the checkout format
        let parsed = { houseNo: "", street: res.data.user.address || "", city: "", state: "", pincode: "" };
        if (res.data.user.address && res.data.user.address.includes(' - ')) {
          try {
            const parts = res.data.user.address.split(', ');
            if (parts.length >= 4) {
              parsed.houseNo = parts[0];
              parsed.street = parts[1];
              parsed.city = parts[2];
              const statePin = parts[3].split(' - ');
              parsed.state = statePin[0] || "";
              parsed.pincode = statePin[1] || "";
            }
          } catch(e) {}
        }
        setEditAddressObj(parsed);
        setEditPhone(res.data.user.phone || "");
        
        const newOrders = res.data.customerOrders || [];
        
        // Check for updates
        if (prevOrdersRef.current && JSON.stringify(prevOrdersRef.current) !== JSON.stringify(newOrders)) {
          setHasOrderUpdates(true);
        }
        prevOrdersRef.current = newOrders;
        
        setOrders(newOrders);
        
        // Update selectedOrder ONLY if it's currently open
        if (selectedOrderRef.current) {
          const updatedOrder = (res.data.customerOrders || []).find((o: any) => o.id === selectedOrderRef.current.id);
          if (updatedOrder) setSelectedOrder(updatedOrder);
        }

        setLoading(false);
        fetchQueries();
      })
      .catch(err => {
        console.error(err);
        localStorage.removeItem("token");
        navigate("/login");
      });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsRefreshing(true);
      try {
        await fetchProfile();
      } finally {
        setTimeout(() => setIsRefreshing(false), 800);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    if (!editName || !editName.trim()) {
      alert("Full Name is required.");
      return;
    }
    const cleanPhone = (editPhone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit Mobile Number.");
      return;
    }
    if (!editAddressObj.street?.trim() || !editAddressObj.city?.trim() || !editAddressObj.state?.trim() || !editAddressObj.pincode?.trim()) {
      alert("Please fill all required address details: Street Address, City, State, and PIN Code.");
      return;
    }
    if (!/^\d{6}$/.test(editAddressObj.pincode.trim())) {
      alert("Please enter a valid 6-digit PIN Code.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const fullAddress = editAddressObj.houseNo && editAddressObj.houseNo.trim()
        ? `${editAddressObj.houseNo.trim()}, ${editAddressObj.street.trim()}, ${editAddressObj.city.trim()}, ${editAddressObj.state.trim()} - ${editAddressObj.pincode.trim()}`
        : `${editAddressObj.street.trim()}, ${editAddressObj.city.trim()}, ${editAddressObj.state.trim()} - ${editAddressObj.pincode.trim()}`;
        
      const res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/profile`, 
        { name: editName.trim(), address: fullAddress, phone: cleanPhone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData(res.data);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  
  const handleCancelOrder = async (orderId: number) => {
    if (cancellingOrderId === orderId) return;
    if (!window.confirm("Are you sure you want to cancel this order? This cannot be undone.")) return;
    try {
      setCancellingOrderId(orderId);
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Order cancelled successfully");
      setSelectedOrder(null);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  
  const fetchQueries = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const countWords = (text: string) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject || !queryMessage) return;
    const wordCount = countWords(queryMessage);
    if (wordCount > 100) {
      alert(`Query message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsSubmittingQuery(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries`, {
        subject: querySubject, message: queryMessage, authorId: queryAuthorId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsQueryModalOpen(false);
      setQuerySubject('');
      setQueryMessage('');
      fetchQueries();
      alert("Query submitted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit query");
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const handleCustomerReply = async (queryId: number) => {
    if (!replyText[queryId]?.trim()) return;
    const wordCount = countWords(replyText[queryId]);
    if (wordCount > 100) {
      alert(`Reply message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsReplying({ ...isReplying, [queryId]: true });
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries/${queryId}/reply`, {
        reply: replyText[queryId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyText({ ...replyText, [queryId]: '' });
      fetchQueries();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to send reply");
    } finally {
      setIsReplying({ ...isReplying, [queryId]: false });
    }
  };

  const openQueryForOrder = (orderId: number, author: any, bookTitle?: string) => {
    setQuerySubject(`Issue with Order #${orderId}${bookTitle ? ` - ${bookTitle}` : ''}`);
    setQueryMessage('');
    setQueryAuthor(author || null);
    setQueryAuthorId(author?.id || null);
    setIsQueryModalOpen(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalOpen) return;
    const itemId = feedbackModalOpen.itemId;
    setAcknowledging(itemId);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/order-items/${itemId}/acknowledge`, {
        condition: feedbackCondition,
        rating: feedbackRating,
        comments: feedbackComments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackModalOpen(null);
      setFeedbackCondition("Excellent");
      setFeedbackRating(5);
      setFeedbackComments("");
      fetchProfile();
    } catch (err) {
      alert("Failed to acknowledge order");
      console.error(err);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) return (
    <main style={{ fontFamily: "var(--font-body)", background: "#fafafa", minHeight: "100vh", padding: "10rem 1.10rem" }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.skel{background:linear-gradient(90deg,#eee 25%,#e0e0e0 50%,#eee 75%);background-size:800px 100%;animation:shimmer 1.5s infinite linear;border-radius:4px}`}</style>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div className="skel" style={{ width: 220, height: 28, marginBottom: 8 }}></div>
        <div className="skel" style={{ width: 280, height: 14, marginBottom: 40 }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem" }} className="profile-grid">
          <div style={{ background: "#fff", border: "1px solid #eaeaea", padding: "2rem" }}>
            <div className="skel" style={{ width: 64, height: 64, borderRadius: "50%", marginBottom: 16 }}></div>
            <div className="skel" style={{ width: "80%", height: 18, marginBottom: 8 }}></div>
            <div className="skel" style={{ width: "60%", height: 14, marginBottom: 24 }}></div>
            <div style={{ borderTop: "1px solid #eaeaea", paddingTop: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skel" style={{ width: "100%", height: 14, marginBottom: 10 }}></div>)}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #eaeaea" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #eaeaea" }}>
              <div className="skel" style={{ width: 140, height: 20 }}></div>
            </div>
            {[1,2,3].map(i => (
              <div key={i} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 24 }}>
                <div className="skel" style={{ width: 80, height: 14 }}></div>
                <div className="skel" style={{ width: 100, height: 14 }}></div>
                <div className="skel" style={{ width: 60, height: 14 }}></div>
                <div className="skel" style={{ width: 80, height: 14 }}></div>
                <div className="skel" style={{ width: 90, height: 28, marginLeft: "auto" }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <>

      {/* Blinking Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden pointer-events-none">
        {isRefreshing && <div className="h-full bg-paa-navy animate-[pulse_0.5s_ease-in-out_infinite] w-full" />}
      </div>

      {/* Query Modal */}
      {isQueryModalOpen && (
        <div className="fixed inset-0 bg-paa-navy/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6">
            <h2 className="text-xl font-serif text-paa-navy mb-4">Raise a Query</h2>
            
            {queryAuthor && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded">
                <p className="text-sm font-bold text-paa-navy mb-2">Before raising a query, you can contact the author directly:</p>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-800">{queryAuthor.name}</span>
                  {queryAuthor.whatsapp && queryAuthor.whatsapp !== 'NA' && (
                    <a href={`https://wa.me/${queryAuthor.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-green-700 flex items-center gap-2 hover:underline">
                      <MessageSquare size={14} /> WhatsApp: {queryAuthor.whatsapp}
                    </a>
                  )}
                  {queryAuthor.email && queryAuthor.email !== 'NA' && (
                    <a href={`mailto:${queryAuthor.email}`} className="text-sm font-medium text-blue-700 flex items-center gap-2 hover:underline">
                      <Mail size={14} /> {queryAuthor.email}
                    </a>
                  )}
                  {queryAuthor.phone && queryAuthor.phone !== 'NA' && (!queryAuthor.whatsapp || queryAuthor.whatsapp === 'NA') && (
                    <a href={`tel:${queryAuthor.phone}`} className="text-sm font-medium text-gray-700 flex items-center gap-2 hover:underline">
                      <Phone size={14} /> Call: {queryAuthor.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleCreateQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Subject / Order ID *</label>
                <input required type="text" value={querySubject} onChange={e => setQuerySubject(e.target.value)} className="w-full border p-2 text-sm outline-none" placeholder="e.g. Issue with Order #123" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Message *</label>
                <textarea required rows={4} value={queryMessage} onChange={e => setQueryMessage(e.target.value)} className="w-full border p-2 text-sm outline-none resize-y" placeholder="Describe your issue..." />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsQueryModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-xs font-bold uppercase">Cancel</button>
                <button type="submit" disabled={isSubmittingQuery} className="flex-1 py-2 bg-paa-navy text-white text-xs font-bold uppercase hover:bg-paa-gold hover:text-paa-navy">{isSubmittingQuery ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
</FocusTrap>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 bg-paa-navy/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-serif text-paa-navy mb-2">Delivery Feedback</h2>
            <p className="text-sm text-gray-600 mb-6">How was your experience for <span className="font-bold">"{feedbackModalOpen.title}"</span>?</p>
            <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleFeedbackSubmit} className="space-y-4">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Book Condition *</label>
                  <select required value={feedbackCondition} onChange={e => setFeedbackCondition(e.target.value)} className="w-full border p-2 text-sm outline-none bg-white">
                    <option value="Excellent">Excellent - Mint condition</option>
                    <option value="Good">Good - Minor wear</option>
                    <option value="Average">Average - Noticeable wear</option>
                    <option value="Damaged">Damaged - Creased, torn, or wet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Delivery Speed Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button type="button" key={star} onClick={() => setFeedbackRating(star)} className={`text-2xl ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Delivery Comments (Optional)</label>
                  <textarea rows={3} value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)} className="w-full border p-2 text-sm outline-none resize-y bg-white" placeholder="Tell us about the packaging, delivery time, etc." />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setFeedbackModalOpen(null)} className="flex-1 py-3 bg-gray-200 text-xs font-bold uppercase">Cancel</button>
                <button type="submit" disabled={acknowledging === feedbackModalOpen.itemId} className="flex-1 py-3 bg-paa-navy text-white text-xs font-bold uppercase hover:bg-paa-gold hover:text-paa-navy">
                  {acknowledging === feedbackModalOpen.itemId ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
</FocusTrap>
          </div>
        </div>
      )}


    <main style={{ fontFamily: "var(--font-body)", minHeight: "calc(100vh - 64px)", background: "#f8fafc" }} className="px-4 pt-32 pb-8 md:px-8 md:pt-40 md:pb-16">
      <div style={{ maxWidth: 1300, margin: "0 auto", width: "100%" }}>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
          <div>
            <div className="inline-block bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-2xs">
              My Account
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Welcome back, <span className="italic text-amber-600 underline decoration-amber-300 decoration-2 underline-offset-4">{userData?.name.split(' ')[0]}</span>
            </h1>
          </div>

          {/* Prominent Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white font-extrabold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-700 active:scale-95 transition-all duration-200 border border-red-400/40 cursor-pointer"
          >
            <LogOut size={16} className="stroke-[2.5]" />
            <span>Sign Out</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "290px minmax(0, 1fr)", gap: "2rem" }} className="profile-grid">
          
          <div>
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-teal-100 border-2 border-emerald-600 rounded-2xl flex items-center justify-center shadow-xs text-emerald-900">
                  <User size={28} className="stroke-[2.2]" />
                </div>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-800 hover:text-white font-bold px-3 py-1 text-xs uppercase tracking-wider rounded-lg transition-all">
                    Edit
                  </button>
                ) : (
                  <button onClick={handleSaveProfile} disabled={saving} className="bg-emerald-700 text-white font-bold px-3 py-1 text-xs uppercase tracking-wider rounded-lg transition-all hover:bg-emerald-600 shadow-xs">
                    {saving ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              
              {!isEditing ? (
                <>
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-0.5">{userData?.name}</h2>
                  <div className="text-xs font-medium text-slate-500 mb-5">{userData?.email}</div>
                </>
              ) : (
                <div style={{ marginBottom: "1.5rem" }}>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "none", borderBottom: "1px solid #ddd", marginBottom: "0.5rem", fontSize: 14, fontWeight: 500, outline: "none", background: "transparent" }} placeholder="Your Name" />
                  <div style={{ fontSize: 13, color: "#555" }}>{userData?.email} (Cannot be changed)</div>
                </div>
              )}
              
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="text-[11px] font-extrabold text-slate-400 tracking-widest uppercase mb-2">Account Overview</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: 13, color: "#555" }}>Phone</span>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Your Phone Number" />
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Phone</span>
                    <span className="font-bold text-slate-900">{userData?.phone || "—"}</span>
                  </div>
                )}
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Delivery Address</span>
                    <input type="text" value={editAddressObj.houseNo} onChange={(e) => setEditAddressObj({...editAddressObj, houseNo: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Building / House No. (Optional)" />
                    <input type="text" value={editAddressObj.street} onChange={(e) => setEditAddressObj({...editAddressObj, street: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Street Address *" required />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="text" value={editAddressObj.city} onChange={(e) => setEditAddressObj({...editAddressObj, city: e.target.value})} style={{ width: "50%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="City *" required />
                      <input type="text" value={editAddressObj.pincode} onChange={(e) => setEditAddressObj({...editAddressObj, pincode: e.target.value.replace(/[^0-9]/g, '')})} maxLength={6} style={{ width: "50%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="PIN Code *" required />
                    </div>
                    <select value={editAddressObj.state} onChange={(e) => setEditAddressObj({...editAddressObj, state: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none", background: "#fff" }} required>
                      <option value="" disabled>Select State *</option>
                      {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  userData?.address && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium text-xs block mb-1.5">Delivery Address</span>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 leading-relaxed shadow-sm">
                        {userData.address}
                      </div>
                    </div>
                  )
                )}
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 font-medium">Member Since</span>
                  <span className="font-bold text-slate-900">{new Date(userData?.createdAt || Date.now()).getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
              {/* Rich Emerald Teal Card Header */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-5 border-b-2 border-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
                  <Package size={20} className="text-amber-400 stroke-[2.2]" />
                  <span>Your Orders</span>
                </div>
                {orders.length > 0 && (
                  <span className="bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-0.5 rounded-full shadow-2xs">
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                )}
              </div>
              
              {orders.length === 0 ? (
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, background: "#f5f5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                    <Package size={20} color="#111" />
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "#111", marginBottom: "0.5rem" }}>No orders placed yet</h3>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: "2rem" }}>Browse our curated selection and find your next read.</p>
                  <Link to="/catalogue" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "1px solid #111", color: "#111", textDecoration: "none", padding: "0.6rem 1.4rem", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#111"; }}>
                    Explore Catalogue <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto w-full">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr className="bg-amber-500/10 border-b border-slate-200 text-left">
                          <th className="p-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider">Order ID</th>
                          <th className="p-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
                          <th className="p-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider">Total</th>
                          <th className="p-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider">Status</th>
                          <th className="p-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const orderQueries = queries.filter(q => q.subject.includes(o.id.toString()));
                          const isQueriesExpanded = expandedQueriesOrder === o.id;
                          return (
                            <React.Fragment key={o.id}>
                              <tr className="bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 font-mono text-xs font-extrabold text-indigo-950">
                                  <span className="bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                                    #PAA-{o.id.toString().padStart(4, '0')}
                                  </span>
                                </td>
                                <td className="p-4 text-xs font-bold text-slate-600">
                                  {new Date(o.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-xs font-extrabold text-slate-900">
                                  ₹{o.amount}
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-col gap-2">
                                    {o.items?.map((item: any, idx: number) => {
                                      const s = (item.status || '').toLowerCase();
                                      let badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                                      if (s.includes('deliver') || s === 'completed') {
                                        badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                      } else if (s.includes('dispatch') || s === 'shipped') {
                                        badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
                                      } else if (s.includes('cancel') || s.includes('reject')) {
                                        badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                                      }

                                      return (
                                        <div key={item.id} className="flex flex-col gap-0.5">
                                          <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={item.book?.title}>
                                            {idx + 1}. {item.book?.title}
                                          </span>
                                          <span className={`inline-block w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${badgeStyle}`}>
                                            {item.status}
                                          </span>
                                          {item.status === 'Rejected' && item.rejectionReason && (
                                            <div className="text-[10px] text-rose-600 italic">Reason: {item.rejectionReason}</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex gap-2 justify-end items-center">
                                    {orderQueries.length > 0 && (
                                      <button 
                                        onClick={() => setExpandedQueriesOrder(isQueriesExpanded ? null : o.id)} 
                                        className="bg-white text-indigo-700 border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-2xs"
                                      >
                                        {isQueriesExpanded ? 'Hide Query' : 'View Query'}
                                      </button>
                                    )}
                                    {o.items?.some((i: any) => i.status === 'Dispatched') && (
                                      <button onClick={() => {
                                        const item = o.items.find((i: any) => i.status === 'Dispatched');
                                        setFeedbackModalOpen({ itemId: item.id, title: `Package from ${item.book?.author?.name || 'Author'}` });
                                      }} className="bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-2xs flex items-center gap-1">
                                        <Check size={12} className="stroke-[3]" /> Received
                                      </button>
                                    )}
                                    {o.items?.some((i: any) => i.status === 'Delivered') && (
                                      <button onClick={() => {
                                        const item = o.items.find((i: any) => i.status === 'Delivered');
                                        window.location.href = `/book/${item.bookId}#reviews`;
                                      }} className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold border border-amber-600 hover:from-amber-400 hover:to-amber-500 px-3 py-1.5 text-xs uppercase tracking-wider rounded-lg transition-all shadow-2xs flex items-center gap-1">
                                        <Star size={12} className="fill-slate-950" /> Review
                                      </button>
                                    )}
                                    <button onClick={() => setSelectedOrder(o)} className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white border border-emerald-700 hover:from-emerald-700 hover:to-teal-700 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-2xs">View Details</button>
                                  </div>
                                </td>
                              </tr>
                              {isQueriesExpanded && orderQueries.length > 0 && (
                                <tr>
                                  <td colSpan={5} className="p-4 bg-slate-100/70 border-b border-slate-200">
                                    <div className="flex flex-col gap-4">
                                      {orderQueries.map((q, idx) => (
                                        <div key={idx} className="p-5 md:p-6 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm space-y-3">
                                          <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                              <span className="font-mono text-xs font-extrabold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                                                #TKT-{q.id.toString().padStart(4, '0')}
                                              </span>
                                              <h4 className="font-display text-base font-bold text-slate-900">{q.subject}</h4>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                                              q.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                              q.status === 'Answered' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                              'bg-amber-100 text-amber-800 border border-amber-300'
                                            }`}>
                                              {q.status === 'Resolved' ? 'Closed' : q.status === 'Answered' ? 'Opened' : 'New'}
                                            </span>
                                          </div>

                                          <QueryThreadDisplay query={q} currentUserType="Customer" />
                                          
                                          {q.status !== 'Resolved' && (
                                            <div className="mt-4 flex gap-2.5 items-end">
                                              <textarea 
                                                value={replyText[q.id] || ''} 
                                                onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })} 
                                                placeholder="Type your response here..." 
                                                className="flex-1 border-2 border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-xs md:text-sm font-medium outline-none resize-y transition-all shadow-2xs"
                                                rows={2}
                                              />
                                              <button 
                                                onClick={() => handleCustomerReply(q.id)} 
                                                disabled={isReplying[q.id]}
                                                className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 text-white hover:from-indigo-800 hover:to-indigo-950 font-extrabold text-xs uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all shrink-0 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                              >
                                                <Send size={14} className="stroke-[2.5]" />
                                                <span>{isReplying[q.id] ? 'Sending...' : 'Reply'}</span>
                                              </button>
                                            </div>
                                          )}
                                          
                                          <div className="text-[11px] font-bold text-slate-400 text-right">{new Date(q.createdAt).toLocaleString()}</div>
                                        </div>
                                      ))}
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

                  {/* Mobile View (Cards) */}
                  <div className="lg:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                    {orders.map((o) => {
                      const orderQueries = queries.filter(q => q.subject.includes(o.id.toString()));
                      const isQueriesExpanded = expandedQueriesOrder === o.id;

                      return (
                        <div key={o.id} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Order ID</div>
                              <div className="font-mono text-sm font-bold text-paa-navy">#PAA-{o.id.toString().padStart(4, '0')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Date</div>
                              <div className="text-sm font-bold text-paa-navy">{new Date(o.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={item.id} className="flex justify-between items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-paa-navy leading-tight flex-1">
                                  {idx + 1}. {item.book?.title}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span style={{ 
                                    color: item.status.includes('Pending') ? '#b44d28' : item.status === 'Completed' ? '#2e7d32' : item.status === 'Rejected' ? '#c62828' : '#1565c0', 
                                  }} className="text-[10px] font-bold uppercase tracking-widest text-right">
                                    {item.status}
                                  </span>
                                  {item.status === 'Rejected' && item.rejectionReason && (
                                    <div className="text-[9px] text-red-600 italic text-right mt-1">Reason: {item.rejectionReason}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-3 border-t border-gray-100">
                            <div className="text-sm font-bold text-paa-navy">Total: ₹{o.amount}</div>
                            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                              {orderQueries.length > 0 && (
                                <button
                                  onClick={() => setExpandedQueriesOrder(isQueriesExpanded ? null : o.id)}
                                  className="bg-white border border-gray-300 text-gray-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-gray-100"
                                >
                                  {isQueriesExpanded ? 'Hide Query' : 'View Query'}
                                </button>
                              )}
                              {o.items?.some((i: any) => i.status === 'Dispatched') && (
                                <button onClick={() => {
                                  const item = o.items.find((i: any) => i.status === 'Dispatched');
                                  setFeedbackModalOpen({ itemId: item.id, title: `Package from ${item.book?.author?.name || 'Author'}` });
                                }} className="bg-green-700 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-green-800">
                                  <Check size={12} className="inline mr-1 -mt-0.5" /> Received
                                </button>
                              )}
                              {o.items?.some((i: any) => i.status === 'Delivered') && (
                                <button onClick={() => {
                                  const item = o.items.find((i: any) => i.status === 'Delivered');
                                  window.location.href = `/book/${item.bookId}#reviews`;
                                }} className="bg-amber-600 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-amber-700">
                                  <Star size={12} className="inline mr-1 -mt-0.5" /> Review
                                </button>
                              )}
                              <button onClick={() => setSelectedOrder(o)} className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white border border-emerald-700 hover:from-emerald-700 hover:to-teal-700 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-2xs">View Details</button>
                            </div>
                          </div>

                          {/* Expanded Mobile Query Threads */}
                          {isQueriesExpanded && orderQueries.length > 0 && (
                            <div className="mt-3 p-3 bg-slate-100/90 border-2 border-indigo-100 rounded-xl text-xs flex flex-col gap-3">
                              {orderQueries.map((q, idx) => (
                                <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                        #TKT-{q.id.toString().padStart(4, '0')}
                                      </span>
                                      <h4 className="font-bold text-slate-900 text-xs">{q.subject}</h4>
                                    </div>
                                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                      q.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                      q.status === 'Answered' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                      'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}>
                                      {q.status === 'Resolved' ? 'Closed' : q.status === 'Answered' ? 'Opened' : 'New'}
                                    </span>
                                  </div>

                                  <QueryThreadDisplay query={q} currentUserType="Customer" />

                                  {q.status !== 'Resolved' && (
                                    <div className="mt-3 flex flex-col gap-2">
                                      <textarea
                                        value={replyText[q.id] || ''}
                                        onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })}
                                        placeholder="Add a reply..."
                                        className="w-full border-2 border-slate-200 focus:border-indigo-500 p-2.5 text-xs outline-none rounded-xl resize-y font-medium"
                                        rows={2}
                                      />
                                      <button
                                        onClick={() => handleCustomerReply(q.id)}
                                        disabled={isReplying[q.id]}
                                        className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-4 py-2 text-xs font-extrabold uppercase tracking-widest hover:from-indigo-800 hover:to-indigo-950 transition-all rounded-xl disabled:opacity-50 self-end flex items-center gap-1 cursor-pointer shadow-xs"
                                      >
                                        <Send size={12} className="stroke-[2.5]" />
                                        <span>{isReplying[q.id] ? 'Sending...' : 'Reply'}</span>
                                      </button>
                                    </div>
                                  )}
                                  <div className="text-[10px] font-bold text-slate-400 mt-2 text-right">{new Date(q.createdAt).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>



        </div>
      </div>      {selectedOrder && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "1rem" }}
        >
          <div style={{ background: "#fff", border: "2px solid #0f172a", borderRadius: 24, width: "100%", maxWidth: 1100, maxHeight: "90vh", overflowY: "auto", margin: "0 auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-5 md:p-6 border-b-2 border-emerald-900 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2.5">
                <Package size={22} className="text-amber-400 stroke-[2.2]" /> Order Details
              </h2>
              <div className="flex items-center gap-3">
                {(() => {
                  const canCancel = selectedOrder.items?.length > 0 && !selectedOrder.items.some((i: any) => {
                    const s = (i.status || '').trim().toLowerCase();
                    return ['dispatched', 'shipped', 'completed', 'delivered', 'cancelled', 'rejected'].includes(s);
                  });
                  if (!canCancel) return null;
                  return (
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-amber-200 italic hidden sm:inline">Cannot cancel once dispatched.</span>
                       <button 
                         onClick={() => handleCancelOrder(selectedOrder.id)} 
                         disabled={cancellingOrderId === selectedOrder.id}
                         className="bg-red-600/90 text-white hover:bg-red-700 border border-red-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-2xs disabled:opacity-50">
                           {cancellingOrderId === selectedOrder.id ? "Cancelling..." : "Cancel Order"}
                       </button>
                    </div>
                  );
                })()}
                <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-emerald-900/80 hover:bg-amber-400 hover:text-slate-950 text-white border border-emerald-700 flex items-center justify-center font-bold text-lg transition-all cursor-pointer shadow-xs">&times;</button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Order Info Header Box */}
              <div className="p-5 bg-gradient-to-br from-amber-50/70 via-slate-50 to-emerald-50/40 border-2 border-slate-200 rounded-2xl shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Order ID</div>
                  <div className="font-mono text-sm font-extrabold text-indigo-950 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md inline-block w-fit mt-1">
                    #PAA-{selectedOrder.id.toString().padStart(4, '0')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Date</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{new Date(selectedOrder.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Amount</div>
                  <div className="text-base font-extrabold text-emerald-800 mt-1">₹{selectedOrder.amount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Delivery Address</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 leading-tight">{selectedOrder.address || userData?.address}</div>
                </div>
              </div>
              
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package size={18} className="text-emerald-700 stroke-[2.2]" /> Author Packages
              </h3>
              
              <div className="flex flex-col gap-5">
                {Object.values(selectedOrder.items?.reduce((acc: any, item: any) => {
                  const authorId = item.book?.authorId || 'unknown';
                  if (!acc[authorId]) {
                    acc[authorId] = { author: item.book?.author, status: item.status, trackingNumber: item.trackingNumber, items: [], authorId };
                  }
                  acc[authorId].items.push(item);
                  return acc;
                }, {}) || {}).map((group: any, idx: number) => {
                  const s = (group.status || '').toLowerCase();
                  let badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  if (s.includes('deliver') || s === 'completed') {
                    badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  } else if (s.includes('dispatch') || s === 'shipped') {
                    badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                  } else if (s.includes('cancel') || s.includes('reject')) {
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  }

                  return (
                    <div key={idx} className="border-2 border-slate-200 rounded-2xl p-5 md:p-6 bg-white shadow-xs hover:shadow-md transition-all space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <h4 className="font-display text-base font-bold text-slate-900">Package from {group.author?.name || 'Author'}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${badgeStyle}`}>
                          {group.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.items.map((item: any) => {
                          const allBooks = [
                            ...(fictionData.fiction_catalogue || []).flatMap((a: any) => a.books || []),
                            ...(nonFictionData.non_fiction_catalogue || []).flatMap((a: any) => a.books || [])
                          ];
                          const matchedBook = allBooks.find(b => b.title === item.book?.title);
                          return (
                            <div key={item.id} className="flex gap-4 p-3.5 border border-slate-200 rounded-xl bg-slate-50/80 items-start">
                              {matchedBook && matchedBook.cover_image_url ? (
                                <img src={matchedBook.cover_image_url} alt={item.book?.title} className="w-14 h-20 object-cover rounded-lg shadow-2xs border border-slate-300 shrink-0" />
                              ) : (
                                <div className="w-14 h-20 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg flex items-center justify-center shrink-0">
                                  <BookOpen size={20} />
                                </div>
                              )}
                              <div className="flex flex-col h-full justify-between">
                                <div>
                                  {matchedBook ? (
                                    <Link to={`/book/${matchedBook.id}`} className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors leading-snug line-clamp-2" target="_blank">{item.book?.title}</Link>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{item.book?.title}</span>
                                  )}
                                  <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Qty: {item.quantity}</div>
                                </div>
                                <div className="text-xs font-extrabold text-emerald-900 mt-2">₹{(item.book?.mrp || 0) * item.quantity}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <OrderFulfillmentTimeline currentStatus={group.status} trackingNumber={group.trackingNumber} />

                      <div className="pt-4 border-t border-dashed border-slate-200 flex flex-wrap gap-3 justify-between items-center">
                        <div>
                          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Contact Author</div>
                          <div className="flex flex-wrap gap-2">
                            {group.author?.whatsapp && group.author?.whatsapp !== 'NA' && (
                              <a href={`https://wa.me/${group.author.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs">
                                <MessageSquare size={13} /> WhatsApp: {group.author.whatsapp}
                              </a>
                            )}
                            {group.author?.email && group.author?.email !== 'NA' && (
                              <a href={`mailto:${group.author.email}`} className="flex items-center gap-1.5 text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs">
                                <Mail size={13} /> {group.author.email}
                              </a>
                            )}
                            {group.author?.phone && group.author?.phone !== 'NA' && (!group.author?.whatsapp || group.author?.whatsapp === 'NA') && (
                              <a href={`tel:${group.author.phone}`} className="flex items-center gap-1.5 text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-800 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs">
                                <Phone size={13} /> Call: {group.author.phone}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {group.status === 'Dispatched' && group.items.length > 0 && (
                            <button 
                              onClick={() => setFeedbackModalOpen({ itemId: group.items[0].id, title: `Package from ${group.author?.name || 'Author'}` })}
                              disabled={acknowledging === group.items[0].id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check size={14} className="stroke-[3]" /> I Received This
                            </button>
                          )}
                          {!queries.some(q => q.subject === `Issue with Order #${selectedOrder.id} - Package from ${group.author?.name}` && q.status !== 'Resolved') && (
                            <button onClick={() => { setSelectedOrder(null); openQueryForOrder(selectedOrder.id, group.author, `Package from ${group.author?.name}`); }} className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold px-4 py-2 text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                              <MessageSquare size={13} /> Report Issue / Late Delivery
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
    </>
  );
}
