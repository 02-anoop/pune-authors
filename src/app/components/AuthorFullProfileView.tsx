import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Check, XCircle } from 'lucide-react';

export const AuthorFullProfileView = ({ author, onBack }: { author: any, onBack: () => void }) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'inventory' | 'orders' | 'events' | 'distribution' | 'forms'>('profile');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/authors/${author.id}/dashboard-data`);
        setProfileData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [author.id]);

  if (loading) return (
    <div className="p-8 bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out space-y-6">
       <div className="flex gap-4 items-center">
          <div className="w-14 h-14 bg-gray-200 animate-pulse rounded-3xl-2xl"></div>
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-3xl-2xl"></div>
       </div>
       <div className="h-64 bg-gray-200 animate-pulse rounded-3xl-2xl w-full"></div>
    </div>
  );
  if (!profileData) return <div className="p-8 text-center text-red-500 font-bold bg-white border border-red-200">Error loading author details.</div>;

  const { authorProfile, authorOrders } = profileData;

  return (
    <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col">
      <div className="p-8 border-b border-paa-navy/5 bg-[#f0f4f8] flex items-start justify-between">
         <div className="flex gap-4 items-center">
            <button onClick={onBack} className="p-2 bg-white border border-paa-navy/20 hover:bg-gray-50 rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out transition-colors rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
               <ArrowLeft className="w-5 h-5 text-paa-navy" />
            </button>
            <div className="w-14 h-14 bg-white border border-paa-navy/5 text-paa-navy flex items-center justify-center font-bold font-serif text-3xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
              {authorProfile.name.charAt(0)}
            </div>
            <div>
               <h2 className="text-2xl font-bold text-paa-navy uppercase tracking-widest">{authorProfile.name}</h2>
               <p className="text-sm font-medium text-paa-gray-text">{authorProfile.email} | {authorProfile.phone}</p>
               <p className="text-xs text-paa-navy mt-1 uppercase tracking-widest font-bold bg-[#eef2f6] inline-block px-2 py-0.5">Joined: {new Date(authorProfile.createdAt).toLocaleDateString()}</p>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        <div className="author-profile-sidebar w-full md:w-[220px] p-4 flex flex-col gap-2 md:sticky md:top-0 h-fit">
           <button onClick={() => setActiveProfileTab('profile')} className={`author-profile-nav-btn ${activeProfileTab === 'profile' ? 'active' : ''}`}>Registration Profile</button>
           <button onClick={() => setActiveProfileTab('inventory')} className={`author-profile-nav-btn ${activeProfileTab === 'inventory' ? 'active' : ''}`}>Inventory</button>
           <button onClick={() => setActiveProfileTab('orders')} className={`author-profile-nav-btn ${activeProfileTab === 'orders' ? 'active' : ''}`}>Web Orders</button>
           <button onClick={() => setActiveProfileTab('events')} className={`author-profile-nav-btn ${activeProfileTab === 'events' ? 'active' : ''}`}>Events</button>
           <button onClick={() => setActiveProfileTab('distribution')} className={`author-profile-nav-btn ${activeProfileTab === 'distribution' ? 'active' : ''}`}>Distribution</button>
        </div>
        
        <div className="flex-1 p-6 bg-gray-50/50 min-h-[500px]">
        {activeProfileTab === 'profile' && (
        <div id="profile" className="space-y-6">
          <div className="bg-white border border-paa-navy/5 p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Author Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Full Name</span><span className="text-sm text-paa-navy font-medium">{authorProfile.name}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Pen Name</span><span className="text-sm text-paa-navy font-medium">{authorProfile.penName || '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Email</span><span className="text-sm text-paa-navy font-medium">{authorProfile.email}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Phone / WhatsApp</span><span className="text-sm text-paa-navy font-medium">{authorProfile.phone} {authorProfile.whatsapp ? `/ ${authorProfile.whatsapp}` : ''}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Location</span><span className="text-sm text-paa-navy font-medium">{authorProfile.city ? `${authorProfile.city}, ${authorProfile.state}` : '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Social Profiles</span>
                <span className="text-sm text-paa-navy font-medium flex gap-3 flex-wrap">
                   {authorProfile.instagram && <a href={authorProfile.instagram} target="_blank" className="text-blue-600 hover:underline">Instagram</a>} 
                   {authorProfile.facebook && <a href={authorProfile.facebook} target="_blank" className="text-blue-600 hover:underline">Facebook</a>}
                   {authorProfile.extraData?.linkedin && <a href={authorProfile.extraData.linkedin} target="_blank" className="text-blue-600 hover:underline">LinkedIn</a>}
                   {authorProfile.extraData?.youtube && <a href={authorProfile.extraData.youtube} target="_blank" className="text-blue-600 hover:underline">YouTube</a>}
                   {!authorProfile.instagram && !authorProfile.facebook && !authorProfile.extraData?.linkedin && !authorProfile.extraData?.youtube && '-'}
                </span>
              </div>
              <div className="md:col-span-2"><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Full Address</span><span className="text-sm text-paa-navy font-medium">{authorProfile.address || '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Aadhar/Voter ID/DL</span><span className="text-sm text-paa-navy font-medium">{authorProfile.aadharNumber || '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">DOB</span><span className="text-sm text-paa-navy font-medium">{authorProfile.age ? (() => { try { const d = new Date(authorProfile.age); if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e) {} return authorProfile.age; })() : '-'}</span></div>
              <div className="md:col-span-2"><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Qualifications</span>
                {(() => {
                   let qText = authorProfile.qualification || '-';
                   try {
                     const qArr = JSON.parse(authorProfile.qualification);
                     if (Array.isArray(qArr)) {
                        return (
                          <div className="space-y-2 mt-1">
                            {qArr.map((q: any, i: number) => (
                               <div key={i} className="bg-gray-50 p-2 border border-gray-100 rounded text-sm text-paa-navy">
                                 <strong>{q.qualification}</strong> at {q.institution} ({q.subject}) {q.certificateUrl && <a href={API + q.certificateUrl} target="_blank" className="text-blue-600 ml-2 hover:underline font-bold text-xs">View Certificate</a>}
                               </div>
                            ))}
                          </div>
                        );
                     }
                   } catch(e) {}
                   return <span className="text-sm text-paa-navy font-medium block whitespace-pre-wrap">{qText}</span>;
                })()}
              </div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Experience</span><span className="text-sm text-paa-navy font-medium">{authorProfile.experience || '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Skills</span><span className="text-sm text-paa-navy font-medium">{authorProfile.skills || '-'}</span></div>
              <div><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Hobbies</span><span className="text-sm text-paa-navy font-medium">{authorProfile.hobbies || '-'}</span></div>
              <div className="md:col-span-2"><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Bio</span><span className="text-sm text-paa-navy font-medium block whitespace-pre-wrap">{authorProfile.bio || '-'}</span></div>
              <div className="md:col-span-2"><span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Why Joining? (If traditionally published)</span><span className="text-sm text-paa-navy font-medium block whitespace-pre-wrap">{authorProfile.whyJoining || '-'}</span></div>
            </div>
          </div>

          
          <div className="bg-white border border-paa-navy/5 p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Book Catalogue</h3>
            <div className="space-y-4">
              {(() => {
                const catalogueBooks = authorProfile.books.filter((b: any) => new Date(b.createdAt).getTime() > new Date(authorProfile.createdAt).getTime() + 60000);
                if (catalogueBooks.length === 0) {
                  return <p className="text-sm text-paa-gray-text font-medium bg-gray-50 p-4 border border-paa-navy/5 rounded">No new book added by the author.</p>;
                }
                return catalogueBooks.map((b: any, idx: number) => (
                <div key={b.id} className="border border-paa-navy/5 p-4 bg-gray-50 flex flex-col md:flex-row gap-4">
                  {b.coverUrl && <img src={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + b.coverUrl : "http://localhost:3001" + b.coverUrl} alt="Cover" className="w-20 h-28 object-cover border border-paa-navy/20" />}
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-paa-navy flex items-center gap-2">
                      {b.title}
                      {(b.overpriced || b.isOverpriced) && <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Overpriced</span>}
                      {b.status === 'Pending' && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm border border-blue-200">NEW</span>}
                    </h4>
                    {b.subtitle && <p className="text-sm text-paa-gray-text font-medium mb-1">{b.subtitle}</p>}
                    <p className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-2 bg-[#f0f4f8] inline-block px-2 py-0.5">{b.genre} {b.subGenre && `> ${b.subGenre}`}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">MRP</span><span className="text-sm font-bold text-green-700">₹{b.mrp}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Language</span><span className="text-sm font-bold text-paa-navy">{b.language || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Format</span><span className="text-sm font-bold text-paa-navy">{b.format || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Print Format</span><span className="text-sm font-bold text-paa-navy">{b.printFormat || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Pages</span><span className="text-sm font-bold text-paa-navy">{b.pages || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Publisher</span><span className="text-sm font-bold text-paa-navy">{b.publisher || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Edition</span><span className="text-sm font-bold text-paa-navy">{b.edition || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Pub Date</span><span className="text-sm font-bold text-paa-navy">{b.publicationDate || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">ISBN</span><span className="text-sm font-bold text-paa-navy">{b.isbn || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Purpose of Writing</span><span className="text-sm font-bold text-paa-navy">{b.purpose || '-'}</span></div>
                      <div><span className="text-[10px] uppercase text-paa-gray-text block">Initial Stock</span><span className="text-sm font-bold text-paa-navy">{b.stock}</span></div>
                    </div>
                    
                    <div className="mt-4"><span className="text-[10px] uppercase text-paa-gray-text block mb-1">Synopsis</span><p className="text-sm text-paa-navy font-medium whitespace-pre-wrap leading-relaxed">{b.synopsis}</p></div>
                  </div>
                </div>
              ));
              })()}
            </div>
          </div>
          
          <div className="bg-white border border-paa-navy/5 p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Payment Details</h3>
            <div className="flex gap-8 items-start">
               <div>
                  <span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Transaction ID</span>
                  <span className="text-sm text-paa-navy font-bold bg-gray-100 px-2 py-1">{authorProfile.transactionId || '-'}</span>
               </div>
               {authorProfile.paymentScreenshot && (
                 <div>
                    <span className="text-xs font-bold text-paa-gray-text uppercase block mb-1">Receipt</span>
                    <a href={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + authorProfile.paymentScreenshot : "http://localhost:3001" + authorProfile.paymentScreenshot} target="_blank" className="text-sm text-blue-600 underline font-bold">View Screenshot</a>
                 </div>
               )}
            </div>
          </div>
        </div>
        )}

        {activeProfileTab === 'inventory' && (
        <div id="inventory">
          <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Books & Inventory</h3>
          {(() => {
            const authorCreatedAt = new Date(authorProfile.createdAt).getTime();
            // Add a 2-minute buffer to filter out books submitted during initial registration
            const newBooks = authorProfile.books.filter((b: any) => new Date(b.createdAt).getTime() > authorCreatedAt + 120000);
            
            if (newBooks.length === 0) {
              return (
                <blockquote className="border-l-4 border-paa-navy pl-4 py-2 italic text-paa-gray-text bg-gray-50">
                  "No new book added by the author."
                </blockquote>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="dash-table w-full">
                   <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                     <tr>
                       <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Title</th>
                       <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">MRP</th>
                       <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Stock</th>
                       <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {newBooks.map((b: any) => (
                       <tr key={b.id}>
                         <td className="font-bold text-paa-navy">{b.title} <span className="text-xs text-gray-500 font-medium block">{b.genre}</span></td>
                         <td style={{textAlign: 'center'}} className="font-bold text-paa-navy">₹{b.mrp}</td>
                         <td style={{textAlign: 'center'}} className="font-bold text-paa-navy">{b.stock}</td>
                         <td style={{textAlign: 'center'}}>
                            <span className={`dash-badge ${b.status === 'Approved' ? 'approved' : 'pending'}`}>
                              {b.status}
                            </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            );
          })()}
        </div>
        )}

        {activeProfileTab === 'orders' && (
        <div id="orders">
          <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Web Orders</h3>
          <div className="overflow-x-auto bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <table className="dash-table">
               <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                 <tr>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Order ID</th>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Customer</th>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Book</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Qty / Amt</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Status</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Payment</th>
                 </tr>
               </thead>
               <tbody>
                 {authorOrders.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-paa-gray-text">No web orders yet.</td></tr> : authorOrders.map((o: any) => (
                   <tr key={o.id}>
                     <td className="font-bold text-paa-navy">ORD-{o.orderId}<span className="text-[10px] block text-gray-500">{o.date}</span></td>
                     <td className="font-medium text-paa-navy">{o.customerName}</td>
                     <td className="font-medium text-paa-navy">{o.bookTitle}</td>
                     <td style={{textAlign: 'center'}} className="font-bold text-paa-navy">{o.quantity} <span className="text-gray-400 font-medium px-1">/</span> ₹{o.amount}</td>
                     <td style={{textAlign: 'center'}}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`dash-badge ${o.status === 'Completed' ? 'approved' : o.status === 'Dispatched' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'pending'}`}>
                            {o.status}
                          </span>
                          {(o.status === 'Dispatched') && o.dispatchedAt && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                              {new Date(o.dispatchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {(o.status === 'Delivered' || o.status === 'Completed') && o.deliveredAt && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                              {new Date(o.deliveredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                     </td>
                     <td style={{textAlign: 'center'}}>
                        {o.paymentVerified ? <span className="dash-badge approved"><Check size={10}/> Verified</span> : o.paymentFailed ? <span className="dash-badge rejected"><XCircle size={10}/> Failed</span> : <span className="dash-badge pending">Pending</span>}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>
        )}

        {activeProfileTab === 'events' && (
        <div id="events">
          <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Event Participations</h3>
          <div className="overflow-x-auto bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <table className="dash-table">
               <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                 <tr>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Event Name</th>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">City</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Amount Paid</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Date</th>
                 </tr>
               </thead>
               <tbody>
                 {authorProfile.eventRegistrations.length === 0 ? <tr><td colSpan={4} className="text-center py-4 text-paa-gray-text">No events attended.</td></tr> : authorProfile.eventRegistrations.map((e: any) => (
                   <tr key={e.id}>
                     <td className="font-bold text-paa-navy">{e.activity?.name}</td>
                     <td className="font-medium text-paa-navy">{e.activity?.city}</td>
                     <td style={{textAlign: 'center'}} className="font-bold text-green-700">₹{e.amount}</td>
                     <td style={{textAlign: 'center'}} className="font-medium text-paa-gray-text">{e.activity?.date}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>
        )}

        {activeProfileTab === 'distribution' && (
        <div id="distribution">
          <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight mb-4 border-l-4 border-paa-navy pl-2">Books Distribution Record</h3>
          <div className="overflow-x-auto bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <table className="dash-table">
               <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                 <tr>
                   <th className="!text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Title</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Qty Sold</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Airport Stock</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Fair Stock</th>
                   <th className="text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">In Stock</th>
                 </tr>
               </thead>
               <tbody>
                 {authorProfile.books.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-paa-gray-text">No distribution records.</td></tr> : authorProfile.books.map((b: any) => {
                   const qtySold = authorOrders.filter((o: any) => o.bookTitle === b.title && (o.status === 'Completed' || o.status === 'Dispatched')).reduce((acc: number, curr: any) => acc + curr.quantity, 0);
                   return (
                   <tr key={b.id}>
                     <td className="font-bold text-paa-navy">{b.title}</td>
                     <td style={{textAlign: 'center'}} className="font-bold text-green-700">{qtySold}</td>
                     <td style={{textAlign: 'center'}}>{b.airportStock || 0}</td>
                     <td style={{textAlign: 'center'}}>{b.fairStock || 0}</td>
                     <td style={{textAlign: 'center'}} className="font-bold">{b.stock}</td>
                   </tr>
                 )})}
               </tbody>
            </table>
          </div>
        </div>
        )}

        </div>
      </div>
    </div>
  );
};

