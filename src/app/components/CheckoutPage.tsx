import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import { CheckCircle, Circle, Package, MessageSquare, Truck, CheckSquare, BarChart2, CreditCard, MapPin, Minus, Plus, User, Phone, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Read ONLY from localStorage, completely ignoring router state to prevent stale BFCache ghosts
  const cartIds = useMemo(() => {
    const saved = localStorage.getItem('checkout_cart');
    return saved ? JSON.parse(saved).map(Number) : [];
  }, []);

  const [books, setBooks] = useState<any[]>(() => {
    const w = window as any;
    if (w.__apiCache && w.__apiCache.catalogueBooks) {
        return w.__apiCache.catalogueBooks.filter((b: any) => cartIds.includes(Number(b.id)));
    }
    return [];
  });
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('checkout_quantities');
      const parsed = saved ? JSON.parse(saved) : {};
      return cartIds.reduce((acc, id) => ({ ...acc, [id]: parsed[id] || 1 }), {});
    } catch {
      return cartIds.reduce((acc, id) => ({ ...acc, [id]: 1 }), {});
    }
  });

  useEffect(() => {
    localStorage.setItem('checkout_quantities', JSON.stringify(quantities));
    window.dispatchEvent(new Event('cart_updated'));
  }, [quantities]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", pincode: "", address: "", city: "", state: "", landmark: "", houseNo: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pincodeOptions, setPincodeOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    const w = window as any;
    return !(w.__apiCache && w.__apiCache.catalogueBooks);
  });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentAuthorIndex, setCurrentAuthorIndex] = useState(0);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [savedAddress, setSavedAddress] = useState<any>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  
  const authorGroups = useMemo(() => {
    const groups: Record<number, any[]> = {};
    books.forEach(b => {
      const aId = b.author?.id || 0;
      if (!groups[aId]) groups[aId] = [];
      groups[aId].push(b);
    });
    return Object.values(groups);
  }, [books]);

  const currentGroupBooks = authorGroups[currentAuthorIndex] || [];
  const currentAuthor = currentGroupBooks.length > 0 ? currentGroupBooks[0].author : null;
  const currentGroupQty = currentGroupBooks.reduce((acc, b) => acc + (quantities[b.id] || 1), 0);
  
  let bundleDiscount = 0;
  let bundleMessage = "";
  if (currentAuthor?.extraData?.bundleRules && currentAuthor.extraData.bundleRules.length > 0) {
     const rules = currentAuthor.extraData.bundleRules.filter((r: any) => r.enabled);
     rules.sort((a: any, b: any) => b.buyCount - a.buyCount);
     const applicableRule = rules.find((r: any) => currentGroupQty >= r.buyCount);
     if (applicableRule) {
        bundleDiscount = applicableRule.discount;
        bundleMessage = `🎉 Bundle Offer Applied: Buy ${applicableRule.buyCount}+ Books, Get ₹${applicableRule.discount} Off!`;
     }
  }
  if (!bundleDiscount && currentAuthor?.extraData?.bundleRule?.enabled) {
     const rule = currentAuthor.extraData.bundleRule;
     if (currentGroupQty >= rule.buyCount) {
        bundleDiscount = rule.discount;
        bundleMessage = `🎉 Bundle Offer Applied: Buy ${rule.buyCount}+ Books, Get ₹${rule.discount} Off!`;
     }
  }
  
  const currentSubtotal = currentGroupBooks.reduce((acc, book) => acc + ((book.mrp || 428) * (quantities[book.id] || 1)), 0);
  const deliveryCharge = currentGroupQty >= 2 ? 0 : 50;
  const totalAmount = currentSubtotal - bundleDiscount + deliveryCharge;


  const checkSavedAddressComplete = (saved: any) => {
    if (!saved) return { complete: false, missing: "No saved address" };
    const hasName = Boolean(saved.name && saved.name.trim());
    const phoneDigits = (saved.phone || "").replace(/\D/g, "");
    const hasPhone = phoneDigits.length === 10;
    const hasAddress = Boolean(saved.address && saved.address.trim() && saved.address.length > 5);

    const missing: string[] = [];
    if (!hasName) missing.push("Full Name");
    if (!hasPhone) missing.push("10-digit Phone Number");
    if (!hasAddress) missing.push("Delivery Address");

    return {
      complete: hasName && hasPhone && hasAddress,
      missing: missing.join(", ")
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");

    if (!token || role !== "CUSTOMER") {
      navigate("/login?role=CUSTOMER&redirect=/checkout", { replace: true });
      return;
    }

    if (token) {
      axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const u = res.data.user;
          setForm(prev => ({
            ...prev,
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            address: u.address || "",
          }));
          if (u.address) {
             const savedObj = {
                name: u.name || "",
                phone: u.phone || "",
                address: u.address || "",
             };
             setSavedAddress(savedObj);
             const check = checkSavedAddressComplete(savedObj);
             if (check.complete) {
                setUseSavedAddress(true);
             } else {
                setUseSavedAddress(false);
             }
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          navigate("/login?role=CUSTOMER&redirect=/checkout", { replace: true });
        });
    }

    const w = window as any;
    w.__apiCache = w.__apiCache || {};

    if (w.__apiCache.catalogueBooks) {
        const cartBooks = w.__apiCache.catalogueBooks.filter((b: any) => cartIds.includes(Number(b.id)));
        setBooks(cartBooks);
        
        const validIds = cartBooks.map((b: any) => Number(b.id));
        if (validIds.length !== cartIds.length) {
            localStorage.setItem('checkout_cart', JSON.stringify(validIds));
            window.dispatchEvent(new Event('cart_updated'));
        }
        setIsLoading(false);
        return;
    }

    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/books`)
      .then(res => {
        // Cache the result for CataloguePage too
        const mapped = res.data.map((b: any) => ({
          ...b,
          id: b.id.toString(),
          authorName: b.author?.name || 'Unknown Author',
          coverUrl: b.coverUrl ? (b.coverUrl.startsWith('http') ? b.coverUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:3001').trim()}${b.coverUrl}`) : null
        }));
        w.__apiCache.catalogueBooks = mapped;

        const cartBooks = mapped.filter((b: any) => cartIds.includes(Number(b.id)));
        setBooks(cartBooks);
        
        // Clean up ghost items from localStorage to ensure cart count stays perfectly synced
        const validIds = cartBooks.map((b: any) => Number(b.id));
        if (validIds.length !== cartIds.length) {
            localStorage.setItem('checkout_cart', JSON.stringify(validIds));
            window.dispatchEvent(new Event('cart_updated'));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [navigate, cartIds]);

  const updateQty = (id: number, delta: number) => {
    const currentQty = quantities[id] || 1;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      setBooks(curr => curr.filter(b => String(b.id) !== String(id)));
      // Always read latest cart to avoid stale state bugs when removing multiple items
      const saved = localStorage.getItem('checkout_cart');
      const currentCartIds = saved ? JSON.parse(saved).map(String) : [];
      const newCartIds = currentCartIds.filter((cId: string) => cId !== String(id));
      localStorage.setItem('checkout_cart', JSON.stringify(newCartIds));
      window.dispatchEvent(new Event('cart_updated'));
      
      setQuantities(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setQuantities(prev => ({ ...prev, [id]: newQty }));
    }
  };

  const validateAddressForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name || !form.name.trim()) errors.name = "Full Name is required";
    
    const phoneDigits = (form.phone || "").replace(/\D/g, "");
    if (!phoneDigits) errors.phone = "Mobile Number is required";
    else if (phoneDigits.length !== 10) errors.phone = `Mobile number must be 10 digits (${phoneDigits.length} entered)`;

    if (!form.address || !form.address.trim()) errors.address = "Street Address is required";
    if (!form.city || !form.city.trim()) errors.city = "District / Town is required";
    if (!form.state || !form.state.trim()) errors.state = "Please select a State";

    const pinDigits = (form.pincode || "").replace(/\D/g, "");
    if (!pinDigits) errors.pincode = "PIN Code is required";
    else if (pinDigits.length !== 6) errors.pincode = `PIN Code must be 6 digits (${pinDigits.length} entered)`;

    setFormErrors(errors);
    return errors;
  };

  const handleSaveAddressToProfile = async () => {
    const errors = validateAddressForm();
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all compulsory fields marked with * correctly.");
      return;
    }
    try {
        const token = localStorage.getItem("token");
        if (token) {
            const fullAddress = form.houseNo && form.houseNo.trim()
              ? `${form.houseNo.trim()}, ${form.address.trim()}, ${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`
              : `${form.address.trim()}, ${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`;

            await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/profile`, {
                name: form.name.trim(),
                address: fullAddress
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setSavedAddress({
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: fullAddress
            });
            setUseSavedAddress(true);
            toast.success("Address saved to profile successfully!");
        } else {
            toast.error("Please log in to save your profile address.");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to save address to profile.");
    }
  };

  const handleAddressSubmit = () => {
    if (useSavedAddress) {
      const check = checkSavedAddressComplete(savedAddress);
      if (!check.complete) {
        toast.error(`Saved address is incomplete (Missing: ${check.missing}). Please use the address form below.`);
        setUseSavedAddress(false);
        return;
      }
      setCheckoutStep(2);
      return;
    }

    const errors = validateAddressForm();
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all compulsory fields marked with * correctly.");
      return;
    }
    setCheckoutStep(2);
  };

  const handlePay = async () => {
    if (!paymentFile) {
      alert("Please upload your payment screenshot to proceed.");
      return;
    }
    if (!transactionId.trim()) {
      alert("Please enter your UPI/Bank Transaction ID.");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");

      const itemsPayload = currentGroupBooks.map((book: any) => ({
        bookId: book.id,
        quantity: quantities[book.id] || 1
      }));

      const formData = new FormData();
      formData.append("amount", totalAmount.toString());
      formData.append("customerName", useSavedAddress ? savedAddress.name : form.name);
      formData.append("customerEmail", form.email || "guest@example.com");
      formData.append("customerPhone", useSavedAddress ? savedAddress.phone : form.phone);
      formData.append("address", useSavedAddress ? savedAddress.address : `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`);
      formData.append("deliveryCharges", deliveryCharge.toString());
      formData.append("subtotal", currentSubtotal.toString());
      formData.append("bundleDiscount", bundleDiscount.toString());
      formData.append("items", JSON.stringify(itemsPayload));
      formData.append("paymentScreenshot", paymentFile);
      formData.append("transactionId", transactionId.trim());

      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/orders`, formData, {
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      });

      setUploading(false);
      setPaymentFile(null);
      setTransactionId("");
      
      if (currentAuthorIndex + 1 < authorGroups.length) {
        setCurrentAuthorIndex(prev => prev + 1);
        alert(`Payment for ${currentAuthor?.name || 'Author'} complete. Proceeding to next author.`);
      } else {
        setPaymentDone(true);
      }
    } catch (e) {
      setUploading(false);
      console.error(e);
      alert("Order placement failed");
    }
  };

  // Extract unique authors for the success screen
  const authors = Array.from(new Map(books.map(b => [b.author?.id, b.author])).values()).filter(Boolean);

  return (
    <main style={{ fontFamily: "var(--font-body)", minHeight: "100vh", paddingTop: "7.5rem" }}>
      <section style={{ background: "#fafafa", borderBottom: "1px solid #eaeaea", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Secure Checkout</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", margin: 0, letterSpacing: "-0.01em", fontWeight: 400, color: "#111" }}>Complete Your Order</h1>
          </div>
          <button 
            onClick={() => navigate("/catalogue")} 
            style={{ 
              background: "#fff", border: "1px solid #eaeaea", 
              color: "#111", padding: "0.6rem 1rem", borderRadius: 8, 
              display: "flex", alignItems: "center", gap: "0.5rem", 
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.15s"
            }}
          >
            <ArrowLeft size={16} /> Back to Catalogue
          </button>
        </div>
      </section>

      <section style={{ padding: "3rem 1.5rem" }}>
          {isLoading ? (
            <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--font-body)", color: "#111" }}>
              <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>
                {/* Header Skeleton */}
                <div className="animate-pulse" style={{ display: "flex", gap: "2rem", alignItems: "center", marginBottom: "2rem" }}>
                  <div style={{ width: 200, height: 24, background: "#e5e5e5", borderRadius: 4 }}></div>
                  <div style={{ width: 150, height: 24, background: "#e5e5e5", borderRadius: 4 }}></div>
                </div>
                {/* Order Details Skeleton */}
                <div className="animate-pulse">
                  <div style={{ background: "#fff", padding: "2rem", borderRadius: 8, marginBottom: "1.5rem" }}>
                    <div style={{ height: 20, background: "#e5e5e5", marginBottom: "0.5rem", borderRadius: 4 }}></div>
                    <div style={{ height: 20, width: "80%", background: "#e5e5e5", marginBottom: "1rem", borderRadius: 4 }}></div>
                    {/* Book rows */}
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                        <div style={{ width: 60, height: 60, background: "#e5e5e5", borderRadius: 4 }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 16, background: "#e5e5e5", marginBottom: "0.25rem", borderRadius: 4 }}></div>
                          <div style={{ height: 12, width: "60%", background: "#e5e5e5", borderRadius: 4 }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Delivery Form Skeleton */}
                  <div style={{ background: "#fff", padding: "2rem", borderRadius: 8 }}>
                    <div style={{ height: 20, background: "#e5e5e5", marginBottom: "1rem", borderRadius: 4 }}></div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{ height: 16, background: "#e5e5e5", marginBottom: "0.75rem", borderRadius: 4 }}></div>
                    ))}
                    <div style={{ height: 40, background: "#e5e5e5", marginTop: "1rem", borderRadius: 4 }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : paymentDone ? (
          <div style={{ maxWidth: 800, margin: "0 auto", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 4, padding: "3rem 2rem", textAlign: "center" }}>
            <CheckCircle size={56} color="#16a34a" style={{ margin: "0 auto 1.5rem" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "#111", marginBottom: "1rem" }}>Order Placed Successfully!</h2>
            <p style={{ fontSize: 16, color: "#666", marginBottom: "1rem" }}>Your payment screenshots have been uploaded and your orders have been sent to the respective authors.</p>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "1rem", borderRadius: 8, color: "#1e3a8a", fontSize: 14, marginBottom: "2rem", display: "inline-block", textAlign: "left", maxWidth: 600 }}>
              <strong>Expected Delivery:</strong> Orders are typically delivered within <strong>10 days</strong>. There is no need to worry until then! If you haven't received your order after 10 days, a support ticket will be raised automatically.
            </div>
          <div style={{ marginBottom: "2.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: "#111", marginBottom: "1rem", borderBottom: "1px solid #eaeaea", paddingBottom: "0.5rem" }}>Authors Processing Your Order</h3>
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                {authors.map((author: any) => (
                  <div key={author.id} style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f0f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <User size={20} color="#111" />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: "#111" }}>{author.name}</div>
                        <div style={{ fontSize: 13, color: "#666" }}>Author</div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: "0.5rem", fontSize: 13, color: "#666", background: "#f9fafb", padding: "0.75rem", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                      For privacy and security, direct author contact is disabled. If you face issues after 10 days, a support ticket will automatically be raised for you.
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => navigate("/profile")} style={{ background: "#111", color: "#fff", border: "none", padding: "0.85rem 2rem", borderRadius: 4, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
              Go to My Profile
            </button>
          </div>
        ) : checkoutStep === 1 ? (
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }} className="checkout-grid">
            {/* LEFT — Delivery Address */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, padding: "1.75rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  <MapPin size={18} color="#2563eb" />
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "#111" }}>Delivery Address</h2>
                </div>

                {savedAddress && (() => {
                  const check = checkSavedAddressComplete(savedAddress);
                  const isSelectable = check.complete;

                  return (
                     <div 
                       style={{ 
                         background: isSelectable ? "#fff" : "#fafafa", 
                         border: useSavedAddress && isSelectable ? "2px solid #2563eb" : !isSelectable ? "1.5px dashed #fca5a5" : "1px solid #eaeaea", 
                         borderRadius: 8, 
                         padding: "1.25rem", 
                         marginBottom: "1rem", 
                         cursor: isSelectable ? "pointer" : "not-allowed", 
                         display: "flex", 
                         alignItems: "flex-start", 
                         gap: "1rem",
                         opacity: isSelectable ? 1 : 0.8
                       }} 
                       onClick={() => {
                         if (isSelectable) {
                           setUseSavedAddress(true);
                         } else {
                           toast.error(`Saved profile address is incomplete (Missing: ${check.missing}). Please enter complete address details below.`);
                         }
                       }}
                     >
                        <div style={{ marginTop: "0.25rem" }}>
                           <div style={{ width: 20, height: 20, borderRadius: "50%", border: useSavedAddress && isSelectable ? "6px solid #2563eb" : "2px solid #ccc", background: "#fff", boxSizing: "border-box" }}></div>
                        </div>
                        <div style={{ flex: 1 }}>
                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                             <h3 style={{ fontSize: 15, fontWeight: 600, color: isSelectable ? "#111" : "#475569", marginBottom: "0.25rem" }}>
                               Saved Profile Address
                             </h3>
                             {!isSelectable ? (
                               <span style={{ fontSize: 11, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "0.2rem 0.6rem", borderRadius: 6, letterSpacing: "0.02em" }}>
                                 ⚠️ Incomplete — Cannot Select
                               </span>
                             ) : useSavedAddress ? (
                               <button onClick={(e) => { e.stopPropagation(); setUseSavedAddress(false); }} style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                                 Use New Address
                               </button>
                             ) : null}
                           </div>
                           <p style={{ fontWeight: 600, color: "#111", marginBottom: "0.25rem", fontSize: 13 }}>
                             {savedAddress.name || "No Name"} {savedAddress.phone ? `(${savedAddress.phone})` : "(No Phone Number)"}
                           </p>
                           <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                             {savedAddress.address || "No Address Stored"}
                           </p>
                           {!isSelectable && (
                             <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: "0.5rem", background: "#fff1f2", padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #ffe4e6" }}>
                               ❌ Missing required fields: {check.missing}. Please fill out the address form below.
                             </p>
                           )}
                        </div>
                     </div>
                  );
                })()}

                <div style={{ background: "#fff", border: !useSavedAddress ? "2px solid #2563eb" : "1px solid #eaeaea", borderRadius: 4, padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: !useSavedAddress ? "1rem" : "0", cursor: "pointer" }} onClick={() => setUseSavedAddress(false)}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: !useSavedAddress ? "6px solid #2563eb" : "2px solid #ccc", background: "#fff", boxSizing: "border-box" }}></div>
                      <h3 style={{ fontSize: 15, fontWeight: 500, color: "#111" }}>{savedAddress ? 'Add a New Address' : 'Enter your address'}</h3>
                  </div>
                  
                  {!useSavedAddress && (
                    <div style={{ display: "grid", gap: "1rem", paddingTop: savedAddress ? "1rem" : "0", borderTop: savedAddress ? "1px solid #eaeaea" : "none" }}>
                      {[
                        { key: "name", label: "Full Name", placeholder: "e.g., Anita Sharma", required: true },
                        { key: "phone", label: "Mobile Number", placeholder: "9876543210", required: true, maxLength: 10, isNumeric: true },
                        { key: "houseNo", label: "Building / House No. (Optional)", placeholder: "e.g., 12B, Rose Apartments", required: false },
                        { key: "address", label: "Street Address", placeholder: "e.g., MG Road, Koregaon Park", required: true },
                        { key: "landmark", label: "Landmark (Optional)", placeholder: "e.g., Near XYZ Mall", required: false },
                        { key: "city", label: "District / Town", placeholder: "e.g., Pune", required: true },
                        { key: "state", label: "State", placeholder: "e.g., Maharashtra", required: true },
                        { key: "pincode", label: "PIN Code", placeholder: "e.g., 411001", required: true, maxLength: 6, isNumeric: true },
                      ].map((field) => {
                        const val = form[field.key as keyof typeof form] || "";
                        const err = formErrors[field.key];
                        let isValid = false;

                        if (field.key === "phone") {
                          isValid = val.length === 10;
                        } else if (field.key === "pincode") {
                          isValid = val.length === 6;
                        } else if (field.required) {
                          isValid = Boolean(val.trim());
                        }

                        const borderStyle = err 
                          ? "1.5px solid #ef4444" 
                          : isValid 
                          ? "1.5px solid #22c55e" 
                          : val.length > 0 
                          ? "1px solid #f59e0b"
                          : "1px solid #eaeaea";

                        return (
                          <div key={field.key}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#111", marginBottom: "0.3rem" }}>
                              {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                              {field.key === "phone" && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 4 }}>(10 digits)</span>}
                              {field.key === "pincode" && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 4 }}>(6 digits)</span>}
                            </label>
                            {field.key === "state" ? (
                              <select
                                value={val}
                                onChange={(e) => {
                                  setForm({ ...form, state: e.target.value });
                                  if (formErrors.state) setFormErrors({ ...formErrors, state: "" });
                                }}
                                style={{ width: "100%", padding: "0.6rem 0.85rem", border: borderStyle, borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14, background: "#fafafa", outline: "none", boxSizing: "border-box" }}
                              >
                                <option value="" disabled>Select State</option>
                                {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field.isNumeric ? "tel" : "text"}
                                placeholder={field.placeholder}
                                maxLength={field.maxLength}
                                inputMode={field.isNumeric ? "numeric" : undefined}
                                value={val}
                                onChange={(e) => {
                                  let inputVal = e.target.value;
                                  if (field.isNumeric) {
                                    inputVal = inputVal.replace(/[^0-9]/g, '');
                                  }
                                  setForm({ ...form, [field.key]: inputVal });
                                  if (formErrors[field.key]) {
                                    setFormErrors({ ...formErrors, [field.key]: "" });
                                  }
                                }}
                                style={{ width: "100%", padding: "0.6rem 0.85rem", border: borderStyle, borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14, background: "#fafafa", outline: "none", boxSizing: "border-box" }}
                              />
                            )}

                            {err && (
                              <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                                {err}
                              </p>
                            )}

                            {!err && field.key === "phone" && val.length > 0 && val.length < 10 && (
                              <p style={{ color: "#f59e0b", fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                                {10 - val.length} more digit{10 - val.length !== 1 ? "s" : ""} needed
                              </p>
                            )}

                            {!err && field.key === "pincode" && val.length > 0 && val.length < 6 && (
                              <p style={{ color: "#f59e0b", fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                                {6 - val.length} more digit{6 - val.length !== 1 ? "s" : ""} needed
                              </p>
                            )}

                            {!err && isValid && field.required && (
                              <p style={{ color: "#22c55e", fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                                ✓ Valid
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!useSavedAddress && (
                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={handleSaveAddressToProfile} style={{ padding: "0.6rem 1rem", background: "#f9f9f9", color: "#111", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid #eaeaea", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <CheckSquare size={14} /> Save Address to Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — Order Summary */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, padding: "1.75rem", position: "sticky", top: 80 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "#111", marginBottom: "1.25rem" }}>Order Summary</h3>
                
                {authorGroups.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", background: "#f9fafb", borderRadius: 4 }}>
                    <Package size={32} color="#9ca3af" style={{ margin: "0 auto 0.5rem" }} />
                    <p style={{ color: "#666", fontSize: 14 }}>Your cart is empty.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }}>
                      {authorGroups.map((group, idx) => {
                        const grpQty = group.reduce((acc: number, b: any) => acc + (quantities[b.id] || 1), 0);
                        const grpSubtotal = group.reduce((acc: number, b: any) => acc + ((b.mrp || 428) * (quantities[b.id] || 1)), 0);
                        const grpAuthor = group[0].author;
                        let grpDiscount = 0;
                        if (grpAuthor?.extraData?.bundleRules && grpAuthor.extraData.bundleRules.length > 0) {
                           const rules = grpAuthor.extraData.bundleRules.filter((r: any) => r.enabled);
                           rules.sort((a: any, b: any) => b.buyCount - a.buyCount);
                           const applicableRule = rules.find((r: any) => grpQty >= r.buyCount);
                           if (applicableRule) {
                              grpDiscount = applicableRule.discount;
                           }
                        }
                        if (!grpDiscount && grpAuthor?.extraData?.bundleRule?.enabled) {
                           const rule = grpAuthor.extraData.bundleRule;
                           if (grpQty >= rule.buyCount) {
                              grpDiscount = rule.discount;
                           }
                        }
                        const grpDelivery = grpQty >= 2 ? 0 : 50;
                        const grpTotal = grpSubtotal - grpDiscount + grpDelivery;
                        return (
                        <div key={idx} style={{ background: "#f8fafc", borderRadius: 4, padding: "1rem", border: "1px solid #f1f5f9" }}>
                          <h4 style={{ fontSize: 13, fontWeight: 500, marginBottom: "0.75rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <User size={14} /> Items by: {group[0].author?.name || 'Author'}
                          </h4>
                          {group.map((book: any) => (
                            <div key={book.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
                              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                {book.coverUrl ? (
                                   <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${book.coverUrl}`} alt={book.title} style={{ width: 40, height: 56, objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 4px #eaeaea" }} />
                                ) : (
                                   <div style={{ width: 40, height: 56, background: "#e2e8f0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={16} color="#94a3b8" /></div>
                                )}
                                <div>
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{book.title}</div>
                                  <div style={{ fontSize: 12, color: "#64748b" }}>₹{book.mrp || 428} each</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff", borderRadius: 6, padding: "0.2rem", border: "1px solid #e2e8f0" }}>
                                <button onClick={() => updateQty(book.id, -1)} style={{ padding: "0.25rem", borderRadius: 4, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", display: "flex" }}><Minus size={12} /></button>
                                <span style={{ fontSize: 13, fontWeight: 500, minWidth: "1.25rem", textAlign: "center" }}>{quantities[book.id] || 1}</span>
                                <button onClick={() => updateQty(book.id, 1)} style={{ padding: "0.25rem", borderRadius: 4, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", display: "flex" }}><Plus size={12} /></button>
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px dashed #cbd5e1", fontSize: 13, color: "#475569" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}><span>Subtotal</span><span>₹{grpSubtotal}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}><span>Delivery</span><span style={{ color: grpDelivery === 0 ? "#16a34a" : "inherit" }}>{grpDelivery === 0 ? 'FREE' : `₹${grpDelivery}`}</span></div>
                            {grpDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", color: "#16a34a" }}><span>Bundle Discount</span><span>-₹{grpDiscount}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e2e8f0", fontWeight: 500, color: "#0f172a", fontSize: 14 }}><span>Total for Author</span><span>₹{grpTotal}</span></div>
                          </div>
                        </div>
                      )})}
                    </div>

                    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #eaeaea" }}>
                      <button onClick={() => {
                        if (useSavedAddress) {
                          setCheckoutStep(2);
                        } else {
                          handleAddressSubmit();
                        }
                      }} 
                      disabled={currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock)}
                      style={{ width: "100%", padding: "1rem", background: currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock) ? "#9ca3af" : "#111", color: "#fff", borderRadius: 4, fontSize: 16, fontWeight: 500, cursor: currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock) ? "not-allowed" : "pointer", border: "none" }}>
                        {currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock) ? "Some items are out of stock" : "Proceed to Payment"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }} className="checkout-grid">
            {/* LEFT — Order Summary (Specific to current author for payment) */}
            <div>
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "#111", marginBottom: "0.5rem" }}>
                  Payment Step {currentAuthorIndex + 1} of {authorGroups.length}
                </h3>
                {authorGroups.length > 1 && (
                  <div style={{ background: "#fffbeb", color: "#d97706", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem", fontSize: 12, border: "1px solid #fde68a", lineHeight: 1.5 }}>
                    <strong>Note:</strong> You have selected books from multiple authors. Since payments are made directly to the respective authors, you will need to complete checkout for each author sequentially.
                  </div>
                )}
                <p style={{fontSize: 13, color: "#2563eb", marginBottom: "1rem", fontWeight: 600}}>Items by: {currentAuthor?.name}</p>
                
                {bundleDiscount > 0 && (
                   <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem", fontSize: 13, fontWeight: 500, border: "1px solid #bbf7d0" }}>
                      {bundleMessage}
                   </div>
                )}
                <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, padding: "1.25rem", marginBottom: "1.5rem" }}>
                  {currentGroupBooks.map((book: any) => (
                    <div key={book.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                          {book.coverUrl ? (
                             <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${book.coverUrl}`} alt={book.title} style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 4px #eaeaea" }} />
                          ) : (
                             <div style={{ width: 48, height: 64, background: "#f0f0f4", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={20} color="#9ca3af" /></div>
                          )}
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: "0.2rem" }}>{book.title}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>₹{book.mrp || 428} each</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "#fafafa", borderRadius: 8, padding: "0.25rem" }}>
                        <span style={{ fontSize: 14, fontWeight: 500, minWidth: "1.5rem", textAlign: "center" }}>Qty: {quantities[book.id] || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Payment Details */}
            <div>
              <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, padding: "1.75rem", position: "sticky", top: 80 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "#111", marginBottom: "1.25rem" }}>Payment Details</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ background: "#f0f0f4", borderRadius: 4, padding: "1.5rem", textAlign: "center", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: "0.75rem" }}>Scan Author's QR to Pay ₹{totalAmount}</p>
                    {currentAuthor?.qrCodeUrl ? (
                      <img
                        src={currentAuthor.qrCodeUrl.startsWith('http') ? currentAuthor.qrCodeUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${currentAuthor.qrCodeUrl}`}
                        alt="Author Payment QR"
                        style={{ width: 160, height: 160, objectFit: "contain", margin: "0 auto", display: "block", borderRadius: 4, border: "2px solid #eaeaea" }}
                      />
                    ) : (
                      <div style={{ width: 160, height: 160, background: "#fff", margin: "0 auto", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #eaeaea", overflow: "hidden" }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=puneauthors@upi&pn=PuneAuthors&am=${totalAmount}.00&cu=INR`} alt="UPI QR" style={{ width: "90%", height: "90%" }} />
                      </div>
                    )}
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: "0.5rem" }}>Pay directly to the author using their UPI QR</p>
                  </div>
                  
                  <div style={{ background: "#fff", borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center", border: "1px dashed rgba(0,0,0,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <CreditCard size={18} color="#2563eb" />
                      <label style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Transaction ID *</label>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter your UPI/Bank Transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #eaeaea", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14, background: "#fafafa", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <CreditCard size={18} color="#2563eb" />
                      <label style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Upload Screenshot *</label>
                    </div>
                    <p style={{ fontSize: 12, color: "#666", marginBottom: "1rem" }}>Upload proof of your ₹{totalAmount} payment.</p>
                    <input 
                      key={`file-input-${currentAuthorIndex}`}
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setPaymentFile(e.target.files ? e.target.files[0] : null)}
                      style={{ width: "100%", fontSize: 13, background: "#fafafa", padding: "0.5rem", borderRadius: 6, border: "1px solid #eaeaea" }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "1.5rem", borderTop: "1px solid #eaeaea" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Delivery Charge</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: deliveryCharge === 0 ? "#10b981" : "#111" }}>
                      {deliveryCharge === 0 ? 'FREE' : `+ ₹${deliveryCharge}.00`}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Total Amount</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 400, color: "#111" }}>₹{totalAmount}.00</div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {currentAuthorIndex === 0 && (
                      <button
                        onClick={() => setCheckoutStep(1)}
                        style={{
                          width: "30%",
                          background: "#f1f5f9",
                          color: "#1e293b",
                          border: "none",
                          padding: "1rem",
                          borderRadius: 4,
                          fontFamily: "var(--font-body)",
                          fontSize: 16,
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={handlePay}
                      disabled={uploading || currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock)}
                      style={{
                        width: currentAuthorIndex === 0 ? "70%" : "100%",
                        background: (uploading || currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock)) ? "#9ca3af" : "#111",
                        color: "#fff",
                        border: "none",
                        padding: "1rem",
                        borderRadius: 4,
                        fontFamily: "var(--font-body)",
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: (uploading || currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock)) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Package size={18} />
                      {uploading ? "Processing..." : currentGroupBooks.some((b: any) => b.stock <= 0 || (quantities[b.id] || 1) > b.stock) ? "Out of Stock" : `Pay & Continue (${currentAuthorIndex + 1}/${authorGroups.length})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {uploading && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 9999, color: "#111"
        }}>
          <div className="w-12 h-12 border-4 border-paa-navy border-t-transparent rounded-full animate-spin mb-4"></div>
          <p style={{ fontSize: 20, fontWeight: 500, fontFamily: "var(--font-display)" }}>Placing Order...</p>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
