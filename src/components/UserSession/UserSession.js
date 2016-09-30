(function (w, ng, mobile) {
    'use strict';
    ng.module('UserSession', [{
            name: 'API',
            files: ['components/API/API.js']
        }],
        null
    ).
    service('UserSession.Service', [
        '$rootScope',
        '$api',
        '$q',
        '$location',
        'UserSession.Event',
        function ($rootScope, $api, $q, $location, E_USER_SESSION) {
            var sessionPromise = null,
                session = null;/*,
                PASSWORD_RESET  = 'password_reset',
                VERIFIED        = 'verified';*/

            function get_session(persist, new_login) {
                persist = persist !== undefined ? persist : 'existing';
                if (sessionPromise === null || new_login) {
                    sessionPromise = $q.defer();
                    $api.v1.get('user_session/' + persist)
                        .success(
                            function (data) {
                                session = data;
                                session['new_login'] = (new_login) ? true : false;
                                $rootScope.$emit(E_USER_SESSION.EVENT_CHANGE_STATE, E_USER_SESSION.ACTION_START, session);
                                sessionPromise.resolve(session);
                            }
                        )
                        .error(
                            function (data) {
                                sessionPromise.reject(data);
                            }
                        );
                }
                return sessionPromise.promise;
            }

            function remove_session() {
                $api.v1.delete('user_session')
                    .finally(function () {
                        $rootScope.$emit(E_USER_SESSION.EVENT_CHANGE_STATE, E_USER_SESSION.ACTION_END);
                        session = false;
                    });

                /** MOBILE */
                if (mobile) {
                    // Hacky method to remove any session cookies left over in the InAppBrowser
                    window.open('placeholder.html', 'RemoveSession', 'hidden=yes,clearcache=yes,clearsessioncache=yes').close();
                }
            }

            // Initial session bootstrap (automatic)
            // Moved to User

            if ($location.search().action === 'login') {
                remove_session();               // Was a login prompt requested? If so, nuke any current session
            } else {
                get_session('existing');        // If not, attempt to restore a session
            }

            return {
                get:    get_session,
                remove: remove_session,

                present: function () {
                    return (session) ? true : false;
/*                        if (session) {
                        if (session[VERIFIED] && !session[PASSWORD_RESET]) {
                            return true;
                        }
                    }
                    return false;*/
                }
            };
        }
    ]).

    /*factory('UserSession.Interceptor', [
        '$q',
        function($q) {
            return {
                responseError: function (response) {
                    if (response.status === 401) {
                        console.log('401 error intercepted', response.headers());
                        // only intercept "No Session / Auth Verification Required" and prompt for creds.
                    }
                    return $q.reject(response);
                }
            };
        }
    ]).*/

    config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push('UserSession.Interceptor');
    }]).

    constant('UserSession.Event', {
        EVENT_CHANGE_STATE: 'UserSession.ChangeState',
        ACTION_END:             0,      // Session ended with a normal logout
        ACTION_START:           1      // Session started normally
    });
}(window, window.angular, window.cordova));