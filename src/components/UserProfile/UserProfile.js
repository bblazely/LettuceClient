(function (w, ng, mobile) {
    'use strict';
    ng.module('UserProfile', [{
            name: 'SimpleState',
            files: ['components/Utils/SimpleState/SimpleState.js']
        },{
            name: 'UserSession',
            files: ['components/UserSession/UserSession.js']
        }, {
            name: 'Login',
            files: ['components/Login/Login.js']
        }, {
            'css': ['components/UserProfile/css/UserProfile.css']
        }], null)

        .directive('userProfile', [
            '$rootScope',
            '$modal',
            '$location',
            '$state',
            'UserSession.Service',
            'UserSession.Event',
            'API.Event',
            function ($rootScope, $modal, $location, $state, user_session, E_USER_SESSION, E_API) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/UserProfile/fragments/UserProfile.tpl.html',
                    scope: {
                        'profile': '=?userProfile'
                    },

                    link: function (scope) {
                        scope.profile = null;

                        $rootScope.$on(E_USER_SESSION.EVENT_CHANGE_STATE, function(e, action, data) {
                            switch (action) {
                                case E_USER_SESSION.ACTION_START:
                                  //  scope.export = data;
                                    scope.profile = data;
                                    if (data.new_login) {
                                        $state.go('root.entity', {public_id: data.public_id});
                                    }
                                    break;
                                case E_USER_SESSION.ACTION_END:
                                    console.log('end session triggered');
                                    break;
                            }
                        });

                        $rootScope.$on(E_API.EVENT_LOGOUT_DETECTED, function() {
                            if (scope.hasSession()) {
                                scope.logout(true);
                            }
                        });

                        var showDialog = function (dialog, size) {
                            switch (dialog) {
                                case 'login':
                                    dialog = 'Login';
                                    break;
                                case 'password':
                                    dialog = 'ChangePassword';
                                    break;
                            }

                            $modal.open({
                                templateUrl: 'components/UserProfile/fragments/' + dialog + 'Modal.tpl.html',
                                size: (size || 'sm')
                            });
                        };

                        // Scope
                        scope.showChangePasswordDialog = function () {
                            showDialog('password', 'sm');
                        };

                        scope.showLoginDialog = function () {
                            /** MOBILE */
                            if (mobile) {
                                $state.go('root.login');
                            } else {
                                showDialog('login', 'sm');
                            }
                        };

                        scope.logout = function (triggered) {
                            user_session.remove();
                            scope.profile = null;

                            // Todo: redirect to a 'logged out' page instead, or show a better error msg
                            $state.go('root');
                            if (triggered) {
                                alert('Session was logged out elsewhere...');
                            }
                        };

                        scope.hasSession = function () {
                            return user_session.present();
                        };

                        // Init
                        if ($location.search().action === 'login') {
                            scope.showLoginDialog();
                        }

                        user_session.get().then(function(data) {
                            scope.profile = data;
                        });
                        /*  this can be handled in the $on above? if (data[PASSWORD_RESET]) {
                            scope.showPasswordDialog();
                        } else if (data[VERIFIED] === 0) {
                            scope.showLoginDialog();
                        }*/
                    }
                };
            }
        ])

     /*   .directive('userProfileSettingsMenu', [
            '$rootScope',
            '$translate',
            '$translatePartialLoader',
            'UserSession.Service',

            function ($rootScope, $translate, $translatePartialLoader, user_session, E_USER_SESSION) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/UserProfile/fragments/SettingsMenu.tpl.html',
                    scope: true,
                    link: function (scope) {


                        // Get initial session state at runtime
                        user_session.get().then(function (session) {
                            scope.user = session;
                            console.log(session);
                        });


                        scope.test = {
                            blah: 'hello'
                        };

                        scope.hasSession = function () {
                            return user_session.isValid();
                        };
                    }
                };
            }
        ])*/

        .directive('userProfileChangePassword', [
            '$translate',
            '$translatePartialLoader',
            'UserSession.Service',
            'UserSession.Login.States',
            function ($translate, $translatePartialLoader, user_session_service, L_USER_SESSION) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/UserProfile/fragments/ChangePassword.tpl.html',
                    link: function (scope) {
                        // Private
                        $translatePartialLoader.addPart('UserProfile');
                        $translate.refresh();

                        // Scope
                        scope.data = {
                            state:   L_USER_SESSION.IDLE
                        };

                        scope.STATE = L_USER_SESSION;
                        scope.panelVisibility = false;
                    }
                };
            }
        ]);
}(window, window.angular, window.cordova));