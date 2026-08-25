(function(params){
  h.clear(1);
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS",AO={encoding:"adpcm",sampleRate:8000,blockAlign:256,overlap:!0};
  const W=480,CE=56,FL=308,X=98,R=8,PW=36,SP=152;
  let so=!params||params.sound!==0,mo=params&&params.music!==0,vol=params&&params.vol!==void 0?params.vol:70,dp=params&&params.disp!==void 0?params.disp!==0:0;
  let st=0,sel=0,tm=0,mt=0,last=getTime(),y=160,v=0,sc=0,hi=0,seed=1,obs=[],SN=0,bo={},db=0;
  function cl(n,a,b){return Math.max(a,Math.min(b,n))}
  function ds(){try{return db||(db=eval(fs.readFileSync(DB))())}catch(e){return 0}}
  function jr(){try{let s=ds();return s?s(SF):{}}catch(e){return {}}}
  function sv(){let s=jr();s.sound=so?1:0;s.music=mo?1:0;s.vol=vol;s.fh=hi;try{let d=ds();if(d)d(SF,s)}catch(e){}}
  function av(){try{let n=Math.round(vol*27/100);if(global.__bbVol!==n){Pip.setVol(n);global.__bbVol=n}}catch(e){}}
  function bf(){try{bo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};Pip.blitOptions.vsync=1;if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1}catch(e){}}
  function br(){try{bo.v===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bo.v;bo.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bo.i;bo.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bo.n}catch(e){}}
  function ui(k){if(so)try{Pip.playSound(k)}catch(e){}}
  function snd(k){if(!so)return;try{if(!SN)SN={PAD:Pip.audioRead(DIR+"PAD.WAV"),CLEAR:Pip.audioRead(DIR+"CLEAR.WAV"),GAME:Pip.audioRead(DIR+"GAME.WAV")};Pip.audioStartVar(SN[k],AO)}catch(e){}}
  function gap(){return Math.max(77,94-((sc/7)|0))}
  function add(x){seed=(seed*37+19)%997;let g=gap(),gy=98+(seed*41)%104;if(gy+g>FL-12)gy=FL-g-12;obs.push({x:x,y:gy,g:g,s:0})}
  function reset(){st=0;sel=sc=0;y=160;v=0;seed=((getTime()*1000)|0)%997;obs=[];add(W+112);add(W+112+SP);last=getTime();dr()}
  function pipe(x,a,b,capBottom){if(b<=a)return;let xx=x|0,aa=a|0,bb=b|0;h.setColor(3).fillRect(xx,aa,xx+PW,bb).setColor(0).drawLine(xx+6,aa,xx+6,bb).drawLine(xx+PW-5,aa,xx+PW-5,bb).setColor(3).drawRect(xx,aa,xx+PW,bb);let cy=capBottom?bb-12:aa;h.fillRect(xx-4,cy,xx+PW+4,cy+12).setColor(0).drawLine(xx+3,cy+4,xx+PW-3,cy+4).setColor(3).drawRect(xx-4,cy,xx+PW+4,cy+12)}
  function ball(){h.setColor(3).fillCircle(X,y|0,R).setColor(0).fillCircle(X-3,(y-3)|0,2).setColor(3)}
  function box(t,yy,on){h.setColor(on?1:0).fillRect(106,yy-11,374,yy+11).setColor(3).drawRect(106,yy-11,374,yy+11).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,yy+1)}
  function menu(title,items,yy){h.setColor(0).fillRect(82,58,398,272).setColor(3).drawRect(82,58,398,272).setFontMonofonto18().setFontAlign(0,0).drawString(title,240,84);for(let i=0;i<items.length;i++)box(items[i],yy+i*27,sel===i)}
  function items(){return["SOUND: "+(so?"ON":"OFF"),"MUSIC: "+(mo?"ON":"OFF"),"VOLUME: "+vol+"%","BACK"]}
  function dr(){h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("FLOATY BALL",240,10).setFontMonofonto14().setFontAlign(-1,0).drawString("SCORE "+sc,34,38).setFontAlign(1,0).drawString("HI "+hi,446,38).drawLine(18,CE,462,CE).drawLine(18,FL,462,FL);for(let i=0;i<obs.length;i++){let o=obs[i];pipe(o.x,CE+1,o.y,1);pipe(o.x,o.y+o.g,FL,0)}ball();if(st===0)h.setFontMonofonto18().setFontAlign(0,0).drawString("TURN KNOB TO FLOAT",240,244);else if(st===2)menu("PAUSED",["CONTINUE","SETTINGS","EXIT GAME"],128);else if(st===3)menu("SETTINGS",items(),114);else if(st===4)menu("GAME OVER",["REMATCH","EXIT GAME"],142);h.flip();Pip.lastFlip=getTime()}
  function flap(n){v=Math.max(-310,v-(n||180))}
  function finish(){st=4;sel=0;if(sc>hi)hi=sc,sv();snd("GAME");dr()}
  function step(){let t=getTime(),dt=Math.min(.06,t-last);last=t;if(st!==1)return;let sp=112+Math.min(70,sc*2.6);v=cl(v+516*dt,-315,342);y+=v*dt;for(let i=obs.length-1;i>=0;i--){let o=obs[i];o.x-=sp*dt;if(!o.s&&o.x+PW<X-R){o.s=1;sc++;snd("CLEAR")}if(o.x+PW<-14)obs.splice(i,1)}let lx=0;for(let i=0;i<obs.length;i++)lx=Math.max(lx,obs[i].x);if(lx<W-20)add(lx+SP);if(y-R<=CE||y+R>=FL)return finish();for(let i=0;i<obs.length;i++){let o=obs[i],hx=X+R>o.x&&X-R<o.x+PW,sy=y-R>o.y&&y+R<o.y+o.g;if(hx&&!sy)return finish()}dr()}
  function leave(){rm();h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();Pip.lastFlip=getTime();E.defrag();if(!global.__bbFloatBack)global.__bbFloatBack=Function("delete global.__bbFloatBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))();");mt=setTimeout(global.__bbFloatBack,20)}
  function press(){if(st===0){st=1;flap(170);snd("PAD");last=getTime();return dr()}if(st===4){ui("TAB");return sel===0?reset():leave()}if(st===2){ui("TAB");if(sel===0){st=1;last=getTime()}else if(sel===1){st=3;sel=0}else return leave();return dr()}if(st===3){ui("TAB");if(sel===0)so=so?0:1;else if(sel===1)mo=mo?0:1;else if(sel===2){vol=(vol+10)%110;av()}else{st=2;sel=1;return dr()}sv();return dr()}st=2;sel=0;ui("TAB");dr()}
  function move(d){if(st===1){flap(92+Math.min(3,Math.abs(d))*24);snd("PAD");return}if(st===0){st=1;flap(170);snd("PAD");last=getTime();return dr()}let n=st===3?4:st===2?3:2,o=sel;sel=cl(sel+d,0,n-1);if(sel!==o)ui("SCROLL"),dr()}
  function k1(d){if(d)move(d);else press()}
  function k2(d){if(d)move(d)}
  function rm(){if(tm)clearInterval(tm);if(mt)clearTimeout(mt);tm=mt=0;Pip.removeListener("knob1",k1);Pip.removeListener("knob2",k2);SN=0;br();db=0}
  let s=jr();hi=s&&s.fh||0;av();bf();reset();tm=setInterval(step,30);Pip.onExclusive("knob1",k1);Pip.onExclusive("knob2",k2);return{id:"BBFLOAT",notDefault:!0,fullscreen:!0,remove:rm}
});
