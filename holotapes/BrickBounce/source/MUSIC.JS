(function(params){
  h.clear(1);
  const DIR="HOLO/BRKBNCE/",SF="SETTINGS/BRKBNCE.DAT",DB=DIR+"SAVE.JS";
  let sel=0,track=-1,paused=0,vol=70,master=params&&params.vol!==void 0?params.vol:70,mt=0,db=0;
  function cl(n,a,b){return Math.max(a,Math.min(b,n))}
  function ds(){try{return db||(db=eval(fs.readFileSync(DB))())}catch(e){return 0}}
  function jr(){try{let s=ds();return s?s(SF):{}}catch(e){return {}}}
  function av(n){try{let v=Math.round(n*27/100);Pip.setVol(v);global.__bbVol=v}catch(e){}}
  function sv(){let s=jr();s.mpv=vol;try{let d=ds();if(d)d(SF,s)}catch(e){}}
  function list(){return["INTRO","TRACK 1","TRACK 2","TRACK 3","TRACK 4","VOLUME: "+vol+"%","BACK"]}
  function box(t,y,on){h.setColor(on?1:0).fillRect(106,y-11,374,y+11).setColor(3).drawRect(106,y-11,374,y+11).setFontMonofonto16().setFontAlign(0,0).drawString(t,240,y+1)}
  function icon(y){let x=132;h.setColor(sel===track?0:3);if(paused)h.fillPoly([x-4,y-6,x+7,y,x-4,y+6]);else h.fillRect(x-5,y-6,x-2,y+6).fillRect(x+2,y-6,x+5,y+6)}
  function dr(){let a=list();h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("MUSIC PLAYER",240,54);for(let i=0;i<a.length;i++)box(a[i],100+i*32,sel===i);if(track>=0)icon(100+track*32);h.flip();Pip.lastFlip=getTime()}
  function play(n){try{Pip.audioStop();track=n;paused=0;av(vol);Pip.audioStart(DIR+(n?"MUS"+n+".WAV":"INTRO.WAV"),{repeat:!0})}catch(e){}dr()}
  function leave(){rm();sv();av(master);h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOADING...",240,160).flip();Pip.lastFlip=getTime();E.defrag();if(!global.__bbMusicBack)global.__bbMusicBack=Function("delete global.__bbMusicBack;try{Pip.CURRENT=0}catch(e){}E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))();");mt=setTimeout(global.__bbMusicBack,20)}
  function press(){if(sel<5){if(track===sel){if(paused)play(sel);else Pip.audioStop(),paused=1,dr()}else play(sel);return}if(sel===5){vol=(vol+10)%110;av(vol);sv();dr();return}leave()}
  function move(d){let o=sel;sel=cl(sel+d,0,6);if(sel!==o)dr()}
  function k1(d){if(d)move(d);else press()}
  function k2(d){if(d)move(d)}
  function rm(){if(mt)clearTimeout(mt);mt=0;Pip.removeListener("knob1",k1);Pip.removeListener("knob2",k2);try{Pip.audioStop()}catch(e){}db=0}
  let s=jr();vol=s&&s.mpv!==void 0?s.mpv:70;master=s&&s.vol!==void 0?s.vol:master;av(vol);dr();Pip.onExclusive("knob1",k1);Pip.onExclusive("knob2",k2);return{id:"BBMUSIC",notDefault:!0,fullscreen:!0,remove:rm}
});
