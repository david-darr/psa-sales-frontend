import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Use correct public URLs for production and local
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/map/marker-icon-2x.png',
  iconUrl: '/map/marker-icon.png',
  shadowUrl: '/map/marker-shadow.png',
});

function SchoolMap({ coords, schools }) {
  if (!coords) return null;
  return (
    <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ width: '600px', height: '400px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {schools.map(s => (
        <Marker key={s.place_id} position={[s.lat, s.lng]}>
          <Popup>
            <b>{s.name}</b><br />{s.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default SchoolMap;