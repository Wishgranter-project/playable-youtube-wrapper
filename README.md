This an implementation of my [multimedia player interface](https://github.com/adinan-cenci/js-multimedia-player-interface) around the [YouTube Embbed API](https://developers.google.com/youtube/iframe_api_reference).

Example:

```js
var YouTube = require('youtube-wrapper');
var player 	= new YouTube({wrapperId: 'youtube-div'});

player.setData({href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}).then( => 
{
   player.play();                                                                        
});
```

```html
<div id="youtube-div">
    <!-- YouTube iframe here -->
</div>
```

