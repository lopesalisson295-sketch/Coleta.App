import { NextResponse } from 'next/server';

type Point = {
  id: string;
  latitude: number;
  longitude: number;
};

export async function POST(req: Request) {
  try {
    const { points } = await req.json() as { points: Point[] };

    if (!points || points.length < 2) {
      return NextResponse.json({ error: 'É necessário pelo menos 2 pontos para otimizar.' }, { status: 400 });
    }

    // Filtrar apenas pontos com coordenadas válidas
    const validPoints = points.filter(p => p.latitude && p.longitude);

    if (validPoints.length < 2) {
      return NextResponse.json({ error: 'Não há pontos suficientes com coordenadas válidas.' }, { status: 400 });
    }

    // OSRM aceita lon,lat
    const coordinatesString = validPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
    
    // Trip API resolve o caixeiro viajante (melhor rota passando por todos os pontos)
    const url = `http://router.project-osrm.org/trip/v1/driving/${coordinatesString}?roundtrip=false&source=first`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro na API OSRM: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.code !== 'Ok' || !data.waypoints) {
      throw new Error('Falha ao processar rota');
    }

    // Mapear os pontos originais com a nova ordem sugerida
    const orderedPoints = data.waypoints
      .sort((a: any, b: any) => a.waypoint_index - b.waypoint_index)
      .map((wp: any) => {
        // match by original index from the request array
        const originalPoint = validPoints[wp.original_index];
        return {
          id: originalPoint.id,
          order: wp.waypoint_index
        };
      });

    return NextResponse.json({ ordered: orderedPoints });
  } catch (error) {
    console.error('Erro na otimização de rota:', error);
    return NextResponse.json({ error: 'Erro ao otimizar rota' }, { status: 500 });
  }
}
