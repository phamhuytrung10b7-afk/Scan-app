const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Quan trọng để React có thể chạy script
    }
  });

  // Sử dụng path.resolve để đảm bảo đường dẫn tuyệt đối chính xác
  const indexPath = path.resolve(__dirname, 'dist', 'index.html');
  
  win.loadFile(indexPath).catch(e => console.error("Lỗi nạp file:", e));

  // Tự động mở DevTools khi chạy để bạn thấy lỗi ngay lập tức
  // win.webContents.openDevTools(); 
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});