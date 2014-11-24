'use strict';

/* jshint unused:false */
var queryRegExSelectorAll = function(root, regEx) {
  function walk(node) {
    regEx.lastIndex = 0;
    if (node.nodeType === Node.ELEMENT_NODE && regEx.test(node.nodeName)) {
      nodes.push(node);
    }
    for (var child = node.firstChild; child; child = child.nextSibling) {
      walk(child);
    }
  }

  var nodes = [];
  walk(root);
  return nodes;
};

var queryRegExSelector = function(root, regEx) {
  function walk(node) {
    if (nodes.length) {
      return;
    }
    regEx.lastIndex = 0;
    if (node.nodeType === Node.ELEMENT_NODE && regEx.test(node.nodeName)) {
      nodes.push(node);
    }
    for (var child = node.firstChild; child; child = child.nextSibling) {
      walk(child);
    }
  }

  var nodes = [];
  walk(root);
  return nodes[0] ? nodes[0] : null;
};


/*
var queryRegExSelectorAll = function(root, regEx) {
  var treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        regEx.lastIndex = 0;
        return regEx.test(node.nodeName) ?
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    },
    false
  );
  var nodes = [];
  while(treeWalker.nextNode()) {
    nodes.push(treeWalker.currentNode);
  }
  return nodes;
};

var queryRegExSelector = function(root, regEx) {
  var treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        regEx.lastIndex = 0;
        return regEx.test(node.nodeName) ?
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    },
    false
  );
  if (treeWalker.nextNode()) {
    return treeWalker.currentNode;
  } else {
    return null;
  }
};
*/

var getYouTubeHtml5VideoUrl = function(videoId, callback) {
  var decodeQueryString = function(queryString) {
    var key, keyValPair, keyValPairs, r, val, _i, _len;
    r = {};
    keyValPairs = queryString.split('&');
    for (_i = 0, _len = keyValPairs.length; _i < _len; _i++) {
      keyValPair = keyValPairs[_i];
      key = decodeURIComponent(keyValPair.split('=')[0]);
      val = decodeURIComponent(keyValPair.split('=')[1] || '');
      r[key] = val;
    }
    return r;
  };

  var decodeStreamMap = function(url_encoded_fmt_stream_map) {
    var quality, sources, stream, type, urlEncodedStream, _i, _len,
        _ref;
    sources = {};
    _ref = url_encoded_fmt_stream_map.split(',');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      urlEncodedStream = _ref[_i];
      if (!urlEncodedStream) {
        return false;
      }
      stream = decodeQueryString(urlEncodedStream);
      type = stream.type.split(';')[0];
      quality = stream.quality.split(',')[0];
      stream.original_url = stream.url;
      stream.url = '' + stream.url + '&signature=' + stream.sig;
      sources['' + type + ' ' + quality] = stream;
    }
    return sources;
  };

  var CORS_PROXY = document.location.origin + '/cors/';
  // Translate to HTML5 video URL, try at least
  var  url = CORS_PROXY + encodeURIComponent(
      'http://www.youtube.com/get_video_info?video_id=' + videoId);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var youTubeVideo = decodeQueryString(xhr.responseText);
      // video.live_playback is '1' for Hangouts on Air
      if ((youTubeVideo.status === 'fail') ||
          (youTubeVideo.live_playback)) {
        return callback('No HTML5 version available.');
      }
      if (!youTubeVideo.url_encoded_fmt_stream_map) {
        return callback('No HTML5 version available.');
      }
      youTubeVideo.sources =
          decodeStreamMap(youTubeVideo.url_encoded_fmt_stream_map);
      if (!youTubeVideo.sources) {
        return callback('No HTML5 version available.');
      }
      var mediumQuality = {};
      for (var key in youTubeVideo.sources) {
        if (/.*?medium.*?/gi.test(key)) {
          mediumQuality[key] = youTubeVideo.sources[key];
        }
      }
      return callback(null, mediumQuality);
    }
  };
  xhr.open('GET', url, true);
  xhr.send();
};