(function(params){
  const NX="HOLO/BRKBNCE/NAME.JS",AP="HOLO/BRKBNCE/APP.JS",CU="HOLO/BRKBNCE/CUSTOM.JS";
  let iv=0,to=0,t0=getTime(),sc=params&&params.score||0,base=params&&params.base!==void 0?params.base:sc,lbo=params&&params.lbo||0,cbo=params&&params.cbo||0,df=params&&params.diff!==void 0?params.diff:1,dp=params&&params.disp!==void 0?params.disp!==0:0,um=params&&params.msg||0,sec=params&&params.sec||0,bc=params&&params.bonus?1:0,custom=params&&params.custom?1:0;
  function tx(n){
    return Math.min(n,999999).toString().padStart(6,0);
  }function ol(s,x,y){
    h.setColor(0);
    for(let a=-1;
    a<2;
    a++)for(let b=-1;
    b<2;
    b++)if(a||b)h.drawString(s,x+a,y+b);
    h.setColor(3).drawString(s,x,y);
  }function sp(x,y,s){
    h.drawLine(x,y-s,x,y+s).drawLine(x-s,y,x+s,y).drawLine(x-s+2,y-s+2,x+s-2,y+s-2).drawLine(x-s+2,y+s-2,x+s-2,y-s+2);
  }function cs(a){
    let s="";
    for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);
    return s;
  }function wt(){
    return um===1?"HARD MODE UNLOCKED!":um===2?"INSANE MODE UNLOCKED!":sec?cs([83,69,67,82,69,84,58]):"";
  }function dn(){
    return df===0?"EASY":df===2?"HARD":df===3?"INSANE":"NORMAL";
  }function bf(){
    try{
      let b=global.__bbBo;
      if(!b)b=global.__bbBo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};
      Pip.blitOptions.vsync=1;
      if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1;
      else b.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=b.i,b.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=b.n
    }catch(e){
    }
  }function ff(a,b){
    Pip.blitOptions.y1=a;
    Pip.blitOptions.y2=b;
    h.flip();
    Pip.lastFlip=getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }function bg(){
    h.clear(1).setColor(3);
    h.setFontMonofonto28().setFontAlign(0,0);
    ol("CONGRATULATIONS!",240,38);
    h.setFontMonofonto18().drawString(custom?"YOU BEAT CUSTOM LEVELS":"YOU BEAT BRICK BOUNCE",240,72);
    h.setFontMonofonto23().drawString(dn()+" MODE",240,100);
    if(!custom)h.setFontMonofonto14().drawString("LEVEL SCORE  "+tx(base),240,122).drawString("LIVES BONUS  "+tx(lbo),240,140).drawString("CONTINUE BONUS  "+tx(cbo),240,158);
    let w=wt();
    let y=258;
    if(w)h.setFontMonofonto18().drawString(w,240,y),y+=16;
    h.setFontMonofonto14();
    if(bc)h.drawString("NEW BONUS CONTENT UNLOCKED!",240,y),y+=14;
    if(sec)h.drawString(cs([65,66,79,85,84,32,62,32,85,80,32,85,80,32,68,79,87,78,32,68,79,87,78]),240,y),y+=14,h.drawString(cs([76,69,70,84,32,82,73,71,72,84,32,76,69,70,84,32,82,73,71,72,84,32,62,32,75,78,79,66]),240,y);
    h.drawString("PRESS KNOB TO CONTINUE",240,306);
    h.flip();
    Pip.lastFlip=getTime();
  }function dr(){
    let p=((getTime()-t0)*30)|0;
    h.setColor(0).fillRect(76,168,404,246).setColor(3).drawRect(76,168,404,246).drawRect(80,172,400,242);
    for(let i=0;
    i<10;
    i++){
      let q=p*2+i*37;
       sp(92+((i*83+((q/70)|0)*47)%296),178+(q%60),2+((q+i)&3));
    }h.setFontMonofonto18().setFontAlign(0,0).drawString("FINAL SCORE",240,194);
    h.setFontMonofonto28();
    ol(tx(sc),240,222);
    ff(166,248);
  }function rm(){
    if(iv)clearInterval(iv);
    if(to)clearTimeout(to);
    iv=to=0;
    Pip.removeListener("knob1",k);
  }function go(){
    rm();
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    to=setTimeout(function(){
      to=0;
      try{
        Pip.audioStop()
      }catch(e){
      }Pip.remove();
      E.defrag();
      Pip.CURRENT=custom?eval(fs.readFileSync(CU))({returned:1}):params&&params.preview?eval(fs.readFileSync(AP))({
        view:"main"
      }):eval(fs.readFileSync(NX))(params);
    },160);
  }function k(d){
    if(!d)go();
  }bf();
  bg();
  dr();
  iv=setInterval(dr,33);
  Pip.onExclusive("knob1",k);
  return{
    id:"BRKBNCEWIN",notDefault:!0,fullscreen:!0,remove:rm
  };
})
