(function (w, ng) {
    'use strict';
    ng.module('MessageOverlay', [{
        files:    ['components/Widgets/MessageOverlay/css/MessageOverlay.css']
    }], null)
        .service('MessageOverlay.Service', [
            '$rootScope', '$timeout',
            function ($rootScope, $timeout) {
                var messages = {}, msg_id = 0, count = 0;

                return {
                    get: function () {
                        return messages;
                    },
                    add: function(text, type, timeout) {
                        var msg, index = 'msg' + (msg_id++);
                        if (!type) {
                            type = 'danger';
                        }

                        if (timeout === undefined) {
                            timeout = 0;
                        }

                        count++;
                        msg = {
                            type: type,
                            text: text,
                            timer: (timeout) ? $timeout(function () {
                                count--;
                                delete messages[index];
                            }, timeout) : null
                        };

                        messages[index] = msg;
                        return index;
                    },
                    remove: function(index) {
                        if (messages[index]) {
                            if (messages[index].timer) {
                                messages[index].timer();
                            }
                            count--;
                            delete messages[index];
                        }
                    },
                    count: function () {
                        return count;
                    }
                };
            }
        ])
        .directive('messageOverlay', [
            'MessageOverlay.Service',
            function (message_overlay) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/Widgets/MessageOverlay/fragments/MessageOverlay.tpl.html',
                    link: function (scope, element, attr) {
                        scope.messages = message_overlay.get();

                        scope.close = function(index) {
                            message_overlay.remove(index);
                        };

                        scope.showOverlay = function() {
                            return message_overlay.count();
                        };
                    }
                };
            }
        ])
}(window, window.angular));