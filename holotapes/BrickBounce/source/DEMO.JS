(function(params){
  h.clear(1);
  const W=480,T=54,BOT=308,PY=292,PH=7,BR=5,C=9,BX=42,BY=78,BW=40,BH=14,BG=5,DIR="HOLO/BRKBNCE/",BRF=DIR+"BRICKS.JS",LVF=DIR+"LEVELS.TXT",APP=DIR+"APP.JS";
  let hi=params&&params.high||0,dp=params&&params.disp!==void 0?params.disp!==0:0,IM=0,bd=[],left=0,px=199,pw=82,bx=240,by=282,bu=120,bv=-145,st=getTime(),last=st,tm=0,bop={},blink=1,bands=[],bc=0;
  function cl(v,a,b){
    return Math.max(a,Math.min(b,v));
  }function tx(n){
    return Math.min(n,999999).toString().padStart(6,0);
  }function bf(){
    try{
      bop={vsync:Pip.blitOptions.vsync,ydiff:Pip.blitOptions.ydiff,filter:Pip.blitOptions.filter,idleFilter:Pip.blitOptions.idleFilter,noScanEffect:Pip.blitOptions.noScanEffect};
      Pip.blitOptions.vsync=0;
      Pip.blitOptions.ydiff=0;
      Pip.blitOptions.filter=0;
      if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1;
    }catch(e){
    }
  }function brs(){
    try{
      bop.vsync===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bop.vsync;
      bop.ydiff===void 0?delete Pip.blitOptions.ydiff:Pip.blitOptions.ydiff=bop.ydiff;
      bop.filter===void 0?delete Pip.blitOptions.filter:Pip.blitOptions.filter=bop.filter;
      bop.idleFilter===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bop.idleFilter;
      bop.noScanEffect===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bop.noScanEffect;
    }catch(e){
    }
  }function load(){
    try{
      IM=eval(fs.readFileSync(BRF));
      let f=E.openFile(LVF,"r"),s=f.read(45)||"";
      f.close();
      for(let i=0;i<45;i++){
        let c=s[i]||0;
        bd[i]="LSEB?FTM".indexOf(c)>=0?1:+c||0;
        if(bd[i]&&bd[i]!==9)left++;
      }
    }catch(e){
    }
  }function brick(i){
    let v=bd[i];
    if(!v)return;
    let x=BX+(i%C)*(BW+BG),y=BY+((i/C)|0)*(BH+BG);
    if(IM)h.drawImage(IM[v===9?5:v===4?3:(v-1)%3],x,y);
    else h.drawRect(x,y,x+BW,y+BH);
  }function header(){
    h.setColor(3).setFontMonofonto16().setFontAlign(-1,-1).drawString("BRICK BOUNCE",32,6);
    h.setFontAlign(1,-1).drawString("SCORE 00000",282,6).drawString("HI "+tx(hi),448,6);
    h.setFontAlign(-1,-1).drawString("LIVES 3  LVL 1",32,24).drawLine(28,T-5,452,T-5);
  }function dynamic(a,b){
    h.setColor(3);
    if(PY+PH>=a&&PY<=b)h.fillRect(px|0,PY,(px+pw)|0,PY+PH);
    if(by+BR>=a&&by-BR<=b)h.fillCircle(bx|0,by|0,BR);
    if(blink&&a<=218&&b>=178)h.setFontMonofonto18().setFontAlign(0,0).drawString("DEMO",240,198);
  }function mark(a,b){
    a=cl((a|0)-4,T,319);
    b=cl((b|0)+4,T,319);
    for(let i=0;i<bc;i+=2)if(!(b<bands[i]-48||a>bands[i+1]+48)){
      if(a<bands[i])bands[i]=a;
      if(b>bands[i+1])bands[i+1]=b;
      return;
    }
    bands[bc++]=a;
    bands[bc++]=b;
  }function flip(a,b){
    Pip.blitOptions.y1=cl((a|0)-2,0,319);
    Pip.blitOptions.y2=cl((b|0)+2,0,319);
    h.flip();
    Pip.lastFlip=getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }function redraw(a,b){
    h.clearRect(0,a,479,b).setColor(1);
    if(a<=BOT){
      let q=b>BOT?BOT:b;
      h.drawLine(4,a,4,q).drawLine(475,a,475,q);
      if(a<=T)h.drawLine(4,T,475,T);
      if(b>=BOT)h.drawLine(4,BOT,475,BOT);
    }
    h.setColor(3);
    let r0=cl(((a-BY)/(BH+BG))|0,0,4),r1=cl(((b-BY)/(BH+BG))|0,0,4);
    for(let r=r0;r<=r1;r++){
      let y=BY+r*(BH+BG);
      if(b<y||a>y+BH)continue;
      for(let c=0;c<C;c++)brick(r*C+c);
    }
    dynamic(a,b);
    flip(a,b);
  }function flush(){
    if(!bc)return;
    let a=bands[0],b=bands[1];
    for(let i=2;i<bc;i+=2){
      if(bands[i]<a)a=bands[i];
      if(bands[i+1]>b)b=bands[i+1];
    }
    redraw(a,b);
    bc=0;
  }function draw(){
    h.clear(1);
    header();
    h.setColor(1).drawRect(4,T,475,BOT).setColor(3);
    for(let i=0;i<45;i++)brick(i);
    dynamic(T,BOT);
    h.flip();
    Pip.lastFlip=getTime();
  }function done(){
    rm();
    E.defrag();
    if(!global.__bbDemoBack)global.__bbDemoBack=Function("delete global.__bbDemoBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))({keepMusic:1});");
    tm=setTimeout(global.__bbDemoBack,20);
  }function hitBrick(){
    let c0=cl(((bx-BR-BX)/(BW+BG))|0,0,C-1),c1=cl(((bx+BR-BX)/(BW+BG))|0,0,C-1);
    let r0=cl(((by-BR-BY)/(BH+BG))|0,0,4),r1=cl(((by+BR-BY)/(BH+BG))|0,0,4);
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
      let i=r*C+c,v=bd[i];
      if(!v)continue;
      let x=BX+c*(BW+BG),y=BY+r*(BH+BG);
      if(bx+BR>=x&&bx-BR<=x+BW&&by+BR>=y&&by-BR<=y+BH){
        if(v!==9){
          bd[i]=0;
          left--;
        }
        bv=-bv;
        mark(y,y+BH);
        return;
      }
    }
  }function step(){
    let t=getTime(),dt=Math.min(.05,t-last);
    last=t;
    if(t-st>20||left<=5){
      done();
      return;
    }
    let nb=(t-st)%1.2<.65;
    if(nb!==blink){
      blink=nb;
      mark(178,218);
    }
    let op=px,target=cl(bx-pw/2+(bx<240?-18:18),8,W-pw-8),mv=480*dt;
    px+=cl(target-px,-mv,mv);
    if(op!==px)mark(PY,PY+PH);
    mark(by-BR,by+BR);
    bx+=bu*dt;
    by+=bv*dt;
    if(bx<BR+5){
      bx=BR+5;
      bu=Math.abs(bu);
    }else if(bx>W-BR-5){
      bx=W-BR-5;
      bu=-Math.abs(bu);
    }
    if(by<T+BR+2){
      by=T+BR+2;
      bv=Math.abs(bv);
    }
    if(bv>0&&by+BR>=PY&&bx>=px-20&&bx<=px+pw+20){
      bv=-Math.abs(bv);
      bu=(bx-(px+pw/2))*2;
      by=PY-BR-1;
    }
    if(by-BR>BOT){
      by=PY-BR-1;
      bv=-145;
      bu=bx<240?120:-120;
    }
    hitBrick();
    mark(by-BR,by+BR);
    flush();
  }function k(d){
    if(!d)done();
  }function rm(){
    if(tm)clearInterval(tm);
    tm=0;
    Pip.removeListener("knob1",k);
    Pip.removeListener("knob2",k);
    brs();
  }bf();
  load();
  draw();
  tm=setInterval(step,1);
  Pip.onExclusive("knob1",k);
  Pip.onExclusive("knob2",k);
  return{
    id:"BBDEMO",notDefault:!0,fullscreen:!0,remove:rm
  }
});
