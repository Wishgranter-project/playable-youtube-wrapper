'use strict';

import Playable, { Helpers } from 'playable';

/**
 * @inheritdoc
 */
class PlayableYouTube extends Playable 
{
    static sdkLoaded       = false;
    static sdkLoading      = false;
    static sdkPromise      = null;
    static defaultSettings = {
        width:    640,
        height:  'auto',
        autoplay: false
    }

    constructor() 
    {
        super();

        this.state.currentTime = 0;
        this.state.playerInitialized = false;

        this.settings          = PlayableYouTube.defaultSettings;
        this.settings.embbedId = 'youtube-embbed-'  + Math.floor(Math.random() * 10000);
        this.settings.id       = null;

        this.html              = {}

        this.follower          = null;
    }

    connectedCallback() 
    {
        if (this.html.embed) {
            return;
        }

        var src, videoId, width, height, autoplay;

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

        if (autoplay = this.getAttribute('autoplay')) {
            this.autoplay = ['true', '1'].includes(autoplay);
        }

        return this.readyToPlayPromise = PlayableYouTube.loadSdk().then( () => 
        {
            return this.initializePlayer();
        });
    }

    remove() 
    {
        if (this.html.ytWidget) {
            this.html.ytWidget.destroy();
        }

        super.remove();
    }

    /**
     * @inheritdoc
     */
    appendTo(parentElement) 
    {
        parentElement.append(this); // connectedCallback()
        return this.readyToPlayPromise;
    }

    /**
     * @inheritdoc
     */
    prependTo(parentElement)
    {
        parentElement.prepend(this); // connectedCallback()
        return this.readyToPlayPromise;
    }

    /**
     * @inheritdoc
     */
    appendAfter(siblingElement)
    {
        siblingElement.after(this); // connectedCallback()
        return this.readyToPlayPromise;
    }

    set src(src) 
    {
        this.settings.id = PlayableYouTube.getIdFromUrl(src);
    }

    set videoId(videoId) 
    {
        this.settings.id = videoId;
    }

    set width(width) 
    {
        this.settings.width = width;
        this.updateDimensions();
    }

    set height(height) 
    {
        this.settings.height = height;
        this.updateDimensions();
    }

    set autoplay(autoplay) 
    {
        this.settings.autoplay = autoplay;
    }

    calculateDimensions() 
    {
        var width   = this.settings.width;
        var height  = this.settings.height;
        var actualWidth, actualHeight;

        if (width == 'auto') {
            actualWidth = this.parentNode.offsetWidth > 400
                ? 400
                : this.parentNode.offsetWidth;
        } else if (typeof width == 'string' && width.indexOf('%') > -1) {
            actualWidth = parseInt(width);
            actualWidth = parseInt((this.parentNode.offsetWidth / 100) * actualWidth);
        } else {
            actualWidth = width;
        }

        if (height == 'auto') {
            actualHeight = parseInt(actualWidth / 1.77);
        } else if (typeof height == 'string' && height.indexOf('%') > -1) {
            actualHeight = parseInt(height);
            actualHeight = parseInt((this.parentNode.offsetHeight / 100) * actualHeight);
        } else {
            actualHeight = height;
        }

        return { actualWidth, actualHeight };
    }

    updateDimensions() 
    {
        if (!this.html.ytWidget) {
            return;
        }

        var iframe = this.html.ytWidget.getIframe();

        var { actualWidth, actualHeight } = this.calculateDimensions();

        iframe.style.width  = actualWidth + 'px';
        iframe.style.height = actualHeight + 'px';
    }

    /**
     * @inheritdoc
     */
    get currentTime()
    {
        return this.state.currentTime;
    }

    /**
     * @inheritdoc
     */
    get duration()
    {
        return this.html.ytWidget && this.html.ytWidget.getDuration
            ? this.html.ytWidget.getDuration()
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
        this.html.ytWidget.seekTo(seconds, true)
    }

    /**
     * @inheritdoc
     */
    play(time = null)
    {
        if (time) {
            this.seek(time);
        }

        return new Promise((success, fail) =>
        {
            if (! this.state.playerInitialized) {
                return fail('Player has not been initialized');
            }
            
            this.html.ytWidget.playVideo();
            return success();
        });
    }

    /**
     * @inheritdoc
     */
    pause()
    {
        if (! this.state.playerInitialized) {
            return false;
        }

        this.html.ytWidget.pauseVideo();
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

        this.html.ytWidget.setVolume(vol);
    }

    /**
     * @private
     *
     * @returns {Promise}
     *   To be resolved once the player is ready to play ( not to reproduce ).
     */
    async initializePlayer()
    {
        return new Promise(async (success, fail) =>
        {
            var { actualWidth, actualHeight } = this.calculateDimensions();

            this.html.ytWidget = new YT.Player(this.settings.embbedId,
            {
                width           : actualWidth,
                height          : actualHeight,
                videoId         : this.settings.id,
                startSeconds    : 0,
              /*host            : 'https://www.youtube.com',*/
                playerVars      : {
                    autoplay: this.settings.autoplay,
                    controls: 0
                },
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
                        var message = PlayableYouTube.getErrorDescription(error.data);
                        fail(message);
                        this.fireEvent('playable:error', {errorCode: error.data, errorMessage: message});
                    },
                    onStateChange: this.callBackOnStateChange.bind(this)
                }
            });
        });
    }

    /**
     * Callback for the youtube object, called when the state changes.
     *
     * @param {object} e 
     */
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
                this.fireEvent('playable:ended');
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
                    this.fireEvent('playable:playing');
                } else {
                    this.fireEvent('playable:play');
                }
            break;
            case 2: // paused
                this.state.isReproducing    = false;
                this.state.isPlaying        = false;
                this.state.isPaused         = true;
                this.state.isWaiting        = false;

                this.fireEvent('playable:pause');
            break;
            case 3: // buffering
                this.state.isReproducing    = false;
                this.state.isPlaying        = true;
                this.state.isPaused         = false;
                this.state.isBuffering      = true;
                this.state.isWaiting        = true;

                this.fireEvent('playable:waiting');
            break;
            case 5: // video cued
                this.play(0);
                this.fireEvent('playable:play');
            break;
        }
    }

    /**
     * Youtube does not a timeupdate event, so we will use a setInterval as a polyfill.
     * 
     * @private
     */
    startFollowing()
    {
        this.follower = setInterval(this.following.bind(this), 1000);
    }

    /**
     * Clears the timeinterval.
     * 
     * @private
     */
    stopFollowing()
    {
        clearInterval(this.follower);
    }

    /**
     * Called regularly as reproduction progress.
     *
     * @private
     *
     * @fires Playable#playable:timeupdate
     */
    following()
    {
        var t = this.html.ytWidget && this.html.ytWidget.getCurrentTime 
            ? this.html.ytWidget.getCurrentTime() 
            : 0;

        if (t != this.currentTime) {
            this.state.currentTime = t;
            this.fireEvent('playable:timeupdate');
        }
    }

    /**
     * Return a human readable description for an error code from youtube.
     *
     * @private
     * 
     * @param {string} errorCode
     *
     * @return {string}
     *   The description of the error.
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
     * @param {string} url
     *
     * @return {string}
     *   The id of the youtube video.
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
     * @private
     * 
     * @returns {Promise}
     *   Resolves once the api has been loaded.
     */
    static async loadSdk()
    {
        // Already loaded.
        if (PlayableYouTube.sdkLoaded) {
            return new Promise(async (success, fail) => { success(); });
        }

        // Called previously, stil loading though.
        if (PlayableYouTube.sdkLoading) {
            return PlayableYouTube.sdkPromise;
        }

        PlayableYouTube.sdkLoading = true;
        return PlayableYouTube.sdkPromise = new Promise(async (success, fail) =>
        {
            Helpers.loadExternalJs('https://www.youtube.com/iframe_api', 'YT.Player').then(
                () => 
                {
                    PlayableYouTube.sdkLoaded = true;
                    PlayableYouTube.sdkLoading = false;
                    return success('YouTube SDK ready');
                },
                () => 
                {
                    PlayableYouTube.sdkLoading = false;
                    return fail('Error loading SDK');
                }
            );
        });
    }

    /**
     * Helper function, creates a div element, appends it and returns it.
     *
     * @private
     *
     * @param {string} id 
     * @param {HTMLElement} parent
     *
     * @return {HTMLDivElement}
     */
    createDiv(id, parent)
    {
        var div = document.createElement('div');
        div.id = id;
        parent.append(div);

        return div;
    }
}

export default PlayableYouTube;
