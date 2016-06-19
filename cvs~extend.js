'use strict';

const conf = global.conf;
const pref = global.pref;

const argv = require('yargs').argv;
const execSync = require('child_process').execSync;
const fs = require('fs-extra');
const glob = require('glob');
const gulp = require('gulp');
const path = require('path');
const yaml = require('js-yaml');

const utils = require('../../../core/lib/utils');

const ROOT_DIR = utils.rootDir();
const TEMPLATES_DIR_DEFAULT = utils.backendDirCheck(ROOT_DIR, pref.backend.synced_dirs.templates_dir);
const TEMPLATES_EXT_DEFAULT = utils.extCheck(pref.backend.synced_dirs.templates_ext);

function cvsProcessExec(cmd, file) {
  var stdout = execSync(`cvs ${cmd} ${file}`, {encoding: conf.enc}).trim();
  if (stdout) {
    utils.log(stdout);
  }
}

function cvsProcess(cmd) {
  var files = glob.sync(`${conf.src}/_patterns/03-templates/**/*.yml`);

  // ///////////////////////////////////////////////////////////////////////////
  // First, process template patterns with corresponding YAML files.
  // ///////////////////////////////////////////////////////////////////////////
  for (let i = 0; i < files.length; i++) {
    let cvsDir = '';
    let cvsFile = '';
    let data = {};
    let stats = null;
    let templatesDir = '';
    let templatesExt = '';
    let yml = '';

    try {
      stats = fs.statSync(files[i]);
    }
    catch (err) {
      // Fail gracefully.
      continue;
    }

    // Only process valid files.
    if (!stats || !stats.isFile()) {
      continue;
    }

    try {
      yml = fs.readFileSync(files[i], conf.enc);
      data = yaml.safeLoad(yml);
    }
    catch (err) {
      utils.error(err);
      continue;
    }

    if (typeof data.templates_dir === 'string') {
      templatesDir = utils.backendDirCheck(ROOT_DIR, data.templates_dir);
    }
    else {
      templatesDir = TEMPLATES_DIR_DEFAULT;
    }

    if (typeof data.templates_ext === 'string') {
      templatesExt = utils.extCheck(data.templates_ext);
    }
    else {
      templatesExt = TEMPLATES_EXT_DEFAULT;
    }

    if (templatesDir && templatesExt) {
      cvsDir = utils.backendDirCheck(ROOT_DIR, data.templates_dir).replace(`${ROOT_DIR}/`, '');
      cvsFile = cvsDir + '/' + path.basename(files[i]).replace(/\.yml$/, `.${templatesExt}`);
      cvsProcessExec(cmd, cvsFile);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Next, process files listed in cvs.yml.
  // ///////////////////////////////////////////////////////////////////////////
  let yml = '';
  let data = {};

  try {
    yml = fs.readFileSync(`${ROOT_DIR}/extend/custom/fp-cvs/cvs.yml`, conf.enc);
    data = yaml.safeLoad(yml);
  }
  catch (err) {
    // Fail gracefully.
    return;
  }

  if (!data instanceof Object || !Array.isArray(data.cvs_files)) {
    return;
  }

  for (let i = 0; i < data.cvs_files.length; i++) {
    let cvsFile = `backend/${data.cvs_files[i]}`;
    let stats = null;

    try {
      stats = fs.statSync(cvsFile);
    }
    catch (err) {
      // Fail gracefully.
      continue;
    }

    // Only process valid files.
    if (!stats || !stats.isFile()) {
      continue;
    }

    cvsProcessExec(cmd, cvsFile);
  }
}

// Requires a single argument of -c
gulp.task('cvs', function (cb) {
  if (argv.c && typeof argv.c === 'string') {
    // Fepper's fp bash script replaces single-quotes with double-quotes.
    // We need to strip those double-quotes.
    let cmd = argv.c.replace(/^"(.*)"$/, '$1');
    cvsProcess(cmd);
  }
  else {
    utils.error('Error: need a -c argument!');
  }
  cb();
});

// Requires a single argument of -m
gulp.task('cvs:commit', function (cb) {
  if (argv.m && typeof argv.m === 'string') {
    cvsProcess(`commit -m ${argv.m}`);
  }
  else {
    utils.error('Error: need a -m argument!');
  }
  cb();
});

gulp.task('cvs:status', function (cb) {
  cvsProcess('status');
  cb();
});

gulp.task('cvs:up', function (cb) {
  cvsProcess('up');
  cb();
});
