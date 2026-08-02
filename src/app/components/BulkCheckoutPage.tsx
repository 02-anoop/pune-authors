import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function BulkCheckoutPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load selected bulk items from localStorage
    try {
      const saved = localStorage.getItem("bulk_checkout_items");
        setItems(JSON.parse(saved).map((book: any) => ({ ...book, id: book.id || book.dbId, quantity: 5 })));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const updateQuantity = (id: number, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(5, item.quantity + delta);
        if (item.quantity === 5 && delta < 0) {
          toast.warning("Minimum 5 copies per book are required for bulk orders.");
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const submitBulkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your bulk order is empty.");
      return;
    }

    const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
    if (totalQty < 5) {
      toast.error("Minimum bulk order quantity is 5 books.");
      return;
    }

    // Phone: must be exactly 10 digits
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    // Email: must be valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      toast.error("Please enter a valid email address (e.g. you@example.com).");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers: any = {
        "Content-Type": "application/json"
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const totalAmount = items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/orders/bulk`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          address,
          amount: totalAmount,
          items: items.map(item => ({ bookId: item.id, quantity: item.quantity }))
        })
      });

      if (!res.ok) throw new Error("Failed to submit bulk order");

      toast.success("Bulk order submitted successfully! You will be contacted shortly.");
      localStorage.removeItem("bulk_checkout_items");
      setTimeout(() => {
        navigate("/catalogue");
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Error submitting bulk order.");
      setIsSubmitting(false);
    }
  };

  const totalAmount = items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
  const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "10rem 1.10rem", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/catalogue")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: "2rem" }}
        >
          <ArrowLeft size={16} /> Back to Catalogue
        </button>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
          Bulk Order Request
        </h1>
        <p style={{ color: "#64748b", marginBottom: "2rem" }}>
          Define the quantities for each book. Once submitted, our team will review your request and contact you regarding payment and delivery.
        </p>

        {items.length === 0 ? (
          <div style={{ background: "#fff", padding: "3rem", borderRadius: 16, textAlign: "center", border: "1px solid #e2e8f0" }}>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>No books selected for bulk order.</p>
            <button
              onClick={() => navigate("/catalogue")}
              style={{ background: "#0f172a", color: "#fff", border: "none", padding: "0.75rem 1.5rem", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
            >
              Browse Catalogue
            </button>
          </div>
        ) : (
          <form onSubmit={submitBulkOrder} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              {items.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem", borderBottom: idx < items.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} style={{ width: 60, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                  ) : (
                    <div style={{ width: 60, height: 80, background: "#f1f5f9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>No Cover</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem 0" }}>{item.title}</h3>
                    <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>₹{item.mrp} MRP</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} style={{ padding: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 5;
                            if (val < 5) {
                              toast.warning("Minimum 5 copies per book are required for bulk orders.");
                            }
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(5, val) } : i));
                          }}
                          style={{ width: 50, textAlign: "center", border: "none", background: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", outline: "none" }}
                        />
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} style={{ padding: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.id)} style={{ padding: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", padding: "2rem", borderRadius: 16, border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>Contact Details</h2>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: "1.5rem" }}>Fields marked with <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> are required.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                    Full Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: `1px solid ${customerName.trim() ? "#22c55e" : "#cbd5e1"}`, outline: "none", fontSize: 15, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                    Email Address <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                    title="Please enter a valid email address"
                    style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: `1px solid ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ? "#22c55e" : customerEmail.length > 0 ? "#ef4444" : "#cbd5e1"}`, outline: "none", fontSize: 15, boxSizing: "border-box" }}
                  />
                  {customerEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && (
                    <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>Enter a valid email (e.g. you@example.com)</p>
                  )}
                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && (
                    <p style={{ fontSize: 11, color: "#22c55e", marginTop: 4, fontWeight: 600 }}>✓ Valid</p>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                  Phone Number <span style={{ color: "#ef4444" }}>*</span>{" "}
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(10 digits)</span>
                </label>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCustomerPhone(digits);
                  }}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="e.g. 9876543210"
                  title="Please enter exactly 10 digit phone number"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: `1px solid ${customerPhone.length === 10 ? "#22c55e" : customerPhone.length > 0 ? "#ef4444" : "#cbd5e1"}`, outline: "none", fontSize: 15, boxSizing: "border-box" }}
                />
                {customerPhone.length > 0 && customerPhone.length < 10 && (
                  <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
                    {10 - customerPhone.length} more digit{10 - customerPhone.length !== 1 ? "s" : ""} needed
                  </p>
                )}
                {customerPhone.length === 10 && (
                  <p style={{ fontSize: 11, color: "#22c55e", marginTop: 4, fontWeight: 600 }}>✓ Valid</p>
                )}
              </div>
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                  Delivery Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={3}
                  placeholder="House No., Street, City, State - Pincode"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: `1px solid ${address.trim().length > 10 ? "#22c55e" : address.length > 0 ? "#f59e0b" : "#cbd5e1"}`, outline: "none", fontSize: 15, resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>Estimated Total</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>₹{totalAmount}</div>
                  {totalQty < 5 && (
                    <div style={{ fontSize: 12, color: "#ef4444", marginTop: "0.25rem", fontWeight: 600 }}>
                      * Minimum 5 books required
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting || totalQty < 5} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#0284c7", color: "#fff", border: "none", padding: "0.75rem 2rem", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: isSubmitting || totalQty < 5 ? "not-allowed" : "pointer", opacity: isSubmitting || totalQty < 5 ? 0.7 : 1 }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  Submit Bulk Request
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
