import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import axios from "axios";
import { ArrowLeft, BookOpen, Star, MapPin, Award, BookText, Camera, Calendar, User, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
const C = {
  gold: "#d4a017",
  goldBg: "#fffdf5",
  amber: "#0033FF",
  dark: "#111",
  text: "#333",
  muted: "#777",
  border: "#e8e0d0",
  white: "#fff",
  cream: "#fff",
  error: "#dc2626",
};

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthorPublicProfilePage() {
  const { id } = useParams();
  const [author, setAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customEventType, setCustomEventType] = useState("");

  const [formData, setFormData] = useState({
    customerName: "",
    organizationName: "",
    customerEmail: "",
    customerPhone: "",
    eventTitle: "",
    eventDescription: "",
    reasonForInvite: "",
    eventType: "Book Reading",
    eventDate: "",
    eventTime: "",
    venue: "",
    expectedAudience: "",
    additionalNotes: ""
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public/authors/${id}`);
        setAuthor(res.data);
      } catch (err) {
        console.error("Error fetching author:", err);
        toast.error("Failed to load author profile");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAuthor();
  }, [id]);

  const handleInputChange = (e: any) => {
    let value = e.target.value;
    // For phone: strip non-digits and cap at 10
    if (e.target.name === 'customerPhone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData({ ...formData, [e.target.name]: value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: "" });
    }
  };

  const handleInviteSubmit = async (e: any) => {
    e.preventDefault();

    // Manual Validation
    const errors: Record<string, string> = {};
    if (!formData.customerName.trim()) errors.customerName = "Full Name is required";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.customerEmail.trim()) errors.customerEmail = "Email Address is required";
    else if (!emailRegex.test(formData.customerEmail.trim())) errors.customerEmail = "Enter a valid email (e.g. you@example.com)";

    // Phone validation: exactly 10 digits
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    if (!phoneDigits) errors.customerPhone = "Mobile Number is required";
    else if (phoneDigits.length !== 10) errors.customerPhone = `Mobile number must be 10 digits (${phoneDigits.length} entered)`;

    if (!formData.eventTitle.trim()) errors.eventTitle = "Event Title is required";
    if (!formData.eventDate.trim()) errors.eventDate = "Date is required";
    if (!formData.eventTime.trim()) errors.eventTime = "Time is required";
    if (!formData.venue.trim()) errors.venue = "Venue is required";
    if (!formData.expectedAudience.trim()) errors.expectedAudience = "Expected Audience Size is required";
    if (!formData.reasonForInvite.trim()) errors.reasonForInvite = "Reason for Invitation is required";
    if (formData.eventType === "Others" && !customEventType.trim()) {
      errors.customEventType = "Event Type specification is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/author-invitation`, {
        ...formData,
        eventType: formData.eventType === "Others" ? customEventType.trim() : formData.eventType,
        authorId: author.id
      });
      setSuccess(true);
      toast.success("Invitation sent successfully!");
      setTimeout(() => {
        setShowInviteModal(false);
        setSuccess(false);
        setCustomEventType("");
        setFormData({
          customerName: "", organizationName: "", customerEmail: "", customerPhone: "",
          eventTitle: "", eventDescription: "", reasonForInvite: "", eventType: "Book Reading",
          eventDate: "", eventTime: "", venue: "", expectedAudience: "", additionalNotes: ""
        });
      }, 3000);
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: C.white, paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 0" }}>
          
          {/* Back button skeleton */}
          <div style={{ width: 120, height: 20, background: "#f3f4f6", borderRadius: 4, marginBottom: "2rem" }} className="animate-pulse" />

          {/* Profile Header Skeleton */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap", paddingBottom: "1.5rem" }}>
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#f3f4f6", flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, minWidth: 300, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ width: "50%", height: 48, background: "#f3f4f6", borderRadius: 8 }} className="animate-pulse" />
              <div style={{ width: "30%", height: 20, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
               <div style={{ width: 80, height: 14, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
               <div style={{ width: 200, height: 20, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
               <div style={{ width: 140, height: 16, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
               <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                 <div style={{ width: 80, height: 14, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
                 <div style={{ width: 100, height: 20, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                 <div style={{ width: 80, height: 14, background: "#f3f4f6", borderRadius: 4 }} className="animate-pulse" />
                 <div style={{ display: "flex", gap: "0.5rem" }}>
                   <div style={{ width: 80, height: 28, background: "#f3f4f6", borderRadius: 100 }} className="animate-pulse" />
                   <div style={{ width: 100, height: 28, background: "#f3f4f6", borderRadius: 100 }} className="animate-pulse" />
                 </div>
               </div>
            </div>
          </div>

          {/* About Section Skeleton */}
          <div style={{ marginTop: "2rem" }}>
            <div style={{ width: "100%", height: 250, background: "#f0f4ff", borderRadius: 24, padding: "3rem" }} className="animate-pulse">
               <div style={{ width: 250, height: 32, background: "rgba(0,51,255,0.1)", borderRadius: 8, marginBottom: "1.5rem" }} />
               <div style={{ width: "100%", height: 16, background: "rgba(0,51,255,0.05)", borderRadius: 4, marginBottom: "0.8rem" }} />
               <div style={{ width: "100%", height: 16, background: "rgba(0,51,255,0.05)", borderRadius: 4, marginBottom: "0.8rem" }} />
               <div style={{ width: "80%", height: 16, background: "rgba(0,51,255,0.05)", borderRadius: 4 }} />
            </div>
          </div>

        </div>
      </main>
    );
  }

  if (!author) {
    return (
      <div style={{ minHeight: "100vh", background: C.cream, padding: "10rem 2rem", textAlign: "center" }}>
        <h2>Author not found</h2>
        <Link to="/invite-authors" style={{ color: C.amber, textDecoration: "underline" }}>Back to Authors</Link>
      </div>
    );
  }

  const quals = author.qualificationsJson || [];
  const events = author.eventAuthors?.map((ea: any) => ea.event) || [];

  return (
    <main style={{ fontFamily: "'Google Sans', 'Montserrat', sans-serif", background: C.white, minHeight: "100vh", paddingTop: "6rem", paddingBottom: "4rem" }}>
      {/* Profile Header Block */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 0" }} className="profile-container">
        <Link to="/invite-authors" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#FF6B00", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "100px", textDecoration: "none", fontSize: 14, fontWeight: 700, marginBottom: "2rem", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "#000"; }} onMouseLeave={e => { e.currentTarget.style.background = "#FF6B00"; }}>
          <ArrowLeft size={16} /> Back to Authors
        </Link>

        <div style={{ background: C.white, padding: "0" }} className="profile-card">
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap", paddingBottom: "1.5rem" }} className="profile-header">
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }} className="profile-avatar">
              {author.photoUrl ? (
                <img src={author.photoUrl.startsWith('http') ? author.photoUrl : `${API}${author.photoUrl.startsWith('/') ? author.photoUrl : '/' + author.photoUrl}`} alt={author.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 64, fontWeight: 700, color: C.gold }}>{author.name.charAt(0)}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 300 }} className="profile-info">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
                <div>
                  <h1 style={{ fontSize: "2.5rem", fontWeight: 500, color: C.dark, lineHeight: 1.1, marginBottom: "0.5rem", letterSpacing: "-0.03em" }}>{author.name}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", color: C.muted, fontSize: 15, fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>{author.city || "Pune"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>{author.books?.length || 0} Books Published</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  style={{ background: C.amber, color: C.white, border: "none", padding: "0.8rem 2rem", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#9c4021"}
                  onMouseLeave={e => e.currentTarget.style.background = C.amber}
                >
                  <Calendar size={18} /> Invite Author
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${C.border}` }}>
            {quals.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Education
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {quals.map((q: any, i: number) => {
                    const degreeText = q.qualification || q.degree || "";
                    const subjectText = q.subject || "";
                    const instText = q.institution || "";
                    let displayStr = degreeText;
                    if (subjectText) displayStr += (displayStr ? ` in ${subjectText}` : subjectText);
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>{displayStr || "Degree"}</div>
                        <div style={{ fontSize: 14, color: C.muted, marginTop: "0.2rem" }}>{instText || "University"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {(author.experience || author.skills) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {author.experience && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>
                      Experience
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                      {author.experience} {/^\d+$/.test(String(author.experience).trim()) ? "Years" : ""}
                    </div>
                  </div>
                )}
                {author.skills && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                      Expertise
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {(() => {
                        let parsed: string[] = [];
                        try { parsed = JSON.parse(author.skills); if (!Array.isArray(parsed)) parsed = author.skills.split(','); } catch { parsed = author.skills.split(','); }
                        return parsed.map((s: string, i: number) => s.trim() && (
                          <span key={i} style={{ background: `${C.amber}10`, color: C.amber, padding: "0.4rem 1rem", borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                            {s.trim()}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "3rem" }}>
          
          <section style={{ background: C.amber, padding: "3rem", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 500, color: C.white, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", letterSpacing: "-0.02em" }}>
              About the Author
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.8, margin: 0, fontWeight: 400 }}>
              {author.bio || "This author hasn't provided a biography yet."}
            </p>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: C.dark, marginBottom: "2.5rem", display: "flex", alignItems: "center", gap: "0.75rem", letterSpacing: "-0.02em" }}>
              Published Books
            </h2>
            
            {author.books?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {author.books.map((book: any, index: number) => (
                  <React.Fragment key={book.id}>
                    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start", padding: "1.5rem 0" }} className="book-row">
                      <div style={{ width: 140, flexShrink: 0 }}>
                        {book.coverUrl ? (
                          <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${API}${book.coverUrl.startsWith('/') ? book.coverUrl : '/' + book.coverUrl}`} alt={book.title} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        ) : (
                          <div style={{ width: "100%", height: 200, background: C.white, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
                            <BookOpen size={32} color={C.border} />
                          </div>
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 280 }}>
                        <h3 style={{ fontSize: 26, fontWeight: 500, color: C.dark, marginBottom: "0.25rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>{book.title}</h3>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", display: "inline-block" }}>{book.genre}</span>
                        <p style={{ fontSize: 15, color: C.text, lineHeight: 1.6, marginBottom: "1.5rem" }}>
                          {book.synopsis}
                        </p>
                        <Link to={`/book/${book.id}`} style={{ display: "inline-block", padding: "0.6rem 1.2rem", background: "#FACC15", color: "#000", border: `1px solid #FACC15`, fontSize: 13, fontWeight: 700, borderRadius: 100, textDecoration: "none", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.borderColor = "#000"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "#FACC15"; e.currentTarget.style.borderColor = "#FACC15"; e.currentTarget.style.color = "#000"; }}>
                          View Details
                        </Link>
                      </div>
                    </div>
                    {index < author.books.length - 1 && (
                      <div style={{ height: 1, background: C.border, margin: "0" }}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p style={{ color: C.muted, fontStyle: "italic" }}>No published books available.</p>
            )}
          </section>
        </div>
      </div>

      {/* INVITATION MODAL */}
      {showInviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }} className="animate-in fade-in zoom-in duration-200">

            {success ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <CheckCircle2 size={64} color="#10b981" style={{ margin: "0 auto 1.5rem" }} />
                <h3 style={{ fontSize: "1.75rem", fontFamily: "var(--font-display)", color: C.dark, marginBottom: "1rem" }}>Invitation Sent Successfully!</h3>
                <p style={{ color: C.muted, fontSize: 15, maxWidth: 400, margin: "0 auto 2rem" }}>
                  Your invitation to {author.name} has been submitted for admin review. You will be contacted shortly via email.
                </p>
                <button onClick={() => setShowInviteModal(false)} style={{ background: C.cream, color: C.dark, border: `1px solid ${C.border}`, padding: "0.75rem 2rem", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding: "2rem", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.white, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", color: C.dark, marginBottom: "0.25rem" }}>Invite {author.name}</h2>
                    <p style={{ color: C.muted, fontSize: 14 }}>Fill out the details below to request this author for your event.</p>
                  </div>
                  <button onClick={() => setShowInviteModal(false)} style={{ width: 36, height: 36, borderRadius: "50%", background: C.cream, border: "none", color: C.dark, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>


                <form onSubmit={handleInviteSubmit} style={{ padding: "2rem" }}>

                  <div style={{ marginBottom: "2rem" }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={14} /> Your Details</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Full Name *</label>
                        <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.customerName ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                        {formErrors.customerName && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.customerName}</span>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Organization / Club Name</label>
                        <input type="text" name="organizationName" value={formData.organizationName} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Email Address *</label>
                        <input
                          type="email"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          placeholder="you@example.com"
                          pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                          title="Please enter a valid email address"
                          style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.customerEmail ? C.error : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail) ? '#22c55e' : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }}
                          className="form-input"
                        />
                        {formErrors.customerEmail && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.customerEmail}</span>}
                        {!formErrors.customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail) && <span style={{ color: '#22c55e', fontSize: 11, marginTop: "0.2rem", display: "block", fontWeight: 600 }}>✓ Valid</span>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Mobile Number * <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(10 digits)</span></label>
                        <input
                          type="tel"
                          name="customerPhone"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          placeholder="9876543210"
                          maxLength={10}
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          title="Please enter exactly 10 digit mobile number"
                          style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.customerPhone ? C.error : formData.customerPhone.length === 10 ? '#22c55e' : formData.customerPhone.length > 0 ? '#f59e0b' : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }}
                          className="form-input"
                        />
                        {formErrors.customerPhone && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.customerPhone}</span>}
                        {!formErrors.customerPhone && formData.customerPhone.length > 0 && formData.customerPhone.length < 10 && (
                          <span style={{ color: '#f59e0b', fontSize: 11, marginTop: "0.2rem", display: "block", fontWeight: 600 }}>{10 - formData.customerPhone.length} more digit{10 - formData.customerPhone.length !== 1 ? 's' : ''} needed</span>
                        )}
                        {!formErrors.customerPhone && formData.customerPhone.length === 10 && <span style={{ color: '#22c55e', fontSize: 11, marginTop: "0.2rem", display: "block", fontWeight: 600 }}>✓ Valid</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "2rem" }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={14} /> Event Details</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Event Title *</label>
                        <input type="text" name="eventTitle" value={formData.eventTitle} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.eventTitle ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                        {formErrors.eventTitle && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.eventTitle}</span>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Event Type *</label>
                        <select name="eventType" value={formData.eventType} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input">
                          <option>Book Launch</option>
                          <option>Book Reading</option>
                          <option>School Visit</option>
                          <option>College Seminar</option>
                          <option>Literary Festival</option>
                          <option>Workshop</option>
                          <option>Panel Discussion</option>
                          <option>Storytelling Session</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      {formData.eventType === "Others" && (
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Specify Event Type *</label>
                          <input type="text" value={customEventType} onChange={(e) => {
                            setCustomEventType(e.target.value);
                            if (formErrors.customEventType) {
                              setFormErrors({ ...formErrors, customEventType: "" });
                            }
                          }} placeholder="E.g. Poetry Slam, Creative Writing Workshop" style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.customEventType ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                          {formErrors.customEventType && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.customEventType}</span>}
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Date *</label>
                          <input type="date" name="eventDate" value={formData.eventDate} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.eventDate ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                          {formErrors.eventDate && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.eventDate}</span>}
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Time *</label>
                          <input type="time" name="eventTime" value={formData.eventTime} onChange={handleInputChange} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.eventTime ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                          {formErrors.eventTime && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.eventTime}</span>}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Venue / Location *</label>
                        <input type="text" name="venue" value={formData.venue} onChange={handleInputChange} placeholder="E.g. Hyatt Regency, Pune" style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.venue ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                        {formErrors.venue && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.venue}</span>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Expected Audience Size *</label>
                        <input type="text" name="expectedAudience" value={formData.expectedAudience} onChange={handleInputChange} placeholder="E.g. 50-100 people" style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.expectedAudience ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", color: C.dark }} className="form-input" />
                        {formErrors.expectedAudience && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.expectedAudience}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "2rem" }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><BookText size={14} /> Additional Context</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Reason for Invitation *</label>
                        <textarea name="reasonForInvite" value={formData.reasonForInvite} onChange={handleInputChange} rows={3} placeholder="Why are you inviting this specific author?" style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${formErrors.reasonForInvite ? C.error : C.border}`, borderRadius: 6, fontSize: 14, outline: "none", resize: "vertical", color: C.dark }} className="form-input"></textarea>
                        {formErrors.reasonForInvite && <span style={{ color: C.error, fontSize: 12, marginTop: "0.2rem", display: "block" }}>{formErrors.reasonForInvite}</span>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Event Description</label>
                        <textarea name="eventDescription" value={formData.eventDescription} onChange={handleInputChange} rows={3} placeholder="Provide details about the event structure, format, etc." style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, outline: "none", resize: "vertical", color: C.dark }} className="form-input"></textarea>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Additional Notes / Requirements (Optional)</label>
                        <textarea name="additionalNotes" value={formData.additionalNotes} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.8rem 1rem", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, outline: "none", resize: "vertical", color: C.dark }} className="form-input"></textarea>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
                    <button type="button" onClick={() => setShowInviteModal(false)} style={{ background: C.cream, color: C.dark, border: `1px solid ${C.border}`, padding: "0.75rem 2rem", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button disabled={submitting} type="submit" style={{ background: C.gold, color: C.white, border: "none", padding: "0.75rem 2rem", borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {submitting ? "Sending..." : <><Send size={16} /> Send Invitation</>}
                    </button>
                  </div>

                </form>

              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .form-input:focus { border-color: #d4a017 !important; }
        .book-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(0,0,0,0.06); }
        .book-card:hover .book-btn { background: #d4a017; color: #fff; }
        @media (max-width: 768px) {
          .profile-container { padding: 0 1rem !important; }
          .profile-card { padding: 1.5rem !important; border-radius: 16px !important; }
          .profile-grid { grid-template-columns: 1fr !important; gap: 2rem !important; padding: 0 1rem !important; margin-top: 2rem !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .profile-header { gap: 1.5rem !important; margin-top: -60px !important; }
          .profile-avatar { width: 120px !important; height: 120px !important; }
          .profile-info { min-width: 100% !important; }
          .profile-avatar { margin: 0 auto; }
          .profile-info > div { flex-direction: column; align-items: center !important; text-align: center; }
          .profile-info h1 { text-align: center; font-size: 2rem !important; }
          .profile-info button { width: 100%; justify-content: center; margin-top: 1rem; }
          .profile-info > div > div > div { justify-content: center; flex-direction: column; gap: 0.5rem !important; }
        }
      `}</style>
    </main>
  );
}
