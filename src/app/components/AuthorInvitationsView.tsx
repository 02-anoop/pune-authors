import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Search, 
  Eye, 
  X, 
  Users,
  Check,
  Building2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const formatInvitationDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const dateObj = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const statusMeta = (status: string) => {
  if (status === 'Sent to Author') return { label: 'Pending', cls: 'bg-amber-500 text-white', modalCls: 'bg-amber-100 text-amber-800 border border-amber-200' };
  if (status === 'Accepted by Author') return { label: 'Accepted', cls: 'bg-emerald-600 text-white', modalCls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
  if (status === 'Rejected by Author') return { label: 'Declined', cls: 'bg-rose-500 text-white', modalCls: 'bg-rose-100 text-rose-800 border border-rose-200' };
  return { label: status, cls: 'bg-slate-500 text-white', modalCls: 'bg-slate-100 text-slate-800 border border-slate-200' };
};

export const AuthorInvitationsView = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvitation, setSelectedInvitation] = useState<any | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const res = await axios.get(`${API}/api/author/invitations`, {
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

  const respondToInvitation = async (id: number, status: string) => {
    try {
      await axios.put(`${API}/api/author/invitations/${id}/respond`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(`Invitation ${status.split(' ')[0].toLowerCase()}`);
      fetchInvitations();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update response');
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inv.eventTitle?.toLowerCase().includes(query) ||
      inv.venue?.toLowerCase().includes(query) ||
      inv.customerName?.toLowerCase().includes(query) ||
      inv.organizationName?.toLowerCase().includes(query) ||
      inv.eventType?.toLowerCase().includes(query);

    let matchesStatus = true;
    if (statusFilter === 'Pending') matchesStatus = inv.status === 'Sent to Author';
    else if (statusFilter === 'Accepted') matchesStatus = inv.status === 'Accepted by Author';
    else if (statusFilter === 'Declined') matchesStatus = inv.status === 'Rejected by Author';

    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-center text-paa-gray-text animate-pulse font-medium">Loading your invitations...</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">

      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-serif text-paa-navy mb-1">Author Invitations</h2>
          <p className="text-xs sm:text-sm text-paa-gray-text">Manage invitations from readers, schools, and organizations.</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner shrink-0">
          <Calendar size={20} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 sm:p-4 rounded-xl border border-paa-navy/5 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by title, venue, or organizer..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filters — scrollable horizontally on very small screens */}
        <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl items-center gap-1">
          {['All', 'Pending', 'Accepted', 'Declined'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-paa-navy shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ───────────── MOBILE CARD VIEW (< md) ───────────── */}
      <div className="md:hidden space-y-3">
        {filteredInvitations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-paa-navy/5 shadow-sm py-14 text-center text-sm text-gray-400 font-medium italic">
            No invitations found matching the selected filters.
          </div>
        ) : (
          filteredInvitations.map((inv, idx) => {
            const meta = statusMeta(inv.status);
            return (
              <div
                key={inv.id}
                className={`rounded-2xl border border-paa-navy/5 shadow-sm p-4 space-y-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf6ee]'}`}
              >
                {/* Title Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-paa-navy text-sm leading-snug">{inv.eventTitle}</div>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {inv.eventType}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full shadow-sm shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <Calendar size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-700">{formatInvitationDate(inv.eventDate)}</div>
                      {inv.eventTime && <div className="text-[10px] text-slate-400">{inv.eventTime}</div>}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin size={12} className="text-rose-500 mt-0.5 shrink-0" />
                    <span className="font-semibold text-slate-700 line-clamp-2">{inv.venue}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600 col-span-2">
                    <User size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">{inv.customerName}</div>
                      {inv.organizationName && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Building2 size={10} />
                          {inv.organizationName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedInvitation(inv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a4b6b] text-white hover:bg-[#1f374e] rounded-lg transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Eye size={13} /> Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ───────────── DESKTOP TABLE VIEW (≥ md) ───────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-paa-navy/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dash-table w-full text-left border-collapse whitespace-nowrap table-fixed">
            <thead className="bg-[#2a4b6b] text-white">
              <tr>
                <th className="w-[25%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider">Event Details</th>
                <th className="w-[18%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider">Date &amp; Time</th>
                <th className="w-[20%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider">Venue</th>
                <th className="w-[17%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider">Organizer</th>
                <th className="w-[10%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider text-center">Status</th>
                <th className="w-[10%] px-6 py-4 !text-[13px] !text-white !bg-transparent font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-gray-400 font-medium italic">
                    No invitations found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((inv, idx) => {
                  const meta = statusMeta(inv.status);
                  return (
                    <tr key={inv.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-indigo-50/20`}>
                      <td className="px-6 py-4 truncate">
                        <div className="font-bold text-paa-navy text-sm truncate" title={inv.eventTitle}>{inv.eventTitle}</div>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {inv.eventType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Calendar size={13} className="text-indigo-500" />
                          <span>{formatInvitationDate(inv.eventDate)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 ml-5">{inv.eventTime}</div>
                      </td>
                      <td className="px-6 py-4 truncate">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate" title={inv.venue}>
                          <MapPin size={13} className="text-rose-500 shrink-0" />
                          <span className="truncate">{inv.venue}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate">
                        <div className="font-bold text-xs text-slate-800 truncate" title={inv.customerName}>{inv.customerName}</div>
                        {inv.organizationName ? (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 font-medium truncate" title={inv.organizationName}>
                            <Building2 size={11} className="shrink-0" />
                            <span className="truncate">{inv.organizationName}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Individual</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full shadow-sm ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedInvitation(inv)}
                          className="p-1.5 bg-[#2a4b6b] text-white hover:bg-[#1f374e] rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm border border-transparent ml-auto"
                          title="View Details"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────── Details Modal ───────────── */}
      {selectedInvitation && (
        <div className="fixed inset-0 bg-paa-navy/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-paa-navy/5 w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 flex flex-col">

            {/* Modal Header */}
            <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusMeta(selectedInvitation.status).modalCls}`}>
                    {selectedInvitation.status === 'Sent to Author' ? 'Pending Action' : selectedInvitation.status}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedInvitation.eventType}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-serif text-paa-navy leading-snug">{selectedInvitation.eventTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedInvitation(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-50 rounded-lg border border-gray-100 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">

              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-150">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date &amp; Time</p>
                    <p className="text-xs font-bold text-slate-700">{formatInvitationDate(selectedInvitation.eventDate)} {selectedInvitation.eventTime && `(${selectedInvitation.eventTime})`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Venue</p>
                    <p className="text-xs font-bold text-slate-700 break-words">{selectedInvitation.venue}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Audience</p>
                    <p className="text-xs font-bold text-slate-700">{selectedInvitation.expectedAudience || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Description & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-indigo-100/50 pb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Event Description
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedInvitation.eventDescription || 'No description provided.'}
                  </p>
                </div>
                <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-100">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-amber-100/50 pb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Notes / Reason
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedInvitation.additionalNotes || selectedInvitation.reasonForInvite || 'No additional notes provided.'}
                  </p>
                </div>
              </div>

              {/* Organizer */}
              <div className="border border-slate-150 p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" /> Organizer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Name</p>
                    <p className="text-slate-800 font-bold">{selectedInvitation.customerName}</p>
                  </div>
                  {selectedInvitation.organizationName && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Organization</p>
                      <p className="text-slate-800 font-bold">{selectedInvitation.organizationName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email</p>
                    <a href={`mailto:${selectedInvitation.customerEmail}`} className="text-indigo-600 hover:underline font-bold block break-all">
                      {selectedInvitation.customerEmail}
                    </a>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Phone</p>
                    <a href={`tel:${selectedInvitation.customerPhone}`} className="text-indigo-600 hover:underline font-bold block break-all">
                      {selectedInvitation.customerPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Admin Remark */}
              {selectedInvitation.adminRemarks && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-150 flex gap-2">
                  <span className="text-sm">📢</span>
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Admin Remarks</h4>
                    <p className="text-xs text-amber-900 leading-relaxed">{selectedInvitation.adminRemarks}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0 rounded-b-2xl">
              {selectedInvitation.status === 'Sent to Author' ? (
                <>
                  <button
                    onClick={() => { respondToInvitation(selectedInvitation.id, 'Rejected by Author'); setSelectedInvitation(null); }}
                    className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <XCircle size={15} /> Decline
                  </button>
                  <button
                    onClick={() => { respondToInvitation(selectedInvitation.id, 'Accepted by Author'); setSelectedInvitation(null); }}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                  >
                    <CheckCircle2 size={15} /> Accept Invite
                  </button>
                </>
              ) : selectedInvitation.status === 'Accepted by Author' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <Check size={14} /> You have Accepted this Invitation
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[10px] uppercase tracking-wider bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                  <XCircle size={14} /> You have Declined this Invitation
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
