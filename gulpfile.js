var gulp = require('gulp');
var bower = require('gulp-bower');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var filter = require('gulp-filter');
var rename = require("gulp-rename");

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest('bower_components/'));
});

gulp.task('momentjs',['bower'],function(){
    var include = filter(['moment/min/moment.min.js', 'moment-range/lib/moment-range.min.js']);

    return gulp.src('bower_components/**')
        .pipe(include)
        .pipe(concat('moment.package.js'))
        .pipe(uglify())
        .pipe(gulp.dest('static/lib/'));
});

gulp.task('chartjs',['bower'],function(){
    var include = filter([
        'Chart.js/Chart.min.js',
        'angular-chart.js/dist/angular-chart.js',
        'Chart.StackedBar.js/src/Chart.StackedBar.js'
    ])
    return gulp.src('bower_components/**')
        .pipe(include)
        .pipe(concat('chartjs.package.js'))
        .pipe(uglify())
        .pipe(gulp.dest('static/lib/'))
});

gulp.task('chartcss', ['bower'], function(){
    return gulp.src('bower_components/angular-chart.js/dist/angular-chart.css')
        .pipe(minifyCss({keepSpecialComments: 0}))
        .pipe(rename('chartjs.package.css'))
        .pipe(gulp.dest('static/lib/'))
})
gulp.task('default', ['chartjs', 'chartcss', 'momentjs']);