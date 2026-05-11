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
        text: 'You are an expert music collector and vinyl record identifier with decades of experience reading record labels, album covers, CD cases, and cassette inserts. You are fluent in English, Spanish, and other languages commonly found on records.\n\nAnalyze these ' + format + ' photos carefully. Read ALL visible text in the images including small print.\n\nYOUR TASK: Identify the following from the labels and/or covers:\n- The RECORD LABEL company (e.g. Freddie Records, VeeJay, Columbia, Discos CBS, etc.)\n- The ARTIST or GROUP NAME (e.g. Los Vaqueros Del Norte, The 4 Seasons, etc.)\n- The SONG TITLE(S) — there may be a Side A and Side B title visible\n- The release YEAR if visible\n- The CATALOG NUMBER (e.g. FR-801, V
