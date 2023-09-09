This an implementation of my [multimedia player interface](https://github.com/adinan-cenci/js-multimedia-player-interface) around the [YouTube Embbed API](https://developers.google.com/youtube/iframe_api_reference).

Example:

```js
import PlayerYouTube from 'youtube-wrapper';
customElements.define('youtube-player', PlayerYouTube);

var player = document.createElement('youtube-player');
player.videoId = 'dQw4w9WgXcQ';

player.appendTo(document.body).then(() => 
{
    player.play();
})
```
