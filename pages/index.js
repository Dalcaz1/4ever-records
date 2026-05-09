export default function Home() {
  var records = [
    {id:'4EMR-0001',artist:'Pink Floyd',title:'Dark Side of the Moon',year:1973,cond:'VG+',price:47,color:'#8b1a1a'},
    {id:'4EMR-0002',artist:'Miles Davis',title:'Kind of Blue',year:1959,cond:'NM',price:62,color:'#1a3a6a'},
    {id:'4EMR-0003',artist:'The Beatles',title:'Abbey Road',year:1969,cond:'VG+',price:64,color:'#1a4a2a'},
    {id:'4EMR-0004',artist:'Marvin Gaye',title:'Whats Going On',year:1971,cond:'VG',price:55,color:'#4a2a6a'},
    {id:'4EMR-0005',artist:'Carole King',title:'Tapestry',year:1971,cond:'VG+',price:24,color:'#6a4a1a'},
    {id:'4EMR-0006',artist:'John Coltrane',title:'A Love Supreme',year:1965,cond:'M',price:95,color:'#1a4a4a'},
    {id:'4EMR-0007',artist:'Stevie Wonder',title:'Songs in the Key of Life',year:1976,cond:'VG+',price:42,color:'#4a3a1a'},
    {id:'4EMR-0008',artist:'Led Zeppelin',title:'IV',year:1971,cond:'VG',price:38,color:'#1a1a5a'},
  ];
  var nav = {background:'#0f1828',borderBottom:'3px solid #c9a84c',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'};
  var logo = {fontSize:'20px',color:'#c9a84c',letterSpacing:'1px',fontWeight:'500'};
  var sub = {fontSize:'9px',letterSpacing:'3px',color:'#6a7d90',textTransform:'uppercase'};
  var fblink = {background:'#1877f2',color:'#fff',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',textDecoration:'none'};
  var grid = {display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',maxWidth:'1200px',margin:'24px auto',padding:'0 24px'};
  var card = {background:'#fff',border:'1px solid #ddd5c0',borderRadius:'12px',overflow:'hidden'};
  var imgbox = {width:'100%',height:'180px',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'};
  var disc = {width:'140px',height:'140px',borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center'};
  var body = {padding:'12px'};
  var sku = {fontSize:'9px',color:'#999',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'3px'};
  var title = {fontSize:'13px',fontWeight:'500',color:'#1a2744',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
  var artist = {fontSize:'11px',color:'#777',marginBottom:'8px'};
  var row = {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'};
  var price = {fontSize:'16px',fontWeight:'500',color:'#8b1a1a'};
  var cond = {fontSize:'9px',padding:'2px 7px',borderRadius:'10px',background:'#e8f5ee',color:'#1e6b3a'};
  var btn = {width:'100%',padding:'7px',background:'#1a2744',color:'#c9a84c',border:'none',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'Georgia,serif',letterSpacing:'1px',textTransform:'uppercase'};
  var footer = {background:'#0f1828',borderTop:'2px solid #c9a84c',padding:'12px 24px',display:'flex',justifyContent:'space-between',marginTop:'24px'};
  return (
    <div style={{fontFamily:'Georgia,serif',background:'#faf7f0',minHeight:'100vh'}}>
      <nav style={nav}>
        <div>
          <div style={logo}>4 Ever Memories Records</div>
          <div style={sub}>Vinyl · Memories · Music</div>
        </div>
        <a href="https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/" target="_blank" rel="noreferrer" style={fblink}>Follow on Facebook</a>
      </nav>
      <div style={grid}>
        {records.map(function(r){return(
          <div key={r.id} style={card}>
            <div style={imgbox}>
              <div style={disc}>
                <div style={{width:'50px',height:'50px',borderRadius:'50%',background:r.color}}></div>
              </div>
            </div>
            <div style={body}>
              <div style={sku}>{r.id}</div>
              <div style={title}>{r.title}</div>
              <div style={artist}>{r.artist} · {r.year}</div>
              <div style={row}>
                <span style={price}>${r.price}</span>
