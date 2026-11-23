// ---------- Glyphs: how each character is formed, and a recogniser for handwriting ----------
// Shapes live in a 100 × 140 box (x right, y down). Each glyph is a list of strokes in the order
// and direction they are taught (Victorian Modern Cursive-style foundation shapes; check against an
// official chart). The same paths draw the guides, animate the model, and serve as recognition templates.
// Recognition: a $P point-cloud recogniser (Vatavu, Anthony & Wobbrock 2012), written from the paper.
(function(root){
const rad=d=>d*Math.PI/180;
function L(x1,y1,x2,y2,n=14){const p=[];for(let i=0;i<=n;i++)p.push([x1+(x2-x1)*i/n,y1+(y2-y1)*i/n]);return p;}
// arc: angles in degrees, 0 = right, increasing = clockwise on screen
function A(cx,cy,rx,ry,a0,a1,n){n=n||Math.max(8,Math.round(Math.abs(a1-a0)/8));const p=[];
  for(let i=0;i<=n;i++){const a=rad(a0+(a1-a0)*i/n);p.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);}return p;}
const J=(...parts)=>parts.reduce((acc,p)=>acc.concat(acc.length?p.slice(1):p),[]);   // join pieces into one stroke

// Taught shapes: these get the guides. Variants only help recognition.
const DIGITS={
  '0':{strokes:[A(50,70,27,52,-90,-445)],say:'Start at the top and go round the other way, back to the top.'},
  '1':{strokes:[L(50,18,50,122)],say:'Start at the top and go straight down.'},
  '2':{strokes:[J(A(50,46,26,27,200,400),L(50+26*Math.cos(rad(40)),46+27*Math.sin(rad(40)),22,122),L(22,122,80,122))],
       say:'Start on the left, curve over the top, slide down, and go along the bottom.'},
  '3':{strokes:[J(A(48,43,25,25,205,470),A(48,95,28,28,250,510))],say:'Curve round to the middle, then round again to the bottom.'},
  '4':{strokes:[J(L(45,18,25,88),L(25,88,82,88)),L(66,45,66,122)],say:'Down and across. Lift. Then a long line down.'},
  '5':{strokes:[J(L(32,18,29,70),A(50,92,28,32,222,515)),L(32,18,76,18)],say:'Down, round the tummy. Lift. Then the flag at the top.'},
  '6':{strokes:[J(A(56,78,30,58,-65,-200),A(52,100,24,22,160,-180))],say:'Start at the top, curve down, and round into a circle.'},
  '7':{strokes:[J(L(22,18,80,18),L(80,18,40,122))],say:'Across the top, then a long slide down.'},
  // a smooth figure of eight: from the top, round the top loop to the left, through the middle,
  // round the bottom loop, and back up through the middle to close (no straight lines)
  '8':{strokes:[Array.from({length:61},(_,i)=>{const t=-.2+i/60*(2*Math.PI+.15);return [50-26*Math.sin(2*t),70-52*Math.cos(t)];})],
       say:'Start at the top, curve like an s, and go back up to close it.'},
  '9':{strokes:[J(A(50,46,24,26,-20,-380),L(50+24*Math.cos(rad(-20)),46+26*Math.sin(rad(-20)),70,122))],say:'Round the other way like a c and close it, then straight down.'}
};
const VARIANTS={
  '1':[[J(L(32,40,50,18),L(50,18,50,122))]],
  '4':[[J(L(60,18,22,88),L(22,88,82,88)),L(60,18,60,122)]],
  '5':[[J(L(76,18,32,18),L(32,18,29,70),A(50,92,28,32,222,515))]],
  '7':[[J(L(22,18,80,18),L(80,18,40,122)),L(38,70,72,70)]],
  '9':[[A(50,46,24,26,-20,-380),A(28,60,45,62,0,80)],[A(50,46,24,26,-20,-380),L(73,40,70,122)]],
  '0':[[A(50,70,27,52,-90,270)]]
};

// ----- $P point-cloud recogniser -----
const N=32;
function flat(strokes){const pts=[];strokes.forEach((s,id)=>s.forEach(([x,y])=>pts.push({x,y,id})));return pts;}
function pathLen(p){let d=0;for(let i=1;i<p.length;i++)if(p[i].id===p[i-1].id)d+=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);return d;}
function resample(pts,n){
  const I=pathLen(pts)/(n-1); if(!(I>0))return Array.from({length:n},()=>({...pts[0]}));
  let D=0; const out=[{...pts[0]}]; pts=pts.map(p=>({...p}));
  for(let i=1;i<pts.length;i++){
    if(pts[i].id!==pts[i-1].id)continue;
    const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
    if(D+d>=I&&d>0){const t=(I-D)/d,q={x:pts[i-1].x+t*(pts[i].x-pts[i-1].x),y:pts[i-1].y+t*(pts[i].y-pts[i-1].y),id:pts[i].id};
      out.push(q);pts.splice(i,0,q);D=0;}
    else D+=d;
  }
  while(out.length<n)out.push({...pts[pts.length-1]});
  return out.slice(0,n);
}
function normalise(pts){
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;pts.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
  const s=Math.max(maxX-minX,maxY-minY)||1; let cx=0,cy=0;
  const q=pts.map(p=>({x:(p.x-minX)/s,y:(p.y-minY)/s,id:p.id})); q.forEach(p=>{cx+=p.x;cy+=p.y;}); cx/=q.length;cy/=q.length;
  return q.map(p=>({x:p.x-cx,y:p.y-cy,id:p.id}));
}
function cloudDist(a,b,start){
  const n=a.length,matched=new Array(n).fill(false);let sum=0,i=start;
  do{let min=1e9,idx=-1;for(let j=0;j<n;j++)if(!matched[j]){const d=(a[i].x-b[j].x)**2+(a[i].y-b[j].y)**2;if(d<min){min=d;idx=j;}}
    matched[idx]=true; sum+=(1-((i-start+n)%n)/n)*Math.sqrt(min); i=(i+1)%n;}while(i!==start);
  return sum;
}
function match(a,b){const step=Math.floor(Math.pow(a.length,.5));let min=1e9;
  for(let i=0;i<a.length;i+=step)min=Math.min(min,cloudDist(a,b,i),cloudDist(b,a,i));return min;}
const prep=strokes=>normalise(resample(flat(strokes),N));

// Templates: taught shape + variants, each also a little narrower and wider (kids' shapes vary a lot).
const TEMPLATES=[];
function addTemplates(set){for(const ch in set){const forms=[set[ch].strokes,...(VARIANTS[ch]||[])];
  forms.forEach(f=>[.75,1,1.3].forEach(sx=>TEMPLATES.push({ch,pts:prep(f.map(s=>s.map(([x,y])=>[50+(x-50)*sx,y])))})));}}
addTemplates(DIGITS);

// Recognise strokes (box coordinates). Returns candidates best first: [{ch,d}], one per character.
function recognise(strokes,allowed){
  const pts=strokes.filter(s=>s.length).map(s=>s.length===1?[s[0],[s[0][0]+.5,s[0][1]+.5]]:s);
  if(!pts.length)return [];
  const c=prep(pts), best={};
  for(const t of TEMPLATES){if(allowed&&!allowed.includes(t.ch))continue;const d=match(c,t.pts);if(best[t.ch]==null||d<best[t.ch])best[t.ch]=d;}
  return Object.entries(best).map(([ch,d])=>({ch,d})).sort((a,b)=>a.d-b.d);
}
// How sure are we? 'sure' | 'unsure' (ask which) | 'unknown' (doesn't look like anything)
// Tuned on wobbly synthetic digits (tests/quill_accuracy.js); retune with real children's samples.
const LIMIT=1.9, RATIO=.8;
function verdict(c){if(!c.length||c[0].d>LIMIT)return 'unknown'; if(c[1]&&c[0].d/c[1].d>RATIO)return 'unsure'; return 'sure';}

// Formation: did the first stroke start near the taught start point and set off in the right direction?
function formation(strokes,ch){
  const g=DIGITS[ch]; if(!g||!strokes.length||strokes[0].length<3)return {start:true,dir:true};
  const s=strokes[0], m=g.strokes[0];
  const start=Math.hypot(s[0][0]-m[0][0],s[0][1]-m[0][1])<34;
  const k=Math.max(2,Math.floor(s.length*.2)), km=Math.max(2,Math.floor(m.length*.15));
  const a1=Math.atan2(s[k][1]-s[0][1],s[k][0]-s[0][0]), a2=Math.atan2(m[km][1]-m[0][1],m[km][0]-m[0][0]);
  let da=Math.abs(a1-a2)*180/Math.PI; if(da>180)da=360-da;
  return {start,dir:da<75};
}

const Glyphs={DIGITS,VARIANTS,recognise,verdict,formation,LIMIT,RATIO};
root.Glyphs=Glyphs;
if(typeof module!=='undefined')module.exports=Glyphs;
})(typeof window!=='undefined'?window:globalThis);
