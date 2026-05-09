const records = [
  {id:'4EMR-0001',artist:'Pink Floyd',title:'Dark Side of the Moon',year:1973,cond:'VG+',price:47,color:'#8b1a1a'},
  {id:'4EMR-0002',artist:'Miles Davis',title:'Kind of Blue',year:1959,cond:'NM',price:62,color:'#1a3a6a'},
  {id:'4EMR-0003',artist:'The Beatles',title:'Abbey Road',year:1969,cond:'VG+',price:64,color:'#1a4a2a'},
  {id:'4EMR-0004',artist:'Marvin Gaye',title:'Whats Going On',year:1971,cond:'VG',price:55,color:'#4a2a6a'},
  {id:'4EMR-0005',artist:'Carole King',title:'Tapestry',year:1971,cond:'VG+',price:24,color:'#6a4a1a'},
  {id:'4EMR-0006',artist:'John Coltrane',title:'A Love Supreme',year:1965,cond:'M',price:95,color:'#1a4a4a'},
  {id:'4EMR-0007',artist:'Stevie Wonder',title:'Songs in the Key of Life',year:1976,cond:'VG+',price:42,color:'#4a3a1a'},
  {id:'4EMR-0008',artist:'Led Zeppelin',title:'IV',year:1971,cond:'VG',price:38,color:'#1a1a5a'},
];

function RecordCard(props) {
  var r = props.record;
  return (
    <div style={{background:'#fff',border:'1px solid #ddd5c0',borderRadius:'12px',overflow:'hidden'}}>
      <div style={{width:'100%',aspectRatio:'1',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:'80%',aspectRatio:'1',borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:'35%',aspectRatio:'1',borderRadius:'50%',background:r.color}}></div>
        </div>
      </div>
      <div style={{padding:'12px'}}>
        <div style={{fontSize:'9px',color:'#999',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'3px'}}>{r.id}</div>
        <div style={{fontSize:'13px',fontWeight:'500',color:'#1a2744',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</div>
        <div style={{fontSize:'11px',color:'#777',marginBottom:'8px'}}>{r.artist} · {r.year}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
          <span style={{fontSize:'16px',fontWeight:'500',color:'#8b1a1a'}}>${r.price}</span>
          <span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'10px',background:'#e8f5ee',color:'#1e6b3a'}}>{r.cond}</span>
        </div>
        <button style={{width:'100%',padding:'7px',background:'#1a2744',color:'#c9a84c',border:'none',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'Georgia,serif',letterSpacing:'1px',textTransform:'uppercase'}}>Add to Cart</button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div style={
