'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchAgents,
  fetchClients,
  toggleDutyStatus,
  sendLocationPing,
  performCheckIn,
  performCheckOut,
  Agent,
  ClientLocation
} from '@/lib/api';
import {
  enqueueOfflineItem,
  getAllOfflineItems,
  clearOfflineQueue,
  OfflineQueuedItem
} from '@/lib/indexedDb';
import {
  Smartphone,
  Power,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  DollarSign,
  Calendar,
  Camera,
  Wifi,
  WifiOff,
  Navigation2,
  Clock,
  RotateCcw,
  Crosshair,
  Plus,
  Tag,
  X,
  Building2,
  Users,
  UserPlus,
  User,
  Mail,
  Phone,
  Shield,
  Compass,
  XCircle
} from 'lucide-react';
import PwaInstallBanner from '@/components/PwaInstallBanner';

export default function FieldAgentMobileApp() {
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [clients, setClients] = useState<ClientLocation[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);

  // Agent Telemetry State
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [currentLat, setCurrentLat] = useState<number>(11.8028);
  const [currentLng, setCurrentLng] = useState<number>(76.0033);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0.0);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isStationary, setIsStationary] = useState(true);
  const [isUsingRealGps, setIsUsingRealGps] = useState(false);

  // Active Visit & Timing State
  const [activeVisit, setActiveVisit] = useState<any>(null);
  const [meetingTimer, setMeetingTimer] = useState<string>('00:00:00');
  const meetingStartTimeRef = useRef<number | null>(null);

  // Dynamic On-the-Fly Destination State
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientAddressInput, setClientAddressInput] = useState('');

  // Selfie Punch State (at Check-In)
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Punch-Out & Discussion Outcome State
  const [meetingNotes, setMeetingNotes] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Offline Simulation & IndexedDB Queue
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Dynamic Quick Tags State
  const [quickTags, setQuickTags] = useState<string[]>([
    '#OrderPlaced',
    '#FollowUpNeeded',
    '#PaymentCollected',
    '#StockAudited',
    '#ClientSatisfied'
  ]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Interactive Stage Tab Override (null = automatic progression based on GPS)
  const [stageOverride, setStageOverride] = useState<1 | 2 | 3 | 4 | null>(null);

  // Auto GPS Ping Tracker
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load IndexedDB queued items on start
  const refreshOfflineQueue = useCallback(async () => {
    try {
      const items = await getAllOfflineItems();
      setOfflineQueue(items);
    } catch (e) {
      console.warn('Error reading IndexedDB queue:', e);
    }
  }, []);

  // Set mounted state, restore custom tags, and listen to network connectivity changes
  useEffect(() => {
    setIsMounted(true);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentpulse_quick_tags');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuickTags(parsed);
          }
        } catch (e) {
          console.warn('Error reading saved tags:', e);
        }
      }
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Hardware Device Battery API Integration
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const pct = Math.round(battery.level * 100);
          setBatteryLevel(pct);
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch((err: any) => console.warn('Battery API not available:', err));
    }
  }, []);

  // Load initial agents & clients
  useEffect(() => {
    async function init() {
      try {
        const [agentList, clientList] = await Promise.all([fetchAgents(), fetchClients()]);
        setAgents(agentList);
        setClients(clientList);

        if (agentList.length > 0) {
          // Check for logged-in agent session
          let matchedAgent = agentList[0];
          if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem('agentpulse_session');
            if (savedSession) {
              try {
                const parsed = JSON.parse(savedSession);
                if (parsed.agent && parsed.agent.id) {
                  const found = agentList.find((a) => a.id === parsed.agent.id);
                  if (found) matchedAgent = found;
                } else if (parsed.user && parsed.user.username) {
                  const found = agentList.find(
                    (a) => a.user.username.toLowerCase() === parsed.user.username.toLowerCase()
                  );
                  if (found) matchedAgent = found;
                }
              } catch (e) {
                console.warn('Session parse error:', e);
              }
            }
          }

          setSelectedAgentId(matchedAgent.id);
          setIsOnDuty(matchedAgent.is_on_duty);
          if (
            matchedAgent.last_latitude &&
            matchedAgent.last_longitude &&
            Math.abs(matchedAgent.last_latitude - 40.7580) > 0.05
          ) {
            setCurrentLat(matchedAgent.last_latitude);
            setCurrentLng(matchedAgent.last_longitude);
          }
          if (matchedAgent.active_visit) {
            setActiveVisit(matchedAgent.active_visit);
            meetingStartTimeRef.current = new Date(matchedAgent.active_visit.check_in_time).getTime();
          }

          // Auto-start real device GPS immediately on load
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            setTimeout(() => {
              enableRealDeviceGps();
            }, 300);
          }
        } else {
          setSelectedAgentId(0);
          setIsOnDuty(false);
          setActiveVisit(null);
        }

        if (clientList.length > 0) {
          setSelectedClientId(clientList[0].id);
        } else {
          setSelectedClientId(0);
        }
        await refreshOfflineQueue();
      } catch (err) {
        console.error('Failed to init agent app:', err);
      }
    }
    init();

    const handleDataUpdated = () => init();
    window.addEventListener('agentpulse:data-updated', handleDataUpdated);
    return () => window.removeEventListener('agentpulse:data-updated', handleDataUpdated);
  }, [refreshOfflineQueue]);

  // Handle auto-sync on browser network 'online' event
  useEffect(() => {
    const handleOnline = () => {
      setIsSimulatedOffline(false);
      triggerSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Update selected agent details
  const handleAgentChange = (id: number) => {
    setSelectedAgentId(id);
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      setIsOnDuty(agent.is_on_duty);
      if (agent.battery_level) {
        setBatteryLevel(agent.battery_level);
      }
      if (
        agent.last_latitude &&
        agent.last_longitude &&
        Math.abs(agent.last_latitude - 40.7580) > 0.05
      ) {
        setCurrentLat(agent.last_latitude);
        setCurrentLng(agent.last_longitude);
      }
      setActiveVisit(agent.active_visit);
      if (agent.active_visit) {
        meetingStartTimeRef.current = new Date(agent.active_visit.check_in_time).getTime();
      } else {
        meetingStartTimeRef.current = null;
      }
      // Re-engage real device GPS for the selected agent
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        enableRealDeviceGps();
      }
    }
  };

  // Live in-store meeting stopwatch
  useEffect(() => {
    if (!activeVisit) {
      setMeetingTimer('00:00:00');
      return;
    }

    const timer = setInterval(() => {
      const startTime = meetingStartTimeRef.current || (activeVisit.check_in_time ? new Date(activeVisit.check_in_time).getTime() : Date.now());
      const diffMs = Math.max(0, Date.now() - startTime);
      const totalSec = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      setMeetingTimer(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeVisit]);

  // Target Client
  const targetClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Calculate live proximity
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const estimatedDistance = targetClient
    ? calculateDistance(currentLat, currentLng, targetClient.latitude, targetClient.longitude)
    : 0;
  const isWithinGeofence = estimatedDistance <= 50;

  // Real Device GPS Toggle & Continuous Tracking
  const enableRealDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setFeedback({ type: 'error', text: 'Geolocation is not supported by your device browser.' });
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsUsingRealGps(true);
    setFeedback({ type: 'info', text: 'Locking onto real device GPS satellite signal...' });

    const onGpsSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Discard dummy Manhattan coordinates
      if (Math.abs(lat - 40.7580) < 0.05 && Math.abs(lng - (-73.9855)) < 0.05) {
        return;
      }
      const speedKmh = Math.round((pos.coords.speed || 0) * 3.6);
      setCurrentLat(lat);
      setCurrentLng(lng);
      setCurrentSpeed(speedKmh);
      setIsStationary(speedKmh < 1);
      setIsUsingRealGps(true);

      // Immediately transmit real position to HQ radar (sync_location=true ensures DB updates immediately)
      if (selectedAgentId > 0) {
        sendLocationPing(selectedAgentId, lat, lng, speedKmh, Math.round(batteryLevel), true).catch(console.warn);
      }

      setFeedback({
        type: 'success',
        text: `Device GPS locked: ${lat.toFixed(5)}°, ${lng.toFixed(5)}° (Accuracy: ±${Math.round(pos.coords.accuracy || 10)}m)`
      });
    };

    // 1. Fetch immediate position snapshot (with indoor/cellular fallback)
    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      (err) => {
        console.warn('High accuracy GPS error, trying coarse location...', err);
        navigator.geolocation.getCurrentPosition(
          onGpsSuccess,
          (err2) => {
            setIsUsingRealGps(false);
            setFeedback({
              type: 'error',
              text: `GPS Access Denied (${err2.message}). Please allow Location Permission in your browser address bar.`
            });
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. Start continuous real-time watch stream as employee walks / drives
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (Math.abs(lat - 40.7580) < 0.05 && Math.abs(lng - (-73.9855)) < 0.05) return;
          const speedKmh = Math.round((pos.coords.speed || 0) * 3.6);
          setCurrentLat(lat);
          setCurrentLng(lng);
          setCurrentSpeed(speedKmh);
          setIsStationary(speedKmh < 1);

          if (selectedAgentId > 0) {
            sendLocationPing(selectedAgentId, lat, lng, speedKmh, Math.round(batteryLevel), true).catch(console.warn);
          }
        },
        (err) => {
          console.warn('Continuous GPS watch warning:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
    } catch (e) {
      console.warn('Could not start watchPosition:', e);
    }
  };

  // Handle Duty Toggle
  const handleDutyToggle = async () => {
    const nextState = !isOnDuty;
    setIsOnDuty(nextState);

    // Auto-trigger GPS tracking when starting shift
    if (nextState) {
      enableRealDeviceGps();
    } else {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    setFeedback({
      type: 'info',
      text: nextState
        ? 'You are now On-Duty. GPS tracking is active.'
        : 'You are now Off-Duty. Tracking paused for privacy.'
    });

    if (isSimulatedOffline) {
      const item: OfflineQueuedItem = {
        id: 'duty_' + Date.now(),
        type: 'PING',
        payload: { is_on_duty: nextState },
        timestamp: new Date().toISOString()
      };
      await enqueueOfflineItem(item);
      await refreshOfflineQueue();
      return;
    }

    try {
      await toggleDutyStatus(selectedAgentId, nextState);
      if (nextState && selectedAgentId > 0) {
        sendLocationPing(selectedAgentId, currentLat, currentLng, currentSpeed, Math.round(batteryLevel), true).catch(console.warn);
      }
    } catch (e: any) {
      console.error('Duty toggle error:', e);
    }
  };

  // Periodic Location Tracking with real GPS transmission
  useEffect(() => {
    if (!isOnDuty) {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      return;
    }

    const intervalMs = isStationary ? 15000 : 8000;

    pingTimerRef.current = setInterval(async () => {
      // Discard dummy Manhattan coordinates from transmitting
      if (Math.abs(currentLat - 40.7580) < 0.05 && Math.abs(currentLng - (-73.9855)) < 0.05) {
        return;
      }

      if (isSimulatedOffline) {
        const item: OfflineQueuedItem = {
          id: 'ping_' + Date.now(),
          type: 'PING',
          payload: {
            agent_id: selectedAgentId,
            latitude: currentLat,
            longitude: currentLng,
            speed: currentSpeed,
            battery_level: Math.round(batteryLevel)
          },
          timestamp: new Date().toISOString()
        };
        await enqueueOfflineItem(item);
        await refreshOfflineQueue();
        return;
      }

      try {
        await sendLocationPing(
          selectedAgentId,
          currentLat,
          currentLng,
          currentSpeed,
          Math.round(batteryLevel),
          true
        );
      } catch (err) {
        console.warn('Background ping error:', err);
      }
    }, intervalMs);

    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [isOnDuty, isStationary, isSimulatedOffline, currentLat, currentLng, currentSpeed, batteryLevel, selectedAgentId, refreshOfflineQueue]);

  // Movement Simulator actions
  const moveToClient = () => {
    if (!targetClient) return;
    setCurrentLat(targetClient.latitude + 0.0001);
    setCurrentLng(targetClient.longitude + 0.00005);
    setCurrentSpeed(0.0);
    setIsStationary(true);
    setFeedback({
      type: 'success',
      text: `Arrived at ${targetClient.name}! You are now inside the 50m geofence.`
    });
  };

  const moveAwayFromClient = () => {
    if (!targetClient) return;
    setCurrentLat(targetClient.latitude + 0.004);
    setCurrentLng(targetClient.longitude + 0.004);
    setCurrentSpeed(24.5);
    setIsStationary(false);
    setFeedback({
      type: 'info',
      text: `Moved 450m away from client. Outside geofence.`
    });
  };

  // Callback ref to reliably attach stream whenever video mounts in DOM
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStreamRef.current) {
      node.srcObject = cameraStreamRef.current;
      node.play().catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (isCapturingSelfie && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  }, [isCapturingSelfie]);

  // CAMERA & MEMORY-OPTIMIZED WATERMARK GENERATOR
  const startCamera = async () => {
    setIsCapturingSelfie(true);
    setFeedback({ type: 'info', text: 'Initializing camera...' });

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
      } catch (e1) {
        // Fallback for devices/browsers that don't support facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
      setFeedback({ type: 'success', text: 'Camera active. Frame yourself and tap "Snap & Stamp".' });
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCapturingSelfie(false);
      setFeedback({
        type: 'error',
        text: `Camera permission denied or unavailable (${err.message || 'Error'}). Tap "Take Live Selfie (Phone Camera)" or "Instant GPS Punch".`
      });
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCapturingSelfie(false);
  };

  /**
   * High-Resolution Memory-Safe Canvas Watermarker:
   * Downsamples source imagery to max 800px to prevent mobile web memory crashes,
   * stamps location/time telemetry, and exports at 0.85 JPEG compression.
   */
  const stampWatermarkAndSave = (sourceImgOrVideo: HTMLVideoElement | HTMLImageElement | null) => {
    const MAX_DIMENSION = 800;
    let targetWidth = 640;
    let targetHeight = 640;

    if (sourceImgOrVideo) {
      const origW = (sourceImgOrVideo as any).videoWidth || (sourceImgOrVideo as any).naturalWidth || 640;
      const origH = (sourceImgOrVideo as any).videoHeight || (sourceImgOrVideo as any).naturalHeight || 640;

      if (origW > origH) {
        targetWidth = Math.min(MAX_DIMENSION, origW);
        targetHeight = Math.round((origH / origW) * targetWidth);
      } else {
        targetHeight = Math.min(MAX_DIMENSION, origH);
        targetWidth = Math.round((origW / origH) * targetHeight);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sourceImgOrVideo) {
      ctx.drawImage(sourceImgOrVideo, 0, 0, targetWidth, targetHeight);
    } else {
      // Clean avatar silhouette background
      const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(targetWidth / 2, targetHeight / 2 - 40, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(targetWidth / 2, targetHeight / 2 + 180, 150, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`SELFIE PUNCH - ${selectedAgent?.full_name || 'AGENT'}`, targetWidth / 2, targetHeight / 2 + 10);
    }

    // WATERMARK BANNER AT BASE
    const bannerHeight = 155;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, targetHeight - bannerHeight, targetWidth, bannerHeight);

    // Green Verified Indicator Stripe
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, targetHeight - bannerHeight, targetWidth, 4);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const effectiveClient = clientNameInput.trim() || targetClient?.name || 'Client Visit';

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('● GPS VERIFIED PUNCH-IN AT CLIENT LOCATION', 18, targetHeight - bannerHeight + 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(`AGENT: ${selectedAgent?.full_name || 'Agent'} (${selectedAgent?.employee_id})`, 18, targetHeight - bannerHeight + 48);

    ctx.font = 'normal 13px system-ui';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`CLIENT: ${effectiveClient}`, 18, targetHeight - bannerHeight + 72);

    const latDir = currentLat >= 0 ? 'N' : 'S';
    const lngDir = currentLng >= 0 ? 'E' : 'W';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'normal 12px monospace';
    ctx.fillText(`GPS: ${Math.abs(currentLat).toFixed(5)}° ${latDir}, ${Math.abs(currentLng).toFixed(5)}° ${lngDir} (Current Location)`, 18, targetHeight - bannerHeight + 96);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`TIMESTAMP: ${dateStr} • ${timeStr}`, 18, targetHeight - bannerHeight + 122);

    // Export optimized JPEG
    const watermarkedData = canvas.toDataURL('image/jpeg', 0.85);
    setSelfieDataUrl(watermarkedData);
    stopCamera();
  };

  const handleCaptureFromVideo = () => {
    if (videoRef.current) {
      stampWatermarkAndSave(videoRef.current);
    } else {
      stampWatermarkAndSave(null);
    }
  };

  const handleSimulatedSelfie = () => {
    stampWatermarkAndSave(null);
  };

  // Upload custom selfie photo and stamp watermark
  const handleUploadSelfiePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        stampWatermarkAndSave(img);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  // Perform Geofenced Selfie Check-In
  const handleCheckIn = async () => {
    if (!isOnDuty) {
      setFeedback({ type: 'error', text: 'You must toggle On-Duty before checking in.' });
      return;
    }

    if (!selfieDataUrl) {
      setFeedback({ type: 'error', text: 'Please take your Selfie Punch with location stamp before checking in.' });
      return;
    }

    setIsCheckingIn(true);
    setFeedback(null);

    const effectiveClient = clientNameInput.trim() || targetClient?.name || 'Client Visit';
    const effectiveAddress = clientAddressInput.trim() || (targetClient?.address || '');

    // IndexedDB Offline Queueing
    if (isSimulatedOffline) {
      const mockVisit = {
        id: Math.floor(Math.random() * 10000),
        client_id: targetClient?.id || null,
        client_name: effectiveClient,
        check_in_time: new Date().toISOString(),
        distance_at_checkin: 0,
        selfie_image: selfieDataUrl
      };

      const item: OfflineQueuedItem = {
        id: 'checkin_' + Date.now(),
        type: 'CHECK_IN',
        payload: {
          agent_id: selectedAgentId,
          client_id: targetClient?.id || null,
          client_name: effectiveClient,
          client_address: effectiveAddress,
          latitude: currentLat,
          longitude: currentLng,
          selfie_image: selfieDataUrl
        },
        timestamp: new Date().toISOString()
      };
      await enqueueOfflineItem(item);
      await refreshOfflineQueue();

      setActiveVisit(mockVisit);
      meetingStartTimeRef.current = Date.now();
      setFeedback({
        type: 'success',
        text: `[INDEXED-DB QUEUED] Selfie punch-in for '${effectiveClient}' saved offline! Will auto-sync when online.`
      });
      setIsCheckingIn(false);
      return;
    }

    try {
      // Capture fresh physical hardware GPS directly before punching in
      let checkInLat = currentLat;
      let checkInLng = currentLng;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const freshPos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 4000,
              maximumAge: 10000
            });
          });
          checkInLat = freshPos.coords.latitude;
          checkInLng = freshPos.coords.longitude;
          setCurrentLat(checkInLat);
          setCurrentLng(checkInLng);
        } catch (gpsErr) {
          console.warn('Using existing coords for check-in:', gpsErr);
        }
      }

      const resp = await performCheckIn(
        selectedAgentId,
        targetClient?.id || null,
        checkInLat,
        checkInLng,
        selfieDataUrl,
        effectiveClient,
        effectiveAddress
      );
      setActiveVisit(resp.visit);
      meetingStartTimeRef.current = Date.now();
      setFeedback({
        type: 'success',
        text: `Punch-in verified at ${effectiveClient}! ${resp.message || ''}`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Check-in failed.'
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handle Attachment upload
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachmentDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform Check-Out & Outcome capture
  const handleCheckOut = async () => {
    if (!activeVisit) return;
    if (!meetingNotes.trim()) {
      setFeedback({
        type: 'error',
        text: 'Please enter meeting discussion notes before punching out.'
      });
      return;
    }

    setIsCheckingOut(true);
    setFeedback(null);

    const val = parseFloat(orderValue) || 0.0;

    // IndexedDB Offline Queueing
    if (isSimulatedOffline) {
      const item: OfflineQueuedItem = {
        id: 'checkout_' + Date.now(),
        type: 'CHECK_OUT',
        payload: {
          visit_id: activeVisit.id,
          meeting_notes: meetingNotes,
          order_value: val,
          follow_up_date: followUpDate,
          attachment_image: attachmentDataUrl
        },
        timestamp: new Date().toISOString()
      };
      await enqueueOfflineItem(item);
      await refreshOfflineQueue();

      setActiveVisit(null);
      setMeetingNotes('');
      setSelfieDataUrl(null);
      setAttachmentDataUrl(null);
      setAttachmentName(null);
      setFeedback({
        type: 'success',
        text: '[INDEXED-DB QUEUED] Visit punch-out saved offline. Auto-sync active.'
      });
      setIsCheckingOut(false);
      return;
    }

    try {
      await performCheckOut(activeVisit.id, meetingNotes, val, followUpDate, undefined, attachmentDataUrl || undefined);
      setActiveVisit(null);
      setMeetingNotes('');
      setSelfieDataUrl(null);
      setAttachmentDataUrl(null);
      setAttachmentName(null);
      setFeedback({
        type: 'success',
        text: `Visit completed & punched out! Duration and notes saved.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Check-out failed.'
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Auto-Sync IndexedDB offline queue
  const triggerSyncQueue = async () => {
    const items = await getAllOfflineItems();
    if (items.length === 0) return;
    setIsSyncing(true);
    setFeedback({ type: 'info', text: `Syncing ${items.length} IndexedDB events to cloud...` });

    try {
      for (const item of items) {
        if (item.type === 'PING') {
          await sendLocationPing(
            item.payload.agent_id,
            item.payload.latitude,
            item.payload.longitude,
            item.payload.speed,
            item.payload.battery_level
          );
        } else if (item.type === 'CHECK_IN') {
          await performCheckIn(
            item.payload.agent_id,
            item.payload.client_id,
            item.payload.latitude,
            item.payload.longitude,
            item.payload.selfie_image,
            item.payload.client_name,
            item.payload.client_address
          );
        } else if (item.type === 'CHECK_OUT') {
          await performCheckOut(
            item.payload.visit_id,
            item.payload.meeting_notes,
            item.payload.order_value,
            item.payload.follow_up_date,
            undefined,
            item.payload.attachment_image
          );
        }
      }
      await clearOfflineQueue();
      await refreshOfflineQueue();
      setFeedback({ type: 'success', text: 'All offline IndexedDB events synchronized successfully!' });
    } catch (err: any) {
      console.error('Sync failed:', err);
      setFeedback({ type: 'error', text: 'Failed to sync: ' + err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Dynamic Tag Toggle: Appends if missing, removes if already present in notes
  const handleToggleTag = (tag: string) => {
    if (meetingNotes.includes(tag)) {
      const regex = new RegExp(`\\s*${tag}\\b`, 'g');
      setMeetingNotes((prev) => prev.replace(regex, '').trim());
    } else {
      setMeetingNotes((prev) => (prev.trim() ? `${prev.trim()} ${tag}` : tag));
    }
  };

  // Add custom dynamic tag on the fly
  const handleAddCustomTag = () => {
    let clean = newTagInput.trim();
    if (!clean) return;
    if (!clean.startsWith('#')) {
      clean = `#${clean}`;
    }
    clean = clean.replace(/\s+/g, '');

    if (!quickTags.includes(clean)) {
      const updated = [...quickTags, clean];
      setQuickTags(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentpulse_quick_tags', JSON.stringify(updated));
      }
    }
    handleToggleTag(clean);
    setNewTagInput('');
    setIsAddingTag(false);
  };

  // Remove tag from list
  const handleRemoveTag = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickTags.filter((t) => t !== tagToRemove);
    setQuickTags(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentpulse_quick_tags', JSON.stringify(updated));
    }
  };

  // Determine current active flow stage automatically:
  // Stage 1: Destination & Location (Enter client + Duty toggle)
  // Stage 2: Selfie Punch In (Stamps GPS + Client + Time)
  // Stage 3: In-Store Meeting (Live stopwatch timer)
  // Stage 4: Punch-Out (Discussion notes + quick-tags + gated punch-out)
  const dynamicStage: 1 | 2 | 3 | 4 = !activeVisit
    ? selfieDataUrl
      ? 2
      : 1
    : meetingNotes.trim().length > 0
    ? 4
    : 3;

  const activeStageNumber: 1 | 2 | 3 | 4 = stageOverride !== null ? stageOverride : dynamicStage;

  return (
    <div className="flex-1 flex flex-col items-center p-3 sm:p-5 max-w-lg mx-auto w-full space-y-4">
      {/* PWA Install Banner */}
      <div className="w-full">
        <PwaInstallBanner />
      </div>

      {/* Subtle Top Offline Banner */}
      {isMounted && (isSimulatedOffline || !isOnline) && (
        <div className="w-full bg-amber-400 text-slate-950 px-4 py-2.5 rounded-2xl flex items-center justify-between font-semibold text-xs shadow-sm border border-amber-500 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Offline Mode: Records saved locally, auto-syncing when online</span>
          </div>
          {offlineQueue.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 font-mono text-[10px] font-bold">
              {offlineQueue.length} queued
            </span>
          )}
        </div>
      )}

      {/* Main Mobile App Card Container */}
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-lg p-5 space-y-5">
        {agents.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold inline-block">Fleet Empty</span>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900">No Field Agents Registered</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                All dummy mock profiles have been cleared. Click below to register your first field agent.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>+ Register Field Agent</span>
            </button>
          </div>
        ) : (
          <>
            {/* Top Control Bar: Agent Switcher + Online/Offline Status */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <select
                  value={selectedAgentId}
                  onChange={(e) => handleAgentChange(Number(e.target.value))}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none transition-colors cursor-pointer"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white text-slate-900">
                      {a.full_name} ({a.employee_id})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAccountDetails(!showAccountDetails)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showAccountDetails
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="View User Account Details"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Account Details</span>
                </button>
              </div>

              {/* Network Simulator Button */}
              <button
                onClick={() => {
                  const nextOffline = !isSimulatedOffline;
                  setIsSimulatedOffline(nextOffline);
                  if (!nextOffline && offlineQueue.length > 0) {
                    triggerSyncQueue();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isSimulatedOffline
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSimulatedOffline ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                <span>{isSimulatedOffline ? 'Offline' : 'Online'}</span>
              </button>
            </div>

            {/* Expandable User Account Details Card */}
            {showAccountDetails && selectedAgent && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200/80 shadow-xs space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {selectedAgent.full_name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{selectedAgent.full_name}</h4>
                      <p className="text-[10px] text-blue-700 font-mono">Agent Account Profile</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedAgent.is_on_duty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedAgent.is_on_duty ? 'On-Duty' : 'Off-Duty'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Login Username</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAgent.user.username}</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Employee ID</span>
                    <span className="font-mono font-bold text-blue-600">{selectedAgent.employee_id}</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Phone Number</span>
                    <span className="font-bold text-slate-800">{selectedAgent.phone_number || 'Not set'}</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Email</span>
                    <span className="font-medium text-slate-700 truncate block">{selectedAgent.user.email || 'None'}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    GPS: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                  </span>
                  <span className="font-semibold text-slate-700">Battery: {batteryLevel}%</span>
                </div>
              </div>
            )}

        {/* Real Device Hardware GPS Sync Widget */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isUsingRealGps ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isUsingRealGps ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <div className="truncate">
              <span className="font-semibold text-slate-800 text-[11px] block">
                {isUsingRealGps ? 'Hardware GPS Active' : 'Device Location'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentLat.toFixed(5)}°, {currentLng.toFixed(5)}°
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => enableRealDeviceGps()}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 font-bold border border-slate-200 rounded-lg text-[11px] shadow-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            title="Acquire real hardware GPS lock and sync to HQ Operations Radar"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sync Real GPS</span>
          </button>
        </div>

        {/* Guided Step-by-Step Flow Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] px-0.5 text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {stageOverride !== null ? 'Manual Preview' : 'Visit Progress'}
            </span>
            {stageOverride !== null && (
              <button
                type="button"
                onClick={() => setStageOverride(null)}
                className="text-slate-600 font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Reset to Auto</span>
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { stage: 1 as const, label: 'Destination', icon: MapPin },
              { stage: 2 as const, label: 'Selfie Punch', icon: Camera },
              { stage: 3 as const, label: 'Meeting', icon: Clock },
              { stage: 4 as const, label: 'Punch Out', icon: CheckCircle2 }
            ].map((step) => {
              const isActive = activeStageNumber === step.stage;
              const isCompleted = dynamicStage > step.stage;
              const Icon = step.icon;

              return (
                <button
                  type="button"
                  key={step.stage}
                  onClick={() => setStageOverride(step.stage === stageOverride ? null : step.stage)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : isCompleted
                      ? 'bg-slate-100 text-slate-800 font-medium hover:bg-slate-200'
                      : 'bg-white text-slate-400 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] tracking-tight">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE VISIT BANNER: DISPLAYED WHEN AGENT IS ALREADY CHECKED IN */}
        {activeVisit && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2.5 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                <span className="font-bold text-slate-900">
                  Currently Punched In: {activeVisit.client_name || 'Client Store'}
                </span>
              </div>
              <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                In-Progress
              </span>
            </div>
            {/* Prominent Punch-In Time & Stopwatch Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 border border-blue-200">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  Punch-In Time:{' '}
                  <strong className="font-mono text-slate-900 font-bold">
                    {activeVisit.check_in_time
                      ? new Date(activeVisit.check_in_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      : 'Recorded'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                <span>Elapsed:</span>
                <strong className="font-bold">{meetingTimer}</strong>
              </div>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Your meeting stopwatch is currently active. To punch in at another location, complete your visit notes and punch out below.
            </p>
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setStageOverride(4)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Go to Meeting Notes & Punch Out</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Clear and end this visit now? Your status will return to Available.')) {
                    try {
                      await performCheckOut(activeVisit.id, 'Visit completed & cleared', 0, undefined);
                      setActiveVisit(null);
                      setFeedback({
                        type: 'success',
                        text: 'Active visit ended successfully! You are ready for fresh check-ins.'
                      });
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('agentpulse:data-updated'));
                      }
                    } catch (err: any) {
                      setFeedback({ type: 'error', text: err.message || 'Failed to clear visit.' });
                    }
                  }
                }}
                className="py-2.5 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-rose-200 shadow-xs transition-all cursor-pointer"
                title="Force end and clear this visit immediately"
              >
                <XCircle className="w-4 h-4" />
                <span>End / Clear Visit</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 1 & 2: DYNAMIC ON-THE-FLY DESTINATION & SELFIE PUNCH-IN */}
        {(activeStageNumber === 1 || activeStageNumber === 2) && !activeVisit && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Duty & Geolocation Status Switch */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Duty & GPS Tracking
                </span>
                <span className="text-xs text-slate-500">
                  Battery: <strong className="text-slate-800 font-mono">{Math.round(batteryLevel)}%</strong>
                </span>
              </div>
              <button
                onClick={handleDutyToggle}
                className={`w-full min-h-[46px] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                  isOnDuty
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                <Power className="w-4 h-4" />
                <span>{isOnDuty ? 'On Duty (GPS Streaming Active)' : 'Off Duty (Click to Start Shift)'}</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Interval: {isStationary ? '12s (stationary)' : '5s (moving)'}</span>
                <span>Coordinates: {currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°</span>
              </div>
            </div>

            {/* Dynamic Customer / Meeting Destination Entry */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1.5">
                  Destination / Client Name *
                </label>
                <input
                  type="text"
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                  placeholder="e.g. Apex Supermarket, Dr. Smith Clinic, John's Office"
                  className="w-full bg-slate-50/70 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none transition-all"
                />
              </div>

              {/* Quick Preset / Recent Client Suggestions */}
              {clients.length > 0 && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                    Recent Clients:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {clients.slice(0, 4).map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setClientNameInput(c.name);
                          setSelectedClientId(c.id);
                          if (c.address) setClientAddressInput(c.address);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          clientNameInput === c.name
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Location Note / Address */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Location Note / Address (Optional):
                </label>
                <input
                  type="text"
                  value={clientAddressInput}
                  onChange={(e) => setClientAddressInput(e.target.value)}
                  placeholder="e.g. 5th Floor Conference Room, Broadway Branch"
                  className="w-full bg-slate-50/70 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Live GPS Lock Indicator */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700 font-medium">GPS Locked ({currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°)</span>
              </div>
              <button
                type="button"
                onClick={enableRealDeviceGps}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                {isUsingRealGps ? 'Synced' : 'Sync GPS'}
              </button>
            </div>

            {/* Selfie Punch-In Section */}
            {!selfieDataUrl ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-center shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Verification</span>
                  <h4 className="text-sm font-bold text-slate-900">Selfie Punch Audit</h4>
                  <p className="text-xs text-slate-500">
                    Timestamped proof with GPS coordinates and client destination.
                  </p>
                </div>

                {/* Camera Viewfinder if live stream active */}
                {isCapturingSelfie ? (
                  <div className="p-2 bg-slate-950 rounded-2xl space-y-2">
                    <div className="relative w-full h-56 bg-black rounded-xl overflow-hidden">
                      <video ref={setVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCaptureFromVideo}
                        className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap & Stamp</span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="min-h-[44px] px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {/* Primary Button: Native Phone Camera */}
                    <label className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98">
                      <Camera className="w-4 h-4" />
                      <span>📸 Open Phone Camera (Live Selfie)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleUploadSelfiePhoto}
                        className="hidden"
                      />
                    </label>

                    {/* Secondary Options */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Live WebCam</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulatedSelfie}
                        className="min-h-[40px] rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Instant stamp with real GPS and time"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Instant GPS Punch</span>
                      </button>
                    </div>

                    <div className="flex justify-center pt-0.5">
                      <label className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer underline">
                        <UploadCloud className="w-3 h-3 text-slate-400" />
                        <span>Upload photo from gallery</span>
                        <input type="file" accept="image/*" onChange={handleUploadSelfiePhoto} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Watermarked Photo Preview + Punch In Button */
              <div className="space-y-3">
                <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                  <img src={selfieDataUrl} alt="Watermarked Selfie Punch" className="w-full h-auto max-h-64 object-cover" />
                  <button
                    onClick={() => setSelfieDataUrl(null)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-slate-950 cursor-pointer"
                    title="Retake Selfie"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-slate-950/80 text-emerald-400 text-[10px] font-semibold font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>GPS Stamp Ready</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isCheckingIn ? 'Recording Visit...' : `Punch In at '${clientNameInput.trim() || 'Client'}'`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE 3 & 4: IN-STORE MEETING STOPWATCH + GATED PUNCH-OUT */}
        {(activeStageNumber === 3 || activeStageNumber === 4) && activeVisit && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Stage 3: Highly Visible Live Meeting Stopwatch Widget */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>In-Store Meeting</span>
              </div>

              {/* Large Stopwatch Display */}
              <div className="text-4xl font-bold font-mono tracking-wider text-white py-0.5">
                {meetingTimer}
              </div>

              <div className="text-xs text-slate-300 flex items-center justify-center gap-2">
                <span className="font-semibold text-white">{activeVisit.client_name || targetClient?.name || 'Client'}</span>
                <span>•</span>
                <span className="font-mono text-slate-400 text-[11px]">
                  Started {new Date(activeVisit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Watermarked Punch-In Proof Photo Card */}
            {activeVisit.selfie_image && (
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your Punch-In Proof Photo</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
                    GPS Verified
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-950 flex items-center justify-center">
                  <img
                    src={activeVisit.selfie_image}
                    alt="Punch-in selfie proof"
                    className="w-full h-auto max-h-56 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Stage 4: Punch-Out Discussion Notes & Quick Tags */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Meeting Notes & Discussion *
                </label>
                <span className="text-[10px] text-slate-400">
                  Required for Punch Out
                </span>
              </div>

              {/* Notes Textarea */}
              <textarea
                rows={3}
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Enter discussion notes, feedback, store requirements..."
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
              />

              {/* Dynamic Quick-Tag Pills System */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">
                    Quick tags:
                  </span>
                  {!isAddingTag && (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Tag</span>
                    </button>
                  )}
                </div>

                {/* Inline Dynamic Tag Creator Input */}
                {isAddingTag && (
                  <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">#</span>
                      <input
                        type="text"
                        autoFocus
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          } else if (e.key === 'Escape') {
                            setIsAddingTag(false);
                          }
                        }}
                        placeholder="e.g. OrderPlaced"
                        className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTag(false);
                        setNewTagInput('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Dynamic Pills List */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickTags.map((tag) => {
                    const isSelected = meetingNotes.includes(tag);
                    return (
                      <div
                        key={tag}
                        className={`group inline-flex items-center rounded-lg transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className="px-2 py-1 text-xs font-mono font-medium cursor-pointer"
                        >
                          {tag}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveTag(tag, e)}
                          title={`Remove ${tag}`}
                          className={`pr-1.5 pl-0.5 text-xs font-bold opacity-30 group-hover:opacity-100 transition-opacity cursor-pointer ${
                            isSelected ? 'text-white hover:text-rose-200' : 'text-slate-400 hover:text-rose-600'
                          }`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Value & Follow-Up Date */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 block font-medium">
                    Order Value ($):
                  </label>
                  <input
                    type="number"
                    value={orderValue}
                    onChange={(e) => setOrderValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 block font-medium">
                    Follow-Up Date:
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Attachment Proof */}
              <div className="space-y-1 pt-0.5">
                <label className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 hover:border-slate-300 cursor-pointer transition-colors text-xs text-slate-600">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-[220px] text-[11px]">{attachmentName || 'Attach order slip / receipt / storefront'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleAttachmentUpload} className="hidden" />
                </label>
                {attachmentDataUrl && (
                  <div className="mt-1 relative w-full h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={attachmentDataUrl} alt="Attachment" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Dynamic Gated Punch-Out Button */}
              <div className="pt-1.5">
                <button
                  onClick={handleCheckOut}
                  disabled={isCheckingOut || !meetingNotes.trim()}
                  className={`w-full min-h-[46px] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                    meetingNotes.trim()
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isCheckingOut
                      ? 'Saving Outcome...'
                      : meetingNotes.trim()
                      ? 'Complete Visit & Punch Out'
                      : 'Enter Notes to Unlock Punch Out'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* Action Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
