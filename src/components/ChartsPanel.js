import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Legend } from 'recharts';

const fmtK = n => { if(n==null||isNaN(n)) return '$0'; const a=Math.abs(n); return a>=1e6?`${n<0?'-':''}$${(a/1e6).toFixed(1)}M`:a>=1e3?`${n<0?'-':''}$${(a/1e3).toFixed(0)}K`:`${n<0?'-':''}$${a.toFixed(0)}`; };

const PIE_COLORS = ['#C41E3A','#1E40AF','#1B6535','#B45309','#7C3AED','#0891B2','#BE123C','#1D4ED8'];

const TT = ({active,payload,label}) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'#1A1009',border:'1px solid #3D3525',borderRadius:3,padding:'10px 14px',fontFamily:'IBM Plex Sans'}}>
      {label && <p style={{color:'#8A7F70',fontSize:11,fontFamily:'IBM Plex Mono',marginBottom:6}}>{label}</p>}
      {payload.map((p,i) => (
        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:20,marginBottom:2}}>
          <span style={{color:p.color||'#C4BAA8',fontSize:12}}>{p.name}</span>
          <span style={{color:p.color||'#F7F4EE',fontSize:13,fontFamily:'IBM Plex Mono',fontWeight:600}}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function Section({title,children}) {
  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E2DDD4',borderTop:'3px solid #1A1009',padding:'20px 20px 16px',borderRadius:'0 0 4px 4px'}}>
      <h3 className="headline" style={{fontSize:16,margin:'0 0 4px'}}>{title}</h3>
      {children}
    </div>
  );
}

function RevenueExpenses({pl}) {
  if (!pl?.summary) return null;
  const s = pl.summary;
  const data = [
    {name:'Revenue',  value:s.total_revenue,    fill:'#1B6535'},
    {name:'COGS',     value:s.total_cogs,        fill:'#C41E3A'},
    {name:'Op. Exp',  value:s.total_op_expenses, fill:'#E8536A'},
    {name:'Net Profit',value:s.net_profit,       fill:s.net_profit>=0?'#1B6535':'#C41E3A'},
  ].filter(d=>d.value!==0);
  return (
    <Section title="Revenue vs Expenses">
      <p style={{margin:'0 0 16px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>P&L BREAKDOWN</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{top:4,right:4,left:-10,bottom:0}} barSize={32}>
          <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false}/>
          <XAxis dataKey="name" tick={{fill:'#8A7F70',fontSize:11,fontFamily:'IBM Plex Sans'}} axisLine={{stroke:'#E2DDD4'}} tickLine={false}/>
          <YAxis tickFormatter={fmtK} tick={{fill:'#8A7F70',fontSize:9,fontFamily:'IBM Plex Mono'}} axisLine={false} tickLine={false}/>
          <Tooltip content={<TT/>} cursor={{fill:'rgba(26,16,9,0.04)'}}/>
          <Bar dataKey="value" radius={[3,3,0,0]}>
            {data.map((d,i) => <Cell key={i} fill={d.fill}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}

function ExpensePie({pl}) {
  const items = [...(pl?.breakdown?.cogs||[]),...(pl?.breakdown?.operating_expenses||[])].filter(d=>d.value>0).slice(0,8);
  if (!items.length) return null;
  return (
    <Section title="Expense Breakdown">
      <p style={{margin:'0 0 16px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>BY CATEGORY</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={items} cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={2} dataKey="value"
            label={({percent}) => percent>0.07?`${(percent*100).toFixed(0)}%`:''} labelLine={false}>
            {items.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} strokeWidth={0}/>)}
          </Pie>
          <Tooltip content={<TT/>}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px',marginTop:8}}>
        {items.slice(0,6).map((d,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
            <div style={{width:8,height:8,borderRadius:2,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}}/>
            <span style={{color:'#3D3525',fontFamily:'IBM Plex Sans',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.label}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function BSStructure({bs}) {
  if (!bs?.summary) return null;
  const s = bs.summary;
  const data = [{name:'Cur. Assets',value:s.current_assets,fill:'#1B6535'},{name:'Fixed',value:s.fixed_assets,fill:'#2D9150'},{name:'Other Assets',value:s.other_assets,fill:'#4ADE80'},{name:'Cur. Liab',value:s.current_liabilities,fill:'#C41E3A'},{name:'LT Liab',value:s.long_term_liabilities,fill:'#E8536A'},{name:'Equity',value:s.equity,fill:'#1E40AF'}].filter(d=>d.value>0);
  return (
    <Section title="Balance Sheet Structure">
      <p style={{margin:'0 0 16px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>ASSETS · LIABILITIES · EQUITY</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{top:4,right:4,left:-10,bottom:0}} barSize={28}>
          <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false}/>
          <XAxis dataKey="name" tick={{fill:'#8A7F70',fontSize:9,fontFamily:'IBM Plex Sans'}} axisLine={{stroke:'#E2DDD4'}} tickLine={false}/>
          <YAxis tickFormatter={fmtK} tick={{fill:'#8A7F70',fontSize:9,fontFamily:'IBM Plex Mono'}} axisLine={false} tickLine={false}/>
          <Tooltip content={<TT/>} cursor={{fill:'rgba(26,16,9,0.04)'}}/>
          <Bar dataKey="value" radius={[3,3,0,0]}>{data.map((d,i)=><Cell key={i} fill={d.fill}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}

function RatioPanel({pl,bs}) {
  const data = [];
  if (pl?.ratios) {
    const r = pl.ratios;
    data.push({metric:'Net Margin',    value:Math.max(0,r.net_profit_margin??0),  max:30,  unit:'%', goodAbove:10});
    data.push({metric:'Gross Margin',  value:Math.max(0,r.gross_margin??0),       max:80,  unit:'%', goodAbove:30});
    data.push({metric:'Expense Ratio', value:Math.max(0,r.expense_ratio??0),      max:100, unit:'%', goodBelow:80});
  }
  if (bs?.ratios) {
    const r = bs.ratios;
    if (r.current_ratio!=null) data.push({metric:'Current Ratio',   value:r.current_ratio,  max:4, unit:'x', goodAbove:1.5});
    if (r.debt_to_equity!=null) data.push({metric:'Debt-to-Equity', value:r.debt_to_equity, max:4, unit:'x', goodBelow:1.5});
  }
  if (!data.length) return null;
  return (
    <Section title="Key Ratios">
      <p style={{margin:'0 0 16px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>PERFORMANCE INDICATORS</p>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {data.map((d,i) => {
          const pct = Math.min((d.value/d.max)*100, 100);
          const isGood = d.goodAbove!=null ? d.value>=d.goodAbove : d.goodBelow!=null ? d.value<=d.goodBelow : true;
          const color = isGood ? '#1B6535' : '#C41E3A';
          return (
            <div key={i}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:12,color:'#3D3525',fontFamily:'IBM Plex Sans'}}>{d.metric}</span>
                <span style={{fontSize:12,fontFamily:'IBM Plex Mono',fontWeight:600,color}}>{d.value.toFixed(1)}{d.unit}</span>
              </div>
              <div style={{height:5,background:'#EDE9DF',borderRadius:2,overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:2,transition:'width 0.8s ease'}}/>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function CashFlowChart({cf}) {
  if (!cf) return null;
  const data = [{name:'Operating',value:cf.operating},{name:'Investing',value:cf.investing},{name:'Net CF',value:cf.net_cash_flow}].filter(d=>d.value!=null);
  return (
    <Section title="Cash Flow Estimate">
      <p style={{margin:'0 0 4px',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>INDIRECT METHOD · APPROXIMATED</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{top:4,right:4,left:-10,bottom:0}} barSize={40}>
          <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false}/>
          <XAxis dataKey="name" tick={{fill:'#8A7F70',fontSize:11}} axisLine={{stroke:'#E2DDD4'}} tickLine={false}/>
          <YAxis tickFormatter={fmtK} tick={{fill:'#8A7F70',fontSize:9,fontFamily:'IBM Plex Mono'}} axisLine={false} tickLine={false}/>
          <Tooltip content={<TT/>} cursor={{fill:'rgba(26,16,9,0.04)'}}/>
          <Bar dataKey="value" radius={[3,3,0,0]}>{data.map((d,i)=><Cell key={i} fill={d.value>=0?'#1B6535':'#C41E3A'}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{margin:'8px 0 0',fontSize:11,color:'#C4BAA8',fontFamily:'IBM Plex Sans'}}>{cf.notes}</p>
    </Section>
  );
}

export default function ChartsPanel({results}) {
  const pl = results?.pl_analysis||(results?.analysis?.type==='pl'?results.analysis:null);
  const bs = results?.bs_current ||(results?.analysis?.type==='bs'?results.analysis:null);
  const cf = results?.cash_flow;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {pl?.type==='pl' && <RevenueExpenses pl={pl}/>}
      {pl?.type==='pl' && <ExpensePie pl={pl}/>}
      {bs?.type==='bs' && <BSStructure bs={bs}/>}
      {cf && <CashFlowChart cf={cf}/>}
      <RatioPanel pl={pl?.type==='pl'?pl:null} bs={bs?.type==='bs'?bs:null}/>
    </div>
  );
}
