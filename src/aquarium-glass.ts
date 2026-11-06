import type { Point } from './domain';

// Centres align with the three fish in aquarium-window.webp (rendered at 280,207,850,371).
export const glassStains: Point[] = [{x:37.5,y:50.5},{x:72.4,y:47},{x:55.3,y:55.2}];
const columns=18, rows=14, width=122, height=100;

// Keep a small, saved mask for each stain so wiping a strip reveals the fish behind it.
const stainCells=Array.from({length:columns*rows},(_,id)=>{
  const x=((id%columns+.5)/columns-.5)*width, y=((Math.floor(id/columns)+.5)/rows-.5)*height;
  return {x,y,id,core:(x/(width*.49))**2+(y/(height*.48))**2<1};
});
const coreCount=stainCells.filter(cell=>cell.core).length;
export function wipeGlass(mask:Set<number>,index:number,from:Point,to:Point){
  const center=glassStains[index];
  const startX=(from.x-center.x)*12.8, startY=(from.y-center.y)*7.2;
  const dx=(to.x-from.x)*12.8, dy=(to.y-from.y)*7.2;
  const lengthSquared=dx*dx+dy*dy;
  for(const cell of stainCells){
    const t=lengthSquared?Math.min(1,Math.max(0,((cell.x-startX)*dx+(cell.y-startY)*dy)/lengthSquared)):0;
    const x=cell.x-startX-dx*t,y=cell.y-startY-dy*t;
    if((x/37)**2+(y/40)**2<=1)mask.add(index*columns*rows+cell.id);
  }
}
export function clearedGlass(mask:Set<number>,index:number){
  const base=index*columns*rows;
  return stainCells.filter(cell=>cell.core&&mask.has(base+cell.id)).length/coreCount;
}

export function drawGlassStain(g:CanvasRenderingContext2D,parts:HTMLImageElement,mask:Set<number>,index:number){
  const center=glassStains[index],x=center.x*12.8-width/2,y=center.y*7.2-height/2,base=index*rows*columns;
  g.save();
  if(mask.size){
    g.beginPath();
    for(let row=0;row<rows;row++){
      let first=0;
      for(let col=0;col<=columns;col++){
        if(col<columns&&!mask.has(base+row*columns+col))continue;
        if(col>first)g.rect(x+first*width/columns,y+row*height/rows,(col-first)*width/columns+.25,height/rows+.25);
        first=col+1;
      }
    }
    g.clip();
  }
  // Cloudy glass hides the fish; the same wipe mask reveals it strip by strip.
  g.fillStyle=index===1?'#cfceb9ee':'#637047eb';
  g.beginPath();g.ellipse(x+width/2,y+height/2,width*.47,height*.43,0,0,Math.PI*2);g.fill();
  if(parts.complete&&parts.naturalWidth){
    const rowHeight=parts.naturalHeight/4;
    g.drawImage(parts,0,(index===1?3:2)*rowHeight,parts.naturalWidth,rowHeight,x,y,width,height);
  }else{
    // Keep the cleaning target visible while the illustrated algae and mineral film load.
    g.fillStyle=index===1?'#e4e1c7b0':'#526a36c4';
    for(let k=0;k<36;k++){
      const angle=k*2.4, radius=Math.sqrt(k/38);
      g.beginPath();g.ellipse(x+width*(.5+.38*radius*Math.cos(angle)),y+height*(.5+.35*radius*Math.sin(angle)),11+k%7,6+k%5,angle,0,Math.PI*2);g.fill();
    }
  }
  g.restore();
}
