'use strict';

const conf = global.conf;
const pref = global.pref;

const execSync = require('child_process').execSync;
const fs = require('fs-extra');
const glob = require('glob');
const gulp = require('gulp');
const path = require('path');
const yaml = require('js-yaml');

const utils = require('../../../core/lib/utils');

const ROOT_DIR = utils.rootDir();

const cvsDirDefaults = {
  assets: utils.backendDirCheck(ROOT_DIR, pref.backend.synced_dirs.assets_dir) ? pref.backend.synced_dirs.assets_dir : '',
  scripts: utils.backendDirCheck(ROOT_DIR, pref.backend.synced_dirs.scripts_dir) ? pref.backend.synced_dirs.scripts_dir : '',
  styles: utils.backendDirCheck(ROOT_DIR, pref.backend.synced_dirs.styles_dir) ? pref.backend.synced_dirs.styles_dir : '',
  templates: utils.backendDirCheck(ROOT_DIR, pref.backend.synced_dirs.templates_dir) ? pref.backend.synced_dirs.templates_dir : ''
};

const cvsExtDefaults = {
  assets: utils.extCheck(pref.backend.synced_dirs.assets_ext),
  scripts: utils.extCheck(pref.backend.synced_dirs.scripts_ext),
  styles: utils.extCheck(pref.backend.synced_dirs.styles_ext),
  templates: utils.extCheck(pref.backend.synced_dirs.templates_ext)
};

const plnDirDefaults = {
  assets: `${ROOT_DIR}/${conf.src}/assets`,
  scripts: `${ROOT_DIR}/${conf.src}/scripts/src`,
  styles: `${ROOT_DIR}/${conf.src}/styles`,
  templates: `${ROOT_DIR}/${conf.src}/_patterns/03-templates`
};

function cvsProcessExec(cmd, file) {
  var stdout = execSync(`cvs ${cmd} ${file}`, {encoding: conf.enc}).trim();
  if (stdout) {
    utils.log(stdout);
  }
}

function cvsProcess(cmd, argv) {
  var types = ['assets', 'scripts', 'styles', 'templates'];

  // ///////////////////////////////////////////////////////////////////////////
  // First, process Pattern Lab files with corresponding YAML files.
  // ///////////////////////////////////////////////////////////////////////////
  for (let i = 0; i < types.length; i++) {
    let files = glob.sync(plnDirDefaults[types[i]] + '/**/*.yml');

    for (let j = 0; j < files.length; j++) {
      let cvsDir = '';
      let cvsExt = '';
      let cvsFile = '';
      let data = {};
      let nestedDirs = '';
      let stats = null;
      let yml = '';

      try {
        stats = fs.statSync(files[j]);
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
        yml = fs.readFileSync(files[j], conf.enc);
        data = yaml.safeLoad(yml);
      }
      catch (err) {
        utils.error(err);
        continue;
      }

      if (typeof data[`${types[i]}_dir`] === 'string') {
        cvsDir = utils.backendDirCheck(ROOT_DIR, data[`${types[i]}_dir`]) ? data[`${types[i]}_dir`] : '';
        cvsDir = cvsDir.trim();
      }
      else {
        nestedDirs = path.dirname(files[j]).replace(plnDirDefaults[types[i]], '');
        cvsDir = cvsDirDefaults.types[i] + nestedDirs;
      }

      if (typeof data[`${types[i]}_ext`] === 'string') {
        cvsExt = utils.extCheck(data[`${types[i]}_ext`]);
      }
      else {
        cvsExt = cvsExtDefaults[types[i]];
      }

      if (cvsDir && cvsExt) {
        if (argv && argv.d) {
          cvsDir = `${argv.d}/${cvsDir}`;
        }
        else {
          cvsDir = `backend/${cvsDir}`;
        }

        cvsFile = cvsDir + '/' + path.basename(files[j]).replace(/\.yml$/, `.${cvsExt}`);
        cvsProcessExec(cmd, cvsFile);
      }
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Next, process files listed in cvs-files.yml.
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
    let cvsFile = '';
    let stats = null;

    if (argv && argv.d) {
      cvsFile = `${argv.d}/${data.cvs_files[i]}`;
    }
    else {
      cvsFile = `backend/${data.cvs_files[i]}`;
    }

    cvsProcessExec(cmd, cvsFile);
  }
}

// Requires a single argument of -c
gulp.task('cvs', function (cb) {
  let argv = require('yargs')(process.argv).argv;

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

// Requires a single argument of -d
gulp.task('cvs:co', function (cb) {
  let argv = require('yargs')(process.argv).argv;

  if (argv.d && typeof argv.d === 'string') {
    // Must change working dir in order for CVS checkout to work.
    process.chdir('../');
    cvsProcess('co', argv);
    process.chdir(`${__dirname}/../../../`);
  }
  else {
    utils.error('Error: need a -d argument!');
  }
  cb();
});

// Requires a single argument of -m
gulp.task('cvs:ci', function (cb) {
  let argv = require('yargs')(process.argv).argv;

  if (argv.m && typeof argv.m === 'string') {
    cvsProcess(`ci -m ${argv.m}`);
  }
  else {
    utils.error('Error: need a -m argument!');
  }
  cb();
});

gulp.task('cvs:st', function (cb) {
  cvsProcess('st');
  cb();
});

gulp.task('cvs:up', function (cb) {
  cvsProcess('up');
  cb();
});
