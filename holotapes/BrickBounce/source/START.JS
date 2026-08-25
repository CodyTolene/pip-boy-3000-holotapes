(function(){
  var GAME="HOLO/BRKBNCE/GAME.JS",timer;
  try{
    fs.unlink("SETTINGS/BB_DBG.TXT");
  }catch(e){
  }function run(){
    var p=global.__bbLaunch;
    global.__bbReturn=void 0;
    global.__bbLaunch=void 0;
    timer=void 0;
    try{
      Pip.remove();
      try{
        Pip.CURRENT=0;
      }catch(e){
      }
      E.defrag();
      Pip.CURRENT=eval(fs.readFileSync(GAME))(p);
    }catch(e){
      h.clear(1).setColor(3).setFontMonofonto18().setFontAlign(0,0).drawString("LOAD ERROR",240,142).setFontMonofonto14().drawString(String(e&&e.message||e).slice(0,48),240,170).flip();
      Pip.lastFlip=getTime();
    }
  }timer=setTimeout(run,20);
  return{
    id:"BBSTART",notDefault:true,fullscreen:true,remove:function(){
      if(timer)clearTimeout(timer);
      timer=void 0;
    }
  };
})
