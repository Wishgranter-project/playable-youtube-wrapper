import PlayableYouTube from '../src/PlayableYouTube.js';

customElements.define('youtube-player', PlayableYouTube);

document.addEventListener('DOMContentLoaded', function()
{
    window.mediaPlayer   = document.getElementById('media-player');
    window.currentTime   = document.getElementById('current-time');
    window.remainingTime = document.getElementById('remaining-time');
    window.progressBar   = document.getElementById('progress-bar');
    window.logWindow     = document.querySelector('#log div');
    window.wrapper       = document.getElementById('youtube-wrapper');
    window.volume        = 15;

    //--------------------

    document.getElementById('toggle-play-pause').addEventListener('click', function() 
    {
        window.player.toggle();
    });

    document.querySelectorAll('#media-list a').forEach(function(a)
    {
        a.addEventListener('click', function(e)
        {
            e.preventDefault();

            if (window.player) {
                window.player.pause();
                window.player.remove();
            }

            window.player = newPlayer(this.attributes.href.value);
            window.player.appendTo(window.wrapper).then(() =>
            {
                window.player.setVolume(window.volume);
                window.player.play();
            });

            document.getElementById('title').innerHTML = a.querySelector(':scope .title').innerHTML;
            document.getElementById('artist').innerHTML = a.querySelector(':scope .artist').innerHTML;
        });
    });

    document.getElementById('progress-bar').addEventListener('click', function(e)
    {
        var x, width, perc;
        x     = e.clientX - this.offsetLeft;
        width = this.offsetWidth;
        perc  = Math.ceil((x / width) * 100)+'%';

        window.player.seek(perc)
    });

    document.getElementById('volume-slider').value = window.volume;
    document.getElementById('volume-slider').addEventListener('change', function()
    {
        window.volume = parseInt(this.value);
        window.player.setVolume(window.volume);
    });
});

function newPlayer(url) 
{
    var player = document.createElement('youtube-player');
    player.src = url;
    player.width = '100%';

    player
    .addEventListener('player:play', function()
    {
        log('Play');
    })
    
    player.addEventListener('player:pause', function()
    {
        log('Pause');
    })
    
    player.addEventListener('player:ended', function()
    {
        log('Ended');
    })
    
    player.addEventListener('player:timeupdate', function()
    {
        window.currentTime.innerHTML    = this.currentTimeFormatted;
        window.remainingTime.innerHTML  = this.remainingTimeFormatted;
        window.progressBar.value        = this.currentTimePercentage;
    })
    
    player.addEventListener('player:waiting', function()
    {
        window.mediaPlayer.classList.add('waiting');
        log('Waiting');
    })
    
    player.addEventListener('player:playing', function()
    {
        window.mediaPlayer.classList.remove('waiting');
        log('Playing');
    })
    
    player.addEventListener('player:error', function(evt)
    {
        log(evt.detail.errorMessage);
    });

    return player;
}

function log(msg)
{
    var p = document.createElement('p');
    p.innerHTML = msg;
    window.logWindow.append(p)
}
