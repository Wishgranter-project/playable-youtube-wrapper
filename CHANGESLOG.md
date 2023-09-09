# Changelog

All notable changes to this project will be documented in this file.

## 3.0.0
### Changed
- Rewriten for the new version of the interface.

---

## 2.0.0 - 2019-07-27
### Changed

- Changes made in compliance to the new version 2.0.0 of the [interface](https://github.com/adinan-cenci/js-multimedia-player-interface).
- Callbacks replaced with events.

### Added
- The interface now features "addEventListener" and "removeEventListener" methods.
- Added the events: "play", "pause", "ended", "timeupdate", "waiting", "playing" and "error".

### Removed
- Removed callbacks: "onPlay", "onPause", "onEnded", "onTimeupdate", "onWaiting", "onPlaying" and "onError".