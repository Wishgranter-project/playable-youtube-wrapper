var Player          = require('multimedia-player-interface');
var loadExternalJs  = require('multimedia-player-interface/src/functions.js').loadExternalJs;

class PlayerYouTube extends Player
{
    constructor(settings = null)
    {
        super();

        PlayerYouTube.count++;

        //--------------------------

        this.settings = this.defaults;

        if (typeof settings == 'string') {
            this.settings.wrapperId = settings;
        } else {
            this.settings = {...this.defaults, ...settings};
        }

        //--------------------------

        this.settings.wrapperId = this.settings.wrapperId ?
            this.settings.wrapperId :
            'youtube-wrapper-'+PlayerYouTube.count;

        this.settings.embbedId = this.settings.embbedId ?
            this.settings.embbedId :
            'youtube-embbeded-'+PlayerYouTube.count;

        //--------------------------

        this.data = null;

        //--------------------------

        this.html =
        {
            wrapper     : null, // element wrapping the video
            ytPlayer    : null  // YT.Player object
        }

        //--------------------------

        // YouTube don't provide a timeupdate
        // callback, so a timeinterval must be used instead
        this.follower = null;

        //--------------------------

        this.state.currentTime          = 0;
        this.state.playerInitialized    = false;
    }

    get currentTime()
    {
        return this.state.currentTime;
    }

    get duration()
    {
        if (this.html.ytPlayer && this.html.ytPlayer.getDuration) {
            return this.html.ytPlayer.getDuration();
        }

        return 0;
    }

    async setData(data)
    {
        this.data = data;
        if (data.href) {
            data.id = PlayerYouTube.getIdFromUrl(data.href);
        }

        //--------------------

        this.setUpWrappingDiv();

        this.state.waiting = true;

        if (PlayerYouTube.sdkLoaded == false && PlayerYouTube.sdkPromisse == null) {
            PlayerYouTube.sdkPromisse = PlayerYouTube.loadSdk();
        }

        if (! PlayerYouTube.sdkLoaded) {
            return PlayerYouTube.sdkPromisse.then(async () =>
            {
                return this.setData(data);
            });
        }

        //--------------------

        this.startFollowing();

        if (this.state.playerInitialized == false) {
            return this.initializePlayer().then(async () =>
            {
                this.state.playerInitialized = true;
            });
        }

        //--------------------

        this.html.ytPlayer.loadVideoById(this.data.id);
        return new Promise(async (success, fail) =>
        {
            success(this);
        });
    }

    seek(time)
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        var seconds = this.sanitizeGetSeconds(time);
        this.html.ytPlayer.seekTo(seconds, true)
    }

    play(time = null)
    {
        if (time) {
            this.seek(time);
        }

        if (! this.state.playerInitialized) {
            return false;
        }

        this.html.ytPlayer.playVideo();
    }

    pause()
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        this.html.ytPlayer.pauseVideo();
    }

    setVolume(vol)
    {
        this.state.volume = vol;

        if (! this.state.playerInitialized) {
            return;
        }

        this.html.ytPlayer.setVolume(vol);
    }

    cuePlaylist(id, index = null, startSeconds = 0, suggestedQuality = null)
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        this.html.ytPlayer.cuePlaylist(id);
    }

    reset()
    {
        this.stopFollowing();
        if (! this.html.ytPlayer) {
            return;
        }

        this.html.ytPlayer.destroy();
        this.html.ytPlayer = null;
    }

    setUpWrappingDiv()
    {
        if (this.html.wrapper) {
            return true;
        }

        var wrap = document.getElementById(this.settings.wrapperId);

        this.html.wrapper = wrap ?
            wrap :
            this.createDiv(this.settings.wrapperId, document.body);

        this.createDiv(this.settings.embbedId, this.html.wrapper);
    }

    async initializePlayer()
    {
        return new Promise(async (success, fail) =>
        {
            var width   = this.settings.width;
            var height  = this.settings.height;

            if (this.settings.width == 'auto') {
                width     = this.html.wrapper.offsetWidth;
                height    = width / 1.77;
            }

            this.html.ytPlayer = new YT.Player(this.settings.embbedId,
            {
                width           : width,
                height          : height,
                videoId         : this.data.id,
                startSeconds    : 0,
                host            : 'https://www.youtube.com',
                playerVars      : { autoplay: 1, controls: 0 },
                events          :
                {
                    onReady: (event) =>
                    {
                        success(this);
                        this.setVolume(this.volume);
                    },
                    onError: (code) =>
                    {
                        var message = PlayerYouTube.getErrorDescription(code);
                        fail(message);
                        this.onError(code, message);
                    },
                    onStateChange: this.callBackOnStateChange.bind(this)
                }
            });
        });
    }

    /*-------------------*/

    startFollowing()
    {
        this.follower = setInterval(this.following.bind(this), 1000);
    }

    stopFollowing()
    {
        clearInterval(this.follower);
    }

    following()
    {
        var t = this.html.ytPlayer && this.html.ytPlayer.getCurrentTime ? this.html.ytPlayer.getCurrentTime() : 0;

        if (t != this.currentTime) {
            this.state.currentTime = t;
            this.onTimeupdate();
        }
    }

    /*-------------------*/

    callBackOnStateChange(e)
    {
        switch (e.data) {
            case -1: // -1 unstarted
                this.state.reproducing    = false;
                this.state.playing        = false;
                this.state.paused         = false;
            break;
            case 0: // 0 ended
                this.state.reproducing    = false;
                this.state.playing        = false;
                this.state.paused         = true;
                this.state.waiting        = false;

                this.stopFollowing();
                this.onEnded();
            break;
            case 1: // 1 playing
                var waiting = this.state.waiting

                this.state.reproducing    = true;
                this.state.playing        = true;
                this.state.paused         = false;
                this.state.buffering      = false;
                this.state.waiting        = false;

                this.startFollowing();

                if (waiting) {
                    this.onPlaying();
                } else {
                    this.onPlay();
                }
            break;
            case 2: // 2 paused
                this.state.reproducing    = false;
                this.state.playing        = false;
                this.state.paused         = true;
                this.state.waiting        = false;

                this.onPause();
            break;
            case 3: // 3 buffering
                this.state.reproducing    = false;
                this.state.playing        = true;
                this.state.paused         = false;
                this.state.buffering      = true;
                this.state.waiting        = true;

                this.onWaiting();
            break;
            case 5: // 5 video cued
                this.play(0);
                this.onPlay();
            break;
        }
    }

    createDiv(id, parent)
    {
        var div = document.createElement('div');
        div.id = id;
        parent.append(div);

        return div;
    }
}

PlayerYouTube.sdkPromisse   = null;
PlayerYouTube.sdkLoaded     = false;
PlayerYouTube.count         = 0;
PlayerYouTube.prototype.defaults =
{
    width       : 640,
    height      : 360
};

PlayerYouTube.loadSdk = async function()
{
    return new Promise(async (success, fail) =>
    {
        loadExternalJs('https://www.youtube.com/iframe_api').then(
            async () =>
            {
                setTimeout(() =>
                    {
                        PlayerYouTube.sdkLoaded = true;
                        success('YouTube SDK ready');
                    }, 500
                );
            },

            () =>
            {
                fail('Error loading SDK');
            }
        );
    });
}

PlayerYouTube.getIdFromUrl = function(url)
{
    var m;

    if (m = url.match(/v=([A-Za-z0-9-_]+)/)) { // rerular ?v=id url
        return m[1];
    }

    if (m = url.match(/\.be\/([A-Za-z0-9-_]+)/)) { // short url
        return m[1];
    }

    if (m = url.match(/embed\/([A-Za-z0-9-_]+)/)) { // embbed url
        return m[1];
    }

    return null;
}

PlayerYouTube.getErrorDescription = function(errorCode)
{
    switch (errorCode)
    {
        case 2:
            return 'Error 2: invalid parameters.';
        break;
        case 5:
            return 'Error 5: An error related to the HTML5 player occurred.';
        break;
        case 100:
            return 'Error 100: Video not found.';
        break;
        case 101:
        case 150:
            return 'Error 101: The video\'s owner won\'t allow it on embbed players.';
        break;
    }

    return 'Error '+errorCode+': Unknown error';
}

module.exports = PlayerYouTube;
