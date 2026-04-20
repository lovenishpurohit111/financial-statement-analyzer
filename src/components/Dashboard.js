import React, { useState } from 'react';
import SummaryCards from './SummaryCards';
import ChartsPanel from './ChartsPanel';
import InsightsPanel from './InsightsPanel';
import TaxPanel from './TaxPanel';
import BreakdownTable from './BreakdownTable';

const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,notation:'compact'}).format(n??0);

function HealthBar({score}) {
  if (score==null) return null;
  const color = score>=80?'#1B6535':score>=60?'#1E40AF':score>=40?'#B45309':'#C41E3A';
  const label = score>=80?'Excellent':score>=60?'Good':score>=40?'Fair':'Poor';
  return (
    <div style={{background:'#1A1009',color:'#F7F4EE',padding:'20px 24px',display:'flex',alignItems:'center',gap:32,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
        <span style={{fontFamily:'IBM Plex Mono',fontSize:48,fontWeight:600,color}}>{score}</span>
        <span style={{fontFamily:'IBM Plex Mono',fontSize:18,color:'#8A7F70'}}>/100</span>
      </div>
      <div style={{flex:1}}>
        <p style={{margin:'0 0 8px',fontSize:11,fontFamily:'IBM Plex Mono',letterSpacing:'0.1em',color:'#8A7F70',textTransform:'uppercase'}}>Financial Health Score</p>
        <div style={{height:6,background:'#3D3525',borderRadius:2,overflow:'hidden',maxWidth:300}}>
          <div style={{width:`${score}%`,height:'100%',background:color,borderRadius:2,transition:'width 1s ease'}}/>
        </div>
        <p style={{margin:'6px 0 0',fontFamily:'IBM Plex Display',fontSize:18,fontWeight:700,color}}>{label}</p>
      </div>
      <div style={{fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',lineHeight:2}}>
        <div>Profitability · Liquidity</div>
        <div>Leverage · Efficiency</div>
      </div>
    </div>
  );
}

function RatioTable({pl,bs}) {
  const rows=[];
  if(pl?.ratios){const r=pl.ratios;
    rows.push({label:'Gross Margin',      value:`${r.gross_margin?.toFixed(1)}%`,      bench:'>30%',  ok:r.gross_margin>=30});
    rows.push({label:'Operating Margin',  value:`${r.operating_margin?.toFixed(1)}%`,  bench:'>10%',  ok:r.operating_margin>=10});
    rows.push({label:'Net Profit Margin', value:`${r.net_profit_margin?.toFixed(1)}%`, bench:'>10%',  ok:r.net_profit_margin>=10});
    rows.push({label:'Expense Ratio',     value:`${r.expense_ratio?.toFixed(1)}%`,     bench:'<80%',  ok:r.expense_ratio<80});
    rows.push({label:'COGS Ratio',        value:`${r.cogs_ratio?.toFixed(1)}%`,        bench:'<40%',  ok:r.cogs_ratio<40});
  }
  if(bs?.ratios){const r=bs.ratios;
    if(r.current_ratio!=null)  rows.push({label:'Current Ratio',   value:`${r.current_ratio?.toFixed(2)}x`,  bench:'>1.5', ok:r.current_ratio>=1.5});
    if(r.debt_to_equity!=null) rows.push({label:'Debt-to-Equity',  value:`${r.debt_to_equity?.toFixed(2)}x`, bench:'<1.5', ok:r.debt_to_equity<=1.5});
    if(r.debt_to_assets!=null) rows.push({label:'Debt-to-Assets',  value:`${r.debt_to_assets?.toFixed(2)}x`, bench:'<0.5', ok:r.debt_to_assets<=0.5});
    if(r.equity_ratio!=null)   rows.push({label:'Equity Ratio',    value:`${r.equity_ratio?.toFixed(1)}%`,   bench:'>50%', ok:r.equity_ratio>=50});
  }
  if(!rows.length) return null;
  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderTop:'3px solid #1A1009',borderRadius:'0 0 4px 4px'}}>
      <div style={{padding:'16px 20px 12px',borderBottom:'1px solid #EDE9DF'}}>
        <h3 className="headline" style={{fontSize:16,margin:0}}>Financial Ratios</h3>
      </div>
      <table className="data-table">
        <thead><tr><th>Ratio</th><th style={{textAlign:'right'}}>Value</th><th style={{textAlign:'right'}}>Benchmark</th><th style={{textAlign:'center'}}>Status</th></tr></thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i}>
              <td style={{fontFamily:'IBM Plex Sans',fontSize:13}}>{r.label}</td>
              <td style={{textAlign:'right',fontFamily:'IBM Plex Mono',fontSize:13,fontWeight:600,color:r.ok?'#1B6535':'#C41E3A'}}>{r.value}</td>
              <td style={{textAlign:'right',fontFamily:'IBM Plex Mono',fontSize:11,color:'#8A7F70'}}>{r.bench}</td>
              <td style={{textAlign:'center',fontSize:14}}>{r.ok?'✓':'✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BSComp({comp,prev}) {
  if(!comp||!prev) return null;
  const items=[{label:'Total Assets',k:'total_assets_change'},{label:'Liabilities',k:'total_liabilities_change'},{label:'Equity',k:'equity_change'},{label:'Working Capital',k:'working_capital_change'}];
  return (
    <div style={{background:'#1A1009',color:'#F7F4EE',padding:'20px 24px'}}>
      <p className="section-label" style={{color:'#C41E3A',marginBottom:16}}>Period-over-Period Change</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:16}}>
        {items.map(it => {
          const v=comp[it.k]; if(v==null) return null;
          const c=v>=0?'#1B6535':'#C41E3A';
          return (
            <div key={it.k}>
              <p style={{margin:'0 0 4px',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.06em',textTransform:'uppercase'}}>{it.label}</p>
              <p style={{margin:0,fontFamily:'IBM Plex Mono',fontSize:22,fontWeight:600,color:c}}>{v>=0?'+':''}{v.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [{id:'overview',label:'Overview'},{id:'insights',label:'Insights'},{id:'breakdown',label:'Breakdown'},{id:'tax',label:'Tax'}];

export default function Dashboard({results,onReset}) {
  const [tab, setTab] = useState('overview');
  const pl   = results?.pl_analysis||(results?.analysis?.type==='pl'?results.analysis:null);
  const bs   = results?.bs_current ||(results?.analysis?.type==='bs'?results.analysis:null);
  const ins  = results?.insights||[];
  const tax  = results?.tax;
  const hs   = results?.health_score;
  const cf   = results?.cash_flow;
  const comp = results?.balance_sheet_comparison;
  const prev = results?.bs_previous;
  const mode = results?.mode;
  const label= mode==='full'?'Full Analysis':pl?'Profit & Loss':'Balance Sheet';
  const period=pl?.period||bs?.period||'N/A';

  return (
    <div style={{minHeight:'100vh',background:'#F7F4EE'}}>
      {/* Top bar */}
      <div style={{background:'#FFFFFF',borderBottom:'1px solid #E2DDD4',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:52,position:'sticky',top:40,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <h1 className="headline" style={{fontSize:18,margin:0}}>FinAnalyzer</h1>
          <span style={{width:1,height:20,background:'#E2DDD4'}}/>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,fontFamily:'IBM Plex Mono',background:'#FCEEF1',color:'#C41E3A',padding:'3px 8px',borderRadius:2,fontWeight:600,letterSpacing:'0.06em'}}>{label.toUpperCase()}</span>
            <span style={{fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>{period}</span>
          </div>
        </div>
        <button onClick={onReset} className="btn-outline" style={{padding:'6px 14px',fontSize:12,letterSpacing:'0.04em'}}>
          ← NEW ANALYSIS
        </button>
      </div>

      {/* Tab nav */}
      <div style={{background:'#FFFFFF',borderBottom:'1px solid #E2DDD4',padding:'0 24px',display:'flex',gap:0}}>
        {TABS.filter(t => t.id!=='tax'||!!tax).map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'12px 20px',background:'transparent',border:'none',borderBottom:tab===t.id?'3px solid #C41E3A':'3px solid transparent',color:tab===t.id?'#C41E3A':'#8A7F70',fontSize:13,fontFamily:'IBM Plex Sans',fontWeight:tab===t.id?600:400,cursor:'pointer',transition:'all 0.15s',letterSpacing:'0.02em',marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>
        {/* Summary cards — always visible */}
        <div style={{marginBottom:28}}>
          <SummaryCards results={results}/>
        </div>

        {tab==='overview' && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {hs!=null && <HealthBar score={hs}/>}
            <ChartsPanel results={results}/>
            {comp && <BSComp comp={comp} prev={prev}/>}
            <RatioTable pl={pl} bs={bs}/>
          </div>
        )}

        {tab==='insights' && (
          ins.length>0 ? <InsightsPanel insights={ins}/>
          : <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',padding:'60px 40px',textAlign:'center',borderRadius:4}}>
              <p style={{fontSize:36,marginBottom:12}}>💡</p>
              <p style={{fontWeight:600,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>No insights generated</p>
              <p style={{color:'#8A7F70',fontSize:13,marginTop:6,fontFamily:'IBM Plex Sans'}}>Run a Full Analysis (P&L + Balance Sheet) to generate comprehensive financial insights.</p>
            </div>
        )}

        {tab==='breakdown' && <BreakdownTable results={results}/>}

        {tab==='tax' && tax && <TaxPanel tax={tax}/>}
      </div>
    </div>
  );
}
