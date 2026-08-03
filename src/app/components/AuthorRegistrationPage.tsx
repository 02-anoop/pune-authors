import { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import localforage from "localforage";
import qrCode from "./data/qr_code.jpeg";
import charterPdf from "./data/Group Activities and Charter.pdf";
import pastEvents from "./data/past_events.json";
import { bookCategories } from "../data/categories";
import { CheckCircle, Upload, CreditCard, User, BookOpen, FileText, Shield, ChevronRight, ChevronLeft, Plus, Eye, EyeOff, X, Edit, Instagram, Facebook, Linkedin, Youtube, Link as LinkIcon, ArrowLeft, Info, CalendarDays, Briefcase, MapPin, Clock, LogOut } from "lucide-react";
import { compressImage } from "../utils/imageUtils";

const indianStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const formSteps = [
  { title: "Author Profile", icon: <User size={18} />, desc: "Personal information and bio" },
  { title: "Book Details", icon: <BookOpen size={18} />, desc: "Title, synopsis, and cover" },
  { title: "Questionnaire", icon: <FileText size={18} />, desc: "Declarations & Guidelines" },
  { title: "Submit & Payment", icon: <CreditCard size={18} />, desc: "Application fee" },
];

const toBase64 = (file: File | Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

const fromBase64 = async (dataURI: string, filename: string): Promise<File | null> => {
  if (!dataURI || typeof dataURI !== 'string' || !dataURI.includes(',')) return null;
  try {
    const arr = dataURI.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    if (n === 0) return null;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  } catch (e) {
    return null;
  }
};

const onboardingInfoSteps = [
  { title: "About PAA", icon: <Info size={18} />, desc: "Our origins and mission" },
  { title: "Past Events", icon: <CalendarDays size={18} />, desc: "Literary highlights" },
  { title: "Our Services", icon: <Briefcase size={18} />, desc: "What we offer" },
];

function WizardAboutStep() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">About The Group</h2>
      <p className="text-sm text-paa-gray-text mb-8">Discover our origins, mission, and the collective strength of Pune authors.</p>
      <div className="space-y-6 text-gray-700 text-sm md:text-base leading-relaxed bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-paa-navy/5">
        <p>
          The group was conceived in <strong className="text-paa-navy font-semibold">December 2024</strong> following the Pune Book Fair. While networking at a local stall, several authors recognized a shared challenge: the immense difficulty of selling independently in a saturated market.
        </p>
        <p>
          The idea to form a unified coalition of Pune authors was spearheaded by <strong className="text-paa-navy font-semibold">Cdr Shiv Mathur</strong>. Having witnessed firsthand the struggles authors face with visibility and reaching readers, the vision became clear: find a way to promote literature collaboratively rather than competitively.
        </p>
        <p>
          By pooling resources, we discovered that financial barriers to self-marketing drastically decreased. Shared costs allow us to execute large-scale activities, prominent stall placements, and robust marketing campaigns that would be prohibitively expensive for an individual author.
        </p>
        <p>
          Today, a strict group guideline document ensures every author understands our shared agenda and ethical rules. As our success grew, we expanded our invitation to authors from Mumbai, and we are now proudly welcoming talent from across the entire country into our literary ecosystem.
        </p>
      </div>
    </div>
  );
}

function WizardEventsStep() {
  const [currentPastEventIndex, setCurrentPastEventIndex] = useState(0);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/impact-stats`)
      .then(res => setStats(res.data))
      .catch(console.error);
  }, []);

  const nextPastEvent = () => setCurrentPastEventIndex((prev) => (prev + 1) % pastEvents.length);
  const prevPastEvent = () => setCurrentPastEventIndex((prev) => (prev - 1 + pastEvents.length) % pastEvents.length);

  const fairs = pastEvents.filter(e => e.name.toLowerCase().includes("fair"));
  const literaryEvents = pastEvents.filter(e => !e.name.toLowerCase().includes("fair"));

  const totalFairs = stats ? stats.totalFairs : fairs.length;
  const totalFairsBooks = stats ? stats.totalFairsBooks : fairs.reduce((sum, e) => sum + (e.booksSold || 0), 0);

  const totalLiteraryEvents = stats ? stats.totalLiteraryEvents : literaryEvents.length;
  const totalLiteraryBooks = stats ? stats.totalLiteraryBooks : literaryEvents.reduce((sum, e) => sum + (e.booksSold || 0), 0);

  const totalLibraries = stats ? stats.totalLibraries : 4;
  const totalLibraryBooks = stats ? stats.totalLibraryBooks : 450;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Literary Events & Book Fairs</h2>
      <p className="text-sm text-paa-gray-text mb-8">Discover our impact through book fairs, reading sessions, and airport library initiatives across India.</p>

      <div className="space-y-10">
        <div>
          <h3 className="font-serif text-xl text-paa-navy mb-6 border-b border-gray-100 pb-2">Our Impact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-paa-gold/10 rounded-full flex items-center justify-center mb-4 text-paa-gold">
                <BookOpen size={24} />
              </div>
              <div className="text-4xl font-serif text-paa-navy mb-1">{totalLiteraryEvents}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Literary Events</div>
              <div className="w-full pt-4 border-t border-gray-100 mt-auto">
                 <div className="text-xl font-serif text-paa-gold">{totalLiteraryBooks}+</div>
                 <div className="text-[10px] uppercase tracking-widest text-gray-400">Books Sold</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-paa-gold/10 rounded-full flex items-center justify-center mb-4 text-paa-gold">
                <MapPin size={24} />
              </div>
              <div className="text-4xl font-serif text-paa-navy mb-1">{totalFairs}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Book Fairs</div>
              <div className="w-full pt-4 border-t border-gray-100 mt-auto">
                 <div className="text-xl font-serif text-paa-gold">{totalFairsBooks}+</div>
                 <div className="text-[10px] uppercase tracking-widest text-gray-400">Books Sold</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-paa-gold/10 rounded-full flex items-center justify-center mb-4 text-paa-gold">
                <Briefcase size={24} />
              </div>
              <div className="text-4xl font-serif text-paa-navy mb-1">{totalLibraries}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Airport Libraries</div>
              <div className="w-full pt-4 border-t border-gray-100 mt-auto">
                 <div className="text-xl font-serif text-paa-gold">{totalLibraryBooks}+</div>
                 <div className="text-[10px] uppercase tracking-widest text-gray-400">Books Distributed</div>
              </div>
            </div>
          </div>

          <h3 className="font-serif text-xl text-paa-navy mb-6 border-b border-gray-100 pb-2">Event Highlights</h3>
          <div className="relative min-h-[420px] md:min-h-[450px] flex justify-center perspective-[1000px]">
              {pastEvents.map((event, index) => {
                const diff = (index - currentPastEventIndex + pastEvents.length) % pastEvents.length;
                if (diff > 2 && diff < pastEvents.length - 1) return null;
                let style: React.CSSProperties = { position: "absolute", top: 0, width: "100%", maxWidth: "380px", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" };
                if (diff === 0) { style = { ...style, transform: "translateY(0) scale(1)", zIndex: 30, opacity: 1, pointerEvents: "auto" }; }
                else if (diff === 1) { style = { ...style, transform: "translateY(25px) scale(0.92)", zIndex: 20, opacity: 0.8, pointerEvents: "none" }; }
                else if (diff === 2) { style = { ...style, transform: "translateY(50px) scale(0.84)", zIndex: 10, opacity: 0.4, pointerEvents: "none" }; }
                else if (diff === pastEvents.length - 1) { style = { ...style, transform: "translateY(-40px) scale(1.05)", zIndex: 40, opacity: 0, pointerEvents: "none" }; }

                return (
                  <div key={index} style={style} className="bg-white rounded-2xl border border-paa-navy/10 shadow-lg overflow-hidden flex flex-col">
                    <div className="h-40 bg-gray-100 relative">
                      {(event as any).photoUrl ? (
                        <img src={(event as any).photoUrl.startsWith('http') ? (event as any).photoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${(event as any).photoUrl}`} alt={event.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 text-center bg-paa-navy/5">
                           <h3 className="font-serif text-lg text-gray-400 leading-tight">{event.name}</h3>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-bold text-paa-navy uppercase tracking-widest bg-paa-navy/5 px-2 py-1 rounded">{event.date}</span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {event.duration}</span>
                      </div>
                      <h4 className="font-serif text-lg text-gray-900 font-medium mb-1 line-clamp-1">{event.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-4 line-clamp-1"><MapPin size={12} className="shrink-0" /> {event.address}</p>
                      
                      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 mt-auto">
                        <div><div className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Authors</div><div className="font-serif text-lg text-paa-navy">{event.authorsParticipated}</div></div>
                        <div><div className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Books Sold</div><div className="font-serif text-lg text-paa-navy">{event.booksSold !== null ? event.booksSold : "TBA"}</div></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="absolute -bottom-2 md:bottom-2 z-50 flex gap-3">
                 <button onClick={prevPastEvent} className="p-3 bg-white rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-md transition-all active:scale-95"><ChevronLeft size={20} /></button>
                 <button onClick={nextPastEvent} className="p-3 bg-paa-navy rounded-full text-white hover:bg-paa-navy/90 shadow-md transition-all active:scale-95"><ChevronRight size={20} /></button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardServicesStep() {
  const services = [
    { num: "I.", title: "Support in Self-Publishing", desc: "We provide professional end-to-end manuscript production to ensure your book meets exact industry standards before hitting the market.", items: ["Formatting of Manuscript", "Book Cover Design", "Editing & Proof Reading", "Printing as low as 50 copies at minimal cost"] },
    { num: "II.", title: "Promotional Support", desc: "Strategic visibility is crucial. We position your literature directly in front of discerning audiences using collective brand power.", items: ["Catalogue of fiction and non-fiction books", "Giving books to the Airport Libraries", "Donating books to well known local libraries", "LinkedIn page management"] },
    { num: "III.", title: "Selling Books", desc: "Securing reliable revenue streams through vetted physical and digital channels.", items: ["Participation in book fairs all over India (NBT)", "Literary Events in large housing societies & Educational Institutes", "Setting up stalls in housing societies"] }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Our Services</h2>
      <p className="text-sm text-paa-gray-text mb-8">Empowering independent authors through collaborative support in self-publishing, strategic promotion, and collaborative initiatives to reach readers.</p>
      <div className="space-y-6">
        {services.map((service, idx) => (
          <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col md:flex-row gap-6 md:gap-10 hover:shadow-md transition-shadow">
            <div className="md:w-1/3">
              <div className="font-serif text-xl text-paa-gold italic mb-2">{service.num}</div>
              <h3 className="font-serif text-2xl font-medium text-gray-900 leading-tight">{service.title}</h3>
            </div>
            <div className="md:w-2/3">
              <p className="text-gray-700 text-sm md:text-base mb-4 leading-relaxed">{service.desc}</p>
              <ul className="space-y-2">
                {service.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-paa-gold mt-1">—</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const languages = [
  "English", "Hindi", "Marathi", "Bengali", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam", "Punjabi", "Other"
];

const genreOptions = [
  { code: "NF", label: "Non-Fiction", color: "#2563eb" },
  { code: "F", label: "Fiction", color: "#db2777" },
  { code: "P", label: "Poetry", color: "#d97706" },
  { code: "C", label: "Children's", color: "#16a34a" },
];

export function AuthorRegistrationPage({ initialData, isReapply = false, onReapplySuccess, isAdminEdit = false, isAuthorEdit = false, onAdminSave, onAdminReject, onAdminCancel, hideNavbar = false, targetAction, targetBookId }: any = {}) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFileUrl, setCoverFileUrl] = useState<string | null>(null);
  const [backCoverFileUrl, setBackCoverFileUrl] = useState<string | null>(null);
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string | null>(null);
  const [coverBlob, setCoverBlob] = useState<File | null>(null);
  const [backCoverBlob, setBackCoverBlob] = useState<File | null>(null);
  const [authorBlob, setAuthorBlob] = useState<File | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [paymentBlob, setPaymentBlob] = useState<File | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeBlob, setQrCodeBlob] = useState<File | null>(null);
  const [qualifications, setQualifications] = useState<any[]>([{ id: Date.now(), qualification: "", institution: "", subject: "", mode: "", certificateUrl: "", certificateBlob: null }]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [extraDataState, setExtraDataState] = useState<any>({});
  const [books, setBooks] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [hobbyInput, setHobbyInput] = useState("");

  // Modals for guidelines
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showInfoDoc, setShowInfoDoc] = useState(false);
  const hasInitialized = useRef(false);
  const hasLoadedDraft = useRef(false);
  const editingBookIndexRef = useRef<number | null>(null);

  const isOnboardingMode = !isReapply && !isAdminEdit && !isAuthorEdit;
  const currentSteps = isOnboardingMode ? [...onboardingInfoSteps, ...formSteps] : formSteps;
  const formStepIndex = isOnboardingMode ? step - 3 : step;
  
  const getDiffUi = (key: string) => {
    if (!isAdminEdit || !initialData?.extraData?.originalProfileData) return null;
    const origData = initialData.extraData.originalProfileData;
    const origVal = origData[key] !== undefined && origData[key] !== null ? String(origData[key]) : "";
    const curVal = form[key] !== undefined && form[key] !== null ? String(form[key]) : "";
    if (origVal !== curVal) {
       return <div className="text-xs text-blue-600 mt-1 font-bold bg-blue-50 px-2 py-1 rounded inline-block shadow-sm border border-blue-100">Original: {origVal || '(empty)'}</div>;
    }
    return null;
  };

  const getArrayDiffUi = (key: string, currentArr: string[]) => {
    if (!isAdminEdit || !initialData?.extraData?.originalProfileData) return null;
    const origData = initialData.extraData.originalProfileData;
    let origArr: string[] = [];
    try {
      if (key === 'skills' || key === 'hobbies') {
        const jsonKey = key === 'skills' ? 'skillsJson' : 'hobbiesJson';
        origArr = typeof origData[jsonKey] === 'string' ? JSON.parse(origData[jsonKey]) : (origData[jsonKey] || []);
        if (origArr.length === 0) {
          origArr = typeof origData[key] === 'string' ? JSON.parse(origData[key]) : (origData[key] || []);
        }
      } else {
        origArr = typeof origData[key] === 'string' ? JSON.parse(origData[key]) : (origData[key] || []);
      }
    } catch(e) {}
    
    const origStr = origArr.map(s => String(s).toLowerCase().trim()).sort().join(',');
    const curStr = (currentArr || []).map(s => String(s).toLowerCase().trim()).sort().join(',');
    
    if (origStr !== curStr) {
       return <div className="text-xs text-blue-600 mt-1 font-bold bg-blue-50 px-2 py-1 rounded inline-block shadow-sm border border-blue-100">Original: {origArr.length > 0 ? origArr.join(', ') : '(empty)'}</div>;
    }
    return null;
  };

  const getImageDiffUi = (key: string, currentUrl: string | null) => {
    if (!isAdminEdit || !initialData?.extraData?.originalProfileData) return null;
    const origData = initialData.extraData.originalProfileData;
    let origVal = origData[key] ? String(origData[key]) : "";
    if (origVal && !origVal.startsWith('http')) origVal = API + origVal;
    
    let curVal = currentUrl || "";
    if (curVal && !curVal.startsWith('http') && curVal.startsWith('/uploads')) curVal = API + curVal;

    // Check if both are empty/null
    if (!origVal && !curVal) return null;
    
    // If they differ, it was changed
    if (origVal !== curVal) {
       return (
         <div className="text-xs text-blue-600 mt-2 font-bold bg-blue-50 px-2 py-1 rounded inline-block shadow-sm border border-blue-100">
           New Image Uploaded
           {origVal && <a href={origVal} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 underline text-[10px]">View Original</a>}
         </div>
       );
    }
    return null;
  };
  
  const getDiffClass = (key: string) => {
    if (!isAdminEdit || !initialData?.extraData?.originalProfileData) return "";
    const origData = initialData.extraData.originalProfileData;
    const origVal = origData[key] !== undefined ? String(origData[key]) : "";
    const curVal = form[key] !== undefined ? String(form[key]) : "";
    if (origVal !== curVal) {
       return "!border-blue-500 ring-2 ring-blue-500/20";
    }
    return "";
  };

  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top of stepper when changing steps
  useEffect(() => {
    if (topRef.current) {
      const y = topRef.current.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/author-fields`)
      .then(res => {
        const requiredFields = res.data.filter((f: any) => f.requiredForRegistration);
        setDynamicFields(requiredFields);
      })
      .catch(console.error);
      
    if ((isReapply || isAdminEdit || isAuthorEdit) && initialData && !hasInitialized.current) {
       hasInitialized.current = true;
       let parsedQuals = [];
       try { parsedQuals = JSON.parse(initialData.qualification); } catch(e) {}
       if (!Array.isArray(parsedQuals) || parsedQuals.length === 0) parsedQuals = [{ id: Date.now(), qualification: "", institution: "", subject: "", certificateUrl: "", certificateBlob: null }];
       setQualifications(parsedQuals);
       
       const parseArray = (jsonVal: any, strVal: any) => {
          let parsed: any[] = [];
          if (Array.isArray(jsonVal) && jsonVal.length > 0) parsed = jsonVal;
          else if (typeof jsonVal === 'string') { try { const p = JSON.parse(jsonVal); if (Array.isArray(p)) parsed = p; } catch(e) {} }
          
          if (parsed.length === 0 && typeof strVal === 'string') {
            try { const p = JSON.parse(strVal); if (Array.isArray(p)) parsed = p; } catch(e) {}
            if (parsed.length === 0) parsed = strVal.split(',').filter(Boolean);
          }
          
          return parsed.map((s: any) => String(s).replace(/[\[\]"\\]/g, '').trim()).filter(Boolean);
        };
       
       let extra = {};
       if (typeof initialData.extraData === 'string') {
         try { extra = JSON.parse(initialData.extraData); } catch (e) {}
       } else if (initialData.extraData) {
         extra = initialData.extraData;
       }

       if (initialData.books && initialData.books.length > 0) {
          setBooks(initialData.books.map((b: any) => ({
             ...b,
             subcategory: b.subGenre ? b.subGenre.split(' > ')[0] : '',
             subSubcategory: b.subGenre && b.subGenre.includes(' > ') ? b.subGenre.split(' > ')[1] : '',
             coverFileUrl: b.coverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.coverUrl}` : null,
             backCoverFileUrl: b.backCoverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.backCoverUrl}` : null
          })));
       }
       
       setForm(prev => ({
          ...prev,
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          address: initialData.address || '',
          pincode: initialData.pincode || '',
          aadharNumber: initialData.aadharNumber || '',
          dob: initialData.dob || initialData.age || '',
          experience: initialData.experience || '',
          skills: parseArray(initialData.skillsJson, initialData.skills),
          hobbies: parseArray(initialData.hobbiesJson, initialData.hobbies),
          whyJoining: initialData.whyJoining || '',
          bio: initialData.bio || '',
          penName: initialData.penName || '',
          city: initialData.city || '',
          state: initialData.state || '',
          instagram: initialData.instagram || '',
          facebook: initialData.facebook || '',
          linkedin: (extra as any).linkedin || '',
          youtube: (extra as any).youtube || '',
          transactionId: initialData.transactionId || '',
          conflictOfInterestSignature: (extra as any).conflictOfInterestSignature || '',
          agreedToGuidelines: (extra as any).agreedToGuidelines || false,
          agreedToInfoDoc: (extra as any).agreedToInfoDoc || false
       }));

       if (initialData.extraData) {
          setExtraDataState(extra);
       }
       if (initialData.photoUrl) setAuthorPhotoUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${initialData.photoUrl}`);
       if (initialData.paymentScreenshot) setPaymentScreenshotUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${initialData.paymentScreenshot}`);
       if (initialData.qrCodeUrl) setQrCodeUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${initialData.qrCodeUrl}`);
    }

    if (!isReapply && !isAdminEdit && !isAuthorEdit && !hasLoadedDraft.current) {
      hasLoadedDraft.current = true;
      
      const loadDraft = async () => {
        let draft: any = null;
        try {
          const draftStr = localStorage.getItem("authorRegistrationDraft");
          if (draftStr) draft = JSON.parse(draftStr);
        } catch (e) {}

        if (localStorage.getItem('token')) {
          try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/get-draft`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.draft) {
              draft = res.data.draft;
              if (draft.form && !draft.form.email && res.data.email) {
                draft.form.email = res.data.email;
              } else if (!draft.form && res.data.email) {
                draft.form = { email: res.data.email };
              }
            }
          } catch(err) { console.log('No db draft found'); }
        }

        if (draft) {
          if (draft.step !== undefined) setStep(draft.step);
          if (draft.extraDataState) {
            setExtraDataState(draft.extraDataState);
            if (draft.extraDataState.draftPhotoUrl) setAuthorPhotoUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${draft.extraDataState.draftPhotoUrl}`);
            if (draft.extraDataState.draftPaymentUrl) setPaymentScreenshotUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${draft.extraDataState.draftPaymentUrl}`);
            if (draft.extraDataState.draftQrUrl) setQrCodeUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${draft.extraDataState.draftQrUrl}`);
          }
          if (draft.form) {
            setForm(prev => ({ ...prev, ...draft.form }));
            if (draft.form.draftCoverUrl) setCoverFileUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${draft.form.draftCoverUrl}`);
            if (draft.form.draftBackCoverUrl) setBackCoverFileUrl(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${draft.form.draftBackCoverUrl}`);
          }
          if (draft.skillInput) setSkillInput(draft.skillInput);
          if (draft.hobbyInput) setHobbyInput(draft.hobbyInput);

          let currentBooks = draft.books || [];
          let currentQuals = draft.qualifications || [];

          if (currentBooks.length > 0) {
            currentBooks = currentBooks.map((b: any) => ({
              ...b,
              coverFileUrl: b.draftCoverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.draftCoverUrl}` : null,
              backCoverFileUrl: b.draftBackCoverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.draftBackCoverUrl}` : null
            }));
          }
          
          if (currentQuals.length > 0) {
            currentQuals = currentQuals.map((q: any) => ({
              ...q,
              certificateUrl: q.certificateUrl && !q.certificateUrl.startsWith('blob:') && !q.certificateUrl.startsWith('http') 
                ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${q.certificateUrl}` 
                : (q.certificateUrl || "")
            }));
          }

          try {
            const files: any = await localforage.getItem("authorRegistrationFiles");
            if (files) {
              const restoreB64 = async (b64: string, name: string) => b64 ? await fromBase64(b64, name) : null;
              
              if (files.authorBlob) {
                const f = await restoreB64(files.authorBlob, 'photo.jpg');
                if (f) { setAuthorBlob(f); setAuthorPhotoUrl(URL.createObjectURL(f)); }
              }
              if (files.paymentBlob) {
                const f = await restoreB64(files.paymentBlob, 'payment.jpg');
                if (f) { setPaymentBlob(f); setPaymentScreenshotUrl(URL.createObjectURL(f)); }
              }
              if (files.qrCodeBlob) {
                const f = await restoreB64(files.qrCodeBlob, 'qr.jpg');
                if (f) { setQrCodeBlob(f); setQrCodeUrl(URL.createObjectURL(f)); }
              }
              
              if (files.booksBlobs && currentBooks.length > 0) {
                currentBooks = await Promise.all(currentBooks.map(async (b: any, idx: number) => {
                  const bBlobs = files.booksBlobs[idx] || {};
                  const cBlob = await restoreB64(bBlobs.coverBlob, 'cover.jpg');
                  const bcBlob = await restoreB64(bBlobs.backCoverBlob, 'back.jpg');
                  return {
                    ...b,
                    coverBlob: cBlob,
                    backCoverBlob: bcBlob,
                    coverFileUrl: cBlob ? URL.createObjectURL(cBlob) : b.coverFileUrl,
                    backCoverFileUrl: bcBlob ? URL.createObjectURL(bcBlob) : b.backCoverFileUrl
                  };
                }));
              }
              
              if (files.activeCoverBlob) {
                const f = await restoreB64(files.activeCoverBlob, 'cover.jpg');
                if (f) { setCoverBlob(f); setCoverFileUrl(URL.createObjectURL(f)); }
              }
              if (files.activeBackCoverBlob) {
                const f = await restoreB64(files.activeBackCoverBlob, 'back.jpg');
                if (f) { setBackCoverBlob(f); setBackCoverFileUrl(URL.createObjectURL(f)); }
              }
              
              if (files.qualificationsBlobs && currentQuals.length > 0) {
                currentQuals = await Promise.all(currentQuals.map(async (q: any, idx: number) => {
                  const certB64 = files.qualificationsBlobs[idx]?.certificateBlob;
                  const f = await restoreB64(certB64, 'cert.jpg');
                  return {
                    ...q,
                    certificateBlob: f,
                    certificateUrl: f ? URL.createObjectURL(f) : q.certificateUrl
                  };
                }));
              }
            }
          } catch (e) {
            console.error("Failed to load local files:", e);
          }
          
          if (currentBooks.length > 0) setBooks(currentBooks);
          if (currentQuals.length > 0) setQualifications(currentQuals);
        }
      };

      loadDraft();
    }
  }, [isReapply, isAdminEdit, isAuthorEdit, initialData]);

  const [form, setForm] = useState<any>({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    district: "",
    pincode: "",
    aadharNumber: "",
    dob: "",
    experience: "",
    skills: [],
    hobbies: [],
    whyJoining: "",
    bio: "",
    penName: "",
    city: "",
    state: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    conflictOfInterestSignature: "",
    agreedToGuidelines: false,
    agreedToInfoDoc: false,
    groupJoiningDate: "",

    title: "",
    subtitle: "",
    genre: "",
    subcategory: "",
    subSubcategory: "",
    synopsis: "",
    pages: "",
    mrp: "",
    stock: "",
    language: "",
    isbn: "",
    publisher: "",
    publicationDate: "",
    edition: "",
    format: "",
    printFormat: "",
    purposeOfWriting: "",

    transactionId: ""
  });

  useEffect(() => {
    if (isReapply || isAdminEdit || isAuthorEdit || !hasLoadedDraft.current || !localStorage.getItem('token')) return;
    const timeoutId = setTimeout(() => {
      axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/save-draft`, {
        step, form, books, qualifications, extraDataState, skillInput, hobbyInput
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(err => console.log('Failed to save draft'));
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [step, form, books, qualifications, extraDataState, skillInput, hobbyInput, isReapply, isAdminEdit, isAuthorEdit]);

  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdminEdit && !isReapply && !isAuthorEdit && hasLoadedDraft.current) {
      const draft = {
        step,
        form,
        books: books.map(b => ({ ...b, coverBlob: null, backCoverBlob: null })), // Don't save blobs
        qualifications: qualifications.map(q => ({ ...q, certificateBlob: null })), // Don't save blobs
        extraDataState,
        skillInput,
        hobbyInput
      };
      localStorage.setItem("authorRegistrationDraft", JSON.stringify(draft));

      // Save files to localForage using base64
      (async () => {
        try {
          const getB64 = async (blob: any) => {
            if (blob instanceof Blob || blob instanceof File) {
              return await toBase64(blob);
            }
            return null;
          };
          const filesDraft = {
            authorBlob: await getB64(authorBlob),
            paymentBlob: await getB64(paymentBlob),
            qrCodeBlob: await getB64(qrCodeBlob),
            booksBlobs: await Promise.all(books.map(async b => ({
              coverBlob: await getB64(b.coverBlob),
              backCoverBlob: await getB64(b.backCoverBlob)
            }))),
            activeCoverBlob: await getB64(coverBlob),
            activeBackCoverBlob: await getB64(backCoverBlob),
            qualificationsBlobs: await Promise.all(qualifications.map(async q => ({
              certificateBlob: await getB64(q.certificateBlob)
            })))
          };
          await localforage.setItem("authorRegistrationFiles", filesDraft);
        } catch (err) {
          console.log('Failed to save files locally', err);
        }
      })();
    }
  }, [step, form, books, qualifications, extraDataState, skillInput, hobbyInput, authorBlob, paymentBlob, qrCodeBlob, coverBlob, backCoverBlob, isAdminEdit, isReapply, isAuthorEdit]);

  const uploadFileToServer = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/upload`, formData);
      return res.data.url;
    } catch (e) {
      console.error('File upload failed', e);
      return null;
    }
  };

  const validateField = (key: string, value: any) => {
    let error = "";
    if (key === "name" && !value) error = "Name is required.";
    if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) error = "Invalid email address.";
    if (!isReapply && !isAdminEdit && key === "password" && (value as string).length < 6) error = "Password must be at least 6 characters.";
    if (key === "phone" && !/^\d{10}$/.test((value as string).replace(/\D/g, ''))) error = "Must be a 10-digit number.";
    if (key === "address" && !value) error = "Full Address is required.";
    if (key === "aadharNumber") {
      if (!value) error = "Aadhar/Voter ID/DL is required.";
    }
    if (key === "dob") {
      if (!value) error = "Date of Birth is required.";
      else if (form.experience) {
        const birthDate = new Date(value as string);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
        if (Number(form.experience) > age) {
          setErrors(prev => ({ ...prev, experience: "Experience cannot be greater than your age." }));
        } else {
          setErrors(prev => ({ ...prev, experience: "" }));
        }
      }
    }
    if (key === "experience") {
      if (value === "" || isNaN(Number(value)) || Number(value) < 0 || Number(value) > 70) {
        error = "Experience must be a number between 0 and 70.";
      } else if (form.dob) {
        const birthDate = new Date(form.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
        if (Number(value) > age) error = "Experience cannot be greater than your age.";
      }
    }
    if (key === "skills" && (!value || value.length === 0)) error = "Skills are required.";
    if (key === "hobbies" && (!value || value.length === 0)) error = "Hobbies are required.";
    if (key === "bio") {
      if (!value) error = "Bio is required.";
      else {
        const wordCount = String(value).split(/\s+/).filter(Boolean).length;
        if (wordCount < 100) error = "Bio must be at least 100 words.";
        if (wordCount > 150) error = "Bio cannot exceed 150 words.";
      }
    }
    
    if (key === "city" && !value) error = "City is required.";
    if (key === "state" && !value) error = "State is required.";
    
    // Social Media
    if (key === "facebook" && value && !/^https?:\/\//.test(String(value))) error = "Must be a valid URL starting with http:// or https://";
    if (key === "instagram" && value && !/^https?:\/\//.test(String(value)) && !String(value).startsWith('@')) error = "Must be a valid URL or @username";
    if (key === "linkedin" && value && !/^(https?:\/\/|www\.)/.test(String(value))) error = "Enter valid url starting with www.";
    if (key === "youtube" && value && !/^https?:\/\//.test(String(value))) error = "Must be a valid URL starting with http:// or https://";


    // For book details
    if (key === "title" && !value) error = "Title is required.";
    if (key === "genre" && !value) error = "Category is required.";
    if (key === "synopsis") {
      if (!value) error = "Synopsis is required.";
      else if (String(value).split(/\s+/).filter(Boolean).length > 100) error = "Synopsis cannot exceed 100 words.";
    }
    if (key === "mrp" && (!value || Number(value) <= 0)) error = "Valid MRP is required.";
    if (key === "pages" && (!value || Number(value) <= 0)) error = "Number of Pages is required.";
    if (key === "language" && !value) error = "Language is required.";
    if (key === "isbn") {
      const digits = String(value).replace(/\D/g, '');
      if (!digits) error = "ISBN is required.";
      else if (digits.length !== 10 && digits.length !== 13) error = "ISBN must be exactly 10 or 13 digits.";
    }
    if (key === "publisher" && !value) error = "Publisher is required.";
    if (key === "publicationDate" && !value) error = "Publication Date is required.";
    if (key === "format" && !value) error = "Book Format is required.";
    if (key === "printFormat" && !value) error = "Print Format is required.";
    if (key === "purposeOfWriting" && !value) error = "Purpose of Writing is required.";

    // Questionnaire
    if (key === "conflictOfInterestSignature" && !value) error = "Signature is required.";
    if (key === "whyJoining" && !value) {
      // We only validate whyJoining if isTraditionallyPublished is true, but validateField doesn't easily have access to derived state inside the loop if it's stale. 
      // Actually we'll just check it when validating the form.
    }

    // Payment
    if (key === "transactionId" && !value) error = "Transaction ID is required.";

    setErrors((prev) => ({ ...prev, [key]: error }));
  };

  const update = (key: string, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    validateField(key, val);
  };
  const handleEditAddedBook = (idx: number) => {
    if (showAddBookForm && (form.title || form.synopsis)) {
      alert("You are currently editing a book. Please save or cancel the current book before editing another one.");
      return;
    }
    editingBookIndexRef.current = idx;
    const bookToEdit = books[idx];
    setForm({
      ...form,
      title: bookToEdit.title || "",
      subtitle: bookToEdit.subtitle || "",
      genre: bookToEdit.genre || "",
      subcategory: bookToEdit.subcategory || "",
      subSubcategory: bookToEdit.subSubcategory || "",
      synopsis: bookToEdit.synopsis || "",
      pages: bookToEdit.pages || "",
      mrp: bookToEdit.mrp || "",
      stock: bookToEdit.stock || "0",
      language: bookToEdit.language || "",
      isbn: bookToEdit.isbn || "",
      publisher: bookToEdit.publisher || "",
      publicationDate: bookToEdit.publicationDate || "",
      edition: bookToEdit.edition || "",
      format: bookToEdit.format || "",
      printFormat: bookToEdit.printFormat || "",
      purposeOfWriting: bookToEdit.purposeOfWriting || bookToEdit.purpose || ""
    });
    setCoverBlob(bookToEdit.coverBlob || null);
    setBackCoverBlob(bookToEdit.backCoverBlob || null);
    setCoverFileUrl(bookToEdit.coverFileUrl || (bookToEdit.coverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${bookToEdit.coverUrl}` : null));
    setBackCoverFileUrl(bookToEdit.backCoverFileUrl || (bookToEdit.backCoverUrl ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${bookToEdit.backCoverUrl}` : null));
    setShowAddBookForm(true);
  };

  const handledTargetAction = useRef(false);
  useEffect(() => {
    if (hasInitialized.current && targetAction && !handledTargetAction.current) {
       // If editing a book, wait for the books state to be populated
       if (targetAction === 'edit_book' && targetBookId && books.length === 0) {
         return;
       }
       
       handledTargetAction.current = true;
       if (targetAction === 'add_book' || targetAction === 'edit_book') {
          setStep(1);
          setShowAddBookForm(true);
          if (targetAction === 'edit_book' && targetBookId) {
             const idx = books.findIndex(b => b.id === targetBookId);
             if (idx !== -1) {
                handleEditAddedBook(idx);
             }
          } else if (targetAction === 'add_book') {
             setForm(prev => ({ ...prev, title: "", subtitle: "", genre: "", subcategory: "", subSubcategory: "", synopsis: "", pages: "", mrp: "", stock: "0", language: "", isbn: "", publisher: "", publicationDate: "", edition: "", format: "", printFormat: "", purposeOfWriting: "" }));
             setCoverBlob(null);
             setBackCoverBlob(null);
             setCoverFileUrl(null);
             setBackCoverFileUrl(null);
          }
       }
    }
  }, [targetAction, targetBookId, books, form]);

  return (
    <main className={`font-sans text-paa-navy ${isAuthorEdit ? 'bg-transparent' : 'min-h-screen bg-[#F8FAFC]'}`}>
      {/* Scrollable Header Banner */}
      {!hideNavbar && (isAdminEdit ? (
        <section className="bg-paa-navy pt-32 pb-6 md:pb-8 px-6 text-center text-white relative">
          <button onClick={onAdminCancel} className="absolute left-6 top-24 md:top-28 text-paa-gold hover:text-white flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-colors">
            <ArrowLeft size={16} /> <span className="hidden md:inline">Back to Dashboard</span>
          </button>
          <div className="font-sans text-[10px] text-paa-gold tracking-widest uppercase font-bold mb-1 md:mb-2">Admin Review Mode</div>
          <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">Review Application: {initialData?.name}</h1>
        </section>
      ) : isReapply ? (
        <section className="bg-paa-navy pt-32 pb-6 px-6 text-center text-white">
          <div className="font-sans text-[10px] text-paa-gold tracking-widest uppercase font-bold mb-1">Edit &amp; Reapply</div>
          <h1 className="font-serif text-xl md:text-2xl font-medium tracking-tight">Update Your Application</h1>
        </section>
      ) : (
        <section className="bg-paa-navy pt-32 pb-8 px-6 text-center text-white">
          <div className="font-sans text-[10px] text-paa-gold tracking-widest uppercase font-bold mb-2 md:mb-3">New Author Onboarding</div>
          <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight mb-2 md:mb-3">Join Pune Authors&apos; Association</h1>
          <p className="text-xs md:text-sm text-white/60 max-w-lg mx-auto">A one-time application reviewed by our editorial team within 5-7 working days.</p>
        </section>
      ))}
      <div ref={topRef} />

      {/* Sticky Stepper Only */}
      <div className={`z-40 w-full sticky ${isAdminEdit ? 'top-0' : 'top-[72px]'} pt-0`}>
        <div className="w-full px-2 sm:px-6 md:px-12 lg:px-20 mt-2 sm:mt-0">
          <div className="max-w-5xl mx-auto">
            <div className={`bg-white rounded-2xl shadow-premium ${hideNavbar ? 'border border-gray-200' : 'border border-paa-navy/5'}`}>
              <div className="px-1 sm:px-2 md:px-6 py-3 md:py-4">
                <div className="flex items-center justify-between pb-1 md:pb-0 w-full max-w-full">
                  {currentSteps.map((s, i) => (
                    <Fragment key={s.title}>
                      <div
                        className={`flex flex-col items-center px-0.5 md:px-2 ${isReapply || isAdminEdit ? "cursor-pointer" : ""} group z-10 flex-shrink-0 max-w-[50px] sm:max-w-none`}
                        onClick={() => {
                          if (isReapply || isAdminEdit) setStep(i);
                        }}
                      >
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-300 shadow-sm
                            ${i < step ? "bg-[#ebd8c0] text-paa-navy shadow-amber-500/20" : i === step ? "bg-paa-gold text-paa-navy shadow-paa-gold/20" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"}`}
                        >
                          {i < step ? <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-[18px] md:h-[18px]" /> : <span className="scale-[0.6] sm:scale-75 md:scale-100">{s.icon}</span>}
                        </div>
                        <span className={`text-[6px] sm:text-[8px] md:text-[10px] font-bold uppercase tracking-tighter md:tracking-widest text-center leading-tight transition-colors ${i === step ? "text-paa-navy" : "text-gray-400 group-hover:text-gray-600"}`}>
                          {s.title}
                        </span>
                      </div>
                      {i < currentSteps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-0.5 sm:mx-1 md:mx-2 min-w-[4px] transition-colors ${i < step ? "bg-[#ebd8c0]" : "bg-gray-200"}`} />
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-2 sm:px-6 md:px-12 lg:px-20 mt-3 sm:mt-6 mb-12 pb-20">
        <div className="max-w-5xl mx-auto">
        {!submitted ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl-2xl border border-paa-navy/5 p-5 sm:p-8 md:p-12 shadow-premium hover:shadow-premium-hover transition-all duration-500 ease-out">
            {isOnboardingMode && step === 0 && <WizardAboutStep />}
            {isOnboardingMode && step === 1 && <WizardEventsStep />}
            {isOnboardingMode && step === 2 && <WizardServicesStep />}

            {/* Form Step 0: Author Profile */}
            {formStepIndex === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Author Profile</h2>
                <p className="text-sm text-paa-gray-text mb-8">Tell us about yourself.<br/><span className='text-xs mt-1 block opacity-80'>Only public information (Bio, Profile Picture, Qualifications, Skills, Books) will be visible publicly. Sensitive information like Aadhaar Number, Phone Number, Address, Certificates, etc. will remain private.</span></p>

                <div className="space-y-6">
                  <div className={`grid grid-cols-1 ${isAdminEdit ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                    <div>
                      <label className="dash-label">Full Name *</label>
                      <input type="text" value={form.name} onChange={(e) => update("name", e.target.value.replace(/[^a-zA-Z\s]/g, ''))} className={`dash-input w-full ${errors.name ? '!border-red-500' : ''} ${getDiffClass("name")}`} placeholder="e.g. Jane Doe" />
                      {errors.name && <div className="text-red-500 text-xs mt-1 font-medium">{errors.name}</div>}
                      {getDiffUi("name")}
                    </div>
                    <div>
                      <label className="dash-label">Pen Name</label>
                      <input type="text" value={form.penName} onChange={(e) => update("penName", e.target.value)} className="dash-input w-full" placeholder="e.g. J.D." />
                    </div>
                    {isAdminEdit && (
                      <div>
                        <label className="dash-label">Email Address *</label>
                        <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={`dash-input w-full ${errors.email ? '!border-red-500' : ''} ${getDiffClass("email")}`} placeholder="jane@example.com" />
                        {errors.email && <div className="text-red-500 text-xs mt-1 font-medium">{errors.email}</div>}
                      {getDiffUi("email")}
                      </div>
                    )}
                  </div>

                  {/* Phone + Password (if applicable) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dash-label">Phone Number *</label>
                      <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, ''))} className={`dash-input w-full ${errors.phone ? '!border-red-500' : ''} ${getDiffClass("phone")}`} placeholder="10-digit mobile number" />
                      {errors.phone && <div className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</div>}
                      {getDiffUi("phone")}
                    </div>
                    {!isReapply && !isAdminEdit && !localStorage.getItem('token') ? (
                      <div>
                        <label className="dash-label">Password (For Login) *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            className={`dash-input w-full pr-10 ${errors.password ? '!border-red-500' : ''}`}
                            placeholder="Min 6 characters"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-gray-400 hover:text-paa-navy transition-colors">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && <div className="text-red-500 text-xs mt-1 font-medium">{errors.password}</div>}
                      </div>
                    ) : (
                      <div>
                        <label className="dash-label">Aadhar/Voter ID/DL *</label>
                        <input type="text" value={form.aadharNumber} onChange={(e) => update("aadharNumber", e.target.value)} className={`dash-input w-full ${errors.aadharNumber ? '!border-red-500' : ''} ${getDiffClass("aadharNumber")}`} placeholder="Aadhar / Voter ID / DL" />
                        {errors.aadharNumber && <div className="text-red-500 text-xs mt-1 font-medium">{errors.aadharNumber}</div>}
                      {getDiffUi("aadharNumber")}
                      </div>
                    )}
                  </div>

                  {/* Address + Aadhaar (if password was shown) */}
                  <div className={`grid grid-cols-1 ${!isReapply && !isAdminEdit && !localStorage.getItem('token') ? "md:grid-cols-2" : ""} gap-6`}>
                    <div>
                      <label className="dash-label">Full Address *</label>
                      <input type="text" value={form.address} onChange={(e) => update("address", e.target.value)} className={`dash-input w-full ${errors.address ? '!border-red-500' : ''} ${getDiffClass("address")}`} placeholder="House No./Flat No., Building, Street, Area" />
                      {errors.address && <div className="text-red-500 text-xs mt-1 font-medium">{errors.address}</div>}
                      {getDiffUi("address")}
                    </div>
                    {!isReapply && !isAdminEdit && !localStorage.getItem('token') && (
                      <div>
                        <label className="dash-label">Aadhar/Voter ID/DL *</label>
                        <input type="text" value={form.aadharNumber} onChange={(e) => update("aadharNumber", e.target.value)} className={`dash-input w-full ${errors.aadharNumber ? '!border-red-500' : ''}`} placeholder="Aadhar / Voter ID / DL" />
                        {errors.aadharNumber && <div className="text-red-500 text-xs mt-1 font-medium">{errors.aadharNumber}</div>}
                      </div>
                    )}
                  </div>

                  {/* Pincode + City + State in one row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="dash-label">Pincode *</label>
                      <input type="text" value={form.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ''))} maxLength={6} className={`dash-input w-full ${errors.pincode ? '!border-red-500' : ''} ${getDiffClass("pincode")}`} placeholder="6-digit Pincode" />
                      {errors.pincode && <div className="text-red-500 text-xs mt-1 font-medium">{errors.pincode}</div>}
                      {getDiffUi("pincode")}
                    </div>
                    <div>
                      <label className="dash-label">City *</label>
                      <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={`dash-input w-full ${errors.city ? '!border-red-500' : ''} ${getDiffClass("city")}`} placeholder="e.g. Pune" />
                      {errors.city && <div className="text-red-500 text-xs mt-1 font-medium">{errors.city}</div>}
                      {getDiffUi("city")}
                    </div>
                    <div>
                      <label className="dash-label">State *</label>
                      <select value={form.state} onChange={(e) => update("state", e.target.value)} className={`dash-input w-full ${errors.state ? '!border-red-500' : ''}`}>
                        <option value="">Select State</option>
                        {indianStates.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      {errors.state && <div className="text-red-500 text-xs mt-1 font-medium">{errors.state}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dash-label">Instagram</label>
                      <div className={`flex items-center border rounded-xl overflow-hidden bg-white transition-all focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 ${errors.instagram ? '!border-red-500' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-center w-11 h-11 shrink-0" style={{background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'}}>
                          <Instagram size={18} className="text-white" />
                        </div>
                        <input type="text" value={form.instagram} onChange={(e) => update("instagram", e.target.value)} className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent" placeholder="https://instagram.com/yourprofile" />
                      </div>
                      {errors.instagram && <div className="text-red-500 text-xs mt-1 font-medium">{errors.instagram}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Facebook</label>
                      <div className={`flex items-center border rounded-xl overflow-hidden bg-white transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ${errors.facebook ? '!border-red-500' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-center w-11 h-11 shrink-0 bg-[#1877F2]">
                          <Facebook size={18} className="text-white" />
                        </div>
                        <input type="text" value={form.facebook} onChange={(e) => update("facebook", e.target.value)} className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent" placeholder="https://facebook.com/yourprofile" />
                      </div>
                      {errors.facebook && <div className="text-red-500 text-xs mt-1 font-medium">{errors.facebook}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dash-label">LinkedIn</label>
                      <div className={`flex items-center border rounded-xl overflow-hidden bg-white transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 ${errors.linkedin ? '!border-red-500' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-center w-11 h-11 shrink-0 bg-[#0A66C2]">
                          <Linkedin size={18} className="text-white" />
                        </div>
                        <input type="text" value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent" placeholder="www.linkedin.com/in/yourprofile" />
                      </div>
                      {errors.linkedin && <div className="text-red-500 text-xs mt-1 font-medium">{errors.linkedin}</div>}
                    </div>
                    <div>
                      <label className="dash-label">YouTube</label>
                      <div className={`flex items-center border rounded-xl overflow-hidden bg-white transition-all focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 ${errors.youtube ? '!border-red-500' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-center w-11 h-11 shrink-0 bg-[#FF0000]">
                          <Youtube size={18} className="text-white" />
                        </div>
                        <input type="text" value={form.youtube} onChange={(e) => update("youtube", e.target.value)} className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent" placeholder="https://youtube.com/@yourchannel" />
                      </div>
                      {errors.youtube && <div className="text-red-500 text-xs mt-1 font-medium">{errors.youtube}</div>}
                    </div>
                  </div>

                  <h3 className="font-serif text-xl mt-8 pt-8 border-t border-gray-100">Qualifications</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="dash-label mb-0 text-sm opacity-0">Qualifications</label>
                      <button type="button" onClick={() => setQualifications([...qualifications, { id: Date.now(), qualification: "", institution: "", subject: "", mode: "", certificateUrl: "", certificateBlob: null }])} className="text-xs font-bold uppercase tracking-widest text-paa-navy hover:text-paa-gold flex items-center gap-1"><Plus size={14}/> Add Another</button>
                    </div>
                    {qualifications.map((q, idx) => (
                      <div key={q.id} className="p-5 border border-paa-navy/10 rounded-2xl bg-white shadow-sm space-y-4 relative">
                        {qualifications.length > 1 && (
                          <button type="button" onClick={() => setQualifications(qualifications.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-red-500 hover:text-red-700 flex items-center gap-1">
                            <span className="text-[10px] font-bold">REMOVE</span>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="dash-label">Qualification *</label>
                            <input type="text" value={q.qualification} onChange={(e) => { const n = [...qualifications]; n[idx].qualification = e.target.value; setQualifications(n); }} className={`dash-input w-full ${!q.qualification ? '!border-red-500' : ''}`} placeholder="e.g. BE, MA" />
                          </div>
                          <div>
                            <label className="dash-label">Institution *</label>
                            <input type="text" value={q.institution} onChange={(e) => { const n = [...qualifications]; n[idx].institution = e.target.value; setQualifications(n); }} className={`dash-input w-full ${!q.institution ? '!border-red-500' : ''}`} placeholder="e.g. Pune University" />
                          </div>
                          <div>
                            <label className="dash-label">Subject *</label>
                            <input type="text" value={q.subject} onChange={(e) => { const n = [...qualifications]; n[idx].subject = e.target.value; setQualifications(n); }} className={`dash-input w-full ${!q.subject ? '!border-red-500' : ''}`} placeholder="e.g. Computer Science" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="dash-label">Mode of Degree *</label>
                            <select value={q.mode || ''} onChange={(e) => { const n = [...qualifications]; n[idx].mode = e.target.value; setQualifications(n); }} className="dash-input w-full">
                              <option value="">Select Mode</option>
                              <option value="Full Time">Full Time</option>
                              <option value="Part Time">Part Time</option>
                              <option value="Online">Online</option>
                              <option value="Distance">Distance</option>
                              <option value="Correspondence">Correspondence</option>
                            </select>
                          </div>
                          <div>
                            <label className="dash-label">Upload Certificate *</label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => document.getElementById(`cert-upload-${idx}`)?.click()}
                                className="border border-dashed border-paa-navy/20 rounded-xl px-4 py-2.5 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                              >
                                <Upload className="w-4 h-4 text-paa-navy/40" />
                                <span className="text-xs font-medium text-paa-navy">{q.certificateUrl ? 'Change' : 'Upload'}</span>
                              </button>
                              {q.certificateUrl && (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {(() => {
                                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                                    const isServerUrl = q.certificateUrl.startsWith('/uploads');
                                    const fullUrl = isServerUrl ? `${API_URL}${q.certificateUrl}` : q.certificateUrl;
                                    const isImage = q.certificateBlob ? q.certificateBlob.type?.startsWith('image/') : /\.(jpg|jpeg|png|gif|webp)$/i.test(q.certificateUrl);
                                    const isPdf = !isImage;
                                    return (
                                      <>
                                        {isServerUrl ? (
                                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                                            {isImage ? (
                                              <img src={fullUrl} alt="Certificate" className="w-14 h-14 object-cover rounded-lg border-2 border-paa-navy/20 shadow-sm group-hover:border-paa-gold transition-colors" />
                                            ) : (
                                              <div className="w-14 h-14 bg-red-50 rounded-lg border-2 border-red-100 group-hover:border-paa-gold flex flex-col items-center justify-center shrink-0 transition-colors gap-0.5">
                                                <FileText className="w-5 h-5 text-red-500" />
                                                <span className="text-[8px] font-bold text-red-500 uppercase">PDF</span>
                                              </div>
                                            )}
                                          </a>
                                        ) : isImage ? (
                                          <img src={q.certificateUrl} alt="Certificate" className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm" />
                                        ) : (
                                          <div className="w-12 h-12 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-red-500" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-paa-navy truncate">{q.certificateBlob?.name || 'Certificate'}</p>
                                          {isServerUrl ? (
                                            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline">
                                              View {isPdf ? 'PDF' : 'Image'} ↗
                                            </a>
                                          ) : (
                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Uploaded ✓</p>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                  <button type="button" onClick={() => { const n = [...qualifications]; n[idx].certificateUrl = ''; n[idx].certificateBlob = null; setQualifications(n); }} className="ml-auto text-gray-400 hover:text-red-500 transition-colors shrink-0">
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <input
                              id={`cert-upload-${idx}`}
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const n = [...qualifications];
                                  n[idx].certificateBlob = file;
                                  n[idx].certificateUrl = URL.createObjectURL(file);
                                  const url = await uploadFileToServer(file);
                                  if (url) n[idx].certificateUrl = url;
                                  setQualifications(n);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dash-label">Date of Birth *</label>
                      <input type="date" value={form.dob} max={new Date().toISOString().split('T')[0]} onChange={(e) => update("dob", e.target.value)} className={`dash-input w-full ${errors.dob ? '!border-red-500' : ''}`} />
                      {errors.dob && <div className="text-red-500 text-xs mt-1 font-medium">{errors.dob}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Years of Experience *</label>
                      <input type="text" inputMode="numeric" value={form.experience} onChange={(e) => update("experience", e.target.value.replace(/\D/g, ''))} className={`dash-input w-full ${errors.experience ? '!border-red-500' : ''}`} placeholder="e.g. 5" />
                      {errors.experience && <div className="text-red-500 text-xs mt-1 font-medium">{errors.experience}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="dash-label">Group Joining Date <span className="font-normal opacity-70">(Optional, defaults to today)</span></label>
                      <input type="date" value={form.groupJoiningDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => update("groupJoiningDate", e.target.value)} className="dash-input w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dash-label">Skills * <span className="font-normal opacity-70">(Press Enter to add)</span></label>
                      <div className={`p-2 border rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all ${errors.skills ? 'border-red-500' : 'border-gray-200'} flex flex-wrap gap-2`}>
                        {form.skills && form.skills.map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-1 bg-[#ebd8c0] text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">
                            {s} <button type="button" onClick={() => update("skills", form.skills.filter((_: any, idx: number) => idx !== i))} className="hover:text-emerald-900"><X size={12}/></button>
                          </div>
                        ))}
                        <input type="text" enterKeyHint="enter" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = skillInput.trim().toLowerCase(); if (val && !(form.skills || []).map((s: string) => s.toLowerCase()).includes(val)) { update("skills", [...(form.skills || []), val]); } setSkillInput(""); } }} className="flex-1 min-w-[120px] outline-none text-sm bg-transparent" placeholder="Type and press Enter" />
                      </div>
                      {errors.skills && <div className="text-red-500 text-xs mt-1 font-medium">{errors.skills}</div>}
                      {getArrayDiffUi("skills", form.skills)}
                    </div>
                    <div>
                      <label className="dash-label">Hobbies * <span className="font-normal opacity-70">(Press Enter to add)</span></label>
                      <div className={`p-2 border rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all ${errors.hobbies ? 'border-red-500' : 'border-gray-200'} flex flex-wrap gap-2`}>
                        {form.hobbies && form.hobbies.map((h: string, i: number) => (
                          <div key={i} className="flex items-center gap-1 bg-paa-navy/5 text-paa-navy px-2.5 py-1 rounded-full text-xs font-medium">
                            {h} <button type="button" onClick={() => update("hobbies", form.hobbies.filter((_: any, idx: number) => idx !== i))} className="hover:text-paa-navy/70"><X size={12}/></button>
                          </div>
                        ))}
                        <input type="text" enterKeyHint="enter" value={hobbyInput} onChange={(e) => setHobbyInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = hobbyInput.trim().toLowerCase(); if (val && !(form.hobbies || []).map((h: string) => h.toLowerCase()).includes(val)) { update("hobbies", [...(form.hobbies || []), val]); } setHobbyInput(""); } }} className="flex-1 min-w-[120px] outline-none text-sm bg-transparent" placeholder="Type and press Enter" />
                      </div>
                      {errors.hobbies && <div className="text-red-500 text-xs mt-1 font-medium">{errors.hobbies}</div>}
                      {getArrayDiffUi("hobbies", form.hobbies)}
                    </div>
                  </div>

                  <div>
                    <label className="dash-label">Author Bio (100-150 words) *</label>
                    <textarea
                      placeholder="Tell us a little bit about yourself, your background, and your journey as a writer..."
                      value={form.bio}
                      onChange={(e) => update("bio", e.target.value)}
                      rows={5}
                      className={`dash-input w-full resize-y ${errors.bio ? '!border-red-500' : ''} ${getDiffClass("bio")}`}
                    />
                    <div className="flex justify-between items-start mt-1">
                      {errors.bio ? <div className="text-red-500 text-xs font-medium">{errors.bio}</div> : <div>{getDiffUi("bio")}</div>}
                      <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">
                        {form.bio.split(/\s+/).filter(Boolean).length} / 150 words (min 100)
                      </div>
                    </div>
                  </div>


                  {dynamicFields.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-paa-navy/5">
                      <h3 className="font-serif text-lg font-medium text-paa-navy mb-4">Additional Required Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {dynamicFields.map(f => (
                          <div key={f.name}>
                            <label className="dash-label">{f.name} *</label>
                            {f.type === 'number' ? (
                              <input type="number" onWheel={(e) => (e.target as HTMLElement).blur()} required className="dash-input w-full" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                            ) : f.type === 'date' ? (
                              <input type="date" required className="dash-input w-full" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                            ) : (
                              <input type="text" required className="dash-input w-full" value={extraDataState[f.name] || ''} onChange={e => setExtraDataState({ ...extraDataState, [f.name]: e.target.value })} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
                    {/* Author photo upload */}
                    <div>
                      <label className="dash-label">Author Photo *</label>
                      <div
                        className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                        onClick={() => document.getElementById("author-photo")?.click()}
                      >
                        {authorPhotoUrl ? (
                          <div className="flex flex-col items-center gap-3">
                            <img src={authorPhotoUrl} alt="preview" className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-emerald-500/20" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Photo Uploaded</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-paa-navy/40 mb-3" />
                            <div className="text-sm font-medium text-paa-navy mb-1">Click to upload headshot</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">JPG, PNG up to 5MB</div>
                          </>
                        )}
                      </div>
                      <input
                        id="author-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAuthorPhotoUrl(URL.createObjectURL(file));
                            setAuthorBlob(file);
                            const url = await uploadFileToServer(file);
                            if (url) setExtraDataState(prev => ({ ...prev, draftPhotoUrl: url }));
                          }
                        }}
                      />
                      {getImageDiffUi("photoUrl", authorPhotoUrl)}
                    </div>

                    {/* QR Code upload */}
                    <div>
                      <label className="dash-label">Your Payment QR Code * <span className="font-normal normal-case tracking-normal opacity-70">(Shown to customers for direct payment)</span></label>
                      <div
                        className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                        onClick={() => document.getElementById("qr-code-upload")?.click()}
                      >
                        {qrCodeUrl ? (
                          <div className="flex flex-col items-center gap-3">
                            <img src={qrCodeUrl} alt="QR preview" className="w-16 h-16 object-contain rounded-lg border border-paa-navy/10 bg-white" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">QR Code Uploaded</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-paa-navy/40 mb-3" />
                            <div className="text-sm font-medium text-paa-navy mb-1">Click to upload UPI/Bank QR</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">PNG, JPG up to 5MB</div>
                          </>
                        )}
                      </div>
                      <input
                        id="qr-code-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setQrCodeUrl(URL.createObjectURL(file));
                            setQrCodeBlob(file);
                            const url = await uploadFileToServer(file);
                            if (url) setExtraDataState(prev => ({ ...prev, draftQrUrl: url }));
                          }
                        }}
                      />
                      {getImageDiffUi("qrCodeUrl", qrCodeUrl)}
                    </div>

                </div>
              </div>
            </div>
            )}

            {/* Form Step 1: Book Details */}
            {formStepIndex === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Book Details</h2>
                <p className="text-sm text-paa-gray-text mb-8">Information about the book(s) you wish to receive support in self-publishing or register with PAA.</p>

                {books.length > 0 && (
                  <div className="mb-8 flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Added Books ({books.length})</h3>
                    {books.map((b, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-paa-navy/10 flex items-center gap-3 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-paa-navy text-sm mb-0.5 truncate flex items-center gap-2">
                            {b.title}
                            {b.status === 'Pending' && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm border border-blue-200">NEW</span>}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">{b.genre} {b.subcategory && `> ${b.subcategory}`}</div>
                        </div>
                        {(b.coverFileUrl || b.coverUrl) && <img src={b.coverFileUrl || `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.coverUrl}`} alt="cover" className="h-12 w-9 object-cover rounded shadow-sm border border-paa-navy/10 flex-shrink-0" />}
                        <button type="button" onClick={() => handleEditAddedBook(idx)} className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 hover:bg-[#ebd8c0] text-blue-500 hover:text-blue-700 flex items-center justify-center transition-colors" title="Edit book">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setBooks(books.filter((_, i2) => i2 !== idx))} className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors" title="Remove book">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`space-y-6 ${books.length > 0 ? 'p-8 bg-gray-50/50 rounded-3xl-2xl border border-paa-navy/5' : ''}`}>
                  {books.length > 0 && !showAddBookForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        editingBookIndexRef.current = null;
                        setShowAddBookForm(true);
                      }}
                      className="px-6 py-2.5 bg-paa-navy text-white hover:bg-paa-navy/90 transition-colors rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Book
                    </button>
                  ) : (
                    <>
                      {books.length > 0 && <h3 className="font-serif text-lg font-medium text-paa-navy mb-2">Add Another Book</h3>}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="dash-label">Book Title *</label>
                      <input type="text" placeholder="e.g. The Forgotten Horizon" value={form.title} onChange={(e) => update("title", e.target.value)} className={`dash-input w-full ${errors.title ? '!border-red-500' : ''}`} />
                      {errors.title && <div className="text-red-500 text-xs mt-1 font-medium">{errors.title}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Subtitle</label>
                      <input type="text" placeholder="e.g. A Journey Through Time" value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} className="dash-input w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="dash-label">Category *</label>
                      <select value={form.genre} onChange={(e) => { update("genre", e.target.value); update("subcategory", ""); update("subSubcategory", ""); }} className={`dash-input w-full ${errors.genre ? '!border-red-500' : ''}`}>
                        <option value="">Select Category</option>
                        {Object.keys(bookCategories).sort((a, b) => a.localeCompare(b)).map(c => <option key={c} value={c}>{c}</option>)}
<option value="Other">Other</option>
                      </select>
                      {errors.genre && <div className="text-red-500 text-xs mt-1 font-medium">{errors.genre}</div>}
                    </div>
                    {form.genre && Object.keys(bookCategories[form.genre as keyof typeof bookCategories] || {}).length > 0 && (
                      <div>
                        <label className="dash-label">Subcategory</label>
                        <select value={form.subcategory} onChange={(e) => { update("subcategory", e.target.value); update("subSubcategory", ""); }} className="dash-input w-full">
                          <option value="">Select Subcategory</option>
                          {Object.keys(bookCategories[form.genre as keyof typeof bookCategories] || {}).sort((a, b) => a.localeCompare(b)).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                        </select>
                      </div>
                    )}
                    {form.genre && form.subcategory && ((bookCategories[form.genre as keyof typeof bookCategories] as any)[form.subcategory] || []).length > 0 && (
                      <div>
                        <label className="dash-label">Specific Genre</label>
                        <select value={form.subSubcategory} onChange={(e) => update("subSubcategory", e.target.value)} className="dash-input w-full">
                          <option value="">Select Specific Genre</option>
                          {[...((bookCategories[form.genre as keyof typeof bookCategories] as any)[form.subcategory] || [])].sort((a, b) => a.localeCompare(b)).map((ssc: string) => <option key={ssc} value={ssc}>{ssc}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="dash-label">Synopsis (100 words) *</label>
                    <textarea
                      placeholder="A compelling description of your book — what it's about, who it's for, and what makes it unique..."
                      value={form.synopsis}
                      onChange={(e) => update("synopsis", e.target.value)}
                      rows={5}
                      className={`dash-input w-full resize-y ${errors.synopsis ? '!border-red-500' : ''}`}
                    />
                    <div className="flex justify-between items-start mt-1">
                      {errors.synopsis ? <div className="text-red-500 text-xs font-medium">{errors.synopsis}</div> : <div></div>}
                      <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">
                        {form.synopsis.split(/\s+/).filter(Boolean).length} / 100 words
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="dash-label">Write the purpose of writing the book *</label>
                    <textarea value={form.purposeOfWriting} onChange={(e) => update("purposeOfWriting", e.target.value)} rows={3} className={`dash-input w-full resize-y ${errors.purposeOfWriting ? '!border-red-500' : ''}`} placeholder="What inspired you to write?" />
                    {errors.purposeOfWriting && <div className="text-red-500 text-xs mt-1 font-medium">{errors.purposeOfWriting}</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="dash-label">Language *</label>
                      <select value={form.language} onChange={(e) => update("language", e.target.value)} className={`dash-input w-full ${errors.language ? '!border-red-500' : ''}`}>
                        <option value="">Select Language</option>
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      {errors.language && <div className="text-red-500 text-xs mt-1 font-medium">{errors.language}</div>}
                    </div>
                    <div>
                      <label className="dash-label flex items-center justify-between">
                        Publisher Name *
                        <label className="flex items-center gap-1.5 text-xs font-normal cursor-pointer lowercase text-gray-500"><input type="checkbox" checked={form.isSelfPublished === 'yes'} onChange={(e) => { update('isSelfPublished', e.target.checked ? 'yes' : 'no'); if(e.target.checked) update('publisher', 'Self Published'); else update('publisher', ''); }} className="w-3 h-3"/> I am Self Published</label>
                      </label>
                      <input type="text" placeholder="e.g. Penguin" value={form.publisher} onChange={(e) => update("publisher", e.target.value)} className={`dash-input w-full ${errors.publisher ? '!border-red-500' : ''}`} disabled={form.isSelfPublished === 'yes'} />
                      {errors.publisher && <div className="text-red-500 text-xs mt-1 font-medium">{errors.publisher}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Publication Date *</label>
                      <input type="date" max={new Date().toISOString().split('T')[0]} value={form.publicationDate} onChange={(e) => update("publicationDate", e.target.value)} className={`dash-input w-full ${errors.publicationDate ? '!border-red-500' : ''}`} />
                      {errors.publicationDate && <div className="text-red-500 text-xs mt-1 font-medium">{errors.publicationDate}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="dash-label">ISBN Number *</label>
                      <input type="text" inputMode="numeric" placeholder="10 or 13 digit ISBN" value={form.isbn} onChange={(e) => update("isbn", e.target.value.replace(/\D/g, ''))} maxLength={13} className={`dash-input w-full ${errors.isbn ? '!border-red-500' : ''}`} />
                      {errors.isbn && <div className="text-red-500 text-xs mt-1 font-medium">{errors.isbn}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Edition</label>
                      <input type="text" inputMode="numeric" placeholder="e.g. 1" value={form.edition} onChange={(e) => update("edition", e.target.value.replace(/\D/g, ''))} className="dash-input w-full" />
                    </div>
                    <div>
                      <label className="dash-label">Book Format *</label>
                      <select value={form.format} onChange={(e) => update("format", e.target.value)} className={`dash-input w-full ${errors.format ? '!border-red-500' : ''}`}>
                        <option value="">Select Format</option>
                        <option value="Paperback">Paperback</option>
                        <option value="Hardcover">Hardcover</option>
                        <option value="Ebook">Ebook</option>
                      </select>
                      {errors.format && <div className="text-red-500 text-xs mt-1 font-medium">{errors.format}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Print Format *</label>
                      <select value={form.printFormat} onChange={(e) => update("printFormat", e.target.value)} className={`dash-input w-full ${errors.printFormat ? '!border-red-500' : ''}`}>
                        <option value="">Select Print Format</option>
                        <option value="Black & White">Black & White</option>
                        <option value="Colored">Colored</option>
                      </select>
                      {errors.printFormat && <div className="text-red-500 text-xs mt-1 font-medium">{errors.printFormat}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="dash-label">Number of Pages *</label>
                      <input type="text" inputMode="numeric" placeholder="256" value={form.pages} onChange={(e) => update("pages", e.target.value.replace(/\D/g, ''))} className={`dash-input w-full ${errors.pages ? '!border-red-500' : ''}`} />
                      {errors.pages && <div className="text-red-500 text-xs mt-1 font-medium">{errors.pages}</div>}
                    </div>
                    <div>
                      <label className="dash-label">MRP (₹) *</label>
                      <input type="number" onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="299" value={form.mrp} onChange={(e) => update("mrp", e.target.value)} className={`dash-input w-full ${errors.mrp ? '!border-red-500' : ''}`} />
                      {errors.mrp && <div className="text-red-500 text-xs mt-1 font-medium">{errors.mrp}</div>}
                    </div>
                    <div>
                      <label className="dash-label">Initial Stock *</label>
                      <input type="number" onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0" value={form.stock} onChange={(e) => update("stock", e.target.value)} className="dash-input w-full" />
                    </div>
                  </div>

                  {(() => {
                     const pages = Number(form.pages);
                     const mrp = Number(form.mrp);
                     if (pages > 0 && form.printFormat && mrp > 0) {
                        const rate = form.printFormat === 'Colored' ? 2.40 : 0.50;
                        const maxPrice = (pages * rate) + 250;
                        if (mrp > maxPrice) {
                           return <div className="text-yellow-700 text-xs font-bold bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-2 mb-4">Warning: Your MRP (₹{mrp}) exceeds the recommended max price of ₹{maxPrice} based on your pages and format.</div>;
                        }
                     }
                     return null;
                  })()}

                  {/* Cover upload */}
                  <div className="pt-2">
                    <label className="dash-label">Book Cover Upload *</label>
                    <div
                      className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center"
                      onClick={() => document.getElementById("cover-upload")?.click()}
                    >
                      {coverFileUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={coverFileUrl} alt="cover preview" className="h-24 object-contain rounded shadow-sm border border-paa-navy/10 bg-white" />
                          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Cover Uploaded</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-paa-navy/40 mb-3" />
                          <div className="text-sm font-medium text-paa-navy mb-1">Upload Book Cover</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">High resolution JPG or PNG, ideally 1600×2400px</div>
                        </>
                      )}
                    </div>
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverFileUrl(URL.createObjectURL(file));
                          setCoverBlob(file);
                          const url = await uploadFileToServer(file);
                          if (url) setForm(prev => ({ ...prev, draftCoverUrl: url }));
                        }
                      }}
                    />
                  </div>

                  {/* Back Cover upload */}
                  <div className="pt-2">
                    <label className="dash-label">Book Back Cover Upload *</label>
                    <div
                      className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center"
                      onClick={() => document.getElementById("back-cover-upload")?.click()}
                    >
                      {backCoverFileUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={backCoverFileUrl} alt="back cover preview" className="h-24 object-contain rounded shadow-sm border border-paa-navy/10 bg-white" />
                          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Back Cover Uploaded</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-paa-navy/40 mb-3" />
                          <div className="text-sm font-medium text-paa-navy mb-1">Upload Book Back Cover</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text">High resolution JPG or PNG, ideally 1600×2400px</div>
                        </>
                      )}
                    </div>
                    <input
                      id="back-cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBackCoverFileUrl(URL.createObjectURL(file));
                          setBackCoverBlob(file);
                          const url = await uploadFileToServer(file);
                          if (url) setForm(prev => ({ ...prev, draftBackCoverUrl: url }));
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-end mt-4 gap-3">
                    {books.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, title: "", subtitle: "", genre: "", subcategory: "", subSubcategory: "", synopsis: "", pages: "", mrp: "", stock: "0", language: "", isbn: "", publisher: "", publicationDate: "", edition: "", format: "", printFormat: "", purposeOfWriting: "", draftCoverUrl: "", draftBackCoverUrl: "" });
                          setErrors(prev => { const n = {...prev}; ['title','genre','synopsis','pages','mrp','language','isbn','publisher','publicationDate','format','printFormat','purposeOfWriting'].forEach(k => delete n[k]); return n; });
                          setCoverBlob(null);
                          setBackCoverBlob(null);
                          setCoverFileUrl(null);
                          setBackCoverFileUrl(null);
                          editingBookIndexRef.current = null;
                          setStep(2);
                        }}
                        className="px-4 py-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        <X className="w-3 h-3" /> Cancel & Continue
                      </button>
                    )}
                    {books.length > 0 && showAddBookForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, title: "", subtitle: "", genre: "", subcategory: "", subSubcategory: "", synopsis: "", pages: "", mrp: "", stock: "0", language: "", isbn: "", publisher: "", publicationDate: "", edition: "", format: "", printFormat: "", purposeOfWriting: "", draftCoverUrl: "", draftBackCoverUrl: "" });
                          setErrors(prev => { const n = {...prev}; ['title','genre','synopsis','pages','mrp','language','isbn','publisher','publicationDate','format','printFormat','purposeOfWriting'].forEach(k => delete n[k]); return n; });
                          setCoverBlob(null);
                          setBackCoverBlob(null);
                          setCoverFileUrl(null);
                          setBackCoverFileUrl(null);
                          editingBookIndexRef.current = null;
                          setShowAddBookForm(false);
                        }}
                        className="px-4 py-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const missingBookFields = [];
                        if (!form.title) missingBookFields.push('Title');
                        if (!form.genre) missingBookFields.push('Category');
                        if (!form.synopsis) missingBookFields.push('Synopsis');
                        if (!form.mrp) missingBookFields.push('MRP');
                        if (!form.language) missingBookFields.push('Language');
                        if (!form.publisher) missingBookFields.push('Publisher');
                        if (!form.publicationDate) missingBookFields.push('Publication Date');
                        if (!form.format) missingBookFields.push('Format');
                        if (!form.purposeOfWriting) missingBookFields.push('Purpose of Writing');
                        if (!form.printFormat) missingBookFields.push('Print Format');
                        if (!form.pages) missingBookFields.push('Pages');
                        if (!form.isbn) missingBookFields.push('ISBN');
                        if (!coverBlob && !coverFileUrl) missingBookFields.push('Book Front Cover');
                        if (!backCoverBlob && !backCoverFileUrl) missingBookFields.push('Book Back Cover');
                        if (missingBookFields.length > 0) {
                          alert(`Please fill these missing fields: ${missingBookFields.join(', ')}`);
                          return;
                        }
                        if (form.synopsis.split(/\s+/).filter(Boolean).length > 100) {
                          alert("Synopsis cannot exceed 100 words.");
                          return;
                        }
                        const newBookData = { ...form, coverBlob, backCoverBlob, coverFileUrl, backCoverFileUrl };
                        if (editingBookIndexRef.current !== null) {
                          const updatedBooks = [...books];
                          updatedBooks[editingBookIndexRef.current] = { ...updatedBooks[editingBookIndexRef.current], ...newBookData };
                          setBooks(updatedBooks);
                          editingBookIndexRef.current = null;
                        } else {
                          setBooks([...books, newBookData]);
                        }
                        
                        setForm({ ...form, title: "", subtitle: "", genre: "", subcategory: "", subSubcategory: "", synopsis: "", pages: "", mrp: "", stock: "0", language: "", isbn: "", publisher: "", publicationDate: "", edition: "", format: "", printFormat: "", purposeOfWriting: "", draftCoverUrl: "", draftBackCoverUrl: "" });
                        setErrors(prev => { const n = {...prev}; ['title','genre','synopsis','pages','mrp','language','isbn','publisher','publicationDate','format','printFormat','purposeOfWriting'].forEach(k => delete n[k]); return n; });
                        setCoverBlob(null);
                        setBackCoverBlob(null);
                        setCoverFileUrl(null);
                        setBackCoverFileUrl(null);
                        setShowAddBookForm(false);
                      }}
                      className="px-4 py-2 bg-[#ebd8c0] text-emerald-700 border border-emerald-200 hover:bg-[#ebd8c0] hover:border-emerald-300 transition-colors rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Save & Add Another Book
                    </button>
                  </div>
                </>
              )}

              {/* Conditionally show whyJoining if traditionally published */}
              {(books.some((b: any) => b.publisher && b.publisher.trim() !== '' && b.publisher.toLowerCase().trim() !== 'self published') || (showAddBookForm && form.publisher && form.publisher.trim() !== '' && form.publisher.toLowerCase().trim() !== 'self published')) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <label className="dash-label text-blue-900">Since you have a traditionally published book, why are you joining this group and what priority will you give to this group? *</label>
                  <textarea value={form.whyJoining} onChange={(e) => update("whyJoining", e.target.value)} rows={3} className={`dash-input w-full resize-y ${errors.whyJoining ? '!border-red-500' : ''} ${getDiffClass("whyJoining")} bg-white`} placeholder="Please explain your reasons..." />
                  {errors.whyJoining && <div className="text-red-500 text-xs mt-1 font-medium">{errors.whyJoining}</div>}
                  {getDiffUi("whyJoining")}
                </div>
              )}
                </div>
              </div>
            )}

            {/* Form Step 2: Questionnaire & Declarations */}
            {formStepIndex === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Declarations & Guidelines</h2>
                <p className="text-sm text-paa-gray-text mb-8">Please agree to the PAA guidelines and sign the conflict of interest declaration.</p>

                  <div className="space-y-8">
                    {/* The whyJoining question has been moved to Step 1 (Books section) */}

                  <div className="p-5 bg-gray-50 border border-paa-navy/10 rounded-2xl space-y-4">
                    <h3 className="font-serif font-medium text-paa-navy">Declarations</h3>

                    <div className="flex items-start gap-3 cursor-pointer group" onClick={() => { if (!form.agreedToGuidelines) setShowGuidelines(true); else update("agreedToGuidelines", false); }}>
                      <div className="mt-0.5">
                        <input type="checkbox" checked={form.agreedToGuidelines} readOnly className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
                      </div>
                      <div className="text-sm text-paa-navy font-medium">
                        I have read and agree to the <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowGuidelines(true); }} className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Group Guidelines</button> *
                      </div>
                    </div>

                    <div className="flex items-start gap-3 cursor-pointer group" onClick={() => { if (!form.agreedToInfoDoc) { window.open(charterPdf, '_blank'); update("agreedToInfoDoc", true); } else update("agreedToInfoDoc", false); }}>
                      <div className="mt-0.5">
                        <input type="checkbox" checked={form.agreedToInfoDoc} readOnly className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
                      </div>
                      <div className="text-sm text-paa-navy font-medium">
                        I have read the <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(charterPdf, '_blank'); update("agreedToInfoDoc", true); }} className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Group Information Document</button> *
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="dash-label">Sign for not having any conflict of interest *</label>
                    <input type="text" value={form.conflictOfInterestSignature} onChange={(e) => update("conflictOfInterestSignature", e.target.value)} className={`dash-input w-full font-serif italic text-lg ${errors.conflictOfInterestSignature ? '!border-red-500' : ''}`} placeholder="Type your full legal name as digital signature" />
                    {errors.conflictOfInterestSignature && <div className="text-red-500 text-xs mt-1 font-medium">{errors.conflictOfInterestSignature}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Form Step 3: Payment & Submit */}
            {formStepIndex === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-serif text-2xl font-medium text-paa-navy mb-2">Application Fee Payment</h2>
                <p className="text-sm text-paa-gray-text mb-8">A one-time joining fee of ₹3000 (₹2000 registration + ₹1000 website charges) secures your PAA membership and editorial review.</p>

                <div className="flex flex-col items-center mb-10">
                  <div className="p-2 bg-white rounded-2xl border border-paa-navy/10 shadow-sm mb-4">
                    <img src={qrCode} alt="Payment QR" className="w-48 h-48 object-cover rounded-xl" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-paa-navy bg-paa-gold/20 px-4 py-1.5 rounded-full">Scan QR to Pay ₹3000</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="dash-label">Transaction ID *</label>
                    <input type="text" required placeholder="e.g. T23456789012" value={form.transactionId} onChange={(e) => update("transactionId", e.target.value)} className={`dash-input w-full ${errors.transactionId ? '!border-red-500' : ''}`} />
                    {errors.transactionId && <div className="text-red-500 text-xs mt-1 font-medium">{errors.transactionId}</div>}

                    <div className="mt-8 bg-[#ebd8c0]/50 border border-emerald-100 rounded-2xl p-5 text-sm text-emerald-800 leading-relaxed shadow-sm">
                      <strong className="font-bold text-emerald-900 block mb-1">Application Fee: ₹3000</strong>
                      <span className="opacity-90 text-xs">Your application will be reviewed within 5-7 business days. You will be notified via email once approved.</span>
                    </div>
                  </div>
                  <div>
                    <label className="dash-label">Payment Screenshot *</label>
                    <div
                      className="border border-dashed border-paa-navy/20 rounded-3xl-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
                      onClick={() => document.getElementById("payment-screenshot-upload")?.click()}
                    >
                      {paymentScreenshotUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={paymentScreenshotUrl} alt="screenshot preview" className="h-16 object-contain rounded shadow-sm border border-paa-navy/10 bg-white" />
                          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Screenshot Uploaded</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-paa-navy/40 mb-3" />
                          <div className="text-sm font-medium text-paa-navy mb-1">Upload payment screenshot</div>
                        </>
                      )}
                    </div>
                    <input
                      id="payment-screenshot-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPaymentScreenshotUrl(URL.createObjectURL(file));
                          setPaymentBlob(file);
                          const url = await uploadFileToServer(file);
                          if (url) setExtraDataState(prev => ({ ...prev, draftPaymentUrl: url }));
                        }
                      }}
                    />
                      {getImageDiffUi("paymentScreenshot", paymentScreenshotUrl)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-10 pt-8 border-t border-paa-navy/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${step === 0 ? "text-gray-300 cursor-default" : "text-paa-navy hover:bg-gray-100 active:scale-95 border border-paa-navy/10"}`}
                >
                  <ChevronLeft size={14} /> Back
                </button>
                {localStorage.getItem('token') && !isAdminEdit && !isAuthorEdit && (
                  <button type="button" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 text-red-600 hover:bg-red-50 border border-red-100">
                    <LogOut size={14} /> Logout
                  </button>
                )}
              </div>

              {step < currentSteps.length - 1 ? (
                <div className="flex gap-3 flex-1 w-full justify-end">
                  <button
                    onClick={() => {
                    if (formStepIndex === 1 && !isAdminEdit) {
                      const hasPartialBook = form.title || form.genre || form.synopsis || form.mrp || form.pages || form.isbn;
                      if (hasPartialBook) {
                        const missingContinueFields = [];
                        if (!form.title) missingContinueFields.push('Title');
                        if (!form.genre) missingContinueFields.push('Category');
                        if (!form.synopsis) missingContinueFields.push('Synopsis');
                        if (!form.mrp || parseFloat(form.mrp) <= 0) missingContinueFields.push('MRP (> 0)');
                        if (!form.stock || parseInt(form.stock) < 0) missingContinueFields.push('Initial Stock (>= 0)');
                        if (!form.language) missingContinueFields.push('Language');
                        if (!form.publisher) missingContinueFields.push('Publisher');
                        if (!form.publicationDate) missingContinueFields.push('Publication Date');
                        if (!form.format) missingContinueFields.push('Format');
                        if (!form.purposeOfWriting) missingContinueFields.push('Purpose of Writing');
                        if (!form.printFormat) missingContinueFields.push('Print Format');
                        if (!form.pages) missingContinueFields.push('Pages');
                        if (!form.isbn) missingContinueFields.push('ISBN');
                        if (!coverBlob && !coverFileUrl) missingContinueFields.push('Book Front Cover');
                        if (!backCoverBlob && !backCoverFileUrl) missingContinueFields.push('Book Back Cover');
                        if (missingContinueFields.length > 0) {
                          alert(`Please fill these missing fields: ${missingContinueFields.join(', ')}`);
                          return;
                        }
                        if (form.synopsis.split(/\s+/).filter(Boolean).length > 100) {
                          alert("Synopsis cannot exceed 100 words.");
                          return;
                        }
                        const newBookData = { ...form, coverBlob, backCoverBlob, coverFileUrl, backCoverFileUrl };
                        if (editingBookIndexRef.current !== null) {
                          const updatedBooks = [...books];
                          updatedBooks[editingBookIndexRef.current] = { ...updatedBooks[editingBookIndexRef.current], ...newBookData };
                          setBooks(updatedBooks);
                          editingBookIndexRef.current = null;
                        } else {
                          setBooks([...books, newBookData]);
                        }
                        setForm({ ...form, title: "", subtitle: "", genre: "", subcategory: "", subSubcategory: "", synopsis: "", pages: "", mrp: "", stock: "0", language: "", isbn: "", publisher: "", publicationDate: "", edition: "", format: "", printFormat: "", purposeOfWriting: "" });
                        setErrors(prev => { const n = {...prev}; ['title','genre','synopsis','pages','mrp','language','isbn','publisher','publicationDate','format','printFormat','purposeOfWriting'].forEach(k => delete n[k]); return n; });
                        setCoverBlob(null);
                        setBackCoverBlob(null);
                        setCoverFileUrl(null);
                        setBackCoverFileUrl(null);
                        setShowAddBookForm(false);
                      } else if (books.length === 0) {
                        alert("Please fill all compulsory fields for at least one book.");
                        return;
                      } else {
                        const invalidBook = books.find((b: any) => !b.purposeOfWriting && !b.purpose);
                        if (invalidBook) {
                          alert(`The book "${invalidBook.title}" is missing the Purpose of Writing. Please edit the book and fill it in.`);
                          return;
                        }
                      }
                    }
                    if (formStepIndex === 2 && !isAdminEdit) {
                      if (!form.conflictOfInterestSignature || !form.agreedToGuidelines || !form.agreedToInfoDoc) {
                        alert("Please agree to the declarations and sign the conflict of interest statement.");
                        return;
                      }
                    }
                    
                    // Add whyJoining validation for Step 1
                    if (formStepIndex === 1) {
                       const hasTraditional = books.some((b: any) => b.publisher && b.publisher.trim() !== '' && b.publisher.toLowerCase().trim() !== 'self published') || (showAddBookForm && form.publisher && form.publisher.trim() !== '' && form.publisher.toLowerCase().trim() !== 'self published');
                       if (hasTraditional && (!form.whyJoining || !form.whyJoining.trim())) {
                          alert("Please explain why you are joining this group.");
                          return;
                       }
                    }
                    setStep((s) => Math.min(currentSteps.length - 1, s + 1));
                  }}
                  className="dash-btn dash-btn-primary rounded-full px-6 py-2.5 flex items-center gap-2"
                >
                  Continue <ChevronRight size={14} />
                </button>
                {isAdminEdit && (
                  <button
                    type="button"
                    onClick={onAdminReject}
                    className="dash-btn px-6 py-2.5 rounded-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-premium hover:-translate-y-0.5 ml-auto"
                  >
                    <X className="w-4 h-4" /> Reject Application
                  </button>
                )}
              </div>
              ) : (
                <div className="flex gap-3">
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    // Step 0 Validations
                    const bioWordCount = form.bio.split(/\s+/).filter(Boolean).length;
                    const missingProfileFields = [];
                    if (!form.name) missingProfileFields.push('Name');
                    if (!form.email) missingProfileFields.push('Email');
                    if (!form.phone) missingProfileFields.push('Phone');
                    if (!isReapply && !isAdminEdit && !localStorage.getItem('token') && !form.password) missingProfileFields.push('Password');
                    if (!form.bio) missingProfileFields.push('Bio');
                    if (form.bio && (bioWordCount < 100 || bioWordCount > 150)) missingProfileFields.push(`Bio word count (currently ${bioWordCount}, needs 100-150)`);
                    if (!authorBlob && !authorPhotoUrl) missingProfileFields.push('Author Photo');
                    if (!form.address) missingProfileFields.push('Address');
                    if (!form.pincode) missingProfileFields.push('Pincode');
                    if (!form.city) missingProfileFields.push('City');
                    if (!form.state) missingProfileFields.push('State');
                    if (!form.aadharNumber) missingProfileFields.push('Aadhar/Voter ID/DL');
                    if (!form.dob) missingProfileFields.push('Date of Birth');
                    if (!form.experience) missingProfileFields.push('Years of Experience');
                    if (!form.skills || form.skills.length === 0) missingProfileFields.push('Skills');
                    if (!form.hobbies || form.hobbies.length === 0) missingProfileFields.push('Hobbies');
                    
                    if (missingProfileFields.length > 0) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert(`Author Profile: Please fix these fields — ${missingProfileFields.join(', ')}`); return;
                    }
                    for (const q of qualifications) {
                      if (!q.qualification || !q.institution || !q.subject || !q.mode) {
                        setStep(isOnboardingMode ? 3 : 0);
                        alert("Please fill all qualification fields (Qualification, Institution, Subject, Mode of Degree) correctly."); return;
                      }
                      if (!q.certificateBlob && !q.certificateUrl) {
                        setStep(isOnboardingMode ? 3 : 0);
                        alert(`Please upload the Certificate for qualification: ${q.qualification || 'the required qualification'}.`); return;
                      }
                    }
                    if (!qrCodeBlob && !qrCodeUrl) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Author Profile: Please upload your personal UPI/Bank QR Code for receiving payments."); return;
                    }
                    if (dynamicFields.length > 0) {
                      for (const f of dynamicFields) {
                        if (!extraDataState[f.name]) {
                          setStep(isOnboardingMode ? 3 : 0);
                          alert(`Please fill the required field: ${f.name}`); return;
                        }
                      }
                    }
                    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Please enter a valid email address."); return;
                    }
                    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Please enter a valid 10-digit phone number."); return;
                    }
                    // Step 1 Validations
                    if (form.linkedin && !/^(https?:\/\/|www\.)/.test(String(form.linkedin))) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Enter valid url starting with www."); return;
                    }
                    if (form.facebook && !/^(https?:\/\/|www\.)/.test(String(form.facebook))) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Facebook must be a valid URL starting with http://, https://, or www."); return;
                    }
                    if (form.youtube && !/^(https?:\/\/|www\.)/.test(String(form.youtube))) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("YouTube must be a valid URL starting with http://, https://, or www."); return;
                    }
                    if (form.instagram && !/^(https?:\/\/|www\.)/.test(String(form.instagram)) && !String(form.instagram).startsWith('@')) {
                      setStep(isOnboardingMode ? 3 : 0);
                      alert("Instagram must be a valid URL or @username"); return;
                    }

                    const hasDraftBook = form.title || form.synopsis || form.isbn;
                    if (hasDraftBook && showAddBookForm) {
                      setStep(isOnboardingMode ? 4 : 1);
                      alert("You have unsaved book details in the form. Please click 'Save & Add Another Book' to include it, or clear the form before submitting.");
                      return;
                    }

                    const hasFirstBook = form.title && form.genre && form.mrp && (coverBlob || coverFileUrl) && (backCoverBlob || backCoverFileUrl) && form.purposeOfWriting && form.pages && form.isbn && form.synopsis.split(/\s+/).filter(Boolean).length <= 100;
                    const hasBook = books.length > 0 || hasFirstBook;
                    if (!hasBook) {
                      setStep(isOnboardingMode ? 4 : 1);
                      alert("Please fill all compulsory fields for at least one book (including ISBN, Pages, purpose of writing) and upload both front and back covers."); return;
                    }
                    if (books.length > 0) {
                      const invalidBook = books.find((b: any) => !b.purposeOfWriting && !b.purpose);
                      if (invalidBook) {
                        setStep(isOnboardingMode ? 4 : 1);
                        alert(`The book "${invalidBook.title}" is missing the Purpose of Writing. Please edit the book and fill it in before submitting.`);
                        return;
                      }
                    }

                    // Global validaton for whyJoining on submit
                    const hasTraditionalGlobal = books.some((b: any) => b.publisher && b.publisher.trim() !== '' && b.publisher.toLowerCase().trim() !== 'self published');
                    if (hasTraditionalGlobal && (!form.whyJoining || !form.whyJoining.trim())) {
                      setStep(isOnboardingMode ? 4 : 1);
                      alert("Please explain why you are joining this group in the Books step."); return;
                    }

                    // Step 2 Validations
                    if (!form.conflictOfInterestSignature || !form.agreedToGuidelines || !form.agreedToInfoDoc) {
                      setStep(isOnboardingMode ? 5 : 2);
                      alert("Please agree to the declarations and sign the conflict of interest statement."); return;
                    }

                    // Step 3 Validations
                    const missingPaymentFields = [];
                    if (!form.transactionId) missingPaymentFields.push('Transaction ID');
                    if (!paymentBlob && !paymentScreenshotUrl) missingPaymentFields.push('Payment Screenshot');
                    if (missingPaymentFields.length > 0) {
                      alert(`Payment: Please provide — ${missingPaymentFields.join(', ')}`);
                      return;
                    }


                    const activeErrors = { ...errors };
                    if (books.length > 0 && !showAddBookForm) {
                      ['title','genre','synopsis','pages','mrp','language','isbn','publisher','publicationDate','format','printFormat','purposeOfWriting'].forEach(k => delete activeErrors[k]);
                    }
                    if (Object.values(activeErrors).some(err => typeof err === 'string' && err.trim() !== "")) {
                      console.log("Validation errors blocking submit:", activeErrors);
                      alert("Please fix all validation errors before submitting.");
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      const formData = new FormData();
                      Object.entries(form).forEach(([key, val]) => {
                        const bookKeys = ['subcategory', 'subSubcategory', 'title', 'genre', 'synopsis', 'pages', 'mrp', 'stock', 'subtitle', 'language', 'isbn', 'publisher', 'publicationDate', 'edition', 'format'];
                        if (!bookKeys.includes(key)) {
                          if (key === 'skills' || key === 'hobbies') {
                            formData.append(key, JSON.stringify(val));
                          } else {
                            formData.append(key, String(val));
                          }
                        }
                      });


                      const finalBooks = [...books];
                      if (form.title && form.genre && form.mrp) {
                        finalBooks.push({ ...form, coverBlob, backCoverBlob });
                      }

                      formData.append("books", JSON.stringify(finalBooks.map(b => {
                        let subGenre = b.subcategory;
                        if (b.subSubcategory) subGenre += ' > ' + b.subSubcategory;
                        return {
                          id: b.id,
                          title: b.title,
                          subtitle: b.subtitle,
                          genre: b.genre,
                          subGenre: subGenre,
                          synopsis: b.synopsis,
                          pages: b.pages,
                          mrp: b.mrp,
                          stock: b.stock,
                          language: b.language,
                          isbn: b.isbn,
                          publisher: b.publisher,
                          publicationDate: b.publicationDate,
                          edition: b.edition,
                          format: b.format,
                          printFormat: b.printFormat,
                          purpose: b.purposeOfWriting || b.purpose
                        };
                      })));

                      // Compress all images before upload to prevent 413 errors
                      const compressOpts = { maxWidth: 1920, maxHeight: 1920, quality: 0.82, outputType: 'image/jpeg' as const };

                      if (authorBlob) {
                        const compressed = await compressImage(authorBlob, compressOpts);
                        formData.append("photo", compressed, compressed.name);
                      } else if (extraDataState.draftPhotoUrl) {
                        formData.append("photoUrl", extraDataState.draftPhotoUrl);
                      }

                      let fallbackCovers: any = {};
                      let fallbackBackCovers: any = {};
                      await Promise.all(finalBooks.map(async (b, idx) => {
                        if (b.coverBlob) {
                          const c = await compressImage(b.coverBlob, compressOpts);
                          formData.append(`cover_${idx}`, c, c.name);
                        } else if (b.draftCoverUrl || b.coverUrl) {
                          fallbackCovers[idx] = b.draftCoverUrl || b.coverUrl;
                        }
                        if (b.backCoverBlob) {
                          const bc = await compressImage(b.backCoverBlob, compressOpts);
                          formData.append(`backCover_${idx}`, bc, bc.name);
                        } else if (b.draftBackCoverUrl || b.backCoverUrl) {
                          fallbackBackCovers[idx] = b.draftBackCoverUrl || b.backCoverUrl;
                        }
                      }));
                      if (Object.keys(fallbackCovers).length > 0) formData.append("covers", JSON.stringify(fallbackCovers));
                      if (Object.keys(fallbackBackCovers).length > 0) formData.append("backCovers", JSON.stringify(fallbackBackCovers));

                      if (paymentBlob) {
                        const compressed = await compressImage(paymentBlob, compressOpts);
                        formData.append("paymentScreenshot", compressed, compressed.name);
                      } else if (extraDataState.draftPaymentUrl) {
                        formData.append("paymentScreenshotUrl", extraDataState.draftPaymentUrl);
                      }
                      
                      if (qrCodeBlob) {
                        const compressed = await compressImage(qrCodeBlob, compressOpts);
                        formData.append("qrCode", compressed, compressed.name);
                      } else if (extraDataState.draftQrUrl) {
                        formData.append("qrCodeUrl", extraDataState.draftQrUrl);
                      }
                      
                      formData.append("qualifications", JSON.stringify(qualifications.map(q => ({
                        id: q.id,
                        qualification: q.qualification,
                        institution: q.institution,
                        subject: q.subject,
                        mode: q.mode,
                        certificateUrl: q.certificateUrl
                      }))));
                      await Promise.all(qualifications.map(async q => {
                        if (q.certificateBlob) {
                          const c = await compressImage(q.certificateBlob, compressOpts);
                          formData.append(`certificate_${q.id}`, c, c.name);
                        }
                      }));

                      if (Object.keys(extraDataState).length > 0) {
                        formData.append("extraData", JSON.stringify(extraDataState));
                      }

                      let res;
                      if (isAdminEdit) {
                        res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/authors/${initialData.id}/full-update-and-approve`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                        if (onAdminSave) onAdminSave();
                        return;
                      } else if (isAuthorEdit) {
                        res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/author/edit-profile-full`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                      } else if (isReapply) {
                        res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/author/reapply-full`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                      } else {
                      res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/authors/register`, formData);
                    }
                    
                    localStorage.removeItem("authorRegistrationDraft");
                    try {
                      await localforage.removeItem("authorRegistrationFiles");
                    } catch (err) {
                      console.error("Failed to clear local files", err);
                    }
                    setSubmitted(true);
                    if (isReapply && onReapplySuccess) {
                      onReapplySuccess();
                    }
                    } catch (e: any) {
                      console.error("Submission error:", e.response?.data || e.message || e);
                      let errorMessage = e.response?.data?.error || e.response?.data?.details;
                      if (!errorMessage) {
                        if (e.response?.status === 413) {
                          errorMessage = "Your images are too large! Please compress your photos (keep them under a few megabytes) and try again.";
                        } else if (e.message === "Network Error") {
                          errorMessage = "Network connection failed. This usually happens if your images are too large for the server, or your internet connection dropped. Ensure your internet is stable and try again.";
                        } else {
                          errorMessage = e.message || "Oops! We hit a small snag on our end. Please try clicking submit again, or contact support if the issue persists.";
                        }
                      }
                      alert(`Error: ${errorMessage}`);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className={`dash-btn px-6 py-2.5 rounded-full flex items-center gap-2 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-premium hover:-translate-y-0.5"}`}
                >
                  {isSubmitting ? <span className="animate-pulse">{isAdminEdit ? "Approving..." : isAuthorEdit ? "Saving Changes..." : "Submitting..."}</span> : <><CheckCircle size={14} /> {isAdminEdit ? "Approve Application" : isAuthorEdit ? "Submit for Review" : "Submit Application"}</>}
                </button>
                {isAdminEdit && (
                  <button
                    type="button"
                    onClick={onAdminReject}
                    className="dash-btn px-6 py-2.5 rounded-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-premium hover:-translate-y-0.5 ml-auto"
                  >
                    <X className="w-4 h-4" /> Reject Application
                  </button>
                )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Success state */
          isAuthorEdit ? (
            <div className="bg-white rounded-3xl-2xl border border-paa-navy/5 p-12 text-center shadow-premium animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h3 className="text-2xl font-serif text-paa-navy font-medium mb-4">Edits Pending Approval</h3>
              <p className="text-paa-gray-text max-w-lg mx-auto mb-8">
                You have already submitted profile updates that are currently under review by our editorial team. You will be able to edit your profile again once these changes are approved.
              </p>
              <div className="flex justify-center gap-4">
                <button type="button" onClick={() => onReapplySuccess && onReapplySuccess()} className="dash-btn dash-btn-primary rounded-full px-8 py-3">
                  Go to Author Dashboard
                </button>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-3xl-2xl border border-paa-navy/5 p-10 md:p-14 text-center shadow-premium animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-[#ebd8c0] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="font-serif text-3xl font-medium text-paa-navy mb-3">
              {isReapply ? "Application Resubmitted!" : "Application Submitted!"}
            </h2>
            <p className="text-sm text-paa-gray-text leading-relaxed max-w-md mx-auto mb-8">
               Thank you, <strong className="text-paa-navy font-bold">{initialData?.name || form.name || "Author"}</strong>! 
               Your application is under review. An email confirmation has been sent to you.
               <br /><br />
               <strong className="text-paa-gold">Approval Pending:</strong> Our editorial team will review your application within 5-7 working days. Once approved, you will be able to log in to your Author Dashboard.
               <br /><br />
               While you wait, you can continue browsing our website.
            </p>

            {/* Receipt */}
            <div className="bg-gray-50 rounded-2xl p-6 max-w-sm mx-auto text-left border border-dashed border-paa-navy/20 shadow-sm mb-10">
              <div className="font-mono text-[10px] font-bold text-paa-gray-text tracking-widest uppercase mb-4 text-center">Application Receipt</div>
              <div className="space-y-3">
                {[
                  { label: "Application ID", value: "PAA-APP-2025-" + Math.floor(Math.random() * 9000 + 1000) },
                  { label: "Author Name", value: initialData?.name || form.name || "—" },
                  { label: "Book Title(s)", value: [...books.map(b => b.title), form.title].filter(Boolean).join(", ") || "—" },
                  { label: "Genre", value: Array.from(new Set([...books.map(b => b.genre), form.genre].filter(Boolean))).join(", ") || "—" },
                  { label: "Fee Paid", value: "₹3000" },
                  { label: "Status", value: "Pending Review", isStatus: true },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center text-xs pb-2 border-b border-paa-navy/5 last:border-0 last:pb-0">
                    <span className="text-paa-gray-text font-medium">{item.label}</span>
                    <span className={`font-bold ${item.isStatus ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest text-[9px]" : "text-paa-navy text-right max-w-[150px] truncate"}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4">
                <a href="/login" className="dash-btn dash-btn-primary rounded-full px-8 py-3">
                  Go to Author Dashboard
                </a>
            </div>
          </div>
          )
        )}
        </div>
      </div>

      {/* Group Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paa-navy/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-paa-navy/5 bg-gray-50 flex justify-between items-center">
              <h3 className="font-serif text-xl font-medium text-paa-navy">PAA Group Guidelines</h3>
              <button onClick={() => setShowGuidelines(false)} className="text-gray-400 hover:text-red-500 font-bold uppercase text-xs tracking-widest transition-colors">Close</button>
            </div>
            <div className="p-8 overflow-y-auto prose prose-sm max-w-none text-paa-navy/80">
              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-2">1. Be Responsive</h4>
              <p className="mb-6">Respond promptly to messages and avoid waiting until the last moment.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">2. Share Constructive Ideas</h4>
              <p className="mb-6">Offer practical suggestions along with ways to implement them.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">3. Take Initiative</h4>
              <p className="mb-6">Contribute by organizing events instead of only advising others. Actions matter more than words.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">4. Keep the Group Relevant</h4>
              <p className="mb-6">Avoid spamming the group with unnecessary messages, self-promotions, or unrelated content.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">5. Contact Admin First</h4>
              <p className="mb-6">If you have a query, message the group admin privately. If needed, the admin will share it with the group.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">6. Share Useful Resources</h4>
              <p className="mb-6">Help fellow authors by sharing valuable information such as publishers, printers, marketing opportunities, or literary resources.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">7. Maintain Harmony</h4>
              <p className="mb-6">Avoid gossip, politics, backbiting, or behavior that disrupts the community. Foster collaboration and mutual respect.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">8. Be Genuine</h4>
              <p className="mb-6">Participate sincerely and contribute positively to the group's objectives.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">9. Support Community Events</h4>
              <p className="mb-6">When another member organizes an event, don't wait for a personal invitation. Every member is equally welcome to participate and support community initiatives.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">10. Invite Personally</h4>
              <p className="mb-6">For your personal book launches or events, invite authors individually instead of expecting group announcements to be sufficient.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">11. Share Learnings</h4>
              <p className="mb-6">If you achieve success as an author, explain how you achieved it so others can learn and benefit from your experience.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">12. Maintain Professionalism</h4>
              <p className="mb-6">Treat the group as a professional literary community and work together toward common goals.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">13. Respect All Members</h4>
              <p className="mb-6">Members who are temporarily inactive are still valued. Everyone has different priorities and challenges.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">14. Ethical Interaction at Events</h4>
              <p className="mb-6">Do not aggressively sell books or prevent visitors from interacting with other authors. Allow readers to explore freely.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">15. No Business Promotion</h4>
              <p className="mb-6">Do not promote unrelated businesses or collect visitors' contact details for marketing other services during literary events.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">16. Minimum Participation for Events</h4>
              <p className="mb-6">A literary event can be organized with a minimum of five authors.</p>
            </div>
            <div className="p-6 border-t border-paa-navy/5 bg-gray-50 flex justify-end">
              <button onClick={() => { setShowGuidelines(false); update("agreedToGuidelines", true); }} className="dash-btn dash-btn-primary rounded-full px-8 py-2">I Agree to the Guidelines</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Information Document Modal */}
      {showInfoDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paa-navy/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-paa-navy/5 bg-gray-50 flex justify-between items-center">
              <h3 className="font-serif text-xl font-medium text-paa-navy">PAA Event Guidelines</h3>
              <button onClick={() => setShowInfoDoc(false)} className="text-gray-400 hover:text-red-500 font-bold uppercase text-xs tracking-widest transition-colors">Close</button>
            </div>
            <div className="p-8 overflow-y-auto prose prose-sm max-w-none text-paa-navy/80">
              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-4">Introduction</h4>
              <p className="mb-6">To ensure consistency across different venues and event formats, Pune Authors' Association follows a common set of event guidelines. These guidelines help maintain professionalism, fairness, and harmony among participating authors while representing the community as a whole.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">1. No Personal Branding</h4>
              <p className="mb-6">Do not bring personal standees, banners, or other promotional materials that make you stand out from fellow authors. Literary events are collective events, not individual competitions.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">2. Focus on Reader Interaction</h4>
              <p className="mb-6">These are "Meet the Author" events intended for interaction between authors and readers. They are not hard-selling marketplaces. Authors should simply display their books professionally and engage with readers.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">3. No Promotion of Other Businesses</h4>
              <p className="mb-2">Do not promote any unrelated business during literary events. This includes:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Distributing business cards for other businesses.</li>
                <li>Collecting readers' contact details to market non-literary services.</li>
                <li>Using literary events for commercial promotion outside your books.</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">4. Uniform Book Display</h4>
              <p className="mb-2">All authors should display books in a neat and uniform manner.</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Use of book stands is mandatory.</li>
                <li>Maintain consistency in presentation.</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">5. Carry Your Name Display</h4>
              <p className="mb-6">Every author should bring their own acrylic name display (name tally) for identification during events.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">6. Table Decoration</h4>
              <p className="mb-2">If you have an individual table, light decoration is permitted. If the table is shared:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Maintain uniformity.</li>
                <li>Avoid excessive decoration.</li>
                <li>Follow any changes suggested by the organizer.</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">7. Display Books of Other Authors Properly</h4>
              <p className="mb-6">If you are requested to display books of authors who are unable to attend (especially authors outside Pune and Mumbai), ensure they are displayed properly and not kept aside.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">8. Fair Sharing of Table Space</h4>
              <p className="mb-2">When tables are shared:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Authors with fewer titles should be paired with authors having more titles.</li>
                <li>Avoid overcrowding.</li>
                <li>Ensure equal distribution of display space.</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">9. Don't Hold Visitors Too Long</h4>
              <p className="mb-2">Avoid:</p>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Calling visitors aggressively.</li>
                <li>Keeping visitors occupied for too long.</li>
                <li>Preventing readers from visiting other authors.</li>
              </ul>
              <p className="mb-6">Allow readers to freely interact with everyone.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">10. Respect Table Allocation</h4>
              <p className="mb-6">Wait until the organizer assigns tables. Do not occupy tables before allocation.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">11. Contribute Equally</h4>
              <p className="mb-6">Authors should contribute equally to community initiatives. Participation should not be limited only to displaying books while avoiding contributions to other association activities.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">12. Support Authors Outside Pune & Mumbai</h4>
              <p className="mb-2">The association represents authors from different cities. Support fellow authors by:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Displaying their books properly.</li>
                <li>Helping promote their work.</li>
                <li>Making them feel part of the community.</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">13. Participate in All Types of Events</h4>
              <p className="mb-6">Avoid participating only in selective events such as corporate literary events. Housing society events and other literary programs are equally important.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">14. Non-Participation May Affect Membership</h4>
              <p className="mb-2">Long-term non-participation, lack of response, or remaining inactive may result in removal from the association. Registration fees are non-refundable.</p>
              <p className="mb-6">Members may also be removed if they misuse the community or join for purposes unrelated to the association's objectives.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">15. Joining Fee</h4>
              <p className="mb-6">The one-time joining fee of ₹3,000 includes ₹2,000 towards the registration fee to ensure seriousness and commitment among members, plus ₹1,000 towards website charges. It is not intended as payment for unlimited services.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">16. Purpose of the Registration Fee</h4>
              <p className="mb-2">The fee helps cover:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li>Event-related miscellaneous expenses</li>
                <li>Coordination costs</li>
                <li>Opportunity costs</li>
                <li>Administrative efforts involved in organizing activities</li>
              </ul>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">17. Lack of Participation</h4>
              <p className="mb-6">Consistent lack of participation is discouraged. If you are unable to participate due to genuine reasons, communicate them to the organizers.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">18. Read All Guidelines</h4>
              <p className="mb-6">Members should read and understand all association guidelines to ensure clarity and consistency.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">19. Maintain Professionalism</h4>
              <p className="mb-6">This is a community of professional authors. Professional behavior, respectful conduct, and disciplined participation are expected at every event.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">20. Support the Community Mission</h4>
              <p className="mb-4">The association exists to provide a platform, a structured process, and opportunities for authors to connect with readers. The community succeeds only when members actively contribute.</p>
              <p className="mb-6">The organizer of an event receives the participation amount collected for organizing that event.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">21. Avoid Opportunistic Behaviour</h4>
              <p className="mb-6">Members should not attempt to take unfair advantage of the efforts made by organizers or fellow authors. The association values trust, fairness, and collaboration.</p>

              <h4 className="text-paa-navy font-bold uppercase tracking-widest text-xs mb-2 mt-6">22. Follow the Norms and Trust the Process</h4>
              <p className="mb-4">Success comes through following community guidelines, trusting the established process, and working together professionally.</p>
              <p className="mb-6 italic">Ultimately, the quality of your book remains the most important factor in achieving success.</p>
            </div>
            <div className="p-6 border-t border-paa-navy/5 bg-gray-50 flex justify-end">
              <button onClick={() => { setShowInfoDoc(false); update("agreedToInfoDoc", true); }} className="dash-btn dash-btn-primary rounded-full px-8 py-2">I Have Read The Document</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
