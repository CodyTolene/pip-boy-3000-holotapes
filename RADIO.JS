(function(){
var ID="RADIO",rd=Pip.radio,fs=require("fs"),W=h.getWidth(),H=h.getHeight(),sel=0,removed=false,waveTimer=0,wave=0;
try{if(!Pip.radioOn&&!rd.mjOn)rd.init()}catch(e){}
function install(){
 if(!Pip._mjStart&&Pip.audioStart){Pip._mjStart=Pip.audioStart;Pip.audioStart=new Function("p","var r=Pip.radio;if(r&&r.mjOn&&!r.mjAllow)return 0;if(r&&r.mjOn){r.mjNoNext=1;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)}return Pip._mjStart.apply(Pip,arguments)")}
 if(!Pip._mjStop&&Pip.audioStop){Pip._mjStop=Pip.audioStop;Pip.audioStop=new Function("var r=Pip.radio;if(r&&r.mjOn&&!r.mjAllow)return 0;if(r&&r.mjOn){r.mjNoNext=1;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)}return Pip._mjStop.apply(Pip,arguments)")}
 rd.mjNext=new Function("var r=Pip.radio,fs=require('fs'),S=r.mjStations||[],si=r.mjStationIndex||0,st=S[si],n=st&&st.t,pre=st&&st.p,i,j,x,d,p;if(!n||!n.length){d=['MUSIC/Mojave Music','/MUSIC/Mojave Music','MUSIC','/MUSIC'];p=['MUSIC/Mojave Music/','/MUSIC/Mojave Music/','MUSIC/','/MUSIC/'];S=[];for(i=0;i<d.length;i++){try{x=fs.readdir(d[i])}catch(e){continue}n=[];for(j=0;j<x.length;j++){x[j]=''+x[j];if(/\\.(wav|wave)$/i.test(x[j]))n.push(x[j])}if(n.length)S.push({n:d[i].split('/').pop(),p:p[i],t:n})}r.mjStations=S;si=0;st=S[0];n=st&&st.t;pre=st&&st.p}if(!n||!n.length){r.mjOn=0;r.mojaveStation=0;Pip.radioClipPlaying=0;return}i=(r.mjTrackIndex==undefined?-1:r.mjTrackIndex)+1;if(i>=n.length)i=0;r.mjStationIndex=si;r.mjTrackIndex=i;r.mojaveCurrent=pre+n[i];r.mjOn=1;r.mojaveStation=1;Pip.radioClipPlaying=1;try{r.setPower(false)}catch(e){}r.mjNoNext=1;r.mjAllow=1;try{Pip.audioStop()}catch(e){}try{Pip.audioStart(r.mojaveCurrent)}catch(e){r.mjOn=0;r.mojaveStation=0;Pip.radioClipPlaying=0;r.mojaveError=''+e}r.mjAllow=0;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)");
 if(rd.mjHandler)try{Pip.removeListener("audioStopped",rd.mjHandler)}catch(e){}
 rd.mjHandler=new Function("var r=Pip.radio;if(!r||!r.mjOn||r.mjNoNext)return;setTimeout(function(){var r=Pip.radio;if(!r||!r.mjOn||r.mjNoNext)return;try{if(Pip.audioIsPlaying&&Pip.audioIsPlaying())return}catch(e){}if(r.mjNext)r.mjNext()},30)");
 Pip.on("audioStopped",rd.mjHandler)
}
install();
function dir(p){try{return fs.statSync("/"+p).dir}catch(e){try{return fs.statSync(p).dir}catch(e2){return false}}}
function wavs(p){
 var a=[],x,i,s;
 try{x=fs.readdir(p)}catch(e){return a}
 for(i=0;i<x.length;i++){s=""+x[i];if(/\.(wav|wave)$/i.test(s))a.push(s)}
 return a
}
function scan(force){
 if(rd.mjStations&&!force)return rd.mjStations;
 var root="MUSIC",S=[],x=[],i,n,p;
 try{x=fs.readdir(root)}catch(e){try{x=fs.readdir("/"+root);root="/MUSIC"}catch(e2){rd.mojaveError=""+e2}}
 for(i=0;i<x.length;i++){
  p=root+"/"+x[i];
  if(dir(p)){n=wavs(p);if(n.length)S.push({n:""+x[i],p:p+"/",t:n})}
 }
 n=wavs(root);
 if(n.length)S.push({n:"MUSIC",p:root+"/",t:n});
 rd.mjStations=S;
 if(!rd.mjStationIndex||rd.mjStationIndex>=S.length)rd.mjStationIndex=0;
 return S
}
function stationName(){
 var S=scan(0),s=S[rd.mjStationIndex||0];
 return s?s.n:"NO STATIONS"
}
function musicOn(){rd.mjOn=1;rd.mojaveStation=1;if(rd.mjNext)rd.mjNext();draw()}
function musicOff(){
 rd.mjOn=0;rd.mojaveStation=0;Pip.radioClipPlaying=0;rd.mjNoNext=1;rd.mjAllow=1;
 try{Pip.audioStop()}catch(e){}
 rd.mjAllow=0;draw()
}
function nextStation(){
 var S=scan(0);
 if(!S.length)return;
 rd.mjStationIndex=((rd.mjStationIndex||0)+1)%S.length;
 rd.mjTrackIndex=-1;
 if(rd.mjOn)musicOn();
 draw()
}
function tuneStation(d){
 var S=scan(0),i;
 if(!S.length)return;
 i=(rd.mjStationIndex||0)+(d>0?1:-1);
 if(i<0)i=S.length-1;
 if(i>=S.length)i=0;
 rd.mjStationIndex=i;
 rd.mjTrackIndex=-1;
 if(rd.mjOn)musicOn();
 draw()
}
function tuneTrack(d){
 var S=scan(0),s=S[rd.mjStationIndex||0],n=s&&s.t,i;
 if(!n||!n.length)return;
 i=rd.mjTrackIndex==undefined?-1:rd.mjTrackIndex;
 i+=d>0?1:-1;
 if(i<0)i=n.length-1;
 if(i>=n.length)i=0;
 rd.mjTrackIndex=i-1;
 if(rd.mjNext)rd.mjNext();
 draw()
}
function nextTrack(){if(rd.mjNext)rd.mjNext();draw()}
function vol(v){
 if(v===undefined){try{return rd.getVol?rd.getVol():Math.ceil((15&rd.read_reg(5))/1.5)}catch(e){return 0}}
 try{if(rd.setVol)rd.setVol(v);else{var n=Math.floor(1.5*v);rd.write_reg(5,65520&rd.read_reg(5)|15&n)}}catch(e){}
}
function tuner(){
 var x=398,y=72,h2=180,px=h2/5,cf=(rd.freq||9500)/100,sf=Math.max(76,Math.floor(cf-3)),ef=Math.min(108,Math.ceil(cf+2)),yy=y+h2/2+((rd.freq||9500)-100*sf)/100*px,i,m;
 h.setClipRect(x,y,W-1,y+h2).clearRect(x,y,W-1,y+h2);
 try{Pip.shadeBox(406,151,466,173)}catch(e){h.setColor(1).drawRect(406,151,466,173)}
 h.setColor(3).setFont("Monofonto14").setFontAlign(-1,0);
 if(!rd.mjOn)h.drawString(((rd.freq||0)/100).toFixed(1)+" MHz",408,164);
 h.drawLine(466,y,466,y+h2);
 h.setFontAlign(0,-1);
 for(m=sf;m<=ef;m++)for(i=0;i<6&&m+i/6<=108;i++){if(i==0)h.drawString(m,436,yy+4);h.fillRect(466-(i==0?35:i%2?4:7),yy,466,yy+1);yy-=6}
 h.setClipRect(0,0,W-1,H-1)
}
var items=[
 ["FM Power",function(){var p=!Pip.radioOn;musicOff();try{rd.setPower(p);Pip.radioOn=p}catch(e){}draw()}],
 ["HAM Tuner",function(){rd.mjOn?musicOff():musicOn()}],
 ["Station",nextStation],
 ["Next Track",nextTrack],
 ["Seek up",function(){try{rd.seek(1,function(o){rd.freq=100*o.freq;draw()})}catch(e){}}],
 ["Seek down",function(){try{rd.seek(0,function(o){rd.freq=100*o.freq;draw()})}catch(e){}}],
 ["Volume +",function(){vol(Math.min(rd.setVol?20:10,vol()+1));draw()}],
 ["Volume -",function(){vol(Math.max(1,vol()-1));draw()}],
 ["RSSI",function(){rd.showRSSI=!rd.showRSSI;draw()}]
];
function itemName(i){
 var s=items[i][0];
 return s
}
function check(x,y,on){
 h.drawRect(x,y,x+12,y+12);
 if(on)h.fillRect(x+2,y+2,x+10,y+10)
}
function drawWave(){
 if(removed)return;
 var x=232,y=65,w=150,gx=232,gw=226,hgt=187,i,t,mid=y+(hgt>>1),b=y+hgt;
 if(!wave){wave=new Uint16Array(60);for(i=0;i<60;i+=2)wave[i]=x+i*w/60}
 h.setClipRect(x,y,x+w,b).clearRect(x,y,x+w,b);
 if(Pip.radioClipPlaying&&Pip.getAudioWaveform){try{Pip.getAudioWaveform(wave,y,y+hgt)}catch(e){}}
 else {t=getTime();for(i=1;i<60;i+=2)wave[i]=mid+28*Math.sin(t)*Math.sin(.13*(t+=.6))}
 h.setColor(2).drawLine(gx,b,gx+gw,b);
 for(i=gx;i<=gx+gw;i+=8)h.drawLine(i,b,i,b-(i%24?4:8));
 h.setColor(3).drawPolyAA(wave).setClipRect(0,0,W-1,H-1);
 h.flip();Pip.lastFlip=getTime()
}
function draw(){
 if(removed)return;
 h.setClipRect(0,58,W-1,H-28).clearRect(0,58,W-1,H-28);
 h.setClipRect(0,0,W-1,H-1).setColor(3).setFont("Monofonto14").setFontAlign(-1,-1);
 var first=Math.max(0,Math.min(sel-4,items.length-8)),i,y,c;
 for(i=0;i<8&&first+i<items.length;i++){
 y=62+i*24;c=first+i==sel?3:1;
 if(first+i==sel)try{Pip.shadeBox(18,y-2,180,y+20)}catch(e){h.setColor(1).fillRect(18,y-2,180,y+20)}
 if(items[first+i][0]=="FM Power"){h.setColor(c);check(28,y+3,Pip.radioOn&&!rd.mjOn)}
 if(items[first+i][0]=="HAM Tuner"){h.setColor(c);check(28,y+3,rd.mjOn)}
 h.setColor(c).drawString(itemName(first+i),46,y+3)
 }
 tuner();
 h.setColor(3).setFont("6x8",2).drawString(rd.mjOn?stationName():"FM "+((rd.freq||0)/100).toFixed(1)+" MHz",248,258);
 h.setFont("6x8").setColor(2).drawString(rd.mjOn?"HAM tuner locked":"music station off",248,278);
 h.drawString("VOL "+vol(),356,278);
 if(rd.mojaveError)h.setColor(1).drawString((""+rd.mojaveError).substr(0,34),248,292);
 h.flip();Pip.lastFlip=getTime();
 drawWave()
}
function k1(d){
 if(removed)return;
 if(d){sel+=d>0?1:-1;if(sel<0)sel=0;if(sel>=items.length)sel=items.length-1;try{Pip.playSound("SCROLL")}catch(e){}draw();return}
 try{Pip.playSound("SELECT")}catch(e){}
 items[sel][1]()
}
function k2(d){
 if(removed||!d)return;
 if(rd.mjOn){tuneTrack(d);return}
 rd.freq=Math.max(rd.start||7600,Math.min(rd.end||10800,(rd.freq||9500)-10*d));
 try{if(Pip.radioOn)rd.setFreq(rd.freq)}catch(e){}
 draw()
}
scan(0);draw();
waveTimer=setInterval(drawWave,160);
Pip.onExclusive("knob1",k1);
Pip.onExclusive("knob2",k2);
return{id:ID,remove:function(){
 if(removed)return;removed=true;
 if(waveTimer)clearInterval(waveTimer);
 Pip.removeListener("knob1",k1);
 Pip.removeListener("knob2",k2);
 h.clear();h.flip()
}}
});
