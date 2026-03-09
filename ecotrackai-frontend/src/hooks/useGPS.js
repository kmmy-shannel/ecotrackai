import { useState, useEffect, useCallback, useRef } from 'react';
import { isWithinGeofence, calculateDistance, GEOFENCE_RADIUS_METERS } from '../utils/gpsUtils';

/**
 * useGPS hook - Get current GPS location and track over time
 * @param {object} options - Configuration options
 * @returns {object} GPS state and methods
 */
export const useGPS = (options = {}) => {
  const { enableTracking = false, updateInterval = 5000, highAccuracy = true } = options;

  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(enableTracking);
  const [isLoading, setIsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const trackingIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  /**
   * Get current device location
   */
  const getCurrentLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy: acc } = position.coords;
          const newLocation = { latitude, longitude };

          setLocation(newLocation);
          setAccuracy(acc);
          setIsLoading(false);
          resolve(newLocation);
        },
        (err) => {
          const errorMsg = err.message || 'Failed to get location';
          setError(errorMsg);
          setIsLoading(false);
          reject(err);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [highAccuracy]);

  /**
   * Start continuous location tracking
   */
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial location
    await getCurrentLocation();

    // Watch position for updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setLocation({ latitude, longitude });
        setAccuracy(acc);
      },
      (err) => {
        setError(err.message || 'Failed to track location');
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10000,
        maximumAge: 1000, // Accept cached position up to 1 second old
      }
    );
  }, [getCurrentLocation, highAccuracy]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    setIsTracking(false);
  }, []);

  /**
   * Check if current location is within geofence of target
   */
  const checkGeofence = useCallback(
    (targetLocation, radiusMeters = GEOFENCE_RADIUS_METERS) => {
      if (!location || !targetLocation) return false;
      return isWithinGeofence(location, targetLocation, radiusMeters);
    },
    [location]
  );

  /**
   * Calculate distance to target location
   */
  const distanceTo = useCallback(
    (targetLocation) => {
      if (!location || !targetLocation) return null;

      return calculateDistance(
        location.latitude,
        location.longitude,
        targetLocation.latitude || targetLocation.lat,
        targetLocation.longitude || targetLocation.lng
      );
    },
    [location]
  );

  // Auto-start tracking if enabled
  useEffect(() => {
    if (enableTracking && !isTracking) {
      startTracking();
    }

    return () => {
      if (enableTracking) {
        stopTracking();
      }
    };
  }, [enableTracking, startTracking, stopTracking, isTracking]);

  // Periodic update interval
  useEffect(() => {
    if (isTracking && updateInterval) {
      trackingIntervalRef.current = setInterval(async () => {
        try {
          await getCurrentLocation();
        } catch (err) {
          console.error('Error updating location:', err);
        }
      }, updateInterval);
    }

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [isTracking, updateInterval, getCurrentLocation]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
    accuracy,
    isTracking,
    isLoading,
    error,
    getCurrentLocation,
    startTracking,
    stopTracking,
    checkGeofence,
    distanceTo,
  };
};

export default useGPS;
