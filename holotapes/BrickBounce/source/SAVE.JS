(function(){
  function key(file){
    return (process.env&&process.env.SERIAL||"SAPLING")+"|"+file+"|BRICK-BOUNCE-1";
  }function crypt(text,k){
    let out="",seed=E.CRC32(k)|0;
    for(let i=0;i<text.length;i++){
      seed=(seed*1664525+1013904223)|0;
      out+=String.fromCharCode(text.charCodeAt(i)^(seed>>>24));
    }return out;
  }function tag(k,text){
    return ("00000000"+(E.CRC32(k+"|"+text)>>>0).toString(16)).slice(-8);
  }function pack(file,data){
    let k=key(file),text=JSON.stringify(data);
    return "BB4"+tag(k,text)+btoa(crypt(text,k));
  }function read(path,file){
    try{
      if(!fs.statSync(path))return 0;
      let raw=fs.readFileSync(path),k,text;
      if(!raw||raw.substr(0,3)!=="BB4"||raw.length<12)return 0;
      k=key(file);
      text=crypt(atob(raw.substr(11)),k);
      if(tag(k,text)!==raw.substr(3,8))return 0;
      return {d:JSON.parse(text),r:raw};
    }catch(e){
      return 0;
    }
  }function load(file){
    let saved=read(file,file);
    if(!saved)saved=read(file+".tmp",file);
    if(!saved)saved=read(file+".bak",file);
    return saved?saved.d:0;
  }function write(file,data){
    let tmp=file+".tmp",bak=file+".bak",raw;
    if(data===0){
      try{fs.unlink(file)}catch(e){}
      try{fs.unlink(tmp)}catch(e){}
      try{fs.unlink(bak)}catch(e){}
      return 1;
    }try{
      raw=pack(file,data);
      fs.writeFileSync(tmp,raw);
      if(!read(tmp,file))return 0;
      try{fs.unlink(bak)}catch(e){}
      try{fs.renameSync(file,bak)}catch(e){}
      try{fs.renameSync(tmp,file)}catch(e){
        fs.writeFileSync(file,raw);
        try{fs.unlink(tmp)}catch(x){}
      }return 1;
    }catch(e){
      return 0;
    }
  }return function(file,data){
    return data===void 0?load(file):write(file,data);
  };
})
