import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida' }, { status: 400 });
    }

    // Remover o header do base64 (data:image/jpeg;base64,...)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const formData = new URLSearchParams();
    formData.append('image', base64Data);

    const apiKey = process.env.IMGBB_API_KEY;
    
    if (!apiKey) {
      console.error('IMGBB_API_KEY não configurada no .env');
      return NextResponse.json({ error: 'Erro de configuração do servidor de imagens' }, { status: 500 });
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ url: data.data.url });
    } else {
      console.error('Erro na API do ImgBB:', data);
      return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
