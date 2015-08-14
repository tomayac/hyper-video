'use strict';

Polymer({
  is: 'data-annotation',

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