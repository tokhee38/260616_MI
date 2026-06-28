import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import defaultConfig from './config.json'

// Import fallback/default assets directly
import defaultBanner from './assets/wedding_main_banner.png'
import defaultGroomAvatar from './assets/groom_avatar.png'
import defaultBrideAvatar from './assets/bride_avatar.png'
import defaultGallery1 from './assets/gallery_1.png'
import defaultGallery2 from './assets/gallery_2.png'
import defaultGallery3 from './assets/gallery_3.png'
import defaultGallery4 from './assets/gallery_4.png'
import defaultGallery5 from './assets/gallery_5.png'
import defaultGallery6 from './assets/gallery_6.png'
import naverMapImg from './assets/naver_map.png'
import noticeHallImg from './assets/notice_hall.png'
import noticeMealImg from './assets/notice_meal.png'
import noticeDressImg from './assets/notice_dress.png'

// Import all gallery images dynamically using Vite glob
const galleryModules = import.meta.glob('./assets/gallery_*.png', { eager: true });

function App() {
  // Load config from localStorage if exists and in edit/local environment, otherwise load defaultConfig
  const [config, setConfig] = useState(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasEditParam = window.location.search.includes('tkdahdwlfdl');
    const isEditableEnv = isLocalhost || hasEditParam;

    if (isEditableEnv) {
      const saved = localStorage.getItem('invitation_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaultConfig, ...parsed };
        } catch (e) {
          console.error('Error parsing saved config:', e);
        }
      }
    }
    return defaultConfig;
  });


  // Environment settings for Edit Mode
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasEditParam = window.location.search.includes('tkdahdwlfdl');
  const isEditableEnv = isLocalhost || hasEditParam;
  const [isEditMode, setIsEditMode] = useState(false);

  // States
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [hearts, setHearts] = useState([]);
  const [likes, setLikes] = useState({ groom: 124, bride: 158 });
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showParentsContact, setShowParentsContact] = useState(true);
  const [activeInfoTab, setActiveInfoTab] = useState('wedding');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showManualCopyModal, setShowManualCopyModal] = useState(false);
  const [manualCopyText, setManualCopyText] = useState('');

  // Gallery Expand State
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  // Lightbox Gallery State
  const [lightbox, setLightbox] = useState({ isOpen: false, index: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);

  // Cherry Blossom particles generator
  const cherryPetals = useMemo(() => {
    return Array.from({ length: 20 }).map((_, idx) => ({
      id: idx,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 8 + 6}px`, // 6px to 14px
      delay: `${Math.random() * -15}s`, // randomized negative delay
      duration: `${Math.random() * 8 + 6}s`, // 6s to 14s
      rotate: `${Math.random() * 360}deg`
    }));
  }, []);

  // Welcome RSVP Popup modal state
  const [showWelcomeRsvp, setShowWelcomeRsvp] = useState(false);

  useEffect(() => {
    const hasEditParam = window.location.search.includes('tkdahdwlfdl');
    if (hasEditParam) return;

    const hideUntil = localStorage.getItem('hide_welcome_popup');
    const now = new Date().getTime();
    if (!hideUntil || now > parseInt(hideUntil)) {
      setShowWelcomeRsvp(true);
    }
  }, []);

  const handleHideWelcomeToday = () => {
    const expireTime = new Date().getTime() + 24 * 60 * 60 * 1000;
    localStorage.setItem('hide_welcome_popup', String(expireTime));
    setShowWelcomeRsvp(false);
  };

  const closeWelcomePopup = () => {
    setShowWelcomeRsvp(false);
  };

  const handlePopupRsvpClick = () => {
    setShowWelcomeRsvp(false);
    setShowRsvpModal(true);
  };

  const formatPopupDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = weekDays[date.getDay()];
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? '오후' : '오전';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      const minStr = minutes === '00' ? '' : ` ${minutes}분`;
      return `${year}.${month}.${day} (${dayOfWeek}) ${ampm} ${displayHours}시${minStr}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Google Sheet Webhook endpoint
  const [sheetUrl, setSheetUrl] = useState(() => {
    return defaultConfig.sheetUrl || localStorage.getItem('invitation_sheet_url') || 'https://script.google.com/macros/s/AKfycbwn1HPTUOGloTI8efJo1rGm1s-dR1IVeb3GZuSLyd41dFeeZPyHdG7yYFNb1Z7wvPA/exec';
  });

  // RSVP Form State
  const [rsvpForm, setRsvpForm] = useState({
    name: '',
    relation: 'groom',
    attending: 'yes',
    guestsCount: 1,
    meal: 'yes',
    message: ''
  });
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);

  // Guestbook Form State
  const [guestbookForm, setGuestbookForm] = useState({ name: '', password: '', message: '' });
  const [guestbookList, setGuestbookList] = useState([]);
  const [gbLoading, setGbLoading] = useState(false);

  // Naver Map States & Refs
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);

  // Dynamically load Naver Map API Script when naverClientId exists
  useEffect(() => {
    if (!config.location.naverClientId) {
      setMapLoaded(false);
      return;
    }

    if (window.naver && window.naver.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'naver-map-script';
    let script = document.getElementById(scriptId);

    const handleScriptLoad = () => {
      setMapLoaded(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${config.location.naverClientId}`;
      script.async = true;
      script.onload = handleScriptLoad;
      script.onerror = (err) => {
        console.error('Failed to load Naver Map script:', err);
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', handleScriptLoad);
    }

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
    };
  }, [config.location.naverClientId]);

  // Initialize Naver Map
  useEffect(() => {
    if (mapLoaded && mapRef.current && window.naver && window.naver.maps) {
      const latitude = parseFloat(config.location.latitude) || 37.5238;
      const longitude = parseFloat(config.location.longitude) || 127.0279;
      const center = new window.naver.maps.LatLng(latitude, longitude);

      const mapOptions = {
        center: center,
        zoom: 16,
        minZoom: 10,
        maxZoom: 20,
        draggable: true,
        pinchZoom: true,
        scrollWheel: true,
        keyboardShortcuts: true,
        disableDoubleTapZoom: false,
        disableDoubleClickZoom: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT
        }
      };

      const map = new window.naver.maps.Map(mapRef.current, mapOptions);

      // Create marker
      const marker = new window.naver.maps.Marker({
        position: center,
        map: map,
        title: config.location.hallName || '식장'
      });

      // Create info window
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `
          <div style="padding:10px; min-width:150px; line-height:150%; text-align:center; font-family:'Gowun Dodum',sans-serif; font-size:12px; border:none;">
            <strong style="color:#4e4449;">${config.location.hallName}</strong><br/>
            <span style="color:#8e7f87; font-size:11px;">${config.location.detail || ''}</span>
          </div>
        `,
        borderWidth: 1,
        borderColor: '#eedfd3',
        backgroundColor: "white",
        disableAnchor: false,
        pixelOffset: new window.naver.maps.Point(0, -10)
      });

      // Open InfoWindow immediately
      infoWindow.open(map, marker);

      // Re-center on map resize
      const handleResize = () => {
        map.setCenter(center);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [mapLoaded, config.location.latitude, config.location.longitude, config.location.hallName, config.location.detail]);

  // Dynamically update document title based on config names
  useEffect(() => {
    document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다 💍`;
  }, [config.groom.name, config.bride.name]);

  // Load dynamic config from Google Sheets on mount if sheetUrl exists
  useEffect(() => {
    const fetchDynamicConfig = async () => {
      if (sheetUrl) {
        try {
          const res = await fetch(`${sheetUrl}?action=getConfig`);
          const data = await res.json();
          if (data && data.config) {
            const parsed = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
            setConfig(prev => ({ ...prev, ...parsed }));
          }
        } catch (err) {
          console.warn('Could not load dynamic config from Google Sheets, using local config:', err);
        }
      }
    };
    fetchDynamicConfig();
  }, [sheetUrl]);

  // Load guestbook data on mount
  useEffect(() => {
    loadGuestbook();
  }, [sheetUrl]);

  // Reload audio player if URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          setIsPlaying(false);
          console.log("Audio play failed after BGM URL change", e);
        });
      }
    }
  }, [config.bgmUrl]);

  // Scroll Reveal Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Dynamic D-Day Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const weddingDate = new Date(config.weddingDate);
      const diff = weddingDate.getTime() - now.getTime();

      if (diff <= 0) {
        const absoluteDiff = Math.abs(diff);
        const days = Math.floor(absoluteDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absoluteDiff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((absoluteDiff / 1000 / 60) % 60);
        const seconds = Math.floor((absoluteDiff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isPast: false });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config.weddingDate]);

  // Spawn Floating Heart Confetti
  const triggerConfetti = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || (rect.left + rect.width / 2);
    const y = e.clientY || rect.top;

    const newHeart = {
      id: Date.now() + Math.random(),
      x,
      y,
      emoji: ['💜', '💟', '💕', '🌸', '💌', '🔮'][Math.floor(Math.random() * 6)]
    };

    setHearts((prev) => [...prev, newHeart]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1500);
  };

  // Like Groom/Bride
  const handleLike = (person, e) => {
    triggerConfetti(e);
    setLikes(prev => ({ ...prev, [person]: prev[person] + 1 }));
  };

  // Helper to copy to clipboard with fallback
  const copyToClipboard = (text) => {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve).catch((err) => {
          fallbackCopy(text) ? resolve() : reject(err);
        });
      } else {
        fallbackCopy(text) ? resolve() : reject(new Error('Copy not supported'));
      }
    });
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  // Copy to Clipboard
  const copyText = (text, message = '계좌번호가 복사되었습니다! 📋') => {
    copyToClipboard(text)
      .then(() => {
        alert(message);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        window.prompt('복사 버튼이 작동하지 않는 환경입니다. 아래 텍스트를 직접 복사해 주세요:', text);
      });
  };

  // Toggle Accordions
  const toggleAccordion = (type) => {
    setActiveAccordion(activeAccordion === type ? null : type);
  };

  // Load guestbook messages
  const loadGuestbook = async () => {
    if (sheetUrl) {
      try {
        const res = await fetch(`${sheetUrl}?action=getGuestbook`);
        const data = await res.json();
        if (data.messages) {
          setGuestbookList(data.messages);
          return;
        }
      } catch (err) {
        console.error('Error fetching guestbook:', err);
      }
    }
    const saved = JSON.parse(localStorage.getItem('invitation_guestbook') || '[]');
    setGuestbookList(saved);
  };

  // Save Google Sheets webhook URL
  const saveSheetUrl = (url) => {
    localStorage.setItem('invitation_sheet_url', url);
    setSheetUrl(url);
    setConfig(prev => ({ ...prev, sheetUrl: url }));
    alert('구글 스프레드시트 연동 주소가 저장되었습니다! 🔗');
  };

  // Submit RSVP Form
  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    if (!rsvpForm.name.trim()) return alert('성함을 입력해 주세요.');

    setRsvpLoading(true);

    if (sheetUrl) {
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'rsvp',
            ...rsvpForm
          })
        });
      } catch (err) {
        console.error('RSVP Sheets submission error:', err);
      }
    }

    const localRsvps = JSON.parse(localStorage.getItem('invitation_rsvp') || '[]');
    localRsvps.push({ ...rsvpForm, timestamp: new Date().toISOString() });
    localStorage.setItem('invitation_rsvp', JSON.stringify(localRsvps));

    setRsvpSuccess(true);
    setRsvpLoading(false);

    setTimeout(() => {
      setShowRsvpModal(false);
      setRsvpSuccess(false);
      setRsvpForm({
        name: '',
        relation: 'groom',
        attending: 'yes',
        guestsCount: 1,
        meal: 'yes',
        message: ''
      });
    }, 2000);
  };

  // Submit Guestbook
  const handleGuestbookSubmit = async (e) => {
    e.preventDefault();
    if (!guestbookForm.name.trim()) return alert('이름을 입력해 주세요.');
    if (!guestbookForm.message.trim()) return alert('축하 메시지를 입력해 주세요.');
    if (!guestbookForm.password.trim()) return alert('삭제 비밀번호를 입력해 주세요.');

    setGbLoading(true);
    const newMsg = {
      name: guestbookForm.name,
      message: guestbookForm.message,
      password: guestbookForm.password,
      timestamp: new Date().toLocaleString('ko-KR')
    };

    if (sheetUrl) {
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'guestbook',
            ...newMsg
          })
        });
      } catch (err) {
        console.error('Guestbook Sheets error:', err);
      }
    }

    const saved = JSON.parse(localStorage.getItem('invitation_guestbook') || '[]');
    newMsg.id = Date.now();
    const updated = [newMsg, ...saved];
    localStorage.setItem('invitation_guestbook', JSON.stringify(updated));
    setGuestbookList(updated);

    setGuestbookForm({ name: '', password: '', message: '' });
    setGbLoading(false);
    triggerConfetti(e);
  };

  // Delete Guestbook message
  const handleDeleteMessage = async (id, originalPassword) => {
    const passwordInput = prompt('삭제용 비밀번호를 입력해 주세요:');
    if (passwordInput === null) return;

    if (passwordInput !== originalPassword) {
      return alert('비밀번호가 일치하지 않습니다.');
    }

    const saved = JSON.parse(localStorage.getItem('invitation_guestbook') || '[]');
    const filtered = saved.filter(item => item.id !== id);
    localStorage.setItem('invitation_guestbook', JSON.stringify(filtered));
    setGuestbookList(filtered);
    alert('메시지가 삭제되었습니다.');
  };

  // Audio Toggle
  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        console.log("Audio play blocked", e);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // ================= EDIT CONFIG HELPERS =================
  const updateField = (section, field, value) => {
    if (!section) {
      setConfig(prev => ({
        ...prev,
        [field]: value
      }));
      return;
    }
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateLocationField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const updateImageField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      images: {
        ...prev.images,
        [field]: value
      }
    }));
  };

  // Client-side Image Compression using Canvas (Handles 20MB+ big files)
  const compressImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed JPEG data URL
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Image upload and Base64 conversion with compression (Single Image)
  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.75);
      updateImageField(field, compressedBase64);
    } catch (err) {
      console.error('Image compression error:', err);
      alert('이미지 파일 최적화 중 오류가 발생했습니다.');
    }
  };

  // Multi-image upload for gallery with compression (Handles up to 50 large files)
  const handleMultipleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (files.length > 50) {
      alert('최대 50장까지만 동시에 업로드할 수 있습니다.');
      return;
    }

    setGbLoading(true);

    try {
      const compressionPromises = files.map(file => compressImageFile(file, 1200, 1200, 0.75));
      const compressedImages = await Promise.all(compressionPromises);

      setConfig(prev => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: compressedImages
        }
      }));
      alert(`성공적으로 ${compressedImages.length}장의 사진이 최적화(압축)되어 갤러리에 추가/교체되었습니다!`);
    } catch (err) {
      console.error('Multi image compression error:', err);
      alert('이미지 일괄 최적화 중 오류가 발생했습니다.');
    } finally {
      setGbLoading(false);
    }
  };

  // HTML5 Drag and Drop Handlers for rearranging gallery images
  const handleDragStart = (index, e) => {
    if (!isEditMode) return;
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (index, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItemIndex(null);
  };

  const handleDrop = (targetIndex, e) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    setConfig(prev => {
      const updatedGallery = [...prev.images.gallery];
      const [draggedItem] = updatedGallery.splice(draggedItemIndex, 1);
      updatedGallery.splice(targetIndex, 0, draggedItem);

      return {
        ...prev,
        images: {
          ...prev.images,
          gallery: updatedGallery
        }
      };
    });
  };

  // Inline inputs renderer
  const renderEditableText = (section, field, isTextArea = false) => {
    const val = section ? config[section][field] : config[field];

    if (isEditMode) {
      if (isTextArea) {
        return (
          <textarea
            className="edit-textarea-inline"
            value={val}
            onChange={(e) => {
              if (section) updateField(section, field, e.target.value);
              else setConfig(prev => ({ ...prev, [field]: e.target.value }));
            }}
          />
        );
      }
      return (
        <input
          type="text"
          className="edit-input-inline"
          value={val}
          onChange={(e) => {
            if (section) updateField(section, field, e.target.value);
            else setConfig(prev => ({ ...prev, [field]: e.target.value }));
          }}
        />
      );
    }

    return isTextArea ? (
      <span style={{ whiteSpace: 'pre-wrap' }}>{val}</span>
    ) : (
      <span>{val}</span>
    );
  };

  // Editable location fields
  const renderEditableLocation = (field) => {
    const val = config.location[field];
    if (isEditMode) {
      return (
        <input
          type="text"
          className="edit-input-inline"
          value={val}
          onChange={(e) => updateLocationField(field, e.target.value)}
        />
      );
    }
    return <span>{val}</span>;
  };

  // Helper to save config to localStorage safely (handling QuotaExceededError when base64 images are too large)
  const safeSaveToLocalStorage = (configObj) => {
    try {
      localStorage.setItem('invitation_config', JSON.stringify(configObj));
      return true;
    } catch (e) {
      console.warn('LocalStorage save failed (likely quota exceeded due to base64 images):', e);
      return false;
    }
  };

  // Save changes locally
  const saveConfigLocally = () => {
    const success = safeSaveToLocalStorage(config);
    if (success) {
      alert('임시 변경사항이 이 기기에 저장되었습니다. 💾\n(배포 시 반영하려면 하단의 [배포용 설정 복사]를 실행해 파일로 덮어씌워야 합니다)');
    } else {
      alert('⚠️ 기기 임시 저장 제한 알림\n\n등록된 사진들의 용량이 너무 커 브라우저 저장 용량 한도(5MB)를 초과했습니다. 따라서 이 브라우저(기기)의 임시 저장은 건너뛰었지만,\n\n[서버에 즉시 저장 ☁️] 또는 [배포용 설정 복사 (JSON)]를 실행하시면 스프레드시트 서버나 배포 파일에는 정상적으로 전체 사진이 저장 및 복사됩니다!');
    }
  };

  // Save changes directly to Google Sheet server
  const saveConfigToServer = async () => {
    if (!sheetUrl) {
      alert('구글 스프레드시트 연동 주소가 설정되지 않았습니다.\n하단의 [구글 시트 연동 관리자 설정]을 클릭해 연동 주소를 먼저 저장해 주세요!');
      return;
    }

    setGbLoading(true);

    try {
      // 1. 서버 연동 상태 및 권한 확인 (403 Forbidden 및 CORS 오류 사전 감지)
      try {
        const testRes = await fetch(`${sheetUrl}?action=getConfig`);
        if (!testRes.ok) {
          throw new Error(`HTTP error! status: ${testRes.status}`);
        }
      } catch (testErr) {
        console.error('Connection test failed:', testErr);
        throw new Error('서버(구글 스프레드시트 웹 앱)에 연결할 수 없거나 접근 권한이 없습니다.\n\n구글 앱스 스크립트 배포 창에서 [액세스 권한이 있는 사용자]를 반드시 [모든 사용자(Anyone)]로 설정했는지 확인해 주세요. (소유자 본인으로 로그인된 상태에서만 작동하고 있으면 다른 기기나 모바일에서 반영되지 않습니다.)');
      }

      // 2. 실제 저장 요청 전송
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'saveConfig',
          config: JSON.stringify(config)
        })
      });

      // Sync to localStorage safely
      safeSaveToLocalStorage(config);
      alert('수정사항이 서버(구글 스프레드시트)에 즉시 저장되었습니다! 🎉\n이제 전 세계 하객들에게 실시간으로 업데이트된 청첩장이 보입니다.');
    } catch (err) {
      console.error('Server save error:', err);
      alert(err.message || '서버 저장 과정 중 문제가 발생했습니다. 구글 앱스 스크립트 웹 앱 설정을 확인해 주세요.');
    } finally {
      setGbLoading(false);
    }
  };

  // Export config to copy
  const copyConfigJson = () => {
    safeSaveToLocalStorage(config);
    const jsonStr = JSON.stringify(config, null, 2);
    copyToClipboard(jsonStr)
      .then(() => {
        alert('배포용 설정 JSON이 클립보드에 복사되었습니다! 📋\n\n[적용 방법]\n1. 복사된 내용을 프로젝트 폴더 안의 "src/config.json" 파일 전체에 붙여넣어 덮어씁니다.\n2. 프로젝트를 빌드 및 배포하시면 전 세계 모든 접속자에게 수정된 결과물이 고정되어 표시됩니다.');
      })
      .catch((err) => {
        console.error('Config JSON copy failed:', err);
        setManualCopyText(jsonStr);
        setShowManualCopyModal(true);
      });
  };

  // Revert / Reset configuration
  const resetConfig = () => {
    if (window.confirm('모든 수정사항을 초기화하고 기본 설정으로 복원할까요?')) {
      localStorage.removeItem('invitation_config');
      setConfig(defaultConfig);
      window.location.reload();
    }
  };

  // ================= DYNAMIC CALENDAR GENERATION =================
  const getCalendarData = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const weddingDay = date.getDate();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, isWedding: false, isSun: false, isSat: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayOfWeek = (startDayOfWeek + i - 1) % 7;
      days.push({
        day: i,
        isWedding: i === weddingDay,
        isSun: dayOfWeek === 0,
        isSat: dayOfWeek === 6
      });
    }

    return { year, month: month + 1, days };
  };

  const calendarData = getCalendarData(config.weddingDate);

  const formatWeddingDetailDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { dateString: '', timeString: '' };
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1);
      const day = String(date.getDate());
      const weekDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dayOfWeek = weekDays[date.getDay()];

      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? '오후' : '오전';
      hours = hours % 12;
      hours = hours ? hours : 12;

      const timeString = `${dayOfWeek} ${ampm} ${hours}시` + (minutes > 0 ? ` ${minutes}분` : '');
      return {
        dateString: `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`,
        timeString
      };
    } catch (e) {
      return { dateString: dateStr, timeString: '' };
    }
  };

  // Formatting guestbook date string display safely for all browsers including Safari (iOS)
  const formatGuestbookDate = (timestamp) => {
    if (!timestamp) return '방금 전';
    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
      }

      // Fallback for Korean local spreadsheet formatted dates (e.g. "2026. 6. 21. 오후 3:18:28")
      const cleaned = String(timestamp).replace(/[오전|오후].*$/, '').trim();
      const parts = cleaned.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const year = parts[0];
        const month = String(parts[1]).padStart(2, '0');
        const day = String(parts[2]).padStart(2, '0');
        return `${year}.${month}.${day}`;
      }
    } catch (e) {
      console.error('Error parsing guestbook date:', e);
    }
    return String(timestamp).split(' ')[0] || '방금 전';
  };

  // Formatting date string display
  const formatWeddingDateString = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const weekDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dayOfWeek = weekDays[date.getDay()];

      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? '오후' : '오전';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;

      return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}. ${dayOfWeek} ${ampm} ${displayHours}시 ${minutes}분`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper for image rendering (supporting Base64 & relative asset path conversions)
  const getImageSrc = (val, defaultAsset) => {
    if (!val) return defaultAsset;
    if (val.startsWith('data:') || val.startsWith('http')) return val;
    if (val.includes('wedding_main_banner')) return defaultBanner;
    if (val.includes('groom_avatar')) return defaultGroomAvatar;
    if (val.includes('bride_avatar')) return defaultBrideAvatar;

    // Check if it matches gallery modules loaded dynamically
    const galleryMatch = val.match(/gallery_(\d+)/);
    if (galleryMatch) {
      const idx = galleryMatch[1];
      const path = `./assets/gallery_${idx}.png`;
      const mod = galleryModules[path];
      if (mod) return mod.default;
    }

    if (val.includes('gallery_1')) return defaultGallery1;
    if (val.includes('gallery_2')) return defaultGallery2;
    if (val.includes('gallery_3')) return defaultGallery3;
    if (val.includes('gallery_4')) return defaultGallery4;
    if (val.includes('gallery_5')) return defaultGallery5;
    if (val.includes('gallery_6')) return defaultGallery6;
    if (val.includes('notice_hall')) return noticeHallImg;
    if (val.includes('notice_meal')) return noticeMealImg;
    if (val.includes('notice_dress')) return noticeDressImg;
    return defaultAsset;
  };

  // Populate dynamic gallery list of length N
  const galleryImages = config.images.gallery.map((imgVal, idx) => {
    let fallbackAsset = defaultGallery1;
    if (idx === 1) fallbackAsset = defaultGallery2;
    else if (idx === 2) fallbackAsset = defaultGallery3;
    else if (idx === 3) fallbackAsset = defaultGallery4;
    else if (idx === 4) fallbackAsset = defaultGallery5;
    else if (idx === 5) fallbackAsset = defaultGallery6;

    return {
      src: getImageSrc(imgVal, fallbackAsset),
      caption: `우리들의 소중한 순간 #${idx + 1}`
    };
  });

  // Gallery view limits (9 elements default when collapsed, fading out the 3rd row)
  const visibleImages = isGalleryExpanded ? galleryImages : galleryImages.slice(0, 9);

  // Lightbox handlers (endless looping support)
  const handlePrev = (e) => {
    e.stopPropagation();
    setLightbox(prev => ({
      ...prev,
      index: (prev.index - 1 + galleryImages.length) % galleryImages.length
    }));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setLightbox(prev => ({
      ...prev,
      index: (prev.index + 1) % galleryImages.length
    }));
  };

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartRef.current;
    setDragOffset(diffX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset < -50) {
      setLightbox(prev => ({
        ...prev,
        index: (prev.index + 1) % galleryImages.length
      }));
    } else if (dragOffset > 50) {
      setLightbox(prev => ({
        ...prev,
        index: (prev.index - 1 + galleryImages.length) % galleryImages.length
      }));
    }
    setDragOffset(0);
  };

  return (
    <div className={isEditMode ? 'edit-active' : ''}>
      {/* Background Audio */}
      <audio
        ref={audioRef}
        src={config.bgmUrl}
        loop
      />

      {/* Floating Hearts Confetti */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="floating-heart"
          style={{ left: h.x - 12, top: h.y - 20 }}
        >
          {h.emoji}
        </span>
      ))}

      {/* Floating BGM Player */}
      <div className="bg-music-player" onClick={togglePlay}>
        <span className={isPlaying ? 'music-icon-spin' : ''} style={{ fontSize: '16px' }}>
          🎵
        </span>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
          {isPlaying ? 'BGM ON' : 'BGM OFF'}
        </span>
      </div>

      {/* Floating Indicator when editing is active */}
      {isEditMode && <div className="edit-indicator">✍️ 실시간 편집 모드 작동 중</div>}

      {/* 1. Cover / Header */}
      <section className="cover-section animate-fade-in">
        {/* Cherry Blossom falling effect */}
        <div className="cherry-blossom-container">
          {cherryPetals.map((petal) => (
            <div
              key={petal.id}
              className="petal"
              style={{
                left: petal.left,
                width: petal.size,
                height: petal.size,
                animationDelay: petal.delay,
                animationDuration: petal.duration,
                transform: `rotate(${petal.rotate})`
              }}
            />
          ))}
        </div>
        <div
          className="cover-image-container"
          style={{
            paddingLeft: `${((100 - (config.coverImageScale || 85)) / 2) * 1.5}%`,
            paddingRight: `${((100 - (config.coverImageScale || 85)) / 2) * 1.5}%`,
            paddingTop: '36px',
            paddingBottom: '18px'
          }}
        >
          <div className="image-edit-wrapper" style={{ position: 'relative' }}>
            {/* Calligraphy Overlay Title (always maintained) */}
            <div
              className="cover-invitation-title"
              style={{
                top: `${config.coverTitleTop !== undefined ? config.coverTitleTop : 10}px`,
                left: `${config.coverTitleLeft !== undefined ? config.coverTitleLeft : 10}px`,
                right: `${config.coverTitleLeft !== undefined ? config.coverTitleLeft : 10}px`,
                color: config.coverTitleColor || '#ffffffff'
              }}
            >
              <div className="title-wedding" style={{ fontSize: `${config.coverTitleSize || 64}px` }}>Wedding</div>
              <div className="title-invitation" style={{ fontSize: `${config.coverTitleSize || 64}px` }}>Invitation</div>
            </div>

            <img
              src={getImageSrc(config.images.mainBanner, defaultBanner)}
              className="cover-image"
              alt="결혼 청첩장 메인 이미지"
            />
            {isEditMode && (
              <div className="image-edit-overlay">
                <button
                  type="button"
                  className="image-edit-btn"
                  onClick={() => document.getElementById('upload-main-banner').click()}
                >
                  사진 가져오기 📷
                </button>
                <input
                  type="file"
                  id="upload-main-banner"
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'mainBanner')}
                />
              </div>
            )}
          </div>
          {/* Edit Mode Cover Control Panel */}
          {isEditMode && (
            <div className="cover-edit-panel" onClick={(e) => e.stopPropagation()} style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>대문 사진 크기:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '70%' }}>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={config.coverImageScale || 85}
                    onChange={(e) => updateField(null, 'coverImageScale', parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="control-val" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>{config.coverImageScale || 85}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>문구 글씨 크기:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '70%' }}>
                  <input
                    type="range"
                    min="40"
                    max="120"
                    value={config.coverTitleSize || 76}
                    onChange={(e) => updateField(null, 'coverTitleSize', parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="control-val" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>{config.coverTitleSize || 76}px</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>문구 상하 위치:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '70%' }}>
                  <input
                    type="range"
                    min="-80"
                    max="150"
                    value={config.coverTitleTop !== undefined ? config.coverTitleTop : -10}
                    onChange={(e) => updateField(null, 'coverTitleTop', parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="control-val" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>{config.coverTitleTop !== undefined ? config.coverTitleTop : -10}px</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>문구 좌우 위치:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '70%' }}>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={config.coverTitleLeft !== undefined ? config.coverTitleLeft : -20}
                    onChange={(e) => updateField(null, 'coverTitleLeft', parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="control-val" style={{ fontSize: '11px', minWidth: '35px', textAlign: 'right' }}>{config.coverTitleLeft !== undefined ? config.coverTitleLeft : -20}px</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>문구 글씨 색상:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '70%' }}>
                  <input
                    type="color"
                    value={config.coverTitleColor || '#4e4449'}
                    onChange={(e) => updateField(null, 'coverTitleColor', e.target.value)}
                    style={{ border: 'none', background: 'none', width: '40px', height: '24px', cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={config.coverTitleColor || '#4e4449'}
                    onChange={(e) => updateField(null, 'coverTitleColor', e.target.value)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      width: '70px',
                      textAlign: 'center'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cover-info">
          <p className="cover-title-en">Save the Date</p>
          <h1 className="cover-names">
            <span className="editable-area">{renderEditableText('groom', 'name')}</span>
            <span style={{ fontSize: '20px', color: 'var(--primary)', margin: '0 4px' }}>♥</span>
            <span className="editable-area">{renderEditableText('bride', 'name')}</span>
          </h1>
          <div className="cover-details">
            <div className="cover-details-date editable-area">
              {isEditMode ? (
                <div>
                  <label style={{ fontSize: '11px', marginBottom: '2px', textAlign: 'center' }}>결혼 일시 설정</label>
                  <input
                    type="datetime-local"
                    className="edit-input-inline"
                    value={new Date(new Date(config.weddingDate).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const d = new Date(e.target.value);
                      setConfig(prev => ({ ...prev, weddingDate: d.toISOString() }));
                    }}
                  />
                </div>
              ) : (
                formatWeddingDateString(config.weddingDate)
              )}
            </div>
            <p className="editable-area" style={{ marginTop: '6px' }}>
              {renderEditableLocation('hallName')}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Greeting Section */}
      <section className="greeting-section scroll-reveal">
        <h2 className="section-title">
          <span className="editable-area">{renderEditableText('greeting', 'title')}</span>
        </h2>
        <p className="section-subtitle">Invitation</p>

        <div className="greeting-text editable-area">
          {renderEditableText('greeting', 'text', true)}
        </div>

        {/* Parents Information */}
        <div className="parents-grid">
          <span className="parents-row">
            <div className="parents-names">
              <span className="editable-area">{renderEditableText('groom', 'fatherName')}</span>
              <span> · </span>
              <span className="editable-area">{renderEditableText('groom', 'motherName')}</span>
              <span className="parents-relation">의 장남</span>
            </div>
            <div className="parents-child editable-area">{renderEditableText('groom', 'name')}</div>
          </span>
          <span className="parents-row">
            <div className="parents-names">
              <span className="editable-area">{renderEditableText('bride', 'fatherName')}</span>
              <span> · </span>
              <span className="editable-area">{renderEditableText('bride', 'motherName')}</span>
              <span className="parents-relation">의 장녀</span>
            </div>
            <div className="parents-child editable-area">{renderEditableText('bride', 'name')}</div>
          </span>
        </div>

        {/* 축하 인사 및 연락하기 - 페이지 통합 직관 배치 */}
        <div className="direct-contact-section">
          <div className="contact-grid-row">
            {/* Groom side */}
            <div className="contact-column">
              <span className="contact-label-title">신랑</span>
              {isEditMode && (
                <input
                  type="text"
                  className="edit-input-inline"
                  style={{ fontSize: '11px', padding: '4px 8px', height: '24px', margin: '4px 0', width: '100px', display: 'inline-block' }}
                  value={config.groom.phone}
                  onChange={(e) => updateField('groom', 'phone', e.target.value)}
                  placeholder="신랑 연락처"
                />
              )}
              <div className="contact-action-icons">
                <a href={`tel:${config.groom.phone}`} className="contact-icon-link" title="전화">
                  <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                </a>
                <a href={`sms:${config.groom.phone}`} className="contact-icon-link" title="문자">
                  <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </a>
              </div>
            </div>

            {/* Bride side */}
            <div className="contact-column">
              <span className="contact-label-title">신부</span>
              {isEditMode && (
                <input
                  type="text"
                  className="edit-input-inline"
                  style={{ fontSize: '11px', padding: '4px 8px', height: '24px', margin: '4px 0', width: '100px', display: 'inline-block' }}
                  value={config.bride.phone}
                  onChange={(e) => updateField('bride', 'phone', e.target.value)}
                  placeholder="신부 연락처"
                />
              )}
              <div className="contact-action-icons">
                <a href={`tel:${config.bride.phone}`} className="contact-icon-link" title="전화">
                  <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                </a>
                <a href={`sms:${config.bride.phone}`} className="contact-icon-link" title="문자">
                  <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Parents toggle bar */}
          <div className="parents-contact-toggle" onClick={() => setShowParentsContact(!showParentsContact)}>
            <span>신랑측 혼주</span>
            <span className="toggle-arrow">
              {showParentsContact ? '▲' : '▼'}
            </span>
            <span>신부측 혼주</span>
          </div>

          {/* Parents details container */}
          <div className={`parents-contact-wrapper ${showParentsContact ? 'expanded' : 'collapsed'}`}>
            <div className="parents-contact-grid">
              {/* Groom's parents */}
              <div className="parents-contact-side">
                {config.groom.fatherName && (
                  <div className="parent-contact-block">
                    <span className="parent-name-text">아버지 {config.groom.fatherName}</span>
                    {isEditMode && (
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '10px', padding: '2px 6px', height: '22px', margin: '2px 0', width: '90px', display: 'inline-block' }}
                        value={config.groom.fatherPhone}
                        onChange={(e) => updateField('groom', 'fatherPhone', e.target.value)}
                        placeholder="연락처"
                      />
                    )}
                    <div className="contact-action-icons">
                      <a href={`tel:${config.groom.fatherPhone}`} className="contact-icon-link" title="전화">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                      </a>
                      <a href={`sms:${config.groom.fatherPhone}`} className="contact-icon-link" title="문자">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </a>
                    </div>
                  </div>
                )}
                {config.groom.motherName && (
                  <div className="parent-contact-block">
                    <span className="parent-name-text">어머니 {config.groom.motherName}</span>
                    {isEditMode && (
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '10px', padding: '2px 6px', height: '22px', margin: '2px 0', width: '90px', display: 'inline-block' }}
                        value={config.groom.motherPhone}
                        onChange={(e) => updateField('groom', 'motherPhone', e.target.value)}
                        placeholder="연락처"
                      />
                    )}
                    <div className="contact-action-icons">
                      <a href={`tel:${config.groom.motherPhone}`} className="contact-icon-link" title="전화">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                      </a>
                      <a href={`sms:${config.groom.motherPhone}`} className="contact-icon-link" title="문자">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Bride's parents */}
              <div className="parents-contact-side">
                {config.bride.fatherName && (
                  <div className="parent-contact-block">
                    <span className="parent-name-text">아버지 {config.bride.fatherName}</span>
                    {isEditMode && (
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '10px', padding: '2px 6px', height: '22px', margin: '2px 0', width: '90px', display: 'inline-block' }}
                        value={config.bride.fatherPhone}
                        onChange={(e) => updateField('bride', 'fatherPhone', e.target.value)}
                        placeholder="연락처"
                      />
                    )}
                    <div className="contact-action-icons">
                      <a href={`tel:${config.bride.fatherPhone}`} className="contact-icon-link" title="전화">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                      </a>
                      <a href={`sms:${config.bride.fatherPhone}`} className="contact-icon-link" title="문자">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </a>
                    </div>
                  </div>
                )}
                {config.bride.motherName && (
                  <div className="parent-contact-block">
                    <span className="parent-name-text">어머니 {config.bride.motherName}</span>
                    {isEditMode && (
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '10px', padding: '2px 6px', height: '22px', margin: '2px 0', width: '90px', display: 'inline-block' }}
                        value={config.bride.motherPhone}
                        onChange={(e) => updateField('bride', 'motherPhone', e.target.value)}
                        placeholder="연락처"
                      />
                    )}
                    <div className="contact-action-icons">
                      <a href={`tel:${config.bride.motherPhone}`} className="contact-icon-link" title="전화">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z" /></svg>
                      </a>
                      <a href={`sms:${config.bride.motherPhone}`} className="contact-icon-link" title="문자">
                        <svg className="contact-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 4. Wedding Calendar & Countdown */}
      <section className="calendar-section scroll-reveal">
        <h2 className="section-title">소중한 결혼식 날</h2>
        <p className="section-subtitle">Date & Time</p>

        {(() => {
          const { dateString, timeString } = formatWeddingDetailDate(config.weddingDate);
          return (
            <div className="calendar-wrap">
              <div className="calendar-header">
                <div className="calendar-date">{dateString}</div>
                {timeString && <div className="calendar-time">{timeString}</div>}
              </div>
              <div className="calendar-grid">
                <div className="calendar-weekday">일</div>
                <div className="calendar-weekday">월</div>
                <div className="calendar-weekday">화</div>
                <div className="calendar-weekday">수</div>
                <div className="calendar-weekday">목</div>
                <div className="calendar-weekday">금</div>
                <div className="calendar-weekday">토</div>

                {calendarData.days.map((item, idx) => {
                  if (item.day === null) {
                    return <div key={`empty-${idx}`} className="calendar-day calendar-day-empty"></div>;
                  }

                  let dayClass = 'calendar-day';
                  if (item.isWedding) dayClass += ' calendar-day-wedding';
                  else if (item.isSun) dayClass += ' calendar-day-sun';
                  else if (item.isSat) dayClass += ' calendar-day-sat';

                  return (
                    <div key={`day-${idx}`} className={dayClass}>
                      {item.day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Live D-Day Timer */}
        <div className="dday-container">
          {timeLeft.isPast ? (
            <div className="dday-banner-text">
              축하해 주셔서 감사합니다! <br />
              예쁘게 잘 살겠습니다. 💕
            </div>
          ) : (
            <>
              <div className="countdown-timer">
                <div className="countdown-item">
                  <span className="countdown-label">DAYS</span>
                  <span className="countdown-value">{timeLeft.days}</span>
                </div>
                <span className="countdown-separator">:</span>
                <div className="countdown-item">
                  <span className="countdown-label">HOUR</span>
                  <span className="countdown-value">{timeLeft.hours}</span>
                </div>
                <span className="countdown-separator">:</span>
                <div className="countdown-item">
                  <span className="countdown-label">MIN</span>
                  <span className="countdown-value">{timeLeft.minutes}</span>
                </div>
                <span className="countdown-separator">:</span>
                <div className="countdown-item">
                  <span className="countdown-label">SEC</span>
                  <span className="countdown-value">{timeLeft.seconds}</span>
                </div>
              </div>
              <div className="countdown-text">
                {config.groom.name}, {config.bride.name}의 결혼식이 <span className="countdown-highlight">{timeLeft.days}</span>일 남았습니다.
              </div>
            </>
          )}
        </div>
      </section>

      {/* 5. Gallery Section */}
      <section className="gallery-section scroll-reveal">
        <h2 className="section-title">갤러리</h2>
        <p className="section-subtitle">Our fetch(sheetUrlGallery</p>

        {/* Multi-image upload toolbar for Admin in Edit Mode */}
        {isEditMode && (
          <div className="card" style={{ marginBottom: '16px', padding: '16px', textAlign: 'center', border: '1.5px dashed var(--primary)' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>📷 갤러리 사진 전체 설정 (최대 50장)</span>
            <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '4px 0 12px' }}>
              여러 장의 사진을 한 번에 선택하여 업로드할 수 있습니다. 기존 사진들은 모두 교체됩니다.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => document.getElementById('upload-gallery-multi').click()}
            >
              PC에서 사진 불러오기 📁
            </button>
            <input
              type="file"
              id="upload-gallery-multi"
              style={{ display: 'none' }}
              accept="image/*"
              multiple
              onChange={handleMultipleImagesUpload}
            />
            <p style={{ fontSize: '11px', color: 'var(--primary-dark)', marginTop: '8px' }}>
              현재 등록된 사진: {config.images.gallery.length}장 (사진을 마우스로 끌어서 순서를 변경할 수 있습니다 🖐️)
            </p>
          </div>
        )}

        {/* Thumbnail grid */}
        {galleryImages.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-light)', padding: '30px 0', textAlign: 'center' }}>
            등록된 사진이 없습니다. {isEditMode ? '위의 버튼을 통해 사진을 등록해 주세요!' : '예쁜 사진으로 가득 채워질 예정입니다.'} 🌸
          </p>
        ) : (
          <div className="gallery-grid">
            {visibleImages.map((img, idx) => (
              <div
                key={idx}
                className={`gallery-item ${!isGalleryExpanded && idx >= 6 ? 'gallery-item-faded' : ''}`}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(idx, e)}
                onClick={() => setLightbox({ isOpen: true, index: idx })}
              >
                <img src={img.src} className="gallery-img" alt={img.caption} />

                {/* Delete button (Only visible in Edit Mode) */}
                {isEditMode && (
                  <button
                    type="button"
                    className="gallery-item-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening lightbox
                      if (window.confirm('이 사진을 갤러리에서 삭제하시겠습니까?')) {
                        setConfig(prev => {
                          const updatedGallery = prev.images.gallery.filter((_, i) => i !== idx);
                          return {
                            ...prev,
                            images: {
                              ...prev.images,
                              gallery: updatedGallery
                            }
                          };
                        });
                      }
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Show More / Collapse Button */}
        {galleryImages.length > 6 && (
          <div className="contact-button-container" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ width: 'auto', minWidth: '150px' }}
              onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
            >
              {isGalleryExpanded ? '사진 접기 ▲' : `사진 더보기 (전체 ${galleryImages.length}장) ▼`}
            </button>
          </div>
        )}
      </section>

      {/* 5.5. Information Section (공지사항) */}
      <section className="information-section scroll-reveal">
        <p className="information-subtitle-en">INFORMATION</p>
        <h2 className="section-title">공지사항</h2>

        <div className="info-tabs-container">
          <div className="info-tabs-header">
            <button
              className={`info-tab-btn ${activeInfoTab === 'wedding' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('wedding')}
            >
              예식 정보
            </button>
            <button
              className={`info-tab-btn ${activeInfoTab === 'meal' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('meal')}
            >
              식사 안내
            </button>
            <button
              className={`info-tab-btn ${activeInfoTab === 'dress' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('dress')}
            >
              드레스 코드
            </button>
          </div>

          <div className="info-tab-content-card">
            {activeInfoTab === 'wedding' && (
              <div className="info-tab-pane animate-fade-in">
                <div className="image-edit-wrapper" style={{ marginBottom: '20px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={getImageSrc(config.images?.noticeHall, noticeHallImg)} className="info-pane-img" style={{ marginBottom: 0 }} alt="예식 정보" />
                  {isEditMode && (
                    <div className="image-edit-overlay">
                      <button
                        type="button"
                        className="image-edit-btn"
                        onClick={() => document.getElementById('upload-notice-hall').click()}
                      >
                        사진 변경 📷
                      </button>
                      <input
                        type="file"
                        id="upload-notice-hall"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'noticeHall')}
                      />
                    </div>
                  )}
                </div>
                <div className="info-pane-text-content">
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_title1')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text1_1', true)}</span>
                    </p>
                    <p className="info-group-text highlight">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text1_2', true)}</span>
                    </p>
                  </div>
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_title2')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text2', true)}</span>
                    </p>
                  </div>
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_title3')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text3', true)}</span>
                    </p>
                  </div>
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_title4')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text4_1', true)}</span>
                    </p>
                    <p className="info-group-text highlight">
                      <span className="editable-area">{renderEditableText('notice', 'wedding_text4_2', true)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeInfoTab === 'meal' && (
              <div className="info-tab-pane animate-fade-in">
                <div className="image-edit-wrapper" style={{ marginBottom: '20px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={getImageSrc(config.images?.noticeMeal, noticeMealImg)} className="info-pane-img" style={{ marginBottom: 0 }} alt="식사 안내" />
                  {isEditMode && (
                    <div className="image-edit-overlay">
                      <button
                        type="button"
                        className="image-edit-btn"
                        onClick={() => document.getElementById('upload-notice-meal').click()}
                      >
                        사진 변경 📷
                      </button>
                      <input
                        type="file"
                        id="upload-notice-meal"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'noticeMeal')}
                      />
                    </div>
                  )}
                </div>
                <div className="info-pane-text-content">
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'meal_title1')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'meal_text1_1', true)}</span>
                    </p>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'meal_text1_2', true)}</span>
                    </p>
                    <p className="info-group-text highlight" style={{ marginTop: '12px' }}>
                      <span className="editable-area">{renderEditableText('notice', 'meal_text1_3', true)}</span>
                    </p>
                    <p className="info-group-text" style={{ marginTop: '8px' }}>
                      <span className="editable-area">{renderEditableText('notice', 'meal_text1_4', true)}</span>
                    </p>
                  </div>
                  <div className="info-content-group">
                    <h4 className="info-group-title">
                      <span className="editable-area">{renderEditableText('notice', 'meal_title2')}</span>
                    </h4>
                    <p className="info-group-text">
                      <span className="editable-area">{renderEditableText('notice', 'meal_text2', true)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeInfoTab === 'dress' && (
              <div className="info-tab-pane animate-fade-in">
                <div className="image-edit-wrapper" style={{ marginBottom: '20px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={getImageSrc(config.images?.noticeDress, noticeDressImg)} className="info-pane-img" style={{ marginBottom: 0 }} alt="드레스 코드" />
                  {isEditMode && (
                    <div className="image-edit-overlay">
                      <button
                        type="button"
                        className="image-edit-btn"
                        onClick={() => document.getElementById('upload-notice-dress').click()}
                      >
                        사진 변경 📷
                      </button>
                      <input
                        type="file"
                        id="upload-notice-dress"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'noticeDress')}
                      />
                    </div>
                  )}
                </div>
                <div className="info-pane-text-content" style={{ padding: '16px 8px' }}>
                  <p className="info-group-text highlight" style={{ fontSize: '15px', marginBottom: '12px' }}>
                    <span className="editable-area">{renderEditableText('notice', 'dress_text1', true)}</span>
                  </p>
                  <p className="info-group-text" style={{ fontSize: '14px', marginBottom: '16px' }}>
                    <span className="editable-area">{renderEditableText('notice', 'dress_text2', true)}</span>
                  </p>
                  <p className="info-group-text highlight-note" style={{ fontSize: '13px', color: 'var(--text-light)', borderTop: '1px dashed var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                    <span className="editable-area">{renderEditableText('notice', 'dress_text3', true)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Location Section */}
      <section className="location-section scroll-reveal">
        <h2 className="section-title">오시는 길</h2>
        <p className="section-subtitle">Map & Location</p>

        <div className="card">
          <h3 className="editable-area" style={{ fontSize: '16px', marginBottom: '8px' }}>
            {renderEditableLocation('hallName')}
          </h3>
          <p className="editable-area" style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '16px' }}>
            {renderEditableLocation('address')}
          </p>

          {/* Dynamic Map (Naver Map API) or Interactive Google Map Embed */}
          <div className="map-image-container" style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--border)' }}>
            {config.location.naverClientId && mapLoaded ? (
              <div
                ref={mapRef}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(config.location.address + ' ' + config.location.hallName)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="Map"
              ></iframe>
            )}

            {/* Address Copy overlay button */}
            <div
              className="map-overlay-btn"
              onClick={() => copyText(config.location.address, '식장 주소가 복사되었습니다! 📋')}
              style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}
            >
              📍 주소 복사
            </div>

            {/* Instruction tooltip (only shown for fallback Google Map) */}
            {(!config.location.naverClientId || !mapLoaded) && (
              <div
                style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(78, 68, 73, 0.85)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 10 }}
              >
                지도를 드래그하여 움직이거나 확대할 수 있습니다
              </div>
            )}
          </div>

          {/* Navigation Links settings */}
          {isEditMode && (
            <div className="card" style={{ fontSize: '12px', border: '1px solid var(--primary)' }}>
              <strong style={{ color: 'var(--primary-dark)', display: 'block', marginBottom: '8px' }}>🗺️ 네이버 동적 지도 설정 (API)</strong>
              <div className="form-group">
                <label style={{ fontSize: '11px' }}>네이버 지도 Client ID</label>
                <input
                  type="text"
                  className="edit-input-inline"
                  placeholder="발급받은 Client ID 입력 (미입력 시 이미지 약도 노출)"
                  value={config.location.naverClientId || ''}
                  onChange={(e) => updateLocationField('naverClientId', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px' }}>위도 (Latitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="edit-input-inline"
                    value={config.location.latitude}
                    onChange={(e) => updateLocationField('latitude', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px' }}>경도 (Longitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="edit-input-inline"
                    value={config.location.longitude}
                    onChange={(e) => updateLocationField('longitude', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <hr style={{ margin: '12px 0', borderColor: 'var(--border)', opacity: 0.5 }} />

              <strong style={{ color: 'var(--primary-dark)', display: 'block', marginBottom: '8px' }}>🗺️ 네비게이션 앱 링크 설정</strong>
              <div className="form-group">
                <label style={{ fontSize: '11px' }}>카카오맵 이동 링크</label>
                <input
                  type="text"
                  className="edit-input-inline"
                  value={config.location.mapLinkKakao}
                  onChange={(e) => updateLocationField('mapLinkKakao', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px' }}>네이버 지도 이동 링크</label>
                <input
                  type="text"
                  className="edit-input-inline"
                  value={config.location.mapLinkNaver}
                  onChange={(e) => updateLocationField('mapLinkNaver', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px' }}>티맵 이동 링크</label>
                <input
                  type="text"
                  className="edit-input-inline"
                  value={config.location.mapLinkTmap}
                  onChange={(e) => updateLocationField('mapLinkTmap', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Navigation Apps Shortcuts */}
          <div className="navi-buttons">
            <a href={config.location.mapLinkKakao} target="_blank" rel="noreferrer" className="navi-btn">
              <span>💛</span>
              <span>카카오맵</span>
            </a>
            <a href={config.location.mapLinkNaver} target="_blank" rel="noreferrer" className="navi-btn">
              <span>💚</span>
              <span>네이버 지도</span>
            </a>
            <a href={config.location.mapLinkTmap} target="_blank" rel="noreferrer" className="navi-btn">
              <span>💙</span>
              <span>티맵</span>
            </a>
          </div>

          {/* Transport Info */}
          <div className="transport-list">
            <div className="transport-item">
              <div className="transport-method">
                <span className="transport-icon">🚗</span>
                <span>자가용 안내</span>
              </div>
              <div className="transport-desc">
                <p>• 토브헤세드 전용 주차장 또는 인근 외부 연계 주차장 구역을 이용해 주시기 바랍니다.</p>
              </div>
            </div>

            <div className="transport-item">
              <div className="transport-method">
                <span className="transport-icon">🚌</span>
                <span>대중교통 안내</span>
              </div>
              <div className="transport-desc">
                <p>• 지하철 <strong>7호선 학동역</strong> 10번 출구 또는 <strong>3호선 압구정역</strong> 3번 출구에서 하차 후 도보 또는 버스를 이용해 주시기 바랍니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. RSVP Button Card */}
      <section className="rsvp-section scroll-reveal" style={{ backgroundColor: 'var(--primary-light)' }}>
        <h2 className="section-title">참석 의사 전달하기</h2>
        <p className="section-subtitle" style={{ color: 'var(--primary-dark)' }}>RSVP</p>

        <p style={{ fontSize: '13px', textAlign: 'center', marginBottom: '20px', lineHeight: 1.6 }}>
          신랑 신부에게 참석 여부를 전달해 주세요.<br />
          식사 준비 및 좌석 배치에 큰 도움이 됩니다.
        </p>

        <button
          type="button"
          className="btn btn-primary rsvp-modal-trigger-btn"
          onClick={() => setShowRsvpModal(true)}
        >
          💌 참석 의사 보내기 (RSVP)
        </button>
      </section>

      {/* 8. Guestbook Section */}
      <section className="guestbook-section scroll-reveal">
        <h2 className="section-title">방명록</h2>
        <p className="section-subtitle">Guestbook</p>

        {/* Message Input Form */}
        <form className="card guestbook-form" onSubmit={handleGuestbookSubmit}>
          <div className="guestbook-input-row">
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                placeholder="성함"
                value={guestbookForm.name}
                onChange={(e) => setGuestbookForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                placeholder="4자리 숫자"
                value={guestbookForm.password}
                onChange={(e) => setGuestbookForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>메시지</label>
            <textarea
              rows="3"
              placeholder="따뜻한 축하의 한마디를 남겨주세요."
              value={guestbookForm.message}
              onChange={(e) => setGuestbookForm(prev => ({ ...prev, message: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={gbLoading}
          >
            {gbLoading ? '등록 중...' : '축하글 등록하기'}
          </button>
        </form>

        {/* Guestbook message list */}
        <div className="guestbook-list">
          {guestbookList.length === 0 ? (
            <p className="guestbook-empty">첫 번째 축하글을 남겨보세요! 🌸</p>
          ) : (
            guestbookList.map((item) => (
              <div key={item.id} className="guestbook-card">
                <div className="guestbook-card-header">
                  <span className="guestbook-card-name">{item.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="guestbook-card-date">
                      {item.timestamp ? formatGuestbookDate(item.timestamp) : '방금 전'}
                    </span>
                    {isEditMode && (
                      <button
                        type="button"
                        className="guestbook-card-delete-btn"
                        onClick={() => handleDeleteMessage(item.id, item.password)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <p className="guestbook-card-message">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 9. Gift / Accounts Section */}
      <section className="gift-section scroll-reveal">
        <h2 className="section-title">마음 전하실 곳</h2>
        <p className="section-subtitle">Gift accounts</p>

        <p style={{ fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: 1.6 }}>
          축하의 마음을 담아 축의금을 보낼 수 있는<br />
          신랑 신부 및 혼주 분들의 계좌입니다.
        </p>

        <div className="accounts-container">
          {/* Groom's Side */}
          <div className={`accordion-item ${activeAccordion === 'groom' ? 'active' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('groom')}>
              <span>💙 신랑측 계좌번호 보기</span>
              <span className="accordion-icon">▼</span>
            </div>
            {activeAccordion === 'groom' && (
              <div className="accordion-content">
                {/* Groom */}
                {(isEditMode || (config.groom.bankName && config.groom.bankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('groom', 'name')}</span>
                        <span className="relation">신랑</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('groom', 'bankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('groom', 'bankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.groom.bankName} ${config.groom.bankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신랑 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('groom', 'bankName', '');
                                updateField('groom', 'bankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Groom Father */}
                {(isEditMode || (config.groom.fatherBankName && config.groom.fatherBankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('groom', 'fatherName')}</span>
                        <span className="relation">신랑 아버지</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('groom', 'fatherBankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('groom', 'fatherBankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.groom.fatherBankName} ${config.groom.fatherBankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신랑 아버지 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('groom', 'fatherBankName', '');
                                updateField('groom', 'fatherBankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Groom Mother */}
                {(isEditMode || (config.groom.motherBankName && config.groom.motherBankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('groom', 'motherName')}</span>
                        <span className="relation">신랑 어머니</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('groom', 'motherBankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('groom', 'motherBankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.groom.motherBankName} ${config.groom.motherBankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신랑 어머니 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('groom', 'motherBankName', '');
                                updateField('groom', 'motherBankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bride's Side */}
          <div className={`accordion-item ${activeAccordion === 'bride' ? 'active' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('bride')}>
              <span>💗 신부측 계좌번호 보기</span>
              <span className="accordion-icon">▼</span>
            </div>
            {activeAccordion === 'bride' && (
              <div className="accordion-content">
                {/* Bride */}
                {(isEditMode || (config.bride.bankName && config.bride.bankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('bride', 'name')}</span>
                        <span className="relation">신부</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('bride', 'bankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('bride', 'bankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.bride.bankName} ${config.bride.bankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신부 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('bride', 'bankName', '');
                                updateField('bride', 'bankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bride Father */}
                {(isEditMode || (config.bride.fatherBankName && config.bride.fatherBankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('bride', 'fatherName')}</span>
                        <span className="relation">신부 아버지</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('bride', 'fatherBankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('bride', 'fatherBankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.bride.fatherBankName} ${config.bride.fatherBankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신부 아버지 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('bride', 'fatherBankName', '');
                                updateField('bride', 'fatherBankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bride Mother */}
                {(isEditMode || (config.bride.motherBankName && config.bride.motherBankAccount)) && (
                  <div className="account-card">
                    <div className="account-row-top">
                      <span className="account-holder">
                        <span className="editable-area">{renderEditableText('bride', 'motherName')}</span>
                        <span className="relation">신부 어머니</span>
                      </span>
                    </div>
                    <div className="account-num-row">
                      <span className="account-number">
                        <span className="editable-area">{renderEditableText('bride', 'motherBankName')}</span>{' '}
                        <span className="editable-area">{renderEditableText('bride', 'motherBankAccount')}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="account-copy-btn"
                          onClick={() => copyText(`${config.bride.motherBankName} ${config.bride.motherBankAccount}`)}
                        >
                          복사
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="account-delete-btn"
                            onClick={() => {
                              if (window.confirm('신부 어머니 계좌 정보를 삭제하시겠습니까?')) {
                                updateField('bride', 'motherBankName', '');
                                updateField('bride', 'motherBankAccount', '');
                              }
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer & Dev settings */}
      <footer className="invitation-footer">
        <p>{config.groom.name} ❤️ {config.bride.name} 결혼합니다.</p>
        <p style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
          Copyright © 2026. All rights reserved.
        </p>

        <button
          type="button"
          className="guide-toggle-btn"
          onClick={() => setShowGuideModal(true)}
        >
          ⚙️ 구글 시트 연동 관리자 설정
        </button>
      </footer>

      {/* ================= EDIT MODE FLOATING TOOLBAR ================= */}
      {isEditableEnv && (
        <>
          {!isEditMode ? (
            <div className="edit-collapsed-trigger">
              <button
                type="button"
                className="edit-toggle-fab"
                onClick={() => setIsEditMode(true)}
              >
                ✍️ 실시간 편집 활성화
              </button>
            </div>
          ) : (
            <div className="edit-control-bar">
              <div className="edit-control-header">
                <span>⚙️ 모바일 청첩장 실시간 편집 패널</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: 'auto', padding: '4px 8px' }}
                  onClick={() => setIsEditMode(false)}
                >
                  편집 비활성화 ❌
                </button>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '2px' }}>배경음악 URL 설정</label>
                <input
                  type="text"
                  className="edit-input-inline"
                  style={{ fontSize: '11px' }}
                  value={config.bgmUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, bgmUrl: e.target.value }))}
                />
              </div>
              <div className="edit-control-buttons">
                <button
                  type="button"
                  className="edit-control-btn edit-control-btn-server"
                  onClick={saveConfigToServer}
                >
                  서버에 즉시 저장 ☁️
                </button>
                <button
                  type="button"
                  className="edit-control-btn edit-control-btn-save"
                  onClick={saveConfigLocally}
                >
                  기기에 임시 저장
                </button>
                <button
                  type="button"
                  className="edit-control-btn edit-control-btn-copy"
                  onClick={copyConfigJson}
                >
                  배포용 설정 복사 (JSON)
                </button>
                <button
                  type="button"
                  className="edit-control-btn edit-control-btn-reset"
                  onClick={resetConfig}
                >
                  수정 초기화
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MODALS & POPUPS ================= */}

      {/* 1. Contact / Invite Modal */}
      {showContactModal && (
        <div className="contact-modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="contact-modal-close" onClick={() => setShowContactModal(false)}>×</button>
            <h3 className="contact-modal-title">📞 축하 연락처</h3>

            <div className="contact-list">
              <div className="contact-item">
                <div className="contact-info">
                  <span className="contact-name">{config.groom.name}</span>
                  <span className="contact-role">신랑</span>
                  {isEditMode && (
                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '11px' }}
                        value={config.groom.phone}
                        onChange={(e) => updateField('groom', 'phone', e.target.value)}
                        placeholder="신랑 전화번호"
                      />
                    </div>
                  )}
                </div>
                <div className="contact-actions">
                  <a href={`tel:${config.groom.phone}`} className="contact-icon-btn">📞</a>
                  <a href={`sms:${config.groom.phone}`} className="contact-icon-btn">💬</a>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-info">
                  <span className="contact-name">{config.bride.name}</span>
                  <span className="contact-role">신부</span>
                  {isEditMode && (
                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="text"
                        className="edit-input-inline"
                        style={{ fontSize: '11px' }}
                        value={config.bride.phone}
                        onChange={(e) => updateField('bride', 'phone', e.target.value)}
                        placeholder="신부 전화번호"
                      />
                    </div>
                  )}
                </div>
                <div className="contact-actions">
                  <a href={`tel:${config.bride.phone}`} className="contact-icon-btn" style={{ color: 'var(--primary)' }}>📞</a>
                  <a href={`sms:${config.bride.phone}`} className="contact-icon-btn" style={{ color: 'var(--primary)' }}>💬</a>
                </div>
              </div>

              {isEditMode && (
                <div className="card" style={{ fontSize: '11px', margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong>📞 양가 혼주 전화번호 관리</strong>
                  <div>
                    <label style={{ fontSize: '9px' }}>신랑 아버님 연락처</label>
                    <input type="text" className="edit-input-inline" value={config.groom.fatherPhone} onChange={(e) => updateField('groom', 'fatherPhone', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px' }}>신랑 어머님 연락처</label>
                    <input type="text" className="edit-input-inline" value={config.groom.motherPhone} onChange={(e) => updateField('groom', 'motherPhone', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px' }}>신부 아버님 연락처</label>
                    <input type="text" className="edit-input-inline" value={config.bride.fatherPhone} onChange={(e) => updateField('bride', 'fatherPhone', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px' }}>신부 어머님 연락처</label>
                    <input type="text" className="edit-input-inline" value={config.bride.motherPhone} onChange={(e) => updateField('bride', 'motherPhone', e.target.value)} />
                  </div>
                </div>
              )}

              {!isEditMode && (
                <div className="card" style={{ fontSize: '12px', padding: '12px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong>👨‍👩‍👦 양가 혼주 연락처</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>신랑 혼주: {config.groom.fatherName} / {config.groom.motherName}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {config.groom.fatherPhone && <a href={`tel:${config.groom.fatherPhone}`} className="contact-icon-btn" style={{ width: '28px', height: '28px', fontSize: '11px' }}>👨</a>}
                      {config.groom.motherPhone && <a href={`tel:${config.groom.motherPhone}`} className="contact-icon-btn" style={{ width: '28px', height: '28px', fontSize: '11px' }}>👩</a>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>신부 혼주: {config.bride.fatherName} / {config.bride.motherName}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {config.bride.fatherPhone && <a href={`tel:${config.bride.fatherPhone}`} className="contact-icon-btn" style={{ width: '28px', height: '28px', fontSize: '11px', color: 'var(--primary)' }}>👨</a>}
                      {config.bride.motherPhone && <a href={`tel:${config.bride.motherPhone}`} className="contact-icon-btn" style={{ width: '28px', height: '28px', fontSize: '11px', color: 'var(--primary)' }}>👩</a>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '20px', textAlign: 'center' }}>
              축하 전화를 드리거나 따뜻한 문자를 보내보세요!
            </p>
          </div>
        </div>
      )}

      {/* 2. RSVP Form Modal */}
      {showRsvpModal && (
        <div className="contact-modal-overlay" onClick={() => setShowRsvpModal(false)}>
          <div className="contact-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="contact-modal-close" onClick={() => setShowRsvpModal(false)}>×</button>

            {rsvpSuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <span style={{ fontSize: '40px' }}>🎉</span>
                <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>참석 의사 전달 완료!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>전해주신 소중한 정보는 안전하게 저장되었습니다.</p>
              </div>
            ) : (
              <>
                <h3 className="contact-modal-title">💌 참석 의사 전달</h3>
                <form onSubmit={handleRsvpSubmit}>
                  {/* Name */}
                  <div className="form-group">
                    <label>성함</label>
                    <input
                      type="text"
                      placeholder="참석자 성함"
                      value={rsvpForm.name}
                      onChange={(e) => setRsvpForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Relation */}
                  <div className="form-group">
                    <label>구분</label>
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="rel-groom"
                          name="relation"
                          checked={rsvpForm.relation === 'groom'}
                          onChange={() => setRsvpForm(prev => ({ ...prev, relation: 'groom' }))}
                        />
                        <label htmlFor="rel-groom" className="radio-label">신랑측</label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="rel-bride"
                          name="relation"
                          checked={rsvpForm.relation === 'bride'}
                          onChange={() => setRsvpForm(prev => ({ ...prev, relation: 'bride' }))}
                        />
                        <label htmlFor="rel-bride" className="radio-label">신부측</label>
                      </div>
                    </div>
                  </div>

                  {/* Attending */}
                  <div className="form-group">
                    <label>참석 여부</label>
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="att-yes"
                          name="attending"
                          checked={rsvpForm.attending === 'yes'}
                          onChange={() => setRsvpForm(prev => ({ ...prev, attending: 'yes' }))}
                        />
                        <label htmlFor="att-yes" className="radio-label">참석</label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="att-no"
                          name="attending"
                          checked={rsvpForm.attending === 'no'}
                          onChange={() => setRsvpForm(prev => ({ ...prev, attending: 'no' }))}
                        />
                        <label htmlFor="att-no" className="radio-label">미참석</label>
                      </div>
                    </div>
                  </div>

                  {/* Guest Count */}
                  {rsvpForm.attending === 'yes' && (
                    <>
                      <div className="form-group">
                        <label>동반 인원수 (본인 포함)</label>
                        <select
                          value={rsvpForm.guestsCount}
                          onChange={(e) => setRsvpForm(prev => ({ ...prev, guestsCount: parseInt(e.target.value) }))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <option key={n} value={n}>{n}명</option>
                          ))}
                        </select>
                      </div>

                      {/* Meal Option */}
                      <div className="form-group">
                        <label>식사 여부</label>
                        <div className="radio-group">
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="meal-yes"
                              name="meal"
                              checked={rsvpForm.meal === 'yes'}
                              onChange={() => setRsvpForm(prev => ({ ...prev, meal: 'yes' }))}
                            />
                            <label htmlFor="meal-yes" className="radio-label">식사함</label>
                          </div>
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="meal-no"
                              name="meal"
                              checked={rsvpForm.meal === 'no'}
                              onChange={() => setRsvpForm(prev => ({ ...prev, meal: 'no' }))}
                            />
                            <label htmlFor="meal-no" className="radio-label">안함</label>
                          </div>
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="meal-undecided"
                              name="meal"
                              checked={rsvpForm.meal === 'undecided'}
                              onChange={() => setRsvpForm(prev => ({ ...prev, meal: 'undecided' }))}
                            />
                            <label htmlFor="meal-undecided" className="radio-label">미정</label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Message to Couple */}
                  <div className="form-group">
                    <label>축하 메시지 / 전달사항</label>
                    <textarea
                      rows="2"
                      placeholder="신랑 신부에게 전하실 말씀"
                      value={rsvpForm.message}
                      onChange={(e) => setRsvpForm(prev => ({ ...prev, message: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={rsvpLoading}
                  >
                    {rsvpLoading ? '전송 중...' : '참석 정보 보내기'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Gallery Lightbox Modal (loop-based navigation) */}
      {lightbox.isOpen && (
        <div
          className="lightbox-overlay"
          onClick={() => {
            setLightbox({ isOpen: false, index: 0 });
            setDragOffset(0);
            setIsDragging(false);
          }}
        >
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={() => {
                setLightbox({ isOpen: false, index: 0 });
                setDragOffset(0);
                setIsDragging(false);
              }}
            >
              ×
            </button>
            <div className="lightbox-slider-wrapper" style={{ overflow: 'hidden', width: '100%', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' }}>
              <div
                className="lightbox-slider"
                style={{
                  display: 'flex',
                  width: '100%',
                  transform: dragOffset >= 0
                    ? `translate3d(calc(${-lightbox.index * 100}% + ${dragOffset}px), 0, 0)`
                    : `translate3d(calc(${-lightbox.index * 100}% - ${Math.abs(dragOffset)}px), 0, 0)`,
                  transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="lightbox-slide"
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <img
                      src={img.src}
                      className="lightbox-img"
                      alt={img.caption}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        userSelect: 'none',
                        WebkitUserDrag: 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="lightbox-caption">{galleryImages[lightbox.index].caption}</div>

            {/* Loop Slider Navigations */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav lightbox-prev"
                  onClick={handlePrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox-nav lightbox-next"
                  onClick={handleNext}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Google Sheets Setup Guide Modal */}
      {showGuideModal && (
        <div className="contact-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="contact-modal" style={{ maxWidth: '440px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="contact-modal-close" onClick={() => setShowGuideModal(false)}>×</button>
            <h3 className="contact-modal-title" style={{ fontFamily: 'var(--sans)' }}>⚙️ 구글 스프레드시트 연동</h3>

            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              <div className="form-group">
                <label>구글 스프레드시트 웹 앱 URL</label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  defaultValue={sheetUrl}
                  id="sheet-url-input"
                />
                <button
                  type="button"
                  style={{ marginTop: '8px' }}
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const val = document.getElementById('sheet-url-input').value;
                    saveSheetUrl(val);
                  }}
                >
                  연동 주소 저장하기
                </button>
              </div>

              <div className="guide-step">
                <strong>연동 설정 방법:</strong>
                <ol>
                  <li><a href="https://docs.google.com/spreadsheets" target="_blank" rel="noreferrer">구글 스프레드시트</a>를 하나 새로 만듭니다.</li>
                  <li>시트 이름을 <strong>RSVP</strong>와 <strong>Guestbook</strong>이라는 이름으로 각각 두 개의 탭을 만듭니다.</li>
                  <li>상단 메뉴에서 [확장 프로그램] &gt; [Apps Script]를 클릭합니다.</li>
                  <li>기존 코드를 모두 지우고 아래의 코드를 복사해서 붙여넣습니다.</li>
                </ol>
              </div>

              <div className="guide-code-box">
                {`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  
  if (action === 'saveConfig') {
    var configObj = JSON.parse(data.config);
    
    // Helper function to save Base64 image to Google Drive and return public link
    function saveBase64ImageToDrive(base64Data, filename) {
      try {
        var splitData = base64Data.split(',');
        if (splitData.length < 2) return base64Data; // Not a valid Base64 URI
        
        var header = splitData[0];
        var contentType = header.split(':')[1].split(';')[0];
        var rawBytes = Utilities.base64Decode(splitData[1]);
        var blob = Utilities.newBlob(rawBytes, contentType, filename);
        
        // Find or create folder in Google Drive
        var folderName = "260613_MobileInvitation_Images";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }
        
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // Return direct link for embedding in <img> tag
        return "https://drive.google.com/uc?export=view&id=" + file.getId();
      } catch (err) {
        Logger.log("Failed to save image: " + err.message);
        return base64Data; // Return original on error
      }
    }
    
    // Process single images if they are Base64
    if (configObj.images) {
      if (configObj.images.mainBanner && configObj.images.mainBanner.indexOf('data:image') === 0) {
        configObj.images.mainBanner = saveBase64ImageToDrive(configObj.images.mainBanner, "mainBanner_" + new Date().getTime());
      }
      if (configObj.images.groomAvatar && configObj.images.groomAvatar.indexOf('data:image') === 0) {
        configObj.images.groomAvatar = saveBase64ImageToDrive(configObj.images.groomAvatar, "groomAvatar_" + new Date().getTime());
      }
      if (configObj.images.brideAvatar && configObj.images.brideAvatar.indexOf('data:image') === 0) {
        configObj.images.brideAvatar = saveBase64ImageToDrive(configObj.images.brideAvatar, "brideAvatar_" + new Date().getTime());
      }
      
      // Process gallery array images
      if (configObj.images.gallery && Array.isArray(configObj.images.gallery)) {
        for (var i = 0; i < configObj.images.gallery.length; i++) {
          var img = configObj.images.gallery[i];
          if (img && img.indexOf('data:image') === 0) {
            configObj.images.gallery[i] = saveBase64ImageToDrive(img, "gallery_" + i + "_" + new Date().getTime());
          }
        }
      }
    }
    
    var configSheet = sheet.getSheetByName('Config') || sheet.insertSheet('Config');
    configSheet.clear();
    configSheet.getRange(1, 1).setValue(JSON.stringify(configObj));
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'rsvp') {
    var rsvpSheet = sheet.getSheetByName('RSVP') || sheet.insertSheet('RSVP');
    if (rsvpSheet.getLastRow() === 0) {
      rsvpSheet.appendRow(['시간', '이름', '구분', '참석여부', '인원수', '식사여부', '축하글']);
    }
    rsvpSheet.appendRow([
      new Date(),
      data.name,
      data.relation === 'groom' ? '신랑측' : '신부측',
      data.attending === 'yes' ? '참석' : '불참',
      data.guestsCount || 0,
      data.meal === 'yes' ? '식사함' : (data.meal === 'no' ? '안함' : '미정'),
      data.message
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'guestbook') {
    var gbSheet = sheet.getSheetByName('Guestbook') || sheet.insertSheet('Guestbook');
    if (gbSheet.getLastRow() === 0) {
      gbSheet.appendRow(['시간', '이름', '메시지', '비밀번호']);
    }
    gbSheet.appendRow([
      new Date(),
      data.name,
      data.message,
      data.password
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getGuestbook') {
    var gbSheet = sheet.getSheetByName('Guestbook');
    if (!gbSheet) {
      return ContentService.createTextOutput(JSON.stringify({ messages: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var rows = gbSheet.getDataRange().getValues();
    var messages = [];
    for (var i = 1; i < rows.length; i++) {
      messages.push({
        id: i,
        timestamp: rows[i][0],
        name: rows[i][1],
        message: rows[i][2],
        password: rows[i][3]
      });
    }
    messages.reverse();
    return ContentService.createTextOutput(JSON.stringify({ messages: messages }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  
  if (action === 'getConfig') {
    var configSheet = sheet.getSheetByName('Config');
    if (!configSheet) {
      return ContentService.createTextOutput(JSON.stringify({ config: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var configVal = configSheet.getRange(1, 1).getValue();
    return ContentService.createTextOutput(JSON.stringify({ config: configVal }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var gbSheet = sheet.getSheetByName('Guestbook');
  if (!gbSheet) {
    return ContentService.createTextOutput(JSON.stringify({ messages: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var rows = gbSheet.getDataRange().getValues();
  var messages = [];
  for (var i = 1; i < rows.length; i++) {
    messages.push({
      id: i,
      timestamp: rows[i][0],
      name: rows[i][1],
      message: rows[i][2],
      password: rows[i][3]
    });
  }
  messages.reverse();
  return ContentService.createTextOutput(JSON.stringify({ messages: messages }))
    .setMimeType(ContentService.MimeType.JSON);
}`}
              </div>

              <div className="guide-step">
                <ol start="5">
                  <li>Apps Script 에디터 우측 상단의 [배포] &gt; [새 배포]를 누릅니다.</li>
                  <li>유형 선택(톱니바퀴)에서 **웹 앱(Web App)**을 선택합니다.</li>
                  <li>설명에 버전을 입력하고, **[다음 사용자 서명으로 실행]**을 '나(본인 이메일)'로, **[액세스 권한이 있는 사용자]**를 **'모든 사용자(Anyone)'**로 설정 후 배포합니다.</li>
                  <li style={{ color: '#d9534f', fontWeight: 'bold', listStyleType: 'none', marginLeft: '-10px', marginTop: '6px', marginBottom: '6px', fontSize: '11px' }}>
                    ⚠️ 중요: [액세스 권한이 있는 사용자]를 반드시 '모든 사용자(Anyone)'로 설정하셔야 합니다. 그렇지 않으면 타인이나 모바일 기기에서 403(액세스 거부) 오류가 발생하여 청첩장 업데이트가 불가능합니다.
                  </li>
                  <li>나오는 **웹 앱 URL** 주소를 복사해 상단 입력칸에 넣고 저장해 주세요!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Manual Copy Fallback Modal */}
      {showManualCopyModal && (
        <div className="contact-modal-overlay" onClick={() => setShowManualCopyModal(false)}>
          <div className="contact-modal" style={{ maxWidth: '500px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="contact-modal-close" onClick={() => setShowManualCopyModal(false)}>×</button>
            <h3 className="contact-modal-title">📋 설정 JSON 직접 복사</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '12px', lineHeight: 1.5 }}>
              브라우저 보안 설정으로 자동 복사가 제한되었습니다. 아래 박스 안의 내용을 <strong>전체 선택(Ctrl+A)</strong>하여 복사한 뒤, <code>src/config.json</code> 파일에 붙여넣어 주세요.
            </p>
            <textarea
              readOnly
              rows="12"
              value={manualCopyText}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                const ta = document.querySelector('.contact-modal textarea');
                if (ta) {
                  ta.focus();
                  ta.select();
                  document.execCommand('copy');
                  alert('복사되었습니다! 📋');
                }
              }}
            >
              텍스트 복사하기
            </button>
          </div>
        </div>
      )}

      {/* Welcome RSVP Popup Modal */}
      {showWelcomeRsvp && (
        <div className="welcome-popup-overlay" onClick={closeWelcomePopup}>
          <div className="welcome-popup-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="welcome-popup-close"
              onClick={closeWelcomePopup}
            >
              ×
            </button>
            <h3 className="welcome-popup-title">참석 의사 전달</h3>

            <div className="welcome-popup-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <polyline points="17 11 19 13 23 9" stroke="var(--primary)" stroke-width="2" />
              </svg>
            </div>

            <p className="welcome-popup-description">
              특별한 날 축하의 마음으로 참석해주시는 모든 분들을 한 분 한 분 더욱 귀하게 모실 수 있도록, 아래 버튼으로 신랑 & 신부에게 꼭 참석여부 전달을 부탁드립니다.
            </p>

            <hr className="welcome-popup-divider" />

            <div className="welcome-popup-details">
              <div className="welcome-popup-detail-item">
                <span className="welcome-popup-detail-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <span>{formatPopupDate(config.weddingDate)}</span>
              </div>
              <div className="welcome-popup-detail-item">
                <span className="welcome-popup-detail-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                <span>{config.location.hallName}</span>
              </div>
              <div className="welcome-popup-detail-item">
                <span className="welcome-popup-detail-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span>{config.location.address}</span>
              </div>
            </div>

            <hr className="welcome-popup-divider" />

            <div className="welcome-popup-actions">
              <button
                type="button"
                className="btn-today-hide"
                onClick={handleHideWelcomeToday}
              >
                오늘 하루 보지 않기
              </button>
              <button
                type="button"
                className="btn-popup-rsvp"
                onClick={handlePopupRsvpClick}
              >
                참석의사 전달하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
