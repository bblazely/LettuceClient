(function (w, ng, mobile) {
    'use strict';
    ng.module('LoginExternalAuthRequest', [{
        name: 'Facebook',
        files: ['components/Facebook/Facebook.js']
    }], null)
        .controller('LoginExternalAuthRequest.View', [
            '$api',
            '$state',
            '$stateParams',
            'Facebook.Service',
            function ($api, $state, $stateParams, facebook) {
                switch ($stateParams.provider_id) {
                    case 'facebook':
                        facebook.init().then(function () {
                            facebook.login().then(
                                function (response) {
                                    console.log(response);
                                    // TODO: Grab the resultant user id, resolve it to an entity and redirect to their home page.
                                    $api.v1.post('social_login/login/facebook/sso', {
                                        signed_request: response.authResponse.signedRequest,
                                        oauth_token: response.authResponse.accessToken,
                                        no_redirect: true
                                    }).success(function(entity) {
                                        $state.go('root.entity', {public_id: entity.public_id});
                                    }).error(function() {
                                        // TODO: Add a user hand-hold here. ie: login failed, try again in a bit.
                                        $state.go('root');
                                    });
                                }, function () {
                                    // Failed Auth Request. Redirect to root
                                    $state.go('root');
                                }
                            );
                        });
                        break;
                    default:
                        $state.go('root');
                        break;
                }
            }
        ])
}(window, window.angular, window.cordova));