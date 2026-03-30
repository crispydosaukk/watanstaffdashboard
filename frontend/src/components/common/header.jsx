import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X, MapPin, Check, Navigation, Phone, Mail, Calendar, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api.js";
import ReadyInModal from "./ReadyInModal.jsx";
import { usePopup } from "../../context/PopupContext";

// Helper to load Google Maps Script dynamically
const loadGoogleMapsScript = (apiKey, callback) => {
  if (!apiKey) return;
  const existingScript = document.getElementById("google-maps-script");
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (callback) callback();
    };
    document.head.appendChild(script);
  } else {
    if (window.google && window.google.maps && window.google.maps.places) {
      if (callback) callback();
    } else {
      // If script exists but simple callback might not be attached to onload anymore or it's already loaded
      if (existingScript.getAttribute('data-loaded') === 'true') {
        if (callback) callback();
      } else {
        const oldOnload = existingScript.onload;
        existingScript.onload = () => {
          if (oldOnload) oldOnload();
          existingScript.setAttribute('data-loaded', 'true');
          if (callback) callback();
        };
      }
    }
  }
};

const LocationModal = ({ isOpen, onClose, onSelectLocation, onUseCurrentLocation, apiKey, currentAddress, currentLat, currentLng }) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);

  // Refs for the new API classes and session
  const PlaceSuggestionClass = useRef(null);
  const SessionTokenClass = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadGoogleMapsScript(apiKey, async () => {
        if (window.google && window.google.maps) {
          try {
            // New 2026-compliant import
            const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary("places");

            PlaceSuggestionClass.current = AutocompleteSuggestion;
            SessionTokenClass.current = AutocompleteSessionToken;

            if (!sessionToken.current) {
              sessionToken.current = new AutocompleteSessionToken();
            }
          } catch (err) {
            console.error("Google Maps Places Library Import Failed:", err);
            setError("Failed to initialize search. Please refresh.");
          }
        }
      });
    }
  }, [apiKey, isOpen]);

  useEffect(() => {
    if (!query) {
      setPredictions([]);
      setError(null);
      return;
    }

    if (query.length < 3) return;

    // Wait for library to load
    if (!PlaceSuggestionClass.current) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const AutocompleteSuggestion = PlaceSuggestionClass.current;
        const request = {
          input: query,
          sessionToken: sessionToken.current
        };

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        // Map new API structure to our UI format
        const formattedResults = (suggestions || [])
          .filter(s => s.placePrediction)
          .map(s => {
            const p = s.placePrediction;
            return {
              place_id: p.toPlace().id,
              description: p.text.text,
              structured_formatting: {
                main_text: p.mainText.text,
                secondary_text: p.secondaryText.text
              }
            };
          });

        setPredictions(formattedResults);

        if (formattedResults.length === 0) {
          // handled by zero length check in UI
        }

      } catch (err) {
        console.error("Places Search Error:", err);
        if (err.message && err.message.includes("ApiNotActivated")) {
          setError("API Not Activated. Enable 'Maps JavaScript API' in Google Console.");
        } else {
          setError("Unable to search locations.");
        }
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 font-sans">

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MapPin size={18} className="text-yellow-400" />
                Select Location
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 space-y-4 shrink-0">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search for area, street name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all font-medium"
                  autoFocus
                />
              </div>

              {/* Use Current Location Button */}
              <div className="space-y-3">
                <button
                  onClick={() => { onUseCurrentLocation(); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 transition-all group"
                >
                  <Navigation size={18} className="group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="block font-black text-[10px] uppercase tracking-widest">Use Current Location</span>
                    <span className="block text-[8px] opacity-40 uppercase tracking-widest font-black">Using GPS Pulse</span>
                  </div>
                </button>

                {/* Display Current Details if Available */}
                {(currentLat && currentLng) && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold tracking-wider mb-0.5">Current Detected Location</p>
                        <p className="text-white/80 text-sm font-medium leading-snug">{currentAddress}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="inline-flex items-center text-[10px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Lat: {Number(currentLat).toFixed(6)}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Lng: {Number(currentLng).toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Predictions List */}
            <div className="overflow-y-auto custom-scrollbar border-t border-white/5 flex-1 min-h-[100px]">
              {loading && (
                <div className="p-4 text-center text-white/40 text-sm">Searching...</div>
              )}

              {error && !loading && (
                <div className="p-4 text-center text-red-400/80 text-sm">{error}</div>
              )}

              {!loading && !error && query.length > 2 && predictions.length === 0 && (
                <div className="p-4 text-center text-white/40 text-sm">No results found</div>
              )}

              {!loading && predictions.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => {
                    onSelectLocation(place.description);
                    onClose();
                  }}
                  className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex items-start gap-3 group"
                >
                  <MapPin size={18} className="mt-0.5 text-white/40 group-hover:text-yellow-400 transition-colors shrink-0" />
                  <div>
                    <span className="block text-white text-sm font-medium group-hover:text-yellow-100">{place.structured_formatting.main_text}</span>
                    <span className="block text-white/40 text-xs mt-0.5">{place.structured_formatting.secondary_text}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white/5 border-t border-white/10 text-center shrink-0">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Powered by Google</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function Header({ onToggleSidebar, darkMode = true }) {
  const { showPopup } = usePopup();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifyRef = useRef(null);
  const token = localStorage.getItem("token");

  const [openMenu, setOpenMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [orders, setOrders] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  // Location States
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(null); // For toaster
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [selectedOrderForReady, setSelectedOrderForReady] = useState(null);
  const [generalNotifications, setGeneralNotifications] = useState([]);
  const [reservations, setReservations] = useState([]); // Track pending reservations

  const [selectedQuickRes, setSelectedQuickRes] = useState(null);
  const [updatingRes, setUpdatingRes] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const storedUserId = localStorage.getItem("userid") || user.id;
  const isSuperAdmin = String(user.role_title || "").toLowerCase() === "super admin";

  // Generate Google Maps API Key
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [locationRequired, setLocationRequired] = useState(true); // New state for location requirement

  // Logout
  const logout = () => {
    showPopup({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your session?",
      type: "confirm",
      onConfirm: () => {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Location Logic
  const getCurrentLocation = () => {
    setLocationName("");
    setCoords(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          try {
            if (!GOOGLE_MAPS_API_KEY) {
              setLocationName("No API Key");
              return;
            }
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.status === "OK" && data.results.length > 0) {
              const addressComponents = data.results[0].address_components;

              const locality = addressComponents.find(c => c.types.includes("locality"))?.long_name;
              const sublocality = addressComponents.find(c => c.types.includes("sublocality"))?.long_name;
              const adminArea = addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.short_name;

              // Always use the full formatted address for maximum accuracy
              let displayLoc = data.results[0].formatted_address || "Location not found";
              setLocationName(displayLoc);
            } else {
              setLocationName("Location not found");
            }
          } catch (error) {
            console.error("Geocoding error:", error);
            setLocationName("Error fetching location");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (error.code === 1) setLocationName("Location Denied");
          else setLocationName("Location Unavailable");
        }
      );
    } else {
      setLocationName("Geolocation not supported");
    }
  };

  // Initial Fetch (Once on mount)
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch Orders
  const fetchNewOrders = async () => {
    if (!token) return;
    try {
      const res = await api.get("/mobile/orders");
      if (res.data.status !== 1) return;

      const allRows = res.data.orders || [];

      // Group items by order_number
      const grouped = {};
      allRows.forEach(row => {
        if (!grouped[row.order_number]) {
          grouped[row.order_number] = {
            ...row,
            items: [],
            order_total: 0,
            wallet_total: 0,
            loyalty_total: 0,
            paid_amount: 0
          };
        }
        grouped[row.order_number].items.push({
          name: row.product_name,
          quantity: row.quantity,
          price: row.price,
          instruction: row.special_instruction
        });
        grouped[row.order_number].order_total += Number(row.gross_total);
        grouped[row.order_number].wallet_total += Number(row.wallet_amount);
        grouped[row.order_number].loyalty_total += Number(row.loyalty_amount);
        grouped[row.order_number].paid_amount += Number(row.grand_total);
      });

      const uniqueOrders = Object.values(grouped);
      const newOrders = uniqueOrders.filter((o) => Number(o.order_status) === 0);

      setOrders((prev) => {
        // If we have more new orders than before, triggers toast & sound
        if (newOrders.length > prev.length) {
          const latestOrder = newOrders[0]; 

          // Sound
          const audio = new Audio("/message.mp3");
          audio.play().catch((err) => console.log("Audio play failed:", err));

          // Toast
          setNewOrderToast(latestOrder);
        }
        return newOrders;
      });
    } catch (err) {
      console.error("Order notification fetch failed:", err);
    }
  };

  const fetchNewReservations = async () => {
    if (!token) return;
    try {
      // Use the existing admin reservation endpoint
      const res = await api.get("/table-reservations");
      if (res.data.status !== 1) return;

      const allRows = res.data.data || [];
      const pendingRows = allRows.filter(r => r.status === 'pending');

      setReservations(prev => {
        // If we have more pending reservations than before
        if (pendingRows.length > prev.length) {
          const latest = pendingRows[0];
          
          // Sound
          const audio = new Audio("/message.mp3");
          audio.play().catch(() => {});

          // Toast Alert
          setNewOrderToast({
             ...latest,
             isReservation: true,
             order_number: `Res #${latest.id}`,
             customer_name: latest.customer_name,
             body: `Table request for ${latest.party_size} persons`,
             items: [], // no food items
             order_total: 0
          });
        }
        return pendingRows;
      });
    } catch (err) {
      console.error("Reservation notification failed:", err);
    }
  };

  const fetchGeneralNotifications = async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const uId = storedUserId;
      const res = await api.get(`/mobile/notifications?user_type=admin&user_id=${uId}`);
      if (res.data.status !== 1) return;

      const newNotifs = res.data.data.filter(n => !n.is_read);

      setGeneralNotifications(prev => {
        // If we have more unread notifs than before, or a newer max ID
        const hasNew = newNotifs.length > prev.length || (newNotifs.length > 0 && Math.max(...newNotifs.map(n => n.id)) > (prev.length > 0 ? Math.max(...prev.map(n => n.id)) : 0));

        if (hasNew) {
          const audio = new Audio("/message.mp3");
          audio.play().catch(e => { });

          // Trigger popup for new registration just like orders
          const latest = newNotifs[0];
          if (latest) {
            setNewOrderToast({
              ...latest,
              isRegistration: true,
              items: [], // Registration doesn't have items
              order_total: 0
            });
          }
        }
        return newNotifs;
      });
    } catch (err) {
      console.error("General notifications fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchNewOrders();
    fetchNewReservations(); // Added polling for reservations
    fetchGeneralNotifications();
    const interval = setInterval(() => {
      fetchNewOrders();
      fetchNewReservations(); // Added polling for reservations
      fetchGeneralNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegistrationStatusUpdate = async (notif, status) => {
    try {
      const profileId = notif.order_number.replace('#ZBR-', '');
      await api.put(`/merchant-profile/update-status/${profileId}`, { status });
      setNewOrderToast(null);
      fetchGeneralNotifications();
    } catch {
      alert("Failed to update merchant status");
    }
  };

  const handleAccept = (order) => {
    setSelectedOrderForReady(order);
    setIsReadyModalOpen(true);
  };

  const confirmAccept = async (minutes) => {
    if (!selectedOrderForReady) return;
    try {
      await api.post("/mobile/orders/update-status", {
        order_number: selectedOrderForReady.order_number,
        status: 1,
        ready_in_minutes: Number(minutes),
      });
      setIsReadyModalOpen(false);
      setSelectedOrderForReady(null);
      setNewOrderToast(null); // Close popup after action
      fetchNewOrders();
    } catch { alert("Failed to accept order"); }
  };

  const handleReject = async (order) => {
    try {
      if (order.isReservation) {
        await api.put(`/table-reservations/${order.id}/status`, { status: "cancelled" });
      } else {
        await api.post("/mobile/orders/update-status", { order_number: order.order_number, status: 2 });
      }
      setNewOrderToast(null);
      fetchNewOrders();
      fetchNewReservations();
    } catch {
      alert("Failed to reject");
    }
  };

  const handleGoToReservation = (res) => {
    setNewOrderToast(null);
    setSelectedQuickRes(res); // Open the modal directly
  };

  const handleQuickUpdateStatus = async (id, status) => {
    setUpdatingRes(true);
    try {
      await api.put(`/table-reservations/${id}/status`, { status });
      setSelectedQuickRes((prev) => ({ ...prev, status }));
      fetchNewReservations(); // Refresh polling
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingRes(false);
    }
  };

  return (
    <>
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        apiKey={GOOGLE_MAPS_API_KEY}
        onUseCurrentLocation={getCurrentLocation}
        onSelectLocation={(loc) => setLocationName(loc)}
        currentAddress={locationName}
        currentLat={coords?.lat}
        currentLng={coords?.lng}
      />

      <ReadyInModal
        isOpen={isReadyModalOpen}
        onClose={() => setIsReadyModalOpen(false)}
        onConfirm={confirmAccept}
        orderNumber={selectedOrderForReady?.order_number}
      />

      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col border-b border-white/[0.06] shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #071428 0%, #0d1f45 50%, #071428 100%)' }}>
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-16">

          {/* LEFT: Branding & Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={onToggleSidebar} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200">
              <Menu size={22} />
            </button>

            <div className="hidden lg:flex items-center">
              <img
                src="/zingbitelogo.png"
                alt="ZingBite"
                className="h-[72px] w-auto object-contain drop-shadow-lg"
              />
            </div>
          </div>


          {/* MOBILE CENTER: Location ONLY */}
          <div className="flex lg:hidden flex-1 items-center mx-1.5 min-w-0">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shrink-0 active:scale-95 transition-all"
            >
              <MapPin size={14} className="text-yellow-400 shrink-0" />
              <span className="text-[11px] font-bold text-white/90 truncate uppercase tracking-tight">
                {locationName || "Detecting location..."}
              </span>
              <ChevronDown size={11} className="text-white/30 shrink-0" />
            </button>
          </div>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-4 max-w-2xl mx-auto px-4">
            {/* Location Badge - Clickable */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-3 text-white bg-white/8 hover:bg-white/15 py-2.5 px-6 rounded-xl border border-white/15 shadow-sm min-w-[300px] max-w-[500px] transition-all hover:scale-[1.01] active:scale-95 cursor-pointer focus:outline-none"
              style={{ width: '420px', fontWeight: 500, fontSize: '0.95rem' }}
            >
              <MapPin size={16} className="text-yellow-400 shrink-0" />
              <span className="truncate text-white/85 text-sm">{locationName || "Detecting location..."}</span>
              <ChevronDown size={14} className="text-white/40 ml-auto shrink-0" />
            </button>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Notifications */}
            <div className="relative" ref={notifyRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className={`relative p-2.5 rounded-xl transition-all duration-200 ${showNotifications
                    ? 'bg-white/10 text-yellow-300'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`}
              >
                <Bell size={19} />
                {(orders.length + generalNotifications.length + reservations.length) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 shadow-lg"
                    style={{ borderColor: '#071428' }}>
                    {orders.length + generalNotifications.length + reservations.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[68px] sm:top-auto sm:mt-3 w-auto sm:w-96 max-w-md rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200"
                  style={{ background: '#0b1a3d' }}
                >
                  {/* Header */}
                  <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.07] flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <h3 className="font-semibold text-white text-sm sm:text-[15px] tracking-wide">Notifications</h3>
                    <div className="flex items-center gap-2">
                       {(orders.length + generalNotifications.length + reservations.length) > 0 && <span className="text-xs font-semibold px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/25">{orders.length + generalNotifications.length + reservations.length} New</span>}
                       <button
                        onClick={() => setShowNotifications(false)}
                        className="sm:hidden p-1.5 hover:bg-white/8 text-white/50 hover:text-white rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {orders.length === 0 && generalNotifications.length === 0 && reservations.length === 0 ? (
                      <div className="py-10 text-center flex flex-col items-center">
                        <Bell size={36} className="mb-3 text-white/15" strokeWidth={1.2} />
                        <p className="text-sm text-white/40 font-medium">No new notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.05]">
                        {/* Table Reservation Notifications */}
                        {reservations.map((res) => (
                          <div key={`res-${res.id}`} className="p-4 sm:p-5 hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-white/[0.05]" onClick={() => { setSelectedQuickRes(res); setShowNotifications(false); }}>
                            <div className="flex justify-between items-start mb-1">
                               <div className="flex items-center gap-2">
                                  <p className="font-bold text-white text-sm">Table Booking</p>
                                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase rounded">Pending</span>
                               </div>
                               <p className="text-[10px] text-white/30 uppercase font-medium">Just now</p>
                            </div>
                            <p className="text-xs text-white/60 mb-2 truncate">{res.customer_name} • {res.party_size} Persons</p>
                            <div className="flex items-center gap-3 mt-3">
                               <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedQuickRes(res); setShowNotifications(false); }}
                                  className="flex-1 py-1.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-yellow-500/20"
                               >
                                  View Details
                               </button>
                            </div>
                          </div>
                        ))}
                        {/* General Notifications (Registrations etc) */}
                        {generalNotifications.map((notif) => (
                          <div key={`notif-${notif.id}`} className="p-4 sm:p-5 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate('/restaurantregistration')}>
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-white text-sm sm:text-base">{notif.title}</p>
                              <p className="text-[10px] text-white/30 uppercase font-medium">Just now</p>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed mb-3">{notif.body}</p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRegistrationStatusUpdate(notif, 1); }}
                                className="flex-1 flex items-center justify-center py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRegistrationStatusUpdate(notif, 2); }}
                                className="flex-1 flex items-center justify-center py-2 bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Order Notifications */}
                        {orders.map((order) => (
                          <div key={`order-${order.order_number}`} className="p-4 sm:p-5 hover:bg-white/[0.04] transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-white text-sm sm:text-base mb-1">Order #{order.order_number}</p>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded uppercase tracking-wider">New</span>
                                  <p className="text-[10px] text-white/40 uppercase font-medium">Just now</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-emerald-400 font-bold text-sm">£{Number(order.order_total).toFixed(2)}</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-tighter">Total Amount</p>
                              </div>
                            </div>

                            {/* Items List */}
                            <div className="bg-white/[0.04] rounded-xl p-3 mb-4 space-y-2 border border-white/[0.06]">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <p className="text-white/90 text-xs font-semibold leading-tight">
                                      <span className="text-emerald-400 mr-1">{item.quantity}x</span> {item.name}
                                    </p>
                                    {item.instruction && (
                                      <p className="text-[10px] text-amber-300/70 italic mt-0.5 ml-5">"{item.instruction}"</p>
                                    )}
                                  </div>
                                  <p className="text-white/40 text-[11px] font-mono">£{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>

                            {/* Payment Summary */}
                            {(order.wallet_total > 0 || order.loyalty_total > 0) && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {order.wallet_total > 0 && (
                                  <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md">
                                    Wallet used: -£{Number(order.wallet_total).toFixed(2)}
                                  </span>
                                )}
                                {order.loyalty_total > 0 && (
                                  <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">
                                    Loyalty used: -£{Number(order.loyalty_total).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
                              <button
                                onClick={() => handleAccept(order)}
                                className="flex items-center justify-center py-2.5 px-3 sm:px-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-xs sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => handleReject(order)}
                                className="flex items-center justify-center py-2.5 px-3 sm:px-4 bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 text-xs sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 sm:h-6 w-px hidden sm:block bg-white/[0.08]"></div>

            {/* Profile */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpenMenu((v) => !v)}
                className="flex items-center gap-2 sm:gap-2.5 p-1.5 rounded-xl hover:bg-white/8 transition-all pr-2 sm:pr-3"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg border border-white/15"
                  style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
                  {(() => { try { const u = JSON.parse(localStorage.getItem("user")); return u?.name?.charAt(0)?.toUpperCase() || 'A'; } catch { return 'A'; } })()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[14px] font-semibold leading-none text-white/90">
                    {(() => { try { return JSON.parse(localStorage.getItem("user"))?.name?.split(' ')[0] || 'Admin'; } catch { return 'Admin'; } })()}
                  </p>
                  {(() => {
                    let user = null;
                    try { user = JSON.parse(localStorage.getItem("user")); } catch { }
                    if (user && user.role_title === "Super Admin") {
                      return <p className="text-[10px] mt-0.5 font-medium tracking-wide text-white/50">SUPER ADMIN</p>;
                    }
                    return null;
                  })()}
                </div>
                <ChevronDown size={13} className="hidden sm:block text-white/40" />
              </button>

              {/* Profile Dropdown */}
              {openMenu && (
                <div
                  className="fixed sm:absolute right-2 sm:right-0 top-[68px] sm:top-auto sm:mt-3 w-[calc(100vw-1rem)] sm:w-56 max-w-xs rounded-xl shadow-2xl border border-white/[0.08] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200"
                  style={{ background: '#0b1a3d' }}
                >
                  <div className="p-1.5">
                    <button
                      onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-[14px] text-white/80 hover:bg-white/[0.06] hover:text-white rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <User size={15} className="text-white/40" /> Profile
                    </button>
                    <button
                      onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-[14px] text-white/80 hover:bg-white/[0.06] hover:text-white rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <Settings size={15} className="text-white/40" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-white/[0.07] p-1.5">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3.5 py-2.5 text-[14px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>


      </header>

      {/* 🛎️ Global Order Toaster (Swiggy/Zomato style) */}
      <AnimatePresence>
        {newOrderToast && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 z-[100] w-full max-w-sm sm:max-w-md"
          >
            <div className="bg-[#0b1a3d]/95 backdrop-blur-2xl border-2 border-yellow-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.2)] overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 border border-yellow-500/30 shadow-inner">
                      <Bell size={24} className="animate-bounce" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500 border border-white/20"></span>
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start font-sans">
                      <div>
                        <h4 className="text-white font-bold text-base tracking-tight leading-tight">
                          {newOrderToast.isRegistration ? "New Registration!" : newOrderToast.isReservation ? "New Reservation!" : "Incoming Order!"}
                        </h4>
                        <p className="text-yellow-400 text-xs font-bold leading-none mt-1 uppercase tracking-widest flex items-center gap-1">
                          {newOrderToast.isRegistration || newOrderToast.isReservation ? newOrderToast.order_number : `#${newOrderToast.order_number}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setNewOrderToast(null)}
                        className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                      {newOrderToast.isRegistration || newOrderToast.isReservation ? (
                        <p className="text-white/80 text-sm font-medium leading-relaxed">
                          {newOrderToast.body}
                        </p>
                      ) : (
                        newOrderToast.items.map((item, i) => (
                          <p key={i} className="text-white/80 text-sm font-medium line-clamp-1">
                            <span className="text-yellow-400 mr-1.5">{item.quantity}x</span> {item.name}
                          </p>
                        ))
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                          {newOrderToast.isRegistration || newOrderToast.isReservation ? "Action" : "Amount Paid"}
                        </span>
                        <span className="text-lg font-black text-white">
                          {newOrderToast.isRegistration || newOrderToast.isReservation ? "Review" : `£${Number(newOrderToast.order_total).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {newOrderToast.isRegistration ? (
                          <>
                            <button
                              onClick={() => handleRegistrationStatusUpdate(newOrderToast, 1)}
                              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRegistrationStatusUpdate(newOrderToast, 2)}
                              className="px-4 py-2 bg-white/10 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Reject
                            </button>
                          </>
                        ) : newOrderToast.isReservation ? (
                          <button
                            onClick={() => handleGoToReservation(newOrderToast)}
                            className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all"
                          >
                            View Booking
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowNotifications(true);
                              setNewOrderToast(null);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Progress bar for auto-close */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="h-1 bg-yellow-500/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Global Quick Reservation Modal (Appears directly from toaster/bell) */}
      <AnimatePresence>
        {selectedQuickRes && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setSelectedQuickRes(null)}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#1a1c23] border border-white/[0.1] rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden"
               onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#071428] to-[#0d1f45] shrink-0">
                <div>
                  <h3 className="text-2xl font-semibold text-white tracking-tight">Reservation Details</h3>
                  <p className="text-xs text-white/40 mt-2 font-medium tracking-wider leading-none">Booking ID: #{selectedQuickRes.id}</p>
                </div>
                <button onClick={() => setSelectedQuickRes(null)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Guest Name</p>
                    <p className="text-base font-semibold text-white">{selectedQuickRes.customer_name}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Status</p>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                      selectedQuickRes.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      selectedQuickRes.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      selectedQuickRes.status === 'seated' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {selectedQuickRes.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Table & Party</p>
                    <p className="text-base font-semibold text-white">Table: {selectedQuickRes.table_number || "—"} ({selectedQuickRes.party_size} Guests)</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Duration</p>
                    <p className="text-base font-semibold text-white">{selectedQuickRes.duration_minutes || 60} minutes</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
                      <Phone size={16} className="text-yellow-400/70" />
                      {selectedQuickRes.customer_phone || "No phone"}
                   </div>
                   <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
                      <Mail size={16} className="text-yellow-400/70" />
                      {selectedQuickRes.customer_email || "No email"}
                   </div>
                   <div className="flex items-center gap-3 text-white/80 text-base font-medium">
                      <Calendar size={18} className="text-yellow-400/70" />
                      {new Date(selectedQuickRes.reservation_date).toLocaleDateString()} at {selectedQuickRes.reservation_time}
                   </div>
                   <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
                      <MessageSquare size={16} className="text-yellow-400/70" />
                      {selectedQuickRes.special_requests || "No special requests"}
                   </div>
                </div>

                <div className="pt-6 border-t border-white/[0.08]">
                  <p className="text-xs font-bold text-white/30 mb-5 uppercase tracking-widest">Update Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['confirmed', 'seated', 'completed', 'cancelled', 'no_show'].map(s => (
                      <button
                        key={s}
                        disabled={updatingRes}
                        onClick={() => handleQuickUpdateStatus(selectedQuickRes.id, s)}
                        className={`px-3 py-3.5 rounded-2xl text-[13px] font-bold uppercase tracking-wider transition-all border ${
                          selectedQuickRes.status === s 
                          ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                          : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedQuickRes(null)}
                  className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-yellow-500/20 active:scale-95 transition-all mt-2"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
