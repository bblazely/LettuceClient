(function (w, ng, mobile) {
    'use strict';
    ng.module('LoginExternal', [{
        name:   'SelectExternalProvider',
        files:  ['components/SelectExternalProvider/SelectExternalProvider.js']
    }, {
        name:   'API',
        files:  ['components/API/API.js']
    }, {
        files:    ['components/LoginExternal/css/LoginExternal.css']
    }], null)
        .service('LoginExternal.Service', [
            '$rootScope',
            'UserSession.Event',
            function ($rootScope, E_USER_SESSION) {
                var providers = [];

                // Ensure social network selections are cleared on session end.
                $rootScope.$on(E_USER_SESSION.EVENT_CHANGE_STATE, function (event, action) {
                    if (action === E_USER_SESSION.ACTION_END) {
                        ng.forEach(providers, function (state, p_id) {
                            providers[p_id] = false;
                        });
                    }
                });

                return {
                    get: function () {
                        return providers;
                    },
                    set: function (p_id, state) {
                        providers[p_id] = state;
                    }
                };
            }
        ])
        .directive('loginExternal', [
            '$window',
            '$timeout',
            '$translate',
            '$translatePartialLoader',
            '$api',
            'LoginExternal.Service',      // Persistence
            'SimpleState.Service',
            'SimpleState.Constant',
            function ($window, $timeout, $translate, $translatePartialLoader, $api, login_external, simple_state, C_SIMPLE_STATE) {
                return {
                    restrict: 'AE',
                    scope: {
                        state: '=?stateLogin',
                        response: '=?responseLogin'
                    },
                    templateUrl: 'components/LoginExternal/fragments/LoginExternal.tpl.html',
                    link: function (scope, element, attr) {

                        $translatePartialLoader.addPart('LoginExternal');
                        $translate.refresh();

                        // Private
                        var login_window = null,
                            login_callback = '__lsrc',
                            login_window_timeout = null,
                            active_provider = null,
                            str_provider_id = 'provider_id',
                            login_base = '';

                        if (!scope.state) {
                            scope.state = ng.noop;
                        } else {
                            scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                        }

                        function disableProviderSelection(disabled) {
                            ng.forEach(scope.data.providers, function (p, p_id) {
                                if (scope.provider_state.selected[p_id] !== true) {
                                    scope.provider_state.disabled[p_id] = disabled;
                                }
                            });
                        }

                        function clearLoginWindow() {
                            window[login_callback] = null;
                            if (!login_window.closed) {
                                login_window.close();
                            }
                            login_window = null;
                        }

                        function endLoginAttempt() {
                            disableProviderSelection(false);
                            active_provider = null;
                            scope.$apply();
                        }

                        function setError(error) {
                            scope.data.error.value = error;
                            scope.data.error.show = true;
                        }


                        function loginCheck() {
                            if (login_window) {
                                if (login_window.closed) {
                                    if (window[login_callback]) {
                                        scope.provider_state.selected[active_provider[str_provider_id]] = false;
                                        active_provider.selected = null;
                                        scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                                        setError('ERR_EXTERNAL_LOGIN_INTERRUPT');
                                        clearLoginWindow();
                                        endLoginAttempt();
                                    }
                                } else {
                                    login_window_timeout = $timeout(loginCheck, 250, false);    // Nothing on the scope updating, so suppress $apply
                                }
                            }
                        }

                        function loginCallback(code, payload, error_code, error_msg) {
                            $timeout.cancel(login_window_timeout);
                            clearLoginWindow();

                            console.log(code, payload, error_code, error_msg);

                            switch (code) {
                                case 1:
                                    scope.state.change(C_SIMPLE_STATE.STATE.SUCCESS);
                                    scope.provider_state.disabled[active_provider[str_provider_id]] = true;
                                    login_external.set(active_provider[str_provider_id], true);
                                    break;
                                case 2: // Intentional Fall Through
                                case 3:
                                    // Switch
                                    scope.response(code, payload);
                                    break;
                                default:
                                    scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                                    scope.provider_state.selected[active_provider[str_provider_id]] = false;

                                    switch (error_code) {
                                        case 'bb469206':        // ExternalProvider::EXCEPTION_PROVIDER_XSRF_CHECK_FAILED
                                            setError('ERR_EXTERNAL_LOGIN_XSRF');
                                            break;
                                        case '5a318839':        // ???
                                            setError('ERR_EXTERNAL_LOGIN_SYSTEM');
                                            break;
                                        case '9a74bb7d':        // ???
                                            setError('ERR_EXTERNAL_LOGIN_COOKIE');
                                            break;
                                        default:
                                            setError('ERR_EXTERNAL_LOGIN_UNKNOWN');
                                            break;
                                    }
                                    break;
                            }

                            endLoginAttempt();
                        }

                        function login(provider) {
                            // Login late execution function
                            active_provider = provider;
                            scope.dismissError();
                            scope.state.change(C_SIMPLE_STATE.STATE.PENDING);
                            disableProviderSelection(true);

                            if (mobile) {
                                console.log('in mobile code?');
                                var loadStopHandler = function (e) {
                                    login_window.executeScript({
                                        code: "try { loginResponse(); } catch (e) { 'none'; }"
                                    }, function (response) {
                                        if (response && response[0] !== 'none') {
                                            login_window.removeEventListener('loadstop', loadStopHandler);
                                            loginCallback(response[0].result, response[0].payload, response[0].error_code, response[0].error_msg);
                                        } else {
                                            login_window.show();
                                            login_external.set(active_provider[str_provider_id], false);
                                            scope.provider_state.selected[active_provider[str_provider_id]] = false;
                                            scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                                            disableProviderSelection(false);
                                        }

                                        scope.$apply();
                                    });
                                };

                                login_window = window.open(login_base + provider.provider_id_str, 'LoginInApp', 'location=no,hidden=yes');
                                login_window.addEventListener('loadstop', loadStopHandler);
                            } else {
                                // Fire up the popup straight away (popup blockers will get angry otherwise)
                                window[login_callback] = loginCallback;
                                login_window = window.open(
                                    /* TODO Replace this with config or env var */
                                    '/lettuce/v1/user/login/external/' + provider.provider_id_str,
                                    'LoginPopUp',
                                    'top=' + Math.floor($window.screenTop + ($window.innerHeight / 2 - provider.popup_height / 2)) +
                                    ',left=' + Math.floor($window.screenLeft + ($window.innerWidth / 2 - provider.popup_width / 2)) +
                                    ',height=' + provider.popup_height +
                                    ',width=' + provider.popup_width);

                                loginCheck();
                            }

                        }

                        // Scope ---
                        scope.provider_state = {
                            selected: {},
                            disabled: {}
                        };

                        scope.data = {
                            externalProviders: {},
                            error: {
                                value: '',
                                show: false
                            }
                        };

                        // Load persistent state from LoginExternal.Service
                        ng.forEach(login_external.get(), function (state, p_id) {
                            if (state === true) {
                                scope.provider_state.selected[p_id] = true;
                                scope.provider_state.disabled[p_id] = true;
                            }
                        });

                        scope.$watchCollection('provider_state.selected', function (newValue) {
                            ng.forEach(newValue, function (value, p_id) {
                                if (value === true && scope.provider_state.disabled[p_id] !== true) {
                                    login(scope.data.providers[p_id]);
                                }
                            });
                        });

                        scope.dismissError = function () {
                            scope.data.error.show = false;
                        };

                        scope.isSelected = function (provider) {
                            if (scope.selectOnly !== undefined) {
                                return provider.selected;
                            }

                            return provider.selected || provider.authenticated;
                        };

                        scope.$on('$destroy', function () {
                            if (login_window) {
                                $timeout.cancel(login_window_timeout);
                                login_window.close();
                            }
                        });
                    }
                };
            }
        ])
}(window, window.angular, window.cordova));