(function(params){
  h.clear(1);
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS",AO={encoding:"adpcm",sampleRate:8000,blockAlign:256,overlap:!0};
  const W=480,G=280,X=84,R=8;
  let so=!params||params.sound!==0,mo=params&&params.music!==0,vol=params&&params.vol!==void 0?params.vol:70,dp=params&&params.disp!==void 0?params.disp!==0:0;
  let st=0,sel=0,tm=0,mt=0,last=getTime(),started=last,y=G-R,v=0,ground=1,hold=0,dist=0,road=0,next=180,seed=1,obs=[],hi=0,SN=0,bo={},db=0;
  function cl(n,a,b){return Math.max(a,Math.min(b,n))}
  function ds(){try{return db||(db=eval(fs.readFileSync(DB))())}catch(e){return 0}}
  function jr(){try{let s=ds();return s?s(SF):{}}catch(e){return {}}}
  function sv(){let s=jr();s.sound=so?1:0;s.music=mo?1:0;s.vol=vol;s.rh=hi;try{let d=ds();if(d)d(SF,s)}catch(e){}}
  function av(){try{let n=Math.round(vol*27/100);if(global.__bbVol!==n){Pip.setVol(n);global.__bbVol=n}}catch(e){}}
  function bf(){try{bo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};Pip.blitOptions.vsync=1;if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1}catch(e){}}
  function br(){try{bo.v===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bo.v;bo.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bo.i;bo.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bo.n}catch(e){}}
  function ui(k){if(so)try{Pip.playSound(k)}catch(e){}}
  function snd(k){if(!so)return;try{if(!SN)SN={PAD:Pip.audioRead(DIR+"PAD.WAV"),GAME:Pip.audioRead(DIR+"GAME.WAV")};Pip.audioStartVar(SN[k],AO)}catch(e){}}
  function difficulty(){return cl(dist/850,0,1)}
  function speed(){return 154+difficulty()*134}
  function gap(){seed=(seed*47+23)%997;return Math.max(264,312+seed%104-(difficulty()*60|0))}
  function add(xx){seed=(seed*53+31)%997;let d=difficulty(),air=dist>28&&seed%Math.max(3,7-(d*4|0))===0;if(air&&obs.length&&obs[obs.length-1].k===2&&seed%2===0)air=0;let wide=seed%5===0,w=air?(wide?41:34):(wide?27:17)+(d*6|0),hh=air?18+(d*4|0):17+(seed%3)*5+(d*8|0),kind=air?2:seed%4===0?1:0;obs.push({x:xx,w:w,h:hh,y:air?G-91-(seed%2)*10+(d*10|0):G-hh,k:kind})}
  function reset(){st=sel=0;y=G-R;v=dist=road=hold=0;ground=1;next=180;seed=((getTime()*1000)|0)%997;obs=[];last=started=getTime();dr()}
  function brick(x,yy,w,hh){h.setColor(3).fillRect(x|0,yy|0,(x+w)|0,(yy+hh)|0).setColor(0);for(let q=(yy|0)+7;q<yy+hh;q+=8)h.drawLine(x|0,q,(x+w)|0,q);for(let q=(x|0)+9;q<x+w;q+=12)h.drawLine(q,yy|0,q,(yy+hh)|0);h.setColor(3).drawRect(x|0,yy|0,(x+w)|0,(yy+hh)|0)}
  function obstacle(o){let x=o.x|0,yy=o.y|0;if(o.k===1){let base=Math.max(5,o.h-11);brick(x,G-base,o.w,base);for(let q=x+4;q<x+o.w;q+=9)h.fillPoly([q,G-base,q+4,G-base-11,q+8,G-base])}else brick(x,yy,o.w,o.h)}
  function roadDraw(){h.setColor(3).fillRect(18,G,462,308).setColor(0);let off=(road|0)%24;for(let x=18-off;x<462;x+=24)h.drawLine(x,G,x,308);h.drawLine(18,G+13,462,G+13);h.setColor(3).drawLine(18,G,462,G)}
  function box(t,yy,on){h.setColor(on?1:0).fillRect(106,yy-11,374,yy+11).setColor(3).drawRect(106,yy-11,374,yy+11).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,yy+1)}
  function menu(title,items,yy){h.setColor(0).fillRect(82,58,398,272).setColor(3).drawRect(82,58,398,272).setFontMonofonto18().setFontAlign(0,0).drawString(title,240,84);for(let i=0;i<items.length;i++)box(items[i],yy+i*27,sel===i)}
  function items(){return["SOUND: "+(so?"ON":"OFF"),"MUSIC: "+(mo?"ON":"OFF"),"VOLUME: "+vol+"%","BACK"]}
  function dr(){h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("BOUNCE RUN",240,10).setFontMonofonto14().setFontAlign(-1,0).drawString("SCORE "+(dist|0),34,38).setFontAlign(1,0).drawString("HI "+hi,446,38).drawLine(30,56,450,56);roadDraw();for(let i=0;i<obs.length;i++)obstacle(obs[i]);h.setColor(3).fillCircle(X,y|0,R);if(dist<10&&getTime()-started<3)h.setFontMonofonto18().setFontAlign(0,0).drawString("TURN KNOB TO JUMP",240,206);if(st===1)menu("PAUSED",["CONTINUE","SETTINGS","EXIT GAME"],128);else if(st===2)menu("SETTINGS",items(),114);else if(st===3)menu("GAME OVER",["REMATCH","EXIT GAME"],142);h.flip();Pip.lastFlip=getTime()}
  function jump(){if(ground){v=-264;ground=0;hold=0;snd("PAD")}else if(hold<.2&&v<0){v=Math.max(-370,v-58);hold+=.04}}
  function finish(){st=3;sel=0;if((dist|0)>hi)hi=dist|0,sv();snd("GAME");dr()}
  function step(){let t=getTime(),dt=Math.min(.06,t-last);last=t;if(st)return;let sp=speed();dist+=sp*dt*.1;road+=sp*dt;v=cl(v+768*dt,-380,430);y+=v*dt;if(y>=G-R){y=G-R;v=0;ground=1}for(let i=obs.length-1;i>=0;i--){let o=obs[i];o.x-=sp*dt;if(o.x+o.w<-14)obs.splice(i,1)}next-=sp*dt;if(next<=0){add(W+16);next=gap()}for(let i=0;i<obs.length;i++){let o=obs[i],hx=X+R-1>o.x+2&&X-R+1<o.x+o.w-2,hy=y+R-1>o.y+2&&y-R+1<o.y+o.h-2;if(hx&&hy)return finish()}dr()}
  function leave(){rm();h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();Pip.lastFlip=getTime();E.defrag();if(!global.__bbRunBack)global.__bbRunBack=Function("delete global.__bbRunBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))();");mt=setTimeout(global.__bbRunBack,20)}
  function press(){if(st===3){ui("TAB");return sel===0?reset():leave()}if(st===1){ui("TAB");if(sel===0){st=0;last=getTime()}else if(sel===1){st=2;sel=0}else return leave();return dr()}if(st===2){ui("TAB");if(sel===0)so=so?0:1;else if(sel===1)mo=mo?0:1;else if(sel===2){vol=(vol+10)%110;av()}else{st=1;sel=1;return dr()}sv();return dr()}st=1;sel=0;ui("TAB");dr()}
  function move(d){if(!st){jump();return}let n=st===2?4:st===1?3:2,o=sel;sel=cl(sel+d,0,n-1);if(sel!==o)ui("SCROLL"),dr()}
  function k1(d){if(d)move(d);else press()}
  function k2(d){if(d)move(d)}
  function rm(){if(tm)clearInterval(tm);if(mt)clearTimeout(mt);tm=mt=0;Pip.removeListener("knob1",k1);Pip.removeListener("knob2",k2);SN=0;br();db=0}
  let s=jr();hi=s&&s.rh||0;av();bf();reset();tm=setInterval(step,30);Pip.onExclusive("knob1",k1);Pip.onExclusive("knob2",k2);return{id:"BBRUNNER",notDefault:!0,fullscreen:!0,remove:rm}
});
