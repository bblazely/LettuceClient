(function (ng) {
    'use strict';
    ng.module('Login', [{
            name: 'Widget.LoadingOverlay',
            files: ['components/Widgets/LoadingOverlay/LoadingOverlay.js']
        }, {
            name: 'LoginNative',
            files: ['components/LoginNative/LoginNative.js']
        }, {
            name: 'LoginExternal',
            files: ['components/LoginExternal/LoginExternal.js']
        }, {
            name: 'UserSession',
            files: ['components/UserSession/UserSession.js']
        }, {
            files: ['components/Login/css/Login.css']
        }], null)

        .directive('login', [
            '$location',
            '$translate',
            '$translatePartialLoader',
            'UserSession.Service',
            'SimpleState.Service',
            'SimpleState.Constant',
            'LoginNative.View',
            '$modal',
            function ($location, $translate, $translatePartialLoader, user_session_service, simple_state, C_SIMPLE_STATE, V_LOGIN_NATIVE, $modal) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/Login/fragments/Login.tpl.html',
                    scope: {
                        onLogin: '&onlogin'
                    },
                    link: function (scope, element, attr) {
                        // Private
                        $translatePartialLoader.addPart('Login');
                        $translate.refresh();

                        function getSession() {
                            user_session_service.get(scope.persist, true).then(
                                // Session returned
                                function () {
                                    if (scope.onLogin) {
                                        scope.onLogin();
                                    }
                                },
                                // Error returned
                                function (error_data) {
                                    // TODO: Even needed? Test!
                                    scope.state.set(C_SIMPLE_STATE.STATE.IDLE);
                                }
                            );
                        }

                        scope.state_view = 1;

                        // Scope
                        scope.persist = 'persist';
                        scope.STATE = C_SIMPLE_STATE.STATE;

                        scope.state_login = simple_state.get(C_SIMPLE_STATE.STATE.IDLE); // define here so the child login directive scopes can both access it
                        scope.state_view = simple_state.get();                           // to monitor the native login view
                        scope.state_view.change(V_LOGIN_NATIVE.LOG_IN);                  // Set the initial login state.

                        scope.noLogin = function() {
                            return !scope.state_view.is(V_LOGIN_NATIVE.LOG_IN);
                        };

                        scope.response = function(code, payload) {
                            var options, modal, message;

                            switch (code) {
                                case 2:
                                    message = 'LOGIN_JOIN_USER_CHOICE';
                                    options = [
                                        {label: 'COMMON_JOIN', value: 1}, {label: 'COMMON_SWITCH', value: 1}, {label: 'COMMON_CANCEL', value: 0}
                                    ];
                                    break;
                                case 3:
                                    message = 'LOGIN_SWITCH_USER_CHOICE';
                                    options = [{label: 'COMMON_SWITCH', value: 1}, {label: 'COMMON_CANCEL', value: 0}];
                                    break;
                                
                            }

                            modal = $modal.open({
                                controller: function($scope) {
                                    $scope.heading = 'COMMON_CHOICE';
                                    $scope.message = message;
                                    $scope.options = options;
                                },
                                templateUrl: 'components/Widgets/Prompt/prompt.tpl.html',
                                size: 'md',
                                backdrop: 'static' // Doesn't close when the backdrop is clicked
                            });

                            modal.result.then(function (selection) {
                                // Do this or do that based on 'selected' value;
                                if (selection === 1) {
                                    console.log('Switch!');
                                } else if (selection === 2) {
                                    console.log('Stay!');
                                } else {
                                    console.log('Join!');
                                }
                                getSession();
                            });

                        };

                        // Watch for login state returning a success
                        scope.$watch(function () { return scope.state_login.current; }, function (s) {
                            switch(s) {
                                case C_SIMPLE_STATE.STATE.SUCCESS:
                                    getSession();
                                    break;

                                case 'QUESTION':


                                    break;
                            }
                        });

                        scope.$on('$destroy', function() {
                            // Remove state tracking objects
                            simple_state.remove(scope.state_login);
                            simple_state.remove(scope.state_view);
                        });
                    }
                };
            }
        ]);
}(window.angular));