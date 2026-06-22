// ===========================================================================
//  RAD RUNNER  -  endless 3-lane wasteland runner  (Pip-Boy 3000 holotape)
//  Espruino.  Art embedded.  Ported from the browser test build.
//
//  Right wheel : ROTATE -> change lane
//  Left  wheel : UP=jump(roach)  DOWN=duck(sign)  CLICK=shoot(ghoul)
//                wrecked car = must dodge.   Score = distance.
//  Swap LANE_KNOB/ACTION_KNOB if reversed; flip INVERT_VERT for up/down.
// ===========================================================================
(function () {
  var LANE_KNOB="knob2", ACTION_KNOB="knob1", INVERT_VERT=true;

  var W=h.getWidth(), Hh=h.getHeight();
  var HY=(Hh*0.42)|0, PY=Hh-((Hh*0.10)|0);
  var BG=0, DIM=1, MID=2, HI=3;                  // green shade indices (tweak if off)
  var LANE_X=[-1,0,1], ROAD_BOT=(W*0.46)|0;

  // ---- embedded sprites (2bpp, own green palette, 0=transparent) ----
  var PAL=new Uint16Array([0,3013,9800,32754]);
  var RAW={runner:{w:11,h:22,b:"AL6AC/8AP/gAv+AK/oAKqgAqoAKqoCqqqqqqqmqmqquUqqqAiqkAKqgAZpABlkACqQAqYABlQAGQAAFAAA=="},ghoul:{w:10,h:24,b:"AugAL4AL/ACqoAqoACqACqoCqqgqqoKqqKaqimqupqmqqpqqqqqqqgqqAKCgCgoAoKAKCgCgoC4LgoAo"},radroach:{w:21,h:15,b:"AEAAAEAACAAAgAACAqQgAAAqqqAAAAquqAAAAq/qQAABquqQAABq+qQAApquqaACqq/pqgCKquqogqJquqYqAoKqoKACoKioKgKAIAIAoA=="},car:{w:30,h:20,b:"AAAAAAAAAAAACoAAAAAAAACqqqqEAAAAKqqqqqAAAAqlWpWqAAAAqVv/6pAAABqVv/qqQAAFqqqqqqaAAqq+uvvqqAC/qquvqq6gKq6qqqqbqoKWqaqqpqqoKmqqqqqqqoKWqVVVVqpkGmVVVVVVqUqqamqVqqppqqqq76qqqpWWqlqqqaqUFVVVVVVVVUFVRUAUBRVU"},sign:{w:29,h:22,b:"AqaqqqqmoACllWlapWgAJqqqmqpWAAmqqqqqpUACaqqmqqpQAKqqqaqqqAKmqqqqqqqAqqqqqqqqpCaqqqqaqpUKVVVVVVVWAplAAAAAWYCqAAAAAAKgKgAAAAAAKQpAAAAAAApCgAAAAAACkKAAAAAAAKQkAAAAAAAoCgAAAAAACkKAAAAAAAKQoAAAAAAApGkAAAAAAGkaUAAAAAAqUA=="}};
  function dec(o){var s=atob(o.b),u=new Uint8Array(s.length),i;
    for(i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
    return {width:o.w,height:o.h,bpp:2,transparent:0,palette:PAL,buffer:u.buffer};}
  var IMG={};
  (function(){for(var k in RAW){try{IMG[k]=dec(RAW[k]);}catch(e){IMG[k]=null;}}})();

  // ---- tunables (per second; multiplied by dt) ----
  var TICK=60, DT=TICK/1000;
  var SPD0=.34, SPDMAX=.85, SPDINC=.0058, JUMP_T=.64, DUCK_T=.64, PCURVE=2.0;

  var state="ready", lane=1, speed=SPD0, dist=0, best=0, phase=0;
  var spawnT=1.1, propT=0, air=0, duck=0, fx=0, step=0, shotTo=null;
  var ents=[], props=[], loop=null, deathBy="";
  var HS="HOLO/RADRUNNER/HISCORE.JSON";
  try{var _hv=JSON.parse(fs.readFileSync(HS));if(typeof _hv==="number")best=_hv;}catch(e){}

  function clamp(v,a,b){return v<a?a:v>b?b:v;}
  function snd(n){try{Pip.playSound(n);}catch(e){}}
  function projY(z){var t=1-z;if(t<0)t=0;return HY+(Hh-HY)*Math.pow(t,PCURVE);}
  function halfW(y){var t=clamp((y-HY)/(Hh-HY),0,1);return 5+t*(ROAD_BOT-5);}
  function halfWraw(y){return 5+((y-HY)/(Hh-HY))*(ROAD_BOT-5);}
  var PLT=(PY-HY)/(Hh-HY), zHit=1-Math.pow(PLT,1/PCURVE);
  var MTN=[];                                   // desert mesa skyline (built once)
  (function(){var x=0;MTN.push(0,HY);
    while(x<W){var w=8+((Math.random()*W*0.18)|0), ht=(HY*0.14+Math.random()*HY*0.34)|0;
      if(Math.random()<0.55){MTN.push(x,HY-ht);MTN.push((x+w*0.7)|0,HY-ht);} else {MTN.push((x+w/2)|0,HY-ht);}
      x+=w;}
    MTN.push(W,HY);})();
  function laneX(l,y){return W/2+LANE_X[l]*halfW(y)*0.62;}

  function reset(){lane=1;speed=SPD0;dist=0;phase=0;spawnT=1.1;propT=0;air=0;duck=0;fx=0;step=0;shotTo=null;ents=[];props=[];deathBy="";}
  function start(){reset();state="play";snd("SELECT");}
  function go(){if(state!=="play")start();}
  function over(t){state="over";deathBy=t||"";if(dist>best){best=dist;try{fs.writeFileSync(HS,JSON.stringify(Math.round(best)));}catch(e){}}snd("SELECT");}

  function spawn(){
    var pW=clamp((speed-SPD0)/(SPDMAX-SPD0),0,1)*0.22;
    if(Math.random()<pW){var t=Math.random()<.5?"rock":"barrier";for(var l=0;l<3;l++)ents.push({z:1,lane:l,type:t});}
    else{var ln=(Math.random()*3)|0,r=Math.random();var ty=r<.3?"rock":r<.55?"barrier":r<.8?"ghoul":"car";ents.push({z:1,lane:ln,type:ty});}
  }
  function spawnProp(){var K=["rock","bush","pole","rock","bush","rock"];
    props.push({z:1,side:Math.random()<.5?-1:1,off:1.95+Math.random()*1.45,kind:K[(Math.random()*K.length)|0]});}
  function jump(){if(state==="play"){air=JUMP_T;duck=0;snd("SCROLL");}}
  function crouch(){if(state==="play"){duck=DUCK_T;air=0;snd("SCROLL");}}
  function shoot(){if(state!=="play"){go();return;}fx=.12;
    var bi=-1,bz=9;for(var i=0;i<ents.length;i++){var e=ents[i];if((e.type==="ghoul"||e.type==="rock")&&e.lane===lane&&e.z>0&&e.z<bz){bz=e.z;bi=i;}}
    if(bi>=0){var e2=ents[bi],y=projY(e2.z);shotTo={x:laneX(e2.lane,y),y:y-6};ents.splice(bi,1);snd("HIGHLIGHT");}
    else shotTo={x:laneX(lane,HY+6),y:HY+6};}

  function update(dt){
    speed=Math.min(SPDMAX,speed+SPDINC*dt);phase=(phase+speed*0.9*dt)%1;dist+=speed*60*dt;step+=dt;
    if(air>0)air-=dt;if(duck>0)duck-=dt;
    for(var i=ents.length-1;i>=0;i--){var e=ents[i];e.z-=speed*dt;
      if(!e.hit&&e.z<=zHit){e.hit=true;if(e.lane===lane){
        if(e.type==="rock"){if(air<=0)over("rock");}else if(e.type==="barrier"){if(duck<=0)over("barrier");}else over(e.type);}}
      if(e.z<=-0.25)ents.splice(i,1);}
    spawnT-=dt;if(spawnT<=0){spawn();spawnT=Math.max(.42,1.1-(speed-SPD0)*.75);}
    if(fx>0)fx-=dt;
  }

  function shadow(cx,y,w){h.setColor(DIM);var rw=w|0,rh=Math.max(1,(w*.32)|0);h.fillRect((cx-rw)|0,(y-rh)|0,(cx+rw)|0,(y+rh)|0);}
  function spr2(img,cx,baseY,sc){
    if(!img){h.setColor(MID).fillRect((cx-4)|0,(baseY-8)|0,(cx+4)|0,baseY|0);return;}
    var w=img.width*sc,ht=img.height*sc;
    try{h.drawImage(img,(cx-w/2)|0,(baseY-ht)|0,{scale:sc});}
    catch(e){h.setColor(MID).fillRect((cx-w/2)|0,(baseY-ht)|0,(cx+w/2)|0,baseY|0);}
  }
  function bgDraw(){
    h.setColor(BG).fillRect(0,0,W-1,Hh-1);
    h.setColor(DIM).fillRect(0,0,W-1,HY-1);   // sky
    try{h.setColor(BG).fillPoly(MTN);}catch(e){}  // desert mesas
    h.setColor(MID).drawLine(0,HY,W-1,HY);    // horizon
  }
  function drawRoad(){
    var cx=W/2;
    try{h.setColor(MID).fillPoly([cx-5,HY, cx+5,HY, cx+ROAD_BOT,Hh-1, cx-ROAD_BOT,Hh-1]);}
    catch(e){for(var y=HY;y<Hh;y++){var hw=halfW(y);h.setColor(MID).fillRect((cx-hw)|0,y,(cx+hw)|0,y);}}
    h.setColor(HI).drawLine(cx-5,HY,cx-ROAD_BOT,Hh-1).drawLine(cx+5,HY,cx+ROAD_BOT,Hh-1);
    for(var k=0;k<9;k++){var r=((k/9)+phase)%1,y=projY(1-r),hw=halfW(y),t=(y-HY)/(Hh-HY);
      if((k&1)===0){h.setColor(HI);var s=Math.max(1,(t*3)|0);
        h.fillRect((cx-hw/3-s/2)|0,y|0,(cx-hw/3+s/2)|0,(y+s)|0);
        h.fillRect((cx+hw/3-s/2)|0,y|0,(cx+hw/3+s/2)|0,(y+s)|0);}}
  }
  function drawProp(p){var y=projY(p.z);if(y<HY-2)return;
    var t=Math.max(0,1-p.z),s=Math.pow(Math.min(t,1.5),1.4),cx=W/2+p.side*halfW(y)*p.off;
    if(cx<-70||cx>W+70)return;var k=7+s*55;
    h.setColor(DIM);
    if(p.kind==="pole"){var hh=k*2.5;h.fillRect((cx-1)|0,(y-hh)|0,(cx+1)|0,y|0);h.fillRect((cx-k*.3)|0,(y-hh*.84)|0,(cx+k*.3)|0,(y-hh*.84+1)|0);}
    else{h.fillRect((cx-k*.5)|0,(y-k*.55)|0,(cx+k*.5)|0,y|0);}
  }
  function drawE(e){var t=Math.max(0,1-e.z),y=projY(e.z);if(y<HY-4)return;
    var sc=.22+Math.pow(Math.min(t,1.3),1.5)*1.5,im=(e.type==="rock"?IMG.radroach:e.type==="barrier"?IMG.sign:e.type==="ghoul"?IMG.ghoul:IMG.car);
    var w=(im?im.width:8)*sc, ex=W/2+LANE_X[e.lane]*halfWraw(y)*0.62;
    if(e.type!=="barrier")shadow(ex,y,w*.5);
    spr2(im,ex,y,sc);}
  function drawPlayer(){
    var sc=1.5;if(duck>0)sc=1.05;
    var lift=air>0?Math.sin((1-air/JUMP_T)*Math.PI)*Hh*0.16:0;
    var stride=(state==="play"&&air<=0&&duck<=0)?Math.abs(Math.sin(step*(7+speed*3))):0;
    var px=laneX(lane,PY), py=PY-lift-stride*3.5;
    var ph=(IMG.runner?IMG.runner.height:18)*sc;
    shadow(px,PY,11*sc*(air>0?0.6:(1-stride*0.22)));
    spr2(IMG.runner,px,py,sc);
    if(fx>0&&shotTo){var mx=px+4*sc,my=py-ph*0.42;h.setColor(HI).drawLine(mx|0,my|0,shotTo.x|0,shotTo.y|0);
      h.fillRect((mx-2)|0,(my-2)|0,(mx+2)|0,(my+2)|0).fillRect((shotTo.x-2)|0,(shotTo.y-2)|0,(shotTo.x+2)|0,(shotTo.y+2)|0);}
  }
  function hud(){
    h.setColor(HI).setFont("Monofonto14").setFontAlign(-1,-1);
    h.drawString("DIST "+(dist/1000).toFixed(2)+"KM",4,4);
    h.setFontAlign(0,-1).setFont("Monofonto16").drawString("RAD RUNNER",W/2,4);
  }
  function box(L){var bw=(W*.82)|0,bh=22*L.length+24,bx=(W-bw)/2,by=(Hh-bh)/2;
    h.setColor(BG).fillRect(bx,by,bx+bw,by+bh);h.setColor(HI).drawRect(bx,by,bx+bw,by+bh);h.setFontAlign(0,-1);
    for(var i=0;i<L.length;i++)h.setFont(i===0?"Monofonto16":"Monofonto14").drawString(L[i],W/2,by+12+i*22);}
  function deathMsg(){
    if(deathBy==="rock")return ["Ran into a RADROACH!","Jump - scroll up"];
    if(deathBy==="barrier")return ["Ran into the SIGN!","Duck - scroll down"];
    if(deathBy==="ghoul")return ["Caught by a GHOUL!","Shoot - left click"];
    if(deathBy==="car")return ["Ran into a CAR!","Dodge - right wheel"];
    return ["",""];
  }
  function render(){
    bgDraw();drawRoad();
    var i;
    var d=ents.slice().sort(function(a,b){return b.z-a.z;});
    for(i=0;i<d.length;i++)if(d[i].z>=zHit)drawE(d[i]);
    drawPlayer();
    for(i=0;i<d.length;i++)if(d[i].z<zHit)drawE(d[i]);
    hud();
    if(state==="ready")box(["RAD RUNNER","R:lane  L up/dn:jump/duck","L click:shoot","CLICK TO RUN"]);
    else if(state==="over"){var dm=deathMsg();box(["WASTED",dm[0],dm[1],(dist|0)+" m  BEST "+(best|0),"CLICK TO RUN AGAIN"]);}
    h.flip();Pip.lastFlip=getTime();
  }
  var lastT=0;
  function tick(){var now=getTime(),dt=lastT?(now-lastT):0.06;lastT=now;if(dt>0.2)dt=0.2;if(dt<0.004)dt=0.004;if(state==="play")update(dt);render();}

  function onLane(dir){if(!dir){go();return;}if(state==="play"){lane=clamp(lane+(dir>0?1:-1),0,2);snd("SCROLL");}}
  function onAct(dir){if(!dir){if(state==="play")shoot();else go();return;}
    if(state!=="play")return;var up=INVERT_VERT?(dir<0):(dir>0);if(up)jump();else crouch();}

  Pip.onExclusive(LANE_KNOB,onLane);
  Pip.onExclusive(ACTION_KNOB,onAct);
  loop=setInterval(tick,TICK);
  render();
  return {id:"RADRUNNER",fullscreen:true,remove:function(){
    if(loop){clearInterval(loop);loop=null;}
    Pip.removeListener(LANE_KNOB,onLane);Pip.removeListener(ACTION_KNOB,onAct);
    h.clear();h.flip();}};
})
