(function(params){
  h.clear(1);
  const W=480,T=54,BOT=308,PY=292,PH=7,BR=5,C=9,BX=42,BY=78,BW=40,BH=14,BG=5,SM=5;
  const DIR="HOLO/BRKBNCE/",BRF=DIR+"BRICKS.JS",RUN="SETTINGS/BBRUN",SF="SETTINGS/BRKBNCE.DAT",PF="SETTINGS/BRKPATCH.DAT",DW=DIR+"SAVEW.JS",CF="SETTINGS/BBCUSTOM.TXT",APP=DIR+"APP.JS";
  const AO={
    encoding:"adpcm",sampleRate:8000,blockAlign:256,overlap:!0
  };
  const LVN=50,BON="LSEB?FTM",LVF=DIR+"LEVELS.TXT";
  let IM=0,px=199,pt=199,pw=82,bx=[240,0,0],by=[282,0,0],bu=[0,0,0],bv=[0,0,0],ba=1,sc=0,li=3,lv=1,co=3,hi=params&&params.high||0,bs=0,bn=0,ex=0,am=params&&params.mode?1:0,df=params&&params.diff!==void 0?params.diff:1,wn=0,sl=params&&params.slot||0,dp=params&&params.disp!==void 0?params.disp!==0:0;
  let st=0,tm=0,mt=0,last=getTime(),bd=[],pk=0,ux=0,uy=0,big=0,sndOn=!params||params.sound!==0,musOn=params&&params.music!==0,mus=0,SN=0,vol=params&&params.vol!==void 0?params.vol:-1;
  let lastS="",lastST=0,fd=1,hd=1,yb=[],yc=0,sel=0,ce=0,cz=0,ul=0,csp=0,cpa=0,cpb=0,csn=0,bt=1,psp=params&&params.ps||0,lpv=1,lps=0,tv="",te=0,bz=0,cu=params&&params.custom?1:0,xu=0,cfg=params&&params.cfg||0,ua=0;
  let bop={};
  function bf(){
    try{
      Pip.blitOptions.vsync=0;
      Pip.blitOptions.ydiff=0;
      Pip.blitOptions.filter=0;
      if(dp){
        Pip.blitOptions.idleFilter=[0];
        Pip.blitOptions.noScanEffect=1;
      }else{
        bop.idleFilter===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bop.idleFilter;
        bop.noScanEffect===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bop.noScanEffect;
      }
    }catch(e){
    }
  }function bfo(){
    try{
      bop={vsync:Pip.blitOptions.vsync,ydiff:Pip.blitOptions.ydiff,filter:Pip.blitOptions.filter,idleFilter:Pip.blitOptions.idleFilter,noScanEffect:Pip.blitOptions.noScanEffect};
      bf();
    }catch(e){
    }
  }function bfr(){
    try{
      bop.vsync===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bop.vsync;
      bop.ydiff===void 0?delete Pip.blitOptions.ydiff:Pip.blitOptions.ydiff=bop.ydiff;
      bop.filter===void 0?delete Pip.blitOptions.filter:Pip.blitOptions.filter=bop.filter;
      bop.idleFilter===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bop.idleFilter;
      bop.noScanEffect===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bop.noScanEffect;
    }catch(e){
    }
  }
  function cl(v,a,b){
    return Math.max(a,Math.min(b,v));
  }function rn(){
    return RUN+(sl+1)+".DAT";
  }function jr(){
    return cfg||{};
  }function jw(f,s){
    try{
      if(f===SF){
        cfg=s;
        f=PF;
      }
      global.__bbSaveFile=f;
      global.__bbSaveData=s;
      global.__bbSaveResult=0;
      eval(fs.readFileSync(DW));
      let ok=global.__bbSaveResult;
      delete global.__bbSaveResult;
      return ok;
    }catch(e){
      return 0;
    }
  }function rv(){
    let s=jr(),v=20;
    if(s&&s.vol!==void 0)return cl(s.vol,0,100);
    try{
      if(Pip.settings&&typeof Pip.settings.volume==="number")v=Pip.settings.volume;
    }catch(e){
    }return cl(Math.round(v*10/27)*10,0,100);
  }function av(){
    try{
      let v=Math.round(vol*27/100);
      if(global.__bbVol!==v){
        Pip.setVol(v);
        global.__bbVol=v
      }
    }catch(e){
    }
  }function ws(){
    let s=jr()||{
    };
    s.sound=sndOn?1:0;
    s.music=musOn?1:0;
    s.vol=vol;
    s.disp=dp?1:0;
    s.ce=ce?1:0;
    s.ul=ul?1:0;
    s.csp=csp;
    s.cpa=cpa;
    s.cpb=cpb?1:0;
    s.csn=csn?1:0;
    s.bt=bt;
    s.ps=psp;
    jw(SF,s);
  }function cg(){
    let s=jr()||{
    };
    ce=s.ce?1:0;
    cz=0;
    ul=s.ul?1:0;
    csp=s.csp||0;
    cpa=s.cpa||0;
    cpb=s.cpb?1:0;
    csn=s.csn?1:0;
    bt=s.bt!==void 0?s.bt:1;
    psp=s.ps||psp;
  }function ac(){
    if(!cz){
      return;
    }if(cpa===1)pw=112;
    else if(cpa===2)pw=54;
    if(cpb)big=1;
    if(csp===1)ss(0);
    else if(csp===2)ss(mx());
  }function tx(n){
    return Math.min(n,999999).toString().padStart(6,0);
  }function scoreMul(){
    return df===3?4:df===2?2:1;
  }function addScore(n){
    sc+=n*scoreMul();
    hd=1;
    if(sc>hi)hi=sc;
    al();
  }function brickPoints(v){
    return typeof v==="string"?10:v===4?100:v===3?50:v===2?20:v?10:0;
  }function ol(e,x,y){
    h.setColor(0);
    for(let a=-1;
    a<2;
    a++)for(let b=-1;
    b<2;
    b++)if(a||b)h.drawString(e,x+a,y+b);
    h.setColor(3).drawString(e,x,y);
  }function sf(n){
    return 1+n*(df===0?0.07:0.14);
  }function mx(){
    return df===1?7:df===2?8:df===3?10:SM;
  }function fx(){
    return df===1?12:df===2?13:df===3?15:10;
  }function bl(){
    return df===0?5:3;
  }function cn(){
    return df===0?5:df===3?1:3;
  }function el(){
    return df===0?4000:df===2?15000:df===3?50000:5000;
  }function mlv(){
    return cu?10:LVN;
  }function psc(){
    return psp===1?.7:psp===2?1.35:1;
  }function bs0(){
    return df===2?2.6:df===3?5:0;
  }function bq(){
    return df===0?"LEBTM":df===3?"LSEBFM":"LSEBFTM";
  }function rb(){
    bs=bs0();
    bn=0;
  }function vv(x,y){
    let m=sf(bs);
    bu[0]=x*m;
    bv[0]=y*m;
  }function pv(i,k){
    if(k!==k)k=0;
    k=cl(k,-.95,.95);
    if(!am){
      let m=sf(bs);
      bu[i]=k*115*m;
      bv[i]=-155*m;
      return;
    }
    let m=sf(bs),x=k*115*m,y=Math.sqrt(35960.5625*m*m-x*x);
    bu[i]=x;
    bv[i]=-y;
  }function ss(n,fast){
    n=cl(n,0,fast?fx():mx());
    if(n===bs)return;
    let m=sf(n)/sf(bs);
    for(let i=0;
    i<ba;
    i++){
      bu[i]*=m;
      bv[i]*=m;
    }
    bs=n;
    bn=0;
  }function nb(){
    if(cz&&csp){
      ss(csp===1?0:mx());
      return;
    }
    if(++bn<4||bs>=mx())return;
    bn=0;
    ss(bs+(df===3?0.4:1));
  }function setBall(i,x,y,u,v){
    bx[i]=x;
    by[i]=y;
    bu[i]=u;
    bv[i]=v;
  }function resetBalls(){
    ba=1;
    setBall(0,px+pw/2,PY-10,0,0);
  }function mb(){
    let x=bx[0],y=by[0],m=sf(bs);
    ba=3;
    setBall(0,x,y,(-95+Math.random()*24)*m,-145*m*(.95+Math.random()*.2));
    setBall(1,x,y,(Math.random()*40-20)*m,-150*m*(.95+Math.random()*.2));
    setBall(2,x,y,(95-Math.random()*24)*m,-145*m*(.95+Math.random()*.2));
  }function dropBall(i,r){
    mk(bx[i]-r,by[i]-r,bx[i]+r,by[i]+r);
    for(let j=i;
    j<ba-1;
    j++)setBall(j,bx[j+1],by[j+1],bu[j+1],bv[j+1]);
    ba--;
  }function ig(){
    if(!IM){
      E.defrag();
      IM=eval(fs.readFileSync(BRF));
    }
  }function ui(k){
    if(!sndOn)return;
    if(k==="SCROLL"&&musOn)return;
    try{
      let t=getTime(),d=k==="SCROLL"?.22:.16;
      if(t<ua)return;
      ua=t+d;
      Pip.playSound(k);
    }catch(e){
    }
  }function ps(){
    if(SN||!sndOn)return;
    SN={
      PAD:Pip.audioRead(DIR+"PAD.WAV"),WALL:Pip.audioRead(DIR+"WALL.WAV"),BRK:Pip.audioRead(DIR+"BRK.WAV"),HIT:Pip.audioRead(DIR+"HIT.WAV"),CLANK:Pip.audioRead(DIR+"CLANK.WAV")
    };
  }function snd(n){
    if(!sndOn)return;
    try{
      let t=getTime();
      if(n===lastS&&t-lastST<.035)return;
      lastS=n;
      lastST=t;
      if(!SN)ps();
      Pip.audioStartVar(SN&&SN[n]?SN[n]:Pip.audioRead(DIR+n+".WAV"),AO);
    }catch(e){
    }
  }function music(){
    try{
      let m=DIR+"MUS"+(1+(lv-1)%4)+".WAV";
      if(mt){
        clearTimeout(mt);
        mt=0;
      }if(!musOn){
        Pip.audioStop();
        mus=0;
        return;
      }if(mus===m)return;
      Pip.audioStop();
      mus=0;
      mt=setTimeout(function(){
        mt=0;
        if(musOn&&mus!==m)try{
          Pip.audioStop();
          Pip.audioStart(m,{
            repeat:!0
          });
          mus=m;
        }catch(e){
        }
      },350);
    }catch(e){
    }
  }function sv(save){
    if(cu)return;
    jw(rn(),save||0);
  }function autosave(next,bonus){
    let save={s:sc,v:li,l:next===void 0?lv:next,c:co,m:am?1:0,d:df,z:bonus===void 0?(bz?1:0):bonus,x:xu?1:0,xe:cz?1:0};
    if(next===void 0)save.b=bd.join("");
    sv(save);
  }function reserveContinue(){
    if(co>0)sv({s:sc,v:bl(),l:lv,c:co-1,m:am?1:0,d:df,z:0,x:xu?1:0,xe:cz?1:0});
    else sv(0);
  }function unlock(n){
    let s=jr()||{
    };
    if((s.u||0)<n){
      s.u=n;
      jw(SF,s);
      return 1;
    }return 0;
  }function ub(){
    let s=jr()||{
    },l=s.bcl!==void 0?s.bcl:s.bcu?1:0;
    l=Math.max(0,Math.min(6,l));
    if(l<6){
      s.bcl=l+1;
      s.bcu=1;
      jw(SF,s);
      return 1;
    }
    return 0;
  }function ib(){
    let s=jr()||{
    };
    if(!s.ib){
      s.ib=1;
      jw(SF,s);
    }
    return 1;
  }function lay(){
    let f=E.openFile(cu?CF:LVF,"r"),s="",o=(cu?Math.min(lv,10)-1:(lv-1)%LVN)*45;
    bd=[];
    try{
      f.seek?f.seek(o):f.read(o);
      s=f.read(45)||"";
      f.close();
    }catch(e){
    }for(let i=0;
    i<45;
    i++){
      let c=s[i]||0;
      if(df===0&&"SF".indexOf(c)>=0)c="?";
      else if(df===3&&c==="T")c="?";
      bd[i]=BON.indexOf(c)>=0?c:+c||0;
    }fd=hd=1;
  }function lbn(){
    let s="111E111E11222222211030303011E22222E1000000000";
    bd=[];
    for(let i=0;i<45;i++){
      let c=s[i];
      bd[i]=BON.indexOf(c)>=0?c:+c||0;
    }fd=hd=1;
  }function re(){
    let r=params&&params.resume&&params.save;
    if(!r)return 0;
    am=r.m?1:0;
    df=r.d!==void 0?r.d:1;
    sc=r.s||0;
    li=r.v||bl();
    lv=r.l||1;
    co=r.c===void 0?cn():r.c;
    bz=r.z?1:0;
    xu=r.x?1:0;
    cz=ce&&r.xe?1:0;
    bz?lbn():lay();
    if(r.b)for(let i=0;
    i<45&&i<r.b.length;
    i++){
      let c=r.b[i];
      bd[i]=BON.indexOf(c)>=0?c:+c||0;
    }
    return 1;
  }function mk(a,b,c,d){
    b=cl((b|0)-4,T,319);
    d=cl((d|0)+4,T,319);
    for(let i=0;
    i<yc;
    i+=2){
      if(!(d<yb[i]-48||b>yb[i+1]+48)){
        if(b<yb[i])yb[i]=b;
        if(d>yb[i+1])yb[i+1]=d;
        return;
      }
    }yb[yc++]=b;
    yb[yc++]=d;
  }function mo(){
    let r=big?8:BR;
    for(let i=0;
    i<ba;
    i++)mk(bx[i]-r,by[i]-r,bx[i]+r,by[i]+r);
    if(pk)mk(ux-10,uy-10,ux+10,uy+10);
  }function fp(a,b){
    Pip.blitOptions.y1=cl((a|0)-2,0,319);
    Pip.blitOptions.y2=cl((b|0)+2,0,319);
    h.flip();
    Pip.lastFlip=getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }function he(){
    h.clearRect(0,0,479,T-1).setColor(3).setFontMonofonto16().setFontAlign(-1,-1);
    h.drawString("BRICK BOUNCE",32,6);
    if(cu)h.setFontAlign(1,-1).drawString("SCORE "+tx(sc),448,6);
    else h.setFontAlign(1,-1).drawString("SCORE "+tx(sc),282,6).drawString("HI "+tx(Math.max(hi,sc)),448,6);
    h.setFontAlign(-1,-1).drawString("LIVES "+li+"  LVL "+(bz?"BONUS":lv),32,24).drawLine(28,T-5,452,T-5);
    hd=0;
  }function br(i){
    let v=bd[i];
    if(!v)return;
    let x=BX+(i%C)*(BW+BG),y=BY+((i/C)|0)*(BH+BG);
    h.setColor(3).drawImage(IM[typeof v==="string"?4:v===9?5:v===4?3:(v-1)%3],x,y);
  }function sa(){
    h.clearRect(0,T,479,319).setColor(1).drawRect(4,T,475,BOT);
    for(let i=0;
    i<45;
    i++)br(i);
    fd=0;
    yc=0;
  }function ic(k,x,y){
    h.drawImage(IM[6+"SLEB?FTM".indexOf(k)],x-8,y-8);
  }function oo(a,b){
    h.setColor(3);
    if(pk&&uy+10>=a&&uy-10<=b)ic(pk,ux|0,uy|0);
    if(PY+PH>=a&&PY<=b)h.fillRect(px|0,PY,(px+pw)|0,PY+PH);
    if(cz&&csn&&BOT-4>=a&&BOT-4<=b)h.drawLine(10,BOT-4,470,BOT-4);
    let r=big?8:BR;
    for(let i=0;
    i<ba;
    i++)if(by[i]+r>=a&&by[i]-r<=b)h.fillCircle(bx[i]|0,by[i]|0,r);
  }function ts(k,q){
    if(!bt||bt===2&&!q)return;
    tv="LONG PADDLE|SHORT PADDLE|POWER BALL|EXTRA LIFE|MULTI BALL|FAST BALL|SLOW BALL".split("|")["LSBEMFT".indexOf(k)]||"RANDOM ITEM";
    te=getTime()+1.35;
    mk(126,178,354,210);
  }function tc(){
    if(tv){
      tv="";
      te=0;
      mk(126,178,354,210);
    }
  }function dd(a,b){
    if(tv&&getTime()<te&&a<=210&&b>=178)h.setColor(3).setFontMonofonto16().setFontAlign(0,0).drawString(tv,240,195);
  }function ob(noMsg){
    oo(0,319);
    dd(0,319);
    if(!noMsg){
      h.setFontMonofonto18().setFontAlign(0,0);
      if(st===4)h.drawString("GAME OVER",240,198);
      else if(st===6)h.drawString("LEVEL CLEAR!",240,198);
      else if(st===11)h.drawString("BONUS LEVEL",240,198);
      else if(st===12)h.drawString("BONUS LEVEL OVER",240,198);
      else if(!st)h.drawString("PRESS KNOB TO SERVE",240,198);
    }
  }function fl(){
    if(hd)he();
    sa();
    ob(0);
    h.flip();
    Pip.lastFlip=getTime();
  }function pa(){
    if(fd||st>1){
      fl();
      return;
    }if(!yc)return;
    for(let j=0;
    j<yc;
    j+=2){
      let a=yb[j],b=yb[j+1];
      h.clearRect(0,a,479,b).setColor(1);
      if(a<=BOT){
        let q=b>BOT?BOT:b;
        h.drawLine(4,a,4,q).drawLine(475,a,475,q);
        if(a<=T)h.drawLine(4,T,475,T);
        if(b>=BOT)h.drawLine(4,BOT,475,BOT);
      }let r0=cl(((a-BY)/(BH+BG))|0,0,4),r1=cl(((b-BY)/(BH+BG))|0,0,4);
      for(let r=r0;
      r<=r1;
      r++){
        let y=BY+r*(BH+BG);
        if(b<y||a>y+BH)continue;
        for(let c=0;
        c<C;
        c++)br(r*C+c);
      }oo(a,b);
      dd(a,b);
      fp(a,b);
    }yc=0;
  }function ln(t,y,on){
    h.setColor(on?1:0).fillRect(104,y-10,376,y+10).setColor(3).drawRect(104,y-10,376,y+10).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,y+1);
  }function it(i){
    return i===0?"CONTINUE":i===1?"SETTINGS":cu?"EXIT GAME":"SAVE AND EXIT";
  }function pi(i){
    return i===0?"SOUND: "+(sndOn?"ON":"OFF"):i===1?"MUSIC: "+(musOn?"ON":"OFF"):i===2?"VOLUME: "+vol+"%":i===3?"DISPLAY: "+(dp?"CLEAN":"CRT"):i===4?"BONUS TOAST: "+(bt===2?"RANDOM ONLY":bt?"ON":"OFF"):i===5?"PADDLE SPEED: "+(psp===1?"SLOW":psp===2?"FAST":"NORMAL"):ce&&i===6?"CHEATS":"BACK";
  }function pl(){
    return ce?8:7;
  }function bsx(){
    return csp===1?"SLOW":csp===2?"FAST":"NORMAL";
  }function psx(){
    return cpa===1?"LONG":cpa===2?"SMALL":"NORMAL";
  }function ci(i){
    if(!cz)return i===0?"CHEATS: OFF":"BACK";
    return i===0?"CHEATS: ON":i===1?"UNLIMITED LIVES: "+(ul?"ON":"OFF"):i===2?"BALL SPEED: "+bsx():i===3?"PADDLE SIZE: "+psx():i===4?"POWER BALL: "+(cpb?"ON":"OFF"):i===5?"SAFETY NET: "+(csn?"ON":"OFF"):i===6?"SKIP LEVEL":i===7?"LEVEL SELECT":"BACK";
  }function cln(){
    return cz?9:2;
  }function pd(){
    he();
    sa();
    ob(1);
    h.setColor(0).fillRect(88,86,392,254).setColor(3).drawRect(88,86,392,254).setFontMonofonto18().setFontAlign(0,0).drawString("PAUSED",240,110);
    for(let i=0;
    i<3;
    i++)ln(it(i),152+i*24,i===sel);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function pset(){
    he();
    sa();
    ob(1);
    h.setColor(0).fillRect(70,50,410,306).setColor(3).drawRect(70,50,410,306).setFontMonofonto18().setFontAlign(0,0).drawString("SETTINGS",240,72);
    for(let i=0;
    i<pl();
    i++)ln(pi(i),104+i*26,i===sel);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function cset(){
    he();
    sa();
    ob(1);
    h.setColor(0).fillRect(70,54,410,286).setColor(3).drawRect(70,54,410,286).setFontMonofonto18().setFontAlign(0,0).drawString("CHEATS",240,74);
    for(let i=0;
    i<cln();
    i++)ln(ci(i),98+i*21,i===sel);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function cwarn(){
    he();
    sa();
    ob(1);
    h.setColor(0).fillRect(70,82,410,248).setColor(3).drawRect(70,82,410,248).setFontMonofonto18().setFontAlign(0,0).drawString("ENABLE CHEATS?",240,106).setFontMonofonto14().drawString("ONLINE SCORES CANNOT BE",240,138).drawString("UPLOADED FOR THIS PROFILE",240,158);
    ln("NO",196,sel===0);
    ln("YES",220,sel===1);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function lvd(){
    he();
    sa();
    ob(1);
    let t=(lpv/10)|0,o=lpv%10;
    h.setColor(0).fillRect(104,86,376,254).setColor(3).drawRect(104,86,376,254).setFontMonofonto18().setFontAlign(0,0).drawString("SELECT LEVEL",240,112).setFontMonofonto36();
    h.drawRect(194,142,232,196).drawRect(248,142,286,196);
    if(!lps)h.drawRect(191,139,235,199);
    else h.drawRect(245,139,289,199);
    h.drawString(t,213,169).drawString(o,267,169);
    h.setFontMonofonto14().drawString("PRESS KNOB: START",240,226);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function lvc(d){
    let t=(lpv/10)|0,o=lpv%10;
    if(!lps){
      t=(t+d+6)%6;
      if(t===5)o=0;
      if(t===0&&o===0)o=1;
    }else{
      let m=t===5?0:9;
      o=(o+d+m+1)%(m+1);
      if(t===0&&o===0)o=1;
    }lpv=cl(t*10+o,1,mlv());
  }function cd(){
    h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("CONTINUE?",240,96);
    h.setFontMonofonto16().drawString("CONTINUES LEFT "+co,240,124);
    ln("YES",164,sel===0);
    ln("NO",188,sel===1);
    h.flip();
    Pip.lastFlip=getTime();
    fd=hd=0;
  }function rs(){
    tc();
    rb();
    ac();
    resetBalls();
    st=0;
    last=getTime();
    fd=1;
  }function miss(){
    if(bz){
      snd("LOSE");
      be();
      return;
    }if(cz&&ul){
      hd=1;
      pw=82;
      big=pk=0;
      snd("LOSE");
      rs();
      fl();
      return;
    }li--;
    hd=1;
    pw=82;
    big=pk=0;
    ac();
    if(li<=0){
      reserveContinue();
      ov();
      return;
    }snd("LOSE");
    rs();
    autosave();
    fl();
  }function start(){
    if(vol<0)vol=rv();
    av();
    cg();
    ig();
    wn=0;
    if(!re()){
      sc=0;
      li=bl();
      lv=1;
      co=cn();
      bz=0;
      lay();
    }if(!cu&&cz)xu=1;
    let es=el();
    ex=((sc/es)|0)*es+es;
    px=pt=199;
    pw=82;
    big=pk=0;
    rs();
    if(sndOn)ps();
    music();
    fl();
  }function cb(){
    rm();
    IM=0;
    SN=0;
    bd=[];
    pk=0;
    sc=0;
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    if(!global.__bbCustomBack)global.__bbCustomBack=Function("delete global.__bbCustomBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/CUSTOM.JS\"))({returned:1});");
    mt=setTimeout(global.__bbCustomBack,20);
  }function fn(){
    if(cu)return cb();
    global.__bbName={
      score:sc,sound:sndOn?1:0,music:musOn?1:0,vol:vol,disp:dp?1:0,level:lv,mode:am?1:0,diff:df,win:wn?1:0,slot:sl,x:xu?1:0
    };
    sv({
      p:sc,l:lv,m:am?1:0,d:df,w:wn?1:0,x:xu?1:0,xe:cz?1:0
    });
    rm();
    try{
      Pip.audioStop();
    }catch(e){
    }
    IM=0;
    SN=0;
    bd=[];
    pk=0;
    sc=0;
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    if(!global.__bbLoadName)global.__bbLoadName=Function("var p=global.__bbName;global.__bbName=0;try{Pip.audioStop()}catch(e){}Pip.remove();try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/NAME.JS\"))(p);");
    mt=setTimeout(global.__bbLoadName,250);
  }function fw(){
    wn=1;
    let msg=0,sec=0,bc=0,base=sc,lbo=0,cbo=0;
    if(!cu){
      lbo=li*500*scoreMul();
      cbo=co*4000*scoreMul();
      sc+=lbo+cbo;
      if(sc>hi)hi=sc;
      if(df===2)msg=unlock(2)?2:0;
      else if(df<2)msg=unlock(1)?1:0;
      bc=ub();
      if(df===3)sec=ib();
      else{
        let s=jr();
        sec=s&&s.ib?1:0;
      }
    }
    global.__bbWin={
      score:sc,base:base,lbo:lbo,cbo:cbo,sound:sndOn?1:0,music:musOn?1:0,vol:vol,disp:dp?1:0,level:lv,mode:am?1:0,diff:df,win:1,slot:sl,msg:msg,sec:sec,bonus:bc,custom:cu?1:0,x:xu?1:0
    };
    sv({
      p:sc,l:lv,m:am?1:0,d:df,w:1,x:xu?1:0,xe:cz?1:0
    });
    rm(1);
    IM=0;
    SN=0;
    bd=[];
    pk=0;
    sc=0;
    E.defrag();
    if(!global.__bbLoadWin)global.__bbLoadWin=Function("var p=global.__bbWin;global.__bbWin=0;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/VICT.JS\"))(p);");
    mt=setTimeout(global.__bbLoadWin,20);
  }function gt(){
    if(cu)return cb();
    rm();
    IM=0;
    SN=0;
    bd=[];
    pk=0;
    sc=0;
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();
    Pip.lastFlip=getTime();
    E.defrag();
    if(!global.__bbGameTitle)global.__bbGameTitle=Function("try{Pip.audioStop()}catch(e){}Pip.remove();try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))();");
    mt=setTimeout(global.__bbGameTitle,20);
  }function ov(){
    tc();
    snd("GAME");
    if(mus){
      try{
        Pip.audioStop();
      }catch(e){
      }
      mus=0;
    }st=4;
    fd=hd=1;
    fl();
    if(mt)clearTimeout(mt);
    mt=setTimeout(function(){
      mt=0;
      if(co>0){
        st=2;
        sel=0;
        cd();
      }else fn();
    },3000);
  }function lc(win){
    tc();
    if(!win)autosave(lv%10===0?lv:lv+1,lv%10===0?1:0);
    snd("CLEAR");
    st=6;
    fd=hd=1;
    fl();
    if(mt)clearTimeout(mt);
    mt=setTimeout(function(){
      mt=0;
      if(win){
        st=7;
        fw();
        return;
      }if(!cu&&lv%10===0){
        bz=1;
        lbn();
        pw=82;
        big=pk=0;
        rs();
        st=11;
        fd=hd=1;
        fl();
        mt=setTimeout(function(){
          mt=0;
          st=0;
          fd=1;
          fl();
        },1500);
        return;
      }lv++;
      lay();
      pw=82;
      big=pk=0;
      rs();
      music();
      fl();
    },1500);
  }function be(){
    tc();
    autosave(lv+1,0);
    snd("CLEAR");
    st=12;
    fd=hd=1;
    fl();
    if(mt)clearTimeout(mt);
    mt=setTimeout(function(){
      mt=0;
      bz=0;
      lv++;
      lay();
      pw=82;
      big=pk=0;
      rs();
      music();
      fl();
    },1500);
  }function le(){
    for(let i=0;
    i<45;
    i++)if(bd[i]&&bd[i]!==9&&(bz||typeof bd[i]!=="string"))return 1;
    return 0;
  }function po(k){
    let q=k==="?";
    mk(px,PY,px+pw,PY+PH);
    if(q){
      let z=bq();
      k=z[(Math.random()*z.length)|0];
    }if(k==="L")pw=112;
    else if(k==="S")pw=54;
    else if(k==="B")big=1;
    else if(k==="E"){
      li++;
      hd=1;
    }else if(k==="M")mb();
    else if(k==="F")ss(fx(),1);
    else if(k==="T"&&df!==3)ss(0);
    ac();
    pt=cl(pt,8,W-pw-8);
    px=cl(px,8,W-pw-8);
    mk(px,PY,px+pw,PY+PH);
    ts(k,q);
    snd(k==="S"||k==="F"?"BAD":k==="E"?"LIFE":"POWER");
  }function al(){
    while(sc>=ex){
      li++;
      ex+=el();
      hd=1;
      snd("LIFE");
    }
  }function sp(dt){
    if(pk){
      uy+=62*dt;
      if(uy>PY-4&&uy<PY+PH+14&&ux>=px-8&&ux<=px+pw+8){
        po(pk);
        pk=0;
      }else if(uy>BOT+18)pk=0;
    }
  }function sd(ox,oy,x,y,r,cx,cy){
    if(oy+r<=y||oy-r>=y+BH)return 1;
    if(ox+r<=x||ox-r>=x+BW)return 2;
    let a=(cx+r)-x,b=x+BW-(cx-r),c=(cy+r)-y,d=y+BH-(cy-r);
    return Math.min(a,b)<Math.min(c,d)?2:1;
  }function bo(i,s,ox,oy,cx,cy,r){
    if(s===2){
      bx[i]=ox<=cx?cx-r-.5:cx+BW+r+.5;
      bu[i]=-bu[i];
    }else{
      by[i]=oy<=cy?cy-r-.5:cy+BH+r+.5;
      bv[i]=-bv[i];
    }
  }function lp(){
    let t=getTime();
    let dt=Math.min(.07,t-last);
    last=t;
    if(tv&&t>te){
      tv="";
      mk(126,178,354,210);
    }
    if(st===1){
      mo();
      let op=px;
      let mv=480*dt*psc();
      px+=cl(pt-px,-mv,mv);
      if(op!==px){
        mk(op,PY,op+pw,PY+PH);
        mk(px,PY,px+pw,PY+PH);
      }sp(dt);
      let r=big?8:BR;
      for(let bi=ba-1;
      bi>=0;
      bi--){
        let ox=bx[bi],oy=by[bi];
        bx[bi]+=bu[bi]*dt;
        by[bi]+=bv[bi]*dt;
        if(bx[bi]!==bx[bi]||by[bi]!==by[bi]||bu[bi]!==bu[bi]||bv[bi]!==bv[bi]){
          miss();
          return;
        }if(bx[bi]<r+5){
          bx[bi]=r+5;
          bu[bi]=Math.abs(bu[bi]);
          nb();
          snd("WALL");
        }if(bx[bi]>W-r-5){
          bx[bi]=W-r-5;
          bu[bi]=-Math.abs(bu[bi]);
          nb();
          snd("WALL");
        }if(by[bi]<T+r+2){
          by[bi]=T+r+2;
          bv[bi]=Math.abs(bv[bi]);
          nb();
          snd("WALL");
        }if(bv[bi]>0&&oy-r<=PY+PH&&by[bi]+r>=PY&&by[bi]-r<=PY+PH+18&&bx[bi]>=px-r-20&&bx[bi]<=px+pw+r+20){
          let k=cl((bx[bi]-(px+pw/2))/(pw/2),-1,1);
          pv(bi,k);
          by[bi]=PY-r-1;
          snd("PAD");
          nb();
        }let c0=cl(((bx[bi]-r-BX)/(BW+BG))|0,0,C-1),c1=cl(((bx[bi]+r-BX)/(BW+BG))|0,0,C-1);
        let r0=cl(((by[bi]-r-BY)/(BH+BG))|0,0,4),r1=cl(((by[bi]+r-BY)/(BH+BG))|0,0,4),hit=0;
        for(let rr=r0;
        rr<=r1&&!hit;
        rr++){
          for(let cc=c0;
          cc<=c1;
          cc++){
            let i=rr*C+cc,v=bd[i];
            if(!v)continue;
            let x=BX+cc*(BW+BG),y=BY+rr*(BH+BG);
            if(bx[bi]+r>=x&&bx[bi]-r<=x+BW&&by[bi]+r>=y&&by[bi]-r<=y+BH){
              let s=sd(ox,oy,x,y,r,bx[bi],by[bi]);
              if(v===9){
                bo(bi,s,ox,oy,x,y,r);
                snd("CLANK");
              }else{
                if(v===4&&!big){
                  bd[i]=3;
                  addScore(50);
                  snd("HIT");
                }else{
                  bd[i]=0;
                  addScore(brickPoints(v));
                  if(typeof v==="string"){
                    pk=v;
                    ux=x+BW/2;
                    uy=y+BH/2;
                  }snd("BRK");
                }if(!big){
                  bo(bi,s,ox,oy,x,y,r);
                }
              }nb();
              mk(x,y,x+BW,y+BH);
              hit=1;
              break;
            }
          }
        }if(cz&&csn&&bv[bi]>0&&by[bi]+r>=BOT-4){
          by[bi]=BOT-4-r;
          bv[bi]=-Math.abs(bv[bi]);
          nb();
          snd("WALL");
        }if(by[bi]-r>BOT){
          if(ba>1){
            dropBall(bi,r);
            continue;
          }miss();
          return;
        }
      }if(st===1&&!le()){
        if(bz){
          if(!pk)be();
          return;
        }lc(lv>=mlv());
        return;
      }mo();
    }else if(st===0){
      let op=px,mv=480*dt*psc();
      px+=cl(pt-px,-mv,mv);
      if(op!==px){
        mk(op,PY-20,op+pw,PY+PH);
        resetBalls();
        mk(px,PY-20,px+pw,PY+PH);
      }
    }let sh=hd;
    if(hd)he();
    if(sh)fp(0,T);
    if(st<2)pa();
    else if(fd||sh)fl();
  }function ck(){
    if(st===3){
      ui("TAB");
      if(sel===0){
        st=1;
        fd=1;
        last=getTime();
        return;
      }if(sel===1){
        st=8;
        sel=0;
        pset();
        return;
      }sv({
        s:sc,v:li,l:lv,c:co,b:bd.join(""),m:am?1:0,d:df,z:bz?1:0,x:xu?1:0,xe:cz?1:0
      });
      gt();
      return;
    }if(st===8){
      if(sel!==1&&sel!==2)ui("TAB");
      if(sel===0){
        sndOn=sndOn?0:1;
        ws();
        pset();
        return;
      }if(sel===1){
        musOn=musOn?0:1;
        ws();
        music();
        pset();
        return;
      }if(sel===2){
        vol+=10;
        if(vol>100)vol=0;
        av();
        ui("TAB");
        ws();
        pset();
        return;
      }if(sel===3){
        dp=dp?0:1;
        bf();
        ws();
        pset();
        return;
      }if(sel===4){
        bt=(bt+1)%3;
        ws();
        pset();
        return;
      }if(sel===5){
        psp=(psp+1)%3;
        ws();
        pset();
        return;
      }if(ce&&sel===6){
        st=9;
        sel=0;
        cset();
        return;
      }st=3;
      sel=1;
      pd();
      return;
    }if(st===9){
      ui("TAB");
      if(sel===0){
        if(!cz&&!xu){
          st=13;
          sel=0;
          cwarn();
          return;
        }
        cz=cz?0:1;
        if(cz&&!cu){
          xu=1;
          autosave();
        }
        if(!cz){
          pw=82;
          big=0;
        }ac();
        ws();
        cset();
        return;
      }if(!cz){
        st=8;
        sel=6;
        pset();
        return;
      }if(sel===1)ul=ul?0:1;
      else if(sel===2){
        csp=(csp+1)%3;
        ac();
      }else if(sel===3){
        cpa=(cpa+1)%3;
        if(!cpa)pw=82;
        ac();
        px=pt=cl(px,8,W-pw-8);
      }else if(sel===4){
        cpb=cpb?0:1;
        big=cpb?1:0;
      }else if(sel===5)csn=csn?0:1;
      else if(sel===6){
        bz?be():lc(lv>=mlv());
        return;
      }else if(sel===7){
        lpv=lv;
        lps=0;
        st=10;
        lvd();
        return;
      }else{
        st=8;
        sel=6;
        pset();
        return;
      }ws();
      cset();
      return;
    }if(st===13){
      ui("TAB");
      if(sel===1){
        cz=1;
        xu=1;
        autosave();
      }st=9;
      sel=0;
      cset();
      return;
    }if(st===10){
      lv=cl(lpv,1,mlv());
      bz=0;
      lay();
      pw=82;
      big=pk=0;
      rs();
      music();
      fl();
      return;
    }if(st===2){
      if(sel===0){
        co--;
        li=bl();
        pw=82;
        big=pk=0;
        bz=0;
        lay();
        rs();
        autosave();
        music();
        fl();
      }else fn();
      return;
    }if(st===1){
      st=3;
      sel=0;
      pd();
      return;
    }st=1;
    ba=1;
    last=getTime();
    vv(Math.random()>.5?110:-110,-145);
    snd("SERVE");
    fd=1;
  }function kb(d){
    if(st===4||st===6||st===7||st===11||st===12)return;
    if(st===2){
      if(d){
        let o=sel;
        sel=Math.max(0,Math.min(1,sel+d));
        if(sel!==o){
          ui("SCROLL");
          cd();
        }
      }else ck();
      return;
    }if(st===3){
      if(d){
        let o=sel;
        sel=Math.max(0,Math.min(2,sel+d));
        if(sel!==o){
          ui("SCROLL");
          pd();
        }
      }else ck();
      return;
    }if(st===8){
      if(d){
        let o=sel;
        sel=Math.max(0,Math.min(pl()-1,sel+d));
        if(sel!==o){
          ui("SCROLL");
          pset();
        }
      }else ck();
      return;
    }if(st===9){
      if(d){
        let o=sel;
        sel=Math.max(0,Math.min(cln()-1,sel+d));
        if(sel!==o){
          ui("SCROLL");
          cset();
        }
      }else ck();
      return;
    }if(st===13){
      if(d){
        let o=sel;
        sel=Math.max(0,Math.min(1,sel+d));
        if(sel!==o){
          ui("SCROLL");
          cwarn();
        }
      }else ck();
      return;
    }if(st===10){
      if(d){
        lvc(d);
        ui("SCROLL");
        lvd();
      }else ck();
      return;
    }if(!d)return ck();
    if(st<2){
      pt=cl(pt+d*28*psc(),8,W-pw-8);
    }
  }function k2(d){
    if(st===10&&d){
      lps=(lps+d+2)%2;
      ui("TAB");
      lvd();
      return;
    }kb(d);
  }function rm(k){
    if(tm)clearInterval(tm);
    if(mt)clearTimeout(mt);
    tm=mt=0;
    Pip.removeListener("knob1",kb);
    Pip.removeListener("knob2",k2);
    bfr();
    if(!k)try{
      Pip.audioStop();
    }catch(e){
    }
    SN=0;
    mus=0;
    cfg=0;
  }bfo();
  start();
  tm=setInterval(lp,1);
  Pip.onExclusive("knob1",kb);
  Pip.onExclusive("knob2",k2);
  return{
    id:"BRKBNCE",notDefault:!0,fullscreen:!0,remove:function(){
      rm()
    }
  }
});
