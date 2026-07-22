import { useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const OFFICES = [
  {
    label: "San Francisco",
    buttonLabel: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    zoom: 12,
    address: "San Francisco, CA, USA",
    directionsUrl:
      "https://www.openstreetmap.org/?mlat=37.7749&mlon=-122.4194#map=12/37.7749/-122.4194",
  },
  {
    label: "Kigali Office",
    buttonLabel: "Kigali",
    lat: -1.9438,
    lon: 30.0619,
    zoom: 16,
    address: "Town Center Building, Nyarugenge · 2nd Floor, Door F2B-022C",
    directionsUrl:
      "https://www.openstreetmap.org/?mlat=-1.9438&mlon=30.0619#map=16/-1.9438/30.0619",
  },
] as const;

const FooterMap = () => {
  const [activeOffice, setActiveOffice] = useState(0);
  const office = OFFICES[activeOffice];

  const mapKey = useMemo(
    () => `${office.lat}-${office.lon}-${office.zoom}`,
    [office.lat, office.lon, office.zoom]
  );

  return (
    <div className="mt-10 rounded-xl overflow-hidden border border-white/10">
      <div className="relative h-48 w-full md:h-56 bg-[#dbeafe]">
        <MapContainer
          key={mapKey}
          center={[office.lat, office.lon]}
          zoom={office.zoom}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[office.lat, office.lon]} icon={pinIcon}>
            <Popup>
              <strong>{office.label}</strong>
              <br />
              {office.address}
            </Popup>
          </Marker>
        </MapContainer>

        <div className="absolute bottom-2 left-2 right-2 z-[500] flex flex-wrap items-end justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto max-w-[72%] space-y-1">
            <a
              href={office.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#38761D]/95 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#38761D] transition-colors"
            >
              <MapPin className="h-3 w-3 text-[#E01C21]" />
              {office.label}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <p className="rounded-md bg-[#38761D]/90 px-2.5 py-1 text-[10px] leading-snug text-white/90">
              {office.address}
            </p>
          </div>

          <div className="pointer-events-auto flex flex-wrap gap-2 justify-end">
            {OFFICES.map((item, index) => (
              <button
                key={item.buttonLabel}
                type="button"
                onClick={() => setActiveOffice(index)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  activeOffice === index
                    ? "bg-[#E01C21] text-white"
                    : "bg-[#38761D]/95 text-white hover:bg-[#38761D]"
                }`}
              >
                {item.buttonLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterMap;
