# Playable youtube wrapper

This is a wrapper for the the [YouTube Embbed API](https://developers.google.com/youtube/iframe_api_reference), an 
implementation of my [playable interface](https://github.com/adinan-cenci/playable).

Example:

```js
import PlayerYouTube from 'playable-youtube-wrapper';
customElements.define('youtube-player', PlayerYouTube);

var player = document.createElement('youtube-player');
player.videoId = 'dQw4w9WgXcQ';

player.appendTo(document.body).then(() => 
{
    player.play();
})
```
