SystemJS.config({
  baseURL: ".",
  production: false,
  paths: {
    "npm:": "/jspm_packages/npm/",
    "alkindi-task-lib/": "dist/"
  }
});
