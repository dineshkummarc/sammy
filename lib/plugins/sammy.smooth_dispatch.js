(function($) {
  Sammy = Sammy || {};
  // Allows use of the controller for minor actions without adding
  // unwanted entries to the browser's history and back button.
  //
  // Links beginning with a # character will appear in the page url, but
  // in addition all clicks on elements matching the click_event_selector
  // will be handled and dispatched to the controller as normal.
  //
  // This plugin introduces some minor differences in dispatching:
  //
  // * Routes should always be defined without the leading # character.
  // * The app will recognize when the same link is clicked twice
  //
  // +click_event_selector+:  Bind to the click event of all elements matching
  //                          the given jQuery selector. Defaults to 'a.sammy'
  Sammy.SmoothDispatch = function(app, click_event_selector) {
    if (typeof click_event_selector == 'undefined')
      click_event_selector = 'a.sammy';

    this.currentUrl = '';
    this.newUrl = '';

    // overwrites the core method
    this.getLocation = function() {
      var matches, match;
      var url = window.location.toString()
      matches = url.match(/^[^#]*#?(.*?)$/);
      if (matches) {
        match = matches[1] || '/';
        if (match != this.currentUrl) {
          this.currentUrl = match;
          if (match != '/')
            window.location = url;
          this.newUrl = match;
          return match;
        }
      }
      return this.newUrl.toString();
    };

    // overwrites the core method
    this.setLocation = function(newUrl) {
      if (newUrl.match(/^#/)) {
        this.currentUrl = '';
        window.location = newUrl;
      } else {
        return this.newUrl = newUrl;
      }
    }

    // must be defined in this scope so event may be unbound on unload
    var clickHandler = null;

    // Re-bind the click link to all elements matching the chosen selector
    // whenever the changed event occurs.
    this.bind('changed', function() {
      $(click_event_selector).unbind('click', clickHandler);
      var context = this;
      clickHandler = function(e) {
        if (e.button == 0) {
          var href = $(this).attr('href');
          if (href.match(/^#?\//)) {
            // local link
            context.redirect(href);
            return false;
          } else {
            return true; // execute actual href
          }
        }
      };
      $(click_event_selector).click(clickHandler);
    });

    this.bind('unload', function() {
      $(click_event_selector).unbind('click', clickHandler);
    });
  };
})(jQuery);
