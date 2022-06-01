const { menubar } = require('menubar');
const {dialog, ipcMain, BrowserWindow, screen} = require('electron');


const mb = menubar({
  showDockIcon:false,
  icon:__dirname+"/icon.png",
  browserWindow:{
    // vibrancy: 'hud',
    // transparent: true,
    // opacity:0.9,
    width:300,
    height:600,
    // alwaysOnTop:true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      sandbox:false,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  },
  
});

mb.on('ready', () => {
  console.log('app is ready');
  // your app code here
  
});

mb.on('after-create-window',()=>{
  mb.app.dock.hide();

  // mb.window.openDevTools({mode: 'undocked'});
})

mb.on('hide',()=>{
  if (popup){
    popup.hide();
  }
})

// mb.app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');


ipcMain.on('cd', async function(e,x) {
  let result = await dialog.showOpenDialog(mb.window, {
    properties: ['openDirectory']
  });
  if (!result.canceled){
    mb.window.webContents.send('dir', {echo:x,path:result.filePaths[0]})
  }
  
});

ipcMain.on('die', function(){
  mb.app.quit();
})
// ipcMain.on('big', function(){
//   let [x,y] = mb.window.getPosition();
//   mb.window.setSize(900,600);
//   mb.window.setPosition(x-600,y);
//   // let {x,y} = mb.positioner.calculate('trayCenter');
// })

// ipcMain.on('small', function(){
//   let [x,y] = mb.window.getPosition();
//   mb.window.setSize(300,600);
//   mb.window.setPosition(x+600,y);
// })

let popup;

ipcMain.on('popup', function(e,X){
  console.log(X);
  let [x,y] = mb.window.getPosition();
  let {w,h} = X;
  let ar = h/w;
  w = Math.min(x-50,w);
  if (w < 1){
    return;
  }
  console.log(w,h);
  mb.window.setAlwaysOnTop(true);
  if (popup){
    popup.hide();
    popup.loadURL("file://"+X.path);
    popup.hide();
    popup.setPosition(x-w,y);
    popup.setSize(w,h);
    popup.webContents.once('did-finish-load', () => {
      popup.show();
    });
    
  }else{
    popup = new BrowserWindow({ 
      width: w, 
      height: h,
      frame: false,
      // alwaysOnTop: true,
      // visibleOnAllWorkspaces: true,
      // hasShadow: false
    });
    popup.loadURL("file://"+X.path);
    popup.setPosition(x-w,y);
  }
  
  
  // win.hide();
  // win.showInactive();
  // mb.window.setAlwaysOnTop(false);
  // win.loadURL('about:blank')
  // console.log(win);
})

ipcMain.on('popdown', function(){
  mb.window.setAlwaysOnTop(false);
  if (popup){
    // popup.hide();
    popup.close();
    popup = null;
  }
})