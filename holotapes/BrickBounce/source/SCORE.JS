(function(){
  const SF="SETTINGS/BRKBNCE.DAT",DB="HOLO/BRKBNCE/SAVE.JS",MU="HOLO/BRKBNCE/INTRO.WAV";
  let scores=[],so=1,mo=1,vol=70,dp=0,un=0,st=0,ms=0,to=0,leaving=0,db=0;
  function tx(n){
    return Math.min(n,999999).toString().padStart(6,0);
  }function sx(x,y){
    y-=4;
    h.fillPoly([x,y-7,x+2,y-2,x+7,y-2,x+3,y+1,x+5,y+7,x,y+4,x-5,y+7,x-3,y+1,x-7,y-2,x-2,y-2]);
  }function md(r){
    return r&&r.m?"ARCADE":"CLASSIC";
  }function di(r){
    return r&&0===r.d?"EASY":r&&2===r.d?"HARD":r&&3===r.d?"INSANE":"NORMAL";
  }function ns(){
    scores=(scores||[]).filter(function(e){
      return e&&e.s>0;
    });
    scores.sort(function(a,b){
      return b.s-a.s;
    });
    scores=scores.slice(0,10);
  }function av(){
    try{
      let v=Math.round(vol*27/100);
      if(global.__bbVol!==v){
        Pip.setVol(v);
        global.__bbVol=v
      }
    }catch(e){
    }
  }function bf(){
    try{
      let b=global.__bbBo;
      if(!b)b=global.__bbBo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};
      Pip.blitOptions.vsync=1;
      if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1;
      else b.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=b.i,b.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=b.n
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
      return s?s(SF):0
    }catch(e){
      return 0
    }
  }function jw(f,s){
    try{
      let d=ds();
      return d?d(f,s):0
    }catch(e){
      return 0
    }
  }function hi(){
    ns();
    return scores.length?scores[0].s:0;
  }function ld(){
    let s=jr();
    scores=s&&s.scores?s.scores:s&&s.high?[{
      n:"---",s:s.high
    }]:[];
    so=!s||s.sound!==0;
    mo=!s||s.music!==0;
    vol=s&&s.vol!==void 0?s.vol:vol;
    dp=s&&s.disp!==void 0?s.disp!==0:0;
    un=s&&s.u||0;
    av();
    ns();
  }function sv(){
    ns();
    try{
      let s=jr()||{
      };
      s.sound=so?1:0;
      s.music=mo?1:0;
      s.vol=vol;
      s.disp=dp?1:0;
      s.scores=scores;
      s.u=un;
      jw(SF,s);
    }catch(e){
    }
  }function snd(k){
    if(so)try{
      Pip.playSound(k);
    }catch(e){
    }
  }function box(t,y,on){
    h.setColor(on?1:0).fillRect(112,y-10,368,y+10).setColor(3).drawRect(112,y-10,368,y+10).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,y+1);
  }function dS(){
    st=0;
    ms=0;
    h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("HIGH SCORES",240,30).setFontMonofonto14();
    h.setFontAlign(-1,0).drawString("#",34,66).drawString("NAME",58,66).drawString("MODE",112,66).drawString("DIFF",198,66).drawString("LEVEL",300,66);
    h.setFontAlign(1,0).drawString("SCORE",448,66).drawLine(32,74,448,74).setFontMonofonto16();
    for(let i=0;
    i<10;
    i++){
      let r=scores[i]||{
        n:"---",s:0
      },y=88+20*i;
      let l="LVL "+((r&&r.l)||1);
      h.setFontAlign(-1,0).drawString(i+1+".",34,y).drawString(r.n||"---",58,y).drawString(md(r),112,y).drawString(di(r),198,y).drawString(l,300,y);
      if(r&&r.w)sx(300+h.stringWidth(l)+10,y);
      h.setFontAlign(1,0).drawString(tx(r.s||0),448,y);
    }h.flip();
    Pip.lastFlip=getTime();
  }function mi(){
    return["START GAME","SOUND: "+(so?"ON":"OFF"),"MUSIC: "+(mo?"ON":"OFF"),"HIGH SCORES","EXIT GAME"];
  }function dm(){
    st=1;
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("MAIN MENU",240,80);
    let m=mi();
    for(let i=0;
    i<5;
    i++)box(m[i],124+i*28,i===ms);
    h.flip();
    Pip.lastFlip=getTime();
  }function rm(k){
    if(to)clearTimeout(to);
    to=0;
    Pip.removeListener("knob1",k1);
    Pip.removeListener("knob2",k2);
    if(!k)Pip.audioStop();
    db=0;
  }function start(){
    if(leaving)return;
    leaving=1;
    rm();
    global.__bbLaunch={
      resume:0,sound:so?1:0,music:mo?1:0,vol:vol,disp:dp?1:0,save:0,high:hi(),mode:1,diff:1
    };
    scores=[];
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    to=setTimeout(function(){
      to=0;
      Pip.remove();
      E.defrag();
      Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/START.JS"))();
    },40);
  }function title(){
    if(leaving)return;
    leaving=1;
    rm(1);
    scores=[];
    E.defrag();
    if(!global.__bbLoadTitle)global.__bbLoadTitle=Function("delete global.__bbLoadTitle;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))({keepMusic:1});");
    to=setTimeout(global.__bbLoadTitle,20);
  }function k1(d){
    if(st===0){
      if(!d)title();
      return;
    }if(d){
      let o=ms;
      ms=Math.max(0,Math.min(4,ms+d));
      if(ms!==o){
        snd("SCROLL");
        dm();
      }return;
    }if(ms!==2)snd("TAB");
    if(ms===0)start();
    else if(ms===1){
      so=so?0:1;
      sv();
      dm();
    }else if(ms===2){
      mo=mo?0:1;
      sv();
      dm();
    }else if(ms===3)dS();
    else{
      rm();
      Pip.emit("mode",1);
    }
  }function k2(d){
    if(d&&st===1){
      let o=ms;
      ms=Math.max(0,Math.min(4,ms+d));
      if(ms!==o){
        snd("SCROLL");
        dm();
      }
    }
  }ld();
  bf();
  dS();
  if(mo)to=setTimeout(function(){
    to=0;
    try{
      Pip.audioStart(MU,{
        repeat:!0
      });
    }catch(e){
    }
  },450);
  Pip.onExclusive("knob1",k1);
  Pip.onExclusive("knob2",k2);
  return{
    id:"BRKBNCE",notDefault:!0,fullscreen:!0,remove:rm
  };
})
