var PlayerYouTube = require('../src/PlayerYouTube.js');

document.addEventListener('DOMContentLoaded', function()
{
    window.player                       = new PlayerYouTube({width: 'auto', wrapperId: 'youtube-wrapper'});
    window.mediaPlayer                  = document.getElementById('media-player');
    window.currentTime                  = document.getElementById('current-time');
    window.remainingTime                = document.getElementById('remaining-time');
    window.progressBar                  = document.getElementById('progress-bar');

    window.player.onTimeupdate          = function()
    {
        window.currentTime.innerHTML    = this.currentTimer;
        window.remainingTime.innerHTML  = this.remainingTimer;
        window.progressBar.value        = this.currentPercentage;
    }

    window.player.onStateChange         = function(code)
    {
        if (this.waiting) {
            window.mediaPlayer.classList.add('waiting');
        } else {
            window.mediaPlayer.classList.remove('waiting');
        }
    }

    document.getElementById('toggle-play-payse').addEventListener('click', window.player.toggle.bind(window.player));

    document.querySelectorAll('#media-list a').forEach(function(a)
    {
        a.addEventListener('click', function(e)
        {
            e.preventDefault();
            window.player.setData({href:this.attributes.href.value}).then(() => {
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

        window.player.setCurrentTime(perc)
    });

    document.getElementById('volume-slider').addEventListener('change', function()
    {
        var v = parseInt(this.value);
        window.player.setVolume(v);
    });
});
