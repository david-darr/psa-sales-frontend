import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet's default icon path so markers show up
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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