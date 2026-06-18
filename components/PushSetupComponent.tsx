'use client';
import { useState, useEffect } from 'react';
import { subscribeToPush } from '@/lib/api';

const VAPID_PUBLIC_KEY = 'BMdUDN9OmbXVBU_Z68gckfAtvKNZd72YJuVXojC4Yp_0-1BoMRL4QH32xTYJEWd3NqUuPOjmQJMNmiI3dfoti6Y';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSetupComponent() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check PWA Standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
    setIsStandalone(!!standalone);

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    try {
      setLoading(true);
      const reg = await navigator.serviceWorker.ready;

      // Ask for permission explicitly (useful for Safari)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied.');
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await subscribeToPush(sub.toJSON());
      setIsSubscribed(true);
    } catch (e) {
      console.error('Failed to subscribe:', e);
      alert('Failed to enable push notifications.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;
  if (!isSupported) return null; // Browser doesn't support push
  if (isSubscribed) return null; // Already setup

  if (isIos && !isStandalone) {
    return (
      <div className="push-banner fade-in" style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <strong>Enable Push Notifications 📲</strong>
        <span style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>
          To get live match updates on your iPhone, you must first add this app to your home screen. Tap the <strong>Share</strong> button at the bottom of Safari, and select <strong>Add to Home Screen</strong>.
        </span>
      </div>
    );
  }

  return (
    <div className="push-banner fade-in" style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--accent)' }}>Stay Updated 🔔</div>
        <div style={{ fontSize: '.85rem', color: 'var(--text-faint)', marginTop: '4px' }}>Get notified instantly when matches lock and scores update.</div>
      </div>
      <button className="btn-primary" onClick={subscribe} disabled={loading} style={{ padding: '8px 16px', fontSize: '.85rem' }}>
        Enable
      </button>
    </div>
  );
}
