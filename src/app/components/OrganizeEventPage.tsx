import { Link, useLocation } from "react-router";
import { ArrowRight, Calendar, CheckCircle, ArrowLeft, Star } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import FocusTrap from 'focus-trap-react';
import { useState } from "react";

// --- COLOR PALETTE (Vibrant Bento Theme) ---
const C = {
  primary: "#facc15", // Vibrant Yellow
  red: "#ef4444",     // Vibrant Red
  blue: "#3b82f6",    // Vibrant Blue
  dark: "#000000",    // Pure Black for high contrast
  text: "#111827",    // Very dark gray for text
  light: "#f8f9fa",   // Off-white background
  white: "#ffffff",
  cream: "#f3f4f6",
};

export function OrganizeEventPage() {
  const location = useLocation();
  const isOrganizer = location.pathname.startsWith('/organizers');
  const backPath = isOrganizer ? '/organizers' : '/authors';
  const backLabel = isOrganizer ? 'Organizer Portal' : 'Author Portal';

  const [eventForm, setEventForm] = useState({
    name: "",
    email: "",
    phone: "",
    organisationName: "",
    proposerName: "",
    designation: "",
    format: "",
    category: "",
    audience: "",
    proposedDate: "",
    proposedTime: "",
    location: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [otherActivityText, setOtherActivityText] = useState("");

  const activityOptions = [
    { id: "meet_the_author", label: "Meet the Author" },
    { id: "story_writing", label: "Story Writing Session" },
    { id: "panel_discussion", label: "Panel Discussion" },
    { id: "author_talk", label: "Author Talk / Author Speaks" },
    { id: "other", label: "Other" },
  ];

  const toggleActivity = (id: string) => {
    if (selectedActivities.includes(id)) {
      setSelectedActivities(selectedActivities.filter(a => a !== id));
    } else {
      setSelectedActivities([...selectedActivities, id]);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedActivities.length === 0) {
      toast.error("Please select at least one Event Activity.");
      return;
    }

    if (selectedActivities.includes("other") && !otherActivityText.trim()) {
      toast.error("Please specify details for 'Other' activity.");
      return;
    }

    if (!eventForm.category) {
      toast.error("Please select a Category.");
      return;
    }

    // Phone: must be exactly 10 digits
    const phoneDigits = eventForm.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    // Email: must be a valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(eventForm.email.trim())) {
      toast.error("Please enter a valid email address (e.g. you@example.com).");
      return;
    }

    const formattedActivities = selectedActivities.map(id => {
      if (id === "other") return `Other: ${otherActivityText.trim()}`;
      const found = activityOptions.find(o => o.id === id);
      return found ? found.label : id;
    });

    const activitiesStr = formattedActivities.join(", ");

    setIsSubmitting(true);
    try {
      const payload = {
        ...eventForm,
        format: activitiesStr,
        activities: activitiesStr
      };
      
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/author-event-request`,
        payload
      );
      toast.success("Your event request has been submitted successfully!");
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit request. Please try again.");
    }
    setIsSubmitting(false);
  };

  const inputStyle = { 
    width: "100%", padding: "1rem", background: C.white, 
    border: `2px solid ${C.dark}`, borderRadius: 12, outline: "none", 
    fontSize: 15, color: C.text, transition: "all 0.2s",
    boxShadow: "2px 2px 0px rgba(0,0,0,1)"
  };

  const labelStyle = { 
    display: "block", fontSize: 13, fontWeight: 800, color: C.dark, 
    textTransform: "uppercase" as any, letterSpacing: "0.05em", marginBottom: "0.5rem" 
  };

  return (
    <main style={{ fontFamily: "var(--font-body)", background: C.cream, color: C.dark, overflowX: "hidden", minHeight: "100vh", paddingBottom: "4rem" }}>

      {/* BREADCRUMB */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "11.5rem 2rem 0" }}>
        <Link to={backPath} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: 14, fontWeight: 800, color: C.dark, textDecoration: "none", background: C.white, padding: "0.5rem 1rem", border: `2px solid ${C.dark}`, borderRadius: 50, boxShadow: "2px 2px 0px #000", transition: "transform 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "translate(-1px, -1px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "translate(0px, 0px)"}>
          <ArrowLeft size={16} /> Back to {backLabel}
        </Link>
      </div>

      {/* HEADER */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 2rem", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: C.primary, border: `2px solid ${C.dark}`, boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", transform: "rotate(-5deg)" }}>
          <Calendar size={32} color={C.dark} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: C.dark, lineHeight: 1.1, marginBottom: "1rem", letterSpacing: "-0.03em" }}>
          Organize a <span style={{ color: C.blue, textDecoration: "underline", textDecorationStyle: "wavy", textUnderlineOffset: 6 }}>Literary Event</span>
        </h1>
        <p style={{ fontSize: 16, color: "#4b5563", lineHeight: 1.6, maxWidth: 500, margin: "0 auto", fontWeight: 600 }}>
          Fill out the details below and our team will get in touch to plan your amazing event.
        </p>
      </div>

      {/* FORM CONTAINER */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 2rem" }}>
        {isSubmitted ? (
          <div style={{ background: C.white, padding: "4rem 2rem", borderRadius: 24, border: `4px solid ${C.dark}`, boxShadow: "8px 8px 0px #000", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.primary, border: `3px solid ${C.dark}`, boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem" }}>
              <CheckCircle size={40} color={C.dark} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 900, color: C.dark, marginBottom: "1rem", letterSpacing: "-0.02em" }}>Request Submitted!</h2>
            <p style={{ fontSize: "1.1rem", color: "#4b5563", lineHeight: 1.6, marginBottom: "3rem", maxWidth: 500, margin: "0 auto 3rem", fontWeight: 500 }}>
              Boom! Your request is in. Our events team will review your details and get back to you within 2-3 business days.
            </p>
            <Link
              to={backPath}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: C.dark, color: C.white, padding: "1rem 2.5rem",
                fontSize: "1.1rem", fontWeight: 800, textDecoration: "none",
                borderRadius: 50, letterSpacing: "0.02em", transition: "transform 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              Return Home <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
            <form
              onSubmit={handleEventSubmit}
              style={{ background: C.white, padding: "3rem", borderRadius: 24, border: `3px solid ${C.dark}`, boxShadow: "8px 8px 0px #000" }}
            >
              {/* 1. Basic Information */}
              <div style={{ marginBottom: "3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2rem" }}>
                  <div style={{ background: C.primary, width: 32, height: 32, borderRadius: "50%", border: `2px solid ${C.dark}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>1</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: C.dark, letterSpacing: "-0.02em", margin: 0 }}>Organizer Details</h3>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="form-grid">
                  <div>
                    <label style={labelStyle}>Full Name / Contact Person *</label>
                    <input
                      required type="text" value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      style={inputStyle} className="form-input" placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Proposer's Name</label>
                    <input
                      type="text" value={eventForm.proposerName}
                      onChange={(e) => setEventForm({ ...eventForm, proposerName: e.target.value })}
                      style={inputStyle} className="form-input" placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <input
                      type="text" value={eventForm.designation}
                      onChange={(e) => setEventForm({ ...eventForm, designation: e.target.value })}
                      style={inputStyle} className="form-input" placeholder="e.g. Principal / Coordinator"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Organisation Name *</label>
                    <input
                      required type="text" value={eventForm.organisationName}
                      onChange={(e) => setEventForm({ ...eventForm, organisationName: e.target.value })}
                      style={inputStyle} className="form-input" placeholder="e.g. ABC School"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone * <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>(10 digits)</span></label>
                    <input
                      required
                      type="tel"
                      value={eventForm.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEventForm({ ...eventForm, phone: digits });
                      }}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      inputMode="numeric"
                      style={inputStyle}
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      title="Please enter exactly 10 digit phone number"
                    />
                    {eventForm.phone.length > 0 && eventForm.phone.length < 10 && (
                      <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>
                        {10 - eventForm.phone.length} more digit{10 - eventForm.phone.length !== 1 ? 's' : ''} needed
                      </p>
                    )}
                    {eventForm.phone.length === 10 && (
                      <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>✓ Valid</p>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      required
                      type="email"
                      value={eventForm.email}
                      onChange={(e) => setEventForm({ ...eventForm, email: e.target.value })}
                      pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                      style={inputStyle}
                      className="form-input"
                      placeholder="you@example.com"
                      title="Please enter a valid email address"
                    />
                    {eventForm.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventForm.email) && (
                      <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>Please enter a valid email (e.g. you@example.com)</p>
                    )}
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventForm.email) && (
                      <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>✓ Valid</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Event Specifications */}
              <div style={{ marginBottom: "3rem", borderTop: `3px dashed ${C.dark}`, paddingTop: "3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2rem" }}>
                  <div style={{ background: C.red, color: C.white, width: 32, height: 32, borderRadius: "50%", border: `2px solid ${C.dark}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>2</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: C.dark, letterSpacing: "-0.02em", margin: 0 }}>Event Specifications</h3>
                </div>

                {/* EVENT ACTIVITIES * */}
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ ...labelStyle, fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", marginBottom: "0.8rem" }}>
                    EVENT ACTIVITIES *
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-grid">
                    {activityOptions.map((opt) => {
                      const isChecked = selectedActivities.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleActivity(opt.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.9rem",
                            padding: "1rem 1.25rem",
                            background: C.white,
                            border: `2px solid ${C.dark}`,
                            borderRadius: 16,
                            cursor: "pointer",
                            boxShadow: isChecked ? "4px 4px 0px #3b82f6" : "3px 3px 0px #000",
                            transform: isChecked ? "translate(-2px, -2px)" : "none",
                            transition: "all 0.15s ease",
                            userSelect: "none"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              width: 20,
                              height: 20,
                              accentColor: "#3b82f6",
                              cursor: "pointer"
                            }}
                          />
                          <span style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>
                            {opt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SPECIFY OTHER ACTIVITY INPUT */}
                  {selectedActivities.includes("other") && (
                    <div style={{ marginTop: "1.2rem", animation: "fadeIn 0.2s ease-in-out" }}>
                      <label style={labelStyle}>Specify Other Activity Details *</label>
                      <input
                        type="text"
                        required
                        value={otherActivityText}
                        onChange={(e) => setOtherActivityText(e.target.value)}
                        style={inputStyle}
                        className="form-input"
                        placeholder="e.g. Poetry Workshop, Book Launch, Storytelling..."
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="form-grid">
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <select 
                      required 
                      value={eventForm.category} 
                      onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} 
                      style={inputStyle} 
                      className="form-input"
                    >
                      <option value="">Select Category</option>
                      <option value="Housing Society">Housing Society</option>
                      <option value="College">College</option>
                      <option value="Book Fair">Book Fair</option>
                      <option value="Corporate Office">Corporate Office</option>
                      <option value="University">University</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Target Audience</label>
                    <input
                      type="text" value={eventForm.audience}
                      onChange={(e) => setEventForm({ ...eventForm, audience: e.target.value })}
                      style={inputStyle} className="form-input" placeholder="e.g. Students, Open to all"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="form-grid">
                  <div>
                    <label style={labelStyle}>Proposed Date *</label>
                    <input
                      required type="date" value={eventForm.proposedDate}
                      onChange={(e) => setEventForm({ ...eventForm, proposedDate: e.target.value })}
                      style={inputStyle} className="form-input"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Proposed Time</label>
                    <input
                      type="time" value={eventForm.proposedTime}
                      onChange={(e) => setEventForm({ ...eventForm, proposedTime: e.target.value })}
                      style={inputStyle} className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Location / Venue Preference *</label>
                  <input
                    required
                    type="text" value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    style={inputStyle} className="form-input" placeholder="e.g. Pune City Center, Virtual"
                  />
                </div>
              </div>

              {/* 3. Description */}
              <div style={{ marginBottom: "3rem", borderTop: `3px dashed ${C.dark}`, paddingTop: "3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2rem" }}>
                  <div style={{ background: C.blue, color: C.white, width: 32, height: 32, borderRadius: "50%", border: `2px solid ${C.dark}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>3</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: C.dark, letterSpacing: "-0.02em", margin: 0 }}>Additional Details</h3>
                </div>
                <div>
                  <label style={labelStyle}>Event Description *</label>
                  <textarea
                    required value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" }}
                    className="form-input"
                    placeholder="Tell us about the event's goals, themes, and any specific requirements you have in mind..."
                  />
                </div>
              </div>

              <button
                disabled={isSubmitting} type="submit"
                style={{
                  background: C.primary, color: C.dark, border: `2px solid ${C.dark}`,
                  padding: "1.2rem 2.5rem", fontSize: "1.1rem", fontWeight: 900,
                  letterSpacing: "0.02em", borderRadius: 50,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1, transition: "all 0.2s",
                  width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                  boxShadow: "4px 4px 0px #000"
                }}
                onMouseEnter={e => { if(!isSubmitting) { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; } }}
                onMouseLeave={e => { if(!isSubmitting) { e.currentTarget.style.transform = "translate(0px, 0px)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; } }}
              >
                {isSubmitting ? "Submitting..." : <><Star size={20} /> Submit Event Request <Star size={20} /></>}
              </button>
            </form>
          </FocusTrap>
        )}
      </div>

      {/* ── STYLES ── */}
      <style>{`
        .form-input:focus { 
          box-shadow: 4px 4px 0px #3b82f6 !important; 
          transform: translate(-2px, -2px);
        }
        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
