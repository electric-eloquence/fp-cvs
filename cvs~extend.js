'use strict';

const execSync = require('child_process').execSync;
const path = require('path');

const fs = require('fs-extra');
const glob = require('glob');
const gulp = require('gulp');
const utils = require('fepper-utils');
const yaml = require('js-yaml');

const conf = global.conf;
const pref = global.pref;
const appDir = global.appDir;
const rootDir = global.rootDir;

const srcDir = `${rootDir}/${conf.ui.paths.source.root}`;

const cvsDirDefaults = {
  assets: pref.backend.synced_dirs.assets_dir,
  scripts: pref.backend.synced_dirs.scripts_dir,
  styles: pref.backend.synced_dirs.styles_dir,
  templates: pref.backend.synced_dirs.templates_dir
};

const cvsExtDefaults = {
  assets: utils.extNormalize(pref.backend.synced_dirs.assets_ext),
  scripts: utils.extNormalize(pref.backend.synced_dirs.scripts_ext),
  styles: utils.extNormalize(pref.backend.synced_dirs.styles_ext),
  templates: utils.extNormalize(pref.backend.synced_dirs.templates_ext)
};

const plnDirDefaults = {
  assets: `${srcDir}/_assets`,
  scripts: `${srcDir}/_scripts/src`,
  styles: `${srcDir}/_styles`,
  templates: `${srcDir}/_patterns/03-templates`
};

function cvsProcessExec(cmd, file) {
  const stdout = execSync(`cvs ${cmd} ${file}`, {encoding: conf.enc}).trim();

  if (stdout) {
    utils.log(stdout);
  }
}

function cvsProcess(cmd, argv) {
  const types = ['assets', 'scripts', 'styles', 'templates'];

  // ///////////////////////////////////////////////////////////////////////////
  // First, process Pattern Lab files with corresponding YAML files.
  // ///////////////////////////////////////////////////////////////////////////
  for (let i = 0; i < types.length; i++) {
    const files = glob.sync(plnDirDefaults[types[i]] + '/**/*.yml');

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
        cvsDir = data[`${types[i]}_dir`].trim();

        // Don't want to validate local existence if checking out.
        if (cmd !== 'co') {
          cvsDir = utils.backendDirCheck(rootDir, cvsDir) ? cvsDir : '';
        }
      }
      else {
        cvsDir = cvsDirDefaults.types[i];

        // Don't want to validate local existence if checking out.
        if (cmd !== 'co') {
          cvsDir = utils.backendDirCheck(rootDir, cvsDir) ? cvsDir : '';
        }

        if (cvsDir) {
          nestedDirs = path.dirname(files[j]).replace(plnDirDefaults[types[i]], '');
          cvsDir += nestedDirs;
        }
      }

      if (typeof data[`${types[i]}_ext`] === 'string') {
        cvsExt = utils.extNormalize(data[`${types[i]}_ext`]);
      }
      else {
        cvsExt = cvsExtDefaults[types[i]];
      }

      if (cvsDir && cvsExt) {
        if (cmd === 'co') {
          if (argv && argv.d) {
            cvsDir = `${argv.d}/${cvsDir}`;
          }
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
    yml = fs.readFileSync(`${rootDir}/extend/custom/fp-cvs/cvs.yml`, conf.enc);
    data = yaml.safeLoad(yml);
  }
  catch (err) {
    // Fail gracefully.
    return;
  }

  if (!(data instanceof Object) || !Array.isArray(data.cvs_files)) {
    return;
  }

  for (let i = 0; i < data.cvs_files.length; i++) {
    let cvsFile = '';

    if (cmd === 'co') {
      if (argv && argv.d) {
        cvsFile = `${argv.d}/${data.cvs_files[i]}`;
      }
      else {
        cvsFile = data.cvs_files[i];
      }
    }
    else {
      cvsFile = `backend/${data.cvs_files[i]}`;
    }

    cvsProcessExec(cmd, cvsFile);
  }
}

// Vars for Gulp tasks.
const pathIn = rootDir;
const pathOut = appDir;

// Requires a single argument of -c
gulp.task('cvs', function (cb) {
  const argv = require('yargs').argv;

  process.chdir(pathIn);

  if (argv.c && typeof argv.c === 'string') {
    // Fepper's fp bash script replaces single-quotes with double-quotes.
    // We need to strip those double-quotes.
    let cmd = argv.c.replace(/^"(.*)"$/, '$1');
    cvsProcess(cmd);
  }
  else {
    utils.error('Error: need a -c argument!');
  }

  process.chdir(pathOut);
  cb();
});

// Requires a single argument of -m
gulp.task('cvs:ci', function (cb) {
  const argv = require('yargs').argv;

  process.chdir(pathIn);

  if (argv.m && typeof argv.m === 'string') {
    cvsProcess(`ci -m ${argv.m}`);
  }
  else {
    utils.error('Error: need a -m argument!');
  }

  process.chdir(pathOut);
  cb();
});

// Takes an optional argument of -d
gulp.task('cvs:co', function (cb) {
  const argv = require('yargs').argv;

  // Must change working dir even higher in order for CVS checkout to work.
  process.chdir(`${pathIn}/../`);
  cvsProcess('co', argv);
  process.chdir(pathOut);
  cb();
});

gulp.task('cvs:st', function (cb) {
  process.chdir(pathIn);
  cvsProcess('st');
  process.chdir(pathOut);
  cb();
});

gulp.task('cvs:up', function (cb) {
  process.chdir(pathIn);
  cvsProcess('up');
  process.chdir(pathOut);
  cb();
});
