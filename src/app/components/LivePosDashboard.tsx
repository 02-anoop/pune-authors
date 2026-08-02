import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ShoppingCart, Plus, Minus, ArrowLeft, CheckCircle, QrCode, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function LivePosDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockBook, setAddStockBook] = useState<any>(null);
  const [addStockQty, setAddStockQty] = useState('1');
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [salesSummary, setSalesSummary] = useState<any>(null);

  const [selectedDay, setSelectedDay] = useState<string>('All');

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    if (salesSummary?.posOrders) {
      salesSummary.posOrders.forEach((o: any) => dates.add(new Date(o.createdAt).toDateString()));
    }
    if (salesSummary?.eventBooks) {
      salesSummary.eventBooks.forEach((eb: any) => {
        if (eb.manualDailySales) {
          Object.keys(eb.manualDailySales).forEach(d => dates.add(d));
        }
      });
    }
    return Array.from(dates).sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
  }, [salesSummary]);

  const filteredOrders = useMemo(() => {
    if (!salesSummary?.posOrders) return [];
    if (selectedDay === 'All') return salesSummary.posOrders;
    return salesSummary.posOrders.filter((o: any) => new Date(o.createdAt).toDateString() === selectedDay);
  }, [salesSummary, selectedDay]);

  const filteredSummary = useMemo(() => {
     let txns = filteredOrders.length;
     // We will calculate rev and sold from filteredEventBooks instead to avoid double counting
     return { totalTransactions: txns };
  }, [filteredOrders]);

  const filteredEventBooks = useMemo(() => {
     if (!salesSummary?.eventBooks) return [];
     if (selectedDay === 'All') {
         return salesSummary.eventBooks.map((eb: any) => {
             // For 'All', we can just use the global soldStock and manualTotalRevenue or calculate from mrp
             let revenue = 0;
             if (eb.manualDailySales) {
                 Object.values(eb.manualDailySales).forEach((d: any) => revenue += (d.revenue || 0));
             } else {
                 revenue = (eb.soldStock || 0) * (parseFloat(eb.overrideMrp || eb.book.mrp) || 0);
             }
             return { ...eb, daySold: eb.soldStock, totalSold: eb.soldStock, dayRevenue: revenue };
         });
     }
     
     return salesSummary.eventBooks.map((eb: any) => {
         let soldForDay = 0;
         let revForDay = 0;
         filteredOrders.forEach((o: any) => {
             o.items.forEach((i: any) => {
                 if (i.bookId === eb.bookId) {
                     soldForDay += i.quantity;
                     revForDay += (i.quantity * i.price);
                 }
             });
         });
         
         // Use manualDailySales if available for this day as it overrides POS
         if (eb.manualDailySales && eb.manualDailySales[selectedDay]) {
             if (eb.manualDailySales[selectedDay].sold !== undefined) {
                 soldForDay = eb.manualDailySales[selectedDay].sold;
             }
             if (eb.manualDailySales[selectedDay].revenue !== undefined) {
                 revForDay = eb.manualDailySales[selectedDay].revenue;
             }
         }
         
         return { ...eb, daySold: soldForDay, dayRevenue: revForDay, totalSold: eb.soldStock }; 
     });
  }, [salesSummary, filteredOrders, selectedDay]);
  
  const displaySummary = useMemo(() => {
      let rev = 0;
      let sold = 0;
      filteredEventBooks.forEach((eb: any) => {
          rev += (eb.dayRevenue || 0);
          sold += (eb.daySold || 0);
      });
      return { totalRevenue: rev, totalTransactions: filteredSummary.totalTransactions, totalBooksSold: sold };
  }, [filteredEventBooks, filteredSummary]);
  const handleAddStock = async () => {
    if(!addStockBook) return;
    setIsAddingStock(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/pos/events/${eventId}/add-stock`, {
        bookId: addStockBook.id,
        quantity: parseInt(addStockQty)
      }, { headers: { Authorization: `Bearer ${token}` }});
      toast.success('Stock added successfully!');
      setShowAddStockModal(false);
      setAddStockQty('1');
      fetchInventory();
    } catch(err: any) {
      toast.error(err.response?.data?.error || 'Failed to add stock');
    } finally {
      setIsAddingStock(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/pos/events/${eventId}/pos-inventory`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAuthor(res.data.author);
      setInventory(res.data.eventBooks);
    } catch (err) {
      toast.error('Failed to load POS inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/pos/events/${eventId}/pos-sales-summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSalesSummary(res.data);
    } catch (err) {
      toast.error('Failed to load summary');
    }
  };

  useEffect(() => {
    fetchInventory();
    if (location.search.includes('summary=true')) {
       fetchSummary();
       setShowSummary(true);
    }
  }, [eventId]);

  const addToCart = (book: any, maxQty: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.bookId === book.id);
      if (existing) {
        if (existing.quantity >= maxQty) {
           toast.error('Not enough stock!');
           return prev;
        }
        return prev.map(i => i.bookId === book.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { bookId: book.id, title: book.title, price: book.mrp, quantity: 1, maxQty }];
    });
  };

  const updateCartQty = (bookId: number, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.bookId === bookId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.bookId !== bookId);
      if (newQty > existing.maxQty) {
         toast.error('Not enough stock!');
         return prev;
      }
      return prev.map(i => i.bookId === bookId ? { ...i, quantity: newQty } : i);
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/pos/events/${eventId}/pos-checkout`, {
        items: cart.map(c => ({ bookId: c.bookId, quantity: c.quantity, price: c.price })),
        paymentMethod,
        totalAmount
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Sale recorded successfully!');
      setCart([]);
      setShowPaymentModal(false);
      fetchInventory();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-gray-50 overflow-hidden rounded-2xl border border-paa-navy/5 shadow-sm h-[calc(100vh-140px)] w-full relative">
        <div className="bg-white border-b border-paa-navy/5 px-6 py-4 flex items-center justify-between shrink-0 h-[72px]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full dash-skeleton"></div>
            <div>
              <div className="w-48 h-6 dash-skeleton rounded mb-2"></div>
              <div className="w-32 h-4 dash-skeleton rounded"></div>
            </div>
          </div>
          <div className="w-32 h-10 dash-skeleton rounded-lg"></div>
        </div>
        <div className="flex flex-1 p-4 gap-4 flex-col md:flex-row overflow-hidden">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[300px] bg-white rounded-xl border border-paa-navy/5 p-4 flex flex-col shadow-sm">
                 <div className="h-36 dash-skeleton rounded-lg w-full mb-4 shrink-0"></div>
                 <div className="h-4 dash-skeleton rounded w-3/4 mb-2"></div>
                 <div className="h-4 dash-skeleton rounded w-1/2 mb-4"></div>
                 <div className="mt-auto h-10 dash-skeleton rounded-full w-full"></div>
              </div>
            ))}
          </div>
          <div className="hidden md:flex w-[350px] lg:w-[400px] bg-white rounded-xl border border-paa-navy/5 p-6 shrink-0 h-full flex-col shadow-sm">
             <div className="flex gap-3 items-center mb-8 shrink-0">
                <div className="w-6 h-6 dash-skeleton rounded-full"></div>
                <div className="h-6 dash-skeleton rounded w-1/2"></div>
             </div>
             <div className="space-y-6 flex-1 overflow-hidden">
                 {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center">
                        <div className="flex-1">
                           <div className="h-4 dash-skeleton rounded w-full mb-2"></div>
                           <div className="h-3 dash-skeleton rounded w-1/3"></div>
                        </div>
                        <div className="w-24 h-8 dash-skeleton rounded-full shrink-0"></div>
                    </div>
                 ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden rounded-2xl border shadow-sm h-[calc(100vh-140px)] w-full relative">
      {/* Header */}
      <div className="bg-white border-b border-paa-navy/5 px-6 py-4 flex justify-between items-center shrink-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/events')} className="w-10 h-10 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center shadow-sm hover:shadow">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-serif text-paa-navy tracking-tight leading-tight font-bold">Live POS Dashboard</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-paa-gray-text mt-1">Book Fair Fast Checkout</p>
          </div>
        </div>
        <button 
          onClick={() => { fetchSummary(); setShowSummary(true); }}
          className="dash-btn dash-btn-primary"
        >
          Day Summary
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row relative z-0">
        {/* Left Side - Inventory Grid */}
        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar bg-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:pb-0">
            {inventory.map((eb: any) => {
              const cartItem = cart.find(c => c.bookId === eb.book.id);
              const cartQty = cartItem ? cartItem.quantity : 0;
              const available = eb.listedStock - eb.soldStock - cartQty;
              return (
                <div key={eb.id} className="bg-white border border-paa-navy/5 rounded-xl p-5 flex flex-col shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out h-[300px]">
                  <div className="h-36 bg-gray-100 mb-4 rounded-lg flex items-center justify-center overflow-hidden shrink-0 w-full relative">
                    {eb.book.coverUrl ? (
                      <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${eb.book.coverUrl}`} className="h-full w-full object-cover" alt={eb.book.title} />
                    ) : (
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Cover</span>
                    )}
                    {available <= 0 && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <span className="bg-red-100 text-red-800 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-3xl-2xl border border-red-200 shadow-sm">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-serif font-bold text-lg text-paa-navy leading-tight mb-2 line-clamp-2" title={eb.book.title}>{eb.book.title}</h3>
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-paa-navy/5">
                    <div>
                       <div className="text-paa-navy font-black text-xl leading-none">₹{eb.book.mrp}</div>
                       <div className="text-[10px] text-paa-gray-text font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
  {available} left
  <button onClick={(e) => { e.stopPropagation(); setAddStockBook(eb.book); setShowAddStockModal(true); }} className="text-paa-navy hover:text-paa-gold underline text-[9px] cursor-pointer">ADD</button>
</div>
                    </div>
                    <button 
                      onClick={() => addToCart(eb.book, eb.listedStock - eb.soldStock)}
                      disabled={available <= 0}
                      className="w-10 h-10 bg-paa-navy/5 text-paa-navy border border-paa-navy/10 rounded-full flex items-center justify-center hover:bg-paa-navy hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side - Cart */}
        <div className="w-full md:w-[350px] lg:w-[400px] bg-white border-t md:border-t-0 md:border-l border-paa-navy/5 flex flex-col shrink-0 h-[45%] md:h-full shadow-[-4px_0_20px_rgba(0,0,0,0.04)] md:shadow-none z-20">
          <div className="p-6 bg-white border-b border-paa-navy/5 flex items-center justify-between shrink-0 hidden md:flex">
             <h2 className="text-xl font-serif text-paa-navy font-bold flex items-center gap-2"><ShoppingCart size={20} /> Current Order</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>Cart is empty</p>
                <p className="text-xs mt-1 text-gray-500">Add items from the grid</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.bookId} className="flex justify-between items-center border-b border-paa-navy/5 pb-3">
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="text-sm font-bold text-paa-navy line-clamp-1">{item.title}</div>
                      <div className="text-xs text-paa-gray-text font-bold">₹{item.price}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => updateCartQty(item.bookId, -1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-paa-navy transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-sm w-4 text-center text-paa-navy">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.bookId, 1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-paa-navy transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-paa-navy/5 space-y-4 shrink-0 relative z-10">
            <div className="flex justify-between items-center text-xs font-bold text-paa-gray-text uppercase tracking-widest mb-1">
               <span>Total Books</span>
               <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between items-center text-lg border-t border-paa-navy/5 pt-3">
              <span className="font-bold text-paa-gray-text uppercase tracking-widest text-xs">Total Amount</span>
              <span className="font-serif font-bold text-paa-navy text-2xl">₹{totalAmount}</span>
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0 || cart.some(item => {
                const eb = inventory.find((e: any) => e.book.id === item.bookId);
                return !eb || item.quantity > (eb.listedStock - eb.soldStock);
              })}
              className="dash-btn dash-btn-primary w-full justify-center bg-green-600 border-none hover:bg-green-700 text-white py-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {cart.some(item => {
                const eb = inventory.find((e: any) => e.book.id === item.bookId);
                return !eb || item.quantity > (eb.listedStock - eb.soldStock);
              }) ? 'Out of Stock' : `Charge Customer (₹${totalAmount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-50 z-[300] flex flex-col h-[100dvh] w-full animate-fade-in-up">
            <div className="bg-paa-navy text-white p-5 md:p-6 flex justify-between items-center shrink-0 shadow-md">
              <h2 className="font-serif font-bold text-2xl tracking-tight leading-tight">Complete Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-6 md:p-10 flex-1 overflow-y-auto text-center flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto w-full">
              <div className="text-5xl md:text-6xl font-serif font-bold text-paa-navy drop-shadow-sm">₹{totalAmount}</div>
              
              <div className="flex gap-3 justify-center border-b pb-6 w-full max-w-sm">
                 <button onClick={() => setPaymentMethod('UPI')} className={`flex-1 py-3 border-2 font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 ${paymentMethod === 'UPI' ? 'bg-[#e4ebf5] border-paa-navy text-paa-navy shadow-inner' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>UPI QR</button>
                 <button onClick={() => setPaymentMethod('Cash')} className={`flex-1 py-3 border-2 font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 ${paymentMethod === 'Cash' ? 'bg-[#e4ebf5] border-paa-navy text-paa-navy shadow-inner' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Cash</button>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="flex flex-col items-center animate-fade-in-up">
                  {author?.qrCodeUrl ? (
                    <>
                      <p className="text-xs md:text-sm text-gray-500 mb-4 font-medium px-4">Ask customer to scan this QR code to pay directly to you.</p>
                      <div className="p-2 md:p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-premium">
                        <img src={author.qrCodeUrl.startsWith('http') ? author.qrCodeUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${author.qrCodeUrl}`} alt="QR Code" className="w-full max-w-[200px] md:max-w-[240px] aspect-square object-contain rounded-xl" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full max-w-[240px] aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-6">
                       <QrCode size={48} className="mb-3 opacity-40 text-gray-500" />
                       <span className="text-xs text-center font-medium">No QR Code uploaded in your profile.</span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Cash' && (
                <div className="py-6 md:py-8 text-paa-navy font-bold flex flex-col items-center animate-fade-in-up">
                   <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-5 border-4 border-green-100 shadow-sm">
                      <span className="text-3xl font-serif">₹</span>
                   </div>
                   <span className="text-lg">Receive <span className="text-green-700">₹{totalAmount}</span> in cash.</span>
                </div>
              )}

              <div className="flex gap-3 pt-8 border-t w-full max-w-md mt-auto">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="dash-btn dash-btn-ghost w-1/3 justify-center border-gray-300 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="dash-btn dash-btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : <><CheckCircle size={14} /> Payment Received</>}
                </button>
              </div>
            </div>
        </div>
      )}

      
      {/* Add Stock Modal */}
      {showAddStockModal && addStockBook && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-serif font-bold text-xl text-paa-navy">Add Event Stock</h3>
               <button onClick={() => setShowAddStockModal(false)} className="text-gray-400 hover:text-paa-navy"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">How many copies of <span className="font-bold text-paa-navy">"{addStockBook.title}"</span> would you like to add to this event? (This will also be added to your overall inventory log).</p>
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">Quantity</label>
              <input 
                 type="number" 
                 className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-paa-navy transition-colors text-center font-bold text-lg" 
                 value={addStockQty} 
                 onChange={e => setAddStockQty(e.target.value)} 
                 min="1"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddStockModal(false)} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddStock} disabled={isAddingStock} className="flex-1 py-3 bg-paa-navy text-paa-cream rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors disabled:opacity-50">
                 {isAddingStock ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}

      {showSummary && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-[90vw] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-paa-navy text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="font-serif font-bold text-xl tracking-tight">Day Summary</h2>
              <button onClick={() => setShowSummary(false)} className="text-white/80 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {!salesSummary ? (
                 <div className="flex flex-col gap-6 animate-pulse">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
                   </div>
                   <div className="h-6 bg-gray-200 w-48 rounded mb-2 mt-4"></div>
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                     {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded"></div>)}
                   </div>
                   <div className="h-6 bg-gray-200 w-48 rounded mb-2 mt-4"></div>
                   <div className="space-y-3">
                     {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded"></div>)}
                   </div>
                 </div>
              ) : (
                 <>
                   {uniqueDates.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-2 rounded-lg border border-gray-100">
                       <button onClick={() => setSelectedDay('All')} className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${selectedDay === 'All' ? 'bg-paa-navy text-white shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>All Days</button>
                       {uniqueDates.map((d: any, i: number) => (
                         <button key={i} onClick={() => setSelectedDay(d)} className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${selectedDay === d ? 'bg-paa-navy text-white shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                           Day {i + 1} ({new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                         </button>
                       ))}
                     </div>
                   )}

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                     <div className="bg-[#e4ebf5] p-3 rounded text-center border border-paa-navy/10 shadow-sm flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-paa-navy uppercase tracking-widest mb-1">Revenue</div>
                        <div className="text-xl font-serif text-paa-navy">₹{displaySummary.totalRevenue}</div>
                     </div>
                     <div className="bg-[#e4ebf5] p-3 rounded text-center border border-paa-navy/10 shadow-sm flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-paa-navy uppercase tracking-widest mb-1">Txns</div>
                        <div className="text-xl font-bold text-paa-navy">{displaySummary.totalTransactions}</div>
                     </div>
                     <div className="bg-[#e4ebf5] p-3 rounded text-center border border-paa-navy/10 shadow-sm flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-paa-navy uppercase tracking-widest mb-1">Books Sold</div>
                        <div className="text-xl font-bold text-paa-navy">{displaySummary.totalBooksSold}</div>
                        {filteredEventBooks.some((eb: any) => eb.daySold > 0) && (
                          <div className="flex flex-wrap justify-center gap-1 mt-2">
                             {filteredEventBooks.filter((eb: any) => eb.daySold > 0).map((eb: any, idx: number) => (
                               <span key={idx} className="bg-white text-paa-navy border border-paa-navy/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
                                 {eb.daySold}x {eb.book.title.length > 10 ? eb.book.title.substring(0, 10) + '...' : eb.book.title}
                               </span>
                             ))}
                          </div>
                        )}
                     </div>
                     <div className="bg-[#e4ebf5] p-3 rounded text-center border border-paa-navy/10 shadow-sm flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-paa-navy uppercase tracking-widest mb-1">Inventory Left</div>
                        <div className="text-xl font-bold text-paa-navy">
                           {filteredEventBooks.reduce((acc: number, eb: any) => acc + Math.max(0, eb.listedStock - eb.totalSold), 0)}
                        </div>
                     </div>
                   </div>

                   {filteredEventBooks.length > 0 && (
                     <>
                       <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-3 border-b pb-2">Inventory Status</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                         {filteredEventBooks.map((eb: any) => (
                           <div key={eb.id} className="border border-gray-200 p-3 rounded bg-white flex justify-between items-center shadow-sm">
                             <div className="flex-1 pr-2">
                               <div className="text-xs font-bold text-paa-navy line-clamp-1">{eb.book.title}</div>
                               <div className="text-[10px] text-gray-500 font-medium">₹{eb.book.mrp}</div>
                             </div>
                             <div className="text-right flex gap-3">
                               <div className="text-center">
                                 <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Sold</div>
                                 <div className="font-bold text-paa-navy">{eb.daySold}</div>
                               </div>
                               <div className="text-center">
                                 <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Left</div>
                                 <div className={`font-bold ${eb.listedStock - eb.totalSold > 0 ? 'text-green-700' : 'text-red-500'}`}>{eb.listedStock - eb.totalSold}</div>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </>
                   )}

                   <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-3 border-b pb-2">All Transactions</h3>
                   <div className="space-y-3">
                     {filteredOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No sales recorded yet.</p>
                     ) : (
                       filteredOrders.map((o: any) => (
                         <div key={o.id} className="border border-gray-200 p-3 rounded bg-white flex justify-between items-center shadow-sm">
                           <div>
                              <div className="text-xs font-bold text-paa-navy uppercase tracking-widest flex items-center gap-1">
                                Txn #{o.id} • {o.paymentMethod} {o.paymentMethod === 'UPI' && <CheckCircle size={10} className="text-green-600"/>}
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">{new Date(o.createdAt).toLocaleTimeString()}</div>
                              {o.transactionId && <div className="text-[9px] text-indigo-500 mt-1 font-mono break-all max-w-[150px]">Ref: {o.transactionId}</div>}
                           </div>
                           <div className="text-right flex flex-col items-end gap-1">
                              <div className="font-bold text-green-700">₹{o.totalAmount}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{o.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0)} items</div>
                              {o.paymentProofUrl && (
                                 <a href={o.paymentProofUrl.startsWith('http') ? o.paymentProofUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${o.paymentProofUrl}`} target="_blank" rel="noreferrer" className="text-[9px] text-indigo-600 hover:underline border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1">
                                    <ImageIcon className="w-2 h-2" /> Proof
                                 </a>
                              )}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
