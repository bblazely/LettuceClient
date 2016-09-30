(function (ng) {
    'use strict';
    ng.module('Widget.AutoFocus', [])
        .directive('autoFocus', ['$timeout', function ($timeout) {
            return {
                restrict: 'A',
                link: function ( scope, element, attrs ) {
                    scope.$watch( attrs.autoFocus, function ( val ) {
                        if ( ng.isDefined( val ) && val ) {
                            $timeout( function () { element[0].focus(); } );
                        }
                    }, true);
                }
            };
        }]);
}(window.angular));