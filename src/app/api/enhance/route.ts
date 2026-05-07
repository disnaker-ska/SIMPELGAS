import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const API_KEY = process.env.GEMINI_API_KEY
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi di server.' },
        { status: 500 }
      )
    }

    const prompt = `Anda adalah asisten AI profesional untuk penyusunan laporan kegiatan instansi pemerintah Kota Surakarta. Tugas Anda adalah memperbaiki dan mengembangkan catatan laporan kegiatan berikut agar lebih formal, profesional, dan rapi. 

Aturan:
1. Perbaiki typo, ejaan, dan tata bahasa (gunakan bahasa Indonesia yang sangat formal/kedinasan).
2. PERTAHANKAN struktur poin-poin (bullet points) jika input asli menggunakan poin-poin. Jangan digabung menjadi satu paragraf jika inputnya terstruktur.
3. Jangan mengubah esensi, angka, tanggal, nama orang, atau instansi sedikitpun.
4. Jangan gunakan tanda kutip markdown atau format tebal/miring, berikan teks bersih.
5. Buat kalimatnya lebih mengalir tapi tetap singkat dan padat.

Teks asli dari pengguna:
${text}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`


    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      console.error('Gemini API Error:', data)
      return NextResponse.json(
        { error: data?.error?.message || 'Gemini API Error' },
        { status: apiRes.status }
      )
    }

    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!responseText) {
      return NextResponse.json(
        { error: 'Respons dari AI kosong. Silakan coba lagi.' },
        { status: 502 }
      )
    }

    // Clean markdown wrappers
    const cleanText = responseText
      .replace(/^```[\w]*\n?/g, '')
      .replace(/```$/g, '')
      .trim()

    return NextResponse.json({ enhanced: cleanText })
  } catch (error) {
    console.error('Server Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server.' },
      { status: 500 }
    )
  }
}
