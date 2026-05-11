export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images, format } = req.body;
  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const content = [
      ...images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: img },
      })),
      {
        type: 'text',
        text: `You are an expert music collector and vinyl record identifier with decades of experience reading record labels, album covers, CD cases, and cassette inserts. You are fluent in English, Spanish, and other languages commonly found on records.

Analyze these ${format} photos carefully. Read ALL visible text in the images including small print.

YOUR TASK: Identify the following from the label(s) and/or cover(s):
- The RECORD LABEL company (e.g. Freddie Records, VeeJay, Columbia, Discos CBS, etc.)
- The ARTIST or GROUP NAME (e.g. Los Vaqueros Del Norte, The 4 Seasons, etc.)
- The SONG TITLE(S) — there may be a Side A and Side B title visible
- The release YEAR if visible
- The CATALOG NUMBER (e.g. FR-801, VJ 465) — this is critical for identifying the exact pressing
- The COUNTRY OF MANUFACTURE if visible (e.g. "Made in USA", "Printed in UK", "Hecho en Mexico")
- The PRESSING DETAILS — original vs reissue, promo, stereo/mono, colored vinyl, picture disc

IMPORTANT RULES:
1. The RECORD LABEL name printed on the label (Freddie, VeeJay, Columbia, Motown, etc.) is NOT the artist — it is the company that released the record. Put it in the "label" field.
2. The ARTIST is the performer or group. On Spanish records this is often a band like "Los Vaqueros Del Norte", "Conjunto Bernal", "Ramon Ayala", etc.
3. The SONG TITLE is what the record is called. On a 45, there is a Side A title and a Side B title — use the A side as the main title and put the B side in notes.
4. Catalog numbers like "FR-801", "VJ-465" are critical — put them in BOTH the catalog_number field AND notes.
5. If you see both sides of the record, read both labels carefully.
6. For Spanish language records, preserve the correct spelling including accents (é, á, ó, ú, ñ, etc.).
7. Use your music knowledge — if you recognize a known artist or label, use that knowledge to confirm what you read.
8. NEVER return a number like "1" or "2" as the artist name — if you cannot read the artist clearly, return an empty string.
9. If the year is not clearly visible on the label, return an empty string for year — do NOT guess or default to any year.
10. For country: look for "Made in USA", "Mfd. in USA", "Printed in UK", "Hecho en Mexico", "Made in Japan" etc. If not visible return empty string.
11. Pressing clues: look for "Promo", "Not For Sale", "DJ Copy", "Stereo", "Mono", "Re-issue", "Remastered", colored vinyl, or any matrix/runout etchings.

Return ONLY a JSON object:
{
  "artist": "the performing artist or group name, empty string if truly unreadable",
  "title": "the main song or album title (Side A for 45s), empty string if truly unreadable",
  "year": "4 digit release year only if clearly visible on the label, otherwise empty string"
