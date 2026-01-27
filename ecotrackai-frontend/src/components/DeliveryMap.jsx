import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DeliveryMap = ({ stops, routeGeometry, optimizedRouteGeometry }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    markers: [],
    routes: []
  });

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([14.5995, 120.9842], 13); // Manila center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !stops || stops.length === 0) return;

    // Clear existing layers
    layersRef.current.markers.forEach(marker => marker.remove());
    layersRef.current.routes.forEach(route => route.remove());
    layersRef.current.markers = [];
    layersRef.current.routes = [];

    // Add markers for stops
    stops.forEach((stop, index) => {
      if (stop.coordinates) {
        const iconColor = stop.type === 'origin' ? 'green' : 
                         stop.type === 'destination' ? 'red' : 'blue';
        
        const marker = L.marker([stop.coordinates.latitude, stop.coordinates.longitude], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${iconColor}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${index + 1}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(mapInstanceRef.current);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <strong>${stop.type === 'origin' ? '🟢 Origin' : stop.type === 'destination' ? '🔴 Destination' : '🔵 Stop ' + index}</strong><br/>
            ${stop.location}<br/>
            ${stop.products && stop.products.length > 0 ? `<small>Products: ${stop.products.join(', ')}</small>` : ''}
          </div>
        `);

        layersRef.current.markers.push(marker);
      }
    });

    // Draw original route
    if (routeGeometry) {
      const originalRoute = L.geoJSON(routeGeometry, {
        style: {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.6,
          dashArray: '10, 10'
        }
      }).addTo(mapInstanceRef.current);
      
      layersRef.current.routes.push(originalRoute);
    }

    // Draw optimized route
    if (optimizedRouteGeometry) {
      const optimizedRoute = L.geoJSON(optimizedRouteGeometry, {
        style: {
          color: '#10b981',
          weight: 5,
          opacity: 0.8
        }
      }).addTo(mapInstanceRef.current);
      
      layersRef.current.routes.push(optimizedRoute);
    }

    // Fit map to show all markers
    if (layersRef.current.markers.length > 0) {
      const group = L.featureGroup(layersRef.current.markers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [stops, routeGeometry, optimizedRouteGeometry]);

  return (
    <div 
      ref={mapRef} 
      style={{ height: '400px', width: '100%', borderRadius: '12px' }}
      className="shadow-lg border border-gray-200"
    />
  );
};

export default DeliveryMap;