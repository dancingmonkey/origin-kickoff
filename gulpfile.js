// 'use strict'

const gulp = require('gulp'),
  run = require('gulp-run'),
  del = require('del'),
  autoprefixer = require('autoprefixer'),
  sass = require('gulp-sass')(require('sass')),
  rename = require('gulp-rename'),
  uglify = require('gulp-uglify'),
  postcss = require('gulp-postcss'),
  imagemin = require('gulp-imagemin'),
  cssnano = require('cssnano'),
  { noop } = require('gulp-util'),
  size = require('gulp-size'),
  newer = require('gulp-newer'),
  fs = require('fs'),
  sharp = require('sharp'),
  glob = require('glob'),
  path = require('path')

const debug = false

// development or production
const devBuild = (process.env.NODE_ENV || 'development') === 'development'
if (debug) {
  console.log('Gulp', devBuild ? 'development' : 'production', 'build')
}

// only needed during development
const browserSync = devBuild ? require('browser-sync').create() : null
const sourcemaps = devBuild ? require('gulp-sourcemaps') : null

// main folders
const dir = {
  src: '_assets/',
  build: '_site/assets/',
}

/**************** clean  ****************/

function clean(done) {
  del([dir.build])
  done()
}
exports.clean = clean

/**************** fonts  ****************/

function fonts() {
  return gulp.src(cssConfig.fontConfig.src).pipe(gulp.dest(cssConfig.fontConfig.build))
}

/**************** images task ****************/

// IMAGES FOLDER
const imgConfigOne = {
  src: dir.src + 'images/**/*',
  build: dir.build + 'images/',

  minOpts: {
    optimizationLevel: 5,
  },
}

function imagesOne() {
  return gulp
    .src(imgConfigOne.src)
    .pipe(newer(imgConfigOne.build))
    .pipe(imagemin(imgConfigOne.minOpts))
    .pipe(size({ showFiles: true }))
    .pipe(gulp.dest(imgConfigOne.build))
}

// ASSETS FOLDER
const imgConfigTwo = {
  src: dir.src + 'uploads/*',
  build: dir.build + 'uploads/',

  minOpts: {
    optimizationLevel: 5,
  },
}

function imagesTwo() {
  return gulp
    .src(imgConfigTwo.src)
    .pipe(newer(imgConfigTwo.build))
    .pipe(imagemin(imgConfigTwo.minOpts))
    .pipe(size({ showFiles: true }))
    .pipe(gulp.dest(imgConfigTwo.build))
}
exports.images = gulp.series(imagesOne, imagesTwo)

/**************** css ****************/

const cssConfig = {
  src: dir.src + 'styles/scss/main.scss',
  watch: dir.src + 'styles/scss/**/*.scss',
  build: dir.build + 'styles/',
  sassOpts: {
    sourceMap: devBuild,
    outputStyle: 'compressed',
    errLogToConsole: true,
  },
  postCss: [autoprefixer(), cssnano()],
  renameOpts: { suffix: '.min' },
  sizeOpts: { showFiles: true },
  fontConfig: {
    src: dir.src + 'fonts/**/*',
    build: dir.build + 'fonts/',
  },
  vendorCss: {
    src: dir.src + 'styles/libs/**/*.css',
    build: dir.build + 'styles/libs/',
  },
}

function css() {
  return gulp
    .src(cssConfig.src)
    .pipe(sourcemaps ? sourcemaps.init() : noop())
    .pipe(sass(cssConfig.sassOpts).on('error', sass.logError))
    .pipe(postcss(cssConfig.postCss))
    .pipe(rename(cssConfig.renameOpts))
    .pipe(sourcemaps ? sourcemaps.write() : noop()) // inline sourcemaps only dev env
    .pipe(size(cssConfig.sizeOpts))
    .pipe(gulp.dest(cssConfig.build))
    .pipe(browserSync ? browserSync.stream() : noop())
}

function vendorCss() {
  return gulp
    .src(cssConfig.vendorCss.src)
    .pipe(sourcemaps ? sourcemaps.init() : noop())
    .pipe(sass(cssConfig.sassOpts).on('error', sass.logError))
    .pipe(postcss(cssConfig.postCss))
    .pipe(rename(cssConfig.renameOpts))
    .pipe(sourcemaps ? sourcemaps.write() : noop()) // inline sourcemaps only dev env
    .pipe(size(cssConfig.sizeOpts))
    .pipe(gulp.dest(cssConfig.vendorCss.build))
    .pipe(browserSync ? browserSync.stream() : noop())
}

exports.css = gulp.series(fonts, exports.images, css, vendorCss)

/**************** javascript ****************/

const scriptConfig = {
  src: dir.src + 'js/*.js',
  build: dir.build + 'js/',
}

function myScripts() {
  return gulp
    .src(scriptConfig.src)
    .pipe(sourcemaps ? sourcemaps.init() : noop())
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps ? sourcemaps.write() : noop())
    .pipe(gulp.dest(scriptConfig.build))
    .pipe(browserSync ? browserSync.stream() : noop())
}

exports.scripts = myScripts

/**************** watch tasks ****************/

function watch(done) {
  // Images
  gulp.watch(imgConfigOne.src, imagesOne).on('change', browserSync.reload)
  gulp.watch(imgConfigTwo.src, imagesTwo).on('change', browserSync.reload)

  // css
  gulp.watch(cssConfig.watch, css).on('change', browserSync.reload)
  gulp.watch(cssConfig.vendorCss.src, vendorCss).on('change', browserSync.reload)

  // scripts
  gulp.watch(scriptConfig.src, myScripts).on('change', browserSync.reload)

  // Jekyll
  gulp.watch(jekyllConfig.watch, buildJekyll).on('change', browserSync.reload)

  done()
}

/**************** Jekyll tasks ****************/

const jekyllConfig = {
  // html and markdown files
  watch: ['**/*.+(html|md|markdown|MD|yml)', '_config.yml', '!_site/**', '!node_modules/**'],
}

function buildJekyll() {
  const shellCommand = 'bundle exec jekyll build'
  return gulp
    .src('.', { allowEmpty: true })
    .pipe(run(shellCommand))
    .pipe(browserSync ? browserSync.stream() : noop())
}
exports.buildJekyll = buildJekyll

/**************** server task ****************/

const syncConfig = {
  server: {
    baseDir: '_site',
  },
  notify: false,
  watch: false,
  ghostMode: false,
  port: 4000,
  open: true,
}

function server() {
  if (browserSync) browserSync.init(syncConfig)
}
exports.server = server

/* Responsive Images */
const transforms = [
  {
    src: dir.src + 'uploads/*',
    dist: dir.build + 'images/640w/',
    filename: '640w',
    options: {
      width: 640,
      fit: 'cover',
    },
  },
  {
    src: dir.src + 'uploads/*',
    dist: dir.build + 'images/960w/',
    filename: '960w',
    options: {
      width: 960,
      fit: 'cover',
    },
  },
  {
    src: dir.src + 'uploads/*',
    dist: dir.build + 'images/1280w/',
    filename: '1280w',
    options: {
      width: 1280,
      fit: 'cover',
    },
  },
  {
    src: dir.src + 'uploads/*',
    dist: dir.build + 'images/1600w/',
    filename: '1600w',
    options: {
      width: 1600,
      fit: 'cover',
    },
  },
]

// resize images with sharp
function resizeImages(done) {
  // loop through configuration array of objects
  transforms.forEach((transform) => {
    // if dist folder does not exist, create it with all parent folders
    if (!fs.existsSync(transform.dist)) {
      fs.mkdirSync(transform.dist, { recursive: true }, (err) => {
        if (err) throw err
      })
    }
    // glob all files
    let files = glob.sync(transform.src)
    if (debug) {
      console.log('Glob all files:')
      console.log(files)
    }
    // for each file, apply transforms and save to file
    files.forEach(function (file) {
      let filename = path.basename(file)
      if (debug) {
        console.log(`Filename: ${filename}`)
      }
      sharp(file)
        .resize(transform.options)
        .toFile(`${transform.dist}/${filename}`)
        .catch((err) => {
          console.log(err)
        })
    })
  })
  done()
}

exports.resizeImages = resizeImages

exports.dev = gulp.series(exports.css, exports.scripts, buildJekyll, watch, server)
exports.prod = gulp.series(exports.css, exports.scripts, resizeImages, buildJekyll)
