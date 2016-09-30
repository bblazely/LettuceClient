(function (w, ng) {
    'use strict';
    ng.module('Widget.Iterator', [{
        name: 'Input',
        files: ['components/Utils/Input/Input.js']
    }, {
        files: ['components/Widgets/Iterator/css/Iterator.css']
    }], null)
        .directive('iterator', [
            '$timeout',
            'Input.Constant',
            function ($timeout, C_INPUT) {
                return {
                    restrict: 'C',
                    controller: function ($scope) {
                        var ctrl = this, iterators = [], trigger, trigger_is_input, first = null, last = null, triggeredEndSearch = false;

                        function findEndNode(down) {
                            var n, l, start = down ? iterators.length - 1 : 0;

                            n = iterators[start];
                            do {
                                l = ctrl.iterate(down, n);
                                if (l === null) {
                                    return n;
                                }
                                n = l;
                            } while (l !== null);
                            return null;
                        }

                        function findEndNodes() {
                            if (iterators.length > 0) {
                                first = findEndNode(false);
                                last = findEndNode(true);
                            }
                            triggeredEndSearch = false;
                        }

                        ctrl.registerTrigger = function (element, is_input) {
                            trigger = element;
                            trigger_is_input = is_input;
                        };

                        ctrl.register = function (element) {
                            iterators.push(element);
                            if (!triggeredEndSearch) {
                                triggeredEndSearch = true;
                                $timeout(function () {
                                    findEndNodes();
                                });
                            }
                        };

                        ctrl.deregister = function (element) {
                            var index = iterators.indexOf(element);
                            if (index !== -1) {
                                iterators.splice(index, 1);
                                if (!triggeredEndSearch) {
                                    triggeredEndSearch = true;
                                    $timeout(function () {
                                        findEndNodes();
                                    });
                                }
                            }
                        };

                        ctrl.focusTrigger = function (keyDown) {
                            if (trigger) {
                                if (keyDown) {
                                    trigger[0].value += (String.fromCharCode(keyDown));
                                }
                                trigger[0].focus();
                                $timeout(function () { $scope.$apply(); });
                                return true;
                            }
                            return false;
                        };

                        ctrl.first = function () {
                            if (first !== null) {
                                first[0].focus();
                            }
                        };

                        ctrl.last = function () {
                            if (last !== null) {
                                last[0].focus();
                            }
                        };

                        ctrl.selectFirst = function () {
                            if (first) {
                                first.triggerHandler('click');
                            }
                        };

                        ctrl.iterate = function (down, elem) {
                            var next = down ? 'nextElementSibling' : 'previousElementSibling';
                            if (elem) {
                                if (!elem[0][next]) {
                                    if (trigger_is_input) {
                                        ctrl.focusTrigger();
                                    } else {
                                        if (down) {
                                            ctrl.first();
                                        } else {
                                            ctrl.last();
                                        }
                                    }
                                    return null;
                                }

                                if (elem[0][next].classList.contains('iterator-item')) {
                                    return ng.element(elem[0][next]);
                                }

                                return ctrl.iterate(down, ng.element(elem[0][next]));
                            }
                        };
                    }
                };
            }
        ])
        .directive('iteratorTrigger', [
            'Input.Constant',
            function (C_INPUT) {
                return {
                    restrict: 'C',
                    priority: 0,
                    require: '^iterator',
                    link: function (scope, element, attr, iterator) {
                        var is_input = (element[0].nodeName.toLowerCase() === 'input' && element[0].type.toLowerCase() === 'text');

                        if (!attr.tabindex) {
                            element.attr('tabindex', 0);
                        }

                        iterator.registerTrigger(element, is_input);

                        element.on('keydown', function (e) {
                            e.stopPropagation();
                            if (e.keyCode === C_INPUT.KEY.ESCAPE) {
                                if (is_input) {
                                    element[0].selectionStart = element[0].value.length;
                                }
                                element[0].blur();
                                scope.$apply();
                            } else if (e.keyCode === C_INPUT.KEY.DOWN || e.keyCode === C_INPUT.KEY.UP) {
                                e.preventDefault();
                                e.stopImmediatePropagation();                           // Don't let siblings process this event (ie: searchTrigger)

                                if (is_input) {
                                    element[0].selectionStart = element[0].value.length;    // Clear the select-all if it was set
                                }

                                if (e.keyCode === C_INPUT.KEY.DOWN) {
                                    iterator.first();
                                } else {
                                    iterator.last();
                                }
                            } else if (e.keyCode === C_INPUT.KEY.ENTER) {
                                e.preventDefault();
                                e.stopImmediatePropagation();   // Don't let sibling's process this event.
                                iterator.selectFirst();
                            }
                        });

                        scope.$on('$destroy', function () {
                            element.off();
                        });
                    }
                };
            }
        ])
        .directive('iteratorItem', [
            'Input.Constant',
            function (C_INPUT) {
                return {
                    restrict: 'C',
                    require: '^iterator',
                    link: function (scope, element, attr, iterator) {

                        // Prevent mouse over after scroll without mouse movement
                        var enterX, enterY;

                        if (!attr.tabindex) {
                            element.attr('tabindex', 0);
                        }

                        function onMouseMove(e) {
                            if (e.clientX !== enterX || e.clientY !== enterY) {
                                element[0].focus(); // Mouse moved, trigger focus
                                element.off('mousemove', onMouseMove);  // remove the mousemove handler
                            }
                        }

                        element.on('mouseenter', function(e) {
                            enterX = e.clientX; // Save the initial mouse event position
                            enterY = e.clientY;
                            element.on('mousemove', onMouseMove);   // Wait for a subsequent move before triggering focus
                        });

                        element.on('mousedown', function() {
                            element[0].focus();
                        });
                        // End mouse over prevention

                        // Only listen for key input on this element when it has focus

                        function onKeyDown(e) {
                            var n;

                            if (e.keyCode === C_INPUT.KEY.DOWN || e.keyCode === C_INPUT.KEY.UP) {
                                e.preventDefault();
                                e.stopPropagation();

                                n = iterator.iterate((e.keyCode === C_INPUT.KEY.DOWN), element);
                                if (n) {
                                    n[0].focus();
                                }
                            } else if (e.keyCode === C_INPUT.KEY.ESCAPE || (e.keyCode === C_INPUT.KEY.TAB && e.shiftKey)) {
                                if (iterator.focusTrigger()) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                                scope.$apply();
                            }
                        }

                        function onKeyPress(e) {
                            // All keys not handled in onKeyDown will come here.
                            if (iterator.focusTrigger(e.charCode)) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }

                        function onBlur() {
                            element.off('keydown', onKeyDown);
                            element.off('keypress', onKeyPress);
                            element.off('blur', onBlur);
                        }

                        element.on('focus', function () {
                            element.on('keydown', onKeyDown);
                            element.on('keypress', onKeyPress);
                            element.on('blur', onBlur);
                        });

                        iterator.register(element, scope);

                        scope.$on('$destroy', function () {
                            element.off();
                            iterator.deregister(element);
                        });
                    }
                };
            }
        ]);
}(window, window.angular));