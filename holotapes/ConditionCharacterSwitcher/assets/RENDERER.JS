/*CHARSWITCHER*/
(function(){
  var fs=require("fs"), CHARDIR="HOLO/CHARSWITCHER/chars/";

  // Same shape/algorithm as stock STATUS_CND.JS's C() function. Screen
  // position and end-cap style per limb come from the character's own
  // "bars" manifest entry (see characters/*.json), falling back to stock's
  // own positions when a character doesn't define its own.
  var DEFAULT_BAR_POSITIONS={
    head:{x:238,y:60}, tors:{x:238,y:138},
    rArm:{x:160,y:110,rightCap:1}, lArm:{x:315,y:110,leftCap:1},
    rLeg:{x:160,y:208,rightCap:1}, lLeg:{x:315,y:208,leftCap:1}
  };
  function bar(x,y,pct,leftCap,rightCap){
    h.fillRect(x-19,y-5,x+19,y-4);
    if(leftCap)h.fillRect(x-30,y-5,x-19,y-4).fillPoly([x-18,y-4,x-25,y-4,x-18,y+4]);
    else h.fillRect(x-19,y-4,x-18,y+4);
    if(rightCap)h.fillRect(x+19,y-5,x+30,y-4).fillPoly([x+18,y-4,x+25,y-4,x+18,y+4]);
    else h.fillRect(x+18,y-4,x+19,y+4);
    h.fillRect(x-16,y-2,x+(32*pct)/100-16,y+4);
  }
  function drawLimbBars(limbValues,barPositions){
    for(var limbKey in DEFAULT_BAR_POSITIONS){
      var p=(barPositions&&barPositions[limbKey])||DEFAULT_BAR_POSITIONS[limbKey];
      bar(p.x,p.y,limbValues[limbKey],p.leftCap,p.rightCap);
    }
  }

  // Same fallback pattern as DEFAULT_BAR_POSITIONS: a character's own
  // "positions" manifest entry overrides where each body part image is
  // drawn; these stock coordinates are used for any part it omits.
  var DEFAULT_IMAGE_POSITIONS={
    head:{x:215,y:70}, face:{x:224,y:88}, torso:{x:205,y:122},
    left_arm:{x:260,y:122}, right_arm:{x:150,y:120},
    left_leg:{x:234,y:175}, right_leg:{x:182,y:175},
    name:{x:240,y:260} // stock's own h.drawString(...,240,260) for the name/level line
  };
  function imagePos(positions,key){
    return (positions&&positions[key])||DEFAULT_IMAGE_POSITIONS[key];
  }

  // Fixed order of the 18 limb/face images inside a "limbs" character file
  // (see condition-editor.html's ALL_IMAGE_KEYS - must match exactly). A
  // single character file is a small binary container: a 4-byte length
  // that many bytes of JSON manifest text, then a 72-byte
  // table of 18 little-endian uint32 image lengths (this order), then each
  // image's heatshrink-compressed bytes back to back.
  var LIMB_IMAGE_KEYS=["head","head_broken","torso","torso_broken","left_arm","left_arm_broken",
    "right_arm","right_arm_broken","left_leg","left_leg_broken","right_leg","right_leg_broken",
    "face_00","face_01","face_02","face_03","face_04","face_10"];

  function readUint32LE(s,byteOffset){
    return s.charCodeAt(byteOffset)|(s.charCodeAt(byteOffset+1)<<8)|(s.charCodeAt(byteOffset+2)<<16)|(s.charCodeAt(byteOffset+3)<<24);
  }
  // Reads just the manifest prefix of a "limbs" character file - never the
  // image data after it.
  function readLimbsManifest(path){
    var f=E.openFile(path,"r");
    var manifestLength=readUint32LE(f.read(4),0);
    var manifestText=f.read(manifestLength);
    f.close();
    var manifest=JSON.parse(manifestText);
    manifest._imageTableOffset=4+manifestLength;
    return manifest;
  }

  function setupAnimated(character){
    var packPath=character.pack, FRAME_SIZE=character.frameSize, drawX=character.x, drawY=character.y, FRAME_MS=character.frameMs;
    var stateOffsets=character.stateOffsets, stateCounts=character.stateCounts, avMap=character.av, barPositions=character.bars;
    var packFile=null, timer=null, active=true, frame=0, lastState=-1, dirty=false;
    var limbValues={head:0,tors:0,lArm:0,rArm:0,lLeg:0,rLeg:0};
    var lastLimbValues={};
    function loadLimbValues(){for(var limbKey in avMap)limbValues[limbKey]=E.clip(player.getav(avMap[limbKey])||0,0,100);}
    function state(){
      if(player.getav("withdrawal"))return 10;
      var sum=0,n=0;for(var limbKey in limbValues){sum+=limbValues[limbKey];n++;}
      var avg=n?sum/n:100;
      return E.clip(Math.round((100-avg)/10),0,10);
    }
    function openPack(){try{if(!packFile)packFile=E.openFile(packPath,"r");return !!packFile;}catch(e){packFile=null;return false;}}
    function readFrame(stateIndex,frameIndex){
      if(!openPack())return;
      try{var frameOffset=stateOffsets[stateIndex]+frameIndex;packFile.seek(frameOffset*FRAME_SIZE);return packFile.read(FRAME_SIZE);}
      catch(e){
        try{packFile.close();}catch(e2){}
        packFile=null;
        return;
      }
    }
    function drawName(){
      try{
        h.setFontAlign(0,0).setFont("Monofonto14").drawString((player.getav("name")||"Albert")+" · Level "+E.clip(player.getav("level")||1,1,NV?50:30),240,283);
      }catch(e){}
    }
    function needsClear(){
      for(var limbKey in limbValues)if(limbValues[limbKey]!==lastLimbValues[limbKey])return true;
      return false;
    }
    function draw(){
      if(!active)return;
      loadLimbValues();
      var currentState=state();
      var shouldClear=currentState!==lastState||needsClear();
      if(currentState!==lastState){lastState=currentState;frame=0;}
      var img=readFrame(currentState,frame);if(!img)return;
      if(shouldClear){
        h.setBgColor(0).clearRect(64,40,480,270);
        for(var limbKey in limbValues)lastLimbValues[limbKey]=limbValues[limbKey];
      }
      h.drawImage(img,drawX,drawY);
      h.setColor(3);
      drawLimbBars(limbValues,barPositions);
      drawName();
      h.flip();
      frame++;if(frame>=stateCounts[currentState])frame=0;
    }
    function knob2(dir){
      if(!dir)return;
      loadLimbValues();
      var afterState;
      for(var limbKey in limbValues){
        var delta=dir*Math.random()*10;
        limbValues[limbKey]=Math.floor(E.clip(limbValues[limbKey]+delta,0,100));
        player.setav(avMap[limbKey],limbValues[limbKey]);
      }
      loadLimbValues();
      afterState=state();
      if(dir>0 && afterState===0){
        for(var resetKey in limbValues){
          limbValues[resetKey]=100;
          player.setav(avMap[resetKey],100);
        }
        loadLimbValues();
      }
      dirty=true;frame=0;draw();
    }
    loadLimbValues();
    Pip.onExclusive("knob2",knob2);
    draw();
    timer=setInterval(draw,FRAME_MS);
    return {remove:function(){
      active=false;
      if(timer){clearInterval(timer);timer=null;}
      if(packFile){try{packFile.close();}catch(e){}packFile=null;}
      Pip.removeListener("knob2",knob2);
      if(dirty)player.sync();
    }};
  }

  function setupLimbs(character,filePath){
    var avMap=character.av, barPositions=character.bars, positions=character.positions;
    var decompress=require("heatshrink").decompress;
    var packFile=null, offsets=[], lens=[];
    (function readIndex(){
      var headerSize=LIMB_IMAGE_KEYS.length*4;
      var f=E.openFile(filePath,"r");
      f.seek(character._imageTableOffset);
      var header=f.read(headerSize);
      var offset=character._imageTableOffset+headerSize;
      for(var i=0;i<LIMB_IMAGE_KEYS.length;i++){
        var len=readUint32LE(header,i*4);
        offsets.push(offset);lens.push(len);offset+=len;
      }
      f.close();
    })();
    function loadImage(key){
      var idx=LIMB_IMAGE_KEYS.indexOf(key);
      if(idx<0)return;
      if(!packFile)packFile=E.openFile(filePath,"r");
      packFile.seek(offsets[idx]);
      return decompress(packFile.read(lens[idx]));
    }
    var limbValues={head:0,tors:0,lArm:0,rArm:0,lLeg:0,rLeg:0};
    var headerRenderTimeout, dirty=false, inWithdrawal=player.getav("withdrawal")||false;
    // Stock draws its own name/level line once, outside its per-frame
    // redraw function, because that line sits at a fixed y=260 - safely
    // below the clearRect region below, so nothing ever wipes it. Once the
    // position became user-movable it could land *inside* that region, and
    // a one-time draw would vanish the next time anything (e.g. turning
    // knob2) triggers a redraw. So this draws every frame instead - name/
    // level and their screen position don't change while this screen is
    // open, so just the string and position are computed once, up front.
    var namePos=imagePos(positions,'name');
    var nameText=(player.getav('name')||'Albert')+' · Level '+E.clip(player.getav('level')||1,1,NV?50:30);
    function draw(){
      h.clearRect(64,40,480,238);
      var faceLevel=0, sum=E.sum(Object.values(limbValues));
      if(inWithdrawal)faceLevel=10;
      else if(sum<200)faceLevel=4;
      else if(sum<300)faceLevel=3;
      else if(sum<400)faceLevel=2;
      else if(sum<500)faceLevel=1;
      var p=imagePos(positions,'head');
      h.drawImage(loadImage(limbValues.head>50?'head':'head_broken'),p.x,p.y);
      p=imagePos(positions,'face');
      h.drawImage(loadImage('face_'+String(faceLevel).padStart(2,'0')),p.x,p.y);
      p=imagePos(positions,'torso');
      h.drawImage(loadImage(limbValues.tors>50?'torso':'torso_broken'),p.x,p.y);
      p=imagePos(positions,'left_arm');
      h.drawImage(loadImage(limbValues.lArm>50?'left_arm':'left_arm_broken'),p.x,p.y);
      p=imagePos(positions,'right_arm');
      h.drawImage(loadImage(limbValues.rArm>50?'right_arm':'right_arm_broken'),p.x,p.y);
      p=imagePos(positions,'left_leg');
      h.drawImage(loadImage(limbValues.lLeg>50?'left_leg':'left_leg_broken'),p.x,p.y);
      p=imagePos(positions,'right_leg');
      h.drawImage(loadImage(limbValues.rLeg>50?'right_leg':'right_leg_broken'),p.x,p.y);
      drawLimbBars(limbValues,barPositions);
      h.setFontAlign(0,0).setFont('Monofonto14').drawString(nameText,namePos.x,namePos.y);
      if(headerRenderTimeout)clearTimeout(headerRenderTimeout);
      headerRenderTimeout=setTimeout(function(){headerRenderTimeout=undefined;Pip.renderHeader();},500);
    }
    function onKnob1(dir){
      if(dir===0){inWithdrawal=!inWithdrawal;player.setav('withdrawal',inWithdrawal);draw();}
    }
    function onKnob2(dir){
      for(var limbKey in limbValues){
        limbValues[limbKey]=Math.floor(E.clip(limbValues[limbKey]+dir*Math.random()*6,0,100));
        player.setav(avMap[limbKey],limbValues[limbKey]);
      }
      dirty=true;draw();
    }
    for(var limbKey in avMap)limbValues[limbKey]=player.getav(avMap[limbKey]);
    Pip.on('knob1',onKnob1);
    Pip.onExclusive('knob2',onKnob2);
    draw();
    return {remove:function(){
      Pip.removeListener('knob1',onKnob1);
      Pip.removeListener('knob2',onKnob2);
      if(packFile){try{packFile.close();}catch(e){}packFile=null;}
      if(dirty)player.sync();
      if(headerRenderTimeout){clearTimeout(headerRenderTimeout);headerRenderTimeout=undefined;}
    }};
  }

  // "Animated" characters are a plain small .json manifest (a separate .BIN
  // pack holds the actual frames - see setupAnimated). "Limbs" characters
  // are a single .char file: manifest + image data combined (see
  // readLimbsManifest/setupLimbs) so a user only ever handles one file, with
  // the extension telling us which to expect without reading either fully.
  var activePointer=JSON.parse(fs.readFileSync(CHARDIR+"ACTIVE.JSON"));
  var charFile=activePointer.file, charPath=CHARDIR+charFile;
  if(/\.char$/i.test(charFile)){
    var character=readLimbsManifest(charPath);
    return setupLimbs(character,charPath);
  }
  return setupAnimated(JSON.parse(fs.readFileSync(charPath)));
})
