import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Star, MessageSquare, Search, Trash2 } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim();

export const AdminReviewsTab = () => {
  const [bookReviews, setBookReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/reviews`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setBookReviews(res.data.bookReviews || []);
      } catch (err) {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleDeleteReview = async (id: number) => {
    if (window.confirm('Are you sure you want to permanently delete this review? This will remove it from the book details page as well.')) {
      try {
        await axios.delete(`${API}/api/admin/reviews/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setBookReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Review deleted successfully');
      } catch (err) {
        toast.error('Failed to delete review');
      }
    }
  };

  const filteredReviews = bookReviews.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.reviewerName?.toLowerCase().includes(query) ||
      r.book?.title?.toLowerCase().includes(query) ||
      r.book?.author?.name?.toLowerCase().includes(query) ||
      r.comment?.toLowerCase().includes(query) ||
      r.enjoyedMost?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-paa-navy" />
          <h2 className="text-2xl font-bold text-paa-navy">Reviews & Feedback</h2>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search books, authors, reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-paa-navy focus:ring-1 focus:ring-paa-navy/20 transition-all text-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-paa-navy/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="px-6 py-4 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent w-[60px] text-center">S.No</th>
                <th className="px-6 py-4 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Reviewer</th>
                <th className="px-6 py-4 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Book</th>
                <th className="px-6 py-4 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">Ratings</th>
                <th className="px-6 py-4 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paa-navy/5">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <React.Fragment key={`loading-${i}`}>
                    <tr className="animate-pulse border-b-0">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-center min-w-[120px]">
                          <div className="h-6 bg-yellow-50 rounded w-full"></div>
                          <div className="h-5 bg-blue-50 rounded w-full"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-6 bg-gray-200 rounded w-6 ml-auto"></div>
                      </td>
                    </tr>
                    <tr className="animate-pulse">
                      <td colSpan={5} className="px-6 pb-6 pt-0">
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : filteredReviews.map((review, idx) => (
                <React.Fragment key={review.id}>
                  <tr className={`${idx % 2 !== 0 ? 'bg-sky-200 border-b-0' : 'bg-white border-b-0'} border-transparent`}>
                    <td className="px-6 pt-6 pb-2 text-center font-bold text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="px-6 pt-6 pb-2">
                      <div className="font-bold text-paa-navy">{review.reviewerName}</div>
                      <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 pt-6 pb-2">
                      <div className="font-semibold text-paa-navy truncate max-w-[200px]" title={review.book?.title}>
                        {review.book?.title}
                      </div>
                      <div className="text-xs text-gray-500">{review.book?.author?.name}</div>
                    </td>
                    <td className="px-6 pt-6 pb-2">
                      <div className="flex flex-col gap-2 items-center min-w-[120px]">
                        <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold w-full justify-between">
                          <span>Overall:</span>
                          <span className="flex items-center gap-0.5">{review.rating} <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /></span>
                        </div>
                        {review.writingStyleRating && (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold w-full justify-between">
                            <span>Writing:</span>
                            <span className="flex items-center gap-0.5">{review.writingStyleRating} <Star className="w-2.5 h-2.5 fill-blue-500 text-blue-500" /></span>
                          </div>
                        )}
                        {review.contentQualityRating && (
                          <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold w-full justify-between">
                            <span>Content:</span>
                            <span className="flex items-center gap-0.5">{review.contentQualityRating} <Star className="w-2.5 h-2.5 fill-green-500 text-green-500" /></span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 pt-6 pb-2 text-right align-top">
                      <button 
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors" 
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className={idx % 2 !== 0 ? 'bg-sky-200' : 'bg-white'}>
                    <td colSpan={5} className="px-10 pb-6 pt-2">
                      <div className="bg-white/50 rounded-xl p-4 border border-paa-navy/5">
                        {review.enjoyedMost && (
                          <div className="mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Enjoyed Most:</span>
                            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-md">{review.enjoyedMost}</span>
                          </div>
                        )}
                        <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{review.comment}</p>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {(!loading && filteredReviews.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    {searchQuery ? 'No reviews match your search.' : 'No book reviews found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
