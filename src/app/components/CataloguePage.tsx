import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { bookCategories } from "../data/categories";
import { ShoppingCart, Search, SlidersHorizontal, Star, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, X, BookOpen, Info, Download, Loader2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
// ── Category config ─────────────────────────────────────────────────────────
export const getCategoryColor = (cat: string) => {
    // Large, vibrant consistent palette to prevent repetition
    const colors = [
        { color: "#FF7A00", bg: "#fff3e6", border: "#FF7A00" }, // 0: Orange
        { color: "#00C2FF", bg: "#e6f9ff", border: "#00C2FF" }, // 1: Cyan
        { color: "#00D084", bg: "#e6faf3", border: "#00D084" }, // 2: Green
        { color: "#FF4FA3", bg: "#ffeef6", border: "#FF4FA3" }, // 3: Pink
        { color: "#7B61FF", bg: "#f2efff", border: "#7B61FF" }, // 4: Purple
        { color: "#eab308", bg: "#fefce8", border: "#eab308" }, // 5: Yellow
        { color: "#E11D48", bg: "#fff1f2", border: "#E11D48" }, // 6: Rose Red
        { color: "#2563EB", bg: "#eff6ff", border: "#2563EB" }, // 7: Royal Blue
        { color: "#14B8A6", bg: "#f0fdfa", border: "#14B8A6" }, // 8: Teal
        { color: "#D946EF", bg: "#fdf4ff", border: "#D946EF" }, // 9: Fuchsia
        { color: "#65a30d", bg: "#f7fee7", border: "#65a30d" }, // 10: Lime Green
        { color: "#475569", bg: "#f1f5f9", border: "#475569" }, // 11: Slate
        { color: "#06B6D4", bg: "#ecfeff", border: "#06B6D4" }, // 12: Light Blue
        { color: "#991B1B", bg: "#fef2f2", border: "#991B1B" }, // 13: Dark Red
        { color: "#10B981", bg: "#ecfdf5", border: "#10B981" }, // 14: Emerald
        { color: "#4338CA", bg: "#eef2ff", border: "#4338CA" }, // 15: Indigo
        { color: "#9D174D", bg: "#fdf2f8", border: "#9D174D" }, // 16: Dark Pink
        { color: "#047857", bg: "#ecfdf5", border: "#047857" }, // 17: Dark Emerald
    ];
    
    if (cat === "All" || !cat) return { color: "#111", bg: "#f3f3f7", border: "transparent" };
    
    // Make sure we have a stable deterministic color per category without repeating
    const knownCats = [
        "Fiction", "Non-Fiction", "Children's Books", "Poetry", 
        "Academic & Educational", "Comics & Graphic Novels", "Reference", 
        "Arts & Entertainment", "Lifestyle", "Sports & Outdoors", 
        "Regional & Language Literature", "Action & Adventure", "Mystery & Thriller", 
        "Business & Economics", "Biography & Memoir", "Health & Wellness", 
        "History", "Science & Technology"
    ];
    
    const idx = knownCats.indexOf(cat);
    
    if (idx !== -1) {
       return colors[idx % colors.length];
    }
    
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// ── Normalise both JSON files into one flat list ─────────────────────────────
export interface CatalogueBook {
  id: string;
  title: string;
  synopsis: string;
  mrp: number | null;
  mrpRaw: string;
  coverUrl: string;
  authorName: string;
  authorBio: string;
  authorPhotoUrl?: string;
  authorInstagram?: string;
  authorFacebook?: string;
  authorLinkedin?: string;
  authorYoutube?: string;
  authorWhatsapp?: string;
  authorQualification?: string;
  authorAge?: string;
  authorExperience?: string;
  authorSkills?: string;
  authorHobbies?: string;
  genre: string;
  subGenre: string;
  pages?: number | null;
  language?: string;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  edition?: string;
  format?: string;
  rating: number;
  reviewsCount: number;
  bundleRules?: { enabled: boolean; buyCount: number; discount: number }[];
  bundleRule?: { enabled: boolean; buyCount: number; discount: number };
}


// ── Custom Modern Dropdown ───────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, color = "#111", filled = false }: { value: string, onChange: (v: string) => void, options: {label: string, value: string}[], color?: string, filled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  
  const selectedLabel = options.find(o => o.value === value)?.label || value;
  
  return (
    <div ref={ref} style={{ position: "relative", minWidth: "220px", flexShrink: 0 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1.5rem", borderRadius: "50px", border: isOpen || filled ? `2px solid ${color}` : "2px solid #eaeaea", cursor: "pointer", background: filled ? color : "#fff", fontSize: 14, fontWeight: 700, color: filled ? (color === "#eab308" || color === "#FFD400" ? "#111" : "#fff") : "#111", gap: "1rem", transition: "all 0.2s ease" }}
      >
         <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
           {selectedLabel}
         </div>
         <ChevronRight size={16} style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s ease" }} color={filled ? (color === "#eab308" || color === "#FFD400" ? "#111" : "#fff") : (isOpen ? color : "#94a3b8")} />
      </div>
      
      {isOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.8rem", background: "#fff", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", border: "1px solid #eaeaea", padding: "0.6rem", zIndex: 50, maxHeight: "300px", overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
           <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
           {options.map(o => (
             <div 
               key={o.value} 
               onClick={() => { onChange(o.value); setIsOpen(false); }} 
               style={{ padding: "0.8rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: 14, fontWeight: value === o.value ? 800 : 600, color: value === o.value ? color : "#475569", background: value === o.value ? `${color}15` : "transparent", transition: "all 0.1s ease", marginBottom: "0.2rem" }} 
               onMouseEnter={e => { if(value !== o.value) e.currentTarget.style.background = "#f8f9fa"; }} 
               onMouseLeave={e => { if(value !== o.value) e.currentTarget.style.background = "transparent"; }}
             >
                {o.label}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

// ── PDF catalogue download ───────────────────────────────────────────────────
const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).html2pdf) return resolve((window as any).html2pdf);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};


export async function loadPdfLibs() {
  const loadScript = (src: string) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  if (!(window as any).jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  if (!(window as any).html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  return { jsPDF: (window as any).jspdf.jsPDF, html2canvas: (window as any).html2canvas };
}

export async function downloadCataloguePDF(label: string, books: CatalogueBook[], setDownloading: (val: any) => void, stats: any = {}, isPrintable: boolean = false, autoUpload: boolean = false, silentSave: boolean = false, isPublicFallback: boolean = false) {
  try {
    setDownloading(isPrintable ? "printable" : "standard");

    // Only reject blob:/data: URLs — they can't be rendered cross-origin by html2canvas.
    // All server-hosted relative/absolute URLs are accepted; broken images are handled
    // gracefully by the onerror attributes in the HTML template.
    const isRenderableUrl = (url: string) => {
        if (!url) return true; // empty = no image, still renderable (shows placeholder)
        if (url.startsWith('blob:') || url.startsWith('data:')) return false;
        return true;
    };

    const validBooks = books.filter(b => {
        if (b.authorPhotoUrl && !isRenderableUrl(b.authorPhotoUrl)) return false;
        if (b.id !== 'NO_BOOK' && b.coverUrl && !isRenderableUrl(b.coverUrl)) return false;
        return true;
    });

    const { jsPDF, html2canvas } = await loadPdfLibs();
    const bgColor = isPrintable ? '#f0f9ff' : '#0f172a';
    const textColor = isPrintable ? '#0f172a' : '#fff';
    const mutedColor = isPrintable ? '#334155' : '#e2e8f0';
    const highlightColor = isPrintable ? '#0284c7' : '#b44d28';
    const invertedFilter = isPrintable ? '' : '${invertedFilter}';

    
    // Group books by author
    const byAuthor: Record<string, { name: string; bio: string; photoUrl: string; instagram: string; facebook: string; linkedin: string; youtube: string; whatsapp: string; qualification?: string; age?: string; experience?: string; skills?: string; hobbies?: string; books: CatalogueBook[] }> = {};
    validBooks.forEach(b => {
      let safePhoto = b.authorPhotoUrl || "";
      if (safePhoto.startsWith('blob:') || safePhoto.startsWith('data:')) safePhoto = "";

      if (!byAuthor[b.authorName]) {
        byAuthor[b.authorName] = {
          name: b.authorName,
          bio: b.authorBio,
          photoUrl: safePhoto,
          instagram: b.authorInstagram || "",
          facebook: b.authorFacebook || "",
          linkedin: b.authorLinkedin || "",
          youtube: b.authorYoutube || "",
          whatsapp: b.authorWhatsapp || "",
          qualification: b.authorQualification,
          age: b.authorAge,
          experience: b.authorExperience,
          skills: b.authorSkills,
          hobbies: b.authorHobbies,
          books: []
        };
      }
      // ignore NO_BOOK stubs
      if (b.id !== 'NO_BOOK') {
        let bClone = { ...b };
        if (bClone.coverUrl && (bClone.coverUrl.startsWith('blob:') || bClone.coverUrl.startsWith('data:'))) {
          bClone.coverUrl = "";
        }
        byAuthor[bClone.authorName].books.push(bClone);
      }
    });
    
      let currentPage = 4; // Cover is page 1, Intro is page 2, Progress is page 3
      
      const sortedAuthors = Object.values(byAuthor).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const contentHtml = sortedAuthors.map((author, index) => {
        // Calculate age if it's a DOB
        let ageStr = author.age && author.age !== 'NA' ? String(author.age) : '—';
        if (ageStr.includes('-')) {
           const birthDate = new Date(ageStr);
           if (!isNaN(birthDate.getTime())) {
               const ageNum = new Date().getFullYear() - birthDate.getFullYear();
               ageStr = ageNum.toString();
           }
        }
  
        // Parse JSON for qualifications
        let qualStr = '—';
        if (author.qualification && author.qualification !== 'NA') {
           try {
              const parsed = JSON.parse(author.qualification);
              if (Array.isArray(parsed) && parsed.length > 0) {
                 qualStr = parsed.map((q: any) => {
                    let str = q.qualification || '';
                    if (q.subject) str += ` in ${q.subject}`;
                    if (q.institution) str += ` from ${q.institution}`;
                    if (q.mode) str += ` (${q.mode})`;
                    return str;
                 }).filter(Boolean).join('; ');
              } else {
                 qualStr = author.qualification;
              }
           } catch(e) { qualStr = author.qualification; }
        }
  
        // Parse JSON for skills
        let skillsStr = '—';
        if (author.skills && author.skills !== 'NA') {
           try {
              const parsed = JSON.parse(author.skills);
              if (Array.isArray(parsed) && parsed.length > 0) {
                 skillsStr = parsed.filter(Boolean).join(', ');
              } else {
                 skillsStr = author.skills;
              }
           } catch(e) { skillsStr = author.skills; }
        }
  
        // Parse JSON for hobbies
        let hobbiesStr = '—';
        if (author.hobbies && author.hobbies !== 'NA') {
           try {
              const parsed = JSON.parse(author.hobbies);
              if (Array.isArray(parsed) && parsed.length > 0) {
                 hobbiesStr = parsed.filter(Boolean).join(', ');
              } else {
                 hobbiesStr = author.hobbies;
              }
           } catch(e) { hobbiesStr = author.hobbies; }
        }
        
        const expStr = author.experience && author.experience !== 'NA' && author.experience !== '0' ? author.experience + ' Years' : '—';
  
        // Social links block
        const socials = [];
        if (author.whatsapp && author.whatsapp !== 'NA') socials.push(`<a href="https://wa.me/${author.whatsapp.replace(/\D/g,'')}" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; color: #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
          &#128222; WhatsApp
        </a>`);
        if (author.linkedin && author.linkedin !== 'NA') socials.push(`<a href="${author.linkedin.startsWith('http') ? author.linkedin : 'https://linkedin.com/in/'+author.linkedin}" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; color: #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
          &#128188; LinkedIn
        </a>`);
        if (author.youtube && author.youtube !== 'NA') socials.push(`<a href="${author.youtube.startsWith('http') ? author.youtube : 'https://youtube.com/'+author.youtube}" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; color: #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
          &#128250; YouTube
        </a>`);
        if (author.instagram && author.instagram !== 'NA') socials.push(`<a href="${author.instagram.startsWith('http') ? author.instagram : 'https://instagram.com/'+author.instagram}" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; color: #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
          &#128247; Instagram
        </a>`);
        if (author.facebook && author.facebook !== 'NA') socials.push(`<a href="${author.facebook.startsWith('http') ? author.facebook : 'https://facebook.com/'+author.facebook}" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; color: #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
          &#128101; Facebook
        </a>`);
        
        const socialHtml = socials.length > 0 ? `<div style="margin-top: 25px; font-size: 11px; display: flex; gap: 10px; flex-wrap: wrap;">${socials.join('')}</div>` : '';
  
        const authorPageHtml = `
           <div class="pdf-page" style="width: 802px; height: 1120px; position: relative; background: ${bgColor}; color: ${textColor}; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: 60px;">
             <div style="position: absolute; top: 40px; right: 40px;">
                <img src="${window.location.origin}/logo.webp" crossorigin="anonymous" style="height: 60px; ${invertedFilter}" />
             </div>
             
             <div style="position: absolute; right: -50px; top: -50px; font-size: 400px; color: rgba(255,255,255,0.03); font-family: 'Playfair Display', serif; font-weight: 900; line-height: 1; pointer-events: none;">${author.name.charAt(0)}</div>
             
             <div style="display: flex; gap: 50px; align-items: center; position: relative; z-index: 2;">
                 <div style="flex-shrink: 0; width: 220px; height: 220px; border-radius: 50%; border: 6px solid #b44d28; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); background: #1e293b;">
                   ${author.photoUrl ? `<img src="${author.photoUrl.startsWith('http') ? author.photoUrl : (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() + (author.photoUrl.startsWith('/') ? author.photoUrl : '/' + author.photoUrl)}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.opacity='0';" />` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 80px; color: #94a3b8; font-family: serif;">${author.name.charAt(0)}</div>`}
                 </div>
                 
                 <div style="flex: 1;">
                   <div style="display: inline-block; background: #b44d28; color: ${textColor}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; padding: 6px 14px; margin-bottom: 20px; font-weight: 800; font-family: system-ui, sans-serif;">Featured Author</div>
                   <h2 style="margin: 0 0 20px; font-size: 48px; color: ${textColor}; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; letter-spacing: -0.5px;">${author.name}</h2>
                   
                   <div style="margin: 0 0 20px; font-size: 13px; line-height: 1.8; color: #94a3b8; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                     ${qualStr !== '—' ? `<div style="margin-bottom: 6px;"><strong>Qual:</strong> <span style="color: #cbd5e1">${qualStr}</span></div>` : ''}
                     <div style="display: flex; gap: 20px; margin-bottom: 6px;">
                       ${ageStr !== '—' ? `<div><strong>Age:</strong> <span style="color: #cbd5e1">${ageStr}</span></div>` : ''}
                       ${expStr !== '—' ? `<div><strong>Exp:</strong> <span style="color: #cbd5e1">${expStr}</span></div>` : ''}
                     </div>
                     ${skillsStr !== '—' ? `<div style="margin-bottom: 6px;"><strong>Skills:</strong> <span style="color: #cbd5e1">${skillsStr}</span></div>` : ''}
                     ${hobbiesStr !== '—' ? `<div style="margin-bottom: 6px;"><strong>Hobbies:</strong> <span style="color: #cbd5e1">${hobbiesStr}</span></div>` : ''}
                   </div>
                 </div>
             </div>
             
             <div style="position: relative; z-index: 2; margin-top: 40px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="margin: 0; font-size: 16px; line-height: 1.9; color: ${mutedColor}; text-align: justify; font-style: italic;">${author.bio}</p>
                ${socialHtml}
             </div>
  
             <div style="position: absolute; bottom: 40px; right: 40px; font-size: 12px; color: rgba(255,255,255,0.5); font-family: system-ui, sans-serif;">Page ${currentPage++}</div>
           </div>
         `;
  
        const bookChunks = [];
        for (let i = 0; i < author.books.length; i += 2) {
           bookChunks.push(author.books.slice(i, i + 2));
        }
  
        const bookPagesHtml = bookChunks.map((chunk) => {
           const booksHtml = chunk.map((b, bIdx) => `
           <div style="display: flex; gap: 22px; padding-bottom: ${chunk.length > 1 && bIdx === 0 ? '22px' : '0'}; border-bottom: ${chunk.length > 1 && bIdx === 0 ? '1px solid #cbd5e1' : 'none'}; break-inside: avoid;">
             <div style="flex-shrink: 0; width: 155px;">
               ${b.coverUrl ? `<img src="${b.coverUrl.startsWith('http') ? b.coverUrl : (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() + (b.coverUrl.startsWith('/') ? b.coverUrl : '/' + b.coverUrl)}" crossorigin="anonymous" style="width: 100%; height: 240px; object-fit: cover; border-radius: 4px; box-shadow: 10px 10px 20px rgba(0,0,0,0.1); border: 1px solid #94a3b8;" onerror="this.style.opacity='0';" />` : `<div style="width: 100%; height: 240px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px dashed #94a3b8;"><span style="color:#64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">No Cover</span></div>`}
             </div>
             <div style="flex: 1; display: flex; flex-direction: column;">
               <div style="margin-bottom: 6px;">
                 <h3 style="margin: 0 0 2px; color: #0f172a; font-size: 18px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.2;">${b.title}</h3>
                 <p style="margin: 0; padding-top: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #0ea5e9; font-weight: 800; font-family: system-ui, sans-serif;">
                   ${b.genre} ${b.subGenre ? `<span style="color: #94a3b8; margin: 0 5px;">/</span> ${b.subGenre}` : ''}
                 </p>
               </div>
               <div style="flex: 1;">
                 <p style="margin: 0 0 8px; font-size: 11px; line-height: 1.4; color: #334155; text-align: justify;">${b.synopsis}</p>
               </div>
               <div style="background: #fff; padding: 10px 12px; border-top: 3px solid #0ea5e9; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                 <table style="width: 100%; font-size: 10.5px; color: #0f172a; border-collapse: collapse; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
                   <tr>
                     <td style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; width: 50%;"><strong>Price:</strong> <span style="color:#0ea5e9; font-weight: 800; font-size: 13px;">${b.mrp != null ? "₹" + b.mrp : b.mrpRaw || "—"}</span></td>
                     <td style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; width: 50%;"><strong>Pages:</strong> ${b.pages || "—"}</td>
                   </tr>
                   <tr>
                     <td style="padding: 4px 0; border-bottom: 1px solid #e2e8f0;"><strong>Language:</strong> ${b.language || "—"}</td>
                     <td style="padding: 4px 0; border-bottom: 1px solid #e2e8f0;"><strong>Format:</strong> ${b.format || "—"}</td>
                   </tr>
                   <tr>
                     <td style="padding: 4px 0;"><strong>Publisher:</strong> ${b.publisher || "—"}</td>
                     <td style="padding: 4px 0;"><strong>ISBN:</strong> <span style="font-family: monospace;">${b.isbn || "—"}</span></td>
                   </tr>
                 </table>
               </div>
             </div>
           </div>
           ` ).join("");
  
           return `
           <div class="pdf-page" style="width: 802px; height: 1120px; position: relative; background: #f0f9ff; color: #0f172a; box-sizing: border-box; padding: 45px 50px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start;">
              <!-- Branding Header -->
              <div style="position: absolute; top: 28px; right: 32px;">
                <img src="${window.location.origin}/logo.webp" crossorigin="anonymous" style="height: 48px;" />
              </div>
              
              <div style="margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; width: calc(100% - 110px);">
                <h4 style="margin: 0; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: 3px; font-size: 13px; font-weight: 800; color: #0f172a;">${author.name} &middot; Literary Portfolio</h4>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 25px;">
                 ${booksHtml}
              </div>
  
              <!-- Page Number -->
              <div style="position: absolute; bottom: 40px; right: 40px; font-size: 12px; color: #64748b; font-family: system-ui, sans-serif;">Page ${currentPage++}</div>
           </div>
           `;
        }).join('');
  
        return authorPageHtml + bookPagesHtml;
      }).join("");
  
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '802px';
      container.style.height = '1120px';
      container.style.overflow = 'hidden';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
  
      container.innerHTML = `
        <div id="pdf-content-wrapper" style="width: 802px; background: ${bgColor};">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&display=swap');
          </style>
          
          <!-- Magazine Cover Page -->
          <div class="pdf-page" style="position: relative; width: 802px; height: 1120px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; background: ${bgColor}; box-sizing: border-box;">
            <img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop" crossorigin="anonymous" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3; filter: grayscale(100%);" />
            <div style="position: relative; z-index: 10; padding: 80px; width: 80%; background: ${isPrintable ? 'rgba(186, 230, 253, 0.9)' : 'rgba(15, 23, 42, 0.85)'}; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); box-shadow: 0 30px 60px rgba(0,0,0,0.5); box-sizing: border-box;">
              <div style="margin-bottom: 40px;">
                <img src="${window.location.origin}/logo.webp" crossorigin="anonymous" style="height: 250px; ${invertedFilter} display: block; margin: 0 auto;" />
              </div>
              <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 6px; color: #b44d28; margin-bottom: 30px; font-weight: 800; font-family: system-ui, sans-serif;">Exclusive Collection</div>
              <h1 style="color: ${textColor}; font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 900; line-height: 1.1; margin: 0 0 20px; letter-spacing: -1px;">Pune Authors' Association</h1>
              <div style="width: 80px; height: 3px; background: #b44d28; margin: 30px auto;"></div>
              <h2 style="color: ${mutedColor}; margin: 0 0 40px; font-size: 32px; font-weight: 400; font-style: italic; font-family: 'Playfair Display', serif;">The ${label} Portfolio</h2>
              <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 4px; font-family: system-ui, sans-serif;">
                Volume &middot; ${new Date().toLocaleDateString("en-US", { month: 'long', year: 'numeric' })} &nbsp;|&nbsp; ${validBooks.length} Curated Title(s)
              </p>
              <p style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 2px; font-family: system-ui, sans-serif; margin-top: 15px;">
                Generated: ${(() => {
                  const d = new Date();
                  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
                })()} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <!-- Page Number -->
            <div style="position: absolute; bottom: 40px; right: 40px; font-size: 12px; color: rgba(255,255,255,0.5); font-family: system-ui, sans-serif; z-index: 10;">Page 1</div>
          </div>

          <!-- Introduction Page 1 -->
          <div class="pdf-page" style="width: 802px; height: 1120px; position: relative; background: ${bgColor}; color: ${mutedColor}; box-sizing: border-box; padding: 60px 80px; display: flex; flex-direction: column;">
            <div style="position: absolute; top: 40px; right: 40px;">
                <img src="${window.location.origin}/logo.webp" crossorigin="anonymous" style="height: 60px; ${invertedFilter}" />
            </div>
            <h2 style="margin: 40px 0 30px; font-size: 40px; color: ${textColor}; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; letter-spacing: -0.5px;">Introduction & Vision</h2>
            
            <div style="font-size: 15px; line-height: 1.8; font-family: system-ui, sans-serif; text-align: justify; display: flex; flex-direction: column; gap: 20px;">
              <div>
                <h3 style="margin: 0 0 15px 0; font-size: 26px; color: #b44d28; font-family: 'Playfair Display', serif;">Introduction</h3>
                <p style="margin: 0;">Pune Authors’ Association is an informal group of authors formed in Dec 2024 by Cdr (retd) Shiv Mathur. Most of the authors are from Pune, a few from Mumbai as well from other parts of India. Currently the group has approx. ${stats?.authors || 50} authors. There are ${stats?.books || 140} titles-books from these authors and the books cover a wide variety of genres.</p>
                <p style="margin: 10px 0 0 0;">The group maintains a catalogue of books of all the authors. A website is also under development and it is expected to be up by end July 26. This will allow readers to browse the books and even order them directly from the author. It will also allow any new author to join the group through an online joining process.</p>
              </div>
              
              <div>
                <h3 style="margin: 20px 0 15px 0; font-size: 26px; color: #b44d28; font-family: 'Playfair Display', serif;">Goals</h3>
                <p style="margin: 0 0 10px 0;">The main goals of the group are as follows:</p>
                <ul style="margin: 0 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 8px;">
                  <li>a) Promote and revive book reading as a habit. An effort to keep book reading alive.</li>
                  <li>b) Showcase the value of knowledge and creativity through books.</li>
                  <li>c) Provide an avenue in form of a literary activity within the housing societies, educational institutions, and organisations, taking them out of their digital world.</li>
                  <li>d) A literary activity at the door step, where residents can meet the authors live, interact with them, understand the background about the writing of that book.</li>
                  <li>e) Promote Indian Authors, Indian culture and literature.</li>
                  <li>f) They can also buy inked signed copies from the authors directly.</li>
                  <li>g) Help and guide those who are keen to write and publish a book.</li>
                </ul>
              </div>
            </div>
            
            <div style="position: absolute; bottom: 40px; right: 40px; font-size: 12px; color: rgba(255,255,255,0.5); font-family: system-ui, sans-serif;">Page 2</div>
          </div>

          <!-- Introduction Page 2 -->
          <div class="pdf-page" style="width: 802px; height: 1120px; position: relative; background: ${bgColor}; color: ${mutedColor}; box-sizing: border-box; padding: 60px 80px; display: flex; flex-direction: column;">
            <div style="position: absolute; top: 40px; right: 40px;">
                <img src="${window.location.origin}/logo.webp" crossorigin="anonymous" style="height: 60px; ${invertedFilter}" />
            </div>
            <h2 style="margin: 40px 0 30px; font-size: 40px; color: ${textColor}; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; letter-spacing: -0.5px;">Progress & Future</h2>
            
            <div style="font-size: 15px; line-height: 1.8; font-family: system-ui, sans-serif; text-align: justify; display: flex; flex-direction: column; gap: 20px;">
              <div>
                <h3 style="margin: 0 0 15px 0; font-size: 26px; color: #b44d28; font-family: 'Playfair Display', serif;">Achievements</h3>
                <ul style="margin: 0 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 8px;">
                  <li>a) Since inception the group has organised nearly ${stats?.events || 34} Literary Events in housing societies, educational institutions and corporate offices. Prominent places are like NOFRA Mumbai, AFMC, Tata Motors, HCL technologies, Persistent Systems, a few prominent housing societies, etc.</li>
                  <li>b) The group has helped setup Flybraries at six of the prominent airports in India and donated till date ${stats?.totalDonatedBooks || 1600} copies of books to the airport Flybraries. They are Pune, Chennai, Kolkata, Mangalore, Thiruvananthapuram, & Bhubaneshwar airports.</li>
                  <li>c) The group also takes part in Book Festivals organised by the National Book Trust of India.</li>
                </ul>
              </div>
              
              <div>
                <h3 style="margin: 20px 0 15px 0; font-size: 26px; color: #b44d28; font-family: 'Playfair Display', serif;">Way Ahead</h3>
                <ul style="margin: 0 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 8px;">
                  <li>a) Some of the forthcoming events are at Goa University, Naval Base – Visakhapatnam.</li>
                  <li>b) The aim is to reach every corner of India.</li>
                </ul>
              </div>
            </div>
            
            <div style="position: absolute; bottom: 40px; right: 40px; font-size: 12px; color: rgba(255,255,255,0.5); font-family: system-ui, sans-serif;">Page 3</div>
          </div>
          
          ${contentHtml}
        </div>
      `;

    // Wait a brief moment to ensure browser has rendered DOM
    await new Promise(r => setTimeout(r, 500));

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = container.querySelectorAll('.pdf-page');
    
    // Hide all pages initially to speed up html2canvas DOM parsing and reset Y-coordinates
    for (let i = 0; i < pages.length; i++) {
        (pages[i] as HTMLElement).style.display = 'none';
    }
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        page.style.display = 'flex'; // show only this page during capture
        
        const canvas = await html2canvas(page, { 
            scale: 1.5, 
            useCORS: true, 
            logging: false,
            backgroundColor: bgColor,
            width: 802,
            height: 1120,
            windowWidth: 802,
            windowHeight: 1120
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.80);
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        page.style.display = 'none'; // hide it again
    }

    if (autoUpload) {
      const blob = pdf.output('blob');
      const formData = new FormData();
      formData.append('pdf', blob, `PAA_Catalogue.pdf`);
      
      const axios = (await import('axios')).default;
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const endpoint = isPublicFallback ? `${API}/api/public/catalogue-pdf` : `${API}/api/admin/catalogue-pdf`;
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'multipart/form-data' };
      if (token && !isPublicFallback) headers['Authorization'] = `Bearer ${token}`;

      await axios.post(endpoint, formData, { headers }).catch(console.error);
      
      // Save locally only if not silent
      if (!silentSave) pdf.save(`PAA_${label.replace(/s+/g, '_')}_Catalogue.pdf`);
    } else {
      if (!silentSave) pdf.save(`PAA_${label.replace(/s+/g, '_')}_Catalogue.pdf`);
    }
    
    document.body.removeChild(container);
    setDownloading(null);
  } catch (err) {
    console.error("PDF Generation failed", err);
    setDownloading(null);
    alert("Failed to generate PDF. Please try again.");
  }
}

const categoryImages: Record<string, string> = {
  "Fiction": "/categories/cat_fiction.png",
  "Non-Fiction": "/categories/cat_nonfiction.png",
  "Children's Books": "/categories/cat_children.png",
  "Poetry": "/categories/cat_poetry.png",
  "Academic & Educational": "/categories/cat_academic.png",
  "Arts & Entertainment": "/categories/cat_arts.png",
  "Comics & Graphic Novels": "/categories/cat_comics.png",
  "Sports & Outdoors": "/categories/cat_sports.png",
  "Reference": "/categories/cat_reference.png",
  "Lifestyle": "/categories/cat_lifestyle.png",
  "Regional & Language Literature": "/categories/cat_regional.png"
};
const getCatImg = (c: string) => categoryImages[c] || "/categories/cat_fiction.png";

// ── Component ────────────────────────────────────────────────────────────────
export function CataloguePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("category") || "All";
  });
  const [activeSubcategory, setActiveSubcategory] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("subcategory") || "All";
  });
  const [activeSubSubcategory, setActiveSubSubcategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "title">("default");
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('checkout_cart');
      return saved ? JSON.parse(saved).map(String) : [];
    } catch { return []; }
  });

  const [downloadingType, setDownloadingType] = useState<"standard" | "printable" | null>(null);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [bulkSelectionMode, setBulkSelectionMode] = useState<boolean>(false);
  const [selectedBooksForBulk, setSelectedBooksForBulk] = useState<any[]>([]);
  const [selectedBooksForCatalogue, setSelectedBooksForCatalogue] = useState<string[]>([]);
  const [hoveredButton, setHoveredButton] = useState<'bulk' | 'catalogue' | null>(null);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [formatFilter, setFormatFilter] = useState<string>("All");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [allBooks, setAllBooks] = useState<CatalogueBook[]>(() => {
    const w = window as any;
    return w.__apiCache?.catalogueBooks || [];
  });
  const [publicStats, setPublicStats] = useState<any>(() => {
    const w = window as any;
    return w.__apiCache?.publicStats || {};
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category");
    if (cat) setActiveCategory(cat);
    
    const subCat = params.get("subcategory");
    if (subCat) setActiveSubcategory(subCat);
    
    const search = params.get("search");
    if (search !== null) setSearchQuery(search);
  }, [location.search]);

  useEffect(() => {
    const w = window as any;
    w.__apiCache = w.__apiCache || {};
    
    if (w.__apiCache.publicStats) {
      setPublicStats(w.__apiCache.publicStats);
      return;
    }

    fetch((import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() + '/api/public-stats')
      .then(r => r.json())
      .then(data => {
        w.__apiCache.publicStats = data;
        setPublicStats(data);
      })
      .catch(e => console.error(e));
  }, []);

  const [isLoading, setIsLoading] = useState(() => {
    const w = window as any;
    return !(w.__apiCache && w.__apiCache.catalogueBooks && w.__apiCache.publicStats);
  });
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    const handleCartUpdate = () => {
      try {
        const saved = localStorage.getItem('checkout_cart');
        if (saved) setCart(JSON.parse(saved).map(String));
      } catch (e) {}
    };
    window.addEventListener('cart_updated', handleCartUpdate);
    // Also listen to storage events if updated in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === 'checkout_cart') handleCartUpdate();
    });
    window.addEventListener('pageshow', handleCartUpdate);
    window.addEventListener('focus', handleCartUpdate);
    return () => {
      window.removeEventListener('cart_updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
      window.removeEventListener('pageshow', handleCartUpdate);
      window.removeEventListener('focus', handleCartUpdate);
    };
  }, []);

  useEffect(() => {
    const w = window as any;
    w.__apiCache = w.__apiCache || {};
    
    if (w.__apiCache.catalogueBooks) {
      setAllBooks(w.__apiCache.catalogueBooks);
    }

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/books`)
      .then(res => res.json())
      .then(data => {
        const mapped: CatalogueBook[] = data.map((b: any) => ({
          id: b.id.toString(),
          title: b.title,
          synopsis: b.synopsis || "",
          mrp: b.mrp,
          mrpRaw: b.mrp?.toString(),
          coverUrl: b.coverUrl?.startsWith("/uploads") ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.coverUrl}` : (b.coverUrl || ""),
          authorName: b.author?.name || "Unknown",
          authorBio: b.author?.bio || "",
          authorPhotoUrl: b.author?.photoUrl || "",
          authorInstagram: b.author?.instagram || "",
          authorFacebook: b.author?.facebook || "",
          authorLinkedin: (typeof b.author?.extraData === 'string' ? JSON.parse(b.author.extraData || "{}") : b.author?.extraData || {}).linkedin || "",
          authorYoutube: (typeof b.author?.extraData === 'string' ? JSON.parse(b.author.extraData || "{}") : b.author?.extraData || {}).youtube || "",
          authorWhatsapp: b.author?.whatsapp || "",
          authorQualification: b.author?.qualification || "",
          authorAge: b.author?.age || "",
          authorExperience: b.author?.experience || "",
          authorSkills: b.author?.skills || "",
          authorHobbies: b.author?.hobbies || "",
          genre: b.genre || "Unknown",
          subGenre: b.subGenre || "",
          pages: b.pages || null,
          language: b.language || "",
          isbn: b.isbn || "",
          publisher: b.publisher || "",
          publicationDate: b.publicationDate || "",
          edition: b.edition || "",
          format: b.format || "",
          rating: b.reviews && b.reviews.length > 0 ? b.reviews.reduce((acc, r) => acc + r.rating, 0) / b.reviews.length : 0,
          reviewsCount: b.reviews ? b.reviews.length : 0,
          bundleRules: b.author?.extraData?.bundleRules || [],
          bundleRule: b.author?.extraData?.bundleRule || undefined
        }));
        w.__apiCache.catalogueBooks = mapped;
        setAllBooks(mapped);
        setCart(prev => prev.filter(id => mapped.some(b => b.id === id)));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setActiveSubcategory("All");
    setActiveSubSubcategory("All");
  };

  const handleSubcategoryChange = (sc: string) => {
    setActiveSubcategory(sc);
    setActiveSubSubcategory("All");
  };

  const filteredBooks = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const authorsParam = params.get('authors');
    let baseAllBooks = allBooks;
    if (authorsParam) {
        const ids = authorsParam.split(',').map(Number);
        baseAllBooks = allBooks.filter((b: any) => ids.includes(b.authorId));
    }
        let list = baseAllBooks;

    const langParam = params.get('language');
    if (langParam) {
      list = list.filter((b) => (b.language || "").toLowerCase() === langParam.toLowerCase());
    }

    if (activeCategory !== "All") {
      // If language param is present, maybe don't enforce category filter unless explicitly requested?
      // Since clicking language takes us to /catalogue?language=X, activeCategory will be "All" initially!
      // So this is perfectly fine.
      list = list.filter((b) => b.genre === activeCategory);
    }

    if (activeSubcategory !== "All") {
      list = list.filter((b) => {
        if (!b.subGenre) return false;
        const parts = b.subGenre.split(" > ").map(s => s.trim());
        return parts[0] === activeSubcategory;
      });
    }

    if (activeSubSubcategory !== "All") {
      list = list.filter((b) => {
        if (!b.subGenre) return false;
        const parts = b.subGenre.split(" > ").map(s => s.trim());
        return parts.length > 1 && parts[1] === activeSubSubcategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.authorName.toLowerCase().includes(q) ||
          b.synopsis.toLowerCase().includes(q) ||
          (b.language || "").toLowerCase().includes(q)
      );
    }
    
    if (minPrice !== '') {
      list = list.filter(b => b.mrp !== null && b.mrp >= minPrice);
    }
    if (maxPrice !== '') {
      list = list.filter(b => b.mrp !== null && b.mrp <= maxPrice);
    }
    if (formatFilter !== "All") {
      list = list.filter(b => b.format === formatFilter);
    }
    if (ratingFilter > 0) {
       list = list.filter(b => b.rating >= ratingFilter);
    }

    if (sortBy === "price_asc") list.sort((a, b) => (a.mrp ?? 0) - (b.mrp ?? 0));
    else if (sortBy === "price_desc") list.sort((a, b) => (b.mrp ?? 0) - (a.mrp ?? 0));
    else if (sortBy === "title") list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  }, [activeCategory, activeSubcategory, activeSubSubcategory, searchQuery, sortBy, allBooks, minPrice, maxPrice, formatFilter, ratingFilter]);

  const addToCart = (id: string) => {
    setCart((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      
      // Update local storage synchronously before dispatching event to prevent BFCache/Listener race conditions
      localStorage.setItem('checkout_cart', JSON.stringify(next));

      if (prev.includes(id)) {
         try {
           const qs = JSON.parse(localStorage.getItem('checkout_quantities') || '{}');
           delete qs[id];
           localStorage.setItem('checkout_quantities', JSON.stringify(qs));
         } catch {}
      } else {
         try {
           const qs = JSON.parse(localStorage.getItem('checkout_quantities') || '{}');
           qs[id] = 1;
           localStorage.setItem('checkout_quantities', JSON.stringify(qs));
         } catch {}
      }
      return next;
    });
    // Use setTimeout to ensure React state batches properly before event fires
    setTimeout(() => window.dispatchEvent(new Event('cart_updated')), 0);
  };

  const parsedQs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('checkout_quantities') || '{}'); } catch { return {}; }
  }, [cart]);

  const totalItems = cart.reduce((acc, id) => acc + (parsedQs[id] || 1), 0);
  const cartTotal = cart.reduce((acc, id) => {
    const book = allBooks.find((b) => b.id === id);
    return acc + (book?.mrp || 0) * (parsedQs[id] || 1);
  }, 0);

  const genreLabel = (g: string) => g || "Unknown";
  const genreColor = (g: string) => getCategoryColor(g);

  const handleDownloadPublicCatalogue = async () => {
    const pdfUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/uploads/catalogue.pdf` : 'http://localhost:3001/uploads/catalogue.pdf';
    try {
      const res = await fetch(pdfUrl, { method: 'HEAD' });
      if (res.ok) {
        window.open(pdfUrl, '_blank');
      } else {
        toast.error("Catalogue is currently being prepared by the admin. Please try again later.", { duration: 4000 });
      }
    } catch (err) {
      toast.error("Catalogue is currently being prepared by the admin. Please try again later.", { duration: 4000 });
    }
  };

  const activeCategoryDisplay = activeCategory === "Regional & Language Literature" ? "Regional Literature" : activeCategory;

  return (
    <main className="bg-premium-pattern" style={{ fontFamily: "'Google Sans', sans-serif", minHeight: "100vh", backgroundColor: "#f8f9fa", color: "#111", overflowX: "hidden" }}>
      {/* Google Font Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');
        .skeleton-pulse { animation: pulse 1.5s infinite ease-in-out; }
        .book-card-premium:hover .book-cover-img { transform: scale(1.05); }
        h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', serif !important; }
        .google-sans-title { font-family: 'Google Sans', sans-serif !important; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        
        .bg-premium-pattern {
          background-color: #f8f9fa;
          background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        @media (max-width: 768px) {
          .catalogue-actions-container {
            align-items: stretch !important;
            width: 100% !important;
          }
          .catalogue-actions-container button {
            width: 100% !important;
            justify-content: center !important;
            font-size: 13px !important;
            padding: 0.8rem 1rem !important;
          }
          .category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.6rem !important;
          }
          .category-card {
            flex-direction: column !important;
            text-align: center !important;
            padding: 0.6rem !important;
            gap: 0.4rem !important;
          }
          .category-card .google-sans-title {
            font-size: 0.9rem !important;
          }
          .book-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
            padding: 1rem 0 3rem !important;
          }
          .book-card-premium {
            padding: 0.5rem !important;
            border-radius: 12px !important;
          }
          .book-card-premium h3 {
            font-size: 0.95rem !important;
            line-height: 1.1 !important;
            margin-bottom: 0.2rem !important;
          }
          .book-cover-container {
            height: 170px !important;
            margin-bottom: 0.4rem !important;
          }
          .book-cover-img {
            height: 100% !important;
          }
          .book-genre-block {
             margin-bottom: 0.4rem !important;
          }
          .book-genre-block > div:first-child {
             font-size: 8px !important;
             padding: 0.2rem 0.4rem !important;
          }
          .book-genre-block > div:last-child {
             font-size: 10px !important;
          }
          .book-genre-block svg {
             width: 10px !important;
             height: 10px !important;
          }
          .book-author-block {
             margin-bottom: 0.4rem !important;
          }
          .book-author-block span {
             font-size: 11px !important;
             font-weight: 500 !important;
          }
          .book-author-block img, .book-author-block > div:first-child {
             width: 16px !important;
             height: 16px !important;
             font-size: 8px !important;
          }
          .price-val {
             font-size: 1.1rem !important;
          }
          .price-label {
             font-size: 8px !important;
          }
          .book-card-premium button {
             padding: 0.4rem 0.5rem !important;
             font-size: 11px !important;
             width: 100% !important;
             border-radius: 8px !important;
          }
          .bottom-row {
             flex-direction: column !important;
             align-items: stretch !important;
             gap: 0.5rem !important;
          }
          .bottom-row > div {
             width: 100% !important;
          }
          .bottom-row > div:first-child {
             align-items: center !important;
             text-align: center !important;
          }
          .search-filters-container > * {
            flex: 1 1 100% !important;
            min-width: 0 !important;
          }
          .search-filters-container input {
            padding: 0.6rem 2.5rem !important;
            font-size: 13px !important;
          }
          .filter-btn-mobile {
             padding: 0.6rem 1rem !important;
             font-size: 12px !important;
             width: 100% !important;
             justify-content: center !important;
          }
          .catalogue-floating-checkout {
            left: 0.5rem !important;
            right: 0.5rem !important;
            bottom: 0.5rem !important;
            flex-direction: row !important;
            gap: 0.5rem !important;
            padding: 0.5rem 1rem !important;
            border-radius: 50px !important;
            align-items: center !important;
            width: auto !important;
            justify-content: space-between !important;
          }
          .catalogue-floating-checkout-text {
             text-align: left !important;
             font-size: 0.9rem !important;
          }
          .catalogue-floating-checkout-text > div:first-child {
             font-size: 12px !important;
          }
          .catalogue-floating-checkout-text > div:last-child {
             font-size: 11px !important;
          }
          .catalogue-floating-checkout button {
             width: auto !important;
             padding: 0.4rem 0.8rem !important;
             font-size: 0.75rem !important;
             border-radius: 50px !important;
          }
          .category-header-title {
             font-size: 1.5rem !important;
          }
        }
      `}</style>
      
      {/* ════════════════════════════════════════════
          CATALOGUE HEADER & HERO (BRIGHT)
      ════════════════════════════════════════════ */}
      <section style={{ position: "relative", padding: "11.5rem 2rem 4rem", zIndex: 30 }}>
        
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div className="catalogue-header-wrapper" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "2rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, minWidth: "300px", maxWidth: 650 }}>
              <h1 style={{ 
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2rem, 5vw, 4.5rem)",
                fontWeight: 800,
                color: "#1e293b",
                lineHeight: 1.1,
                marginBottom: "1rem",
                letterSpacing: "-0.02em"
              }}>
                Browse & Buy Books
              </h1>
              <p style={{ 
                fontSize: 18, 
                color: "#64748b", 
                margin: 0, 
                fontWeight: 600,
                fontStyle: "italic",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f16522" }}></span>
                Click on the Genre of your choice and check out the collection
              </p>
            </div>

            <div className="catalogue-actions-container" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", alignItems: "flex-end", flexShrink: 0 }}>
              <button 
                onClick={() => {
                  if (activeCategory === "All") {
                    handleDownloadPublicCatalogue();
                  } else {
                    downloadCataloguePDF(activeCategory, filteredBooks, setDownloadingType, publicStats, false);
                  }
                }}
                disabled={downloadingType !== null}
                style={{
                  display: "flex", alignItems: "center", gap: "0.8rem",
                  padding: "1rem 2.5rem", borderRadius: "50px",
                  background: downloadingType === "standard" ? "#eee" : "#1e40af", 
                  color: downloadingType === "standard" ? "#888" : "#fff",
                  fontWeight: 800, fontSize: 15,
                  textTransform: "uppercase", letterSpacing: "0.02em",
                  border: "none",
                  cursor: downloadingType !== null ? "not-allowed" : "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 8px 20px rgba(30,64,175,0.4)",
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = "translateY(-2px)"; 
                  e.currentTarget.style.filter = "brightness(1.1)";
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = "translateY(0)"; 
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                {downloadingType === 'standard' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                {downloadingType === 'standard' ? "Generating..." : `Download ${activeCategory === "All" ? "Complete" : activeCategoryDisplay} Catalogue`}
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setBulkSelectionMode(!bulkSelectionMode);
                    if (bulkSelectionMode) setSelectedBooksForBulk([]);
                    if (!bulkSelectionMode) { setSelectionMode(false); setSelectedBooksForCatalogue([]); }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.8rem",
                    padding: "0.8rem 2rem", borderRadius: "50px",
                    background: bulkSelectionMode ? "#1d4ed8" : "#2563eb",
                    color: "#fff",
                    fontWeight: 700, fontSize: 14,
                    textTransform: "uppercase", letterSpacing: "0.02em",
                    border: bulkSelectionMode ? "2px solid #1e40af" : "2px solid #2563eb",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(37,99,235,0.3)"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; setHoveredButton('bulk'); }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; setHoveredButton(null); }}
                >
                  <ShoppingCart size={16} />
                  {bulkSelectionMode ? "Cancel Bulk Order" : "Raise Bulk Order"}
                </button>
                {hoveredButton === 'bulk' && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "0.8rem",
                    background: "rgba(15, 23, 42, 0.95)",
                    color: "#fff",
                    padding: "0.7rem 1.2rem",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: "1.4",
                    width: "260px",
                    textAlign: "center",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    zIndex: 100,
                    pointerEvents: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "-4px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: "8px",
                      height: "8px",
                      background: "rgba(15, 23, 42, 0.95)",
                      borderLeft: "1px solid rgba(255,255,255,0.08)",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }} />
                    Select multiple books to place a bulk book order and proceed to checkout.
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    if (selectionMode) setSelectedBooksForCatalogue([]);
                    if (!selectionMode) { setBulkSelectionMode(false); setSelectedBooksForBulk([]); }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.8rem",
                    padding: "0.6rem 1.5rem", borderRadius: "50px",
                    background: selectionMode ? "#2563eb" : "#3b82f6",
                    color: "#fff",
                    fontWeight: 700, fontSize: 13,
                    textTransform: "uppercase", letterSpacing: "0.02em",
                    border: selectionMode ? "2px solid #1d4ed8" : "2px solid #3b82f6",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(59,130,246,0.3)"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; setHoveredButton('catalogue'); }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; setHoveredButton(null); }}
                >
                  <BookOpen size={16} />
                  {selectionMode ? "Cancel Selection" : "Create Custom Catalogue"}
                </button>
                {hoveredButton === 'catalogue' && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "0.8rem",
                    background: "rgba(15, 23, 42, 0.95)",
                    color: "#fff",
                    padding: "0.7rem 1.2rem",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: "1.4",
                    width: "260px",
                    textAlign: "center",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    zIndex: 100,
                    pointerEvents: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "-4px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: "8px",
                      height: "8px",
                      background: "rgba(15, 23, 42, 0.95)",
                      borderLeft: "1px solid rgba(255,255,255,0.08)",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }} />
                    Select multiple books to generate and download a customized PDF catalogue.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ position: "relative", padding: "0 2rem", marginTop: "-40px", zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* ════════════════════════════════════════════
              CATEGORY SELECTOR
          ════════════════════════════════════════════ */}
          {activeCategory === "All" ? (
            <div className="category-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.8rem", paddingBottom: "4rem" }}>
              {(Object.keys(bookCategories).filter(cat => allBooks.some(b => b.genre === cat))).map((cat, idx) => {
                const catBooksCount = allBooks.filter(b => b.genre === cat).length;
                
                const c = getCategoryColor(cat);
                const textColor = c.color === "#eab308" || c.color === "#FFD400" ? "#111" : "#fff";
                const displayName = cat === "Regional & Language Literature" ? "Regional Literature" : cat;

                return (
                  <div
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className="category-card"
                    style={{
                      background: c.color,
                      borderRadius: "16px",
                      padding: "0.7rem 0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                      minHeight: "65px",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      border: "none",
                      boxShadow: `0 4px 15px ${c.color}33`
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 30px ${c.color}44`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "none";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 15px ${c.color}33`;
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: "10px", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                      <img src={getCatImg(cat)} alt={cat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="google-sans-title" style={{ margin: 0, color: textColor, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.15 }}>{displayName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "24px", padding: "1.5rem 2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <button 
                  className="filter-btn-mobile"
                  onClick={() => {
                    handleCategoryChange("All");
                    setSearchQuery("");
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.8rem 1.5rem", background: "#f5f5f5", color: "#111",
                    borderRadius: "50px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                    border: "none", cursor: "pointer", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#e5e5e5"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f5f5f5"; }}
                >
                  <ChevronLeft size={16} /> All Categories
                </button>
                <h2 className="category-header-title" style={{ fontSize: "2rem", fontWeight: 900, margin: 0, color: getCategoryColor(activeCategory).color }}>{activeCategoryDisplay}</h2>
              </div>

              {/* Subcategories & Filters */}
              <div className="search-filters-container" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #eaeaea", paddingTop: "1.5rem" }}>
                {Object.keys(bookCategories[activeCategory as keyof typeof bookCategories] || {}).length > 0 && (
                  <>
                    <CustomSelect
                      value={activeSubcategory}
                      onChange={handleSubcategoryChange}
                      options={[
                        { label: "All Subcategories", value: "All" },
                        ...["All", ...Object.keys(bookCategories[activeCategory as keyof typeof bookCategories] || {}).filter(sc => allBooks.some(b => b.genre === activeCategory && b.subGenre && b.subGenre.split(" > ")[0].trim() === sc))].filter(sc => sc !== "All").map(sc => ({ label: sc, value: sc }))
                      ]}
                      color={getCategoryColor(activeCategory).color} filled={true}
                    />

                    {activeSubcategory !== "All" && ((bookCategories[activeCategory as keyof typeof bookCategories] as any)[activeSubcategory] || []).length > 0 && (
                      <CustomSelect
                        value={activeSubSubcategory}
                        onChange={setActiveSubSubcategory}
                        options={[
                          { label: "All Specific Genres", value: "All" },
                          ...["All", ...((bookCategories[activeCategory as keyof typeof bookCategories] as any)[activeSubcategory] || []).filter((ssc: string) => allBooks.some(b => b.genre === activeCategory && b.subGenre && b.subGenre.split(" > ")[0].trim() === activeSubcategory && b.subGenre.split(" > ")[1]?.trim() === ssc))].filter(ssc => ssc !== "All").map(ssc => ({ label: ssc, value: ssc }))
                        ]}
                        color={getCategoryColor(activeCategory).color} filled={true}
                      />
                    )}
                  </>
                )}

                <div style={{ flex: 1, minWidth: 250, position: "relative" }}>
                  <Search size={18} color="#888" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    placeholder="Search by title, author or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "0.8rem 3rem", border: "2px solid #eaeaea", borderRadius: "50px", outline: "none", fontSize: 14, fontWeight: 600, boxSizing: "border-box" }}
                    onFocus={e => e.currentTarget.style.borderColor = getCategoryColor(activeCategory).color}
                    onBlur={e => e.currentTarget.style.borderColor = "#eaeaea"}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={16} color="#888" />
                    </button>
                  )}
                </div>

                <button 
                  className="filter-btn-mobile"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.8rem 1.5rem", borderRadius: "50px", border: showFilters ? `2px solid ${getCategoryColor(activeCategory).color}` : "2px solid #eaeaea", background: showFilters ? getCategoryColor(activeCategory).color : "#fff", color: showFilters ? "#fff" : "#111", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <SlidersHorizontal size={16} /> Filters
                </button>
                
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  options={[
                    { label: "Sort: Recommended", value: "default" },
                    { label: "A → Z", value: "title" },
                    { label: "Price: Low → High", value: "price_asc" },
                    { label: "Price: High → Low", value: "price_desc" }
                  ]}
                  color={getCategoryColor(activeCategory).color}
                />
              </div>

              {/* Advanced Filters Drawer */}
              {showFilters && (
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", padding: "1.5rem", background: "#f8f9fa", borderRadius: "16px", border: "1px solid #eaeaea", marginTop: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>
                      <span>Max Price</span>
                      <span style={{ color: getCategoryColor(activeCategory).color }}>{maxPrice === '' || maxPrice >= 2000 ? 'Any Price' : `Under ₹${maxPrice}`}</span>
                    </div>
                    <input type="range" min="0" max="2000" step="50" value={maxPrice === '' ? 2000 : maxPrice} onChange={e => setMaxPrice(Number(e.target.value) === 2000 ? '' : Number(e.target.value))} style={{ width: "100%", accentColor: getCategoryColor(activeCategory).color }} />
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>Format</span>
                    <CustomSelect 
                      value={formatFilter} 
                      onChange={setFormatFilter} 
                      options={[
                        { label: "All Formats", value: "All" },
                        { label: "Paperback", value: "Paperback" },
                        { label: "Hardcover", value: "Hardcover" },
                        { label: "Ebook", value: "Ebook" }
                      ]}
                      color={getCategoryColor(activeCategory).color}
                    />
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>Rating</span>
                    <CustomSelect 
                      value={ratingFilter.toString()} 
                      onChange={(val) => setRatingFilter(Number(val))} 
                      options={[
                        { label: "Any Rating", value: "0" },
                        { label: "4+ Stars", value: "4" },
                        { label: "3+ Stars", value: "3" }
                      ]}
                      color={getCategoryColor(activeCategory).color}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════
              BOOK RESULTS GRID
          ════════════════════════════════════════════ */}
          {activeCategory !== "All" && (
            <>
              {isLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "2rem", padding: "2rem 0 6rem" }}>
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} style={{ background: "#fff", borderRadius: "24px", padding: "1.2rem", height: 380, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
                      <div style={{ width: "100%", flex: 1, background: "#f5f5f5", borderRadius: "12px", marginBottom: "1rem" }} className="skeleton-pulse"></div>
                      <div style={{ height: 20, width: "80%", background: "#f5f5f5", borderRadius: 4, marginBottom: "0.5rem" }} className="skeleton-pulse"></div>
                      <div style={{ height: 16, width: "60%", background: "#f5f5f5", borderRadius: 4 }} className="skeleton-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : filteredBooks.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8rem 2rem", background: "#fff", borderRadius: "30px", border: `2px dashed ${getCategoryColor(activeCategory).color}40`, marginBottom: "6rem" }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${getCategoryColor(activeCategory).color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <Search size={48} color={getCategoryColor(activeCategory).color} />
                  </div>
                  <h3 style={{ fontSize: "2rem", fontWeight: 900, color: "#1e293b", marginBottom: "0.8rem", fontFamily: "'Playfair Display', serif" }}>No books found</h3>
                  <p style={{ color: "#64748b", fontSize: 16, fontWeight: 500, marginBottom: "2.5rem", maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>We couldn't find any titles matching your current filters. Try adjusting your search criteria.</p>
                  <button 
                    onClick={() => { setSearchQuery(""); setMaxPrice(''); setFormatFilter("All"); setRatingFilter(0); setActiveSubcategory("All"); setActiveSubSubcategory("All"); }} 
                    style={{ padding: "1.2rem 3rem", background: getCategoryColor(activeCategory).color, color: "#fff", borderRadius: "50px", fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", border: "none", cursor: "pointer", transition: "all 0.3s ease", boxShadow: `0 10px 25px ${getCategoryColor(activeCategory).color}40` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.filter = "brightness(1)"; }}
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "2rem", padding: "2rem 0 6rem", alignItems: "stretch" }}>
                  {filteredBooks.map((book) => {
                    const inCart = cart.includes(book.id);
                    const isSelected = selectedBooksForCatalogue.includes(book.id);
                    const isBulkSelected = !!selectedBooksForBulk.find(b => b.id === book.id);
                    return (
                      <div key={book.id} style={{ height: "100%", background: "#fff", borderRadius: "24px", padding: "1.2rem", border: "1px solid", borderColor: (selectionMode && isSelected) || (bulkSelectionMode && isBulkSelected) ? getCategoryColor(activeCategory).color : "#eaeaea", display: "flex", flexDirection: "column", transition: "all 0.2s ease", position: "relative" }} className="book-card-premium" onMouseEnter={e => { if(!selectionMode && !bulkSelectionMode) { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 15px 30px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = getCategoryColor(activeCategory).color; } }} onMouseLeave={e => { if(!selectionMode && !bulkSelectionMode) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#eaeaea"; } }}>
                        
                        {(selectionMode || bulkSelectionMode) && (
                          <div 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (bulkSelectionMode) {
                                if (isBulkSelected) {
                                  setSelectedBooksForBulk(prev => prev.filter(b => b.id !== book.id));
                                } else {
                                  setSelectedBooksForBulk(prev => [...prev, book]);
                                }
                              } else {
                                setSelectedBooksForCatalogue(prev => 
                                  prev.includes(book.id) ? prev.filter(id => id !== book.id) : [...prev, book.id]
                                );
                              }
                            }}
                            style={{
                              position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10, cursor: "pointer",
                              background: (isSelected || isBulkSelected) ? "rgba(2, 132, 199, 0.05)" : "transparent",
                              borderRadius: "24px", transition: "all 0.2s",
                              display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "1rem"
                            }}
                          >
                            {(isSelected || isBulkSelected) ? (
                              <CheckCircle2 size={28} color={getCategoryColor(activeCategory).color} fill="#fff" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
                            ) : (
                              <Circle size={28} color="#cbd5e1" fill="#fff" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))", opacity: 0.8 }} />
                            )}
                          </div>
                        )}

                        <Link to={`/book/${book.id}`} style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column" }}>
                          <div className="book-cover-container" style={{ width: "100%", height: "260px", borderRadius: "12px", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", overflow: "hidden" }}>
                            <img 
                               src={book.coverUrl || getCatImg(activeCategory === "All" ? book.genre : activeCategory)} 
                               alt={book.title} 
                               onError={(e) => { e.currentTarget.src = getCatImg(activeCategory === "All" ? book.genre : activeCategory); }}
                               style={{ height: "90%", width: "auto", aspectRatio: "3/4", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 20px rgba(0,0,0,0.08)", transition: "transform 0.5s" }} 
                               className="book-cover-img" 
                            />
                          </div>
                          
                          <div className="book-genre-block" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                             <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: getCategoryColor(activeCategory).color, background: `${getCategoryColor(activeCategory).color}15`, padding: "0.3rem 0.6rem", borderRadius: "4px" }}>{book.subGenre ? book.subGenre.split(" > ")[0] : book.genre}</div>
                             <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: 12, fontWeight: 700, color: "#FFD400" }}>
                                <Star size={12} fill="#FFD400" /> {book.rating > 0 ? book.rating.toFixed(1) : "New"}
                             </div>
                          </div>
                          
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 0.2rem 0", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "'Playfair Display', serif" }}>{book.title}</h3>
                          <div className="book-author-block" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
                            {book.authorPhotoUrl ? (
                              <img src={book.authorPhotoUrl.startsWith('http') ? book.authorPhotoUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.authorPhotoUrl.startsWith('/') ? book.authorPhotoUrl : '/' + book.authorPhotoUrl}`} alt={book.authorName} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#64748b" }}>
                                {book.authorName.charAt(0)}
                              </div>
                            )}
                            <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{book.authorName}</span>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                            {book.bundleRule && book.bundleRule.enabled && (
                              <div style={{ background: "#fffbeb", color: "#d97706", padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", alignSelf: "flex-start", border: "1px solid #fef3c7" }}>
                                🔥 Buy {book.bundleRule.buyCount} Get {book.bundleRule.discount}% Off
                              </div>
                            )}
                            {book.bundleRules && book.bundleRules.length > 0 && book.bundleRules.some(r => r.enabled) && !book.bundleRule && (
                              <div style={{ background: "#fffbeb", color: "#d97706", padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", alignSelf: "flex-start", border: "1px solid #fef3c7" }}>
                                🔥 Bundle Offer Available
                              </div>
                            )}
                          </div>
                        </Link>
                        
                        <div className="bottom-row" style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                           <div>
                             <div className="price-label" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#aaa", letterSpacing: "0.1em", marginBottom: "0.1rem" }}>Price</div>
                             <div className="price-val" style={{ fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1 }}>{book.mrp != null ? `₹${book.mrp}` : book.mrpRaw || "TBD"}</div>
                           </div>
                           
                           {!selectionMode && !bulkSelectionMode && (
                             <div>
                               {inCart ? (
                                 <button onClick={(e) => { e.preventDefault(); addToCart(book.id); }} style={{ padding: "0.8rem 1.2rem", background: "#f5f5f5", color: "#111", border: "2px solid #eaeaea", borderRadius: "12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}><ShoppingCart size={16} fill="#111" /> Added</button>
                               ) : (
                                 <button onClick={(e) => { e.preventDefault(); addToCart(book.id); }} style={{ padding: "0.8rem 1.2rem", background: getCategoryColor(activeCategory).color, color: "#fff", border: "none", borderRadius: "12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", transition: "filter 0.2s" }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}><ShoppingCart size={16} /> Add</button>
                               )}
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {selectionMode && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", borderRadius: 16,
          padding: "1rem 1.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: "1.5rem", zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} color="#94a3b8" />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700 }}>
                {selectedBooksForCatalogue.length} Book{selectedBooksForCatalogue.length !== 1 ? "s" : ""} Selected
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>For Custom Catalogue</div>
            </div>
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.1)" }}></div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              onClick={() => {
                setSelectionMode(false);
                setSelectedBooksForCatalogue([]);
              }}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: 8, fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (selectedBooksForCatalogue.length === 0) {
                  toast.error("Please select at least one book.");
                  return;
                }
                const selectedBooks = allBooks.filter(b => selectedBooksForCatalogue.includes(b.id));
                downloadCataloguePDF("Personalized", selectedBooks, setDownloadingType, publicStats, false);
              }}
              disabled={downloadingType !== null || selectedBooksForCatalogue.length === 0}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#00C2FF", border: "none", cursor: (downloadingType !== null || selectedBooksForCatalogue.length === 0) ? "not-allowed" : "pointer", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: 8, fontWeight: 700, fontSize: 13, opacity: (downloadingType !== null || selectedBooksForCatalogue.length === 0) ? 0.5 : 1 }}
            >
              {downloadingType === 'standard' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Generate PDF
            </button>
          </div>
        </div>
      )}

      {bulkSelectionMode && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#0284c7", color: "#fff", borderRadius: 16,
          padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "2rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)", zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
          animation: "slideUp 0.3s ease-out forwards"
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>Bulk Order</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{selectedBooksForBulk.length} Books Selected</span>
          </div>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              onClick={() => {
                setBulkSelectionMode(false);
                setSelectedBooksForBulk([]);
              }}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: 8, fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if(selectedBooksForBulk.length === 0) { toast.error("Please select at least one book."); return; }
                localStorage.setItem("bulk_checkout_items", JSON.stringify(selectedBooksForBulk));
                window.location.href = "/bulk-checkout";
              }}
              style={{ background: "#fff", border: "none", cursor: "pointer", color: "#0284c7", padding: "0.5rem 1.2rem", borderRadius: 8, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s" }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {!selectionMode && !bulkSelectionMode && cart.length > 0 && (
        <div className="catalogue-floating-checkout" style={{
          position: "fixed", bottom: "2rem", right: "2rem",
          background: "#111", color: "#fff", borderRadius: 50,
          padding: "0.8rem 1rem 0.8rem 2rem", boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: "2rem", zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div className="catalogue-floating-checkout-text">
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{totalItems} Book{totalItems > 1 ? "s" : ""} Selected</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Total: ₹{cartTotal}</div>
          </div>
          <button onClick={() => {
              const token = localStorage.getItem("token");
              const role = localStorage.getItem("userRole");
              if (!token || role !== "CUSTOMER") {
                navigate("/login?role=CUSTOMER&redirect=/checkout");
              } else {
                navigate("/checkout");
              }
            }}
            style={{ 
              background: getCategoryColor(activeCategory).color, 
              border: "none", cursor: "pointer", color: "#fff", 
              padding: "0.8rem 1.8rem", borderRadius: 40, 
              fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: "0.5rem",
              transition: "transform 0.2s, filter 0.2s" 
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "brightness(1)"; }}
          >
            Checkout <ChevronRight size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
