import { useState } from "react";
import axios from "axios";
import { Mail, Phone, MapPin } from "lucide-react";
import FocusTrap from 'focus-trap-react';

export function ContactPage() {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <main style={{ fontFamily: "var(--font-body)", background: "#fafafa", minHeight: "calc(100vh - 72px)", padding: "11.5rem 1.5rem 4rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "start" }} className="contact-grid">
        
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: "#111827", marginBottom: "1rem" }}>Get in Touch</h1>
          <p style={{ fontSize: 16, color: "#4b5563", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Whether you're an aspiring author looking to publish, a reader with an inquiry, or an institution looking to partner, we'd love to hear from you.
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MapPin size={20} color="#b44d28" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: "0.2rem" }}>Address</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Cdr Shiv Mathur<br/>2112, Clover Highlands<br/>NIBM, Pune 411048</p>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mail size={20} color="#b44d28" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: "0.2rem" }}>Email Us</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>info@puneauthorsassociation.com</p>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Phone size={20} color="#b44d28" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: "0.2rem" }}>Call Us</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>+91 79770 97397</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", padding: "2.5rem", borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: "1.5rem" }}>Send a Message</h2>
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} onSubmit={async (e) => { 
            e.preventDefault(); 
            setIsSubmitting(true);
            try {
              // 1. Send to Web3Forms directly from the browser to bypass Cloudflare bot protection
              await axios.post("https://api.web3forms.com/submit", {
                access_key: "33505130-94ba-420a-a7b7-f383970343e4",
                name: contactName,
                email: contactEmail,
                message: contactMessage,
                subject: "New Inquiry from Pune Authors Association"
              });

              // 2. Save to local database
              await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:3001")}/api/contact`, { name: contactName, email: contactEmail, message: contactMessage });
              
              alert("Message Sent successfully!");
              setContactName("");
              setContactEmail("");
              setContactMessage("");
            } catch (err) {
              alert("Failed to send message. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: "0.4rem" }}>Name *</label>
              <input required value={contactName} onChange={(e) => setContactName(e.target.value)} type="text" style={{ width: "100%", padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: "0.4rem" }}>Email Address *</label>
              <input required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" style={{ width: "100%", padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: "0.4rem" }}>Message *</label>
              <textarea required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} rows={4} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: 4, boxSizing: "border-box", resize: "vertical" }}></textarea>
            </div>
            <button disabled={isSubmitting} type="submit" style={{ background: "#b44d28", color: "#fff", padding: "0.85rem", border: "none", borderRadius: 4, fontWeight: 600, fontSize: 14, cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: "0.5rem", opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? "Sending..." : "Submit Inquiry"}
            </button>
          </form>
</FocusTrap>
        </div>

      </div>
      <style>{`
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
