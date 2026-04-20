import React, { useState } from 'react';
const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0}).format(n??0);

function Section({title,items,color,maxVal}) {
  const [open,setOpen] = useState(true);
  if (!items?.length) return null;
  const total = items.reduce((s,i)=>s+i.value,0);
  return (
    <div style={{marginBottom:2}}>
      <button onClick={()=>setOpen(!open)}
        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',background:'#F7F4EE',border:'none',cursor:'pointer',fontFamily:'IBM Plex Sans',borderBottom:'1px solid #E2DDD4',transition:'background 0.15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='#EDE9DF'}
        onMouseLeave={e=>e.currentTarget.style.background='#F7F4EE'}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:10,height:10,borderRadius:2,background:color,flexShrink:0}}/>
          <span style={{fontWeight:600,fontSize:13,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>{title}</span>
          <span style={{fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>({items.length})</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:13,color}}>{fmt(total)}</span>
          <span style={{fontSize:10,color:'#C4BAA8'}}>{open?'▲':'▼'}</span>
        </div>
      </button>
      {open && (
        <div>
          {items.map((item,i) => {
            const barPct = maxVal ? Math.min(item.value/maxVal*100,100) : 0;
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px 10px 36px',borderBottom:'1px solid #EDE9DF',background:'#FFFFFF'}}>
                <div style={{width:80,height:4,background:'#EDE9DF',borderRadius:2,overflow:'hidden',flexShrink:0}}>
                  <div style={{width:`${barPct}%`,height:'100%',background:color,borderRadius:2}}/>
                </div>
                <span style={{flex:1,fontSize:13,color:'#3D3525',fontFamily:'IBM Plex Sans',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.label}</span>
                <span style={{fontFamily:'IBM Plex Mono',fontSize:13,color:'#1A1009',flexShrink:0}}>{fmt(item.value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BreakdownTable({results}) {
  const pl  = results?.pl_analysis||(results?.analysis?.type==='pl'?results.analysis:null);
  const bs  = results?.bs_current ||(results?.analysis?.type==='bs'?results.analysis:null);
  const rawPl = pl?.breakdown;
  const plBreakdown = rawPl&&((rawPl.income?.length>0)||(rawPl.cogs?.length>0)||(rawPl.operating_expenses?.length>0))?rawPl:null;
  const bsBreakdown = bs?.breakdown;
  const allVals = plBreakdown?[...(plBreakdown.income||[]),...(plBreakdown.cogs||[]),...(plBreakdown.operating_expenses||[])].map(i=>i.value):bsBreakdown?Object.values(bsBreakdown).flat().map(i=>i.value):[];
  const maxVal = Math.max(...allVals,1);

  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderRadius:4,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:'2px solid #1A1009',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <h2 className="headline" style={{fontSize:18,margin:0}}>Line Item Breakdown</h2>
        <p style={{margin:0,fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>Click section to expand / collapse</p>
      </div>
      {plBreakdown && <>
        <Section title="Income / Revenue"    items={plBreakdown.income}             color="#1B6535" maxVal={maxVal}/>
        <Section title="Cost of Goods Sold"  items={plBreakdown.cogs}              color="#B45309" maxVal={maxVal}/>
        <Section title="Operating Expenses"  items={plBreakdown.operating_expenses} color="#C41E3A" maxVal={maxVal}/>
        <Section title="Other Income"        items={plBreakdown.other_income}       color="#1E40AF" maxVal={maxVal}/>
        <Section title="Other Expenses"      items={plBreakdown.other_expenses}     color="#7C3AED" maxVal={maxVal}/>
      </>}
      {bsBreakdown && <>
        <Section title="Current Assets"          items={bsBreakdown.current_assets}        color="#1B6535" maxVal={maxVal}/>
        <Section title="Fixed Assets"            items={bsBreakdown.fixed_assets}          color="#2D9150" maxVal={maxVal}/>
        <Section title="Other Assets"            items={bsBreakdown.other_assets}          color="#1E40AF" maxVal={maxVal}/>
        <Section title="Current Liabilities"     items={bsBreakdown.current_liabilities}   color="#C41E3A" maxVal={maxVal}/>
        <Section title="Long-Term Liabilities"   items={bsBreakdown.long_term_liabilities} color="#9E1830" maxVal={maxVal}/>
        <Section title="Equity"                  items={bsBreakdown.equity}                color="#B45309" maxVal={maxVal}/>
      </>}
    </div>
  );
}
