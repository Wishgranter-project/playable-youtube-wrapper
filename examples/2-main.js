var PlayerYouTube = require('../src/PlayerYouTube.js');

document.addEventListener('DOMContentLoaded', function()
{
    window.player1 = new PlayerYouTube();
    window.player2 = new PlayerYouTube();

    window.player1.setData({id: 'AMsoH4cOTNM'});
    window.player2.setData({id: 'GeLyv5f3XiQ'});
});
