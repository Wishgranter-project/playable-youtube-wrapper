var PlayerYouTube = require('../src/PlayerYouTube.js');

document.addEventListener('DOMContentLoaded', function()
{
    window.mediaPlayer                  = document.getElementById('media-player');
    window.currentTime                  = document.getElementById('current-time');
    window.remainingTime                = document.getElementById('remaining-time');
    window.progressBar                  = document.getElementById('progress-bar');
    window.logWindow                    = document.querySelector('#log div');

    //--------------------

    window.player                       = new PlayerYouTube({width: 'auto', wrapperId: 'youtube-wrapper'});

    window.player
    .addEventListener('play',           function()
    {
        log('Play');
    }).addEventListener('pause',        function()
    {
        log('Pause');
    }).addEventListener('ended',        function()
    {
        log('Ended');
    }).addEventListener('timeupdate',   function()
    {
        window.currentTime.innerHTML    = this.formattedCurrentTime;
        window.remainingTime.innerHTML  = this.formattedRemainingTime;
        window.progressBar.value        = this.currentPercentage;
    }).addEventListener('waiting',      function()
    {
        window.mediaPlayer.classList.add('waiting');
        log('Waiting');
    }).addEventListener('playing',      function()
    {
        window.mediaPlayer.classList.remove('waiting');
        log('Playing');
    }).addEventListener('error',        function(err)
    {
        log(err.errorMessage);
    });

    //--------------------

    document.getElementById('toggle-play-pause').addEventListener('click', window.player.toggle.bind(window.player));

    document.querySelectorAll('#media-list a').forEach(function(a)
    {
        a.addEventListener('click', function(e)
        {
            e.preventDefault();
            window.player.setData({href:this.attributes.href.value}).then(() =>
            {
                window.player.play();
            });

            document.getElementById('title').innerHTML = a.querySelector(':scope .title').innerHTML;
            document.getElementById('artist').innerHTML = a.querySelector(':scope .artist').innerHTML;
        });
    });

    document.getElementById('progress-bar').addEventListener('click', function(e)
    {
        var x, width, perc;
        x               = e.clientX - this.offsetLeft;
        width           = this.offsetWidth;
        perc            = Math.ceil((x / width) * 100)+'%';

        window.player.seek(perc)
    });

    document.getElementById('volume-slider').addEventListener('change', function()
    {
        var v = parseInt(this.value);
        window.player.setVolume(v);
    });
});

function log(msg)
{
    var p = document.createElement('p');
    p.innerHTML = msg;
    window.logWindow.append(p)
}
