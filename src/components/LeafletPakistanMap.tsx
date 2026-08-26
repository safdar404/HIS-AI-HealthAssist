import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  PAKISTAN_PROVINCES,
  PAKISTAN_HOSPITALS,
  REAL_PAKISTAN_DISTRICTS,
  LiveDistrictSurveillance,
  HospitalGeoNode,
  ProvinceBoundary,
} from '../data/pakistanGeoData';
import {
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Compass,
  Building2,
  HeartPulse,
  Wind,
  Activity,
  Flame,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface LeafletPakistanMapProps {
  selectedDistrict: LiveDistrictSurveillance;
  onSelectDistrict: (district: LiveDistrictSurveillance) => void;
  selectedDiseaseLayer: 'CVD' | 'DIABETES' | 'HYPERTENSION' | 'RESPIRATORY' | 'HOTSPOTS' | 'AQI' | 'HOSPITALS';
  onSelectDiseaseLayer: (layer: any) => void;
  showProvinces: boolean;
  showHospitals: boolean;
  showDistrictPolygons: boolean;
  liveAQIData?: Record<string, any>;
  onInspectHospital?: (hospital: HospitalGeoNode) => void;
}

export const LeafletPakistanMap: React.FC<LeafletPakistanMapProps> = ({
  selectedDistrict,
  onSelectDistrict,
  selectedDiseaseLayer,
  onSelectDiseaseLayer,
  showProvinces,
  showHospitals,
  showDistrictPolygons,
  liveAQIData = {},
  onInspectHospital,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [baseMapStyle, setBaseMapStyle] = useState<'DARK' | 'LIGHT' | 'OSM' | 'SATELLITE'>('DARK');
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [districtSearch, setDistrictSearch] = useState<string>('');

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Pakistan Center: ~30.3753° N, 69.3451° E
    const map = L.map(mapContainerRef.current, {
      center: [30.3753, 69.3451],
      zoom: 6,
      minZoom: 5,
      maxZoom: 16,
      zoomControl: false,
    });

    L.control
      .zoom({
        position: 'topright',
      })
      .addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Tile Layer (Base Maps)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://carto.com/">CARTO</a> | Developed by Muhammad Safdar AI/ML Engineer';

    if (baseMapStyle === 'LIGHT') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    } else if (baseMapStyle === 'OSM') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    } else if (baseMapStyle === 'SATELLITE') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}';
      attribution = 'Tiles &copy; Esri &mdash; Developed by Muhammad Safdar AI/ML Engineer';
    }

    L.tileLayer(tileUrl, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, [baseMapStyle]);

  // 3. Render Vector Polygons, Hotspot Clusters, District Centroids, and Hospital Nodes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Helper: Determine fill color based on current layer
    const getChoroplethColor = (district: LiveDistrictSurveillance) => {
      if (selectedDiseaseLayer === 'HOTSPOTS') {
        if (district.hotspotClassification === 'HOTSPOT_99') return '#dc2626'; // Red 600
        if (district.hotspotClassification === 'HOTSPOT_95') return '#ea580c'; // Orange 600
        if (district.hotspotClassification === 'HOTSPOT_90') return '#f59e0b'; // Amber 500
        if (district.hotspotClassification === 'COLDSPOT') return '#059669'; // Emerald 600
        return '#64748b'; // Slate 500
      }

      if (selectedDiseaseLayer === 'AQI') {
        const aqi = liveAQIData[district.id]?.aqiUs ?? district.environmentalTelemetry?.aqiPm25 ?? 100;
        if (aqi > 200) return '#7f1d1d'; // Hazardous Maroon
        if (aqi > 150) return '#dc2626'; // Unhealthy Red
        if (aqi > 100) return '#ea580c'; // Sensitive Orange
        if (aqi > 50) return '#f59e0b'; // Moderate Amber
        return '#059669'; // Good Emerald
      }

      let val = 0;
      if (selectedDiseaseLayer === 'CVD') val = district.highRiskCvdPct;
      if (selectedDiseaseLayer === 'DIABETES') val = district.diabetesRiskPct;
      if (selectedDiseaseLayer === 'HYPERTENSION') val = district.hypertensionRiskPct;
      if (selectedDiseaseLayer === 'RESPIRATORY') val = district.respiratoryRiskPct;

      if (val >= 28) return '#dc2626';
      if (val >= 24) return '#ea580c';
      if (val >= 20) return '#f59e0b';
      if (val >= 16) return '#0284c7';
      return '#059669';
    };

    // A. Render Real Provincial Boundaries
    if (showProvinces) {
      PAKISTAN_PROVINCES.forEach((province) => {
        const poly = L.polygon(province.coordinates as L.LatLngExpression[], {
          color: province.strokeColor,
          weight: 2,
          opacity: 0.85,
          dashArray: '5, 5',
          fillColor: province.fillColor,
          fillOpacity: 0.08,
        });

        poly.bindTooltip(
          `<strong>${province.name}</strong><br/><span style="font-size:10px; color:#cbd5e1;">Capital: ${province.capital} • Pop: ${(province.population / 1000000).toFixed(1)}M</span>`,
          { sticky: true, className: 'leaflet-tooltip' }
        );

        poly.on('click', () => {
          map.flyTo(province.center, 7, { duration: 1.2 });
        });

        layerGroup.addLayer(poly);
      });
    }

    // B. Render Real District Boundary Polygons (Choropleth Fill)
    if (showDistrictPolygons) {
      REAL_PAKISTAN_DISTRICTS.forEach((district) => {
        const color = getChoroplethColor(district);
        const isSelected = selectedDistrict.id === district.id;

        const poly = L.polygon(district.boundaryPolygon as L.LatLngExpression[], {
          color: isSelected ? '#38bdf8' : color,
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 1 : 0.7,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.2,
        });

        poly.bindTooltip(
          `<strong>${district.districtName} (${district.province})</strong><br/><span style="font-size:10px; color:#94a3b8;">High Risk CVD: ${district.highRiskCvdPct}% | Gi* Z: +${district.hotspotGiScore.toFixed(2)}</span>`,
          { sticky: true, className: 'leaflet-tooltip' }
        );

        poly.on('click', () => {
          onSelectDistrict(district);
          map.flyTo(district.coordinates, 9, { duration: 1 });
        });

        layerGroup.addLayer(poly);
      });
    }

    // C. Render District Centroid Pulsing Markers & AI Telemetry Nodes
    REAL_PAKISTAN_DISTRICTS.forEach((district) => {
      const color = getChoroplethColor(district);
      const isSelected = selectedDistrict.id === district.id;
      const isHotspot99 = district.hotspotClassification === 'HOTSPOT_99';

      // Outer radar pulse ring for 99% confidence hotspots
      if (isHotspot99) {
        const radarCircle = L.circleMarker(district.coordinates, {
          radius: 26,
          color: '#ef4444',
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          className: 'radar-ping',
        });
        layerGroup.addLayer(radarCircle);
      }

      // Main District Marker
      const marker = L.circleMarker(district.coordinates, {
        radius: isSelected ? 12 : 8,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      });

      // Rich HTML Popup
      const popupHtml = `
        <div style="min-width: 240px; padding: 12px; font-family: ui-sans-serif, system-ui, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 6px;">
            <div>
              <span style="background: #0284c7; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${district.province}</span>
              <h4 style="margin: 4px 0 0 0; font-size: 14px; font-weight: 800; color: #f8fafc;">${district.districtName}</h4>
            </div>
            <span style="font-size: 10px; font-weight: 800; color: ${color}; background: rgba(255,255,255,0.08); padding: 3px 6px; border-radius: 6px;">
              ${district.hotspotClassification === 'HOTSPOT_99' ? '🚨 99% Hotspot' : district.hotspotClassification === 'HOTSPOT_95' ? '🔥 95% Hotspot' : 'Normal Cluster'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px;">
            <div style="background: #1e293b; padding: 6px; border-radius: 6px;">
              <span style="color: #94a3b8; font-size: 9px; display: block;">CVD High Risk</span>
              <strong style="color: #f43f5e; font-size: 13px;">${district.highRiskCvdPct}%</strong>
            </div>
            <div style="background: #1e293b; padding: 6px; border-radius: 6px;">
              <span style="color: #94a3b8; font-size: 9px; display: block;">Diabetes Risk</span>
              <strong style="color: #f59e0b; font-size: 13px;">${district.diabetesRiskPct}%</strong>
            </div>
            <div style="background: #1e293b; padding: 6px; border-radius: 6px;">
              <span style="color: #94a3b8; font-size: 9px; display: block;">Hypertension</span>
              <strong style="color: #38bdf8; font-size: 13px;">${district.hypertensionRiskPct}%</strong>
            </div>
            <div style="background: #1e293b; padding: 6px; border-radius: 6px;">
              <span style="color: #94a3b8; font-size: 9px; display: block;">Emergency Load</span>
              <strong style="color: #ef4444; font-size: 13px;">${district.emergencyCasesCount} Cases</strong>
            </div>
          </div>

          <div style="background: #0f172a; border: 1px solid #334155; padding: 6px; border-radius: 6px; font-size: 10px; color: #cbd5e1; margin-bottom: 8px;">
            <span style="color: #38bdf8; font-weight: 700;">Python XGBoost CVD Probability:</span> ${(district.mlModelMetrics.xgbCvdRiskProbability * 100).toFixed(1)}%<br/>
            <span style="color: #2dd4bf; font-weight: 700;">Spatial Moran's I:</span> ${district.mlModelMetrics.spatialMoranI.toFixed(3)} (p &lt; ${district.mlModelMetrics.pVal})
          </div>

          <button id="btn-inspect-${district.id}" style="width: 100%; background: #0284c7; color: white; border: none; padding: 6px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;">
            Deep-Dive AI Analytics &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${district.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectDistrict(district);
            map.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectDistrict(district);
      });

      layerGroup.addLayer(marker);
    });

    // D. Render Major Hospital & ICU Emergency Trauma Centers
    if (showHospitals) {
      PAKISTAN_HOSPITALS.forEach((hosp) => {
        const isSurge = hosp.emergencyStatus === 'CRITICAL_SURGE';
        const hospColor = isSurge ? '#ef4444' : hosp.emergencyStatus === 'ELEVATED' ? '#f59e0b' : '#10b981';

        // Custom Hospital Icon using Leaflet DivIcon
        const hospitalDivIcon = L.divIcon({
          className: 'custom-hosp-icon',
          html: `
            <div style="background: #0f172a; border: 2px solid ${hospColor}; border-radius: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.4); cursor: pointer;">
              <span style="color: ${hospColor}; font-size: 12px; font-weight: 900;">🏥</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const hospMarker = L.marker(hosp.coordinates, { icon: hospitalDivIcon });

        const hospPopup = `
          <div style="min-width: 220px; padding: 10px; font-family: ui-sans-serif, system-ui, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; background: ${hospColor}; color: white; padding: 2px 6px; border-radius: 4px;">
                ${hosp.type}
              </span>
              <span style="font-size: 9px; color: #94a3b8; font-weight: 700;">${hosp.province}</span>
            </div>
            <h4 style="font-size: 13px; font-weight: 800; color: #ffffff; margin: 4px 0;">${hosp.name}</h4>
            <div style="font-size: 11px; color: #cbd5e1; margin: 6px 0;">
              <div><strong>ICU Bed Load:</strong> ${hosp.icuBedsOccupied} / ${hosp.icuBedsTotal} (${Math.round((hosp.icuBedsOccupied / hosp.icuBedsTotal) * 100)}%)</div>
              <div><strong>Cardiac Cath Lab:</strong> ${hosp.cardiacCatheterizationLab ? '✅ 24/7 Operational' : '❌ Unavailable'}</div>
              <div><strong>Direct Line:</strong> <a href="tel:${hosp.contact}" style="color: #38bdf8; text-decoration: underline;">${hosp.contact}</a></div>
            </div>
          </div>
        `;

        hospMarker.bindPopup(hospPopup);
        hospMarker.on('click', () => {
          if (onInspectHospital) onInspectHospital(hosp);
        });

        layerGroup.addLayer(hospMarker);
      });
    }

    // E. User Location Pin if active
    if (userLocation) {
      const userMarker = L.circleMarker(userLocation, {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#06b6d4',
        fillOpacity: 1,
      });
      userMarker.bindPopup('<strong>Your Location (GPS Telemetry)</strong>');
      layerGroup.addLayer(userMarker);

      const userAccuracy = L.circle(userLocation, {
        radius: 3000,
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.1,
      });
      layerGroup.addLayer(userAccuracy);
    }
  }, [
    selectedDistrict,
    selectedDiseaseLayer,
    showProvinces,
    showHospitals,
    showDistrictPolygons,
    liveAQIData,
    userLocation,
    baseMapStyle,
  ]);

  // Handle Locate User GPS
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setLocatingUser(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 10, { duration: 1.5 });
        }
      },
      (err) => {
        console.warn('GPS location error:', err);
        setLocatingUser(false);
        // Default to Islamabad center
        const defaultCoords: [number, number] = [33.6844, 73.0479];
        setUserLocation(defaultCoords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(defaultCoords, 9, { duration: 1.5 });
        }
      }
    );
  };

  // Fly to target district
  const handleFlyToDistrict = (d: LiveDistrictSurveillance) => {
    onSelectDistrict(d);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(d.coordinates, 9, { duration: 1.2 });
    }
  };

  // Filter districts for quick lookup
  const searchResults = districtSearch.trim()
    ? REAL_PAKISTAN_DISTRICTS.filter(
        (d) =>
          d.districtName.toLowerCase().includes(districtSearch.toLowerCase()) ||
          d.province.toLowerCase().includes(districtSearch.toLowerCase())
      )
    : [];

  return (
    <div className="relative w-full h-[540px] md:h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Floating Map Controls Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Quick District Finder Search */}
        <div className="relative pointer-events-auto w-60 sm:w-72">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Pakistan District..."
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-xl"
            />
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    handleFlyToDistrict(d);
                    setDistrictSearch('');
                  }}
                  className="p-2 hover:bg-slate-800 cursor-pointer text-xs flex items-center justify-between border-b border-slate-800/60 last:border-none"
                >
                  <span className="font-bold text-white">{d.districtName}</span>
                  <span className="text-[10px] text-cyan-400 font-semibold">{d.province}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Base Map Switcher & GPS Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl text-xs">
          <button
            onClick={() => setBaseMapStyle('DARK')}
            title="CartoDB Dark Matter Surveillance Mode"
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              baseMapStyle === 'DARK' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dark GIS
          </button>
          <button
            onClick={() => setBaseMapStyle('LIGHT')}
            title="CartoDB Positron Clinical Light Mode"
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              baseMapStyle === 'LIGHT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setBaseMapStyle('OSM')}
            title="OpenStreetMap Standard"
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              baseMapStyle === 'OSM' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            OSM
          </button>
          <button
            onClick={() => setBaseMapStyle('SATELLITE')}
            title="Esri World Satellite Imagery"
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              baseMapStyle === 'SATELLITE' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>

          <span className="text-slate-700">|</span>

          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateUser}
            disabled={locatingUser}
            title="Locate My Clinic (GPS Telemetry)"
            className="p-1.5 rounded-lg text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Navigation className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-amber-400' : ''}`} />
            <span className="text-[11px] font-bold hidden sm:inline">GPS</span>
          </button>

          {/* Reset Extent */}
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([30.3753, 69.3451], 6, { duration: 1.2 });
              }
            }}
            title="Reset to Full Pakistan View"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" />

      {/* Bottom Floating Legend & Watermark Ribbon */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Live Legend */}
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3 text-[10px] text-slate-300">
          <span className="font-bold text-cyan-400 uppercase tracking-wider">
            Layer: {selectedDiseaseLayer}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600"></span> Hotspot (99%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Low / Coldspot
            </span>
            <span className="flex items-center gap-1">
              <span className="text-xs">🏥</span> ICU Trauma Hub
            </span>
          </div>
        </div>

        {/* Real-time Engineering Signature Watermark */}
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800/90 shadow-xl text-[10px] text-slate-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Leaflet GIS Engine • </span>
          <strong className="text-cyan-300">Developed by Muhammad Safdar AI/ML Engineer</strong>
        </div>
      </div>
    </div>
  );
};
