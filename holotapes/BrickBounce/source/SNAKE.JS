(function(params){
  h.clear(1);
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS",AO={encoding:"adpcm",sampleRate:8000,blockAlign:256,overlap:!0};
  const C=38,R=20,CS=10,X=50,Y=78,W=C*CS,H=R*CS;
  let so=!params||params.sound!==0,mo=params&&params.music!==0,vol=params&&params.vol!==void 0?params.vol:70,dp=params&&params.disp!==void 0?params.disp!==0:0;
  let st=0,sel=0,tm=0,mt=0,last=getTime(),tick=0,dir=1,nd=1,sc=0,bites=0,bc=4,wrap=0,dif=1,body=[],food=0,bonus=-1,bexp=0,hs=[0,0],SN=0,bo={},db=0;
  function cl(v,a,b){return Math.max(a,Math.min(b,v))}
  function ds(){try{return db||(db=eval(fs.readFileSync(DB))())}catch(e){return 0}}
  function jr(){try{let s=ds();return s?s(SF):{}}catch(e){return {}}}
  function sv(){let s=jr(),m=Math.max(hs[0],hs[1]);s.sound=so?1:0;s.music=mo?1:0;s.vol=vol;s.sh=m;s.shs={wall:hs[0],wrap:hs[1]};try{let d=ds();if(d)d(SF,s)}catch(e){}}
  function av(){try{let v=Math.round(vol*27/100);if(global.__bbVol!==v){Pip.setVol(v);global.__bbVol=v}}catch(e){}}
  function bf(){try{bo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};Pip.blitOptions.vsync=1;if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1}catch(e){}}
  function br(){try{bo.v===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bo.v;bo.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bo.i;bo.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bo.n}catch(e){}}
  function ui(k){if(so)try{Pip.playSound(k)}catch(e){}}
  function snd(k){if(!so)return;try{if(!SN)SN={HIT:Pip.audioRead(DIR+"HIT.WAV"),POWER:Pip.audioRead(DIR+"POWER.WAV"),GAME:Pip.audioRead(DIR+"GAME.WAV")};Pip.audioStartVar(SN[k],AO)}catch(e){}}
  function occ(p){for(let i=0;i<body.length;i++)if(body[i]===p)return 1;return 0}
  function free(p,af,ab){return p>=0&&p<C*R&&!occ(p)&&(!af||p!==food)&&(!ab||p!==bonus)}
  function spawn(){for(let i=1;i<90;i++){let z=(((getTime()*1000)|0)+i*110351+sc*97)%(C*R);if(free(z,0,1)){food=z;return}}for(let p=0;p<C*R;p++)if(free(p,0,1)){food=p;return}}
  function spawnBonus(){for(let i=1;i<90;i++){let z=(((getTime()*1000)|0)+i*214013+sc*73+bites*997)%(C*R);if(free(z,1,0)){bonus=z;bexp=getTime()+4;return}}}
  function mul(){return dif===0?1:dif===2?3:2}
  function speed(){return dif===0?.18:dif===2?.09:Math.max(.09,.16-((bites/7)|0)*.012)}
  function dname(){return dif===0?"EASY":dif===2?"HARD":"NORMAL"}
  function reset(){let x=(C/2)|0,y=(R/2)|0,p=y*C+x;body=[p,p-1,p-2];dir=nd=1;tick=sc=bites=sel=0;bc=4+(((getTime()*10)|0)&1);bonus=-1;spawn();st=2;last=getTime();dr()}
  function cell(p,f){let x=X+(p%C)*CS,y=Y+((p/C)|0)*CS;if(f)h.fillRect(x+1,y+1,x+CS-2,y+CS-2);else h.drawRect(x+2,y+2,x+CS-3,y+CS-3)}
  function gem(p){let x=X+(p%C)*CS+CS/2,y=Y+((p/C)|0)*CS+CS/2;h.fillPoly([x,y-5,x+5,y,x,y+5,x-5,y])}
  function box(t,y,on){h.setColor(on?1:0).fillRect(106,y-11,374,y+11).setColor(3).drawRect(106,y-11,374,y+11).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,y+1)}
  function menu(title,items,y){h.setColor(0).fillRect(82,58,398,272).setColor(3).drawRect(82,58,398,272).setFontMonofonto18().setFontAlign(0,0).drawString(title,240,84);for(let i=0;i<items.length;i++)box(items[i],y+i*27,sel===i)}
  function settings(){return["SOUND: "+(so?"ON":"OFF"),"MUSIC: "+(mo?"ON":"OFF"),"VOLUME: "+vol+"%","BACK"]}
  function dr(){
    h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("SNAKE",240,10);
    if(st<2){if(st===0)menu("SNAKE MODE",["CLASSIC","BORDERLESS","BACK"],128);else menu("SNAKE DIFFICULTY",["EASY","NORMAL","HARD","BACK"],114);h.flip();Pip.lastFlip=getTime();return}
    h.setFontMonofonto14().setFontAlign(-1,0).drawString("SCORE "+sc,X,42).setFontAlign(0,0).drawString(dname()+" "+(wrap?"BORDERLESS":"CLASSIC"),240,42).setFontAlign(1,0).drawString("HI "+hs[wrap],X+W,42).drawRect(X-2,Y-2,X+W+2,Y+H+2);
    cell(food,0);if(bonus>=0&&(bexp-getTime()>=1||((getTime()*10)|0)&1))gem(bonus);for(let i=0;i<body.length;i++)cell(body[i],1);
    if(st===3)menu("PAUSED",["CONTINUE","SETTINGS","EXIT GAME"],128);else if(st===4)menu("SETTINGS",settings(),114);else if(st===5)menu("GAME OVER",["REMATCH","EXIT GAME"],142);
    h.flip();Pip.lastFlip=getTime()
  }
  function finish(){st=5;sel=0;if(sc>hs[wrap])hs[wrap]=sc,sv();snd("GAME");dr()}
  function sd(d){if((dir===1&&d===3)||(dir===3&&d===1)||(dir===2&&d===4)||(dir===4&&d===2))return;nd=d}
  function step(){let t=getTime(),dt=Math.min(.08,t-last);last=t;if(st!==2)return;if(bonus>=0&&t>=bexp)bonus=-1;tick+=dt;if(tick<speed()){if(bonus>=0&&((t*10)|0)!==(((t-dt)*10)|0))dr();return}tick-=speed();dir=nd;let p=body[0],x=p%C,y=(p/C)|0;if(dir===1)x++;else if(dir===2)y++;else if(dir===3)x--;else y--;if(wrap){x=(x+C)%C;y=(y+R)%R}else if(x<0||x>=C||y<0||y>=R)return finish();let n=y*C+x;if(occ(n))return finish();body.unshift(n);let ate=n===food,got=n===bonus;if(ate){sc+=mul();bites++;bc--;spawn();if(bc<=0){spawnBonus();bc=4+((bites+((t*10)|0))&1)}snd("HIT")}else body.pop();if(got){sc+=(3+Math.ceil(Math.max(0,bexp-t)))*mul();bonus=-1;snd("POWER")}dr()}
  function leave(){rm();h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();Pip.lastFlip=getTime();E.defrag();if(!global.__bbSnakeBack)global.__bbSnakeBack=Function("delete global.__bbSnakeBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))();");mt=setTimeout(global.__bbSnakeBack,20)}
  function press(){
    if(st===0){ui("TAB");if(sel===2)return leave();wrap=sel;sel=0;st=1;return dr()}
    if(st===1){ui("TAB");if(sel===3){st=0;sel=wrap;return dr()}dif=sel;return reset()}
    if(st===5){ui("TAB");return sel===0?reset():leave()}
    if(st===3){ui("TAB");if(sel===0){st=2;last=getTime()}else if(sel===1){st=4;sel=0}else return leave();return dr()}
    if(st===4){ui("TAB");if(sel===0)so=so?0:1;else if(sel===1)mo=mo?0:1;else if(sel===2){vol=(vol+10)%110;av()}else{st=3;sel=1;return dr()}sv();return dr()}
    st=3;sel=0;ui("TAB");dr()
  }
  function move(d,a){if(st!==2){let n=st===0?3:st===1||st===4?4:st===3?3:2,o=sel;sel=cl(sel+d,0,n-1);if(o!==sel)ui("SCROLL"),dr();return}if(a===1)sd(d>0?2:4);else sd(d>0?1:3)}
  function k1(d){if(d)move(d,1);else press()}
  function k2(d){if(d)move(d,2)}
  function rm(){if(tm)clearInterval(tm);if(mt)clearTimeout(mt);tm=mt=0;Pip.removeListener("knob1",k1);Pip.removeListener("knob2",k2);SN=0;br();db=0}
  let s=jr(),q=s&&s.shs;if(q)hs=[q.wall||q.w||0,q.wrap||q.b||0];else hs=[s&&s.sh||0,0];av();bf();dr();tm=setInterval(step,30);Pip.onExclusive("knob1",k1);Pip.onExclusive("knob2",k2);
  return{id:"BBSNAKE",notDefault:!0,fullscreen:!0,remove:rm}
});
