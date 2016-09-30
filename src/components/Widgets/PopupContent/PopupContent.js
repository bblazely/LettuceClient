(function (w, ng) {
    'use strict';
    ng.module('Widget.PopupContent', [{
        files:    ['components/Widgets/PopupContent/css/PopupContent.css']
    }], null)
        .constant('PopupContent.Event', {
            EVENT_SCROLL_TO:    'PopupContent::ScrollTo',
            EVENT_HIDE:         'PopupContent::Hide',
            EVENT_TOP:          'PopupContent::Top'
        })
        .directive('popupContent', [
            '$rootScope', '$timeout', 'PopupContent.Event',
            function ($rootScope, $timeout, E_POPUP_CONTENT) {
                return {
                    restrict: 'AEC',
                    require: 'popupContent',
                    scope: {
                        ready: '=?popupContentReady',
                        closeCondition: '=?popupContentCloseIf'
                    },
                    link: function(scope, element, attrs, ctrl) {
                        if (attrs.popupContentCloseOn) {
                            var parts = attrs.popupContentCloseOn.split(' ');
                            ng.forEach(parts, function(val, key) {
                                parts[key] = val.toLowerCase().trim();
                            });
                            ctrl.closeOn(parts);
                        }
                    },
                    controller: function ($scope) {
                        var ctrl = this, containerElement, triggerElement, offStateChangeSuccess = null, event, close_on = [];

                        event = {
                            onFocusOut: function (e) {
                                if (close_on.indexOf('blur') !== -1 && !containerElement[0].contains(e.relatedTarget)) {
                                    $timeout(function () {
                                        ctrl.toggle(false);
                                    });
                                }
                            },
                            onFocus: function (e) {
                                ctrl.toggle(true);
                                $timeout(function () {
                                    $scope.$apply();
                                });
                            },
                            onClick: function (e) {
                                ctrl.toggle();
                                $scope.$apply();
                            },
                            onDocumentClick: function (e) {
                                // If the body was clicked anywhere except the trigger or the popup and it's descendents (the last .contains condition is a fix for IE scrollbars issuing a blur event)
                                if (close_on.indexOf('external') !== -1 && e.target !== triggerElement[0] && !containerElement[0].contains(e.target)) {
                                    ctrl.toggle(false);
                                }
                                $scope.$apply();
                            }
                        };

                        // Override ready check if it hasn't been set
                        if ($scope.ready === undefined) {
                            $scope.ready = $scope.ready || true;
                        }

                        ctrl.closeOn = function(condition) {
                            if (ng.isArray(condition)) {
                                close_on = close_on.concat(condition);
                            } else if (ng.isString(condition)) {
                                close_on.push(condition);
                            }
                        };

                        ctrl.init = false;

                        ctrl.visible = function () {
                            return ctrl.init && ctrl.toggled && $scope.ready;
                        };

                        ctrl.toggle = function(state) {
                            if (state !== undefined) {
                                ctrl.toggled = state;
                            } else {
                                ctrl.toggled = !ctrl.toggled;
                            }

                            if (ctrl.toggled === true && !ctrl.init) {
                                ctrl.init = true;
                            }
                        };

                        ctrl.registerContainer = function (container) {
                            containerElement = container;
                        };

                        ctrl.registerTrigger = function (el) {
                            if (el[0].nodeName.toLowerCase() === 'input' && el[0].type.toLowerCase() === 'text') {
                                el.on('focusout', event.onFocusOut);  // Hide on Blur (Capture focusout so the relatedTarget is populated by IE)
                                el.on('focus', event.onFocus);        // Show on Focus
                            } else {
                                // Toggle Button Trigger Mode
                                $scope.ready = true;
                                el.on('click', event.onClick);
                            }
                            ng.element(document).on('click', event.onDocumentClick);

                            // Clean up
                            $scope.$on('$destroy', function () {
                                el.off('focusout', event.onFocusOut);
                                el.off('focus', event.onFocus);
                                el.off('click', event.onClick);
                                ng.element(document).off('click', event.onDocumentClick);
                            });

                            triggerElement = el;
                        };

                        ctrl.getTrigger = function () {
                            return triggerElement;
                        };

                        offStateChangeSuccess = $rootScope.$on('$stateChangeSuccess', function() {
                            if (close_on.indexOf('statechange') !== -1) {
                                ctrl.toggle(false);
                            }
                        });

                        $scope.$watch('closeCondition', function(val) {
                            if (val === true) {
                                ctrl.toggle(false);
                            }
                        });

                        $scope.$on(E_POPUP_CONTENT.EVENT_HIDE, function () {
                            ctrl.toggle(false);
                            if (document.activeElement) {
                                document.activeElement.blur();
                            }
                        });

                        $scope.$on('$destroy', function () {
                            offStateChangeSuccess();
                        });
                    }
                };
            }
        ])
        .directive('popupContentTrigger', [
            'PopupContent.Event',
            function (E_POPUP_CONTENT) {
                return {
                    restrict: 'AC',
                    require: '^popupContent',
                    link: function (scope, element, attr, popupContentCtrl) {
                        var event = {
                            onFocus: function () {
                                scope.$emit(E_POPUP_CONTENT.EVENT_TOP);    // If the trigger is focused, return to the top of the list (could extend this to be optional via an attribute?)
                            }
                        };

                        element.on('focus', event.onFocus);
                        popupContentCtrl.registerTrigger(element);

                        scope.$on('$destroy', function () {
                            element.off('focus', event.onFocus);
                        });
                    }
                };
            }
        ])
        .directive('popupContentContainer', ['$timeout', '$window', 'PopupContent.Event',
            function ($timeout, $window, E_POPUP_CONTENT) {
                return {
                    restrict: 'AEC',
                    templateUrl: 'components/Widgets/PopupContent/fragments/PopupContentContainer.tpl.html',
                    transclude: true,
                    scope: {},
                    require: '^popupContent',
                    link: function (scope, element, attr, popupContentCtrl) {
                        var visible = false,
                            resize_timer, recalc_timer,
                            handle = element[0].querySelector('.popover'),          // Find the popover elements
                            content = element[0].querySelector('.popover-content'),
                            content_element = ng.element(content);

                        popupContentCtrl.registerContainer(element);

                        handle.style.position = 'fixed';    // Move it to a safe location to calculate dimensions
                        handle.style.top = 0;
                        handle.style.left = '100px';

                        function computedSize(el, vertical, include_margin, include_offset, include_size) {
                            var s1 = 'Left', s2 = 'Right', d = 'width', style = $window.getComputedStyle(el), size = 0, offset_size;
                            if (vertical) {
                                s1 = 'Top';
                                s2 = 'Bottom';
                                d = 'height';
                            }

                            if (include_margin) {
                                size += parseInt(style['margin' + s1], 10) + parseInt(style['margin' + s2], 10);
                            }

                            if (include_offset || include_size) {
                                offset_size =   parseInt(style['border' + s1 + 'Width'], 10) + parseInt(style['border' + s2 + 'Width'], 10) +
                                                parseInt(style['padding' + s1], 10) + parseInt(style['padding'+ s2], 10);

                                if (include_offset) {
                                    size += offset_size;
                                }
                            }

                            if (include_size) {
                                size += el.getBoundingClientRect()[d] - offset_size; // Bounding Rect seems more reliable/consistent for width+padding+border
                            }
                            return size;
                        }

                        function update_position() {
                            var max_height, el_bounds;

                            el_bounds = element[0].getBoundingClientRect();
                            if (el_bounds.top > $window.innerHeight / 2) {      // Menu grows up
                                ng.element(handle).addClass('top');
                                handle.style.bottom = element[0].offsetParent.offsetHeight + 'px';  // Move the handle up over the trigger
                                max_height = el_bounds.bottom - element[0].offsetParent.offsetHeight;
                            } else {                                            // Menu grows down
                                ng.element(handle).addClass('bottom');
                                max_height = $window.innerHeight - el_bounds.bottom;
                            }

                            // Final adjustment (can't access actual height etc until the element is in the DOM)
                            $timeout.cancel(recalc_timer);
                            recalc_timer = $timeout(function() {
                                // Horizontal Adjustment
                                var new_left = Math.round(computedSize(handle, false, true, true, true) / -2) + Math.round(computedSize(popupContentCtrl.getTrigger()[0], false, true, true, true) / 2);

                                // Horizontal Bounds Check Right
                                if(element[0].offsetParent.offsetLeft + computedSize(handle, false, true, true, true) > $window.innerWidth) {
                                    new_left = $window.innerWidth - (element[0].offsetParent.offsetLeft + computedSize(handle, false, true, true, true));
                                }

                                // Horizontal Bounds Check Left
                                if(element[0].offsetParent.offsetLeft + new_left < 0) {
                                    new_left = element[0].offsetParent.offsetLeft * -1;
                                }

                                // Apply Horizontal Position
                                handle.style.left = new_left + 'px';

                                // Vertical + MaxHeight Adjustment
                                content.style.maxHeight = (max_height - computedSize(handle, true, true, true, false)) + 'px';
                                handle.style.top = 'auto';
                                handle.style.position = 'absolute';
                                handle.style.visibility = 'visible';
                            }, 100);
                        }

                        function resize() {
                            handle.style.visibility = 'hidden';
                            handle.style.position = 'fixed';
                            handle.style.left = 0;
                            handle.style.top = 0;

                            $timeout.cancel(resize_timer);
                            resize_timer = $timeout(function() {
                                update_position();
                            });
                        }

                        scope.popup_content_container = {
                            transclude: function () {
                                return popupContentCtrl.init;
                            },
                            visible: function () {
                                var visible_now = popupContentCtrl.visible();
                                if (visible_now !== visible) {
                                    handle.style.visibility = 'hidden';
                                    if (visible_now) {
                                        update_position();
                                        $window.addEventListener('resize', resize);
                                    } else {
                                        $timeout.cancel(resize_timer);
                                        $window.removeEventListener('resize', resize);
                                    }
                                    visible = visible_now;
                                    content_element[0].scrollTop = 0;
                                }
                                return visible_now;
                            }
                        };

                        element.on('mousedown', function(e) {
                            var node_type = e.target.nodeName.toLowerCase();
                            if (node_type !== 'input' && node_type !== 'select' && node_type !== 'textarea') {
                                e.preventDefault();
                                e.stopImmediatePropagation();
                            }
                            return true;
                        });

                        element.on('mousewheel', function(e) {
                            if ((e.wheelDelta > 0 && content_element[0].scrollTop === 0) || (e.wheelDelta < 0 && (content_element[0].scrollTop === content_element[0].scrollHeight - content_element[0].clientHeight))) {
                                e.preventDefault();
                            }
                        });

                        scope.$on(E_POPUP_CONTENT.EVENT_TOP, function($event) {
                            $event.stopPropagation();
                            content_element[0].scrollTop = 0;
                        });

                        scope.$on(E_POPUP_CONTENT.EVENT_SCROLL_TO, function($event, element) {
                            var top_element = element[0].offsetTop,
                                top_container = content_element[0].scrollTop,
                                bottom_element = top_element + element[0].clientHeight,
                                bottom_container = top_container + content_element[0].clientHeight,
                                delta = 0;

                            $event.stopPropagation();

                            if (bottom_element > bottom_container) {
                                delta = bottom_element - bottom_container;
                            } else if (top_element < top_container) {
                                delta = top_element - top_container;
                            }

                            content_element[0].scrollTop += delta;
                        });

                        scope.$on('$destroy', function () {
                            element.off();
                            $timeout.cancel(resize_timer);
                            $timeout.cancel(recalc_timer);
                        });
                    }
                };
            }
        ]);
}(window, window.angular));