'use strict';

Polymer('polymer-data-overlay', {
  created: function() {
  },
  ready: function() {
    var that = this;

    // @todo: this should be handled by the parent
    document.addEventListener('hypervideotimeupdate', function(e) {
      // console.log('Received event (document): hypervideotimeupdate');
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