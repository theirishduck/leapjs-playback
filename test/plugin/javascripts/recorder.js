// Generated by CoffeeScript 1.6.3
(function() {
  var player, recorder;

  recorder = angular.module('Recorder', ['ui-rangeSlider']);

  player = function() {
    return window.controller.plugins.playback.player;
  };

  recorder.controller('Controls', [
    '$scope', '$location', '$document', function($scope, $location, $document) {
      $scope.maxFrames = function() {
        return window.controller.plugins.playback.player.maxFrames - 1;
      };
      $scope.mode = '';
      $scope.leftHandlePosition = 0;
      $scope.rightHandlePosition = $scope.maxFrames();
      $scope.paused = false;
      $scope.player = player;
      $scope.inDigestLoop = false;
      $scope.pinHandle = '';
      $scope.$watch('leftHandlePosition', function(newVal, oldVal) {
        if (newVal === oldVal) {
          return;
        }
        if ($scope.mode !== 'crop') {
          return;
        }
        player().setFrameIndex(parseInt(newVal, 10));
        return player().leftCrop();
      });
      $scope.$watch('rightHandlePosition', function(newVal, oldVal) {
        if (newVal === oldVal) {
          return;
        }
        if ($scope.inDigestLoop) {
          return;
        }
        player().setFrameIndex(parseInt(newVal, 10));
        if ($scope.mode === 'crop') {
          return player().rightCrop();
        }
      });
      $scope.record = function() {
        var hand, _i, _len, _ref;
        $scope.paused = $scope.stopOnRecordButtonClick();
        if ($scope.mode !== 'record') {
          _ref = player().controller.lastConnectionFrame.hands;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            hand = _ref[_i];
            player().controller.emit('handLost', hand);
          }
        }
        $scope.mode = 'record';
        if ($scope.paused) {
          return player().record();
        } else {
          return player().stop();
        }
      };
      $scope.crop = function() {
        $scope.mode = 'crop';
        $scope.pinHandle = '';
        setTimeout(function() {
          $scope.inDigestLoop = true;
          $scope.leftHandlePosition = player().leftCropPosition;
          $scope.rightHandlePosition = player().rightCropPosition;
          $scope.$apply();
          return $scope.inDigestLoop = false;
        }, 0);
        return player().pause();
      };
      $scope.stopOnRecordButtonClick = function() {
        return $scope.mode === 'record' && !$scope.paused;
      };
      $scope.pauseOnPlaybackButtonClick = function() {
        return $scope.mode === 'playback' && !$scope.paused;
      };
      window.controller.on('playback.ajax:begin', function(player) {
        $scope.playback();
        return $scope.$apply();
      });
      window.controller.on('playback.ajax:complete', function(player) {
        return $scope.$apply();
      });
      window.controller.on('playback.recordingFinished', function() {
        document.getElementById('record').blur();
        return $scope.playback();
      });
      $scope.playback = function() {
        $scope.paused = $scope.pauseOnPlaybackButtonClick();
        $scope.mode = 'playback';
        $scope.pinHandle = 'min';
        if ($scope.paused) {
          return player().pause();
        } else {
          return player().play();
        }
      };
      $document.bind('keypress', function(e) {
        if (e.which === 32) {
          e.originalEvent.target.blur();
          $scope.playback();
        }
        if (e.which === 102) {
          if (document.body.requestFullscreen) {
            return document.body.requestFullscreen();
          } else if (document.body.msRequestFullscreen) {
            return document.body.msRequestFullscreen();
          } else if (document.body.mozRequestFullScreen) {
            return document.body.mozRequestFullScreen();
          } else if (document.body.webkitRequestFullscreen) {
            return document.body.webkitRequestFullscreen();
          }
        }
      });
      window.controller.on('frame', function(frame) {
        if ($scope.mode !== 'playback') {
          return;
        }
        $scope.inDigestLoop = true;
        $scope.$apply(function() {
          $scope.leftHandlePosition = player().leftCropPosition;
          return $scope.rightHandlePosition = player()._frame_data_index;
        });
        return $scope.inDigestLoop = false;
      });
      $scope.save = function() {
        return saveAs(new Blob([player()["export"]()], {
          type: "text/JSON;charset=utf-8"
        }), 'lz4.json');
      };
      if (player().loading) {
        return $scope.playback();
      } else {
        return $scope.record();
      }
    }
  ]);

}).call(this);
