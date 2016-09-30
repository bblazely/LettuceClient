(function (w, ng) {
    'use strict';
    ng.module('SandPit.View', [{
        name: 'Facebook',
        files: ['components/Facebook/Facebook.js']
    },{
        name: 'Widget.PopupContent',
        files: ['components/Widgets/PopupContent/PopupContent.js']
    },{
        name: 'EntitySearch',
        files: ['components/EntitySearch/EntitySearch.js']
    }], null)

        .controller('SandPit.View', [
            '$scope',
            '$translate',

            // Controller
            function ($scope, $translate) {
                $scope.setlang = function (lang) {
                    $translate.use(lang);
                };
            }
        ]);
}(window, window.angular));
