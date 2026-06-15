const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Set up LiveReload if not in production
if (process.env.NODE_ENV !== 'production') {
  try {
    const livereload = require('livereload');
    const connectLiveReload = require('connect-livereload');
    
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch(path.join(__dirname, 'public'));
    
    app.use(connectLiveReload());
    
    liveReloadServer.server.once("connection", () => {
      setTimeout(() => {
        liveReloadServer.refresh("/");
      }, 100);
    });
    console.log("LiveReload server started and watching 'public' folder");
  } catch (err) {
    console.log("LiveReload not configured or dependencies missing. Skipping.", err.message);
  }
}

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
