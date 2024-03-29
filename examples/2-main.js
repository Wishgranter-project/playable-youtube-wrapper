import PlayableYouTube from '../src/PlayableYouTube.js';

window.PlayableYouTube = PlayableYouTube;

customElements.define('youtube-player', PlayableYouTube);

document.addEventListener('DOMContentLoaded', function()
{
    window.player1 = document.createElement('youtube-player');
    window.player2 = document.createElement('youtube-player');

    window.player1.videoId = 'AMsoH4cOTNM';
    window.player1.appendTo(document.body);

    window.player2.videoId = 'GeLyv5f3XiQ';
    window.player2.appendTo(document.body);

});
