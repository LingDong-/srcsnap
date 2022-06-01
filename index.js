
const {ipcRenderer} = require('electron');
const fs = require('fs');
const os = require('os');
const glob = require("glob")
const { execSync, exec } = require("child_process");

const DATA_PATH = os.homedir()+"/Library/Application Support/srcsnap/data";

// document = window.document;
// let ewi = [...document.querySelectorAll('[id*=_]')];
// ewi.map(x=>window[x.id]=x);

let cmd_hist = [];

cmd(`mkdir -p "${DATA_PATH}"`);

let PWD = null;
let DIR_SNAP = os.homedir()+"/Desktop";

let old_screenshots = [];

let PROJ_CONFIG =  {
  "max-file-size": '32',
  "ignore-list": [
    "bin/","*.mp4"
  ]
};

inp_dirsnap.value = DIR_SNAP;

ipcRenderer.on('dir',function(e,x){
  console.log(x);
  if (x.echo[0] == 'PWD'){
    PWD = x.path//.replace(' ','\\ ');
    show_screen_1();
  }else if (x.echo[0] == "DIR_SNAP"){
    DIR_SNAP = x.path//.replace(' ','\\ ');
    inp_dirsnap.value = DIR_SNAP;
  }
})

function ls_screenshots(){
  return glob.sync(DIR_SNAP+"/Screen Shot * at *.png");
}

function show_screen_1(){
  div_screen_0.style.display = "none";
  div_screen_1.style.display = "block";
  lbl_proj_title.innerHTML = PWD.split("/").slice(-1)[0];
  lbl_proj_path.innerHTML = PWD;
  old_screenshots.push(...ls_screenshots());
  setup_proj();
}



function cmd(x){
  console.log(x);
  cmd_hist.push(x);
  inp_cmd_hist.value = cmd_hist.join("\n");
  return execSync(x).toString();
}

function write_config(){
  let datapwd = DATA_PATH+"/"+PWD;
  fs.writeFileSync(`${datapwd}/config.json`,JSON.stringify(PROJ_CONFIG))
}
function read_config(){
  let datapwd = DATA_PATH+"/"+PWD;
  PROJ_CONFIG = JSON.parse(fs.readFileSync(`${datapwd}/config.json`))
}


function setup_proj(){
  let datapwd = DATA_PATH+"/"+PWD;
  cmd(`mkdir -p "${datapwd}"`);
  cmd(`mkdir -p "${datapwd}/snap"`);
  cmd(`mkdir -p "${datapwd}/repo"`);
  cmd(`rm -rf "${datapwd}/repo/src"`);
  cmd(`cp -r "${PWD}" "${datapwd}/repo/src"`);
  cmd(`rm -rf "${datapwd}/repo/src/.git"`);
  cmd(`rm -rf "${datapwd}/repo/src/**/.git"`);
  try{
    read_config();
  }catch(e){
    write_config();
  }
  remove_ignores();
  cmd(`cd "${datapwd}/repo"; git init;`);
  try{cmd(`cd "${datapwd}/repo"; git checkout master;`);}catch(e){/*whatever*/}
  show_snaps();

}

function add_snap(screenshot_path){ 
  let datapwd = DATA_PATH+"/"+PWD;
  try{cmd(`cd "${datapwd}/repo"; git checkout master;`);}catch(e){/*whatever*/}
  cmd(`cd "${datapwd}/repo"; echo "${new Date()}" > timestamp`);
  cmd(`cd "${datapwd}/repo"; rm -rf src; cp -r ${PWD} src; rm -rf src/.git; rm -rf src/**/.git`);
  remove_ignores();
  let result = cmd(`cd "${datapwd}/repo"; git add . ; git commit -m "${screenshot_path}"`);
  let match = [...result.matchAll(/\[master ?r?o?o?t?-?c?o?m?m?i?t? (.*?)\]/g)];
  let hash = match[0][1];
  hash = hash.replaceAll(/\(.*?\)/g,'');
  console.log(result,match,hash)
  cmd(`cp "${screenshot_path}" "${datapwd}/snap/${hash}.png"`);
  show_snaps();
}

function checkout_snap(hash){
  let datapwd = DATA_PATH+"/"+PWD;
  cmd(`cd "${datapwd}/repo"; git stash; git checkout ${hash};`);

}



async function async_load_image(src){
  return new Promise((resolve, reject) => {
    let img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function show_snaps(){
  div_snaps.innerHTML = "";
  let datapwd = DATA_PATH+"/"+PWD;
  let snaps = glob.sync(`${datapwd}/snap/*.png`).map(x=>({
    path: x,
    hash: x.split("/").slice(-1)[0].slice(0,-4),
    stat: fs.statSync(x)
  }));
  snaps.sort((a,b)=>(b.stat.mtimeMs-a.stat.mtimeMs));

  for (let i = 0; i < snaps.length; i++){
    let hash = snaps[i].hash;
    let date = snaps[i].stat.mtime;

    let img = await async_load_image(snaps[i].path);

    // img.style.objectFit = "cover";
    img.style.objectFit = "contain";
    img.src = snaps[i].path;
    // let ar = Math.max(0.25,Math.min(1,img.naturalHeight/img.naturalWidth));
    // img.width = 276;
    // img.height = 276*ar;
    img.width = 276;
    img.height = 276;


    let div = document.createElement("div");
    let ddv = document.createElement("div");
    ddv.style = `position:absolute;left:0px;top:0px;width:278px;height:${img.height}px`;
    
    div.appendChild(ddv);
    div.style = "border:1px solid black; background:black; width:278px;position:relative;margin-bottom:5px";

    let lbl0 = document.createElement("div");
    // lbl0.innerHTML = `<div style="font-size:12px;">${date.toLocaleString()}</div><div style="font-size:12px;">${hash}</div>`;
    lbl0.innerHTML = `<div style="font-size:15px;color:white;background:rgba(0,0,0,0.6);padding:5px;width:266px">${date.toLocaleString()}</div>`;
    lbl0.style = " position:absolute; left:0px;top:0px";
    let btn0 = document.createElement("button");
    btn0.innerHTML = "image";
    btn0.style = "font-size:12px;position:absolute;left:5px;bottom:5px";
    btn0.onclick = function(){
      ipcRenderer.send('popdown');
      cmd(`open "${snaps[i].path}"`);
    }

    let btn1 = document.createElement("button");
    btn1.innerHTML = "code";
    btn1.style = "font-size:12px;position:absolute;left:62px;bottom:5px";
    btn1.onclick = function(){
      checkout_snap(hash);
      let xcode = glob.sync(`${datapwd}/repo/src/*.xcodeproj`)[0];
      if (xcode){
        cmd(`open "${xcode}"`);
      }else{
        cmd(`open "${datapwd}/repo/src"`);
      }
    }
    
    let btn2 = document.createElement("button");
    btn2.innerHTML = "🗑";
    btn2.style = "font-size:16px;position:absolute;left:235px;bottom:5px;width:32px;height:32px;text-align:center";
    btn2.onclick = function(){
      cmd(`mv "${snaps[i].path}" ~/.Trash`);
      show_snaps();
    }

    ddv.appendChild(lbl0);
    ddv.appendChild(btn0);
    ddv.appendChild(btn1);
    ddv.appendChild(btn2);
    div.appendChild(img);

    div_snaps.appendChild(div);

    ddv.style.display="none";
    div.onmouseenter = function(){
      ddv.style.display="block";
      
    }
    div.onmouseleave = function(){
      ddv.style.display="none";
    }
    btn0.onmouseenter = function(){
      let h = 600;
      let w = img.naturalWidth/img.naturalHeight*600;
      ipcRenderer.send('popup',{path:snaps[i].path,w:~~w,h:~~h});
    }
    btn0.onmouseleave = function(){
      ipcRenderer.send('popdown');
    }

  }
}

btn_dirsnap.onclick = function(){
  ipcRenderer.send('cd',['DIR_SNAP']);
}
btn_pwd.onclick = function(){
  ipcRenderer.send('cd',['PWD']);
}

btn_back.onclick = function(){
  let datapwd = DATA_PATH+"/"+PWD;
  try{cmd(`cd "${datapwd}/repo"; git checkout master;`);}catch(e){/*whatever*/}
  div_screen_1.style.display = "none";
  div_screen_0.style.display = "block";
  PWD = null;
}



function show_screen_2(){
  let datapwd = DATA_PATH+"/"+PWD;
  div_screen_1.style.display = "none";
  div_screen_2.style.display = "block";
  lbl_cfg_proj_title.innerHTML = PWD.split("/").slice(-1)[0];
  lbl_cfg_proj_path.innerHTML = datapwd;
  inp_size_lim.value = PROJ_CONFIG['max-file-size'];
  inp_ignores.value = PROJ_CONFIG['ignore-list'].join('\n');

}


function remove_ignores(){
  let datapwd = DATA_PATH+"/"+PWD;
  for (let i = 0; i < PROJ_CONFIG['ignore-list'].length; i++){
    let pat = PROJ_CONFIG['ignore-list'][i];
    let files = glob.sync(datapwd+"/repo/src/"+pat);
    for (let j = 0; j < files.length; j++){
      cmd(`rm -rf "${files[j]}"`);
    }
  }  
  //https://unix.stackexchange.com/questions/287629/find-and-remove-files-bigger-than-a-specific-size-and-type/287633
  cmd(`find "${datapwd}/repo/src/" -size +${PROJ_CONFIG['max-file-size']}M -delete`);
}

btn_cfg.onclick = function(){
  show_screen_2();
}

btn_cfg_revert.onclick = function(){
  read_config();
  inp_size_lim.value = PROJ_CONFIG['max-file-size'];
  inp_ignores.value = PROJ_CONFIG['ignore-list'].join('\n');
}

function apply_config(){
  let n = Number(inp_size_lim.value);
  if (isNaN(n)){
    inp_size_lim.value = PROJ_CONFIG['max-file-size'];
  }else{
    PROJ_CONFIG['max-file-size'] = n;
  }
  PROJ_CONFIG['ignore-list'] = inp_ignores.value.split("\n").filter(x=>(x.length && !x.startsWith('#')));
  write_config();
}
btn_cfg_apply.onclick = function(){
  apply_config();

}
btn_cfg_ok.onclick = function(){
  apply_config();
  div_screen_2.style.display = "none";
  div_screen_1.style.display = "block";
}

btn_cfg_show_datapwd.onclick = function(){
  let datapwd = DATA_PATH+"/"+PWD;
  cmd(`open "${datapwd}"`);
}

btn_cfg_du.onclick = function(){
  let datapwd = DATA_PATH+"/"+PWD;
  let out = cmd(`cd "${datapwd}"; du -sh *`);
  alert(out);
}

function nuke(){
  let datapwd = DATA_PATH+"/"+PWD;
  let out = confirm("are you sure?");
  if (out){
    cmd(`mv "${datapwd}" ~/.Trash`);
    div_screen_2.style.display = "none";
    div_screen_1.style.display = "none";
    div_screen_0.style.display = "block";
    PWD = null;
  }
}

btn_cfg_nuke.onclick = function(){
  nuke();
}
btn_cfg_rebuild.onclick = function(){
  apply_config();
  nuke();
  setup_proj();
}


btn_quit.onclick = function(){
  ipcRenderer.send('die');
}



function spy_screenshots(){
  if (PWD == null) return;

  let all_screenshots = ls_screenshots();
  // console.log(all_screenshots);
  for (let i = 0; i < all_screenshots.length; i++){
    if (!old_screenshots.includes(all_screenshots[i])){
      add_snap(all_screenshots[i]);
      old_screenshots.push(all_screenshots[i]);
    }
  };
  

}



setInterval(spy_screenshots,1000);

