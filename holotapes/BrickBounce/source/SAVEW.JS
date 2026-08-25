(function(){
  let file=global.__bbSaveFile,data=global.__bbSaveData,text,key,seed,out="",raw,tmp,bak;
  delete global.__bbSaveFile;
  delete global.__bbSaveData;
  try{
    if(data===0){
      try{fs.unlink(file)}catch(e){}
      try{fs.unlink(file+".tmp")}catch(e){}
      try{fs.unlink(file+".bak")}catch(e){}
    }else{
      text=JSON.stringify(data);
      key=(process.env&&process.env.SERIAL||"SAPLING")+"|"+file+"|BRICK-BOUNCE-1";
      seed=E.CRC32(key)|0;
      for(let i=0;i<text.length;i++){
        seed=(seed*1664525+1013904223)|0;
        out+=String.fromCharCode(text.charCodeAt(i)^(seed>>>24));
      }raw="BB4"+("00000000"+(E.CRC32(key+"|"+text)>>>0).toString(16)).slice(-8)+btoa(out);
      tmp=file+".tmp";
      bak=file+".bak";
      fs.writeFileSync(tmp,raw);
      try{fs.unlink(bak)}catch(e){}
      try{fs.renameSync(file,bak)}catch(e){}
      try{fs.renameSync(tmp,file)}catch(e){
        fs.writeFileSync(file,raw);
        try{fs.unlink(tmp)}catch(x){}
      }
    }global.__bbSaveResult=1;
  }catch(e){
    global.__bbSaveResult=0;
  }
})()
