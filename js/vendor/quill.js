// ---------- The quill: handwriting with a finger, stylus or Pencil ----------
// Quill.open({count, prompt, note, onDone(result), onCancel()}) shows the writing card over the scene.
// Three levels (kept in the save as S.quillLevel):
//   1 ✏️ Trace     pick the number, watch it being written, follow the dashed path and arrows
//   2 🧠 Remember  pick the number, see how it's written, then it fades and you write it from memory
//   3 ✍️ Free      just write; if the quill isn't sure it asks, and can always show you how
// Research basis: numbered arrows plus writing from memory (Berninger et al. 1997); start point and
// direction as in the Victorian handwriting guidance. Recognition runs on the device (js/glyphs.js).
const Quill=(function(){
const LEVELS=[[1,'✏️ Trace'],[2,'🧠 Remember'],[3,'✍️ Free']];
let Q=null;           // the open card's state
let layer=null;

function level(){return (typeof S!=='undefined'&&S.quillLevel)||1;}
function setLevel(l){if(typeof S!=='undefined'){S.quillLevel=l;try{save();}catch(e){}}}

function ensureLayer(){
  if(layer)return; layer=document.createElement('div'); layer.id='quillLayer';
  layer.innerHTML=`<div id="qCard">
    <div class="qhead"><b>🪶 Write it with the quill</b><span class="qlevels"></span>
      <button class="btn ghost qx" title="Use the number pad instead">🔢 Number pad</button></div>
    <div class="qprompt"></div>
    <div class="qstep"></div>
    <div class="qmsg"></div>
  </div>`;
  document.body.appendChild(layer);
  layer.querySelector('.qx').onclick=()=>{const q=Q;close();q&&q.opts.onCancel&&q.opts.onCancel();};
}
function close(){Q=null;if(layer)layer.classList.remove('on');}
const $q=sel=>layer.querySelector(sel);
function msg(t,cls=''){const m=$q('.qmsg');m.className='qmsg '+cls;m.textContent=t||'';}

function open(opts){
  ensureLayer();
  Q={opts,count:opts.count||2,lvl:opts.level||level(),boxes:[],picked:'',tries:0,pickedOk:false};
  layer.classList.add('on');
  $q('.qprompt').innerHTML=opts.prompt||'';
  renderLevels(); msg(opts.note||'', opts.note?'warn':'');
  if(Q.lvl===3)writeStep(); else pickStep();
}
function renderLevels(){
  const box=$q('.qlevels'); box.innerHTML='';
  LEVELS.forEach(([l,label])=>{const b=document.createElement('button');b.className='qlv'+(l===Q.lvl?' on':'');b.textContent=label;
    b.onclick=()=>{if(l===Q.lvl)return;Q.lvl=l;setLevel(l);renderLevels();msg('');if(l===3)writeStep();else pickStep();};box.appendChild(b);});
}

// ----- step 1 (levels 1 and 2): which number will you write? -----
function pickStep(){
  Q.picked='';
  const st=$q('.qstep');
  st.innerHTML=`<div class="qask">Which number will you write?</div><div class="qpicked">&nbsp;</div><div class="qpad"></div>`;
  const pad=st.querySelector('.qpad');
  ['1','2','3','4','5','6','7','8','9','0','⌫','▶'].forEach(k=>{const b=document.createElement('button');b.textContent=k;
    if(k==='▶'){b.className='go';b.title='Next';}
    b.onclick=()=>{
      if(k==='⌫')Q.picked=Q.picked.slice(0,-1);
      else if(k==='▶'){
        if(!Q.picked)return;
        // the module can check the number before any writing, so nobody traces a wrong answer in vain
        if(Q.opts.checkPick){const ok=Q.opts.checkPick(Q.picked);
          if(ok!==true){msg(typeof ok==='string'?ok:'Not quite! Have another think.','warn');Q.picked='';
            st.querySelector('.qpicked').innerHTML='&nbsp;';pad.classList.remove('qnope');void pad.offsetWidth;pad.classList.add('qnope');return;}
          Q.pickedOk=true;}
        writeStep(Q.picked.split(''));
        if(Q.pickedOk)msg(`Yes, ${Q.picked} is right! Now write it with the quill. ${Q.lvl===1?'Start at the green dot!':'Watch first, then from memory!'}`,'good');
        return;}
      else if(Q.picked.length<Q.count)Q.picked+=k;
      st.querySelector('.qpicked').innerHTML=Q.picked||'&nbsp;';};
    pad.appendChild(b);});
}

// ----- step 2: the writing boxes -----
function writeStep(expected){
  const n=expected?expected.length:Q.count;
  Q.boxes=[]; const st=$q('.qstep');
  st.innerHTML=`<div class="qboxes2"></div>
    <div class="row qbtns"><button class="btn ghost qback">◀ Change number</button><button class="btn fire qdone">✔ Done</button></div>
    <div class="qquestion"></div>`;
  const wrap=st.querySelector('.qboxes2');
  for(let i=0;i<n;i++)Q.boxes.push(makeBox(wrap,expected?expected[i]:null,expected?Q.lvl:3,i));
  // free writing: start with one box; the next appears once the previous one has ink (one-digit answers stay simple)
  if(!expected)Q.boxes.forEach((b,i)=>{if(i>0)b.el.classList.add('qlater');});
  st.querySelector('.qback').style.display=expected?'':'none';
  st.querySelector('.qback').onclick=pickStep;
  st.querySelector('.qdone').onclick=done;
  if(expected)Q.boxes.forEach((b,i)=>setTimeout(()=>showGuide(b,true),i*1500));
  msg(expected?(Q.lvl===1?'Watch, then follow the dots and arrows. Start at the green dot!':'Watch how it\'s written. Then write it from memory!'):'Write your answer. Need another number? A new box appears.');
}
function makeBox(wrap,expected,mode,i){
  const el=document.createElement('div'); el.className='qcell';
  el.innerHTML=`<div class="qpaper"><svg class="qguide" viewBox="0 0 100 140"></svg><canvas></canvas></div>
    <div class="row qcellbtns"><button class="qmini qclear" title="Clear">↺</button><button class="qmini qshow">${mode===2?'👁 Peek':'▶ Show me'}</button></div>`;
  wrap.appendChild(el);
  const b={el,expected,mode,strokes:[],peeks:0,retries:0,asked:false,resolved:null,
    cv:el.querySelector('canvas'),svg:el.querySelector('.qguide')};
  el.querySelector('.qclear').onclick=()=>{b.strokes=[];b.resolved=null;redraw(b);};
  const sh=el.querySelector('.qshow'); sh.style.visibility=expected?'visible':'hidden';
  sh.onclick=()=>{if(b.mode===2)b.peeks++;showGuide(b,true);};
  requestAnimationFrame(()=>{sizeCanvas(b);redraw(b);});
  const pt=e=>{const r=b.cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*140];};
  let cur=null;
  b.cv.addEventListener('pointerdown',e=>{e.preventDefault();b.cv.setPointerCapture(e.pointerId);cur=[pt(e)];b.strokes.push(cur);b.resolved=null;
    const nx=Q&&Q.boxes[Q.boxes.indexOf(b)+1]; if(nx&&nx.el.classList.contains('qlater')){nx.el.classList.remove('qlater');nx.el.classList.add('qoptional');requestAnimationFrame(()=>{sizeCanvas(nx);redraw(nx);});}
    if(b.mode===2&&!b.faded)fade(b);redraw(b);});
  b.cv.addEventListener('pointermove',e=>{if(!cur)return;const p=pt(e),l=cur[cur.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.8){cur.push(p);redraw(b);}});
  const up=()=>{cur=null;};
  b.cv.addEventListener('pointerup',up); b.cv.addEventListener('pointercancel',up);
  return b;
}
function sizeCanvas(b){const r=b.cv.getBoundingClientRect(),d=window.devicePixelRatio||1;b.cv.width=r.width*d;b.cv.height=r.height*d;}
function redraw(b){
  const c=b.cv.getContext('2d'),w=b.cv.width,h=b.cv.height; c.clearRect(0,0,w,h);
  const sx=w/100,sy=h/140;
  c.strokeStyle='#d8cfee';c.lineWidth=1.5*sx;c.setLineDash([4*sx,4*sx]);
  [18,122].forEach(y=>{c.beginPath();c.moveTo(4*sx,y*sy);c.lineTo(96*sx,y*sy);c.stroke();});
  c.setLineDash([]);c.strokeStyle='#2a2340';c.lineWidth=6.5*sx;c.lineCap='round';c.lineJoin='round';
  b.strokes.forEach(s=>{c.beginPath();c.moveTo(s[0][0]*sx,s[0][1]*sy);
    if(s.length===1)c.lineTo(s[0][0]*sx+.1,s[0][1]*sy);s.forEach(p=>c.lineTo(p[0]*sx,p[1]*sy));c.stroke();});
}

// ----- guides: dashed path, start dot, numbered arrows, and a drawing animation -----
function guideSVG(ch,animate){
  const g=Glyphs.DIGITS[ch]; if(!g)return '';
  let s='';
  g.strokes.forEach((st,i)=>{
    const pts=st.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
    s+=`<polyline class="qdash" points="${pts}"/>`;
    [.3,.7].forEach(f=>{const k=Math.min(st.length-2,Math.floor(st.length*f)),a=st[k],c=st[k+1],
      ang=Math.atan2(c[1]-a[1],c[0]-a[0])*180/Math.PI;
      s+=`<polygon class="qarrow" points="-4,-4 5,0 -4,4" transform="translate(${a[0].toFixed(1)},${a[1].toFixed(1)}) rotate(${ang.toFixed(0)})"/>`;});
  });
  g.strokes.forEach((st,i)=>{const [x,y]=st[0];
    s+=`<circle class="qstart${i?' later':''}" cx="${x}" cy="${y}" r="6"/>`+
       (g.strokes.length>1?`<text class="qnum" x="${x+(x>70?-13:9)}" y="${y-6}">${i+1}</text>`:'');});
  if(animate){let delay=0;
    g.strokes.forEach(st=>{const len=st.reduce((d,p,k)=>k?d+Math.hypot(p[0]-st[k-1][0],p[1]-st[k-1][1]):0,0),dur=Math.max(.5,len/110);
      s+=`<polyline class="qanim" pathLength="1" style="animation-delay:${delay.toFixed(2)}s;animation-duration:${dur.toFixed(2)}s" points="${st.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`;
      delay+=dur+.25;});}
  return s;
}
function showGuide(b,animate){
  if(!b.expected||!Q)return;
  b.svg.innerHTML=guideSVG(b.expected,animate); b.svg.classList.remove('gone'); b.faded=false;
  clearTimeout(b.fadeT); clearTimeout(b.animT);
  // the orange model fades once it's drawn, so it never hides the child's own writing
  const anims=[...b.svg.querySelectorAll('.qanim')];
  if(anims.length){const last=anims[anims.length-1],end=(parseFloat(last.style.animationDelay)+parseFloat(last.style.animationDuration))*1000;
    b.animT=setTimeout(()=>anims.forEach(a=>a.classList.add('out')),end+700);}
  if(b.mode===2)b.fadeT=setTimeout(()=>fade(b),animate?3600:2400);
}
function fade(b){b.faded=true;b.svg.classList.add('gone');}

// ----- checking -----
function done(){
  if(!Q)return;
  const qq=$q('.qquestion'); qq.innerHTML='';
  if(!Q.boxes.some(b=>b.strokes.length)){msg('Write in the boxes first!','warn');return;}
  for(const b of Q.boxes){
    if(b.resolved!=null)continue;
    if(b.expected){
      if(!b.strokes.length){b.el.classList.add('qbad');setTimeout(()=>b.el.classList.remove('qbad'),600);msg(`Write the ${b.expected} in the box.`,'warn');return;}
      const c=Glyphs.recognise(b.strokes), k=c.findIndex(x=>x.ch===b.expected);
      if(k<0||k>2||c[k].d>Glyphs.LIMIT){
        b.retries++; b.strokes=[]; redraw(b); showGuide(b,true);
        b.el.classList.add('qbad');setTimeout(()=>b.el.classList.remove('qbad'),600);
        msg(`Hmm, that doesn't look like a ${b.expected} yet. Watch again, and follow the arrows!`,'warn'); return;}
      // the right number, but scribbled over or decorated? (on the guide when tracing, any size otherwise)
      if(!chaos()&&!Glyphs.tidyEnough(b.strokes,b.expected,b.mode===1).ok){
        b.retries++; b.messy=(b.messy||0)+1; b.strokes=[]; redraw(b); if(b.mode===1)showGuide(b,false);
        b.el.classList.add('qbad');setTimeout(()=>b.el.classList.remove('qbad'),600);
        msg(MESSY,'warn'); return;}
      b.resolved=b.expected; continue;
    }
    if(!b.strokes.length)continue;         // an empty free box is fine (one-digit answers)
    const c=Glyphs.recognise(b.strokes), v=Glyphs.verdict(c);
    const tidy=ch=>Glyphs.tidyEnough(b.strokes,ch,false).ok;
    if(!chaos()&&v!=='unknown'&&!tidy(c[0].ch)&&!(c[1]&&tidy(c[1].ch))){b.messy=(b.messy||0)+1;messy(b);return;}
    if(v==='sure'){b.resolved=c[0].ch;continue;}
    ask(b,v==='unsure'?[c[0].ch,c[1].ch]:[]); return;
  }
  finish();
}
const MESSY="I'm sorry, I can't read that. Could you write it more clearly?";
// Chaos crush: the player may scribble and decorate after writing; the number underneath still counts.
function chaos(){return typeof S!=='undefined'&&!!S.quillChaos;}
// Scribbles, teeth, flags… The number may be in there, but it has to be written clearly.
function messy(b){
  Q.boxes.forEach(x=>x.el.classList.toggle('qfocus',x===b));
  const qq=$q('.qquestion'); msg(MESSY,'warn');
  qq.innerHTML=`<div class="row qopts"></div>`;
  const row=qq.querySelector('.qopts');
  const add=(label,cls,fn)=>{const x=document.createElement('button');x.className='btn '+cls;x.innerHTML=label;x.onclick=fn;row.appendChild(x);};
  add('↺ Try again','',()=>{b.strokes=[];redraw(b);b.el.classList.remove('qfocus');qq.innerHTML='';msg('');});
  add('✏️ Show me how','gold',()=>showMeHow(b));
}
function ask(b,options){
  Q.boxes.forEach(x=>x.el.classList.toggle('qfocus',x===b));
  const qq=$q('.qquestion');
  qq.innerHTML=`<div>${options.length?`Is this a <b>${options[0]}</b> or a <b>${options[1]}</b>?`:'I can\'t read this one yet.'}</div><div class="row qopts"></div>`;
  const row=qq.querySelector('.qopts');
  const add=(label,cls,fn)=>{const x=document.createElement('button');x.className='btn '+cls;x.innerHTML=label;x.onclick=fn;row.appendChild(x);};
  options.forEach(o=>add(`<span class="qbig">${o}</span>`,'',()=>{b.resolved=o;b.asked=true;b.el.classList.remove('qfocus');qq.innerHTML='';done();}));
  // normal play: an unreadable box can't be talked past with "I wrote…"
  if(options.length||chaos())add(options.length?'Something else':'I wrote…','',()=>whichDidYouWrite(b));
  if(!options.length)add('↺ Try again','',()=>{b.strokes=[];redraw(b);b.el.classList.remove('qfocus');qq.innerHTML='';msg('');});
  add('✏️ Show me how','gold',()=>showMeHow(b));
}
// The quill misread it: the child says which number they wrote (logged as asked), no tracing needed.
function whichDidYouWrite(b){
  const qq=$q('.qquestion');
  qq.innerHTML=`<div>Which number did you write?</div><div class="qpad small"></div>`;
  const pad=qq.querySelector('.qpad');
  '1234567890'.split('').forEach(k=>{const x=document.createElement('button');x.textContent=k;
    x.onclick=()=>{b.resolved=k;b.asked=true;b.misread=true;b.el.classList.remove('qfocus');qq.innerHTML='';done();};
    pad.appendChild(x);});
}
// Switch one box to guided writing: which number did you mean? then trace it.
function showMeHow(b){
  const qq=$q('.qquestion');
  qq.innerHTML=`<div>Which number did you want to write?</div><div class="qpad small"></div>`;
  const pad=qq.querySelector('.qpad');
  '1234567890'.split('').forEach(k=>{const x=document.createElement('button');x.textContent=k;
    x.onclick=()=>{b.expected=k;b.mode=1;b.strokes=[];b.asked=true;redraw(b);b.el.classList.remove('qfocus');
      const sh=b.el.querySelector('.qshow');sh.style.visibility='visible';sh.textContent='▶ Show me';
      qq.innerHTML='';showGuide(b,true);msg(`Here's how to write ${k}. Start at the green dot!`);};
    pad.appendChild(x);});
}
function finish(){
  const used=Q.boxes.filter(b=>b.resolved!=null);
  const chars=used.map(b=>{const f=Glyphs.formation(b.strokes,b.resolved);
    return {ch:b.resolved,mode:b.mode,asked:b.asked,misread:!!b.misread,messy:b.messy||0,retries:b.retries,peeks:b.peeks,start:f.start,dir:f.dir};});
  const text=chars.map(c=>c.ch).join('');
  // tips only where the child saw the guide (trace/remember or "show me how"); in free writing we just record
  const off=chars.find(c=>c.mode!==3&&!c.start)||chars.find(c=>c.mode!==3&&!c.dir);
  const note=!off?'Beautiful writing! 🪶':!off.start?`Lovely! Next time, start your ${off.ch} at the green dot.`:`Lovely! Next time, try your ${off.ch} the other way round. Follow the arrows.`;
  msg(note,off?'':'good');
  $q('.qdone').disabled=true;
  const q=Q;
  setTimeout(()=>{if(Q!==q)return;close();q.opts.onDone&&q.opts.onDone({text,chars,level:q.lvl,note,formationOk:!off});},off?1700:900);
}

return {open,close,level,setLevel,isOpen:()=>!!Q};
})();
