export function initMap() {
  const mapElement = document.querySelector('.map');
  if (!mapElement || !window.google || !window.google.maps) return;

  const location = { lat: 49.30531365926556, lng: 2.7737150817081977 };

  const map = new window.google.maps.Map(mapElement, {
    center: location,
    zoom: 15,
  });

  const circle = new window.google.maps.Circle({
    map: map,
    center: location,
    radius: 1000,
    fillColor: '#90beab',
    fillOpacity: 0.2,
    strokeColor: '#90beab',
    strokeOpacity: 0.6,
    strokeWeight: 2,
  });

  map.fitBounds(circle.getBounds());
}
