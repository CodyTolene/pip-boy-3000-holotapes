(function(params){
  h.clear(1);
  let players=params&&params.players||1,diff=params&&params.diff||1,so=!params||params.sound!==0,mo=params&&params.music!==0,vol=params&&params.vol!==void 0?params.vol:70,dp=params&&params.disp!==void 0?params.disp!==0:0;
  let st=0,sel=0,tm=0,mt=0,last=getTime(),ly=130,ry=130,lty=130,rty=130,bx=240,by=160,bvx=170,bvy=70,ls=0,rs=0,er=0,ht=0,bo={},db=0;
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS",PH=58,BOT=300,PMAX=232,BBOT=295,AO={encoding:"adpcm",sampleRate:8000,blockAlign:256,overlap:!0};
  let SN=0;
  function cl(v,a,b){
    return Math.max(a,Math.min(b,v));
  }function av(){
    try{
      let v=Math.round(vol*27/100);
      if(global.__bbVol!==v){
      Pip.setVol(v);
      global.__bbVol=v
      }
    }catch(e){
    }
  }function ds(){
    try{
      return db||(db=eval(fs.readFileSync(DB))());
    }catch(e){
      return 0;
    }
  }function jr(){
    try{
      let s=ds();
      return s?s(SF):{}
    }catch(e){
      return {}
    }
  }function sv(){
    let s=jr();
    s.sound=so?1:0;
    s.music=mo?1:0;
    s.vol=vol;
    try{
      let d=ds();
      if(d)d(SF,s)
    }catch(e){
    }
  }function bf(){
    try{
      bo={vsync:Pip.blitOptions.vsync,idleFilter:Pip.blitOptions.idleFilter,noScanEffect:Pip.blitOptions.noScanEffect};
      Pip.blitOptions.vsync=1;
      if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1
    }catch(e){
    }
  }function br(){
    try{
      bo.vsync===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bo.vsync;
      bo.idleFilter===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bo.idleFilter;
      bo.noScanEffect===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bo.noScanEffect
    }catch(e){
    }
  }function ui(k){
    if(so)try{
      Pip.playSound(k)
    }catch(e){
    }
  }function snd(k){
    if(so)try{
      if(!SN)SN={PAD:Pip.audioRead(DIR+"PAD.WAV"),WALL:Pip.audioRead(DIR+"WALL.WAV"),BRK:Pip.audioRead(DIR+"BRK.WAV")};
      Pip.audioStartVar(SN[k]||Pip.audioRead(DIR+k+".WAV"),AO)
    }catch(e){
    }
  }function dig(n,x,y){
    let m=[63,6,91,79,102,109,125,7,127,111][n],w=29,g=34,t=5;
    h.setColor(3);
    if(m&1)h.fillRect(x+t,y,x+w-t,y+t);
    if(m&2)h.fillRect(x+w-t,y+t,x+w,y+g/2);
    if(m&4)h.fillRect(x+w-t,y+g/2,x+w,y+g-t);
    if(m&8)h.fillRect(x+t,y+g-t,x+w-t,y+g);
    if(m&16)h.fillRect(x,y+g/2,x+t,y+g-t);
    if(m&32)h.fillRect(x,y+t,x+t,y+g/2);
    if(m&64)h.fillRect(x+t,y+g/2-t/2,x+w-t,y+g/2+t/2)
  }function rt(d){
    bx=240;
    by=160;
    ht=0;
    bvx=d*(diff===2?190:diff===0?145:170);
    bvy=(Math.random()*90-45);
    er=(Math.random()*2-1)*(diff===2?40:diff===1?45:86);
    last=getTime()
  }function hs(){
    ht++;
    if(diff===2)return Math.min(260,190+Math.floor(ht/2)*12);
    return Math.min(diff===0?158:215,Math.abs(bvx)+3)
  }function box(t,y,on){
    h.setColor(on?1:0).fillRect(116,y-12,364,y+12).setColor(3).drawRect(116,y-12,364,y+12).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,y+1)
  }function bg(a,b){
    h.setColor(0).fillRect(0,a,479,b).setColor(3);
    if(a<=50&&b>=50)h.drawLine(34,50,446,50);
    if(a<=BOT&&b>=BOT)h.drawLine(34,BOT,446,BOT);
    for(let y=52;y<BOT-11;y+=18)if(b>=y&&a<=y+8)h.drawLine(240,y,240,y+8);
  }function obj(a,b){
    h.setColor(3);
    if(b>=ly&&a<=ly+PH)h.fillRect(20,ly,27,ly+PH);
    if(b>=ry&&a<=ry+PH)h.fillRect(453,ry,460,ry+PH);
    if(b>=by-5&&a<=by+5)h.fillCircle(bx|0,by|0,5);
  }function pf(a,b){
    Pip.blitOptions.y1=cl((a|0)-2,0,319);
    Pip.blitOptions.y2=cl((b|0)+2,0,319);
    h.flip();
    Pip.lastFlip=getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }function pd(ol,or,ox,oy){
    let a=cl(Math.min(ol,or,ly,ry,oy-6,by-6),50,BOT),b=cl(Math.max(ol+PH,or+PH,ly+PH,ry+PH,oy+6,by+6),50,BOT);
    bg(a,b);
    obj(a,b);
    pf(a,b);
  }function dr(){
    h.clear(1).setColor(3);
    h.drawLine(34,50,446,50).drawLine(34,BOT,446,BOT);
    for(let y=52;y<BOT-11;y+=18)h.drawLine(240,y,240,y+8);
    dig(ls,202,12);
    dig(rs,249,12);
    obj(0,BOT);
    if(st===1){
      h.setColor(0).fillRect(92,92,388,244).setColor(3).drawRect(92,92,388,244).setFontMonofonto18().drawString("PONG",240,124);
      box("CONTINUE",166,sel===0);
      box("SETTINGS",194,sel===1);
      box("EXIT GAME",222,sel===2);
    }else if(st===3){
      h.setColor(0).fillRect(92,78,388,242).setColor(3).drawRect(92,78,388,242).setFontMonofonto18().drawString("SETTINGS",240,102);
      box("SOUND: "+(so?"ON":"OFF"),142,sel===0);
      box("MUSIC: "+(mo?"ON":"OFF"),170,sel===1);
      box("VOLUME: "+vol+"%",198,sel===2);
      box("BACK",226,sel===3);
    }else if(st===2){
      h.setColor(0).fillRect(88,96,392,236).setColor(3).drawRect(88,96,392,236).setFontMonofonto18().drawString(rs>ls?(players===1?"YOU WIN":"PLAYER 1 WINS"):(players===1?"CPU WINS":"PLAYER 2 WINS"),240,124);
      box("REMATCH",170,sel===0);
      box("EXIT GAME",202,sel===1);
    }
    h.flip();
    Pip.lastFlip=getTime()
  }function score(l){
    l?ls++:rs++;
    if(ls>=7||rs>=7){
      snd(players===1&&ls>=7?"LOSE":"LIFE");
      st=2;
      sel=0;
      dr();
      return
    }
    snd("BRK");
    rt(l?1:-1);
    dr()
  }function step(){
    let t=getTime(),dt=Math.min(.05,t-last);
    last=t;
    if(st)return;
    let ol=ly,or=ry,ox=bx,oy=by;
    let lsp=560;
    if(players===1){
      let sp=diff===2?160:diff===1?125:78,gate=diff===2?260:diff===1?260:170,target=160-PH/2;
      if(bvx<0&&bx<gate)target=by-PH/2+er;
      lty=cl(target,55,PMAX);
      lsp=sp
    }
    let ps=560*dt;
    ly+=cl(lty-ly,-lsp*dt,lsp*dt);
    ry+=cl(rty-ry,-ps,ps);
    ly=cl(ly,55,PMAX);
    ry=cl(ry,55,PMAX);
    bx+=bvx*dt;
    by+=bvy*dt;
    if(by<55){
      by=55;
      bvy=Math.abs(bvy);
      snd("WALL")
    }else if(by>BBOT){
      by=BBOT;
      bvy=-Math.abs(bvy);
      snd("WALL")
    }
    if(bvx<0&&bx<34&&bx>18&&by>=ly-7&&by<=ly+PH+7){
      let k=(by-(ly+PH/2))/(PH/2);
      bx=34;
      bvx=hs();
      bvy=k*150;
      snd("PAD")
    }else if(bvx>0&&bx>446&&bx<462&&by>=ry-7&&by<=ry+PH+7){
      let k=(by-(ry+PH/2))/(PH/2);
      bx=446;
      bvx=-hs();
      bvy=k*150;
      er=(Math.random()*2-1)*(diff===2?40:diff===1?45:86);
      snd("PAD")
    }
    if(bx<0)return score(0),void 0;
    if(bx>480)return score(1),void 0;
    pd(ol,or,ox,oy)
  }function leave(){
    rm();
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    if(!global.__bbPongBack)global.__bbPongBack=Function("delete global.__bbPongBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))({view:\"main\"});");
    mt=setTimeout(global.__bbPongBack,20)
  }function press(){
    if(st===2){
      if(sel===0){
        ls=rs=0;
        st=0;
        rt(Math.random()>.5?1:-1);
        dr()
      }else leave();
      return
    }if(st===1){
      if(sel===0){
        st=0;
        last=getTime();
        dr();
        return
      }if(sel===1){
        st=3;
        sel=0;
        dr();
        return
      }leave();
      return
    }if(st===3){
      if(sel===0)so=so?0:1;
      else if(sel===1)mo=mo?0:1;
      else if(sel===2){
        vol+=10;
        if(vol>100)vol=0;
        av()
      }else{
        st=1;
        sel=1;
        dr();
        return
      }sv();
      dr();
      return
    }st=1;
    sel=0;
    dr()
  }function move(d,a){
    if(st===2){
      let o=sel;
      sel=cl(sel+d,0,1);
      if(o!==sel)ui("SCROLL"),dr();
      return
    }
    if(st===1){
      let o=sel;
      sel=cl(sel+d,0,2);
      if(o!==sel)ui("SCROLL"),dr();
      return
    }if(st===3){
      let o=sel;
      sel=cl(sel+d,0,3);
      if(o!==sel)ui("SCROLL"),dr();
      return
    }if(st)return;
    if(players===1||a===1)rty=cl(rty+d*20,55,PMAX);
    else lty=cl(lty+d*20,55,PMAX)
  }function k1(d){
    if(d)move(d,1);
    else press()
  }function k2(d){
    if(d)move(d,2)
  }function rm(){
    if(tm)clearInterval(tm);
    if(mt)clearTimeout(mt);
    tm=mt=0;
    Pip.removeListener("knob1",k1);
    Pip.removeListener("knob2",k2);
    SN=0;
    br();
    db=0
  }av();
  bf();
  rt(Math.random()>.5?1:-1);
  dr();
  tm=setInterval(step,30);
  Pip.onExclusive("knob1",k1);
  Pip.onExclusive("knob2",k2);
  return{
    id:"BBPONG",notDefault:!0,fullscreen:!0,remove:rm
  }
});
