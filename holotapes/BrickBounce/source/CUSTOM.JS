(function(params){
  h.clear(1);
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS",CF="SETTINGS/BBCUSTOM.TXT",BRF=DIR+"BRICKS.JS",MU=DIR+"INTRO.WAV";
  const EMPTY="000000000000000000000000000000000000000000000",BON="LSEB?FTM";
  let so=1,mo=1,vol=70,dp=0,psp=0,un=0,st=0,sel=0,lv=0,cur=0,dirty=0,act=0,bad=0,gm=1,df=1,data="",ed=[],IM=0,mt=0,lt=0,bo={},lastUi=0,cardTimer=0,cardDirty=0,lastCardMove1=0,lastCardMove2=0,db=0;
  function cl(n,a,b){return Math.max(a,Math.min(b,n))}
  function ds(){try{return db||(db=eval(fs.readFileSync(DB))())}catch(e){return 0}}
  function jr(){try{let s=ds();return s?s(SF):{}}catch(e){return {}}}
  function sv(){let s=jr();s.sound=so?1:0;s.music=mo?1:0;s.vol=vol;s.disp=dp?1:0;s.ps=psp;try{let d=ds();if(d)d(SF,s)}catch(e){}}
  function load(){try{data=fs.statSync(CF)?fs.readFileSync(CF):""}catch(e){data=""}while(data.length<450)data+=EMPTY;data=data.substr(0,450)}
  function save(){try{fs.writeFileSync(CF,data)}catch(e){}}
  function level(i){return data.substr(i*45,45)}
  function put(i,s){data=data.substr(0,i*45)+s.substr(0,45)+data.substr(i*45+45);save()}
  function valid(s){for(let i=0;i<45;i++)if("1234".indexOf(s[i])>=0)return 1;return 0}
  function invalid(){for(let i=0;i<10;i++)if(!valid(level(i)))return i;return -1}
  function av(){try{let n=Math.round(vol*27/100);if(global.__bbVol!==n){Pip.setVol(n);global.__bbVol=n}}catch(e){}}
  function bf(){try{bo={v:Pip.blitOptions.vsync,i:Pip.blitOptions.idleFilter,n:Pip.blitOptions.noScanEffect};Pip.blitOptions.vsync=1;if(dp)Pip.blitOptions.idleFilter=[0],Pip.blitOptions.noScanEffect=1}catch(e){}}
  function br(){try{bo.v===void 0?delete Pip.blitOptions.vsync:Pip.blitOptions.vsync=bo.v;bo.i===void 0?delete Pip.blitOptions.idleFilter:Pip.blitOptions.idleFilter=bo.i;bo.n===void 0?delete Pip.blitOptions.noScanEffect:Pip.blitOptions.noScanEffect=bo.n}catch(e){}}
  function ui(k){if(!so||(k==="SCROLL"&&mo))return;try{let t=getTime(),d=k==="SCROLL"?.22:.16;if(t-lastUi<d)return;lastUi=t;Pip.playSound(k)}catch(e){}}
  function music(){if(lt)clearTimeout(lt);if(!mo)return Pip.audioStop();lt=setTimeout(function(){lt=0;if(mo)try{Pip.audioStop();Pip.audioStart(MU,{repeat:!0})}catch(e){}},350)}
  function box(t,y,on,x1,x2){x1=x1||106;x2=x2||374;h.setColor(on?1:0).fillRect(x1,y-11,x2,y+11).setColor(3).drawRect(x1,y-11,x2,y+11).setFontMonofonto16().setFontAlign(0,0).drawString(t,(x1+x2)/2,y+1)}
  function menu(title,a,y,gap){h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString(title,240,48);gap=gap||28;for(let i=0;i<a.length;i++)box(a[i],y+i*gap,sel===i);h.flip();Pip.lastFlip=getTime()}
  function top(){menu("CUSTOM LEVELS",["START GAME","LEVEL EDITOR","BACK"],122,34)}
  function prev(s,x,y){for(let i=0;i<45;i++){let c=s[i];if(c&&c!=="0"){let xx=x+(i%9)*6,yy=y+((i/9)|0)*5;c==="9"?h.drawRect(xx,yy,xx+4,yy+3):h.fillRect(xx,yy,xx+4,yy+3)}}}
  function cards(){h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("LEVEL EDITOR",240,22);for(let i=0;i<10;i++){let c=i%2,r=(i/2)|0,x=24+c*228,y=42+r*47,on=sel===i;h.setColor(on?1:0).fillRect(x,y,x+204,y+40).setColor(3).drawRect(x,y,x+204,y+40).setFontMonofonto14().setFontAlign(-1,0).drawString("LEVEL "+(i+1),x+10,y+20);prev(level(i),x+135,y+8)}box("BACK",300,sel===10,174,306);h.flip();Pip.lastFlip=getTime()}
  function cardRedraw(){cardDirty=1;if(cardTimer)return;cardTimer=setInterval(function(){if(st!==1){clearInterval(cardTimer);cardTimer=cardDirty=0;return}if(cardDirty){cardDirty=0;cards()}},33)}
  function images(){if(!IM){E.defrag();IM=eval(fs.readFileSync(BRF))}return IM}
  function drawBrick(c,i){if(!c||c==="0")return;let x=42+(i%9)*45,y=72+((i/9)|0)*19,n=+c,im=images();h.drawImage(im[BON.indexOf(c)>=0?4:n===9?5:n===4?3:(n-1)%3],x,y)}
  function cname(c){return c==="0"?"EMPTY":c==="1"?"CLEAN":c==="2"?"RIBBED":c==="3"?"CIRCUIT":c==="4"?"ARMORED":c==="9"?"WALL":c==="L"?"LONG PADDLE":c==="S"?"SHORT PADDLE":c==="B"?"POWER BALL":c==="E"?"EXTRA LIFE":c==="F"?"FAST BALL":c==="T"?"SLOW BALL":c==="M"?"MULTI BALL":"RANDOM BONUS"}
  function editor(){h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("LEVEL "+(lv+1),240,28);for(let i=0;i<45;i++){let x=42+(i%9)*45,y=72+((i/9)|0)*19;if(ed[i]==="0")h.drawRect(x,y,x+40,y+14);else drawBrick(ed[i],i)}let x=42+(cur%9)*45,y=72+((cur/9)|0)*19;h.drawRect(x-3,y-3,x+43,y+17).drawRect(x-5,y-5,x+45,y+19).setFontMonofonto16().drawString(cname(ed[cur]),240,188).setFontMonofonto14().setFontAlign(-1,0).drawString("KNOB 1: BRICK TYPE",28,270).drawString("KNOB 2: MOVE CURSOR",28,292).setFontAlign(1,0).drawString("PRESS KNOB: MENU",452,292);h.flip();Pip.lastFlip=getTime()}
  function eitems(){let a=["CONTINUE"];if(BON.indexOf(ed[cur])>=0)a.push("BONUS TYPE");a.push("SETTINGS","CLEAR LEVEL","RANDOM FILLING","SAVE AND EXIT","CANCEL AND EXIT");return a}
  function emenu(){menu("LEVEL EDITOR",eitems(),86,27)}
  function settings(){menu("SETTINGS",["SOUND: "+(so?"ON":"OFF"),"MUSIC: "+(mo?"ON":"OFF"),"VOLUME: "+vol+"%","PADDLE SPEED: "+(psp===1?"SLOW":psp===2?"FAST":"NORMAL"),"BACK"],100,32)}
  function confirm(){menu(act===1?"CLEAR LEVEL?":act===2?"RANDOM FILL?":"LOSE UNSAVED CHANGES?",["NO","YES"],154,36)}
  function bonuses(){menu("BONUS ITEM",["RANDOM","LONG PADDLE","SHORT PADDLE","POWER BALL","EXTRA LIFE","FAST BALL","SLOW BALL","MULTI BALL","BACK"],72,25)}
  function mode(){menu("CUSTOM MODE",["ARCADE","CLASSIC","BACK"],122,34)}
  function diffs(){let a=["EASY","NORMAL"];if(un>0)a.push("HARD");if(un>1)a.push("INSANE");a.push("BACK");return a}
  function difficulty(){menu("CUSTOM DIFFICULTY",diffs(),92,30)}
  function notice(){h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("CUSTOM LEVELS",240,66).setFontMonofonto18().drawString("LEVEL "+(bad+1)+" IS EMPTY",240,126).drawString("EACH LEVEL NEEDS",240,170).drawString("AT LEAST ONE BRICK",240,196).setFontMonofonto14().drawString("PRESS KNOB: BACK",240,274).flip();Pip.lastFlip=getTime()}
  function redraw(){st===0?top():st===1?cards():st===2?editor():st===3?emenu():st===4?confirm():st===5?bonuses():st===6?mode():st===7?difficulty():st===8?notice():settings()}
  function openEditor(){lv=sel;ed=level(lv).split("");cur=0;dirty=0;sel=0;st=2;editor()}
  function cycle(d){let a="012349?",c=ed[cur],p=a.indexOf(c);if(p<0)p=6;p=(p+d+a.length)%a.length;ed[cur]=a[p];dirty=1;ui("SCROLL");editor()}
  function random(){let p="0011122349?";for(let i=0;i<45;i++)ed[i]=p[(Math.random()*p.length)|0];if(!valid(ed.join("")))ed[(Math.random()*45)|0]="1";dirty=1}
  function bonusCode(i){return"?LSBEFTM"[i]||"?"}
  function launch(){rm();Pip.audioStop();data="";ed=[];IM=0;global.__bbLaunch={custom:1,resume:0,sound:so?1:0,music:mo?1:0,vol:vol,disp:dp?1:0,ps:psp,save:0,high:0,mode:gm,diff:df,slot:0};h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();Pip.lastFlip=getTime();E.defrag();if(!global.__bbCustomStart)global.__bbCustomStart=Function("delete global.__bbCustomStart;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/START.JS\"))();");mt=setTimeout(global.__bbCustomStart,20)}
  function leave(){rm(1);data="";ed=[];IM=0;E.defrag();if(!global.__bbCustomExit)global.__bbCustomExit=Function("delete global.__bbCustomExit;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))({view:\"main\",keepMusic:1});");mt=setTimeout(global.__bbCustomExit,20)}
  function press(){
    ui("TAB");
    if(st===0){if(sel===0){bad=invalid();if(bad>=0)st=8;else st=6;sel=0}else if(sel===1)st=1,sel=0,lastCardMove1=lastCardMove2=0;else return leave();return redraw()}
    if(st===1){if(sel===10){st=0;sel=1;return top()}return openEditor()}
    if(st===2){st=3;sel=0;return emenu()}
    if(st===3){let a=eitems(),z=a[sel];if(z==="CONTINUE")st=2;else if(z==="BONUS TYPE")st=5,sel=0;else if(z==="SETTINGS")st=9,sel=0;else if(z==="CLEAR LEVEL")st=4,act=1,sel=0;else if(z==="RANDOM FILLING")st=4,act=2,sel=0;else if(z==="SAVE AND EXIT"){put(lv,ed.join(""));IM=0;E.defrag();st=1;sel=lv}else if(dirty)st=4,act=3,sel=0;else st=1,sel=lv;return redraw()}
    if(st===4){if(sel===1){if(act===1)ed=EMPTY.split(""),dirty=1,st=2;else if(act===2)random(),st=2;else IM=0,E.defrag(),st=1,sel=lv}else st=3,sel=0;return redraw()}
    if(st===5){if(sel<8)ed[cur]=bonusCode(sel),dirty=1;st=2;sel=0;return editor()}
    if(st===6){if(sel===2){st=0;sel=0}else gm=sel===0?1:0,st=7,sel=0;return redraw()}
    if(st===7){let a=diffs();if(sel===a.length-1){st=6;sel=0;return mode()}df=sel===0?0:sel===1?1:sel===2?2:3;return launch()}
    if(st===8){st=0;sel=0;return top()}
    if(st===9){if(sel===0)so=so?0:1;else if(sel===1)mo=mo?0:1,music();else if(sel===2){vol=(vol+10)%110;av()}else if(sel===3)psp=(psp+1)%3;else st=3,sel=eitems().indexOf("SETTINGS");sv();return redraw()}
  }
  function move(d,a){
    if(st===2){if(a===1)return cycle(d);let o=cur;cur=cl(cur+d,0,44);if(cur!==o)ui("SCROLL"),editor();return}
    let n=st===0?3:st===1?11:st===3?eitems().length:st===4?2:st===5?9:st===6?3:st===7?diffs().length:st===9?5:1,o=sel;
    if(st===1){
      let now=getTime(),lastMove=a===1?lastCardMove1:lastCardMove2;
      if(now-lastMove<.06)return;
      if(a===1)lastCardMove1=now;else lastCardMove2=now;
      if(a===1)sel=cl(sel+(d>0?2:-2),0,10);
      else if(sel<10){let c=sel%2,r=(sel/2)|0;c=cl(c+(d>0?1:-1),0,1);sel=r*2+c}
    }else sel=cl(sel+d,0,n-1);
    if(sel!==o){ui("SCROLL");if(st===1)cardRedraw();else redraw()}
  }
  function k1(d){if(d)move(d,1);else press()}
  function k2(d){if(d)move(d,2)}
  function rm(k){if(mt)clearTimeout(mt);if(lt)clearTimeout(lt);if(cardTimer)clearInterval(cardTimer);mt=lt=cardTimer=cardDirty=0;Pip.removeListener("knob1",k1);Pip.removeListener("knob2",k2);br();if(!k)Pip.audioStop();db=0}
  let s=jr();so=!s||s.sound!==0;mo=!s||s.music!==0;vol=s&&s.vol!==void 0?s.vol:70;dp=s&&s.disp!==void 0?s.disp!==0:0;psp=s&&s.ps||0;un=s&&s.u||0;load();av();bf();music();top();Pip.onExclusive("knob1",k1);Pip.onExclusive("knob2",k2);return{id:"BBCUSTOM",notDefault:!0,fullscreen:!0,remove:rm}
});
