function Recording (options){
  this.options = options || (options = {});
  this.loading = false;
  this.timeBetweenLoops = options.timeBetweenLoops || 50;

  this.setFrames(options.frames || [])
}

Recording.prototype = {

  setFrames: function (frames) {
    this.frameData = frames;
    this.frameIndex = 0;
    this.frameCount = frames.length;
    this.leftCropPosition = 0;
    this.rightCropPosition = this.frameCount;
    this.setMetaData();
  },

  addFrame: function(frameData){
    this.frameData.push(frameData);
  },

  currentFrame: function () {
    return this.frameData[this.frameIndex];
  },

  nextFrame: function () {
    var frameIndex = this.frameIndex + 1;
    // || 1 to prevent `mod 0` error when finishing recording before setFrames has been called.
    frameIndex = frameIndex % (this.rightCropPosition || 1);
    if ((frameIndex < this.leftCropPosition)) {
      frameIndex = this.leftCropPosition;
    }
    return this.frameData[frameIndex];
  },


  advanceFrame: function () {
    this.frameIndex++;

    if (this.frameIndex >= this.rightCropPosition && !this.options.loop) {
      this.frameIndex--;
      // there is currently an issue where angular watching the right handle position
      // will cause this to fire prematurely
      // when switching to an earlier recording
      return false
    }


    this.frameIndex = this.frameIndex % (this.rightCropPosition || 1);

    if ((this.frameIndex < this.leftCropPosition)) {
      this.frameIndex = this.leftCropPosition;
    }

    return true
  },

  // resets to beginning if at end
  readyPlay: function(){
    this.frameIndex++;
    if (this.frameIndex >= this.rightCropPosition) {
      this.frameIndex = this.frameIndex % (this.rightCropPosition || 1);

      if ((this.frameIndex < this.leftCropPosition)) {
        this.frameIndex = this.leftCropPosition;
      }
    }else{
      this.frameIndex--;
    }
  },


  // this method would be well-moved to its own object/class -.-
  // for every point, lerp as appropriate
  createLerpFrameData: function(t){
    // http://stackoverflow.com/a/5344074/478354
    var currentFrame = this.currentFrame(),
        nextFrame = this.nextFrame(),
        handProps = ['palmPosition', 'stabilizedPalmPosition', 'sphereCenter', 'direction', 'palmNormal', 'palmVelocity'],
        fingerProps = ['mcpPosition', 'pipPosition', 'dipPosition', 'tipPosition', 'direction'],
        frameData = JSON.parse(JSON.stringify(currentFrame)),
        numHands = frameData.hands.length,
        len1 = handProps.length,
        len2 = fingerProps.length,
        prop, hand, pointable;

    for (var i = 0; i < numHands; i++){
      hand = frameData.hands[i];

      for (var j = 0; j < len1; j++){
        prop = handProps[j];

        Leap.vec3.lerp(
          hand[prop],
          currentFrame.hands[i][prop],
          nextFrame.hands[i][prop],
          t
        );

        console.assert(hand[prop]);
      }

    }

    for ( i = 0; i < 5; i++){
      pointable = frameData.pointables[i];

      for ( j = 0; j < len2; j++){
        prop = fingerProps[j];

        Leap.vec3.lerp(
          pointable[prop],
          currentFrame.pointables[i][prop],
          nextFrame.pointables[i][prop],
          0
        );
//          console.assert(t >= 0 && t <= 1);
//          if (t > 0) debugger;

      }

    }

    return frameData;
  },

  // returns ms
  timeToNextFrame: function () {
    var elapsedTime = (this.nextFrame().timestamp - this.currentFrame().timestamp) / 1000;
    if (elapsedTime < 0) {
      elapsedTime = this.timeBetweenLoops; //arbitrary pause at slightly less than 30 fps.
    }
    console.assert(!isNaN(elapsedTime));
    return elapsedTime;
  },


  blank: function(){
    return this.frameData.length === 0;
  },

  // sets the crop-point of the current recording to the current position.
  leftCrop: function () {
    this.leftCropPosition = this.frameIndex
  },

  // sets the crop-point of the current recording to the current position.
  rightCrop: function () {
    this.rightCropPosition = this.frameIndex
  },

  // removes every other frame from the array
  // Accepts an optional `factor` integer, which is the number of frames
  // discarded for every frame kept.
  cullFrames: function (factor) {
    console.log('cull frames', factor);
    factor || (factor = 1);
    for (var i = 0; i < this.frameData.length; i++) {
      this.frameData.splice(i, factor);
    }
    this.setMetaData();
  },

  // Returns the average frames per second of the recording
  frameRate: function () {
    if (this.frameData.length == 0) {
      return 0
    }
    return this.frameData.length / (this.frameData[this.frameData.length - 1].timestamp - this.frameData[0].timestamp) * 1000000;
  },

  // returns frames without any circular references
  croppedFrameData: function () {
    return this.frameData.slice(this.leftCropPosition, this.rightCropPosition);
  },


  // flag
  setMetaData: function () {

    var newMetaData = {
      formatVersion: 1,
      generatedBy: 'LeapJS Playback 0.1-pre',
      frames: this.rightCropPosition - this.leftCropPosition,
      protocolVersion: this.options.requestProtocolVersion,
      serviceVersion: this.options.serviceVersion,
      frameRate: this.frameRate().toPrecision(2)
    };

    this.metadata || (this.metadata = {});

    for (var key in newMetaData) {
      this.metadata[key] = newMetaData[key];
    }
  },

  // recording
  pack: function(){

  },

  toHash: function () {
    this.setMetaData();
    return {
      frames: this.croppedFrameData(),
      metadata: this.metadata
    }
  },

  // Returns the cropped data as JSON or compressed
  // http://pieroxy.net/blog/pages/lz-string/index.html
  export: function (format) {
    var json = JSON.stringify(this.toHash());

    if (format == 'json') return json;

    return LZString.compressToBase64(json);
  },

  save: function(format){
    var filename;

    filename = this.metadata.title ? this.metadata.title.replace(/\s/g, '') : 'leap-playback-recording';

    if (this.metadata.frameRate) {
      filename += "-" + (Math.round(this.metadata.frameRate)) + "fps";
    }

    if (format === 'json') {

      saveAs(new Blob([this.export('json')], {
        type: "text/JSON;charset=utf-8"
      }), filename + ".json");

    } else {

      saveAs(new Blob([this.export('lz')], {
        type: "application/x-gzip;charset=utf-8"
      }),  filename + ".json.lz");

    }

  },

  decompress: function (data) {
    return LZString.decompressFromBase64(data)
  },

  loaded: function(){
    return !!(this.frameData && this.frameData.length)
  },


  // optional callback once frames are loaded, will have a context of player
  loadFrameData: function (callback) {
    var xhr = new XMLHttpRequest(),
        url = this.options.url;

    var recording = this;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200 || xhr.status === 0) {
          if (xhr.responseText) {

            recording.finishLoad(xhr.responseText, callback);

          } else {
            console.error('Leap Playback: "' + url + '" seems to be unreachable or the file is empty.');
          }
        } else {
          console.error('Leap Playback: Couldn\'t load "' + url + '" (' + xhr.status + ')');
        }
      }
    };
    this.loading = true;

    xhr.open("GET", url, true);
    xhr.send(null);
  },

  finishLoad: function(responseData, callback){
//    if (player.recording != recording){
//      // setRecording has been re-called before the ajax has returned
//      player.controller.emit('playback.ajax:aborted', player);
//      return
//    }
//
//    // can't assign to responseText
//    var responseData = xhr.responseText;
    var url = this.options.url;

    if (url.split('.')[url.split('.').length - 1] == 'lz') {
      responseData = this.decompress(responseData);
    }

    responseData = JSON.parse(responseData);

    this.setFrames(responseData.frames);
    this.metadata = responseData.metadata;

//            for (var key in responseData) {
//              recording[key] = responseData[key]
//            }

    this.loading = false;

    if (callback) {
      callback.call(this);
    }

  }

};