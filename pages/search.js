import { useState } from 'react';
import { useRouter } from 'next/router';

const FYT_BASE = 'https://findyourtunes.vercel.app';

function formatMoney(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  return `$${num.toFixed(2)}`;
}

function ResultCard({ r }) {
  const linkHref = r.resultType === '4ever' ? r.link : (FYT_BASE + r.link);
  const price = formatMoney(r.price);

  return (
    <a href={linkHref} className="resultCard" target={r.resultType === 'user' ? '_blank' : '_self'} rel="noopener noreferrer">
      {r.photo
        ? <img src={r.photo} alt="" className="resultPhoto" />
        : <div className="resultPhotoPlaceholder">💿</div>
      }
      <div className="resultBody">
        <div className="resultArtist">{r.artist || 'Unknown Artist'}</div>
        <div className="resultTitle">{r.title || 'Untitled'}</div>
        <div className="resultMeta">{[r.format, r.condition].filter(Boolean).join(' · ')}</div>
        {price && <div className="resultPrice">{price}</div>}
        <div className={r.resultType === '4ever' ? 'sourceBadge sourceBadge4Ever' : 'sourceBadge sourceBadgeUser'}>
          {r.resultType === '4ever' ? '4 Ever Memories' : 'Sold by ' + (r.sellerName || 'a FYT user') + ' →'}
        </div>
      </div>
    </a>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(e) {
    if (e) e.preventDefault();
    const query = q.trim();
    if (query.length < 2) { setError('Type at least 2 characters.'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await fetch(FYT_BASE + '/api/universal-search?q=' + encodeURIComponent(query));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
    } catch (err) {
      setError('Search failed — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <a href="/" className="backLink">← Back to 4 Ever Memories</a>
      <div className="header">Search Everything</div>
      <div className="sub">Searches 4 Ever Memories' own inventory and every FYT user's storefront, together.</div>
      <a href="https://www.findyourtunes.com/pricing" target="_blank" rel="noopener noreferrer" className="fytPromo">📱 Click Here to get the FYT app free →</a>

      <form className="searchRow" onSubmit={runSearch}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Artist, title, or label…" className="searchInput" />
        <button type="submit" className="searchBtn" disabled={loading}>{loading ? '…' : 'Search'}</button>
      </form>

      {error && <div className="errorMsg">{error}</div>}

      {results !== null && (
        <div className="resultsInfo">{results.length} result{results.length === 1 ? '' : 's'}</div>
      )}

      {results && results.length > 0 && (
        <div className="grid">
          {results.map(r => <ResultCard key={r.resultType + '-' + r.id} r={r} />)}
        </div>
      )}

      {results && results.length === 0 && (
        <div className="emptyMsg">No matches found. Try a different search.</div>
      )}

      <style jsx>{`
        .page { min-height: 100vh; background: #0d0d0d; color: #e8d5b0; font-family: Georgia, serif; padding: 20px 16px 60px; }
        .backLink { color: #888; text-decoration: none; font-size: 13px; display: inline-block; margin-bottom: 16px; }
        .header { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
        .sub { font-size: 13px; color: #999; margin-bottom: 20px; }
        .fytPromo { display: inline-block; background: linear-gradient(135deg,#00d4ff,#a855f7); color: #0b0a14; font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 100px; text-decoration: none; margin-bottom: 18px; }
        .searchRow { display: flex; gap: 8px; margin-bottom: 20px; max-width: 500px; }
        .searchInput { flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid #2a2a2a; background: #111; color: #e8d5b0; font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box; }
        .searchBtn { padding: 12px 20px; border-radius: 10px; border: none; background: #c9a84c; color: #0d0d0d; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }
        .errorMsg { color: #f87171; font-size: 13px; margin-bottom: 16px; }
        .resultsInfo { font-size: 12px; color: #888; margin-bottom: 12px; }
        .emptyMsg { color: #888; font-size: 14px; text-align: center; padding: 40px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .resultCard { display: block; background: #111; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; }
        .resultPhoto { width: 100%; aspect-ratio: 1; object-fit: cover; }
        .resultPhotoPlaceholder { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 36px; background: #0a0a0a; }
        .resultBody { padding: 10px 12px 12px; }
        .resultArtist { font-size: 13px; font-weight: 700; color: #e8d5b0; }
        .resultTitle { font-size: 12px; color: #bbb; font-style: italic; }
        .resultMeta { font-size: 10px; color: #666; margin-top: 3px; }
        .resultPrice { font-size: 15px; font-weight: 700; color: #4ade80; margin-top: 4px; }
        .sourceBadge { font-size: 10px; margin-top: 6px; font-weight: 700; }
        .sourceBadge4Ever { color: #c9a84c; }
        .sourceBadgeUser { color: #22d3ee; }
      `}</style>
    </div>
  );
}
