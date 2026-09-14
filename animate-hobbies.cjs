// Rebuild with Node.js + sharp and Python 3 + Pillow:
// node animate-hobbies.cjs
// Creates original SVG frames, then encodes repository-local GIFs.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const root = __dirname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oganga-hobbies-'));
const frames = 96;
const route = [[1,0],[2,2],[4,3],[5,1],[3,0],[1,1],[2,3],[0,2],[1,0]];
for(let i=1;i<route.length;i++) {
  const d = route[i].map((v,j)=>Math.abs(v-route[i-1][j])).sort();
  if(d[0]!==1 || d[1]!==2) throw Error('Invalid knight move');
}
function wrap(body,title,sub,color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="300" viewBox="0 0 540 300"><rect width="540" height="300" rx="16" fill="#101b2c"/><path d="M24 236H516" stroke="#29384e"/>${body}<g font-family="Arial, sans-serif"><text x="28" y="267" fill="${color}" font-size="23" font-weight="700">${title}</text><text x="28" y="288" fill="#9aacc4" font-size="14">${sub}</text></g></svg>`;
}
function cube(t) {
  const theta = Math.PI/4 + 0.34*Math.sin(2*Math.PI*t);
  const project = ([x,y,z]) => {
    const dep = x*Math.sin(theta)+z*Math.cos(theta);
    return [270+67*(x*Math.cos(theta)-z*Math.sin(theta)),120+67*(-y*.87+dep*.46)+3*Math.sin(2*Math.PI*t)].map(v=>v.toFixed(2)).join(',');
  };
  let out = '<ellipse cx="270" cy="220" rx="85" ry="7" fill="#080f1b"/>';
  const faces = [
    {color:'#3b82f6',p:(u,v)=>[u,v,1]},
    {color:'#f97316',p:(u,v)=>[1,v,-u]},
    {color:'#facc15',p:(u,v)=>[u,1,-v]}
  ];
  for(const f of faces) {
    out += `<polygon points="${[[-1,-1],[1,-1],[1,1],[-1,1]].map(p=>project(f.p(...p))).join(' ')}" fill="#080e19" stroke="#080e19" stroke-width="5" stroke-linejoin="round"/>`;
    for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
      const a=-1+col*2/3+.045,b=-1+row*2/3+.045,w=2/3-.09;
      out += `<polygon points="${[[a,b],[a+w,b],[a+w,b+w],[a,b+w]].map(p=>project(f.p(...p))).join(' ')}" fill="${f.color}" stroke="#080e19" stroke-width="1.4" stroke-linejoin="round"/>`;
    }
  }
  return wrap(out,"Rubik’s cube",'A little pattern-finding after hours.','#5eead4');
}
function chess(t) {
  const size=24, x0=174, y0=24;
  let out='';
  for(let row=0;row<8;row++) for(let col=0;col<8;col++) out+=`<rect x="${x0+col*size}" y="${y0+row*size}" width="24" height="24" fill="${(row+col)%2?'#344660':'#afbed2'}"/>`;
  const pos = n=>[x0+n[0]*size+12,y0+(7-n[1])*size+12];
  const turn=t*8, index=Math.min(7,Math.floor(turn)), f=turn-index;
  const start=pos(route[index]),end=pos(route[index+1]);
  const a = f<.28 ? 0 : f>.8 ? 1 : (f-.28)/.52;
  const ease=a*a*(3-2*a);
  const [x,y]=start.map((v,j)=>v+(end[j]-v)*ease);
  out+=`<rect x="${start[0]-12}" y="${start[1]-12}" width="24" height="24" fill="#5eead4" opacity=".35"/><rect x="${end[0]-12}" y="${end[1]-12}" width="24" height="24" fill="#fbbf24" opacity=".7"/>`;
  out+=`<path d="M${start[0]} ${start[1]}H${end[0]}V${end[1]}" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="3 3" opacity=".8"/>`;
  // Original vector knight silhouette; no font or external image dependency.
  out+=`<g transform="translate(${x-10} ${y-11})" stroke="#182135" stroke-width="1" stroke-linejoin="round"><path d="M2 20H19L17 16H5Z M5 16C5 12 11 12 11 8L7 11L2 9L5 5L9 3L10 0L13 3C19 5 18 12 17 16Z" fill="#f4f1e8"/><circle cx="9" cy="6" r="1" fill="#182135" stroke="none"/></g>`;
  out+='<g fill="#8094b0" font-family="Arial, sans-serif" font-size="10">';
  for(let c=0;c<8;c++) out+=`<text x="${x0+c*24+9}" y="230">${'abcdefgh'[c]}</text>`;
  for(let r=0;r<8;r++) out+=`<text x="160" y="${y0+r*24+16}">${8-r}</text>`;
  out+='</g>';
  return wrap(out,'Chess','A knight, eight moves, and a way back.','#c4b5fd');
}
(async()=>{
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  for(const [name,draw] of [['rubiks-cube',cube],['chess',chess]]) {
    const dir=path.join(tmp,name);fs.mkdirSync(dir);
    for(let i=0;i<frames;i++) await sharp(Buffer.from(draw(i/frames))).png().toFile(path.join(dir,`${String(i).padStart(3,'0')}.png`));
    execFileSync('python',['-c',`from PIL import Image
import sys,pathlib
files=sorted(pathlib.Path(sys.argv[1]).glob('*.png'))
frames=[Image.open(f).convert('RGB') for f in files]
palette=frames[0].quantize(colors=128)
frames=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
frames[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=80,loop=0,optimize=True,disposal=2)
im=Image.open(sys.argv[2]); assert im.n_frames>1; print(sys.argv[2],im.size,im.n_frames)
`,dir,path.join(root,'assets',name+'.gif')],{stdio:'inherit'});
  }
  console.log('Frame previews:',tmp);
})().catch(e=>{console.error(e);process.exit(1)});
