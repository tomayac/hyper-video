'use strict';

Polymer({
  is: 'data-overlay',

  properties: {
    start: {
      type: Number
    },
    end: {
      type: Number
    }
  },

  created: function() {
  },

  ready: function() {
    var that = this;

    // @todo: this should be handled by the parent
    document.addEventListener('hypervideo-time-update', function(e) {
      // console.log('Received event (document): hypervideo-time-update');
      that.currentTime = e.detail.currentTime;
      if ((that.start <= that.currentTime) &&
          (that.currentTime < that.end)) {
        that.style.display = 'block';
      } else {
        that.style.display = 'none';
      }
    });
  }
});