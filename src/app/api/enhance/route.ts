import { NextResponse } from 'next/server'

const PROMPT_TEMPLATE = (text: string) => `Anda adalah asisten AI profesional untuk penyusunan laporan kegiatan instansi pemerintah Kota Surakarta. Tugas Anda adalah memperbaiki dan mengembangkan catatan laporan kegiatan berikut agar lebih formal, profesional, dan rapi. 

Aturan:
1. Perbaiki typo, ejaan, dan tata bahasa (gunakan bahasa Indonesia yang sangat formal/kedinasan).
2. PERTAHANKAN struktur poin-poin (bullet points) jika input asli menggunakan poin-poin. Jangan digabung menjadi satu paragraf jika inputnya terstruktur.
3. Jangan mengubah esensi, angka, tanggal, nama orang, atau instansi sedikitpun.
4. Jangan gunakan tanda kutip markdown atau format tebal/miring, berikan teks bersih.
5. Buat kalimatnya lebih mengalir tapi tetap singkat dan padat.

Teks asli dari pengguna:
${text}`

function cleanMarkdown(text: string): string {
  return text
    .replace(/^```[\w]*\n?/g, '')
    .replace(/```$/g, '')
    .trim()
}

async function callGemini(text: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_TEMPLATE(text) }] }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Gemini API error (status ${res.status})`
    throw new Error(errorMsg)
  }

  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) {
    throw new Error('Respons dari Gemini kosong.')
  }

  return cleanMarkdown(responseText)
}

async function callOpenRouter(text: string, apiKey: string, model?: string): Promise<string> {
  const targetModel = model || 'google/gemini-2.0-flash-exp:free'
  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://simpelgas.surakarta.go.id',
      'X-Title': 'SIMPELGAS Disnaker Surakarta',
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: 'user', content: PROMPT_TEMPLATE(text) }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data?.error?.message || `OpenRouter API error (status ${res.status})`
    throw new Error(errorMsg)
  }

  const responseText = data?.choices?.[0]?.message?.content
  if (!responseText) {
    throw new Error('Respons dari OpenRouter kosong.')
  }

  return cleanMarkdown(responseText)
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const openRouterModel = process.env.OPENROUTER_MODEL

    if (!geminiKey && !openRouterKey) {
      return NextResponse.json(
        { error: 'API Key belum dikonfigurasi di server (GEMINI_API_KEY / OPENROUTER_API_KEY).' },
        { status: 500 }
      )
    }

    const errors: string[] = []

    // 1. Coba Primary: Google Gemini
    if (geminiKey) {
      try {
        const enhanced = await callGemini(text, geminiKey)
        return NextResponse.json({ enhanced, provider: 'gemini' })
      } catch (geminiError: any) {
        console.warn('Gemini Enhance failed, attempting fallback to OpenRouter:', geminiError.message)
        errors.push(`Gemini: ${geminiError.message}`)
      }
    }

    // 2. Coba Fallback: OpenRouter
    if (openRouterKey) {
      try {
        const enhanced = await callOpenRouter(text, openRouterKey, openRouterModel)
        return NextResponse.json({ enhanced, provider: 'openrouter' })
      } catch (openRouterError: any) {
        console.warn('OpenRouter Enhance failed:', openRouterError.message)
        errors.push(`OpenRouter: ${openRouterError.message}`)
      }
    }

    // Jika seluruh provider gagal
    return NextResponse.json(
      {
        error: `Gagal memproses dengan AI: ${errors.join(' | ')}`,
      },
      { status: 502 }
    )
  } catch (error: any) {
    console.error('Server Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    )
  }
}
