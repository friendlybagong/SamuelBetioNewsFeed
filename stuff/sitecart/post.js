var Post = (function() {
	
	var domain;
	
	function send(func, arg) {
		if (window.parent) {
			window.parent.postMessage(JSON.stringify({ func: func, arg: arg }), domain == "*" ? domain : document.location.protocol + "//" + domain);
		}
	}

	var self = {};
		
	self.to = function(d) {
		domain = d;
		return self;
	};

	self.title = function(t) {
		send("title", t);
		return self;
	};

	self.cart = function(c) {
		send("cart", c);
		return self;
	};

	self.showcart = function() {
		send("showcart");
		return self;
	};

	self.soldoutzone = function(t) {
		send("soldoutzone", t);
		return self;
	};

	self.receive = function(callback) {
		$(window).on("message", function(e) {
			var data = false;
			try {
				data = $.parseJSON(e.originalEvent.data);
			} catch(e) {} // if it's not JSON, we'll just ignore it

			if (data) {
				callback(data);
			}
		});
	};

	return self;
})();
