const gulp    = require('gulp');
const rename  = require('gulp-rename');
const webpack = require('webpack-stream');

function task(input, output) 
{
    return async function() 
    {
        return gulp.src('./examples/'+ input)

        .pipe(webpack({
            mode: 'production',
        }))

        .pipe(rename(output))

        .pipe(gulp.dest('./examples/'));
    }
}

buildFirst = task('1-main.js', '1-main-bundle.js');
buildSecond = task('2-main.js', '2-main-bundle.js');

exports.buildFirst = buildFirst;
exports.buildSecond = buildSecond;
exports.default = gulp.series(buildFirst, buildSecond);
