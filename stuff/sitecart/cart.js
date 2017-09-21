window.inlineuploadcallbacks = {};
$.fn.inlineupload = function(callback)
{
	this.each(function(i, el)
	{
		var container = $(el);
		var id = container.prop("id");
		var file = $("[type=file]", container);
		var name = file.prop("name");
		var hidden = $("[type=hidden]", container);
		
		file.wrap("<form />");
		var form = file.parent("form");
		form.attr({
			action: container.data("url") + "/file/" + file.prop("name") + "/id/" + id + "/js/1",
			method: "post",
			enctype: "multipart/form-data",
			target: "inlineuploadframe" + id
		});

		container.append($("<iframe />").hide().prop("name", "inlineuploadframe" + id));

		window.inlineuploadcallbacks[id] = {
			success: function(value)
			{
				hidden.val(value);
				callback(value, id, name);
			},
			error: function(error)
			{
				alert(error);
			}
		};

		if (hidden.val().length > 0)
			window.inlineuploadcallbacks[id].success(hidden.val());
		
		file.change(function() {
			if ($(this).val())
				form.submit();
		});

		// Remove nested form before submitting the real form
		form.submit(function(event) { event.stopPropagation(); });
		container.parents("form").submit(function() {
			form.parent().remove(form);
		});
	});
};

$.fn.datepick = function()
{
	this.datepicker({ onSelect: function () {
		if ($(this).data('pair')) {
			var el = $("#" + $(this).data('pair'));
			if (el.prop('disabled')) return;
			
			var d = $(this).datepicker('getDate');
			d.setDate(d.getDate() + 1); // next day
			el.datepicker('option', 'minDate', d);

			if ($(this).data('range')) {
				var de = $(this).datepicker('getDate');
				de.setDate(de.getDate() + $(this).data('range')); // max
				el.datepicker('option', 'maxDate', de);
			}

			// onSelect fires before the click is registered; the click nukes the newly-focused calendar unless we do it out of phase
			setTimeout(function () { el.focus(); }, 1);
		}
		$(this).trigger("change");
	}}).each(function () {
		var $this = $(this);
		if ($this.data('mindate')) {
			$this.datepicker('option', 'minDate', $this.data('mindate'));
		}
		if ($this.data('maxdate')) {
			$this.datepicker('option', 'maxDate', $this.data('maxdate'));
		}
		if ($this.data('pair') && $this.datepicker('getDate') !== null) {
			var el = $("#" + $this.data('pair'));
			var d = $(this).datepicker('getDate');
			d.setDate(d.getDate() + 1); // next day
			el.datepicker('option', 'minDate', d);
		}
	});
};

function separateDigits(num) {
	// http://stackoverflow.com/a/13621871/1411510
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

$(function() {
	
	function Cart() {
		var self = {};
		var items = {};

		var empty = $("#empty");
		var nonempty = $("#nonempty");
		var table = $("table");
		var totalcontainer = $(".total");
		var total = $(".totalcost", totalcontainer);
		var originaltotal = $(".originalcost", totalcontainer);

		self.endpoints = {
			remove: table.data("endpoint-remove"),
			qty: table.data("endpoint-qty"),
			availability: table.data("endpoint-availability"),
			discount: table.data("endpoint-discount")
		};

		self.getTotal = function() {
			var t = 0;
			for(var i in items) {
				t += items[i].getCost();
			}
			return t;
		};

		self.getOriginalTotal = function() {
			var t = 0;
			for(var i in items) {
				t += items[i].getOriginalCost();
			}
			return t;
		};

		self.removeItem = function(item) {
			$.post(self.endpoints.remove, { ad: item.getAd() }, function(response) {
				if (!response.error) {
					Post.cart(response.cart);
					if (items[item.getAd()] !== undefined) {
						delete items[item.getAd()];
						item.destruct();
					}
				}
			});
		};

		self.applyDiscount = function(code, callback) {
			$.post(self.endpoints.discount, { code: code }, function(response) {
				Post.cart(response.cart);
				for(var i in response.cart.items) {
					var ad = response.cart.items[i].ad;
					console.log(ad);
					if (items[ad] !== undefined) {
						items[ad].setRate(response.cart.items[i].rate);
					}
				}
				callback(response.applied);
			});
		};

		self.getNumItems = function() {
			var n = 0;
			for(var i in items) n++;
			return n;
		};

		self.update = function() {
			var tot = self.getTotal();
			var orig = self.getOriginalTotal();
			total.text(tot.toFixed(2));
			originaltotal.text(orig.toFixed(2));
			totalcontainer.toggleClass("discounted", tot != orig);

			var isempty = self.getNumItems() == 0;
			empty.toggle(isempty);
			nonempty.toggle(!isempty);
		};

		function init() {
			$("tr.product", table).each(function() {
				var item = Item($(this), self);
				items[item.getAd()] = item;
			});
		}
		init();

		return self;
	};

	function Item(tr, cart) {
		var self = {};
		
		var row = tr;
		var extras = tr.next();
		
		var els = {
			qty: $(".qty select", row),
			available: $(".qty .available", row),
			unavailable: $(".qty .unavailable", row),
			originalcost: $(".originalcost", row),
			cost: $(".itemcost", row),
			removeitem: $(".remove-from-cart", row),
			creative: $(".creative", extras),
			schedule: $(".schedule", extras),
			toggleschedule: $(".schedulead", extras),
			startingdate: $(".startingdate", extras),
			startingtime: $(".startingtime", extras),
			endingdate: $(".endingdate", extras),
			endingtime: $(".endingtime", extras)
		};

		self.getAd = function() {
			return row.data("ad");
		};

		var rate = row.data("rate");
		self.getRate = function() {
			return rate;
		};
		self.setRate = function(r) {
			rate = r;
			update();
		};

		self.getOriginalRate = function() {
			return row.data("original-rate");
		};

		self.destruct = function() {
			row.remove();
			extras.remove();
			cart.update();
		};

		self.getQty = function() {
			if (els.qty.length != 0)
				return els.qty.val() === null ? 0 : parseInt(els.qty.val(), 10);
			return 1;
		};

		self.getCost = function() {
			return self.getQty() * self.getRate();
		};

		self.getOriginalCost = function() {
			return self.getQty() * self.getOriginalRate();
		};

		self.remove = function() {
			cart.removeItem(self);
		};

		self.setQtyOptions = function(min, max) {
			var selectedqty = self.getQty();
			els.qty.empty();
			var opts = [];
			var opthtml = "";
			for(var i = min; i <= max; i += 10) {
				opts.push(i);
				opthtml += "<option value='" + Number(i) + "'" + (selectedqty == i ? " selected='selected'" : "") + ">" + separateDigits(i*1000) + "</option>";
			}
			els.qty.html(opthtml);
			if ($.inArray(selectedqty, opts) == -1) {
				// auto-select closest available qty
				$("option", els.qty)[selectedqty < min ? "first" : "last"]().prop("selected", true);
				self.saveQty();
			}
		};

		self.setAvailability = function(flag) {
			els.available[flag ? "show" : "hide"]();
			els.unavailable[!flag ? "show" : "hide"]();
		};

		self.getScheduledDates = function() {
			var start = els.startingdate.val();
			var end = els.endingdate.val();
			if (!start || !end) {
				start = null;
				end = null;
			}
			else
			{
				var time = $("option:selected", els.startingtime).val();
				start += " " + time;
				end += " " + time;
			}
			return { start: start, end: end };
		};

		self.saveQty = function() {
			var d = self.getScheduledDates();
			$.post(cart.endpoints.qty, { ad: self.getAd(), qty: self.getQty(), start: d.start, end: d.end }, function(response) {
				if (response.cart) {
					Post.cart(response.cart);
				}
			});
			update();
		};

		function update() {
			els.originalcost.text(self.getOriginalCost().toFixed(2));
			els.cost.text(self.getCost().toFixed(2));
			row.toggleClass("discounted", self.getRate() != self.getOriginalRate());
			cart.update();
		}

		function initInlineUpload() {
			var upload = $(".upload", els.creative);
			var previewbox = $(".previewbox", els.creative);
			upload.inlineupload(function(url) {
				previewbox.empty();
				var img = $("<img />").prop("src", url);
				previewbox.append($("<div />").css({ width: previewbox.css("width"), height: previewbox.css("height") }).append(img));
			});
		};

		var lastschedule = null;
		function onScheduleUpdate() {
			var schedule = self.getScheduledDates();
			if (lastschedule !== null && lastschedule.start == schedule.start && lastschedule.end == schedule.end) return; // no change
			$.get(cart.endpoints.availability, { ad: self.getAd(), start: schedule.start, end: schedule.end }, updateAvailability);
			lastschedule = schedule;
		}

		function updateAvailability(data) {
			if (!data.available) {
				self.setAvailability(false);
				self.setQtyOptions(0, 0);
			} else {
				self.setAvailability(true);
				self.setQtyOptions(data.min, data.max);
			}
		}

		function initSchedule() {
			els.toggleschedule.click(function() {
				els.schedule.toggle();
			});
			if ($(".ferr", els.schedule).length > 0) {
				els.schedule.show();
			}
			els.startingtime.change(function() {
				els.endingtime.text($("option:selected", this).text());
			}).change();
			els.startingdate.change(onScheduleUpdate);
			els.endingdate.change(onScheduleUpdate);
		}
		
		function init() {
			initInlineUpload();
			els.removeitem.click(self.remove);
			if (els.qty.length != 0)
				els.qty.change(self.saveQty);
			if (els.schedule.length != 0)
				initSchedule();
		}

		init();

		return self;
	};

	var Discount = function(form, cart) {
		var toggle = $(".discounttoggle", form);
		var fieldcontainer = $(".discounts", form);
		var error = $(".discounterror", form);
		var code = $("input[type='text']", form);
		
		function initEvents() {
			toggle.click(function(event) {
				event.preventDefault();
				fieldcontainer.toggle();
			});
			form.submit(function(event) {
				event.preventDefault();
				applyDiscount();
			});
		}

		function onResponse(success) {
			error.toggle(!success);
			fieldcontainer.toggle(!success);
			if (success) {
				code.val("");
			}
		}

		function applyDiscount() {
			error.hide();
			cart.applyDiscount(code.val(), onResponse);
		}

		initEvents();
	};

	var cart = Cart($("#cart"));
	cart.update();

	Discount($("#discount"), cart);

	function hasCookie(name) {
		var cookies = document.cookie.split(";");
		var search = name + "=";

		for(var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].replace(' ', '');
			if (cookie.substr(0, search.length) == search) {
				return true;
			}
		}

		return false;
	}

	function getUserAgentClass() {
		var ua = window.navigator.userAgent;
		if (ua.match(/Safari\//)) {
			return ua.match(/Chrom(e|ium)/) ? 'chrome' : 'safari';
		}
		if (ua.match(/Firefox\//)) {
			return 'firefox';
		}
		if (ua.match(/Opera\//)) {
			return 'opera';
		}
		if (ua.match(/MSIE\/|Trident\//)) {
			return 'ie';
		}
		return 'other';
	}

	$("#cookiewarning .ua").not(".ua-" + getUserAgentClass()).remove();
	if (!hasCookie("sccookies")) $("#cookiewarning").addClass("on");

	$(".datepick").datepick();
});
