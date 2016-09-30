(function (ng) {
    'use strict';
    ng.module('Widget.NotifyBadge', [
        { files: ['components/Widgets/NotifyBadge/css/NotifyBadge.css'] }
    ])
        .directive('notifyBadge', [function () {
            return {
                restrict: 'EA',
                templateUrl: 'components/Widgets/NotifyBadge/fragments/NotifyBadge.tpl.html',
                scope: {
                    value: '=notifyBadgeValue'
                },
                link: function (scope, element, attr) {
                }
            };
        }]);
}(window.angular));