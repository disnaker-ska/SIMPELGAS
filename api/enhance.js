// Vercel Serverless Function — /api/enhance
// Memanggil DeepSeek API dari server-side agar API key tidak terekspos ke browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text required' });
  }

  // Gunakan GEMINI_API_KEY (pastikan sudah di-set di Vercel)
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi di environment variables server.'
    });
  }

  try {
    const prompt = `Anda adalah asisten AI profesional untuk penyusunan laporan kegiatan instansi pemerintah Kota Surakarta. Perbaiki dan kembangkan poin-poin catatan laporan kegiatan berikut. Buat menjadi paragraf deskriptif yang rapi, profesional, terstruktur, serta perbaiki typo ejaan (jika ada). Jangan mengubah esensi, angka, nama, atau konteks utamanya sedikitpun. Hanya buat bahasanya lebih formal dan pantas dibaca oleh pimpinan. Jangan menggunakan tanda kutip markdown untuk output ini, langsung teks biasa.\n\nTeks asli tulisan pengguna:\n${text}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Gemini API Error:', data);
      return res.status(apiRes.status).json({
        error: data?.error?.message || 'Gemini API Error'
      });
    }

    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return res.status(502).json({ error: 'Respons dari AI kosong. Silakan coba lagi.' });
    }

    // Bersihkan markdown wrapper jika ada
    const cleanText = responseText.replace(/^```[\w]*\n?/g, '').replace(/```$/g, '').trim();

    return res.status(200).json({ enhanced: cleanText });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
  }
}
