(function (w, ng) {
    'use strict';
    ng.module('Navigation.View', [{
        name:   'EntitySearch',
        files:  ['components/EntitySearch/EntitySearch.js']
    },{
        name:   'UserProfile',
        files:  ['components/UserProfile/UserProfile.js']
    },{
        name:   'UserSession',
        files:  ['components/UserSession/UserSession.js']       // TODO: include this in user profile, this seems a bit clunky
    },{
        name:   'Message',
        files:  ['components/Message/Message.js']
    },{
        name:   'MessageOverlay',
        files:  ['components/Widgets/MessageOverlay/MessageOverlay.js']
    }], null)

        .controller('Navigation.View', [
            '$scope',
            '$http',
            '$translate', // For changing language
            '$translatePartialLoader',
            'UserSession.Service',

            // Controller
            function ($scope, $http, $translate, $translatePartialLoader, user_session) {
                var profile = null;

                $translatePartialLoader.addPart('Navigation');
                $translate.refresh();

                $scope.session = function() {
                    return user_session.get_session();
                };
            }
        ]);
}(window, window.angular));
