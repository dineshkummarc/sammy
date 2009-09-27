(function($) {
  
  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  // adapted from: http://ejohn.org/blog/javascript-micro-templating/
  // originally $.srender by Greg Borenstein http://ideasfordozens.com in Feb 2009
  // modified for Sammy by Aaron Quint for caching templates by name
  var srender_parser = function(template) {
    var fn = "var p=[],print=function(){p.push.apply(p,arguments);};" +

      // Introduce the data as local variables using with(){}
      "with(obj){p.push(\"" +

      // Convert the template into pure JavaScript
      template
        .replace(/[\r\t\n]/g, " ")
        .replace(/\"/g, '\\"')
        .split("<%").join("\t")
        .replace(/((^|%>)[^\t]*)/g, "$1\r")
        .replace(/\t=(.*?)%>/g, "\",$1,\"")
        .split("\t").join("\");")
        .split("%>").join("p.push(\"")
        .split("\r").join("")
        + "\");}return p.join('');"
    return fn;
  };

  var srender_cache = {};
  var srender = function(name, template, data) {
    // target is an optional element; if provided, the result will be inserted into it
    // otherwise the result will simply be returned to the caller   
    if (srender_cache[name]) {
      fn = srender_cache[name];
    } else {
      if (typeof template == 'undefined') {
        // was a cache check, return false
        return false;
      }
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      fn = srender_cache[name] = new Function("obj", srender_parser(template));
    }

    if (typeof data != 'undefined') {
      return fn(data);
    } else {
      return fn;
    }
  };

  Sammy = Sammy || {};

  Sammy.Ejs = function(app) {
    app.helpers({
      partial: function(path, data, callback, ajax_options) {
        return this.ejs(path, data, callback, ajax_options);
      },

      // Used for rendering remote templates or documents within the current application/DOM.
      //
      // There are a couple different ways to use <tt>partial()</tt>:
      // 
      //      ejs('doc.html');
      //      //=> Replaces $element() with the contents of doc.html
      //
      //      ejs('doc.html.erb', {name: 'Sammy'}); 
      //      //=> Replaces $element() with the contents of doc.html.erb run through <tt>template()</tt>
      //
      //      ejs('doc.html.erb', function(data) {
      //        // data is the contents of the template.
      //        $('.other-selector').html(data); 
      //      });
      //
      ejs: function(path, data, callback, ajax_options) {
        var rendered, context = this;
        if (typeof callback == 'undefined') {
          if ($.isFunction(data)) {
            // callback is in the data position
            callback = data;
            data = {};
          } else {
            // we should use the default callback
            callback = this.render_callback;
          }
        }
        rendered = this.ejs_partial(path, data, function(rendered) {
          callback.apply(context, [rendered]);
          context.trigger('changed');
        }, ajax_options);
      },

      // Uses <tt>$.srender</tt> to parse ERB like templates.
      //
      // === Arguments
      // 
      // +template+::      A String template. '<% %>' tags are evaluated as Javascript and replaced with the elements in data.
      // +data+::          An Object containing the replacement values for the template. 
      //                   data is extended with the <tt>EventContext</tt> allowing you to call its methods within the template.
      //
      // The following options are primarilly for internal use and should not usually need to be given:
      //
      // +callback+::      If the template is rendered from cache, the callback will be called if present. If no callback is present
      //                   and the the template is not cached, '<span class="promise"></span>' will be returned. Once the
      //                   call finishes, the span will be replaced with the rendered template.
      // +ajax_options+::  An Object that can be passed on to $.ajax. 
      //
      // Returns the rendered string unless the template was cached a callback is provided.
      // 
      ejs_partial: function(path, data, callback, ajax_options) {
        var rendered, promise_id, context = this;
        ajax_options = $.extend({}, ajax_options);
        data = $.extend({}, data, this);
        rendered = srender(path, undefined, data);
        if (rendered) {
          if ($.isFunction(callback)) callback(rendered);
        } else {
          // the template wasnt cached, we need to fetch it
          //
          if (!$.isFunction(callback)) {
            promise_id = ("promise_" + Math.random()).replace('.', '');
            rendered = '<span class="promise" id="' + promise_id + '"></span>';
            callback = function(rendered) {
              context.ejs_render_promised(promise_id, rendered, 0);
            };
          }

          ajax_options.success = function(template) {
            rendered = srender(path, template, data);
            if ($.isFunction(callback)) callback(rendered);
          };

          $.ajax($.extend({ url: path, dataType: 'text', type: 'GET' }, ajax_options));
        }
        // There is only guaranteed to be a return value if no callback is provided.
        return rendered;
      },

      // Renders a promised partial after the ajax request is finished. It will try for 2 seconds
      // (in case the responses come back in the wrong order) before giving up.
      //
      // TODO: could this be a live event on the changed event for the promised_id?
      ejs_render_promised: function(promise_id, rendered, tries) {
        var promised = $('#' + promise_id), context = this;
        if (promised.length == 0) {
          if (tries < 10) {
            setTimeout(function() { context.ejs_render_promised(promise_id, rendered, tries + 1); }, 200);
          }
        } else {
          promised.replaceWith(rendered);
          this.trigger('changed');
        }
      }
    });
  };
})(jQuery);
