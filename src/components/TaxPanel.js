import React, { useState } from 'react';
const fmt  = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n??0);
const fmtC = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);

const ROW = {display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'10px 0',borderBottom:'1px solid #EDE9DF'};

export default function TaxPanel({tax}) {
  const [showBrackets,   setShowBrackets]   = useState(false);
  const [showDeductions, setShowDeductions] = useState(true);
  if (!tax) return null;

  if (tax.tax===null && tax.prompt) return (
    <div style={{background:'#FEF3C7',border:'1px solid #F59E0B',borderLeft:'3px solid #B45309',padding:'20px 24px',borderRadius:'0 4px 4px 0'}}>
      <p style={{margin:'0 0 6px',fontWeight:700,fontSize:14,color:'#92400E',fontFamily:'IBM Plex Sans'}}>🔒 Tax Insights Locked</p>
      <p style={{margin:'0 0 8px',fontSize:13,color:'#78350F',fontFamily:'IBM Plex Sans'}}>{tax.prompt}</p>
      <p style={{margin:0,fontSize:11,color:'#B45309',fontFamily:'IBM Plex Mono'}}>{tax.disclaimer}</p>
    </div>
  );

  if (tax.tax===0) return (
    <div style={{background:'#EAF6EE',border:'1px solid #1B6535',padding:'20px 24px',borderRadius:4}}>
      <p style={{margin:'0 0 4px',fontWeight:700,fontSize:14,color:'#1B6535',fontFamily:'IBM Plex Sans'}}>No Tax Liability</p>
      <p style={{margin:0,fontSize:13,color:'#2D9150',fontFamily:'IBM Plex Sans'}}>{tax.message}</p>
    </div>
  );

  if (tax.tax===null) return (
    <div style={{background:'#F7F4EE',border:'1px solid #C4BAA8',padding:'20px 24px',borderRadius:4}}>
      <p style={{margin:'0 0 4px',fontWeight:700,fontSize:14,color:'#3D3525',fontFamily:'IBM Plex Sans'}}>Tax Estimate Unavailable</p>
      <p style={{margin:0,fontSize:13,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>{tax.message}</p>
    </div>
  );

  const afterTax = (tax.gross_profit??0) - (tax.tax??0);
  const dedLog   = tax.deduction_breakdown||[];
  const brackets = tax.bracket_breakdown||[];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Header KPIs */}
      <div style={{background:'#1A1009',color:'#F7F4EE',padding:'24px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:24}}>
        {[{label:'Gross Profit',value:fmtC(tax.gross_profit),color:'#F7F4EE'},{label:'Deductions Applied',value:fmtC(tax.total_deductions),color:'#4ADE80'},{label:'Taxable Income',value:fmtC(tax.taxable_income),color:'#FCD34D'},{label:'Federal Tax Estimate',value:fmtC(tax.tax),color:'#F87171'},{label:'After-Tax Profit',value:fmtC(afterTax),color:afterTax>=0?'#4ADE80':'#F87171'}].map((k,i) => (
          <div key={i}>
            <p style={{margin:'0 0 4px',fontSize:10,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.1em',textTransform:'uppercase'}}>{k.label}</p>
            <p style={{margin:0,fontFamily:'IBM Plex Mono',fontSize:20,fontWeight:600,color:k.color}}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Effective rate */}
      <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderTop:'3px solid #B45309',padding:'20px 24px',borderRadius:'0 0 4px 4px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontSize:13,color:'#3D3525',fontFamily:'IBM Plex Sans'}}>Effective Rate on Gross Profit</span>
          <span style={{fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:18,color:'#B45309'}}>{tax.effective_rate?.toFixed(1)}%</span>
        </div>
        <div style={{height:8,background:'#EDE9DF',borderRadius:2,overflow:'hidden'}}>
          <div style={{width:`${Math.min(tax.effective_rate/60*100,100)}%`,height:'100%',background:'#B45309',borderRadius:2,transition:'width 0.8s'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,fontFamily:'IBM Plex Mono',color:'#C4BAA8'}}>
          <span>0%</span><span>30%</span><span>60%+</span>
        </div>
      </div>

      {/* Deduction breakdown */}
      {dedLog.length>0 && (
        <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderRadius:4}}>
          <button onClick={()=>setShowDeductions(!showDeductions)}
            style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'IBM Plex Sans'}}>
            <span style={{fontWeight:600,fontSize:14,color:'#1A1009'}}>Deductions Applied ({dedLog.length} items · {fmtC(tax.total_deductions)})</span>
            <span style={{color:'#8A7F70',fontSize:12,fontFamily:'IBM Plex Mono'}}>{showDeductions?'▲':'▼'}</span>
          </button>
          {showDeductions && (
            <div style={{padding:'0 20px 16px'}}>
              {dedLog.map((d,i) => (
                <div key={i} style={{...ROW, flexDirection:'column', alignItems:'flex-start', gap:4}}>
                  <div style={{display:'flex',justifyContent:'space-between',width:'100%'}}>
                    <span style={{fontFamily:'IBM Plex Sans',fontSize:13,fontWeight:600,color:'#1A1009'}}>{d.item}</span>
                    <span style={{fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:13,color:'#1B6535'}}>−{fmtC(d.amount)}</span>
                  </div>
                  <span style={{fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Sans',lineHeight:1.5}}>{d.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brackets */}
      {brackets.length>0 && (
        <div>
          <button onClick={()=>setShowBrackets(!showBrackets)} style={{background:'none',border:'none',color:'#C41E3A',fontSize:12,fontFamily:'IBM Plex Mono',cursor:'pointer',textDecoration:'underline',padding:0}}>
            {showBrackets?'Hide':'Show'} bracket breakdown
          </button>
          {showBrackets && (
            <div style={{marginTop:12,background:'#FFFFFF',border:'1px solid #E2DDD4',borderRadius:4}}>
              <table className="data-table">
                <thead><tr><th>Bracket</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Taxable Amount</th><th style={{textAlign:'right'}}>Tax</th></tr></thead>
                <tbody>
                  {brackets.map((b,i) => (
                    <tr key={i}>
                      <td style={{fontSize:12,fontFamily:'IBM Plex Mono',color:'#3D3525'}}>{b.bracket}</td>
                      <td style={{textAlign:'right',fontFamily:'IBM Plex Mono',color:'#B45309',fontSize:12}}>{b.rate}</td>
                      <td style={{textAlign:'right',fontFamily:'IBM Plex Mono',fontSize:12}}>{fmt(b.taxable_amount)}</td>
                      <td style={{textAlign:'right',fontFamily:'IBM Plex Mono',fontSize:12,color:b.tax<0?'#1B6535':'#C41E3A',fontWeight:600}}>{b.tax<0?'−':''}{fmt(Math.abs(b.tax))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Source note */}
      <div style={{background:'#F7F4EE',border:'1px solid #E2DDD4',padding:'14px 18px',borderRadius:4}}>
        <p style={{margin:'0 0 4px',fontSize:10,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.08em',textTransform:'uppercase'}}>Tax Rule Source</p>
        <p style={{margin:0,fontSize:13,color:'#3D3525',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>{tax.explanation}</p>
      </div>

      {tax.country==='US' && (
        <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',padding:'12px 16px',borderRadius:4,fontSize:12,color:'#92400E',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>
          <strong>State taxes not included.</strong> Add 0–13% depending on your state. CA: 8.84% (corp) / up to 13.3% (individuals). TX/WY/NV: 0%. NY: 6.5–10.9%.
        </div>
      )}

      <p style={{margin:0,fontSize:11,color:'#C4BAA8',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>{tax.disclaimer}</p>
    </div>
  );
}
