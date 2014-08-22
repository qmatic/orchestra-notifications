window.addEventListener('load', function() {
	/Mobile/.test(navigator.userAgent) && !location.hash && setTimeout(function () {
		if (!pageYOffset) window.scrollTo(0, 1);
	}, 1000);
}, false);

window.addEventListener('orientationchange', function() {
	if (orientation == 0 || orientation == 180) { //portrait
		/Mobile/.test(navigator.userAgent) && !location.hash && setTimeout(function () {
	    	if (!pageYOffset) window.scrollTo(0, 1);
		}, 1000);
	} else if (orientation == 90 || orientation == -90) { //landscape

	}
}, false);