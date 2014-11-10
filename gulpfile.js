'use strict';
var serveStatic = require('serve-static')
var gulp = require('gulp');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var clean = require('gulp-clean');
var connect = require('connect');
var livereload = require('gulp-livereload');
var spawn = require('child_process').spawn;

var app = 'app';

gulp.task('scripts', function () {
  spawn('node_modules/traceur/traceur', ['--dir', 'app/scripts', '.tmp/scripts', '--modules=commonjs']);
  spawn('node_modules/traceur/traceur', ['--dir', 'app/scripts', 'dist/scripts', '--modules=commonjs']);
});

gulp.task('copy', ['images'], function () {
  return gulp.src([
      'node_modules/traceur/bin/traceur-runtime.js',
      'node_modules/es6-module-loader/dist/es6-module-loader.js',
      app + '/scripts/vendor/adapter.js'
    ])
    .pipe(gulp.dest('.tmp/scripts/vendor'))
    .pipe(gulp.dest('dist/scripts/vendor'));
});

gulp.task('images', function () {
  return gulp.src(app + '/images/*')
    .pipe(gulp.dest('.tmp/images'))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('styles', function () {
  return gulp.src(app + '/styles/main.scss')
    .pipe(sass())
    .pipe(autoprefixer('last 1 version'))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('html', ['styles'], function () {
  return gulp.src(app + '/*.html')
    .pipe(gulp.dest('.tmp'))
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
  return gulp.src(['dist', '.tmp'], {read: false})
    .pipe(clean());
});

gulp.task('connect', function () {
  var audioapp = connect()
    .use(require('connect-livereload')({ port: 35729 }))
    .use(serveStatic('.tmp', app))

  require('http').createServer(audioapp)
    .listen(9000)
    .on('listening', function () {
      console.log('Started connect web server on http://localhost:9000');
    });
});

gulp.task('watch', ['scripts', 'connect', 'copy', 'styles', 'html'], function () {
  var server = livereload();
  server.changed();

  gulp.watch([
    app + '/*.html',
    '.tmp/styles/**/*.css',
    '.tmp/scripts/**/*.js',
  ], function(file) {
    server.changed(file.path);
  });

  gulp.watch(app + '/*.html', ['html']);
  gulp.watch(app + '/styles/**/*.scss', ['styles']);
  gulp.watch(app + '/scripts/**/*.js', ['scripts']);
});

gulp.task('build', ['scripts', 'styles', 'copy', 'html']);

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});
