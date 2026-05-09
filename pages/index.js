export default function Home() {
  const records = [
    {id:'4EMR-0001',artist:'Pink Floyd',title:'The Dark Side of the Moon',label:'Harvest',year:1973,genre:'Rock',cond:'VG+',price:47,color:'#8b1a1a'},
    {id:'4EMR-0002',artist:'Miles Davis',title:'Kind of Blue',label:'Columbia',year:1959,genre:'Jazz',cond:'NM',price:62,color:'#1a3a6a'},
    {id:'4EMR-0003',artist:'The Beatles',title:'Abbey Road',label:'Apple',year:1969,genre:'Rock',cond:'VG+',price:64,color:'#1a4a2a'},
    {id:'4EMR-0004',artist:'Marvin Gaye',title:"What's Going On",label:'Tamla',year:1971,genre:'Soul',cond:'VG',price:55,color:'#4a2a6a'},
    {id:'4EMR-0005',artist:'Carole King',title:'Tapestry',label:'Ode',year:1971,genre:'Folk',cond:'VG+',price:24,color:'#6a4a1a'},
    {id:'4EMR-0006',artist:'John Coltrane',title:'A Love Supreme',label:'Impulse!',year:1965,genre:'Jazz',cond:'M',price:95,color:'#1a4a4a'},
    {id:'4EMR-0007',artist:'Stevie Wonder',title:'Songs in the Key of Life',label:'Tamla',year:1976,genre:'Soul',cond:'VG+',price:42,color:'#4a3a1a'},
    {id:'4EMR-0008',artist:'Led Zeppelin',title:'IV',label:'Atlantic',year:1971,genre:'Rock',cond:'VG',price:38,color:'#1a1a5a'},
  ];

  return (
    <div style={{fontFamily:'Georgia,serif',background:'#faf7f0',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      
      {/* NAV */}
      <nav style={{background:'#0f1828',borderBottom:'3px solid #c9a84c',display:'flex',alignItems:'center',gap:'16px',padding:'0 24px',flexShrink:0}}>
        <div style={{padding:'12px 0',flex:1}}>
          <div style={{fontSize:'18px',color:'#c9a84c',letterSpacing:'1px',fontWeight:'500'}}>4 Ever Memories Records</div>
          <div style={{fontSize:'9px',letterSpacing:'3px',color:'#6a7d90',textTransform:'uppercase'}}>Vinyl · Memories · Music</div>
        </div>
        <a href="https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:'6px',background:'#1877f2',color:'#fff',padding:'7px 14px',borderRadius:'8px',fontSize:'12px',textDecoration:'none'}}>
          Follow on Facebook
        </a>
      </nav>

      {/* BODY */}
      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',flex:1,overflow:'hidden'}}>
        
        {/* LEFT HERO */}
        <div style={{background:'#0f1828',display:
