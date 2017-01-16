
const path = require('path');
const colors = require('colors/safe');
const fs = require('fs');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');

module.exports = function (config) {

  const isDevelopment = process.env.NODE_ENV !== 'production';
  console.log(`running in ${isDevelopment ? colors.red('development') : colors.green('production')} mode`);

  const app = express();
  app.use(bodyParser.json());

  //
  // Webpack configuration
  //
  if (isDevelopment) {
    // Use webpack to generate and serve build files.
    const webpack = require.main.require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const compiler = webpack(config.webpackConfig);
    app.use('/build', webpackDevMiddleware(compiler, {
      stats: {
        colors: true,
        chunks: false
      }
    }));
  } else {
    // Serve static build files.
    app.use('/build', express.static(config.webpackConfig.output.path));
  }

  //
  // Task frontend
  //
  app.get('/', function (req, res) {
    const options = {
      view: 'task'
    };
    if (process.env.MODE !== 'passive') {
      // TODO: get params, seed from query string
      const params = {};
      const seed = "";
      config.generate(params, seed, function (err, genOutput) {
        if (err) {
          console.log("generation failed", params, seed, err);
          return res.status(500).send("generation failed");
        }
        Object.assign(options, genOutput);
        sendResponse();
      })
    } else {
      sendResponse();
    }
    function sendResponse () {
      res.send([
        '<!DOCTYPE html>',
        '<meta charset="utf-8">',
        '<div id="task"><div id="container" class="container"></div></div>',
        '<script src="build/vendor.js"></script>',
        '<script src="build/bundle.js"></script>',
        `<script type="text/javascript">Task.run(document.getElementById('container'), ${JSON.stringify(options)});</script>`
      ].join("\n"));
    }
  });


  //
  // Task backend
  //

  app.post('/generate', function (req, res) {
    const {params, seed} = req.body;
    config.generate(params, seed, function (err, result) {
      if (err) {
        return res.status(500).json({success: false, error: err.toString()});
      }
      res.json(result);
    });
  });

  app.post('/getHint', function (req, res) {
    const {full_task, query} = req.body;
    config.getHint(full_task, query, function (result) {
      if (err) {
        return res.status(500).json({success: false, error: err.toString()});
      }
      res.json(result);
    });
  });

  app.post('/gradeAnswer', function (req, res) {
    const {full_task, task, answer} = req.body;
    config.gradeAnswer(full_task, task, answer, function (err, result) {
      if (err) {
        return res.status(500).json({success: false, error: err.toString()});
      }
      res.json(result);
    });
  });

  //
  // Let the task perform custom configuration.
  //
  if (typeof config.serverHook === 'function') {
    config.serverHook(app);
  }
  startServer(app, reportReadiness);

}

/**
  Start the http server.
  Set LISTEN to a TCP address or UNIX socket.
*/
function startServer (app, callback) {
  const server = http.createServer(app);
  const listen_addr = process.env.LISTEN || 8001;
  var is_unix_socket = typeof(listen_addr) == 'string' && listen_addr.startsWith('/');
  if (is_unix_socket) {
    fs.stat(listen_addr, function (err) {
      if (!err) { fs.unlinkSync(listen_addr); }
      fs.mkdir(path.dirname(listen_addr), function (err) {
        if (err && err.code != 'EEXIST') return callback(err);
        server.listen(listen_addr, function () {
          fs.chmod(listen_addr, 0o4777, function (err) {
            if (err) return callback(err);
            callback(null, listen_addr);
          });
        });
      })
    });
  } else {
    server.listen(listen_addr, function (err) {
      if (err) return callback(err);
      callback(null, listen_addr);
    });
  }
}

function reportReadiness (err, listen_addr) {
  if (err) {
    console.log(colors.bold.red(`Server failed to start`));
    throw err;
  }
  console.log(`PID ${process.pid} listening on ${colors.bold(listen_addr)}`);
}
