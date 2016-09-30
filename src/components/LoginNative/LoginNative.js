(function (ng) {
    'use strict';

    ng.module('LoginNative', ['ngAnimate', {
        name: 'API',
        files: ['components/API/API.js']
    },{
        name: 'Widget.AutoFocus',
        files: ['components/Widgets/AutoFocus/AutoFocus.js']
    },{
        files: [
            'components/LoginNative/css/LoginNative.css',
            'components/LoginNative/css/LoginNative.anim.css'
        ]
    }]).
        directive('loginNative', [
            '$rootScope',
            '$location',
            '$translate',
            '$translatePartialLoader',
            '$http',
            '$api',
            '$interval',
            '$timeout',
            '$cookies',
            'UserSession.Service',
            'SimpleState.Service',
            'SimpleState.Constant',
            'LoginNative.View',
            function ($rootScope, $location, $translate, $translatePartialLoader, $http, $api, $interval, $timeout, $cookies, user_session, simple_state, C_SIMPLE_STATE, V_LOGIN_NATIVE) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/LoginNative/LoginNative.tpl.html',
                    scope: {
                        login: '=?stateLogin',
                        view:  '=?stateView'
                    },
                    link: function (scope, element, attr) {
                        var VERIFICATION_COOKIE     = 'SuspiciousNinja',
                            ERROR_CODE              = 'error-code',
                            cookie_check_interval   = null;

                        // Language
                        $translatePartialLoader.addPart('LoginNative');
                        $translate.refresh();

                        // Private
                        function doLogin() {
                            scope.login.change(C_SIMPLE_STATE.STATE.PENDING);
                            $api.v1.post('user/login/native', {
                                email: scope.data.email,
                                password: scope.data.password
                            }).
                                success(function () {
                                    scope.login.change(C_SIMPLE_STATE.STATE.SUCCESS);
                                }).
                                error(function (data, status, headers) {
                                    scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                    // Process form representation of possible server errors
                                    // These should only be errors that can't be picked up by automatic form validation
                                    switch (headers()[ERROR_CODE]) {
                                        case 'aef08dac':      // Password Incorrect
                                            scope.lnf.password.$setValidity('incorrect', false);
                                            break;
                                        case '3a474c80':       // User not found
                                            scope.lnf.email.$setValidity('notfound', false);
                                            break;
                                        case 'fe7852a9':      // Account Not Verified
                                            scope.data.entity_id = data.entity_id;
                                            scope.showVerification();
                                            break;
                                        default:
                                            setAlert('unexpected');
                                            break;
                                    }
                                });
                        }

                        function setAlert(alert) {
                            if (!scope.alerts) {
                                scope.alerts = {};
                            }
                            scope.alerts[alert] = true;
                        }

                        function doPasswordReset() {
                            // TODO: NYI

                            // Validation Steps Complete. Reset or not?
                            scope.login.change(C_SIMPLE_STATE.STATE.PENDING);

                            $http.get('/v1/native_login/request_pw_reset/' + scope.data.email).
                                success(function () {
                                    scope.view.change(V_LOGIN_NATIVE.VERIFY_PASSWORD_RESET);
                                    scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                }).
                                error(function (data, status, headers) {
                                    scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                    switch (headers()[ERROR_CODE]) {
                                        case '560710785':       // User not found
                                            scope.lnf.email.$setValidity('notfound', false);
                                            break;
                                    }
                                });
                        }

                        function doSignUp() {
                            scope.login.change(C_SIMPLE_STATE.STATE.PENDING);

                            $api.v1.post('user/register/native', {
                                email: scope.data.email,
                                first_name: scope.data.first_name,
                                last_name: scope.data.last_name,
                                password: scope.data.password
                            }).
                                success(function (data) {
                                    scope.data.entity_id = data.entity_id;
                                    // ngCookies looks to poll/update every 100ms, so delay 150ms and then change the scope.view.
                                    // (update this in the future if ngCookies ever changes)
                                    $timeout(function () {
                                        scope.showVerification();
                                        scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                    }, 150);
                                }).
                                error(function (data, status, headers) {
                                    scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                    switch (headers()[ERROR_CODE]) {
                                        case '531446981':       // Email Address Invalid
                                            scope.lnf.email.$setValidity('invalid', false);
                                            break;
                                        case '20e94230':       // Login already exists
                                            scope.lnf.email.$setValidity('exists', false);
                                            break;
                                        case 'd33acbfe': // Intentional Fall Through
                                        default:
                                            setAlert('unexpected');
                                            break;
                                    }
                                });
                        }

                        function doResendVerification() {
                            // Validation Steps Complete. Register or Not?
                            scope.login.change(C_SIMPLE_STATE.STATE.PENDING);
                            scope.data.verify_code = '';

                            $api.v1.post('user/verification/native/resend', {
                                email: scope.data.email
                            }).success(function (data, status, headers) {
                                scope.view.change(V_LOGIN_NATIVE.VERIFY_ONLINE);
                                scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                            }).error(function (data, status, headers) {
                                scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                                switch (headers()[ERROR_CODE]) {
                                    case 'b1deefd3': // Already Verified
                                        scope.view.change(V_LOGIN_NATIVE.LOG_IN);
                                        setAlert('verified');
                                        scope.data.password = ''; // Remove password to force re-auth
                                        break;
                                }
                            });
                        }

                        function doVerification() {
                            scope.login.change(C_SIMPLE_STATE.STATE.PENDING);
                            $api.v1.post('user/verification/native/verify', {
                                email:              scope.data.email,
                                entity_id:          scope.data.entity_id,
                                verification_data:  scope.data.verify_code
                            }).success(function () {
                                $timeout(function () {
                                    scope.login.change(C_SIMPLE_STATE.STATE.SUCCESS);
                                }, 150);
                            }).error(function (data, status, headers) {
                                switch (headers()[ERROR_CODE]) {
                                    case '17a31840':  // Bad Code
                                        scope.lnf.verify_code.$setValidity('invalid', false);
                                        break;
                                    case 'b1deefd3':   // Already Verified
                                        scope.view.change(V_LOGIN_NATIVE.LOG_IN);
                                        scope.data.password = '';
                                        setAlert('verified');
                                        break;
                                }
                                scope.login.change(C_SIMPLE_STATE.STATE.IDLE);
                            });
                        }

                        // Custom Form Field Validation resets
                        scope.lnf.email.$validators.notfound = function() {
                            return true;
                        };

                        scope.lnf.email.$validators.invalid = function() {
                            return true;
                        };

                        scope.lnf.email.$validators.exists = function() {
                            return true;
                        };

                        scope.lnf.verify_code.$validators.invalid = function() {
                            return true;
                        };

                        scope.lnf.password.$validators.incorrect = function() {
                            return true;
                        };

                        // Event Management
                        $rootScope.$on(C_SIMPLE_STATE.EVENT.STATE_CHANGE, function(e, data) {
                            if (data.id === scope.view.id()) {
                                scope.lnf.$setPristine();
                                scope.alerts = null;

                                // Cancel the cookie check interval (if present)
                                if (cookie_check_interval) {
                                    $interval.cancel(cookie_check_interval);
                                    cookie_check_interval = null;
                                }

                                if (scope.view.is(V_LOGIN_NATIVE.VERIFY_ONLINE)) {
                                    cookie_check_interval = $interval(function () {
                                        if (!$cookies[VERIFICATION_COOKIE]) {
                                            $interval.cancel(cookie_check_interval);
                                            cookie_check_interval = null;
                                            scope.view.change(V_LOGIN_NATIVE.VERIFY_OFFLINE);
                                        }
                                    }, 10000);
                                }
                            }
                        });

                        // Do not set the view directly, use this function as it resets the form validation
                        scope.showVerification = function () {
                            if ($cookies[VERIFICATION_COOKIE]) {
                                scope.view.change(V_LOGIN_NATIVE.VERIFY_ONLINE);
                            } else {
                                scope.view.change(V_LOGIN_NATIVE.VERIFY_OFFLINE);
                            }
                        };

                        // Scope
                        scope.VIEW = V_LOGIN_NATIVE;
                        scope.alerts = null;
                        scope.data = {};

                        // Create / Get View State
                        if (!scope.view) {
                            scope.view = simple_state.get(attr.loginNativeInitial || V_LOGIN_NATIVE.LOG_IN);
                        } else {
                            scope.view.change(attr.loginNativeInitial || V_LOGIN_NATIVE.LOG_IN); //**** probably needed to switch to 'verify' view or something?
                        }

                        // Create / Get Login State
                        if (!scope.login) {
                            scope.login = simple_state.get();
                        }

                        scope.data.email = $location.search().ln_e;
                        switch ($location.search().ln_r) {
                            case 'b1deefd3':
                                setAlert('verified');
                                break;
                            case '17a31840':
                                scope.showVerification();
                                setAlert('verify_fail');
                                break;
                        }
                        $location.search('ln_r', null);
                        $location.search('ln_e', null);

                        scope.submitButtonText = function () {
                            switch (scope.view.current) {
                                case V_LOGIN_NATIVE.SIGN_UP:
                                    return 'LOGIN_SIGN_UP';
                                case V_LOGIN_NATIVE.FORGOT_PW:           // Intentional Fall Through
                                case V_LOGIN_NATIVE.FORGOT_PW_VERIFY:
                                    return 'LOGIN_RESET_PW';
                                case V_LOGIN_NATIVE.VERIFY_RESEND:
                                case V_LOGIN_NATIVE.VERIFY_OFFLINE:
                                    return 'LOGIN_VERIFY_RESEND';
                                case V_LOGIN_NATIVE.VERIFY_ONLINE:
                                    return 'LOGIN_VERIFY_ONLINE';
                                default:
                                    return 'COMMON_LOGIN';
                            }
                        };

                        scope.submit = function () {
                            if (scope.lnf.$valid) {
                                switch (scope.view.current) {
                                    case V_LOGIN_NATIVE.LOG_IN:
                                        doLogin();
                                        break;
                                    case V_LOGIN_NATIVE.SIGN_UP:
                                        doSignUp();
                                        break;
                                    case V_LOGIN_NATIVE.FORGOT_PW:
                                        doPasswordReset();
                                        break;
                                    case V_LOGIN_NATIVE.VERIFY_ONLINE:
                                        doVerification();
                                        break;
                                    case V_LOGIN_NATIVE.VERIFY_RESEND:
                                    case V_LOGIN_NATIVE.VERIFY_OFFLINE:
                                        doResendVerification();
                                        break;
                                }
                            }
                        };
                    }
                };
            }
        ]).
        constant('LoginNative.View', {
            LOG_IN:             1,
            SIGN_UP:            2,
            FORGOT_PW:          3,
            FORGOT_PW_VERIFY:   4,
            VERIFY:             5,
            VERIFY_RESEND:      6,
            VERIFY_ONLINE:      7,
            VERIFY_OFFLINE:     8
        });
}(window.angular));