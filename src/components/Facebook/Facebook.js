(function (window, ng) {
    'use strict';
    ng.module('Facebook', [], null)
        .service('Facebook.Service', [
            '$api',
            '$q',
            '$modal',
            'Facebook.Constant',
            function ($api, $q, $modal, C_FACEBOOK) {
                var init_done = false,
                    loaded = $q.defer(),
                    login_status = null,
                    modal = null;

                function buildFBRoot() {
                    modal = $modal.open({
                        templateUrl: 'assets/fragments/modal-template-blank.tpl.html',
                        windowTemplateUrl: 'assets/fragments/modal-window-blank.tpl.html'
                    });
                    return modal;
                }

                function init() {
                    // TODO: Require user session, check if FB Feature is present.
                    if (!init_done) {
                        // Create FB Load Callback
                        window.fbAsyncInit = function () {
                            FB.init({
                                appId:      C_FACEBOOK.APP_ID,
                                version:    C_FACEBOOK.API_VERSION,
                                xfbml:      true
                            });

                            FB.getLoginStatus(function(response) {
                                login_status = response;
                                loaded.resolve(true);
                            });


                        };

                        // Trigger FB JS API Load
                        (function (d, s, id) {
                            var js, fjs = d.getElementsByTagName(s)[0];
                            if (d.getElementById(id)) {
                                return;
                            }
                            js = d.createElement(s);
                            js.id = id;
                            js.src = "//connect.facebook.net/en_US/sdk.js";
                            fjs.parentNode.insertBefore(js, fjs);
                        }(document, 'script', 'facebook-jssdk'));

                        init_done = true;
                    }

                    return loaded.promise;
                }

                return {
                    init: init,
                    ready: function () {
                        return loaded.promise;
                    },

                    login: function () {
                        var q = $q.defer();

                        FB.login(function(response) {
                            if (response.status === 'connected') {
                                q.resolve(response);
                            } else {
                                q.reject(response);
                            }
                        }, {scope: 'email,user_birthday'});

                        return q.promise;
                    },

                    invite: function (message) {
                        var q = $q.defer(),
                            invitations = [];

                       // $api.get('https://graph.facebook.com/v2.2/')


                        buildFBRoot();//.opened.then(function() {
                        init().then(function() {

                                FB.ui({
                                    method: 'apprequests',
                                    message: (message) ? message : 'None',
                                    new_style_message: true
                                    //exclude_ids  TODO Add excluded_ids this so that existing members of a group (for example) aren't suggested by the panel
                                }, function (response) {
                                    modal.close();
                                    ng.forEach(response.to, function (val) {
                                        var iq = $q.defer();
                                        $api.v1.get('social_login/resolve/' + C_FACEBOOK.PROVIDER_ID + '/' + val)
                                            .success(function (data) {
                                                iq.resolve({
                                                    entity_id: data,
                                                    meta: {
                                                        socialnetwork_id: C_FACEBOOK.PROVIDER_ID,
                                                        socialnetwork_request_id: response.message,
                                                        socialnetwork_user_id: val
                                                    }
                                                });
                                            })
                                            .error(function (data) {
                                                // TODO: try and remove the facebook request to the user here too. (just in case)
                                                iq.reject(data);
                                            });
                                        invitations.push(iq.promise);
                                    });
                                    q.resolve(invitations);
                                });
                            });
                        //});
                        return q.promise;
                    }
                };
            }
        ])
        .directive('ltcFbLogin', [
            'Facebook.Service',
            function (facebook) {
                return {
                    restrict: 'AE',
                    template: '<button ng-if="fb.ready()" ng-click="doLogin()">FB Login</button>',
                    link: function (scope, element, attrs) {

                        scope.fb = facebook;

                        scope.doLogin = function () {
                            facebook.init();
                            facebook.login();
                        };
                    }
                };
            }
        ])
        .directive('ltcFbInvite', [
            'Facebook.Service',
            function (facebook) {
                return {
                    restrict: 'AE',
                    template: '<button ng-if="fb.ready()" ng-click="doInvite()">FB Invite</button>',
                    scope: {
                        inviteCallback: '&ltcFbInviteCallback'
                    },
                    link: function (scope, element, attrs) {

                        scope.fb = facebook;

                        scope.doInvite = function () {
                            var result = facebook.invite(attrs.ltcFbInviteMessage);
                            result.then(function(data) {
                                ng.forEach(data, function(val) {
                                    val.then(function(data) {
                                        scope.inviteCallback({entity: data});
                                    })
                                })
                            })
                        };
                    }
                };
            }
        ])
        .constant('Facebook.Constant', {
            API_VERSION:    'v2.2',
            APP_ID:         '594890243958636',
            PROVIDER_ID:    1
        })
}(window, window.angular));

