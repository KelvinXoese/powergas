import { useEffect, useRef } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { useRiderStore } from '../store/rider';

const SOCKET_URL = 'http://10.0.2.2:3000';

/**
 * Mount this once, at the App root — not inside individual screens.
 * Streams location for as long as activeOrderId is set in useRiderStore,
 * regardless of navigation. This is what the proximity gates on the
 * backend (RIDER_ARRIVED_PICKUP, AT_STATION, RIDER_ARRIVED_DELIVERY,
 * DELIVERED) depend on — if this stops running mid-delivery because the
 * rider navigated to a different screen, every one of those checkpoints
 * would fail with "no location data," even for a rider standing right there.
 */
export function useLocationSharing() {
  const token = useAuthStore((s) => s.accessToken);
  const activeOrderId = useRiderStore((s) => s.activeOrderId);
  const socketRef = useRef<Socket | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !activeOrderId) {
      if (watchId.current != null) Geolocation.clearWatch(watchId.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
      watchId.current = null;
      return;
    }

    socketRef.current = io(`${SOCKET_URL}/tracking`, { auth: { token } });
    watchId.current = Geolocation.watchPosition(
      (pos) => {
        socketRef.current?.emit('rider_location', {
          orderId: activeOrderId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
      },
      undefined,
      { enableHighAccuracy: true, distanceFilter: 10, interval: 4000 },
    );

    return () => {
      if (watchId.current != null) Geolocation.clearWatch(watchId.current);
      socketRef.current?.disconnect();
    };
  }, [token, activeOrderId]);
}
