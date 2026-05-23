export async function getCoordinates(address: string): Promise<{ latitude: number, longitude: number } | null> {
  try {
    // OpenStreetMap Nominatim API requires a custom User-Agent
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ColetaMax/1.0 (seu_email@example.com)'
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar coordenadas:', error);
    return null;
  }
}
