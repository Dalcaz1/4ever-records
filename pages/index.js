export default function Home() {
  const records = [
    {id:'4EMR-0001',artist:'Pink Floyd',title:'Dark Side of the Moon',year:1973,cond:'VG+',price:47,color:'#8b1a1a'},
    {id:'4EMR-0002',artist:'Miles Davis',title:'Kind of Blue',year:1959,cond:'NM',price:62,color:'#1a3a6a'},
    {id:'4EMR-0003',artist:'The Beatles',title:'Abbey Road',year:1969,cond:'VG+',price:64,color:'#1a4a2a'},
    {id:'4EMR-0004',artist:'Marvin Gaye',title:"What's Going On",year:1971,cond:'VG',price:55,color:'#4a2a6a'},
    {id:'4EMR-0005',artist:'Carole King',title:'Tapestry',year:1971,cond:'VG+',price:24,color:'#6a4a1a'},
    {id:'4EMR-0006',artist:'John Coltrane',title:'A Love Supreme',year:1965,cond:'M',price:95,color:'#1a4a4a'},
    {id:'4EMR-0007',artist:'Stevie Wonder',title:'Songs in the Key of Life',year:1976,cond:'VG+',price:42,color:'#4a3a1a'},
    {id:'4EMR-0008',artist:'Led Zeppelin',title:'IV',year:1971,cond:'VG',price:38,color:'#1a1a5a'},
  ];

  return (
    <div style={{fontFamily:'Georgia,serif',background:'#faf7f0',minHeight:'100vh'}}>
      <nav style={{background:'#0f1828',borderBottom:'3px solid #c9a84c',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'20px',color:'#c9a84c',letterSpacing:'1px',fontWeight:'500'}}>4 Ever Memories Records</div>
          <div style={{fontSize:'9px',letterSpacing:'3px',color:'#6a7d90',textTransform:'uppercase'}}>Vinyl · Memories · Music</div>
        </div>
        <a href="https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/" target="_blank" rel="noreferrer" style={{background:'#1877f2',color:'#fff',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',textDecoration:'none'}}>
          Follow on Facebook
        </a>
      </nav>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
          {records.map(r=>(
            <div key={r.id} style={{background:'#fff',border:'1px solid #ddd5c0',borderRadius:'12px',overflow:'hidden'}}>
              <div style={{width:'100%',aspectRatio:'1',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:'80%',aspectRatio:'1',borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:'35%',aspectRatio:'1',borderRadius:'50%',background:r.color}}></div>
                </div>
              </div>
              <div style={{padding:'12px'}}>
                <div style={{fontSize:'9px',color:'#999',letterS
