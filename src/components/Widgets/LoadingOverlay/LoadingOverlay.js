(function (ng) {
    'use strict';
    ng.module('Widget.LoadingOverlay', [
        { files: ['components/Widgets/LoadingOverlay/css/LoadingOverlay.css'] }
    ])
        .directive('loadingOverlay', ['$timeout', function ($timeout) {
            return {
                priority: 9999,
                restrict: 'A',
/*                scope: {
                    visible: '&loadingOverlay'
                },*/
                link: function (scope, element, attr) {
                    var el, timer = null,
                        css = attr.loadingOverlayClass || 'loading-overlay-light',
                        delay = attr.loadingOverlayDelay || 250,
                        spinner = attr.loadingOverlaySpinner || 'assets/img/ballcircleloader.gif',
                        visible = attr.loadingOverlay;

                    // Create the element
                    el = ng.element('<div class="loading-overlay ' + css + '"><img src="' + spinner + '"/></div>');
                    element.append(el);

                    // Watch for load status change
                    scope.$watch(visible, function(visible) {
                        $timeout.cancel(timer);
                        if (visible) {
                            timer = $timeout(function() {
                                el.toggleClass('in', true);
                            }, delay);
                        } else {
                            el.toggleClass('in', false);
                        }
                    });
                }
            };
        }]);
}(window.angular));