var Player = require('multimedia-player');
var loadExternalJs = require('multimedia-player/src/functions.js').loadExternalJs;

class PlayerYouTube extends Player
{
    constructor(settings = null)
    {
        super();

        /*-------------------*/

        this.settings = this.defaults;

        if (typeof settings == 'string') {
            this.settings.wrapperId = settings;
        } else {
            this.settings = {...this.defaults, ...settings};
        }

        PlayerYouTube.count++;

        this.settings.wrapperId = this.settings.wrapperId ?
            this.settings.wrapperId :
            'youtube-wrapper'+PlayerYouTube.count;

        this.settings.embbedId = this.settings.embbedId ?
            this.settings.embbedId :
            'youtube-embbeded'+PlayerYouTube.count;

        /*-------------------*/

        this.wrapper        = null;     // element wrapping the video
        this.ytPlayer       = null;     // YT.Player object
        this.playerReady    = false;    // to start reproducing

        this.data           = null;
        this.volume         = 100;
        this.currentTime    = 0;
        this.follower       = null;     /* YouTube don't provide a timeupdate
        callback, so a timeinterval must be used instead */
    }

    get duration()
    {
        if (this.ytPlayer && this.ytPlayer.getDuration) {
            return this.ytPlayer.getDuration();
        }

        return 0;
    }

    async setData(data)
    {
        this.deployRootDiv();

        this.data = data;

        if (data.href) {
            data.id = PlayerYouTube.getIdFromUrl(data.href);
        }

        this.waiting = true;

        if (PlayerYouTube.sdkLoaded == false && PlayerYouTube.sdkPromisse == null) {
            PlayerYouTube.sdkPromisse = PlayerYouTube.loadSdk();
        }

        if (! PlayerYouTube.sdkLoaded) {
            return PlayerYouTube.sdkPromisse.then(async () =>
            {
                return this.setData(data);
            });
        }

        this.startFollowing();

        if (this.playerReady == false) {
            return this.initializePlayer().then(async () =>
            {
                this.playerReady = true;
            });
        }

        this.ytPlayer.loadVideoById(this.data.id);
        return new Promise(async (success, fail) =>
        {
            success(this);
        });
    }

    play(time = null)
    {
        if (time) {
            this.setCurrentTime(time);
        }
        this.ytPlayer.playVideo();
    }

    pause()
    {
        this.ytPlayer.pauseVideo();
    }

    setCurrentTime(time)
    {
        var seconds = this.sanitizeGetSeconds(time);
        this.ytPlayer.seekTo(seconds, true)
    }

    setVolume(vol)
    {
        this.volume = vol;
        this.ytPlayer.setVolume(vol);
    }

    cuePlaylist(id, index = null, startSeconds = 0, suggestedQuality = null)
    {
        this.ytPlayer.cuePlaylist(id);
    }

    reset()
    {
        this.stopFollowing();
        if (! this.ytPlayer) {
            return;
        }

        this.ytPlayer.destroy();
        this.ytPlayer = null;
    }

    deployRootDiv()
    {
        if (this.wrapper) {
            return true;
        }

        var wrap = document.getElementById(this.settings.wrapperId);

        this.wrapper = wrap ?
            wrap : this.createDiv(this.settings.wrapperId, document.body);

        this.createDiv(this.settings.embbedId, this.wrapper);
    }

    async initializePlayer()
    {
        return new Promise(async (success, fail) =>
        {
            var width   = this.settings.width;
            var height  = this.settings.height;

            if (this.settings.width == 'auto') {
                width     = this.wrapper.offsetWidth;
                height    = width / 1.77;
            }

            this.ytPlayer = new YT.Player(this.settings.embbedId,
            {
                width           : width,
                height          : height,
                videoId         : this.data.id,
                startSeconds    : 0,
                host:           'https://www.youtube.com',
                playerVars      : { autoplay: 1, controls: 1 },
                events          :
                {
                    onReady: (event) =>
                    {
                        success(this);
                        this.callBackOnReady(event);
                    },
                    onError: (errorCode) =>
                    {
                        fail(errorCode);
                        this.callBackOnError(errorCode);
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
        var t = this.ytPlayer && this.ytPlayer.getCurrentTime ? this.ytPlayer.getCurrentTime() : 0;

        if (t != this.currentTime) {
            this.currentTime = t;
            this.callBackOnTimeupdate();
        }
    }

    /*-------------------*/

    callBackOnReady(event)
    {
        this.setVolume(this.volume);
        this.onReady(event);
    }

    callBackOnStateChange(e)
    {
        var code = e.data;

        switch (code) {
            case -1:
                this.log('State change: -1 unstarted');
                this.reproducing    = false;
                this.playing        = false;
                this.paused         = false;
            break;
            case 0: /* encerrado */
                this.log('State change: 0 ended');
                this.reproducing    = false;
                this.playing        = false;
                this.paused         = true;
                this.waiting        = false;
                this.callBackOnEnded();
            break;
            case 1:
                this.log('State change: 1 playing');
                this.reproducing    = true;
                this.playing        = true;
                this.paused         = false;
                this.buffering      = false;
                this.waiting        = false;
                this.callbackOnReproducing();
            break;
            case 2:
                this.log('State change: 2 paused');
                this.reproducing    = false;
                this.playing        = false;
                this.paused         = true;
                this.waiting        = false;
            break;
            case 3:
                this.log('State change: 3 buffering');
                this.reproducing    = false;
                this.playing        = true;
                this.paused         = false;
                this.buffering      = true;
                this.waiting        = true;
            break;
            case 5:
                this.log('State change: 5 video cued');
                this.play(0)
            break;
        }

        this.onStateChange(code);
    }

    callBackOnError(errorCode)
    {
        switch (errorCode)
        {
            case 2:
                this.log('Error 2: invalid parameters.');
            break;
            case 5:
                this.log('Error 5: An error related to the HTML5 player occurred.');
            break;
            case 100:
                this.log('Error 100: Video not found.');
            break;
            case 101:
            case 150:
                this.log('Error 101: The video\'s owner won\'t allow it on embbed players.');
            break;
        }

        this.onError(errorCode);
    }

    callbackOnReproducing()
    {
        this.startFollowing();
    }

    callBackOnEnded()
    {
        this.stopFollowing();
        this.onEnded();
    }

    callBackOnTimeupdate()
    {
        this.onTimeupdate();
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
    return url.match(/v=([A-Za-z0-9-_]+)/)[1];
}

module.exports = PlayerYouTube;
