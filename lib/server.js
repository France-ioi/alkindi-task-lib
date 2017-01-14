
const path = require('path');
const colors = require('colors/safe');
const fs = require('fs');
const express = require('express');
const http = require('http');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

module.exports = function (config) {

  const isDevelopment = process.env.NODE_ENV !== 'production';
  console.log(`running in ${isDevelopment ? colors.red('development') : colors.green('production')} mode`);

  const app = express();

  //
  // Webpack configuration
  //
  if (isDevelopment) {
    // Serve development build files.
    const compiler = webpack(config.webpackConfig);
    app.use('/build', webpackDevMiddleware(compiler, {
      stats: {
        colors: true,
        chunks: false
      }
    }));
  } else {
    // Serve production build files.
    app.use('/build', express.static(config.webpackConfig.output.path));
  }

  //
  // Task frontend
  //
  app.get('/', function (req, res) {
    const options = {
      view: 'workspace'
    };
    if (isDevelopment) {
      Object.assign(options, config.generate());
    }
    res.send(
  `<!DOCTYPE html>
  <meta charset="utf-8">
  <div id="task"><div id="container" class="container"></div></div>
  <script src="build/vendor.js"></script>
  <script src="build/bundle.js"></script>
  <script type="text/javascript">Task.run(document.getElementById('container'), ${JSON.stringify(options)});</script>`);
  });

  //
  // Let the task perform custom configuration.
  //
  if (typeof config.serverHook === 'function') {
    config.serverHook(app);
  }

  //
  // Start http server.
  //
  const server = http.createServer(app);
  const listen_addr = process.env.LISTEN || 8001;
  var is_unix_socket = typeof(listen_addr) == 'string' && listen_addr.startsWith('/');
  if (is_unix_socket) {
    fs.stat(listen_addr, function (err) {
      if (!err) { fs.unlinkSync(listen_addr); }
      fs.mkdir(path.dirname(listen_addr), function (err) {
        if (err && err.code != 'EEXIST') throw err;
        server.listen(listen_addr, function () {
          fs.chmod(listen_addr, 0o4777, function (err) {
            if (err) throw err;
            reportReadiness();
          });
        });
      })
    });
  } else {
    server.listen(listen_addr, function (err) {
      if (err) throw err;
      reportReadiness();
    });
  }
  function reportReadiness () {
    console.log(`PID ${process.pid} listening on ${colors.bold(listen_addr)}`);
  }

}
