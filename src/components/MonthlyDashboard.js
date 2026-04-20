import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from 'recharts';

const fmtK = n => { if(n==null||isNaN(n)) return '$0'; const a=Math.abs(n); return `${n<0?'-':''}$${a>=1e6?(a/1e6).toFixed(1)+'M':a>=1e3?(a/1e3).toFixed(0)+'K':a.toFixed(0)}`; };
const fmt  = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);

const TT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'#1A1009',border:'1px solid #3D3525',borderRadius:3,padding:'10px 14px',fontFamily:'IBM Plex Sans'}}>
      {label&&<p style={{color:'#8A7F70',fontSize:11,fontFamily:'IBM Plex Mono',marginBottom:6}}>{label}</p>}
      {payload.map((p,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:20,marginBottom:2}}>
          <span style={{color:p.color||'#C4BAA8',fontSize:12}}>{p.name}</span>
          <span style={{color:p.color||'#F7F4EE',fontSize:13,fontFamily:'IBM Plex Mono',fontWeight:600}}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function AnomalyCard({anomaly}) {
  const isHigh = anomaly.severity==='high';
  const border = isHigh?'#C41E3A':'#B45309';
  const bg     = isHigh?'#FCEEF1':'#FEF3C7';
  const color  = isHigh?'#C41E3A':'#B45309';
  return (
    <div style={{background:bg,borderLeft:`3px solid ${border}`,padding:'14px 18px',borderRadius:'0 4px 4px 0',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <span style={{fontSize:10,fontFamily:'IBM Plex Mono',background:isHigh?'#FECDD3':'#FDE68A',color,padding:'2px 8px',borderRadius:2,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>{anomaly.severity}</span>
            <span style={{fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>{anomaly.metric} · {anomaly.month}</span>
          </div>
          <p style={{margin:'0 0 6px',fontWeight:600,fontSize:13,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>{anomaly.message}</p>
          <div style={{display:'flex',gap:16,fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70'}}>
            <span style={{color}}>Z-score: {anomaly.z_score}</span>
            <span>Avg: {fmt(anomaly.average)}</span>
            <span>{anomaly.pct_from_avg}% {anomaly.direction==='spike'?'above':'below'} avg</span>
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <p style={{margin:'0 0 2px',fontSize:10,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>VALUE</p>
          <p style={{margin:0,fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:18,color}}>{fmt(anomaly.value)}</p>
        </div>
      </div>
    </div>
  );
}

function PredictionCard({prediction}) {
  if(!prediction||prediction.predicted==null) return (
    <div style={{background:'#F7F4EE',border:'1px solid #C4BAA8',padding:'20px',borderRadius:4,textAlign:'center'}}>
      <p style={{color:'#8A7F70',fontFamily:'IBM Plex Sans',fontSize:13}}>{prediction?.message||'Insufficient data for prediction (need ≥3 months).'}</p>
    </div>
  );
  const range = prediction.confidence_high - prediction.confidence_low;
  const isPos = prediction.predicted >= 0;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Hero */}
      <div style={{background:'#1A1009',color:'#F7F4EE',padding:'28px',display:'grid',gridTemplateColumns:'auto 1fr',gap:40,alignItems:'center'}}>
        <div>
          <p style={{margin:'0 0 6px',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.1em',textTransform:'uppercase'}}>Predicted Profit — {prediction.next_period_label}</p>
          <p style={{margin:0,fontFamily:'IBM Plex Mono',fontSize:48,fontWeight:600,color:isPos?'#4ADE80':'#F87171',lineHeight:1}}>{fmt(prediction.predicted)}</p>
        </div>
        <div>
          <p style={{margin:'0 0 8px',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',textTransform:'uppercase',letterSpacing:'0.08em'}}>95% Confidence Interval</p>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontFamily:'IBM Plex Mono',fontSize:13,color:'#C4BAA8'}}>{fmt(prediction.confidence_low)}</span>
            <div style={{flex:1,height:6,background:'#3D3525',borderRadius:2,overflow:'hidden'}}>
              <div style={{width:'100%',height:'100%',background:'#4ADE80',opacity:0.6}}/>
            </div>
            <span style={{fontFamily:'IBM Plex Mono',fontSize:13,color:'#C4BAA8'}}>{fmt(prediction.confidence_high)}</span>
          </div>
          <p style={{margin:'6px 0 0',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>±{fmt(range/2)} range · {prediction.months_used} months of data</p>
        </div>
      </div>

      {/* Model weights */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[{label:'Linear Regression',v:prediction.linear_prediction,pct:'50%',color:'#1B6535'},{label:'3-Month MA',v:prediction.ma3_prediction,pct:'30%',color:'#1E40AF'},{label:'6-Month MA',v:prediction.ma6_prediction,pct:'20%',color:'#B45309'}].map((m,i)=>(
          <div key={i} style={{background:'#FFFFFF',border:'1px solid #E2DDD4',padding:'14px 16px',borderRadius:4}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:10,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.06em',textTransform:'uppercase'}}>{m.pct} weight</span>
              <div style={{width:8,height:8,borderRadius:2,background:m.color}}/>
            </div>
            <p style={{margin:'0 0 4px',fontSize:11,color:'#3D3525',fontFamily:'IBM Plex Sans'}}>{m.label}</p>
            <p style={{margin:0,fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:15,color:m.color}}>{fmt(m.v)}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div style={{background:'#F7F4EE',border:'1px solid #E2DDD4',padding:'14px 18px',display:'flex',alignItems:'center',gap:12,borderRadius:4}}>
        <span style={{fontSize:24}}>{prediction.trend_slope>=0?'↗':'↘'}</span>
        <div>
          <p style={{margin:0,fontWeight:600,fontSize:13,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>Trend Analysis</p>
          <p style={{margin:'2px 0 0',fontSize:12,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>{prediction.trend_description}</p>
        </div>
      </div>
      <p style={{margin:0,fontSize:11,color:'#C4BAA8',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>⚠ Prediction based on historical data only. Seasonality and external factors are not modelled.</p>
    </div>
  );
}

export default function MonthlyDashboard({data}) {
  const [tab, setTab] = useState('overview');
  if (!data) return null;
  const {months,revenue,expenses,profit,summary,anomalies,prediction,period} = data;

  const chartData = months.map((m,i)=>({
    month: m.replace(/\s+\d{4}$/,''),
    revenue:  revenue[i]||0,
    expenses: expenses[i]||0,
    profit:   profit[i]||0,
  })).filter(d=>d.revenue>0||d.expenses>0);

  const chartWithPred = prediction?.predicted!=null ? [...chartData,{
    month: prediction.next_period_label?.split(' ')[0]||'Next',
    revenue:null,expenses:null,profit:null,predicted:prediction.predicted,
  }] : chartData;

  const aCount   = anomalies?.length||0;
  const critical = anomalies?.filter(a=>a.severity==='high').length||0;
  const TABS = [{id:'overview',label:'Overview'},{id:'anomalies',label:`Anomalies${aCount?` (${aCount})`:''}`,},{id:'prediction',label:'Forecast'}];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
        {[{l:'Total Revenue',v:fmt(summary.total_revenue),c:'#1B6535'},{l:'Total Expenses',v:fmt(summary.total_expenses),c:'#C41E3A'},{l:'Total Profit',v:fmt(summary.total_profit),c:summary.total_profit>=0?'#1E40AF':'#C41E3A'},{l:'Profit Margin',v:`${summary.profit_margin?.toFixed(1)}%`,c:summary.profit_margin>=15?'#1B6535':summary.profit_margin>=5?'#B45309':'#C41E3A'}].map((k,i)=>(
          <div key={i} style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderTop:`3px solid ${k.c}`,padding:'14px 16px',borderRadius:'0 0 4px 4px'}}>
            <p style={{margin:'0 0 6px',fontSize:10,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.08em',textTransform:'uppercase'}}>{k.l}</p>
            <p style={{margin:0,fontFamily:'IBM Plex Mono',fontWeight:600,fontSize:17,color:k.c}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderRadius:4}}>
        <div style={{display:'flex',borderBottom:'1px solid #E2DDD4'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'11px 20px',background:'transparent',border:'none',borderBottom:tab===t.id?'3px solid #C41E3A':'3px solid transparent',color:tab===t.id?'#C41E3A':'#8A7F70',fontSize:13,fontFamily:'IBM Plex Sans',fontWeight:tab===t.id?600:400,cursor:'pointer',marginBottom:-1,letterSpacing:'0.02em'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:20}}>
          {tab==='overview' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <div>
                <p style={{margin:'0 0 14px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono',letterSpacing:'0.08em',textTransform:'uppercase'}}>Revenue · Expenses · Profit over time</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartWithPred} margin={{top:4,right:8,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:'#8A7F70',fontSize:10,fontFamily:'IBM Plex Mono'}} axisLine={{stroke:'#E2DDD4'}} tickLine={false}/>
                    <YAxis tickFormatter={fmtK} tick={{fill:'#8A7F70',fontSize:9,fontFamily:'IBM Plex Mono'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>}/>
                    <ReferenceLine y={0} stroke="#C4BAA8" strokeDasharray="3 3"/>
                    <Legend wrapperStyle={{paddingTop:12,fontSize:12,fontFamily:'IBM Plex Sans'}}/>
                    <Line type="monotone" dataKey="revenue"   name="Revenue"   stroke="#1B6535" strokeWidth={2} dot={{r:3,fill:'#1B6535',strokeWidth:0}} activeDot={{r:5}}/>
                    <Line type="monotone" dataKey="expenses"  name="Expenses"  stroke="#C41E3A" strokeWidth={2} dot={{r:3,fill:'#C41E3A',strokeWidth:0}} activeDot={{r:5}}/>
                    <Line type="monotone" dataKey="profit"    name="Profit"    stroke="#1E40AF" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#1E40AF',strokeWidth:0}} activeDot={{r:5}}/>
                    {prediction?.predicted!=null && <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#B45309" strokeWidth={2} strokeDasharray="4 4" dot={{r:5,fill:'#B45309',stroke:'#FFF',strokeWidth:2}} activeDot={{r:7}}/>}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{background:'#EAF6EE',border:'1px solid #1B6535',padding:'14px 16px',borderRadius:4}}>
                  <p style={{margin:'0 0 4px',fontSize:10,fontFamily:'IBM Plex Mono',color:'#2D9150',letterSpacing:'0.08em',textTransform:'uppercase'}}>Best Month</p>
                  <p style={{margin:0,fontFamily:'IBM Plex Display',fontWeight:700,fontSize:20,color:'#1B6535'}}>{summary.best_month}</p>
                </div>
                <div style={{background:'#FCEEF1',border:'1px solid #C41E3A',padding:'14px 16px',borderRadius:4}}>
                  <p style={{margin:'0 0 4px',fontSize:10,fontFamily:'IBM Plex Mono',color:'#E8536A',letterSpacing:'0.08em',textTransform:'uppercase'}}>Lowest Month</p>
                  <p style={{margin:0,fontFamily:'IBM Plex Display',fontWeight:700,fontSize:20,color:'#C41E3A'}}>{summary.worst_month}</p>
                </div>
              </div>
            </div>
          )}

          {tab==='anomalies' && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <p style={{margin:'0 0 2px',fontWeight:600,fontSize:14,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>Anomaly Detection</p>
                  <p style={{margin:0,fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>Z-score analysis · threshold 1.8σ · {data.active_months} months analyzed</p>
                </div>
                <div style={{display:'flex',gap:6}}>
                  {critical>0&&<span style={{fontSize:11,fontFamily:'IBM Plex Mono',background:'#FECDD3',color:'#C41E3A',padding:'3px 10px',borderRadius:2,fontWeight:700}}>{critical} HIGH</span>}
                  {(aCount-critical)>0&&<span style={{fontSize:11,fontFamily:'IBM Plex Mono',background:'#FDE68A',color:'#B45309',padding:'3px 10px',borderRadius:2,fontWeight:700}}>{aCount-critical} MEDIUM</span>}
                </div>
              </div>
              {aCount===0 ? (
                <div style={{background:'#EAF6EE',border:'1px solid #1B6535',padding:'32px',textAlign:'center',borderRadius:4}}>
                  <p style={{fontSize:32,margin:'0 0 10px'}}>✓</p>
                  <p style={{fontWeight:600,color:'#1B6535',fontFamily:'IBM Plex Sans',margin:'0 0 4px'}}>No anomalies detected</p>
                  <p style={{color:'#2D9150',fontSize:13,margin:0,fontFamily:'IBM Plex Sans'}}>All values are within normal statistical ranges.</p>
                </div>
              ) : (
                anomalies.map((a,i)=><AnomalyCard key={i} anomaly={a}/>)
              )}
              <div style={{marginTop:16,background:'#EFF6FF',border:'1px solid #1E40AF',padding:'12px 16px',borderRadius:4,fontSize:12,color:'#1E40AF',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>
                <strong>Methodology:</strong> Z-score measures standard deviations from historical mean. Z &gt; 2.5 = High, Z &gt; 1.8 = Medium. Both spikes (unusually high) and drops (unusually low) are flagged.
              </div>
            </div>
          )}

          {tab==='prediction' && <PredictionCard prediction={prediction}/>}
        </div>
      </div>
    </div>
  );
}
