(function(){
"use strict";
var dead=false,sel=0,fx=1,ca=0,cb=3,spd=1,fade=4,level=1,timer=0,step=0,preview=false,kept=false;
var FX="SOLID|SLOW FADE|POLICE LIGHTS|DUAL COLORS|BREATHE|DOUBLE PULSE|SCANNER|GEIGER TICKS|POWER SURGE|WARNING BEACON|MELTDOWN|SIGNAL LOCK|LOW POWER|OVERCHARGE|SIREN FADE|IDLE GLOW|CANDLE FLICKER|RAD STORM|EMERGENCY STROBE|HEARTBEAT|VAULT BREACH|NUKA FLICKER".split("|");
var COLOR="AMBER|RED|TOXIC|VAULT BLUE|CYAN|PURPLE|WHITE|WARM WHITE|GREEN|ORANGE|PINK|ICE BLUE|YELLOW".split("|");
var CR=new Uint8Array([255,255,26,0,0,166,255,255,0,255,255,80,255]);
var CG=new Uint8Array([128,0,255,64,255,0,255,191,255,80,0,150,255]);
var CB=new Uint8Array([0,0,13,255,255,255,255,115,0,0,90,255,0]);
var SPD="SLOW|MED|FAST".split("|");
function clamp(v){v=Number(v);return isNaN(v)||v<0?0:v>1?1:v;}
function baseBright(){var v=1;try{if(typeof Pip.brightness==="number")v=Pip.brightness;}catch(e){}return clamp(v);}
function out(r,g,b,m){var n=baseBright()*level*clamp(m);try{Pip.fadeTo([{pin:LED_RED,target:r*n/255},{pin:LED_GREEN,target:g*n/255},{pin:LED_BLUE,target:b*n/255}]);}catch(e){}}
function color(i,m){out(CR[i],CG[i],CB[i],m);}
function mix(a,b,p,m){var q=255-p;out((CR[a]*q+CR[b]*p)/255,(CG[a]*q+CG[b]*p)/255,(CB[a]*q+CB[b]*p)/255,m);}
function wheel(p,m){var x,s,r=0,g=0,b=0;p%=1536;if(p<0)p+=1536;s=(p/256)|0;x=p&255;if(s===0){r=255;g=x;}else if(s===1){r=255-x;g=255;}else if(s===2){g=255;b=x;}else if(s===3){g=255-x;b=255;}else if(s===4){r=x;b=255;}else{r=255;b=255-x;}out(r,g,b,m);}
function rnd(n){try{if(Math.randInt)return Math.randInt(n);}catch(e){}return Math.floor(Math.random()*n);}
function restoreColor(){var v=baseBright();try{Pip.fadeTo([{pin:LED_RED,target:v},{pin:LED_GREEN,target:.5*v},{pin:LED_BLUE,target:0}]);}catch(e){}}
function stop(){if(timer){clearInterval(timer);timer=0;}}
function stopSessionOnly(){try{if(global.HAM_LED_SESSION&&global.HAM_LED_SESSION.stop)global.HAM_LED_SESSION.stop();}catch(e){}}
function restore(){stop();try{if(global.HAM_LED_SESSION&&global.HAM_LED_SESSION.remove)global.HAM_LED_SESSION.remove(false);}catch(e){}try{if(Pip.setBrightness&&typeof Pip.brightness==="number")Pip.setBrightness(Pip.brightness);}catch(e){}try{if(Pip.checkChargeStatus)Pip.checkChargeStatus(true);}catch(e){}restoreColor();}
function frame(){var t,u;if(dead)return;
 if(fx===0)color(ca,1);
 else if(fx===1)wheel(step*12,1);
 else if(fx===2){t=step%16;if(t<3||t>4&&t<8)color(1,1);else if(t>8&&t<12||t>12&&t<16)color(3,1);else out(0,0,0,0);}
 else if(fx===3){t=(step*4)%512;if(t>255)t=511-t;mix(ca,cb,t,1);}
 else if(fx===4){t=step%40;if(t>20)t=40-t;color(ca,.1+t/22);}
 else if(fx===5){t=step%18;color(ca,t<2||t>4&&t<7?1:.05);}
 else if(fx===6){t=step%28;if(t>14)t=28-t;color(ca,.18+t/17);}
 else if(fx===7){t=(17*step)%31;if(t<2)color(6,1);else color(ca,t<4?.7:.04);}
 else if(fx===8){t=step%28;if(t<8)color(ca,t/8);else if(t<11)color(6,1);else if(t<17)mix(ca,6,(t-11)*42,.35);else color(ca,.68);}
 else if(fx===9){t=step%10;color(t<4?9:1,t<4?1:.1);}
 else if(fx===10){t=step%36;if(t<12)color(2,.3+t/16);else if(t<24)mix(2,1,(t-12)*21,.9);else color(1,.55+(t-24)/27);}
 else if(fx===11){t=step%22;if(t<2||t>4&&t<7)color(ca,1);else if(t>9&&t<16)color(8,1);else color(ca,.06);}
 else if(fx===12){t=(10*step)%19;color(1,t<3?0:.1+t/95);}
 else if(fx===13){t=step%24;if(t<2)out(255,255,255,1);else mix(ca,6,(24-t)*11,.2+(24-t)/27);}
 else if(fx===14){t=(step*4)%512;if(t>255)t=511-t;mix(1,3,t,.2+((step%20)<10?(step%10)/12:(10-step%10)/12));}
 else if(fx===15){t=step%60;if(t>30)t=60-t;color(ca,.28+t/120);}
 else if(fx===16){t=48+rnd(53);if(step%9===0)t=22;color(ca,t/100);}
 else if(fx===17){t=(step*13)%41;u=step%32;color(t<5?2:ca,t<5?1:(u>18&&u<23?.75:.12));}
 else if(fx===18){t=step%12;color(t<2?ca:t>5&&t<8?6:ca,t<2||t>5&&t<8?1:.02);}
 else if(fx===19){t=step%30;color(ca,t<2?1:t<5?.16:t<7?.82:.06);}
 else if(fx===20){t=step%32;if(t<3)color(3,1);else if(t<6)color(0,.2);else if(t<10)color(3,1);else if(t<15)color(0,.08);else mix(3,0,(t-15)*15,.2);}
 else {t=step%38;if(t<4)color(ca,1);else if(t<7)color(6,.08);else if(t<11)color(ca,.75);else if(t<16)color(9,.04);else color(ca,.18+rnd(35)/100);}
 step++;
}
function fadeInterval(){return fade===1?500:fade===2?350:fade===3?250:fade===4?180:fade===5?130:fade===6?95:fade===7?70:fade===8?50:fade===9?35:25;}
function interval(){var v;if(fx===1||fx===3)return fade?fadeInterval():0;v=90;if(fx===7)v=120;else if(fx===8)v=100;else if(fx===10)v=95;else if(fx===12)v=130;else if(fx===13)v=80;else if(fx===15)v=160;else if(fx===16)v=90;else if(fx===17)v=100;else if(fx===18)v=85;else if(fx===19)v=95;else if(fx===20)v=90;else if(fx===21)v=105;if(spd===0)v*=2;else if(spd===2)v=Math.max(35,v/2|0);return v;}
function apply(){var v;preview=true;stopSessionOnly();stop();step=0;frame();v=interval();if(fx!==0&&v)timer=setInterval(frame,v);}
function usesOneColor(){return fx===0||fx===4||fx===5||fx===6||fx===7||fx===8||fx===11||fx===13||fx===15||fx===16||fx===17||fx===18||fx===19||fx===21;}
function menu(){var a=[{k:"fx",n:"EFFECT"}];if(fx===3){a.push({k:"ca",n:"COLOR A"});a.push({k:"cb",n:"COLOR B"});}else if(usesOneColor())a.push({k:"ca",n:"COLOR"});if(fx!==0)a.push({k:"spd",n:"EFFECT SPEED"});if(fx===1||fx===3)a.push({k:"fade",n:"FADE SPEED"});a.push({k:"level",n:"BRIGHTNESS"});a.push({k:"keep",n:"KEEP EFFECT + EXIT"});a.push({k:"restore",n:"RESTORE PIP-OS + EXIT"});a.push({k:"exit",n:"EXIT RESTORE"});return a;}
function font(s){try{s>18?h.setFontMonofonto23():h.setFontMonofonto16();}catch(e){h.setFont("6x8",2);}return h;}
function value(k){return k==="fx"?FX[fx]:k==="ca"?COLOR[ca]:k==="cb"?COLOR[cb]:k==="spd"?SPD[spd]:k==="fade"?(fade===0?"0 PAUSE":fade===10?"10 MAX":""+fade):k==="level"?Math.round(100*level)+"%":"";}
function draw(){var i,y,v,a=menu();if(sel>=a.length)sel=a.length-1;try{h.clear(1).setColor(3).setBgColor(0);font(23).setFontAlign(0,-1).drawString("HAMCo LIGHT CONTROL",240,5);h.drawLine(14,34,466,34);for(i=0;i<a.length;i++){y=42+27*i;if(i===sel)h.fillRect(16,y-2,464,y+20).setColor(0);font(16).setFontAlign(-1,-1).drawString(a[i].n,25,y);v=value(a[i].k);if(v)h.setFontAlign(1,-1).drawString(v,455,y);h.setColor(3).setBgColor(0);}h.drawLine(12,286,468,286);font(16).setFontAlign(0,-1).drawString("LEFT TURN MOVE  LEFT PRESS SELECT",240,289);h.drawString("RIGHT TURN CHANGE",240,305);h.flip();Pip.lastFlip=getTime();}catch(e){}}
function sound(s){try{Pip.playSound(s);}catch(e){}}
function move(v){var a;if(dead||!v)return;a=menu();sel=(sel+(v>0?1:-1)+a.length)%a.length;sound("NEXT");draw();}
function adjust(v){var d=v<0?-1:1,k=menu()[sel].k;if(k==="fx"){fx=(fx+d+FX.length)%FX.length;sel=0;}else if(k==="ca")ca=(ca+d+COLOR.length)%COLOR.length;else if(k==="cb")cb=(cb+d+COLOR.length)%COLOR.length;else if(k==="spd")spd=(spd+d+3)%3;else if(k==="fade"){fade+=d;if(fade>10)fade=0;else if(fade<0)fade=10;}else if(k==="level"){level+=d*.25;if(level>1)level=.25;else if(level<.25)level=1;}else return false;apply();sound("OK");draw();return true;}
function close(change){dead=true;stop();try{Pip.removeListener("knob1",knob1);}catch(e){}try{Pip.removeListener("knob2",knob2);}catch(e){}try{Pip.audioStop();}catch(e){}try{h.clear();}catch(e){}try{if(typeof E!=="undefined"&&E.gc)E.gc();}catch(e){}if(change)try{Pip.changeMenu();}catch(e){}}
function keep(){var start;stop();try{start=eval(require("fs").readFileSync("HOLO/LEDCOLOR/SESSION.JS"));start()(fx,ca,cb,spd,fade,level);kept=true;sound("OK");close(true);}catch(e){kept=false;apply();sound("ERROR");draw();}}
function action(){var k=menu()[sel].k;if(k==="keep")keep();else if(k==="restore"||k==="exit"){restore();sound("OK");close(true);}else adjust(1);}
function knob1(dir,long){if(dead)return;if(dir)move(dir);else action();}
function knob2(dir){if(dead||!dir)return;adjust(dir);}
try{if(global.HAM_LED_SESSION){if(typeof global.HAM_LED_SESSION.fx==="number")fx=global.HAM_LED_SESSION.fx;if(typeof global.HAM_LED_SESSION.ca==="number")ca=global.HAM_LED_SESSION.ca;if(typeof global.HAM_LED_SESSION.cb==="number")cb=global.HAM_LED_SESSION.cb;if(typeof global.HAM_LED_SESSION.spd==="number")spd=global.HAM_LED_SESSION.spd;if(typeof global.HAM_LED_SESSION.fade==="number")fade=global.HAM_LED_SESSION.fade;if(typeof global.HAM_LED_SESSION.level==="number")level=global.HAM_LED_SESSION.level;}}catch(e){}
try{Pip.onExclusive("knob1",knob1);}catch(e){try{Pip.on("knob1",knob1);}catch(x){}}
try{Pip.onExclusive("knob2",knob2);}catch(e){try{Pip.on("knob2",knob2);}catch(x){}}
apply();draw();
return {id:"LEDCOLOR",notDefault:true,fullscreen:true,remove:function(){if(!kept&&preview)restore();close(false);}};
});
