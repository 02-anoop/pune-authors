import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, User, Search, MapPin, CheckCircle2, ChevronRight, AlertCircle, Clock, CheckCircle, Sparkles, Feather } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AdminInvitationsTab = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/invitations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvitations(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  // Filter based on search only
  const filtered = invitations.filter(inv => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.eventTitle && inv.eventTitle.toLowerCase().includes(q)) ||
        (inv.author?.name && inv.author.name.toLowerCase().includes(q)) ||
        (inv.status && inv.status.toLowerCase().includes(q)) ||
        (inv.venue && inv.venue.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Under Review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Accepted by Author': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected by Author': return 'bg-red-100 text-red-800 border-red-200';
      case 'Sent to Author': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Approved': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) return <div className="p-6 text-center text-xs text-gray-500 animate-pulse">Loading invitations...</div>;

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'border-l-orange-400';
      case 'Under Review': return 'border-l-blue-400';
      case 'Accepted by Author': return 'border-l-emerald-400';
      case 'Rejected by Author': return 'border-l-red-400';
      case 'Sent to Author': return 'border-l-indigo-400';
      case 'Approved': return 'border-l-purple-400';
      case 'Completed': return 'border-l-gray-400';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in zoom-in duration-200">
      
      {/* Compact Header & Search Bar */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-paa-navy/5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h2 className="text-base font-bold text-paa-navy font-serif flex items-center gap-2">
            All Invitations
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-sans">
              {filtered.length}
            </span>
          </h2>
          <p className="text-[11px] text-gray-400">Manage and track speaking and event invitations sent to Pune Authors.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search author, event, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-paa-navy focus:ring-1 focus:ring-paa-navy transition-all"
          />
        </div>
      </div>

      {/* Streamlined Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-3.5 py-2.5 rounded-xl shadow-sm border border-blue-600/20 flex items-center justify-between text-white hover:scale-[1.01] transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider opacity-90">Total</p>
            <h4 className="text-xl font-black tracking-tight leading-tight">{invitations.length}</h4>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner shrink-0">
            <Calendar size={14} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-3.5 py-2.5 rounded-xl shadow-sm border border-amber-600/20 flex items-center justify-between text-white hover:scale-[1.01] transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-amber-100 uppercase tracking-wider opacity-90">Pending</p>
            <h4 className="text-xl font-black tracking-tight leading-tight">
              {invitations.filter(i => i.status === 'Pending').length}
            </h4>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner shrink-0">
            <Clock size={14} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-3.5 py-2.5 rounded-xl shadow-sm border border-emerald-600/20 flex items-center justify-between text-white hover:scale-[1.01] transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider opacity-90">Accepted</p>
            <h4 className="text-xl font-black tracking-tight leading-tight">
              {invitations.filter(i => ['Accepted by Author', 'Approved', 'Completed'].includes(i.status)).length}
            </h4>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner shrink-0">
            <CheckCircle size={14} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-red-600 px-3.5 py-2.5 rounded-xl shadow-sm border border-rose-600/20 flex items-center justify-between text-white hover:scale-[1.01] transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-rose-100 uppercase tracking-wider opacity-90">Rejected</p>
            <h4 className="text-xl font-black tracking-tight leading-tight">
              {invitations.filter(i => i.status === 'Rejected by Author').length}
            </h4>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner shrink-0">
            <AlertCircle size={14} />
          </div>
        </div>
      </div>

      {/* Invitations List - Space Efficient Rows */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-paa-navy/5 text-center shadow-sm flex flex-col items-center">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-paa-navy mb-0.5">No invitations found</h3>
            <p className="text-xs text-gray-400">There are no invitations matching your search criteria.</p>
          </div>
        ) : (
          filtered.map((inv, index) => (
            <div 
              key={inv.id} 
              className={`bg-white rounded-xl border border-gray-200/70 border-l-[3px] ${getStatusBorderColor(inv.status)} shadow-xs overflow-hidden hover:shadow-md transition-all duration-200`}
            >
              {/* Card Row Header (Compact Collapsed View) */}
              <div 
                className="px-3.5 py-2 cursor-pointer flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-start sm:items-center justify-between hover:bg-gray-50/60 transition-colors"
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 w-full">
                  <div className="text-gray-400 font-bold text-xs w-4 shrink-0 text-center">
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0 shadow-xs">
                    {inv.author?.photoUrl ? (
                      <img 
                        src={inv.author.photoUrl.startsWith('http') ? inv.author.photoUrl : `${API}${inv.author.photoUrl.startsWith('/') ? inv.author.photoUrl : '/' + inv.author.photoUrl}`} 
                        alt={inv.author?.name || 'Author'} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs font-bold font-serif text-paa-navy">
                        {inv.author?.name ? inv.author.name.charAt(0) : 'A'}
                      </span>
                    )}
                  </div>
                  
                  {/* Two-line compact info block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap leading-none mb-1">
                      <h3 className="font-bold text-paa-navy text-xs sm:text-sm truncate hover:text-paa-amber transition-colors">
                        {inv.author?.name || 'Unknown Author'}
                      </h3>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap truncate">
                      <span className="font-semibold text-[#b44d28] truncate max-w-[180px] sm:max-w-xs">
                        {inv.eventTitle}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500 text-[11px] truncate">
                        By <strong className="text-gray-700 font-medium">{inv.customerName}</strong>
                      </span>
                      {inv.venue && (
                        <>
                          <span className="text-gray-300 hidden md:inline">•</span>
                          <span className="text-gray-400 text-[11px] hidden md:inline-flex items-center gap-0.5 truncate">
                            <MapPin size={10} className="text-gray-400 shrink-0"/> {inv.venue}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Toggle Button */}
                <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
                  <button className="flex items-center gap-1 text-[11px] font-bold text-paa-amber hover:text-paa-navy transition-all duration-150 bg-orange-50/80 hover:bg-orange-100 border border-orange-200/50 px-2.5 py-1 rounded-lg shadow-xs">
                    {expandedId === inv.id ? 'Close' : 'Details'} 
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedId === inv.id ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Card Body (Compact Expanded View) */}
              {expandedId === inv.id && (
                <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-gray-50/60 space-y-3 animate-in slide-in-from-top-1 duration-150 text-xs">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Organizer details (Blue theme) */}
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2">
                      <div className="text-blue-700 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider pb-1 border-b border-blue-50">
                        <User size={13}/> Organizer Details
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name</span>
                          <strong className="text-blue-950">{inv.customerName}</strong>
                        </div>
                        {inv.organizationName && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Org/Club</span>
                            <span className="font-semibold text-gray-700">{inv.organizationName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email</span>
                          <span className="text-blue-700 font-medium">{inv.customerEmail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Phone</span>
                          <span className="text-gray-700 font-medium">{inv.customerPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Event specs details (Amber theme) */}
                    <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs space-y-2">
                      <div className="text-amber-800 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider pb-1 border-b border-amber-50">
                        <Calendar size={13}/> Event Specifications
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type</span>
                          <span className="font-semibold text-amber-900">{inv.eventType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date & Time</span>
                          <span className="font-semibold text-gray-700">{inv.eventDate} {inv.eventTime && `at ${inv.eventTime}`}</span>
                        </div>
                        {inv.expectedAudience && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Audience</span>
                            <span className="font-semibold text-gray-700">{inv.expectedAudience}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Venue</span>
                          <span className="flex items-center gap-1 font-semibold text-gray-700">
                            <MapPin size={11} className="text-amber-600 shrink-0"/> {inv.venue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reason for invitation (Purple theme) */}
                  {inv.reasonForInvite && (
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs space-y-1">
                      <h5 className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={11} /> Why they invited this author
                      </h5>
                      <p className="text-xs text-gray-700 bg-purple-50/30 p-2 rounded-lg leading-relaxed font-medium">
                        {inv.reasonForInvite}
                      </p>
                    </div>
                  )}

                  {/* Event description (Emerald theme) */}
                  {inv.eventDescription && (
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs space-y-1">
                      <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Feather size={11} /> Event Description
                      </h5>
                      <p className="text-xs text-gray-700 bg-emerald-50/30 p-2 rounded-lg leading-relaxed whitespace-pre-wrap font-medium">
                        {inv.eventDescription}
                      </p>
                    </div>
                  )}

                  {/* Additional notes (Rose/Red theme) */}
                  {inv.additionalNotes && (
                    <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs space-y-1">
                      <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle size={11} /> Additional Notes from Organizer
                      </h5>
                      <p className="text-xs text-gray-700 bg-rose-50/30 p-2 rounded-lg leading-relaxed italic border-l-2 border-l-rose-400 pl-2.5">
                        {inv.additionalNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

