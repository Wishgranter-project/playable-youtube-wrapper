'use strict';

import { Foundation, Helpers } from 'multimedia-player-interface';

class PlayerYouTube extends Foundation 
{
    static sdkLoaded  = false;
    static sdkLoading = false;
    static sdkPromise = null;
    static defaults   = {
        width:  640,
        height: null
    }

    constructor() 
    {
        super();

        this.state.currentTime = 0;
        this.state.playerInitialized = false;

        var settings = {
            embbedId:  'youtube-embbed-'  + Math.floor(Math.random() * 10000),
            id:        null,
        }

        this.settings = {...PlayerYouTube.defaults, ...settings};

        this.html = {}

        this.follower = null;
    }

    connectedCallback() 
    {
        if (!this.html.embed) {
            this.setUp();
        }
    }

    setUp() 
    {
        var src, videoId, width, height;

        this.html.embed = this.createDiv(this.settings.embbedId, this);

        if (src = this.getAttribute('src')) {
            this.src = src;
        }

        if (videoId = this.getAttribute('video-id')) {
            this.videoId = videoId;
        }

        if (width = this.getAttribute('width')) {
            this.width = width;
        }

        if (height = this.getAttribute('height')) {
            this.height = height;
        }

        return this.readyToPlayPromise = PlayerYouTube.loadSdk().then( () => 
        {
            return this.initializePlayer();
        });
    }

    remove() 
    {
        if (this.html.ytPlayer) {
            this.html.ytPlayer.destroy();
        }

        super.remove();
    }

    /**
     * @inheritdoc
     */
    appendTo(parentElement) 
    {
        parentElement.append(this);
        return this.readyToPlayPromise;
    }

    /**
     * @inheritdoc
     */
    prependTo(parentElement)
    {
        parentElement.prepend(this);
        return this.readyToPlayPromise;
    }

    /**
     * @inheritdoc
     */
    appendAfter(siblingElement)
    {
        siblingElement.after(this);
        return this.readyToPlayPromise;
    }

    set src(src) 
    {
        this.settings.id = PlayerYouTube.getIdFromUrl(src);
    }

    set videoId(videoId) 
    {
        this.settings.id = videoId;
    }

    set width(width) 
    {
        this.settings.width = parseInt(width);
        this.updateDimensions();
    }

    set height(height) 
    {
        this.settings.height = parseInt(height);
        this.updateDimensions();
    }

    updateDimensions() 
    {
        if (!this.html.ytPlayer) {
            return;
        }

        var width   = this.settings.width;
        var height  = this.settings.height;

        width = width == 'auto' || width == '100%'
            ? this.offsetWidth
            : width;

        height = height == null
            ? width / 1.77
            : height;

        var iframe = this.html.ytPlayer.getIframe();

        iframe.width = width;
        iframe.height = height;
    }

    /**
     * @inheritdoc
     */
    get currentTime()
    {
        return this.state.currentTime;
    }

    get duration()
    {
        return this.html.ytPlayer && this.html.ytPlayer.getDuration
            ? this.html.ytPlayer.getDuration()
            : 0;
    }

    /**
     * @inheritdoc
     */
    seek(time)
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        var seconds = this.sanitizeGetSeconds(time);
        this.html.ytPlayer.seekTo(seconds, true)
    }

    /**
     * @inheritdoc
     */
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

    /**
     * @inheritdoc
     */
    pause()
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        this.html.ytPlayer.pauseVideo();
    }

    /**
     * @inheritdoc
     */
    setVolume(vol)
    {
        this.state.volume = vol;

        if (! this.state.playerInitialized) {
            return;
        }

        this.html.ytPlayer.setVolume(vol);
    }

    async initializePlayer()
    {
        return new Promise(async (success, fail) =>
        {
            var width   = this.settings.width;
            var height  = this.settings.height;

            width = width == 'auto'
                ? this.offsetWidth
                : width;

            height = height == null
                ? width / 1.77
                : height;

            this.html.ytPlayer = new YT.Player(this.settings.embbedId,
            {
                width           : width,
                height          : height,
                videoId         : this.settings.id,
                startSeconds    : 0,
                host            : 'https://www.youtube.com',
                playerVars      : { autoplay: 1, controls: 0 },
                events          :
                {
                    onReady: (event) =>
                    {
                        success(this);
                        this.setVolume(this.volume);
                        this.state.playerInitialized = true;
                    },
                    onError: (error) =>
                    {
                        var message = PlayerYouTube.getErrorDescription(error.data);
                        fail(message);
                        this.fireEvent('player:error', {errorCode: error.data, errorMessage: message});
                    },
                    onStateChange: this.callBackOnStateChange.bind(this)
                }
            });
        });
    }

    callBackOnStateChange(e)
    {
        switch (e.data) {
            case -1: // unstarted
                this.state.isReproducing    = false;
                this.state.isPlaying        = false;
                this.state.isPaused         = false;
            break;
            case 0: // ended
                this.state.isReproducing    = false;
                this.state.isPlaying        = false;
                this.state.isPaused         = true;
                this.state.isWaiting        = false;
                this.state.isEnded          = true;

                this.stopFollowing();
                this.fireEvent('player:ended');
            break;
            case 1: // playing
                var waiting = this.state.isWaiting

                this.state.isReproducing    = true;
                this.state.isPlaying        = true;
                this.state.isPaused         = false;
                this.state.isBuffering      = false;
                this.state.isWaiting        = false;
                this.state.isEnded          = false;

                this.startFollowing();

                if (waiting) {
                    this.fireEvent('player:playing');
                } else {
                    this.fireEvent('player:play');
                }
            break;
            case 2: // paused
                this.state.isReproducing    = false;
                this.state.isPlaying        = false;
                this.state.isPaused         = true;
                this.state.isWaiting        = false;

                this.fireEvent('player:pause');
            break;
            case 3: // buffering
                this.state.isReproducing    = false;
                this.state.isPlaying        = true;
                this.state.isPaused         = false;
                this.state.isBuffering      = true;
                this.state.isWaiting        = true;

                this.fireEvent('player:waiting');
            break;
            case 5: // video cued
                this.play(0);
                this.fireEvent('player:play');
            break;
        }
    }

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
        var t = this.html.ytPlayer && this.html.ytPlayer.getCurrentTime 
            ? this.html.ytPlayer.getCurrentTime() 
            : 0;

        if (t != this.currentTime) {
            this.state.currentTime = t;
            this.fireEvent('player:timeupdate');
        }
    }

    /**
     * @param int errorCode
     *
     * @return string
     */
    static getErrorDescription(errorCode)
    {
        switch (errorCode)
        {
            case '2':
                return 'Error 2: invalid parameters.';
            break;
            case '5':
                return 'Error 5: An error related to the HTML5 player occurred.';
            break;
            case '100':
                return 'Error 100: Video not found.';
            break;
            case '101':
            case '150':
                return 'Error 101: The video\'s owner won\'t allow it on embbed players.';
            break;
        }

        return 'Error '+errorCode+': Unknown error';
    }

    /**
     * Return the id of the video from an youtube URL
     *
     * @param string url 
     * @return string The id of the youtube video
     */
    static getIdFromUrl(url)
    {
        var m;

        // rerular ?v=id url
        if (m = url.match(/v=([A-Za-z0-9-_]+)/)) {
            return m[1];
        }

        // short url
        if (m = url.match(/\.be\/([A-Za-z0-9-_]+)/)) {
            return m[1];
        }

        // embbed url
        if (m = url.match(/embed\/([A-Za-z0-9-_]+)/)) {
            return m[1];
        }

        return null;
    }

    /**
     * Loads the youtube embed api.
     *
     * @returns Promise
     */
    static async loadSdk()
    {
        // Already loaded.
        if (PlayerYouTube.sdkLoaded) {
            return new Promise(async (success, fail) => { success(); });
        }

        // Already loaded.
        if (typeof YT != 'undefined' && typeof YT.Player !== 'undefined') {
            PlayerYouTube.sdkLoaded = true;
            return new Promise(async (success, fail) => { success(); });
        }

        // Called previously, stil loading though.
        if (PlayerYouTube.sdkLoading) {
            return PlayerYouTube.sdkPromise;
        }

        return PlayerYouTube.sdkPromise = new Promise(async (success, fail) =>
        {
            Helpers.loadExternalJs('https://www.youtube.com/iframe_api').then(
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

    /**
     * Helper function, creates a div element, appends it and returns it.
     *
     * @param string id 
     * @param parent HTMLElement
     *
     * @return HTMLDivElement
     */
    createDiv(id, parent)
    {
        var div = document.createElement('div');
        div.id = id;
        parent.append(div);

        return div;
    }
}

export default PlayerYouTube;
