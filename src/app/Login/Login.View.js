(function (w, ng) {
    'use strict';
    ng.module('Login.View', [{
        name:   'Login',
        files:  ['components/Login/Login.js']
    }], null)
        .controller('Login.View', [
            '$scope',
            function ($scope) {
                $scope.loggedIn = function() {
                    return null;
                };
            }
        ]);
}(window, window.angular));
