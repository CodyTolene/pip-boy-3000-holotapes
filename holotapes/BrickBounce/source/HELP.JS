(function(params){
  const BF="HOLO/BRKBNCE/BRICKS.JS";
  let p=0,t=0,q=0,IM=0;
  function im(){
    if(!IM){
      E.defrag();
      IM=eval(fs.readFileSync(BF))
    }return IM
  }function tx(s,x,y){
    h.drawString(s,x,y)
  }function box(x,y,w,z){
    h.setColor(1).fillRect(x,y,x+w,y+z).setColor(3).drawRect(x,y,x+w,y+z)
  }function pad(x,y,w){
    h.fillRect(x,y,x+w,y+7)
  }function ball(x,y,r){
    h.fillCircle(x,y,r||5)
  }function brick(i,x,y){
    h.drawImage(im()[i],x,y)
  }function vb(x,y,i){
    h.drawRect(x,y,x+39,y+13);
    if(i===1)h.fillRect(x+4,y+4,x+35,y+9);
    else if(i===2)for(let n=0;
    n<40;
    n+=8)h.drawLine(x+n,y+12,x+n+10,y+2);
    else h.drawLine(x+4,y+10,x+35,y+10)
  }function pic(k,x,y){
    h.drawImage(im()[6+"SLEB?FTM".indexOf(k)],x-8,y-8)
  }function head(){
    h.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0,0).drawString("HELP",240,30).setFontMonofonto14()
  }function page0(){
    h.setFontAlign(-1,0);
    tx("The goal is to keep the ball in play",42,70);
    tx("and break every brick in the level.",42,94);
    tx("Turn the knob to move the paddle.",42,130);
    tx("Do not let the ball fall below it.",42,154);
    tx("Clear each layout to reach the next",42,202);
    tx("level and chase the highest score.",42,226);
    tx("There are 50 levels to beat.",42,262)
  }function page1(){
    h.setFontAlign(-1,0);
    tx("Press the knob to serve when the ball",42,70);
    tx("is waiting on the paddle.",42,94);
    tx("The spot where the ball hits the",42,142);
    tx("paddle changes the bounce angle.",42,166);
    tx("Aiming with the paddle helps you",42,214);
    tx("reach bricks in difficult places.",42,238);
    tx("The ball speeds up during long rallies.",42,262)
  }function page2(){
    h.setFontAlign(0,0);
    tx("BONUSES",240,58);
    h.setFontAlign(-1,0);
    let a=[["L","LONG PADDLE"],["T","SLOW BALL"],["B","POWER BALL"],["E","EXTRA LIFE"],["S","SHORT PADDLE"],["F","FAST BALL"],["M","MULTI BALL"],["?","RANDOM ITEM"]];
    for(let i=0;
    i<a.length;
    i++){
      let x=i<4?94:284,y=90+(i%4)*40;
      pic(a[i][0],x,y);
      tx(a[i][1],x+28,y+2)
    }h.setFontAlign(0,0);
    tx("POWER-UPS RESET WHEN YOU LOSE",240,248);
    tx("A LIFE OR CLEAR THE LEVEL.",240,270)
  }function page3(){
    h.setFontAlign(0,0);
    tx("BRICKS",240,56);
    function r(i,n,s,y){
      brick(i,96,y-8);
      h.setFontAlign(-1,0);
      tx(n,156,y);
      if(s)h.setFontAlign(1,0),tx(s,360,y)
    }r(0,"CLEAN","10 POINTS",80);
    r(1,"RIBBED","20 POINTS",108);
    r(2,"CIRCUIT","50 POINTS",136);
    r(3,"ARMORED","50+50 POINTS",164);
    r(4,"BONUS","10 POINTS",192);
    r(5,"WALL","",220);
    h.setFontAlign(0,0);
    tx("BONUS BRICKS ARE OPTIONAL",240,248);
    tx("EXTRA LIFE: EASY 4000  NORMAL 5000",240,260);
    tx("HARD 15000  INSANE 50000",240,280)
  }function page4(){
    h.setFontAlign(-1,0);
    tx("ARCADE MODE",34,56);
    tx("CLASSIC MODE",264,56);
    tx("Constant ball speed.",34,80);
    tx("Every rally stays fast",34,102);
    tx("from start to finish.",34,124);
    tx("The ball's speed depends",264,80);
    tx("on where it hits the paddle.",264,102);
    h.setFontAlign(0,0);
    tx("DIFFICULTY",240,150);
    h.setFontAlign(-1,0);
    tx("EASY: 5 lives, 5 continues.",34,174);
    tx("No bad items.",34,196);
    tx("NORMAL: 3 lives, 3 continues.",264,174);
    tx("HARD: 3 lives, 3 continues.",34,224);
    tx("Starts with a faster ball.",34,246);
    tx("INSANE: 3 lives, 1 continue.",264,224);
    tx("Starts at maximum speed.",264,246);
    h.setFontAlign(0,0);
    tx("Hard unlocks after beating the game.",240,270);
    tx("Insane unlocks after beating Hard.",240,288)
  }function dr(){
    head();
    p===0?page0():p===1?page1():p===2?page2():p===3?page3():page4();
    h.setFontAlign(-1,0).drawString("SCROLL: TURN PAGE",28,306);
    h.setFontAlign(1,0).drawString("PRESS KNOB: BACK",452,306).drawString((p+1)+"/5",456,286);
    h.flip();
    Pip.lastFlip=getTime();
    if(!IM&&!q)q=setTimeout(function(){
      q=0;
      im()
    },800)
  }function rm(){
    if(t)clearTimeout(t);
    if(q)clearTimeout(q);
    t=0;
    q=0;
    IM=0;
    Pip.removeListener("knob1",kb);
    Pip.removeListener("knob2",kb)
  }function bk(){
    rm();
    Pip.remove();
    E.defrag();
    if(!global.__bbHelpBack)global.__bbHelpBack=Function("E.defrag();Pip.CURRENT=eval(fs.readFileSync(\"HOLO/BRKBNCE/APP.JS\"))({view:\"main\",keepMusic:1});");
    t=setTimeout(global.__bbHelpBack,20)
  }function kb(d){
    if(d){
      let o=p;
      p=Math.max(0,Math.min(4,p+d));
      if(p!==o){
        dr()
      }
    }else bk()
  }dr();
  Pip.onExclusive("knob1",kb);
  Pip.onExclusive("knob2",kb);
  return{
    id:"BRKBNCEHELP",notDefault:!0,fullscreen:!0,remove:rm
  }
});
